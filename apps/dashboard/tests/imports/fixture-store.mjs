// TEST DOUBLE ONLY. No SDK, database, network, or production writer implementation.
import { planFieldUpdate } from '../../../../shared/contracts/v1/policy.ts';
import { CONTRACT_VERSION } from '../../../../shared/contracts/v1/animal.ts';
import { IMPORT_LIMITS } from '../../src/features/imports/csv.ts';
export const actor = { kind: 'member', userId: 'fixture-user', orgId: 1001, role: 'staff' };
export const authorize = async (context, orgId) => {
  if (!context || context.revoked || context.orgId !== orgId) throw new Error('Access denied');
  return context;
};
export const mapping = (orgId = 1001, id = 'rescue-animals') => ({ version: 1, orgId, id, revision: 1, fields: [
  { sourceColumn: 'Name', target: { kind: 'core', field: 'name' }, transform: 'trim' },
  { sourceColumn: 'Species', target: { kind: 'core', field: 'species' }, transform: 'trim' },
  { sourceColumn: 'Status', target: { kind: 'core', field: 'lifecycle' }, transform: 'status' },
], statusMap: {} });
export const input = (id = 'job-1', match = { mode: 'stable_key', mappingId: 'rescue-animals', keyColumn: 'Key' }) => ({ id, orgId: 1001, mappingId: 'rescue-animals', mappingRevision: 1, matching: match, acknowledgeCreateOnly: true });
export const csv = '\uFEFFKey,Name,Species,Status\r\na,"Lucky, Jr.",dog,Available\r\nb,"Lucky\nSecond",cat,Pending\r\n';
export class FixtureStore {
  mappings = new Map(); jobs = new Map(); animals = new Map(); identities = new Map(); outcomesByJob = new Map(); ledger = new Map();
  calls = 0; failBeforeRow = null; loseResponseAt = null; failProgress = false; badPublication = false; active = new Set();
  queued = [];
  async listMappings(orgId) { return structuredClone([...this.mappings.values()].filter(m => m.orgId === orgId)); }
  async queueRetry(_actor, orgId, jobId) { if (!this.jobs.has(JSON.stringify([orgId, jobId]))) throw new Error('Job not found'); this.queued.push([orgId, jobId]); }
  async mapping(orgId, id, revision) { const value = this.mappings.get(JSON.stringify([orgId, id, revision])); if (!value) throw new Error('Mapping not found'); return structuredClone(value); }
  async saveMapping(_actor, value) { const key = JSON.stringify([value.orgId, value.id, value.revision]); if (this.mappings.has(key)) throw new Error('Immutable mapping revision exists'); this.mappings.set(key, structuredClone(value)); }
  async enqueue(_actor, request, source, digest, asOf, seal) {
    const key = JSON.stringify([request.orgId, request.id]);
    if (this.jobs.has(key)) { if (this.jobs.get(key).seal !== seal) throw new Error('Changed job replay'); return this.jobs.get(key).job; }
    const job = { version: 1, id: request.id, orgId: request.orgId, mappingId: request.mappingId, mappingRevision: request.mappingRevision, sourceFile: { storageRef: `private/${request.id}`, sha256: digest }, matching: structuredClone(request.matching), limits: { ...IMPORT_LIMITS }, state: 'ready', processedRows: 0, outcomes: [] };
    this.jobs.set(key, { job, asOf, seal, source, mapping: await this.mapping(request.orgId, request.mappingId, request.mappingRevision) });
    this.outcomesByJob.set(key, new Map()); return structuredClone(job);
  }
  async withJob(orgId, id, run) {
    const key = JSON.stringify([orgId, id]); if (this.active.has(key)) throw new Error('Job leased');
    this.active.add(key);
    try {
      const definition = this.jobs.get(key); if (!definition) throw new Error('Job not found');
      const outcomes = this.outcomesByJob.get(key);
      const durableJob = () => structuredClone({ ...definition.job, outcomes: [...outcomes.values()].sort((a,b) => a.row-b.row), processedRows: outcomes.size });
      return await run({ definition, mapping: definition.mapping, source: definition.source,
        outcomes: async () => structuredClone([...outcomes.values()]),
        markInterrupted: async () => {
          // A lost acknowledgement may follow a successful whole-batch commit.
          // Never replace its authoritative progress with the rolled-back draft.
          if (definition.job.state !== 'completed') definition.job.state = 'partial';
          return durableJob();
        },
        commitBatch: async workBatch => {
          const animals = structuredClone(this.animals), identities = structuredClone(this.identities), ledger = structuredClone(this.ledger), rowOutcomes = structuredClone(outcomes);
          let progress = structuredClone(definition.job);
          const processed = [];
          const result = await workBatch({
            outcomes: async () => structuredClone([...rowOutcomes.values()]),
            saveProgress: async job => {
              if (this.failProgress) { this.failProgress = false; throw new Error('Injected checkpoint failure'); }
              progress = structuredClone(job);
            },
            row: async (rowKey, work) => {
              if (rowKey[0] !== orgId || rowKey[1] !== id) throw new Error('Row scope mismatch');
              const row = rowKey[2];
              if (this.failBeforeRow === row) { this.failBeforeRow = null; throw new Error('Injected batch failure'); }
              processed.push(row);
              const tx = {
                outcome: async () => structuredClone(rowOutcomes.get(row) ?? null),
                findIdentity: async identity => animals.get(identities.get(JSON.stringify(identity))) ?? null,
                findAnimal: async (scope, id) => { const a = animals.get(id); return a?.orgId === scope ? a : null; },
                bindIdentity: async (identity, id) => { const k = JSON.stringify(identity); if (identities.has(k) && identities.get(k) !== id) throw new Error('Identity conflict'); identities.set(k, id); },
                record: async outcome => rowOutcomes.set(row, structuredClone(outcome)),
                writer: { execute: async (who, command) => {
                  this.calls++;
                  const prior = ledger.get(command.idempotencyKey); if (prior) { if (prior.digest !== JSON.stringify(command)) return { ok: false, code: 'invalid' }; return { ...prior.result, replayed: true }; }
                  if (who.orgId !== command.orgId || who.role === 'viewer') return { ok: false, code: 'forbidden' };
                  let animal;
                  if (command.kind === 'create_native') {
                    animal = { contractVersion: CONTRACT_VERSION, id: animals.size + 1, orgId: command.orgId, revision: 1, source: { kind: 'native', csvOrigin: command.csvOrigin }, fields: structuredClone(command.fields), ownership: Object.fromEntries(Object.keys(command.fields).map(k => [k, { kind: 'barkhaus' }])), publication: { state: this.badPublication ? 'published' : 'unpublished', publicProfileKey: null, approvedPhotos: [] }, privateData: { internalNotes: '', medicalRecordIds: [], documentIds: [] }, customFields: Object.fromEntries(Object.entries(command.customFields ?? {}).map(([k, value]) => [k, { value, owner: { kind: 'barkhaus' } }])), syncState: 'never_synced' };
                  } else {
                    const prior = animals.get(command.animalId); if (!prior) return { ok: false, code: 'not_found' };
                    const plan = planFieldUpdate(prior, who, command.expectedRevision, command.fields, command.customFields); if (!plan.ok) return plan;
                    animal = { ...prior, fields: plan.fields, revision: plan.nextRevision, customFields: plan.customFields };
                  }
                  animals.set(animal.id, animal); const result = { ok: true, animal, replayed: false }; ledger.set(command.idempotencyKey, { digest: JSON.stringify(command), result }); return result;
                } },
              };
              return work(tx);
            },
          });
          // One commit, after every row AND the authoritative checkpoint succeeds.
          this.animals = animals; this.identities = identities; this.ledger = ledger;
          outcomes.clear(); for (const [row, value] of rowOutcomes) outcomes.set(row, value);
          definition.job = progress;
          if (processed.includes(this.loseResponseAt)) { this.loseResponseAt = null; throw new Error('Committed but acknowledgement lost'); }
          return result;
        },
      });
    } finally { this.active.delete(key); }
  }
}
