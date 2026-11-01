import type { SavedMapping, WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { SqlDatabase, SqlSafety } from '../animals/sql-repository.ts';
import { exact, IMPORT_LIMITS, positive, textId, validateMapping, parseCsv } from '../../../../dashboard/src/features/imports/csv.ts';
import { CsvImportService, ImportConflictError, ImportInputError } from './service.ts';
import type { ImportInput } from './service.ts';
import { SqlImportStore } from './sql-store.ts';

type Member = Extract<WriteActor, { kind: 'member' }>;
export interface CsvHttpDependencies {
  database: SqlDatabase;
  safety: SqlSafety;
  /** Verify bearer identity and membership externally; never resolve from JSON. */
  authorize(request: Request, orgId: number): Promise<Member | null | Response>;
  date?: () => string;
}
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
export const MAX_IMPORT_REQUEST_BYTES = 2 * IMPORT_LIMITS.maxBytes + 256000;
class HttpError extends Error {
  readonly status: number;
  constructor(status: number) { super('Invalid import request'); this.status = status; }
}
function validate(run: () => void) { try { run(); } catch { throw new HttpError(400); } }
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400);
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.length;
    if (length > MAX_IMPORT_REQUEST_BYTES) { await reader.cancel(); throw new HttpError(413); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new HttpError(400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400);
  return value as Record<string, unknown>;
}
function orgId(value: unknown): number { if (!positive(value)) throw new HttpError(400); return value; }
function jobId(value: unknown): string { if (!textId(value)) throw new HttpError(400); return value; }
function input(value: unknown): ImportInput {
  validate(() => {
    exact(value, ['id', 'orgId', 'mappingId', 'mappingRevision', 'matching', 'acknowledgeCreateOnly']);
    if (!textId(value.id) || !positive(value.orgId) || !textId(value.mappingId) || !positive(value.mappingRevision) || typeof value.acknowledgeCreateOnly !== 'boolean') throw new Error();
    exact(value.matching, ['mode', 'mappingId', 'keyColumn', 'resolutions']);
  });
  return value as ImportInput;
}
function source(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400);
  if (new TextEncoder().encode(value).length > IMPORT_LIMITS.maxBytes) throw new HttpError(413);
  validate(() => { parseCsv(value); });
  return value;
}
/** Client status never needs a private object location. Retry uses org/job ID only. */
function status<T extends { sourceFile: { storageRef: string; sha256: string } }>(job: T): T {
  return { ...job, sourceFile: { ...job.sourceFile, storageRef: 'private' } };
}

/** Explicit composition factory only. It is not mounted by the deployed runtime.
 * start/retry enqueue durable work; no HTTP operation executes a batch. */
export function createCsvHttpHandler(deps: CsvHttpDependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      if (!['GET', 'POST'].includes(request.method)) return response({ error: 'Method not allowed' }, 405);
      let operation: string, scope: number, payload: Record<string, unknown> = {};
      if (request.method === 'GET') {
        const query = new URL(request.url).searchParams;
        if ([...query.keys()].some(key => !['op', 'orgId', 'jobId'].includes(key)) || [...new Set(query.keys())].some(key => query.getAll(key).length !== 1)) throw new HttpError(400);
        operation = query.get('op') ?? '';
        const raw = query.get('orgId');
        if (!raw || !/^[1-9]\d*$/.test(raw)) throw new HttpError(400);
        scope = orgId(Number(raw));
        if (operation === 'job') payload.jobId = jobId(query.get('jobId'));
        else if (operation !== 'mappings' || query.has('jobId')) throw new HttpError(400);
      } else {
        payload = await body(request); operation = String(payload.op ?? '');
        if (operation === 'save_mapping') {
          validate(() => exact(payload, ['op', 'mapping']));
          const mapping = payload.mapping as SavedMapping;
          scope = orgId(mapping?.orgId);
          validate(() => validateMapping(mapping, scope));
        } else if (operation === 'preview' || operation === 'start') {
          validate(() => exact(payload, ['op', 'input', 'source']));
          payload.input = input(payload.input); scope = orgId((payload.input as ImportInput).orgId);
          payload.source = source(payload.source);
        } else if (operation === 'retry') {
          validate(() => exact(payload, ['op', 'orgId', 'jobId']));
          scope = orgId(payload.orgId); payload.jobId = jobId(payload.jobId);
        } else throw new HttpError(400);
      }
      const principal = await deps.authorize(request, scope);
      if (principal instanceof Response) return principal;
      if (!principal || principal.kind !== 'member' || principal.orgId !== scope || !textId(principal.userId) || !['owner', 'admin', 'staff'].includes(principal.role)) return response({ error: 'Import access denied' }, 403);
      const store = new SqlImportStore(deps.database, principal, deps.safety);
      const service = new CsvImportService(store, async (_context, target) => {
        if (target !== principal.orgId) throw new Error('Import access denied');
        return principal;
      }, deps.date);
      if (operation === 'mappings') return response(await service.listMappings(principal, scope));
      if (operation === 'job') return response(status(await service.job(principal, scope, payload.jobId as string)));
      if (operation === 'save_mapping') { await service.saveMapping(principal, payload.mapping as SavedMapping); return response({ ok: true }); }
      if (operation === 'preview') return response(await service.preview(principal, payload.input as ImportInput, payload.source as string));
      if (operation === 'start') return response(status(await service.start(principal, payload.input as ImportInput, payload.source as string)), 202);
      return response(status(await service.retry(principal, scope, payload.jobId as string)), 202);
    } catch (error) {
      if (error instanceof HttpError) return response({ error: error.status === 413 ? 'Import request exceeds byte limit' : error.status === 415 ? 'JSON required' : 'Invalid import request' }, error.status);
      if (error instanceof ImportConflictError) return response({ error: 'Import request ID was already used with different input; create a new reviewed job' }, 409);
      if (error instanceof ImportInputError) return response({ error: 'Invalid import input; review the mapping, matching decisions and CSV' }, 400);
      // SQL errors, private file locations and credentials never enter responses.
      return response({ error: 'Import service unavailable' }, 503);
    }
  };
}
