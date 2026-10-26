import { CONTRACT_VERSION, toPublicAnimal } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalFields, AnimalRecord, AnimalId, FieldOwner } from '../../../../../shared/contracts/v1/animal.ts';
import type { AnimalWrite, AnimalWriteService as Writer, WriteActor, WriteResult } from '../../../../../shared/contracts/v1/ingestion.ts';
import { planFieldUpdate } from '../../../../../shared/contracts/v1/policy.ts';
import type { AnimalRepository, AnimalTransaction } from './repository.ts';
import { animalId, fields, InvalidAnimalInput, positive, text, validateAnimalWrite } from './validation.ts';

const forbidden = { ok: false, code: 'forbidden' } as const;
const conflict = { ok: false, code: 'conflict' } as const;
function canonical(v: any): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}
function validActor(actor: WriteActor | null): actor is WriteActor {
  if (!actor || !Number.isSafeInteger(actor.orgId) || actor.orgId < 1) return false;
  return actor.kind === 'member' ? typeof actor.userId === 'string' && !!actor.userId.trim() && ['owner','admin','staff','viewer'].includes(actor.role)
    : actor.kind === 'worker' && typeof actor.connectionId === 'string' && !!actor.connectionId.trim();
}
function sameActor(a: WriteActor, b: WriteActor) {
  return a.orgId === b.orgId && a.kind === b.kind && (a.kind === 'member' && b.kind === 'member' ? a.userId === b.userId : a.kind === 'worker' && b.kind === 'worker' && a.connectionId === b.connectionId);
}
function scope(actor: WriteActor, key: string) {
  return actor.kind === 'member' ? [actor.orgId, 'member', actor.userId, key] : [actor.orgId, 'worker', actor.connectionId, key];
}
const defaults: Omit<AnimalFields, 'name' | 'species'> = { breed: null, age: { kind: 'unknown' }, sex: 'unknown', size: 'unknown', biography: null, photos: [], lifecycle: 'unknown', availability: 'unknown' };

export class AnimalWriteService implements Writer {
  private readonly repository: AnimalRepository;
  constructor(repository: AnimalRepository) { this.repository = repository; }

  async execute(actor: WriteActor, input: AnimalWrite): Promise<WriteResult> {
    let command: AnimalWrite;
    try { command = validateAnimalWrite(input); } catch (e) { if (e instanceof InvalidAnimalInput) return { ok: false, code: 'invalid' }; throw e; }
    // Never trust a caller-supplied role or worker identity. The repository resolves it again.
    if (!validActor(actor)) return forbidden;
    const claim = structuredClone(actor);
    return this.repository.transaction(async tx => {
      const verified = await tx.verifyActor(claim);
      if (!validActor(verified) || !validActor(actor) || !sameActor(claim, verified) || verified.orgId !== command.orgId || (verified.kind === 'member' && verified.role === 'viewer')) return forbidden;
      if ((command.kind === 'source_upsert') !== (verified.kind === 'worker')) return forbidden;
      if (command.kind === 'source_upsert' && verified.kind === 'worker' && verified.connectionId !== command.connectionId) return forbidden;
      if (command.kind === 'publish' && (verified.kind !== 'member' || !['owner','admin'].includes(verified.role))) return forbidden;
      // Revalidate job/lease scope even for replay; revoked/disconnected jobs cannot replay.
      if ((command.kind === 'source_upsert' || (command.kind === 'create_native' && command.csvOrigin)) && !await tx.verifyIngestion(verified, command)) return forbidden;
      const receiptScope = scope(verified, command.idempotencyKey);
      const fingerprint = canonical(command);
      const prior = await tx.receipt(receiptScope);
      if (prior) return prior.fingerprint !== fingerprint ? conflict : prior.result.ok ? { ...prior.result, replayed: true } : prior.result;
      const result = await this.apply(tx, verified, command);
      // Rejected attempts are not receipts: users may resolve conflicts with a new command.
      if (result.ok) await tx.saveReceipt(receiptScope, fingerprint, result);
      return result;
    });
  }

  private async apply(tx: AnimalTransaction, actor: WriteActor, c: AnimalWrite): Promise<WriteResult> {
    let record: AnimalRecord | null = null;
    if (c.kind === 'source_upsert') {
      record = await tx.findSource(c.orgId, c.connectionId, c.externalRecordId);
      if ((record?.revision ?? null) !== c.expectedRevision) return conflict;
      if (c.sourceRevision !== null && await tx.hasSourceRevision(c.orgId, c.connectionId, c.externalRecordId, c.sourceRevision)) return conflict;
    } else if (c.kind !== 'create_native') {
      record = await tx.get(c.orgId, c.animalId);
      if (!record || record.orgId !== c.orgId) return { ok: false, code: 'not_found' };
      if (record.revision !== c.expectedRevision || c.expectedRevision >= Number.MAX_SAFE_INTEGER) return conflict;
    }
    if (c.kind === 'create_native' && c.csvOrigin?.importKey !== null && c.csvOrigin?.importKey !== undefined) {
      if (await tx.findImport(c.orgId, c.csvOrigin.mappingId, c.csvOrigin.importKey)) return conflict;
    }
    if ('fields' in c && c.fields.photos) {
      for (const p of c.fields.photos) if (!await tx.isPhotoAllowed(c.orgId, p.url)) return { ok: false, code: 'invalid', fields: ['photos'] };
    }
    const expected = record?.revision ?? null;
    if (!record) {
      if (c.kind !== 'create_native' && c.kind !== 'source_upsert') return { ok: false, code: 'not_found' };
      const initial = { ...defaults, ...c.fields } as AnimalFields;
      try { fields(initial); } catch { return { ok: false, code: 'invalid' }; }
      const owner: FieldOwner = c.kind === 'source_upsert' ? { kind: 'connector', connectionId: c.connectionId } : { kind: 'barkhaus' };
      record = {
        contractVersion: CONTRACT_VERSION, id: await tx.allocateId(), orgId: c.orgId, revision: 1,
        source: c.kind === 'source_upsert' ? { kind: 'connector', connectionId: c.connectionId, provider: await tx.provider(c.orgId, c.connectionId), externalRecordId: c.externalRecordId } : { kind: 'native', ...(c.csvOrigin ? { csvOrigin: c.csvOrigin } : {}) },
        fields: initial, ownership: Object.fromEntries(Object.keys(initial).map(k => [k, owner])) as AnimalRecord['ownership'],
        publication: { state: 'unpublished', publicProfileKey: null, approvedPhotos: [] },
        privateData: { internalNotes: '', documentIds: [], medicalRecordIds: [] },
        customFields: Object.fromEntries(Object.entries(c.customFields ?? {}).map(([k, value]) => [k, { value, owner }])),
        syncState: c.kind === 'source_upsert' ? 'current' : 'never_synced',
      };
    } else if (c.kind === 'edit_native' || c.kind === 'source_upsert') {
      const planned = planFieldUpdate(record, actor, c.expectedRevision!, c.fields, c.customFields);
      if (!planned.ok) return planned;
      record = { ...record, fields: planned.fields, customFields: planned.customFields, revision: planned.nextRevision,
        privateData: { ...record.privateData, ...(c.kind === 'edit_native' && c.internalNotes !== undefined ? { internalNotes: c.internalNotes } : {}) },
        syncState: c.kind === 'source_upsert' ? 'current' : record.syncState,
      };
      // Approval binds BOTH candidate identity and URL; replacement never inherits approval.
      record.publication = { ...record.publication, approvedPhotos: record.publication.approvedPhotos.filter(a => record!.fields.photos.some(p => p.id === a.id && p.url === a.url)) };
    } else {
      record = structuredClone(record); record.revision++;
      if (c.kind === 'publish') {
        if (record.publication.state === 'archived') return conflict;
        if (record.publication.publicProfileKey && record.publication.publicProfileKey !== c.publicProfileKey) return conflict;
        for (const a of c.approvedPhotos) if (!record.fields.photos.some(p => p.id === a.id && p.url === a.url) || !await tx.isPhotoAllowed(c.orgId, a.url)) return { ok: false, code: 'invalid', fields: ['approvedPhotos'] };
        record.publication = { state: 'published', publicProfileKey: c.publicProfileKey, approvedPhotos: c.approvedPhotos };
      } else if (c.kind === 'archive' || c.kind === 'unpublish') {
        if (record.publication.state === 'archived' && c.kind === 'unpublish') return conflict;
        record.publication.state = c.kind === 'archive' ? 'archived' : 'unpublished';
      }
    }
    if (!await tx.put(record, expected)) return conflict;
    if (c.kind === 'source_upsert' && c.sourceRevision !== null) await tx.saveSourceRevision(c.orgId, c.connectionId, c.externalRecordId, c.sourceRevision);
    return { ok: true, animal: record, replayed: false };
  }

  async read(actor: WriteActor, orgId: number, id?: AnimalId) {
    positive(orgId); if (id !== undefined) animalId(id);
    return this.repository.transaction(async tx => {
      const verified = await tx.verifyActor(actor);
      if (!validActor(verified) || !validActor(actor) || !sameActor(actor, verified) || verified.kind !== 'member' || verified.orgId !== orgId) return null;
      if (id !== undefined) { const r = await tx.get(orgId, id); return r?.orgId === orgId ? r : null; }
      return (await tx.list(orgId)).filter(r => r.orgId === orgId);
    });
  }

  /** Internal public projection helper; transport must resolve tenant independently before calling. */
  async publicProfile(orgId: number, key: string) {
    positive(orgId); text(key, true, 200);
    return this.repository.transaction(async tx => {
      const record = (await tx.list(orgId)).find(r => r.orgId === orgId && r.publication.publicProfileKey === key);
      return record ? toPublicAnimal(record) : null;
    });
  }

  async document(actor: WriteActor, orgId: number, id: AnimalId, documentId: string) {
    positive(orgId); animalId(id); text(documentId, true, 200);
    return this.repository.transaction(async tx => {
      const verified = await tx.verifyActor(actor);
      if (!validActor(verified) || !validActor(actor) || !sameActor(actor, verified) || verified.kind !== 'member' || verified.orgId !== orgId) return null;
      const record = await tx.get(orgId, id);
      if (!record || record.orgId !== orgId || ![...record.privateData.documentIds, ...record.privateData.medicalRecordIds].includes(documentId)) return null;
      const url = await tx.signPrivateDocument(orgId, id, documentId, 60);
      if (!url || !url.startsWith('https://')) return null;
      return { url, expiresInSeconds: 60 };
    });
  }
}
