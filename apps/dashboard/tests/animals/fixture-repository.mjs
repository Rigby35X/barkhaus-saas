/** Contract-compatible transactional TEST fixture. No staging/persistence claim. */
import { randomUUID } from 'node:crypto';
const copy = v => structuredClone(v);
const tuple = (...v) => JSON.stringify(v);
export function fixtureStore() {
  return { rows: new Map(), receipts: new Map(), revisions: new Set(),
    memberships: new Map([['1001:owner','owner'],['1001:staff','staff'],['1001:viewer','viewer'],['1002:owner','owner']]),
    connections: new Map([['1002:c1','cognito'], ['1002:c2','cognito']]),
    photos: new Set(['https://images.example/1001/a.jpg','https://images.example/1001/b.jpg','https://images.example/1002/a.jpg','https://images.example/1002/b.jpg']),
    tail: Promise.resolve(), failReceipt: false,
  };
}
export function fixtureRepository(store, principal) {
  return { async transaction(run) {
    const before = store.tail;
    let release; store.tail = new Promise(resolve => { release = resolve; });
    await before;
    const state = { rows: copy(store.rows), receipts: copy(store.receipts), revisions: copy(store.revisions) };
    const tx = {
      async verifyActor(claim) {
        // Ambient session/worker capability, not caller fields, establishes identity.
        if (!principal || claim.kind !== principal.kind || claim.orgId !== principal.orgId) return null;
        if (claim.kind === 'member') {
          if (claim.userId !== principal.userId) return null;
          const role = store.memberships.get(`${claim.orgId}:${principal.userId}`);
          return role ? { ...claim, role } : null;
        }
        return principal.connectionId === claim.connectionId && store.connections.has(`${claim.orgId}:${claim.connectionId}`) ? copy(principal) : null;
      },
      async get(orgId, id) { const r = state.rows.get(tuple(orgId,id)); return r ? copy(r) : null; },
      async list(orgId) { return [...state.rows.values()].filter(r => r.orgId === orgId).map(copy); },
      async findSource(orgId, connectionId, externalRecordId) { return copy([...state.rows.values()].find(r => r.orgId === orgId && r.source.kind === 'connector' && r.source.connectionId === connectionId && r.source.externalRecordId === externalRecordId) ?? null); },
      async findImport(orgId, mappingId, importKey) { return copy([...state.rows.values()].find(r => r.orgId === orgId && r.source.kind === 'native' && r.source.csvOrigin?.mappingId === mappingId && r.source.csvOrigin?.importKey === importKey) ?? null); },
      async verifyIngestion(actor, command) {
        if (command.kind === 'source_upsert') return principal?.kind === 'worker' && store.connections.has(`${actor.orgId}:${command.connectionId}`);
        if (command.kind !== 'create_native' || !command.csvOrigin) return true;
        return command.csvOrigin?.mappingId === 'mapping-1001' && command.csvOrigin?.jobId === 'job-1001' && actor.orgId === 1001;
      },
      async provider(orgId, connectionId) { const p = store.connections.get(`${orgId}:${connectionId}`); if (!p) throw Error('No scoped connection'); return p; },
      async allocateId() { return randomUUID(); },
      async sourceOwnership(_orgId,connectionId) { return Object.fromEntries(['name','species','breed','age','sex','size','biography','photos','lifecycle','availability'].map(k=>[k,{kind:'connector',connectionId}])); },
      async put(animal, expected) {
        const k = tuple(animal.orgId,animal.id);
        if ((state.rows.get(k)?.revision ?? null) !== expected) return false;
        const duplicate = [...state.rows.values()].some(r => {
          if (r.orgId !== animal.orgId || r.id === animal.id) return false;
          if (animal.publication.publicProfileKey && animal.publication.publicProfileKey === r.publication.publicProfileKey) return true;
          if (animal.source.kind === 'connector' && r.source.kind === 'connector') return animal.source.connectionId === r.source.connectionId && animal.source.externalRecordId === r.source.externalRecordId;
          const a = animal.source.csvOrigin, b = r.source.csvOrigin;
          return a?.importKey != null && a.mappingId === b?.mappingId && a.importKey === b.importKey;
        });
        if (duplicate) return false;
        state.rows.set(k, copy(animal)); return true;
      },
      async receipt(scope) { return copy(state.receipts.get(JSON.stringify(scope)) ?? null); },
      async saveReceipt(scope, fingerprint, result) { if (store.failReceipt) throw Error('injected commit failure'); state.receipts.set(JSON.stringify(scope), copy({ fingerprint, result })); },
      async hasSourceRevision(...args) { return state.revisions.has(tuple(...args)); },
      async saveSourceRevision(...args) { state.revisions.add(tuple(...args)); },
      async isPhotoAllowed(orgId,url) { return store.photos.has(url) && url.startsWith(`https://images.example/${orgId}/`); },
      async signPrivateDocument(orgId, animalId, documentId, ttl) {
        if (principal?.kind !== 'member' || principal.orgId !== orgId || ttl !== 60) return null;
        const r = state.rows.get(tuple(orgId,animalId));
        return r?.privateData.documentIds.includes(documentId) ? `https://private.example/signed/${orgId}/${documentId}?ttl=60` : null;
      },
    };
    try { const result = await run(tx); store.rows = state.rows; store.receipts = state.receipts; store.revisions = state.revisions; return copy(result); }
    finally { release(); }
  } };
}
