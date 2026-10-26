import type { AnimalFields, AnimalId, AnimalRecord, JsonValue, OrganizationId } from './animal.ts';

export type RowIssue = { row: number; field: string | null; code: string; message: string };
export type FieldMapping = {
  sourceColumn: string;
  target: { kind: 'core'; field: keyof AnimalFields } | { kind: 'custom'; key: string };
  transform: string | null; // Server allowlisted transform identifier; never eval user code.
};
export interface SavedMapping {
  version: 1;
  id: string;
  revision: number; // Immutable positive mapping revision, distinct from source namespace ID.
  orgId: OrganizationId;
  fields: readonly FieldMapping[];
  statusMap: Record<string, Pick<AnimalFields, 'lifecycle' | 'availability'>>;
}

export type CsvMatching =
  | { mode: 'stable_key'; mappingId: string; keyColumn: string }
  | { mode: 'create_only' }
  | { mode: 'reviewed'; resolutions: readonly (
      | { row: number; action: 'create' }
      | { row: number; action: 'update'; animalId: AnimalId; expectedRevision: number }
    )[] };
export interface CsvImportJob {
  version: 1;
  id: string;
  orgId: OrganizationId;
  mappingId: string;
  mappingRevision: number;
  sourceFile: { storageRef: string; sha256: string }; // Private immutable input for retries.
  matching: CsvMatching;
  limits: { maxBytes: number; maxRows: number; batchSize: number };
  state: 'preview' | 'ready' | 'running' | 'partial' | 'completed' | 'failed';
  processedRows: number;
  outcomes: readonly { row: number; state: 'created' | 'updated' | 'rejected'; animalId: AnimalId | null; issues: readonly RowIssue[] }[];
}

/** Persist this tuple under a unique constraint; never concatenate with delimiters. */
export function csvIdentity(orgId: OrganizationId, mappingId: string, key: string): readonly [number, string, string] {
  requireIdentity(orgId, mappingId, key);
  return [orgId, mappingId, key];
}
/** Required for ALL matching modes, including create-only and reviewed rows. */
export function csvRowIdempotencyKey(orgId: OrganizationId, jobId: string, row: number): readonly [number, string, number] {
  requireIdentity(orgId, jobId);
  if (!Number.isSafeInteger(row) || row < 1) throw new Error('Invalid row');
  return [orgId, jobId, row];
}

export interface ConnectorConnection {
  version: 1;
  id: string;
  orgId: OrganizationId;
  provider: string; // No default provider, tenant, endpoint or credential.
  credentialRef: string; // Server secret-store reference, never a credential value.
  mapping: SavedMapping;
  capabilities: { direction: 'inbound'; pagination: 'cursor' | 'page' | 'none'; incremental: boolean };
  state: 'configured' | 'active' | 'error' | 'disconnected';
}
export interface ConnectorRecord {
  externalRecordId: string;
  sourceRevision: string | null;
  fields: Partial<AnimalFields>;
  customFields?: Record<string, JsonValue>;
}
export type ConnectorPage =
  | { kind: 'success'; records: readonly ConnectorRecord[]; nextCursor: string | null; completeSnapshot: boolean }
  | { kind: 'failure'; code: 'credentials' | 'rate_limited' | 'unavailable' | 'invalid_feed'; retryAfterSeconds: number | null; safeMessage: string };
export interface ConnectorAdapter {
  readonly provider: string;
  fetchPage(connection: ConnectorConnection, cursor: string | null, signal: AbortSignal): Promise<ConnectorPage>;
}
export interface SyncJob {
  version: 1;
  id: string;
  orgId: OrganizationId;
  connectionId: string;
  mappingRevision: number;
  cursor: string | null; // Commit cursor only with durable row outcomes.
  state: 'queued' | 'running' | 'retry_wait' | 'completed' | 'failed';
  attempt: number;
  nextAttemptAt: string | null;
  counts: { created: number; updated: number; rejected: number; missingReview: number };
}
export function connectorIdentity(orgId: OrganizationId, connectionId: string, externalRecordId: string): readonly [number, string, string] {
  requireIdentity(orgId, connectionId, externalRecordId);
  return [orgId, connectionId, externalRecordId];
}
function requireIdentity(orgId: number, ...parts: string[]): void {
  if (!Number.isSafeInteger(orgId) || orgId < 1 || parts.some(p => !p.trim())) throw new Error('Invalid scoped identity');
}

export type WriteFailure = { ok: false; code: 'forbidden' | 'conflict' | 'invalid' | 'not_found'; fields?: readonly string[] };
export type WriteResult = { ok: true; animal: AnimalRecord; replayed: boolean } | WriteFailure;

/** Transport validates untrusted JSON; server resolves membership/worker scope itself. */
export type WriteActor =
  | { kind: 'member'; userId: string; orgId: OrganizationId; role: 'owner' | 'admin' | 'staff' | 'viewer' }
  | { kind: 'worker'; orgId: OrganizationId; connectionId: string };
export type AnimalWrite = {
  version: 1;
  orgId: OrganizationId;
  idempotencyKey: string;
} & (
  | { kind: 'create_native'; fields: AnimalFields; customFields?: Record<string, JsonValue>; csvOrigin?: { jobId: string; mappingId: string; importKey: string | null } }
  | { kind: 'edit_native'; animalId: AnimalId; expectedRevision: number; fields: Partial<AnimalFields>; customFields?: Record<string, JsonValue>; internalNotes?: string }
  | { kind: 'publish'; animalId: AnimalId; expectedRevision: number; publicProfileKey: string; approvedPhotos: readonly { id: string; url: string }[] }
  | { kind: 'unpublish'; animalId: AnimalId; expectedRevision: number }
  | { kind: 'archive'; animalId: AnimalId; expectedRevision: number }
  | { kind: 'source_upsert'; connectionId: string; externalRecordId: string; sourceRevision: string | null; expectedRevision: number | null; fields: Partial<AnimalFields>; customFields?: Record<string, JsonValue> }
);

/** Shared authorized server write boundary for B/C/D; implementations owned by A+B.
 * Must revalidate actor, JSON fields, source ownership, CAS and org scope in one DB
 * transaction. Bind idempotency to org+actor+operation+payload; mismatched replays
 * fail. New records default unpublished; source upserts cannot publish or delete.
 * Retried source revisions must not revert a later committed source revision.
 */
export interface AnimalWriteService {
  execute(actor: WriteActor, command: AnimalWrite): Promise<WriteResult>;
}
