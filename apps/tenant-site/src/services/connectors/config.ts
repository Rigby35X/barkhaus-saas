import type { ConnectorConnection } from '../../../../../shared/contracts/v1/ingestion.ts';

export interface CognitoConnection extends ConnectorConnection {
  provider: 'cognito';
  config: { endpoint: string; formId: string; identityColumn: string; revisionColumn: string; statusColumn: string; pageSize: number };
}
export class ConnectorError extends Error {
  readonly code: 'credentials' | 'rate_limited' | 'unavailable' | 'invalid_feed' | 'forbidden' | 'conflict' | 'cancelled';
  readonly retryAfterSeconds: number | null;
  constructor(code: 'credentials' | 'rate_limited' | 'unavailable' | 'invalid_feed' | 'forbidden' | 'conflict' | 'cancelled', retryAfterSeconds: number | null = null) {
    super(safeMessage(code));
    this.code = code; this.retryAfterSeconds = retryAfterSeconds;
  }
}
export function safeMessage(code: string): string {
  switch (code) {
    case 'credentials': return 'Reconnect this source or rotate its server credential reference.';
    case 'rate_limited': return 'Provider rate limit reached; retry is scheduled.';
    case 'invalid_feed': return 'Source data or saved mapping needs review.';
    case 'forbidden': return 'Connection access denied.';
    case 'conflict': return 'Source or local revision changed; review before retrying.';
    case 'cancelled': return 'Sync stopped; saved animals and local information are preserved.';
    default: return 'Source temporarily unavailable; retry is scheduled.';
  }
}
export function validateConnection(c: CognitoConnection): void {
  if (c.version !== 1 || !Number.isSafeInteger(c.orgId) || c.orgId < 1 || !c.id?.trim() ||
      c.provider !== 'cognito' || !c.credentialRef?.trim() || c.mapping?.version !== 1 ||
      c.mapping.orgId !== c.orgId || !c.mapping.id?.trim() || !Number.isSafeInteger(c.mapping.revision) || c.mapping.revision < 1 ||
      c.capabilities.direction !== 'inbound' || c.capabilities.pagination !== 'cursor' || c.capabilities.incremental !== false ||
      !['configured', 'active', 'error', 'disconnected'].includes(c.state)) throw new ConnectorError('invalid_feed');
  const x = c.config;
  try {
    const url = new URL(x.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        !/^\d+$/.test(x.formId) || !x.identityColumn.trim() || !x.revisionColumn.trim() || !x.statusColumn.trim() ||
        !Number.isInteger(x.pageSize) || x.pageSize < 1 || x.pageSize > 100) throw Error();
  } catch { throw new ConnectorError('invalid_feed'); }
  const targets = new Set<string>();
  const core = ['name','species','breed','age','sex','size','biography','photos','lifecycle','availability'];
  for (const f of c.mapping.fields) {
    const target = f.target.kind === 'core' ? f.target.field : f.target.key;
    if (!f.sourceColumn?.trim() || !target?.trim() || ['__proto__','constructor','prototype'].includes(target) ||
        (f.target.kind !== 'core' && f.target.kind !== 'custom') ||
        (f.target.kind === 'core' && (!core.includes(target) || ['lifecycle','availability'].includes(target))) ||
        ![null, 'text', 'sex', 'size', 'birthday', 'photos'].includes(f.transform) ||
        targets.has(`${f.target.kind}:${target}`)) throw new ConnectorError('invalid_feed');
    if (f.target.kind === 'core') {
      const required = ({ age:'birthday', photos:'photos', sex:'sex', size:'size' } as Record<string,string>)[target];
      if (required ? f.transform !== required : ![null,'text'].includes(f.transform)) throw new ConnectorError('invalid_feed');
    }
    targets.add(`${f.target.kind}:${target}`);
  }
  for (const status of Object.values(c.mapping.statusMap)) {
    if (!['intake','care','adopted','transferred','deceased','unknown'].includes(status.lifecycle) ||
        !['available','pending','unavailable','unknown'].includes(status.availability)) throw new ConnectorError('invalid_feed');
  }
}
