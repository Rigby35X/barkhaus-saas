import { isHttpsUrl, legacyCognitoPublicKey } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalFields, JsonValue } from '../../../../../shared/contracts/v1/animal.ts';
import type { ConnectorAdapter, ConnectorConnection, ConnectorPage, ConnectorRecord } from '../../../../../shared/contracts/v1/ingestion.ts';
import { ConnectorError, safeMessage, validateConnection } from './config.ts';
import type { CognitoConnection } from './config.ts';

/** Server transport resolves credentialRef; endpoint must pass deployment egress policy.
 * Never follows redirects; limits response bytes, deadline and content type before JSON. */
export interface CognitoTransport {
  read(input: { orgId: number; connectionId: string; credentialRef: string; endpoint: string; formId: string; cursor: string | null; limit: number; signal: AbortSignal }): Promise<{
    status: number; retryAfterSeconds?: number; body?: unknown;
  }>;
}
export interface CognitoRecord extends ConnectorRecord { compatibilityPublicKey: string }
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ConnectorError('invalid_feed');
  return v as Record<string, unknown>;
};
const text = (v: unknown): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > 20000) throw new ConnectorError('invalid_feed');
  return v.trim();
};
/** Cognito revision ordering is explicit UTC time, never lexical opaque revisions. */
export function sourceOrder(revision: string | null): number {
  if (!revision || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(revision) ||
      !Number.isFinite(Date.parse(revision)) || new Date(revision).toISOString() !== revision) throw new ConnectorError('invalid_feed');
  return Date.parse(revision);
}
function transform(value: unknown, kind: string | null, today: string): JsonValue {
  if (kind === 'birthday') {
    const age = object(value);
    const date = text(age.date);
    if (typeof age.estimated !== 'boolean') throw new ConnectorError('invalid_feed');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date > today) throw new ConnectorError('invalid_feed');
    return { kind: 'birthday', date, estimated: age.estimated };
  }
  if (kind === 'photos') {
    if (!Array.isArray(value) || value.length > 20) throw new ConnectorError('invalid_feed');
    return value.map((p) => {
      const url = text(typeof p === 'string' ? p : object(p).url);
      if (!isHttpsUrl(url)) throw new ConnectorError('invalid_feed');
      // URL-bound IDs ensure replacement candidates cannot inherit approvals.
      return { id: `cognito:${url}`, url, alt: '' };
    });
  }
  const s = text(value);
  if (kind === 'sex') return ['male','female'].includes(s.toLowerCase()) ? s.toLowerCase() : 'unknown';
  if (kind === 'size') return ['small','medium','large','extra_large'].includes(s.toLowerCase()) ? s.toLowerCase() : 'unknown';
  return s;
}
export function normalizeCognito(c: CognitoConnection, raw: unknown, today: string): CognitoRecord {
  validateConnection(c);
  const row = object(raw);
  const id = row[c.config.identityColumn];
  const externalRecordId = typeof id === 'number' && Number.isSafeInteger(id) ? String(id) : text(id);
  if (!/^\d+$/.test(externalRecordId)) throw new ConnectorError('invalid_feed');
  const sourceRevision = text(row[c.config.revisionColumn]);
  sourceOrder(sourceRevision);
  const statusName = text(row[c.config.statusColumn]);
  if (!Object.hasOwn(c.mapping.statusMap, statusName)) throw new ConnectorError('invalid_feed');
  const fields: Partial<AnimalFields> = { ...c.mapping.statusMap[statusName] };
  const customFields: Record<string, JsonValue> = Object.create(null);
  for (const map of c.mapping.fields) {
    const v = transform(row[map.sourceColumn], map.transform, today);
    if (map.target.kind === 'custom') customFields[map.target.key] = v;
    else Object.assign(fields, { [map.target.field]: v });
  }
  // Validate mapped core shapes before allowing a page into the durable inbox.
  if (!fields.name?.trim() || !fields.species?.trim()) throw new ConnectorError('invalid_feed');
  if (fields.age && (typeof fields.age !== 'object' || fields.age.kind !== 'birthday')) throw new ConnectorError('invalid_feed');
  if (fields.photos && !Array.isArray(fields.photos)) throw new ConnectorError('invalid_feed');
  if (fields.sex && !['male','female','unknown'].includes(fields.sex)) throw new ConnectorError('invalid_feed');
  if (fields.size && !['small','medium','large','extra_large','unknown'].includes(fields.size)) throw new ConnectorError('invalid_feed');
  return { externalRecordId, sourceRevision, fields, customFields, compatibilityPublicKey: legacyCognitoPublicKey(c.config.formId, externalRecordId) };
}
export class CognitoAdapter implements ConnectorAdapter {
  readonly provider = 'cognito';
  private readonly transport: CognitoTransport;
  private readonly today: () => string;
  constructor(transport: CognitoTransport, today: () => string) { this.transport = transport; this.today = today; }
  async fetchPage(connection: ConnectorConnection, cursor: string | null, signal: AbortSignal): Promise<ConnectorPage> {
    try {
      const c = connection as CognitoConnection;
      validateConnection(c);
      if (signal.aborted) throw new ConnectorError('unavailable');
      const r = await this.transport.read({ orgId:c.orgId, connectionId:c.id, credentialRef:c.credentialRef, endpoint:c.config.endpoint, formId:c.config.formId, cursor, limit:c.config.pageSize, signal });
      if ([401,403].includes(r.status)) throw new ConnectorError('credentials');
      if (r.status === 429) {
        if (r.retryAfterSeconds !== undefined && (!Number.isFinite(r.retryAfterSeconds) || r.retryAfterSeconds < 0 || r.retryAfterSeconds > 604800)) throw new ConnectorError('invalid_feed');
        throw new ConnectorError('rate_limited', r.retryAfterSeconds ?? null);
      }
      if (r.status !== 200) throw new ConnectorError('unavailable');
      const b = object(r.body);
      if (!Array.isArray(b.entries) || b.entries.length > c.config.pageSize || typeof b.completeSnapshot !== 'boolean' ||
          !(b.nextCursor === null || typeof b.nextCursor === 'string' && b.nextCursor.length > 0 && b.nextCursor.length <= 2048) ||
          (b.nextCursor !== null && (b.nextCursor === cursor || b.completeSnapshot))) throw new ConnectorError('invalid_feed');
      const records = b.entries.map(r => normalizeCognito(c,r,this.today()));
      if (new Set(records.map(r=>r.externalRecordId)).size !== records.length) throw new ConnectorError('invalid_feed');
      return { kind:'success', records, nextCursor:b.nextCursor as string|null, completeSnapshot:b.completeSnapshot };
    } catch (e) {
      const error = e instanceof ConnectorError ? e : new ConnectorError('unavailable');
      const code = ['credentials','rate_limited','invalid_feed'].includes(error.code) ? error.code as 'credentials'|'rate_limited'|'invalid_feed' : 'unavailable';
      return { kind:'failure', code, retryAfterSeconds:error.retryAfterSeconds, safeMessage:safeMessage(code) };
    }
  }
}
