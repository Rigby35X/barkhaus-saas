import type { CsvImportJob, SavedMapping, WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import { AnimalWriteService } from '../animals/AnimalWriteService.ts';
import { digest, json, SqlAnimalRepository } from '../animals/sql-repository.ts';
import type { SqlAnimalTransaction, SqlDatabase, SqlPrincipal, SqlSafety } from '../animals/sql-repository.ts';
import { IMPORT_LIMITS, positive, validateMapping } from '../../../../dashboard/src/features/imports/csv.ts';
import { sha256 } from './service.ts';
import type { BatchTransaction, ImportDefinition, ImportInput, ImportStore, JobSession, RowTransaction } from './service.ts';

type Member = Extract<SqlPrincipal, { kind: 'member' }>;
type Outcome = CsvImportJob['outcomes'][number];
type StoredJob = Record<string, any>;

/** Concrete server-only SQL persistence. The supplied principal must come from
 * verified Auth or a server-issued job delegation, never request/queue JSON.
 * No HTTP/runtime factory mounts this adapter automatically. */
export class SqlImportStore implements ImportStore {
  readonly database: SqlDatabase;
  readonly principal: Member;
  readonly safety: SqlSafety;
  constructor(database: SqlDatabase, principal: Member, safety: SqlSafety) {
    this.database = database; this.principal = principal; this.safety = safety;
  }
  private repository(jobId?: string): SqlAnimalRepository {
    return new SqlAnimalRepository(this.database, { principal: this.principal, ...(jobId ? { importJobId: jobId } : {}) }, this.safety);
  }
  private scope(orgId: number): void {
    if (orgId !== this.principal.orgId) throw new Error('Import scope denied');
  }
  private async member(tx: SqlAnimalTransaction, actor?: WriteActor): Promise<Extract<WriteActor, { kind: 'member' }>> {
    if (actor && (actor.kind !== 'member' || actor.orgId !== this.principal.orgId || actor.userId !== this.principal.userId)) throw new Error('Import actor denied');
    const verified = await tx.verifyActor({ ...this.principal, role: 'viewer' });
    if (!verified || verified.kind !== 'member' || !['owner', 'admin', 'staff'].includes(verified.role)) throw new Error('Import membership denied');
    return verified;
  }
  private async mapped(tx: SqlAnimalTransaction, orgId: number, id: string, revision: number): Promise<SavedMapping> {
    this.scope(orgId);
    const { rows } = await tx.meta('select definition from public.platform_mappings where org_id=$1 and id=$2 and revision=$3 and connection_id is null', [orgId, id, revision]);
    const mapping = rows[0]?.definition as SavedMapping | undefined;
    if (!mapping || mapping.id !== id || mapping.revision !== revision) throw new Error('Import mapping unavailable');
    validateMapping(mapping, orgId);
    return mapping;
  }
  async mapping(orgId: number, id: string, revision: number): Promise<SavedMapping> {
    this.scope(orgId);
    return this.repository().transaction(async tx => { await this.member(tx); return this.mapped(tx, orgId, id, revision); });
  }
  async listMappings(orgId: number): Promise<SavedMapping[]> {
    this.scope(orgId);
    return this.repository().transaction(async tx => {
      await this.member(tx);
      const { rows } = await tx.meta('select definition from public.platform_mappings where org_id=$1 and connection_id is null order by id,revision', [orgId]);
      return rows.map(row => { validateMapping(row.definition, orgId); return row.definition as SavedMapping; });
    });
  }
  async saveMapping(actor: WriteActor, mapping: SavedMapping): Promise<void> {
    this.scope(mapping.orgId); validateMapping(mapping, mapping.orgId);
    await this.repository().transaction(async tx => {
      await this.member(tx, actor);
      await tx.lock(['import-mapping', mapping.id]);
      await tx.meta('insert into public.platform_import_namespaces(org_id,id) values($1,$2) on conflict do nothing', [mapping.orgId, mapping.id]);
      await tx.meta('insert into public.platform_mappings(org_id,id,revision,connection_id,definition) values($1,$2,$3,null,$4::jsonb)', [mapping.orgId, mapping.id, mapping.revision, json(mapping)]);
    });
  }
  private async outcomes(tx: SqlAnimalTransaction, orgId: number, jobId: string): Promise<Outcome[]> {
    const { rows } = await tx.meta('select outcome from public.platform_row_outcomes where org_id=$1 and job_id=$2 order by row_key::integer', [orgId, jobId]);
    return rows.map(row => row.outcome as Outcome);
  }
  private async job(tx: SqlAnimalTransaction, orgId: number, jobId: string): Promise<StoredJob> {
    this.scope(orgId);
    await tx.lock(['csv-job', jobId]);
    const { rows } = await tx.meta("select * from public.platform_jobs where org_id=$1 and id=$2 and kind='csv' for update", [orgId, jobId]);
    const job = rows[0];
    if (!job || job.created_by !== this.principal.userId) throw new Error('Import job authority unavailable');
    return job;
  }
  private async project(tx: SqlAnimalTransaction, stored: StoredJob): Promise<CsvImportJob> {
    const outcomes = await this.outcomes(tx, Number(stored.org_id), stored.id);
    const base = (stored.checkpoint ?? stored.definition.job) as CsvImportJob;
    const state: CsvImportJob['state'] = stored.status === 'queued' || stored.status === 'pending' ? 'ready'
      : stored.status === 'cancelled' ? 'failed' : stored.status;
    return { ...base, state, outcomes, processedRows: outcomes.length };
  }
  async enqueue(actor: WriteActor, input: ImportInput, source: string, fileDigest: string, asOf: string, seal: string): Promise<CsvImportJob> {
    this.scope(input.orgId);
    if (sha256(source) !== fileDigest || !/^[a-f0-9]{64}$/.test(seal)) throw new Error('Invalid pinned import input');
    return this.repository().transaction(async tx => {
      const member = await this.member(tx, actor);
      const mapping = await this.mapped(tx, input.orgId, input.mappingId, input.mappingRevision);
      await tx.lock(['csv-job', input.id]);
      const { rows: prior } = await tx.meta('select * from public.platform_jobs where org_id=$1 and id=$2', [input.orgId, input.id]);
      if (prior[0]) {
        if (prior[0].kind !== 'csv' || prior[0].created_by !== member.userId || prior[0].definition.seal !== seal || prior[0].file_sha256 !== fileDigest) throw new Error('Changed import job replay');
        return this.project(tx, prior[0]);
      }
      const job: CsvImportJob = {
        version: 1, id: input.id, orgId: input.orgId, mappingId: mapping.id, mappingRevision: mapping.revision,
        sourceFile: { storageRef: `platform-import:${input.id}`, sha256: fileDigest }, matching: structuredClone(input.matching),
        limits: { ...IMPORT_LIMITS }, state: 'ready', processedRows: 0, outcomes: [],
      };
      const definition: ImportDefinition = { job, asOf, seal };
      await tx.meta("insert into public.platform_jobs(org_id,id,kind,mapping_id,mapping_revision,file_sha256,status,definition,created_by) values($1,$2,'csv',$3,$4,$5,'queued',$6::jsonb,$7::uuid)", [job.orgId, job.id, job.mappingId, job.mappingRevision, fileDigest, json(definition), member.userId]);
      await tx.meta('insert into barkhaus_private.platform_import_sources(org_id,job_id,body,sha256) values($1,$2,$3,$4)', [job.orgId, job.id, source, fileDigest]);
      await tx.meta('insert into public.platform_outbox(org_id,job_id,event_key,payload) values($1,$2,$3,$4::jsonb)', [job.orgId, job.id, 'enqueue', json({ kind: 'csv', jobId: job.id })]);
      return job;
    });
  }
  async queueRetry(actor: WriteActor, orgId: number, jobId: string): Promise<void> {
    this.scope(orgId);
    await this.repository().transaction(async tx => {
      await this.member(tx, actor);
      const job = await this.job(tx, orgId, jobId);
      if (['completed', 'queued', 'running', 'cancelled'].includes(job.status)) return;
      const fence = Number(job.fence) + 1;
      await tx.meta("update public.platform_jobs set status='queued',fence=$3 where org_id=$1 and id=$2", [orgId, jobId, fence]);
      await tx.meta('insert into public.platform_outbox(org_id,job_id,event_key,payload) values($1,$2,$3,$4::jsonb) on conflict do nothing', [orgId, jobId, `retry:${fence}`, json({ kind: 'csv', jobId })]);
    });
  }
  async withJob<T>(orgId: number, jobId: string, run: (session: JobSession) => Promise<T>): Promise<T> {
    this.scope(orgId);
    // Do not hold a connection while the application callback starts commitBatch.
    const loaded = await this.repository().transaction(async tx => {
      await this.member(tx);
      const stored = await this.job(tx, orgId, jobId);
      const mapping = await this.mapped(tx, orgId, stored.mapping_id, Number(stored.mapping_revision));
      const { rows } = await tx.meta('select body,sha256 from barkhaus_private.platform_import_sources where org_id=$1 and job_id=$2', [orgId, jobId]);
      if (!rows[0] || rows[0].sha256 !== stored.file_sha256 || sha256(rows[0].body) !== stored.file_sha256) throw new Error('Pinned source unavailable');
      return { stored, mapping, source: rows[0].body as string, job: await this.project(tx, stored) };
    });
    const readOutcomes = () => this.repository().transaction(async tx => { await this.member(tx); await this.job(tx, orgId, jobId); return this.outcomes(tx, orgId, jobId); });
    const session: JobSession = {
      definition: { ...loaded.stored.definition, job: loaded.job }, mapping: loaded.mapping, source: loaded.source,
      outcomes: readOutcomes,
      markInterrupted: () => this.repository().transaction(async tx => {
        await this.member(tx);
        const stored = await this.job(tx, orgId, jobId);
        if (!['completed', 'cancelled', 'failed'].includes(stored.status)) {
          await tx.meta("update public.platform_jobs set status='partial' where org_id=$1 and id=$2", [orgId, jobId]);
          stored.status = 'partial';
        }
        return this.project(tx, stored);
      }),
      commitBatch: work => this.repository(jobId).transaction(async tx => {
        await this.member(tx);
        const stored = await this.job(tx, orgId, jobId);
        if (json(stored.definition) !== json(loaded.stored.definition) || json(await this.mapped(tx, orgId, stored.mapping_id, Number(stored.mapping_revision))) !== json(loaded.mapping)) throw new Error('Pinned import definition changed');
        if (stored.status === 'completed') return await this.project(tx, stored) as any;
        if (['failed', 'cancelled'].includes(stored.status)) throw new Error('Import job is not runnable');
        const before = await this.outcomes(tx, orgId, jobId);
        const unitKey = json(['csv-batch', stored.definition.seal, before.map(outcome => outcome.row)]);
        const { rows: receipts } = await tx.meta('select result from public.platform_unit_receipts where org_id=$1 and job_id=$2 and unit_key=$3', [orgId, jobId, unitKey]);
        if (receipts[0]) return receipts[0].result;
        await tx.meta("update public.platform_jobs set status='running',attempt=attempt+1 where org_id=$1 and id=$2", [orgId, jobId]);
        const writer = new AnimalWriteService({ transaction: operation => operation(tx) });
        let progress: CsvImportJob | null = null;
        const rowsInUnit = new Set<number>();
        const batch: BatchTransaction = {
          outcomes: () => this.outcomes(tx, orgId, jobId),
          row: async (key, operation) => {
            if (key[0] !== orgId || key[1] !== jobId || !positive(key[2]) || rowsInUnit.has(key[2]) || rowsInUnit.size >= loaded.job.limits.batchSize) throw new Error('Invalid import row unit');
            rowsInUnit.add(key[2]);
            await tx.lock(['csv-row', jobId, key[2]]);
            const rowKey = String(key[2]);
            const rowTx: RowTransaction = {
              writer,
              outcome: async () => {
                const { rows } = await tx.meta('select outcome from public.platform_row_outcomes where org_id=$1 and job_id=$2 and row_key=$3', [orgId, jobId, rowKey]);
                return rows[0]?.outcome ?? null;
              },
              findIdentity: identity => { this.identityScope(identity, orgId, loaded.job.mappingId); return tx.findImport(...identity); },
              findAnimal: (scope, id) => { this.scope(scope); return tx.get(scope, id); },
              bindIdentity: async (identity, animalId) => {
                this.identityScope(identity, orgId, loaded.job.mappingId);
                const animal = await tx.get(orgId, animalId); if (!animal) throw new Error('Identity animal unavailable');
                const databaseId = await tx.databaseId(animal);
                await tx.lock(['import', identity[1], identity[2]]);
                await tx.meta('insert into public.platform_import_identities(org_id,mapping_id,import_key,animal_id) values($1,$2,$3,$4) on conflict do nothing', [...identity, databaseId]);
                const existing = await tx.findImport(...identity);
                if (!existing || existing.id !== animal.id) throw new Error('Import identity conflict');
              },
              record: async outcome => {
                if (outcome.row !== key[2]) throw new Error('Outcome row mismatch');
                const animal = outcome.animalId === null ? null : await tx.get(orgId, outcome.animalId);
                if (outcome.animalId !== null && !animal) throw new Error('Outcome animal unavailable');
                await tx.meta('insert into public.platform_row_outcomes(org_id,job_id,row_key,animal_id,payload_sha256,outcome) values($1,$2,$3,$4,$5,$6::jsonb)', [orgId, jobId, rowKey, animal ? await tx.databaseId(animal) : null, digest(json(outcome)), json(outcome)]);
              },
            };
            return operation(rowTx);
          },
          saveProgress: async next => {
            const outcomes = await this.outcomes(tx, orgId, jobId);
            if (next.orgId !== orgId || next.id !== jobId || next.processedRows !== outcomes.length || json(next.outcomes) !== json(outcomes) || progress) throw new Error('Invalid authoritative import progress');
            const { state: _state, outcomes: _outcomes, processedRows: _processed, ...pins } = next;
            const { state: _oldState, outcomes: _oldOutcomes, processedRows: _oldProcessed, ...expectedPins } = loaded.job;
            if (json(pins) !== json(expectedPins)) throw new Error('Import progress changed immutable pins');
            await tx.meta('update public.platform_jobs set checkpoint=$3::jsonb,status=$4 where org_id=$1 and id=$2', [orgId, jobId, json(next), next.state]);
            progress = next;
          },
        };
        const result = await work(batch);
        if (!progress) throw new Error('Batch checkpoint is required');
        await tx.meta('insert into public.platform_unit_receipts(org_id,job_id,unit_key,result) values($1,$2,$3,$4::jsonb)', [orgId, jobId, unitKey, json(result)]);
        if ((progress as CsvImportJob).state === 'running') await tx.meta('insert into public.platform_outbox(org_id,job_id,event_key,payload) values($1,$2,$3,$4::jsonb) on conflict do nothing', [orgId, jobId, `continue:${digest(unitKey)}`, json({ kind: 'csv', jobId })]);
        return result;
      }),
    };
    return run(session);
  }
  private identityScope(identity: readonly [number, string, string], orgId: number, mappingId: string): void {
    if (identity[0] !== orgId || identity[1] !== mappingId || !identity[2].trim()) throw new Error('Import identity scope mismatch');
  }
}
