import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvImportService, sha256 } from '../../../tenant-site/src/services/imports/service.ts';
import { IMPORT_LIMITS, parseCsv, previewCsv, validateMapping } from '../../src/features/imports/csv.ts';
import { actor, authorize, csv, FixtureStore, input, mapping } from './fixture-store.mjs';
const date = () => '2026-10-26';
async function fixture() { const store = new FixtureStore(); await store.saveMapping(actor, mapping()); return { store, service: new CsvImportService(store, authorize, date) }; }
const row = (key = 'a', name = 'Lucky', species = 'dog', status = 'Available') => `Key,Name,Species,Status\n${key},${name},${species},${status}`;

test('BOM, CRLF, escaped quotes, quoted commas and newlines retain logical record numbers', () => {
  const parsed = parseCsv(csv); assert.deepEqual(parsed.headers, ['Key', 'Name', 'Species', 'Status']);
  assert.equal(parsed.rows[0].cells[1], 'Lucky, Jr.'); assert.equal(parsed.rows[1].cells[1], 'Lucky\nSecond'); assert.equal(parsed.rows[1].row, 3);
  assert.deepEqual(parseCsv('Name,Species\n"A ""quoted"" dog",dog').rows[0].cells, ['A "quoted" dog', 'dog']);
});
test('duplicate/blank headers and missing mapped columns fail before writes', async () => {
  const { service, store } = await fixture();
  for (const source of ['Name,name\na,b', 'Name,\na,b', 'Name,Species\na,dog']) await assert.rejects(service.start(actor, input(), source));
  assert.equal(store.calls, 0); assert.equal(store.jobs.size, 0);
});
test('exact row/field issues for malformed columns, dates, required fields and statuses', () => {
  const m = mapping(); m.fields.push({ sourceColumn: 'Birthday', target: { kind: 'core', field: 'age' }, transform: 'birthday' });
  const p = previewCsv('Key,Name,Species,Status,Birthday\na,,,Medical,2026-02-30\nb,Okay,dog,Available,2027-01-01\nc,Bad,dog,Pending', m, input().matching, date(), 1001);
  assert.deepEqual(p.rows[0].issues.map(i => [i.row, i.field, i.code, i.message]), [
    [2, 'lifecycle', 'unknown_status', 'Status requires an approved saved mapping'],
    [2, 'age', 'invalid_date', 'Birthday must be a real nonfuture ISO date (YYYY-MM-DD)'],
    [2, 'name', 'required', 'Name is required'], [2, 'species', 'required', 'Species is required'],
  ]);
  assert.equal(p.rows[1].issues[0].code, 'invalid_date'); assert.equal(p.rows[2].issues[0].message, 'Expected 5 columns; received 4');
});
test('malformed quoted records cannot import silently', async () => {
  const { service, store } = await fixture();
  const source = 'Key,Name,Species,Status\na,"Oops"trailing,dog,Available\nb,"unfinished,dog,Available';
  await service.start(actor, input(), source); const job = await service.runBatch(actor, 1001, 'job-1');
  assert.equal(job.outcomes.length, 2); assert.ok(job.outcomes.every(o => o.state === 'rejected')); assert.equal(store.calls, 0);
});
test('preview performs no writes; valid fixture creates only unpublished animals without approved photos', async () => {
  const { service, store } = await fixture(); const preview = await service.preview(actor, input(), csv);
  assert.equal(preview.issues.length, 0); assert.equal(store.calls, 0); assert.equal(store.jobs.size, 0);
  await service.start(actor, input(), csv); assert.equal(store.calls, 0);
  const job = await service.runBatch(actor, 1001, 'job-1'); assert.equal(job.state, 'completed'); assert.equal(store.animals.size, 2);
  for (const animal of store.animals.values()) { assert.equal(animal.publication.state, 'unpublished'); assert.deepEqual(animal.publication.approvedPhotos, []); assert.deepEqual(animal.fields.photos, []); }
});
test('stable-key repeat updates intended record; equal names with distinct keys stay distinct', async () => {
  const { service, store } = await fixture();
  await service.start(actor, input(), row() + '\nb,Lucky,dog,Pending'); await service.runBatch(actor, 1001, 'job-1');
  await service.start(actor, input('job-2'), row('a', 'New name')); const j = await service.runBatch(actor, 1001, 'job-2');
  assert.equal(j.outcomes[0].state, 'updated'); assert.equal(store.animals.size, 2); assert.equal(store.animals.get(1).fields.name, 'New name'); assert.equal(store.animals.get(2).fields.name, 'Lucky');
});
test('scoped stable keys cannot collide across mappings or organizations', async () => {
  const { service, store } = await fixture();
  await service.start(actor, input(), row()); await service.runBatch(actor, 1001, 'job-1');
  await store.saveMapping(actor, mapping(1001, 'second-source')); await store.saveMapping(actor, mapping(1002));
  const second = { ...input('job-2'), mappingId: 'second-source', matching: { mode: 'stable_key', mappingId: 'second-source', keyColumn: 'Key' } };
  await service.start(actor, second, row()); await service.runBatch(actor, 1001, 'job-2');
  const other = { ...actor, orgId: 1002 }; await service.start(other, { ...input(), orgId: 1002 }, row()); await service.runBatch(other, 1002, 'job-1');
  assert.equal(store.animals.size, 3); assert.equal(store.identities.size, 3);
  await assert.rejects(service.start(actor, { ...input(), matching: { mode: 'stable_key', mappingId: 'second-source', keyColumn: 'Key' } }, row()), /scope/);
});
test('duplicate keys reject every ambiguous row; blank keys do not infer matches from names', async () => {
  const { service, store } = await fixture(); const source = row() + '\na,Another,cat,Pending\n,Lucky,dog,Available';
  await service.start(actor, input(), source); const job = await service.runBatch(actor, 1001, 'job-1');
  assert.deepEqual(job.outcomes.map(o => o.issues[0].code), ['duplicate_key', 'duplicate_key', 'missing_key']); assert.equal(store.animals.size, 0);
});
test('create-only requires acknowledgement, warns, replays same job and permits deliberate new jobs', async () => {
  const { service, store } = await fixture(); const req = input('job-1', { mode: 'create_only' });
  assert.equal((await service.preview(actor, req, csv)).warnings.length, 1);
  await assert.rejects(service.start(actor, { ...req, acknowledgeCreateOnly: false }, csv), /Acknowledge/);
  await service.start(actor, req, csv); await service.runBatch(actor, 1001, req.id); await service.start(actor, req, csv); await service.runBatch(actor, 1001, req.id);
  assert.equal(store.animals.size, 2); await service.start(actor, { ...req, id: 'job-2' }, csv); await service.runBatch(actor, 1001, 'job-2'); assert.equal(store.animals.size, 4);
});
test('reviewed matching requires explicit resolutions, ID and revision; conflicts preserve data', async () => {
  const { service, store } = await fixture();
  await service.start(actor, input(), row()); await service.runBatch(actor, 1001, 'job-1');
  const unresolved = input('job-2', { mode: 'reviewed', resolutions: [] });
  assert.equal((await service.preview(actor, unresolved, row())).issues[0].code, 'resolution_required');
  await assert.rejects(service.preview(actor, input('bad', { mode: 'reviewed', resolutions: [{ row: 2, action: 'update', animalId: 1 }] }), row()), /revision/);
  for (const [id, revision, state] of [['job-2', 1, 'updated'], ['job-3', 1, 'rejected']]) {
    await service.start(actor, input(id, { mode: 'reviewed', resolutions: [{ row: 2, action: 'update', animalId: 1, expectedRevision: revision }] }), row('x', id));
    assert.equal((await service.runBatch(actor, 1001, id)).outcomes[0].state, state);
  }
  assert.equal(store.animals.get(1).fields.name, 'job-2'); assert.equal(store.animals.size, 1);
});
test('partial batch failure resumes without duplicate committed rows or replaying completed writes', async () => {
  const { service, store } = await fixture(); await service.start(actor, input(), csv); store.failBeforeRow = 3;
  const partial = await service.runBatch(actor, 1001, 'job-1'); assert.equal(partial.state, 'partial'); assert.equal(partial.processedRows, 1);
  const resumed = await service.runBatch(actor, 1001, 'job-1'); assert.equal(resumed.state, 'completed'); assert.equal(resumed.processedRows, 2);
  assert.equal(store.animals.size, 2); assert.equal(store.calls, 2); await service.runBatch(actor, 1001, 'job-1'); assert.equal(store.calls, 2);
});
test('lost response after atomic commit is safe across resume', async () => {
  const { service, store } = await fixture(); await service.start(actor, input('job-1', { mode: 'create_only' }), csv); store.loseResponseAt = 2;
  const partial = await service.runBatch(actor, 1001, 'job-1'); assert.equal(partial.processedRows, 1);
  await service.runBatch(actor, 1001, 'job-1'); assert.equal(store.calls, 2); assert.equal(store.animals.size, 2);
});
test('byte, row, column and batch bounds are enforced before animal writes', async () => {
  const { service, store } = await fixture();
  await assert.rejects(service.start(actor, input(), 'x'.repeat(IMPORT_LIMITS.maxBytes + 1)), /byte limit/);
  await assert.rejects(service.start(actor, input(), 'Key,Name,Species,Status\n' + 'a,A,dog,Available\n'.repeat(5001)), /row limit/);
  assert.throws(() => parseCsv(Array(102).fill('x').join(',')), /column limit/);
  const source = 'Key,Name,Species,Status\n' + Array.from({ length: 51 }, (_, i) => `${i},A,dog,Available`).join('\n');
  await service.start(actor, input(), source); const batch = await service.runBatch(actor, 1001, 'job-1'); assert.equal(batch.processedRows, 50); assert.equal(batch.state, 'running');
  await service.runBatch(actor, 1001, 'job-1'); assert.equal(store.animals.size, 51);
  assert.equal(sha256('\uFEFFabc').length, 64);
});
test('viewer, worker, revoked, missing org and cross-org service calls fail closed', async () => {
  const { service, store } = await fixture();
  for (const denied of [null, { ...actor, role: 'viewer' }, { ...actor, revoked: true }, { ...actor, orgId: 1002 }, { kind: 'worker', orgId: 1001, connectionId: 'forged' }]) {
    await assert.rejects(service.preview(denied, input(), csv)); await assert.rejects(service.start(denied, input(), csv)); await assert.rejects(service.runBatch(denied, 1001, 'job-1'));
  }
  await assert.rejects(service.start(actor, { ...input(), orgId: undefined }, csv)); assert.equal(store.jobs.size, 0); assert.equal(store.calls, 0);
});
test('mapping exact JSON, transform allowlist, duplicate targets and org are checked', () => {
  for (const change of [m => { m.orgId = 1002; }, m => { m.fields[0].transform = 'eval(code)'; }, m => { m.fields.push({ ...m.fields[0], target: { field: 'name', kind: 'core' } }); }, m => { m.role = 'owner'; }, m => { m.fields[0].target = { kind: 'custom', key: '__proto__' }; }]) {
    const m = mapping(); change(m); assert.throws(() => validateMapping(m, 1001));
  }
});
test('private custom fields, saved status mappings and estimated birthdays survive normalization', async () => {
  const { service, store } = await fixture(); const m = mapping(); m.revision = 2;
  m.statusMap.Hold = { lifecycle: 'care', availability: 'unavailable' };
  m.fields.push({ sourceColumn: 'Note', target: { kind: 'custom', key: 'intake_note' }, transform: 'trim' }, { sourceColumn: 'Birthday', target: { kind: 'core', field: 'age' }, transform: 'estimated_birthday' });
  await service.saveMapping(actor, m); const req = { ...input(), mappingRevision: 2 };
  await service.start(actor, req, 'Key,Name,Species,Status,Note,Birthday\na,A,dog,Hold, private ,2020-01-01'); await service.runBatch(actor, 1001, req.id);
  const animal = store.animals.get(1); assert.equal(animal.customFields.intake_note.value, 'private'); assert.equal(animal.fields.availability, 'unavailable'); assert.deepEqual(animal.fields.age, { kind: 'birthday', date: '2020-01-01', estimated: true });
  assert.equal(store.mappings.size, 2); await assert.rejects(service.saveMapping(actor, m), /Immutable/);
});
test('photo imports reject every URL, including private/redirect URLs, without any fetch', () => {
  for (const sourceColumn of ['https://127.0.0.1/photo', 'http://169.254.169.254/latest', 'https://example.test/redirect', 'https://images.test/approved.jpg']) {
    const m = mapping(); m.fields.push({ sourceColumn, target: { kind: 'core', field: 'photos' }, transform: null });
    assert.throws(() => validateMapping(m, 1001), /Photo imports are disabled/);
  }
});
test('source-owned, connected and published targets are rejected instead of changing ownership or publication', async () => {
  for (const kind of ['ownership', 'connector', 'published']) {
    const { service, store } = await fixture(); await service.start(actor, input(), row()); await service.runBatch(actor, 1001, 'job-1');
    const animal = store.animals.get(1);
    if (kind === 'ownership') animal.ownership.name = { kind: 'connector', connectionId: 'source' };
    if (kind === 'connector') animal.source = { kind: 'connector', connectionId: 'source', provider: 'fixture', externalRecordId: 'a' };
    if (kind === 'published') animal.publication.state = 'published';
    await service.start(actor, input('job-2'), row('a', 'Overwritten')); const result = await service.runBatch(actor, 1001, 'job-2');
    assert.equal(result.outcomes[0].state, 'rejected'); assert.equal(store.animals.get(1).fields.name, 'Lucky');
  }
});
test('pinned file/mapping/matching tampering and inflated job limits fail before writes', async () => {
  for (const mutate of [d => { d.source += '\n'; }, d => { d.mapping.fields[0].transform = 'lowercase'; }, d => { d.job.matching = { mode: 'create_only' }; }, d => { d.job.limits.batchSize = 51; }, d => { d.job.orgId = 1002; }]) {
    const { service, store } = await fixture(); await service.start(actor, input(), csv); mutate(store.jobs.get('[1001,"job-1"]'));
    await assert.rejects(service.runBatch(actor, 1001, 'job-1')); assert.equal(store.calls, 0);
  }
});
test('writer publication violation rolls back animal, identity and outcome as one unit', async () => {
  const { service, store } = await fixture(); store.badPublication = true;
  await service.start(actor, input(), row()); const result = await service.runBatch(actor, 1001, 'job-1');
  assert.equal(result.state, 'partial'); assert.equal(store.animals.size, 0); assert.equal(store.identities.size, 0); assert.equal(result.outcomes.length, 0);
  store.badPublication = false; await service.runBatch(actor, 1001, 'job-1'); assert.equal(store.animals.size, 1);
});
test('job status/retry and saved mapping reads stay scoped and never execute writes in the browser path', async () => {
  const { service, store } = await fixture();
  await store.saveMapping(actor, mapping(1002)); assert.equal((await service.listMappings(actor, 1001)).length, 1);
  await service.start(actor, input(), csv); assert.equal((await service.job(actor, 1001, 'job-1')).state, 'ready');
  await service.retry(actor, 1001, 'job-1'); assert.deepEqual(store.queued, [[1001, 'job-1']]); assert.equal(store.calls, 0);
  await assert.rejects(service.job(actor, 1002, 'job-1')); await assert.rejects(service.retry(actor, 1002, 'job-1'));
  await service.runBatch(actor, 1001, 'job-1'); await service.retry(actor, 1001, 'job-1'); assert.equal(store.queued.length, 1);
});
