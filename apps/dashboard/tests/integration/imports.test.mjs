import test from 'node:test';
import assert from 'node:assert/strict';
import { SqlImportStore } from '../../../tenant-site/src/services/imports/sql-store.ts';
import { CsvImportService, sha256 } from '../../../tenant-site/src/services/imports/service.ts';
import { fixture, owner, owner2, staff, viewer } from './database.mjs';

const date = () => '2026-10-26';
const mapping = (orgId = 1001) => ({ version: 1, orgId, id: 'rescue-animals', revision: 1, fields: [
  { sourceColumn: 'Name', target: { kind: 'core', field: 'name' }, transform: 'trim' },
  { sourceColumn: 'Species', target: { kind: 'core', field: 'species' }, transform: 'trim' },
  { sourceColumn: 'Status', target: { kind: 'core', field: 'lifecycle' }, transform: 'status' },
], statusMap: {} });
const request = (id = 'csv-1', orgId = 1001, matching = { mode: 'stable_key', mappingId: 'rescue-animals', keyColumn: 'Key' }) => ({ id, orgId, mappingId: 'rescue-animals', mappingRevision: 1, matching, acknowledgeCreateOnly: true });
const csv = 'Key,Name,Species,Status\na,Moss,dog,Available\nb,Leaf,cat,Pending';
function importer(f, principal = owner, database = f.database) {
  const store = new SqlImportStore(database, principal, f.safety);
  const authorize = async (context, orgId) => {
    if (!context || context.kind !== 'member' || context.userId !== principal.userId || context.orgId !== orgId || orgId !== principal.orgId) throw new Error('Unverified import request');
    return context;
  };
  return { store, service: new CsvImportService(store, authorize, date) };
}
async function counts(f) {
  const result = {};
  for (const table of ['platform_animals', 'platform_import_identities', 'platform_write_receipts', 'platform_row_outcomes', 'platform_unit_receipts']) result[table] = Number((await f.db.query(`select count(*) as count from public.${table}`)).rows[0].count);
  return result;
}

test('SQL imports round-trip stable-key and create-only provenance without duplicating retries', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const { store, service } = importer(f);
  await store.saveMapping(owner, mapping());
  await service.start(owner, request(), csv);
  const first = await service.runBatch(owner, 1001, 'csv-1');
  assert.equal(first.state, 'completed', JSON.stringify(first)); assert.equal(first.processedRows, 2);
  const initial = await f.service().read(owner, 1001);
  assert.equal(initial.length, 2);
  assert.ok(initial.every(a => a.source.csvOrigin.jobId === 'csv-1' && a.source.csvOrigin.mappingId === 'rescue-animals'));
  await service.runBatch(owner, 1001, 'csv-1');
  assert.equal((await counts(f)).platform_animals, 2);
  await assert.rejects(service.start(owner, request(), csv + '\nc,Changed,dog,Available'), /Changed import job replay/);
  await service.start(owner, request('csv-2'), 'Key,Name,Species,Status\na,Changed,dog,Available');
  assert.equal((await service.runBatch(owner, 1001, 'csv-2')).outcomes[0].state, 'updated');
  assert.equal((await f.service().read(owner, 1001)).find(a => a.source.csvOrigin.importKey === 'a').fields.name, 'Changed');
  await service.start(owner, request('create-only', 1001, { mode: 'create_only' }), csv);
  assert.equal((await service.runBatch(owner, 1001, 'create-only')).state, 'completed');
  const created = (await f.service().read(owner, 1001)).filter(a => a.source.csvOrigin.jobId === 'create-only');
  assert.equal(created.length, 2); assert.ok(created.every(a => a.source.csvOrigin.importKey === null && a.publication.state === 'unpublished'));
  await service.runBatch(owner, 1001, 'create-only');
  assert.equal((await counts(f)).platform_animals, 4);
});

test('SQL checkpoint failure rolls back the complete batch including identities, receipts and outcomes', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const { store, service } = importer(f); await store.saveMapping(owner, mapping());
  await service.start(owner, request(), csv);
  f.faults.match = /update public.platform_jobs set checkpoint=/;
  const failed = await service.runBatch(owner, 1001, 'csv-1');
  assert.equal(failed.state, 'partial'); assert.equal(failed.processedRows, 0);
  assert.deepEqual(await counts(f), { platform_animals: 0, platform_import_identities: 0, platform_write_receipts: 0, platform_row_outcomes: 0, platform_unit_receipts: 0 });
  assert.equal((await f.db.query("select checkpoint from public.platform_jobs where id='csv-1'")).rows[0].checkpoint, null);
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).state, 'completed');
  assert.deepEqual(await counts(f), { platform_animals: 2, platform_import_identities: 2, platform_write_receipts: 2, platform_row_outcomes: 2, platform_unit_receipts: 1 });
});

test('SQL second-row failure leaves no committed first row from the bounded batch', async t => {
  const f = await fixture(); t.after(() => f.db.close()); let fail = true;
  const database = { transaction: run => f.database.transaction(sql => run({ query: (statement, args) => {
    if (fail && statement.startsWith('insert into public.platform_row_outcomes') && args[2] === '3') { fail = false; throw new Error('Second-row outcome failed'); }
    return sql.query(statement, args);
  } })) };
  const { store, service } = importer(f, owner, database); await store.saveMapping(owner, mapping()); await service.start(owner, request(), csv);
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).processedRows, 0);
  assert.equal((await counts(f)).platform_animals, 0);
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).processedRows, 2);
});

test('SQL replay after lost batch commit acknowledgement is exactly once from durable progress', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const { store, service } = importer(f); await store.saveMapping(owner, mapping()); await service.start(owner, request('lost', 1001, { mode: 'create_only' }), csv);
  f.faults.afterUnitCommit = true;
  const result = await service.runBatch(owner, 1001, 'lost');
  assert.equal(result.state, 'completed'); assert.equal(result.processedRows, 2);
  await service.runBatch(owner, 1001, 'lost');
  assert.deepEqual(await counts(f), { platform_animals: 2, platform_import_identities: 0, platform_write_receipts: 2, platform_row_outcomes: 2, platform_unit_receipts: 1 });
});

test('SQL batch unit-receipt failure rolls back the already-written checkpoint', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const { store, service } = importer(f); await store.saveMapping(owner, mapping()); await service.start(owner, request(), csv);
  f.faults.match = /insert into public.platform_unit_receipts/;
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).processedRows, 0);
  assert.equal((await counts(f)).platform_animals, 0);
  assert.equal((await f.db.query("select checkpoint from public.platform_jobs where id='csv-1'")).rows[0].checkpoint, null);
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).state, 'completed');
});

test('SQL later batch failure preserves previous committed progress and resumes pending rows', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const { store, service } = importer(f); await store.saveMapping(owner, mapping());
  const source = 'Key,Name,Species,Status\n' + Array.from({ length: 51 }, (_, n) => `${n},A,dog,Available`).join('\n');
  await service.start(owner, request(), source);
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).processedRows, 50);
  f.faults.match = /insert into public.platform_row_outcomes/;
  assert.equal((await service.runBatch(owner, 1001, 'csv-1')).processedRows, 50);
  assert.equal((await counts(f)).platform_animals, 50);
  const complete = await service.runBatch(owner, 1001, 'csv-1');
  assert.equal(complete.state, 'completed'); assert.equal(complete.processedRows, 51);
  assert.deepEqual(await counts(f), { platform_animals: 51, platform_import_identities: 51, platform_write_receipts: 51, platform_row_outcomes: 51, platform_unit_receipts: 2 });
});

test('SQL import jobs reject cross-org, forged and revoked actors while two organizations share the same mappings/keys', async t => {
  const f = await fixture(); t.after(() => f.db.close());
  const one = importer(f), two = importer(f, owner2);
  await one.store.saveMapping(owner, mapping()); await two.store.saveMapping(owner2, mapping(1002));
  await one.service.start(owner, request(), csv); await two.service.start(owner2, request('csv-1', 1002), csv);
  assert.equal((await one.service.runBatch(owner, 1001, 'csv-1')).state, 'completed');
  assert.equal((await two.service.runBatch(owner2, 1002, 'csv-1')).state, 'completed');
  assert.equal((await counts(f)).platform_animals, 4);
  await assert.rejects(two.store.withJob(1001, 'csv-1', async () => null), /scope/);
  await assert.rejects(importer(f, viewer).store.saveMapping({ ...viewer, role: 'owner' }, mapping()), /membership/);
  const saved = (await f.db.query("select definition from public.platform_jobs where org_id=1001 and id='csv-1'")).rows[0].definition;
  await assert.rejects(one.store.enqueue(owner2, request('forged'), csv, sha256(csv), date(), saved.seal), /actor/);
  const ownStaff = importer(f, staff);
  await ownStaff.service.start(staff, request('revoked'), csv);
  await f.db.query('update public.organization_memberships set is_active=false where org_id=$1 and user_id=$2', [1001, staff.userId]);
  await assert.rejects(ownStaff.service.runBatch(staff, 1001, 'revoked'), /membership/);
  assert.equal((await counts(f)).platform_animals, 4);
});
