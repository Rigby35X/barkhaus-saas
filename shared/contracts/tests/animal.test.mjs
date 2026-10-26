import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACT_VERSION, toPublicAnimal, mapLegacyStatus, legacyCognitoPublicKey } from '../v1/animal.ts';
import { csvIdentity, csvRowIdempotencyKey, connectorIdentity } from '../v1/ingestion.ts';
import { planFieldUpdate, missingRecordAction } from '../v1/policy.ts';
import { reconcileLegacyAnimal } from '../v1/legacy.ts';

function fixture(orgId, connected = false) {
  const fields = {
    name: 'Pip', species: 'dog', breed: null, age: { kind: 'unknown' }, sex: 'unknown', size: 'small',
    biography: 'Approved biography', photos: [
      { id: 'a', url: 'https://images.example/a.jpg', alt: 'Pip' },
      { id: 'b', url: 'https://images.example/private.jpg', alt: 'Private' },
      { id: 'c', url: 'javascript:alert(1)', alt: 'Unsafe' },
    ], lifecycle: 'care', availability: 'available',
  };
  return {
    contractVersion: CONTRACT_VERSION, id: 101, orgId, revision: 2,
    source: connected ? { kind: 'connector', connectionId: 'c1', provider: 'synthetic', externalRecordId: 'external-1' } :
      { kind: 'native', csvOrigin: { jobId: 'job1', mappingId: 'map1', importKey: 'row-key1' } },
    fields, ownership: Object.fromEntries(Object.keys(fields).map(k => [k, connected ? { kind: 'connector', connectionId: 'c1' } : { kind: 'barkhaus' }])),
    publication: { state: 'unpublished', publicProfileKey: null, approvedPhotos: [] },
    privateData: { internalNotes: 'PRIVATE', medicalRecordIds: ['PRIVATE'], documentIds: ['PRIVATE'] },
    customFields: { adopterEmail: { value: 'PRIVATE', owner: { kind: 'barkhaus' } } }, syncState: 'current',
  };
}
const member = (orgId, role = 'staff') => ({ kind: 'member', orgId, userId: 'synthetic-user', role });
const worker = (orgId, connectionId = 'c1') => ({ kind: 'worker', orgId, connectionId });

test('native CSV and connected organizations share private/public shapes without tenant defaults', () => {
  for (const record of [fixture(1001), fixture(1002, true)]) {
    assert.equal(toPublicAnimal(record), null);
    record.publication = { state: 'published', publicProfileKey: `rescue-${record.orgId}-pip`, approvedPhotos: [{ id: 'a', url: 'https://images.example/a.jpg' }] };
    const dto = toPublicAnimal(record);
    assert.equal(dto.name, 'Pip');
    assert.equal(dto.publicProfileKey, record.publication.publicProfileKey);
    assert.deepEqual(dto.photos, [{ url: 'https://images.example/a.jpg', alt: 'Pip' }]);
    assert.equal(JSON.stringify(dto).includes('PRIVATE'), false);
    assert.deepEqual(Object.keys(dto).sort(), ['contractVersion','publicProfileKey','name','species','breed','age','sex','size','biography','photos','availability'].sort());
  }
});
test('public projection also strips unexpected nested properties and archived profiles', () => {
  const record = fixture(1001);
  record.publication = { state: 'published', publicProfileKey: 'pip', approvedPhotos: [{ id: 'a', url: 'https://images.example/a.jpg' }] };
  record.fields.age = { kind: 'birthday', date: '2024-01-01', estimated: true, internalNotes: 'PRIVATE' };
  record.fields.photos[0].secret = 'PRIVATE';
  assert.equal(JSON.stringify(toPublicAnimal(record)).includes('PRIVATE'), false);
  record.publication.state = 'archived';
  assert.equal(toPublicAnimal(record), null);
});
test('native edits are tenant scoped and viewer denied; stale revisions conflict', () => {
  const record = fixture(1001);
  assert.deepEqual(planFieldUpdate(record, member(1002), 2, { name: 'No' }), { ok: false, code: 'forbidden' });
  assert.deepEqual(planFieldUpdate(record, member(1001, 'viewer'), 2, { name: 'No' }), { ok: false, code: 'forbidden' });
  assert.deepEqual(planFieldUpdate(record, member(1001), 1, { name: 'No' }), { ok: false, code: 'conflict' });
  const plan = planFieldUpdate(record, member(1001), 2, { name: 'Updated' });
  assert.equal(plan.fields.name, 'Updated'); assert.equal(plan.nextRevision, 3);
  assert.equal(record.fields.name, 'Pip'); // Planning has no persistence side effect.
});
test('external sync cannot change BarkHaus-owned fields, notes or publication', () => {
  const record = fixture(1002, true);
  record.ownership.biography = { kind: 'barkhaus' };
  assert.equal(planFieldUpdate(record, member(1002), 2, { name: 'Blocked' }).ok, false);
  assert.equal(planFieldUpdate(record, worker(1002, 'other'), 2, { name: 'Blocked' }).ok, false);
  assert.equal(planFieldUpdate(record, worker(1002), 2, { biography: 'Blocked' }).ok, false);
  for (const key of ['privateData', 'publication', 'orgId', 'source', '__proto__']) {
    assert.equal(planFieldUpdate(record, worker(1002), 2, JSON.parse(`{"${key}":"No"}`)).ok, false);
  }
  const updated = planFieldUpdate(record, worker(1002), 2, { name: 'Source update' });
  assert.equal(updated.fields.name, 'Source update');
  assert.equal(record.privateData.internalNotes, 'PRIVATE');
  assert.equal(record.publication.state, 'unpublished');
  assert.equal(planFieldUpdate(record, member(1002), 2, { biography: 'Local annotation' }).ok, true);
});
test('scoped identities distinguish organizations/connections/mappings and avoid delimiter collisions', () => {
  assert.notDeepEqual(connectorIdentity(1001, 'a', 'b'), connectorIdentity(1002, 'a', 'b'));
  assert.notDeepEqual(connectorIdentity(1001, 'a:b', 'c'), connectorIdentity(1001, 'a', 'b:c'));
  assert.notDeepEqual(csvIdentity(1001, 'map-a', 'key'), csvIdentity(1001, 'map-b', 'key'));
  assert.deepEqual(csvRowIdempotencyKey(1001, 'job-a', 2), csvRowIdempotencyKey(1001, 'job-a', 2));
  for (const operation of [() => connectorIdentity(0, 'a', 'b'), () => csvIdentity(1, 'map', ''), () => csvRowIdempotencyKey(1, 'job', 0)]) assert.throws(operation);
});
test('feed failures, partial pages and missing records never trigger deletion', () => {
  for (const outcome of ['failure', 'partial']) assert.equal(missingRecordAction(outcome, false), 'keep');
  assert.equal(missingRecordAction('complete', false), 'missing_review');
  assert.equal(missingRecordAction('complete', true), 'keep');
});
test('legacy status separates lifecycle/availability and preserves deceased semantics', () => {
  assert.deepEqual(mapLegacyStatus('Deceased'), { lifecycle: 'deceased', availability: 'unavailable' });
  assert.deepEqual(mapLegacyStatus('Available: Now'), { lifecycle: 'care', availability: 'available' });
  assert.deepEqual(mapLegacyStatus('custom unknown code'), { lifecycle: 'unknown', availability: 'unknown' });
});
test('reconciliation preserves internal identity, flags aliases and never auto-publishes images', () => {
  const result = reconcileLegacyAnimal({ id: 72, org_id: 1001, name: 'Pip', species: 'dog', status: 'Available',
    age: '6 months', gender: 'Female', image_url: 'https://images.example/1', photo_url: 'https://images.example/2',
    internal_notes: 'PRIVATE', birthday_estimated: true }, '2026-10-26');
  assert.equal(result.id, 72); assert.equal(result.orgId, 1001);
  assert.deepEqual(result.fields.age, { kind: 'estimate', label: '6 months', asOf: '2026-10-26' });
  assert.equal(result.fields.photos.length, 2);
  assert.deepEqual(result.publication.approvedPhotos, []);
  assert.equal(result.publication.state, 'unpublished');
  assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
  assert.throws(() => reconcileLegacyAnimal({ id: 72, org_id: 1001, org: 1002 }, '2026-10-26'));
});
test('birthday precedes age estimate, invalid dates and unitless numeric ages require review', () => {
  const base = { id: 72, org_id: 1001, name: 'Pip', species: 'dog', status: 'Pending' };
  const dated = reconcileLegacyAnimal({ ...base, birthday: '2025-01-02', birthday_is_estimated: false, age: '1 year' }, '2026-10-26');
  assert.deepEqual(dated.fields.age, { kind: 'birthday', date: '2025-01-02', estimated: false });
  for (const birthday of ['2025-02-30', '2027-01-01']) assert.ok(reconcileLegacyAnimal({ ...base, birthday }, '2026-10-26').issues.length);
  assert.deepEqual(reconcileLegacyAnimal({ ...base, age: 2 }, '2026-10-26').fields.age, { kind: 'unknown' });
  assert.ok(reconcileLegacyAnimal({ ...base, status: 'Adopted', Code: 'Available' }, '2026-10-26').issues.length);
});
test('MBPR public key adapter retains form and entry number exactly, without deriving internal identity', () => {
  assert.equal(legacyCognitoPublicKey('38', '00042'), 'dog-38-00042');
  assert.throws(() => legacyCognitoPublicKey('38', '../42'));
});

test('sync replacing or adding photos cannot reuse local publication approval', () => {
  const record = fixture(1002, true);
  record.publication = { state: 'published', publicProfileKey: 'pip', approvedPhotos: [{ id: 'a', url: 'https://images.example/a.jpg' }] };
  const plan = planFieldUpdate(record, worker(1002), 2, { photos: [
    { id: 'a', url: 'https://images.example/replaced.jpg', alt: 'Changed' },
    { id: 'new', url: 'https://images.example/new.jpg', alt: 'New' },
  ] });
  assert.equal(plan.ok, true);
  assert.deepEqual(toPublicAnimal({ ...record, fields: plan.fields }).photos, []);
});
test('custom mappings remain private and obey per-key ownership', () => {
  const record = fixture(1002, true);
  record.customFields.sourceColor = { value: 'brown', owner: { kind: 'connector', connectionId: 'c1' } };
  const plan = planFieldUpdate(record, worker(1002), 2, {}, { sourceColor: 'black' });
  assert.equal(plan.customFields.sourceColor.value, 'black');
  assert.equal(plan.customFields.adopterEmail.value, 'PRIVATE');
  assert.equal(planFieldUpdate(record, worker(1002), 2, {}, { adopterEmail: 'No' }).ok, false);
  assert.equal(planFieldUpdate(record, member(1002), 2, {}, { sourceColor: 'No' }).ok, false);
  assert.equal(planFieldUpdate(record, worker(1002), 2, {}, { unregistered: 'No' }).ok, false);
});
test('invalid stored revisions cannot yield zero or overflowing CAS versions', () => {
  for (const revision of [0, -1, Number.MAX_SAFE_INTEGER]) {
    const record = { ...fixture(1001), revision };
    assert.equal(planFieldUpdate(record, member(1001), revision, {}).ok, false);
  }
});
