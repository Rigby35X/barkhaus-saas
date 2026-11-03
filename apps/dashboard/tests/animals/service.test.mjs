import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AnimalWriteService } from '../../../tenant-site/src/services/animals/AnimalWriteService.ts';
import { createAnimalHttpHandler } from '../../../tenant-site/src/services/animals/http.ts';
import { validateAnimalWrite } from '../../../tenant-site/src/services/animals/validation.ts';
import { fixtureStore, fixtureRepository } from './fixture-repository.mjs';

const owner = { kind: 'member', userId: 'owner', orgId: 1001, role: 'owner' };
const staff = { ...owner, userId: 'staff', role: 'staff' };
const viewer = { ...owner, userId: 'viewer', role: 'viewer' };
const worker = { kind: 'worker', orgId: 1002, connectionId: 'c1' };
const owner2 = { ...owner, orgId: 1002 };
const f = { name: 'Poppy', species: 'Dog', breed: 'Mixed', age: { kind: 'birthday', date: '2025-01-02', estimated: true }, sex: 'female', size: 'medium', biography: 'Hello', photos: [{ id: 'a', url: 'https://images.example/1001/a.jpg', alt: 'Poppy' }], lifecycle: 'care', availability: 'available' };
const create = (key = 'create', extra = {}) => ({ version: 1, orgId: 1001, kind: 'create_native', idempotencyKey: key, fields: structuredClone(f), ...extra });
const edit = (a, key = 'edit', extra = {}) => ({ version: 1, orgId: a.orgId, kind: 'edit_native', idempotencyKey: key, animalId: a.id, expectedRevision: a.revision, fields: { name: 'New name' }, ...extra });
const action = (a, kind, extra = {}) => ({ version: 1, orgId: a.orgId, kind, idempotencyKey: crypto.randomUUID(), animalId: a.id, expectedRevision: a.revision, ...extra });
const upsert = (key = 'source', extra = {}) => ({ version: 1, orgId: 1002, kind: 'source_upsert', idempotencyKey: key, connectionId: 'c1', externalRecordId: '42', sourceRevision: 'opaque-z', expectedRevision: null, fields: { ...f, photos: [{ id: 'a', url: 'https://images.example/1002/a.jpg', alt: '' }] }, customFields: { sourceTag: 'tag' }, ...extra });
function setup() {
  const store = fixtureStore();
  const service = (actor = owner) => new AnimalWriteService(fixtureRepository(store, actor));
  return { store, service, s: service() };
}
async function ok(p) { const r = await p; assert.equal(r.ok, true, JSON.stringify(r)); return r.animal; }

test('create/reload/edit retains every field, separate same names have stable distinct identities', async () => {
  const { service, s } = setup();
  const a = await ok(s.execute(owner, create('a', { customFields: { foster: { private: true } } })));
  assert.deepEqual(a.fields, f); assert.equal(a.publication.state, 'unpublished');
  assert.deepEqual(await service().read(owner, 1001, a.id), a);
  const b = await ok(s.execute(owner, create('b'))); assert.notEqual(a.id, b.id);
  const updated = await ok(service().execute(owner, edit(a, 'e', { fields: { biography: 'Updated' }, internalNotes: 'Private', customFields: { foster: false } })));
  assert.deepEqual(updated.fields, { ...f, biography: 'Updated' }); assert.equal(updated.customFields.foster.value, false);
  assert.equal((await service().read(owner, 1001, a.id)).privateData.internalNotes, 'Private');
});

test('exact runtime JSON validation rejects identity, ownership, unknown/nested fields and malformed values', () => {
  const cases = [ { actor: owner }, { orgId: undefined }, { revision: 20 }, { fields: { ...f, age: { kind: 'birthday', date: '2025-02-30', estimated: false } } }, { fields: { ...f, age: { kind: 'birthday', date: '2999-01-01', estimated: false } } }, { fields: { ...f, photos: [{ id: 'a', url: 'http://127.0.0.1/a', alt: '' }] } }, { fields: { ...f, lifecycle: 'Published' } }, { fields: { ...f, species: ' ' } }, { fields: { ...f, age: { kind: 'unknown', private: 'leak' } } }, { customFields: JSON.parse('{"__proto__":1}') }, { fields: { ...f, photos: [...f.photos,...f.photos] } }, { fields: { ...f, approvedPhotos: [] } } ];
  for (const extra of cases) assert.throws(() => validateAnimalWrite(create('bad', extra)));
});

test('viewer, revoked membership, cross-org and forged role/worker fail inside repository authorization', async () => {
  const { s, service, store } = setup();
  const a = await ok(s.execute(owner, create()));
  assert.equal((await service(viewer).execute({ ...viewer, role: 'owner' }, edit(a))).code, 'forbidden');
  assert.equal((await service(staff).execute({ ...staff, role: 'owner' }, action(a, 'publish', { publicProfileKey: 'p', approvedPhotos: [] }))).code, 'forbidden');
  assert.equal((await service(owner2).execute(owner2, edit(a))).code, 'forbidden');
  assert.equal(await service(owner2).read(owner2, 1001, a.id), null);
  assert.equal((await service(owner2).execute(worker, upsert())).code, 'forbidden');
  store.memberships.delete('1001:owner');
  assert.equal((await s.execute(owner, create())).code, 'forbidden');
  assert.equal(await s.read(owner, 1001, a.id), null);
});

test('two simultaneous CAS edits yield one success, reject the other without lost writes', async () => {
  const { s, service } = setup(); const a = await ok(s.execute(owner, create()));
  const results = await Promise.all([s.execute(owner, edit(a,'one')), service().execute(owner, edit(a,'two',{ fields: { name: 'Rejected input' } }))]);
  assert.equal(results.filter(r => r.ok).length, 1); assert.equal(results.find(r => !r.ok).code, 'conflict');
  assert.equal((await s.read(owner,1001,a.id)).revision, 2); assert.equal((await s.read(owner,1001,a.id)).fields.name, 'New name');
});

test('idempotency replays create/edit once, changed payload/operation conflicts; failed commit rolls back', async () => {
  const { s, store } = setup(); const a = await ok(s.execute(owner, create()));
  const replay = await s.execute(owner, create()); assert.equal(replay.replayed, true); assert.equal(replay.animal.id, a.id);
  assert.equal((await s.execute(owner, create('create',{ fields: { ...f, name: 'different' } }))).code,'conflict');
  const e = edit(a); await ok(s.execute(owner,e)); assert.equal((await s.execute(owner,e)).replayed,true);
  assert.equal((await s.execute(owner, action(a,'archive',{ idempotencyKey: 'edit' }))).code,'conflict');
  store.failReceipt = true; await assert.rejects(s.execute(owner,create('rollback'))); store.failReceipt = false;
  assert.equal((await s.read(owner,1001)).length,1); await ok(s.execute(owner,create('rollback')));
  assert.equal((await s.read(owner,1001)).length,2);
});

test('public projection has exact allowlist; deliberate approval, immutable keys, unpublish/archive retain history', async () => {
  const { s } = setup(); let a = await ok(s.execute(owner, create('a',{ customFields: { secret: true } })));
  assert.equal(await s.publicProfile(1001,'poppy'),null);
  a = await ok(s.execute(owner, edit(a,'notes',{ fields: {}, internalNotes: 'secret medical text' })));
  a = await ok(s.execute(owner, action(a,'publish',{ publicProfileKey: 'poppy', approvedPhotos: [] })));
  assert.deepEqual((await s.publicProfile(1001,'poppy')).photos,[]);
  a = await ok(s.execute(owner, action(a,'publish',{ publicProfileKey: 'poppy', approvedPhotos: [{ id:'a',url:f.photos[0].url }] })));
  const p = await s.publicProfile(1001,'poppy');
  assert.deepEqual(Object.keys(p).sort(), ['contractVersion','publicProfileKey','name','species','breed','age','sex','size','biography','photos','availability'].sort());
  assert.equal(JSON.stringify(p).includes('secret'),false); assert.equal(p.photos.length,1);
  assert.equal((await s.execute(owner,action(a,'publish',{ publicProfileKey:'changed',approvedPhotos:[] }))).code,'conflict');
  a = await ok(s.execute(owner, action(a,'unpublish'))); assert.equal(await s.publicProfile(1001,'poppy'),null);
  a = await ok(s.execute(owner, action(a,'archive'))); assert.equal(await s.publicProfile(1001,'poppy'),null);
  assert.equal((await s.read(owner,1001,a.id)).privateData.internalNotes,'secret medical text');
});

test('photo replacements/order use CAS, vetted org assets, and never inherit approvals', async () => {
  const { s } = setup(); let a = await ok(s.execute(owner,create()));
  a = await ok(s.execute(owner,action(a,'publish',{ publicProfileKey:'poppy',approvedPhotos:[{ id:'a',url:f.photos[0].url }] })));
  assert.equal((await s.execute(owner,edit(a,'bad-photo',{ fields: { photos: [{ id:'x',url:'https://images.example/1002/a.jpg',alt:'' }] } }))).code,'invalid');
  const prior = a;
  a = await ok(s.execute(owner,edit(a,'photo',{ fields: { photos: [{ id:'b',url:'https://images.example/1001/b.jpg',alt:'' }, { id:'a',url:f.photos[0].url,alt:'' }] } })));
  assert.equal(a.fields.photos[0].id,'b'); assert.equal(a.publication.approvedPhotos.length,1);
  assert.equal((await s.execute(owner,edit(prior,'stale-completion',{ fields: { photos: [] } }))).code,'conflict');
  a = await ok(s.execute(owner,edit(a,'replace',{ fields: { photos: [{ id:'a',url:'https://images.example/1001/b.jpg',alt:'' }] } })));
  assert.deepEqual(a.publication.approvedPhotos,[]);
});

test('connector replay, stale revisions, source ownership and local publication/notes/approvals survive sync', async () => {
  const { service } = setup(); const source = service(worker), local = service(owner2);
  let a = await ok(source.execute(worker,upsert()));
  assert.equal((await source.execute(worker,upsert())).replayed,true);
  assert.equal((await local.execute(owner2,edit(a,'forbidden'))).code,'forbidden');
  assert.equal((await local.execute(owner2,edit(a,'forbidden-custom',{ fields:{},customFields:{sourceTag:'tampered'} }))).code,'forbidden');
  a = await ok(local.execute(owner2,edit(a,'notes',{ fields:{}, internalNotes:'Keep me' })));
  a = await ok(local.execute(owner2,action(a,'publish',{ publicProfileKey:'dog-38-42',approvedPhotos:[{id:'a',url:'https://images.example/1002/a.jpg'}] })));
  const before = a;
  a = await ok(source.execute(worker,upsert('next',{ expectedRevision:a.revision,sourceRevision:'opaque-a',fields:{name:'Updated upstream'},customFields:{sourceTag:'new'} })));
  assert.equal(a.privateData.internalNotes,'Keep me'); assert.deepEqual(a.publication,before.publication);
  assert.equal((await source.execute(worker,upsert('stale',{expectedRevision:before.revision,sourceRevision:'opaque-new'}))).code,'conflict');
  assert.equal((await source.execute(worker,upsert('old-revision',{expectedRevision:a.revision}))).code,'conflict');
  assert.equal((await source.execute(worker,{...edit(a),internalNotes:'worker note'})).code,'forbidden');
  assert.equal((await source.execute(worker,action(a,'publish',{publicProfileKey:'bad',approvedPhotos:[]}))).code,'forbidden');
});

test('scoped import identities reject duplicates, no name matching and invalid ingestion grants fail', async () => {
  const { s } = setup(); const csvOrigin = { jobId:'job-1001',mappingId:'mapping-1001',importKey:'key' };
  const a = await ok(s.execute(owner,create('csv',{csvOrigin})));
  assert.equal((await s.execute(owner,create('csv-duplicate',{csvOrigin}))).code,'conflict');
  assert.equal((await s.execute(owner,create('wrong-org-job',{csvOrigin:{...csvOrigin,mappingId:'mapping-1002'}}))).code,'forbidden');
  assert.equal(a.source.kind,'native'); assert.equal(a.publication.state,'unpublished');
});

test('authorized private document access binds animal and org and uses 60-second private signatures', async () => {
  const { s,service,store } = setup(); const a = await ok(s.execute(owner,create()));
  const row = [...store.rows.values()][0]; row.privateData.documentIds = ['medical-1'];
  const access = await s.document(owner,1001,a.id,'medical-1'); assert.equal(access.expiresInSeconds,60); assert.match(access.url,/private.example/);
  assert.equal(await service(owner2).document(owner2,1001,a.id,'medical-1'),null);
  assert.equal(await s.document(owner,1001,a.id,'unknown'),null);
  assert.equal(JSON.stringify(await s.publicProfile(1001,'p')).includes('medical-1'),false);
  store.memberships.delete('1001:owner'); assert.equal(await s.document(owner,1001,a.id,'medical-1'),null);
});

function http(service, actor) { return createAnimalHttpHandler({ service, authenticate: async request => request.headers.get('authorization') === 'Bearer valid' ? actor : null }); }
const post = c => new Request('https://tenant.example/api/v1/animals',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer valid'},body:JSON.stringify(c)});
test('HTTP boundary rejects body actors, missing org, anonymous/viewer/revoked/cross-org; reports CAS 409', async () => {
  const { s,service,store } = setup(); const handle = http(s,owner);
  assert.equal((await handle(post({...create(),actor:owner}))).status,400);
  assert.equal((await handle(post({...create(),orgId:undefined}))).status,400);
  assert.equal((await handle(new Request('https://tenant.example/api/v1/animals?orgId=1001'))).status,403);
  assert.equal((await http(service(viewer),viewer)(post(create()))).status,403);
  assert.equal((await http(service(owner2),owner2)(post(create()))).status,403);
  const response = await handle(post(create())); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
  const a = (await response.json()).animal;
  assert.equal((await handle(post(edit(a,'e1')))).status,200);
  assert.equal((await handle(post(edit(a,'e2')))).status,409);
  store.memberships.delete('1001:owner'); assert.equal((await handle(post(create()))).status,403);
});

test('legacy endpoint is retired for every verb with no-store and no network access', async () => {
  const legacy = await import('../../../tenant-site/src/pages/api/admin/animals.js');
  for (const verb of ['GET','POST','PUT','PATCH','DELETE','OPTIONS']) { const r = legacy[verb](); assert.equal(r.status,410); assert.equal(r.headers.get('cache-control'),'private, no-store'); }
});

test('editor retains attempted input on failure and routes remain coordinator-owned', () => {
  const source = readFileSync(new URL('../../src/features/animals/AnimalEditor.tsx',import.meta.url),'utf8');
  assert.match(source,/catch \(e\) \{ setError/); assert.match(source,/Discard draft and use latest/);
  assert.match(source,/pendingCommand\(pending.current, command\)/);
  assert.doesNotMatch(source,/supabase|storage\.from/);
});

test('shared ingestion transaction rolls animal and row outcome back together', async () => {
  const { withAnimalTransaction } = await import('../../../tenant-site/src/services/animals/index.ts');
  const store = fixtureStore(), repository = fixtureRepository(store, owner);
  await assert.rejects(withAnimalTransaction(repository, async (writer, tx) => {
    const animal = await ok(writer.execute(owner, create('atomic-row')));
    await tx.saveReceipt([1001,'job-1001',1], 'pinned-input', {ok:true,animal,replayed:false});
    throw Error('failure before outcome/checkpoint commit');
  }));
  assert.equal(store.rows.size,0); assert.equal(store.receipts.size,0);
  await withAnimalTransaction(repository, async (writer,tx) => {
    const animal = await ok(writer.execute(owner,create('atomic-row')));
    await tx.saveReceipt([1001,'job-1001',1], 'pinned-input', {ok:true,animal,replayed:false});
  });
  assert.equal(store.rows.size,1); assert.equal(store.receipts.size,2);
});

test('same external identity is distinct per connection; HTTP cannot forge a worker/CSV job', async () => {
  const { service } = setup(); const a = await ok(service(worker).execute(worker,upsert()));
  const worker2 = {...worker,connectionId:'c2'};
  const b = await ok(service(worker2).execute(worker2,upsert('c2',{connectionId:'c2'})));
  assert.notEqual(a.id,b.id);
  const handle = http(service(owner2),owner2);
  assert.equal((await handle(post(upsert()))).status,403);
  const h = http(service(owner),owner);
  assert.equal((await h(post(create('csv-http',{csvOrigin:{jobId:'job-1001',mappingId:'mapping-1001',importKey:'k'}})))).status,403);
});
