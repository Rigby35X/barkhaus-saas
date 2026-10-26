import { createHash } from 'node:crypto';
import type { AnimalId, AnimalRecord } from '../../../../../shared/contracts/v1/animal.ts';
import { csvIdentity, csvRowIdempotencyKey } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { AnimalWrite, AnimalWriteService, CsvImportJob, CsvMatching, SavedMapping, WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import { exact, IMPORT_LIMITS, positive, previewCsv, requireValue, textId, validateMapping } from '../../../../dashboard/src/features/imports/csv.ts';
import type { ImportPreview } from '../../../../dashboard/src/features/imports/csv.ts';

type Outcome = CsvImportJob['outcomes'][number];
export type ImportDefinition = { job: CsvImportJob; asOf: string; seal: string };
export type ImportInput = { id: string; orgId: number; mappingId: string; mappingRevision: number; matching: CsvMatching; acknowledgeCreateOnly: boolean };
export interface RowTransaction {
  /** B's writer MUST use this same transaction/connection. No independent commit. */
  writer: AnimalWriteService;
  outcome(): Promise<Outcome | null>;
  findIdentity(identity: readonly [number, string, string]): Promise<AnimalRecord | null>;
  findAnimal(orgId: number, id: AnimalId): Promise<AnimalRecord | null>;
  bindIdentity(identity: readonly [number, string, string], animalId: AnimalId): Promise<void>;
  record(outcome: Outcome): Promise<void>;
}
export interface BatchTransaction {
  /** Row scopes serialize keys, but never commit independently of this batch. */
  row<T>(key: readonly [number, string, number], run: (tx: RowTransaction) => Promise<T>): Promise<T>;
  outcomes(): Promise<readonly Outcome[]>;
  /** Authoritative progress commits with animal writes, identities and outcomes. */
  saveProgress(job: CsvImportJob): Promise<void>;
}
export interface JobSession {
  definition: ImportDefinition;
  mapping: SavedMapping;
  /** Private immutable UTF-8 object, never a remote URL. */
  source: string;
  outcomes(): Promise<readonly Outcome[]>;
  /** Exactly one durable DB transaction for this bounded batch, including progress. */
  commitBatch<T>(run: (batch: BatchTransaction) => Promise<T>): Promise<T>;
  /** Separate fenced failure update AFTER rollback. Re-read durable state and never
   * overwrite a committed checkpoint/completed job after a lost commit acknowledgement. */
  markInterrupted(): Promise<CsvImportJob>;
}
/** Persistence integration port only. No in-memory implementation is used by production. */
export interface ImportStore {
  mapping(orgId: number, id: string, revision: number): Promise<SavedMapping>;
  listMappings(orgId: number): Promise<readonly SavedMapping[]>;
  /** Durable outbox/queue entry, deduplicated by org/job. No browser worker. */
  queueRetry(actor: WriteActor, orgId: number, jobId: string): Promise<void>;
  /** Append immutable revision; stable ID retained. Reviewed custom key registration is A+B's responsibility. */
  saveMapping(actor: WriteActor, mapping: SavedMapping): Promise<void>;
  /** Atomically save private source, immutable definition/mapping snapshot and enqueue. Replay identical job ID+payload; reject changed reuse. */
  enqueue(actor: WriteActor, input: ImportInput, source: string, sha256: string, asOf: string, seal: string): Promise<CsvImportJob>;
  /** One bounded lease per org/job; authorize ownership. Never accept browser-provided job state. */
  withJob<T>(orgId: number, jobId: string, run: (session: JobSession) => Promise<T>): Promise<T>;
}
export type Authorize = (context: unknown, orgId: number) => Promise<WriteActor>;
export function sha256(source: string): string { return createHash('sha256').update(source, 'utf8').digest('hex'); }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function definitionSeal(input: Pick<ImportInput, 'id' | 'orgId' | 'mappingId' | 'mappingRevision' | 'matching'>, mapping: SavedMapping, digest: string, asOf: string): string {
  return sha256(canonical({ id: input.id, orgId: input.orgId, mappingId: input.mappingId, mappingRevision: input.mappingRevision, matching: input.matching, mapping, digest, asOf }));
}
function validateInput(input: unknown): asserts input is ImportInput {
  exact(input, ['id', 'orgId', 'mappingId', 'mappingRevision', 'matching', 'acknowledgeCreateOnly']);
  requireValue(textId(input.id) && positive(input.orgId) && textId(input.mappingId) && positive(input.mappingRevision) && typeof input.acknowledgeCreateOnly === 'boolean', 'Invalid import request');
}
/** Application service, server-only. Caller context is resolved by trusted membership auth, never JSON actor data. */
export class CsvImportService {
  private store: ImportStore;
  private authorize: Authorize;
  private date: () => string;
  constructor(store: ImportStore, authorize: Authorize, date = () => new Date().toISOString().slice(0, 10)) {
    this.store = store; this.authorize = authorize; this.date = date;
  }
  private async member(context: unknown, orgId: number): Promise<WriteActor> {
    requireValue(positive(orgId), 'Organization is required');
    const actor = await this.authorize(context, orgId);
    requireValue(actor.kind === 'member' && textId(actor.userId) && actor.orgId === orgId && ['owner', 'admin', 'staff'].includes(actor.role), 'Import access denied');
    return actor;
  }
  async listMappings(context: unknown, orgId: number): Promise<SavedMapping[]> {
    await this.member(context, orgId);
    const mappings = await this.store.listMappings(orgId);
    for (const mapping of mappings) validateMapping(mapping, orgId);
    return structuredClone(mappings.filter(m => !mappings.some(other => other.id === m.id && other.revision > m.revision)));
  }
  async job(context: unknown, orgId: number, jobId: string): Promise<CsvImportJob> {
    await this.member(context, orgId); requireValue(textId(jobId), 'Invalid job ID');
    return this.store.withJob(orgId, jobId, async session => {
      requireValue(session.definition.job.orgId === orgId && session.definition.job.id === jobId, 'Job scope mismatch');
      const outcomes = [...await session.outcomes()].sort((a, b) => a.row - b.row);
      return structuredClone({ ...session.definition.job, outcomes, processedRows: outcomes.length });
    });
  }
  async retry(context: unknown, orgId: number, jobId: string): Promise<CsvImportJob> {
    const actor = await this.member(context, orgId);
    const job = await this.job(context, orgId, jobId);
    if (job.state !== 'completed') await this.store.queueRetry(actor, orgId, jobId);
    return job;
  }
  async saveMapping(context: unknown, mapping: SavedMapping): Promise<void> {
    validateMapping(mapping, mapping.orgId); const actor = await this.member(context, mapping.orgId);
    await this.store.saveMapping(actor, structuredClone(mapping));
  }
  async preview(context: unknown, input: ImportInput, source: string): Promise<ImportPreview> {
    validateInput(input); await this.member(context, input.orgId);
    const mapping = await this.store.mapping(input.orgId, input.mappingId, input.mappingRevision);
    requireValue(mapping.id === input.mappingId && mapping.revision === input.mappingRevision, 'Mapping mismatch');
    return previewCsv(source, mapping, input.matching, this.date(), input.orgId);
  }
  async start(context: unknown, input: ImportInput, source: string): Promise<CsvImportJob> {
    validateInput(input); const actor = await this.member(context, input.orgId);
    const mapping = await this.store.mapping(input.orgId, input.mappingId, input.mappingRevision);
    requireValue(mapping.id === input.mappingId && mapping.revision === input.mappingRevision, 'Mapping mismatch');
    const asOf = this.date(); const preview = previewCsv(source, mapping, input.matching, asOf, input.orgId);
    requireValue(!preview.issues.some(i => i.row === 1), 'Fix CSV header syntax before importing');
    requireValue(input.matching.mode !== 'create_only' || input.acknowledgeCreateOnly, 'Acknowledge that a new create-only job creates new records');
    return this.store.enqueue(actor, structuredClone(input), source, sha256(source), asOf, definitionSeal(input, mapping, sha256(source), asOf));
  }
  /** Trusted queue runner calls this once per tick. Never execute it as a browser background task. */
  async runBatch(context: unknown, orgId: number, jobId: string): Promise<CsvImportJob> {
    await this.member(context, orgId); requireValue(textId(jobId), 'Invalid job ID');
    return this.store.withJob(orgId, jobId, async session => {
      const { job, asOf, seal } = session.definition;
      requireValue(job.version === 1 && job.orgId === orgId && job.id === jobId && session.mapping.orgId === orgId && session.mapping.id === job.mappingId && session.mapping.revision === job.mappingRevision, 'Job/mapping scope mismatch');
      requireValue(textId(job.sourceFile.storageRef) && /^[a-f0-9]{64}$/.test(job.sourceFile.sha256) && sha256(session.source) === job.sourceFile.sha256, 'Source file changed');
      requireValue(definitionSeal(job, session.mapping, job.sourceFile.sha256, asOf) === seal, 'Pinned import definition changed; create a new reviewed job');
      for (const key of ['maxBytes', 'maxRows', 'batchSize'] as const) requireValue(positive(job.limits[key]) && job.limits[key] <= IMPORT_LIMITS[key], 'Invalid server job limits');
      requireValue(new TextEncoder().encode(session.source).length <= job.limits.maxBytes, 'Job byte limit exceeded');
      const preview = previewCsv(session.source, session.mapping, job.matching, asOf, orgId);
      requireValue(preview.rows.length <= job.limits.maxRows && !preview.issues.some(i => i.row === 1), 'Job row limit or header error');
      try {
        return await session.commitBatch(async batch => {
          const done = new Set((await batch.outcomes()).map(o => o.row));
          const pending = preview.rows.filter(row => !done.has(row.row)).slice(0, job.limits.batchSize);
          for (const row of pending) {
            // Trusted adapter holds the membership/job fence through this same
            // transaction; B independently verifies the actor before each write.
            const actor = await this.member(context, orgId);
            await batch.row(csvRowIdempotencyKey(orgId, jobId, row.row), async tx => {
              if (await tx.outcome()) return;
              if (row.issues.length) { await tx.record({ row: row.row, state: 'rejected', animalId: null, issues: row.issues }); return; }
              const identity = row.importKey === null ? null : csvIdentity(orgId, job.mappingId, row.importKey);
              const resolution = job.matching.mode === 'reviewed' ? job.matching.resolutions.find(r => r.row === row.row) : null;
              let target = identity ? await tx.findIdentity(identity) : null;
              if (resolution?.action === 'update') target = await tx.findAnimal(orgId, resolution.animalId);
              const reject = async (code: string, message: string) => tx.record({ row: row.row, state: 'rejected', animalId: null, issues: [{ row: row.row, field: 'matching', code, message }] });
              if (target && target.orgId !== orgId) throw new Error('Target scope mismatch');
              if (resolution?.action === 'update' && !target) { await reject('not_found', 'Reviewed target no longer exists in this organization'); return; }
              if (target && (target.source.kind !== 'native' || target.publication.state !== 'unpublished' || target.publication.approvedPhotos.length > 0)) { await reject('conflict', 'Target must be native and unpublished; review ownership/publication before importing'); return; }
              const idempotencyKey = JSON.stringify(csvRowIdempotencyKey(orgId, jobId, row.row));
              const command: AnimalWrite = target
                ? { version: 1, orgId, idempotencyKey, kind: 'edit_native', animalId: target.id, expectedRevision: resolution?.action === 'update' ? resolution.expectedRevision : target.revision, fields: row.patch, customFields: row.customFields }
                : { version: 1, orgId, idempotencyKey, kind: 'create_native', fields: row.fields, customFields: row.customFields, csvOrigin: { jobId, mappingId: job.mappingId, importKey: row.importKey } };
              const result = await tx.writer.execute(actor, command);
              if (!result.ok && result.code === 'forbidden' && !result.fields?.length) throw new Error('Import authorization changed');
              if (!result.ok) { await reject(result.code, result.code === 'conflict' ? 'Animal changed; review this row in a new job' : 'Animal write rejected; review fields, ownership and access'); return; }
              // Treat a broken writer invariant as a transaction failure, never commit an unsafe result.
              requireValue(result.animal.orgId === orgId && result.animal.publication.state === 'unpublished' && result.animal.publication.approvedPhotos.length === 0, 'Writer violated import publication invariant');
              if (identity) await tx.bindIdentity(identity, result.animal.id);
              await tx.record({ row: row.row, state: target ? 'updated' : 'created', animalId: result.animal.id, issues: [] });
            });
          }
          const outcomes = [...await batch.outcomes()].sort((a, b) => a.row - b.row);
          const completed = outcomes.length === preview.rows.length;
          const updated: CsvImportJob = { ...job, processedRows: outcomes.length, outcomes, state: completed ? (outcomes.some(o => o.state === 'rejected') ? 'partial' : 'completed') : 'running' };
          await batch.saveProgress(updated);
          return updated;
        });
      } catch {
        // Entire batch must already be rolled back (or durably committed with a
        // lost acknowledgement). Recover from authoritative stored progress only.
        return session.markInterrupted();
      }
    });
  }
}
