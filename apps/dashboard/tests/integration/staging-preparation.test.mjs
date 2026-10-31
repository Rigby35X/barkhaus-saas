import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=name=>readFileSync(new URL('../../../../supabase/'+name,import.meta.url),'utf8');
test('safe metadata export runs read-only and excludes records and SQL literals',async()=>{
 const db=new PGlite();
 try {
  await db.exec(read('audits/platform_v1_fixture.sql'));
  await db.exec(`create table public.export_probe(id int, confidential text default 'SENTINEL_DO_NOT_EXPORT');
   insert into public.export_probe values(1,'CUSTOMER_RECORD_DO_NOT_EXPORT');
   alter table public.export_probe enable row level security;
   create policy export_probe_policy on public.export_probe using(confidential <> 'POLICY_SECRET_DO_NOT_EXPORT');
   create function public.export_probe_function() returns text language sql as $$select 'FUNCTION_SECRET_DO_NOT_EXPORT'::text$$;
   create view public.export_probe_view as select 'VIEW_SECRET_DO_NOT_EXPORT'::text as confidential;`);
  await db.exec('begin read only');
  const result=await db.query(read('audits/staging_schema_export.sql'));
  await db.exec('rollback');
  const report=result.rows[0].barkhaus_schema_export;
  assert.equal(report.format,'barkhaus.safe-schema-export.v1');
  const encoded=JSON.stringify(report);
  for(const secret of ['SENTINEL_DO_NOT_EXPORT','CUSTOMER_RECORD_DO_NOT_EXPORT','POLICY_SECRET_DO_NOT_EXPORT','FUNCTION_SECRET_DO_NOT_EXPORT','VIEW_SECRET_DO_NOT_EXPORT','owner@example.test']) assert.ok(!encoded.includes(secret));
  assert.ok(report.columns.some(c=>c.object_name==='export_probe' && c.expression_fingerprint));
  assert.ok(report.policies.some(p=>p.policy_name==='export_probe_policy'));
  assert.ok(report.default_grants.some(g=>g.grantee==='service_role'));
  assert.ok(report.routines.some(r=>r.routine_name==='export_probe_function'));
 }finally{await db.close();}
});
test('fresh hosted-like staging bootstrap, explicit migration allowlist and guarded synthetic seed',async()=>{
 const db=new PGlite();
 try {
  const fixture=read('audits/platform_v1_fixture.sql');
  const managed=fixture.split('\n').filter(line=>!/^create table public\./.test(line)&&!/^insert into public\./.test(line)&&!/^insert into auth\./.test(line)).join('\n');
  await db.exec(managed);
  await db.exec(read('staging/000_public_prerequisites.sql'));
  for(const name of ['202609290001_dashboard_memberships.sql','202610260001_platform_v1.sql','202610260002_identity_invitation.sql','202610260003_transactional_ingestion.sql']) await db.exec(read('migrations/'+name));
  const seed=read('staging/020_synthetic_seed.sql');
  await assert.rejects(()=>db.exec(seed),/Replace all five/);
  await db.exec('rollback');
  const ids=Array.from({length:5},(_,i)=>`10000000-0000-0000-0000-00000000000${i+1}`);
  for(const id of ids) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@example.test`]);
  let position=0;
  await db.exec(seed.replaceAll('00000000-0000-0000-0000-000000000000',()=>ids[position++] ?? '00000000-0000-0000-0000-000000000000'));
  assert.equal((await db.query('select count(*)::int as n from public.organizations')).rows[0].n,2);
  assert.equal((await db.query('select count(*)::int as n from public.organization_memberships where is_active')).rows[0].n,4);
  const checks=await db.query(read('staging/030_acceptance_readonly.sql'));
  assert.ok(checks.rows.every(row=>row.passed),JSON.stringify(checks.rows));
  await assert.rejects(()=>db.exec(read('staging/000_public_prerequisites.sql')),/Fresh synthetic/);
  await db.exec('rollback');
 }finally{await db.close();}
});

test('prepared CSV and connector fixtures match real parser contracts without network access',async()=>{
 const {previewCsv}=await import('../../src/features/imports/csv.ts');
 const {normalizeCognito}=await import('../../../tenant-site/src/services/connectors/cognito.ts');
 const {validateConnection}=await import('../../../tenant-site/src/services/connectors/config.ts');
 const fixture=name=>readFileSync(new URL('../../../../deploy/staging/fixtures/'+name,import.meta.url),'utf8');
 const mapping=JSON.parse(fixture('native-mapping.json'));
 const job=JSON.parse(fixture('import-job.json'));
 const preview=previewCsv(fixture('animals.csv'),mapping,job.matching,'2026-10-26',1001);
 assert.equal(preview.rows.length,3);
 assert.equal(preview.rows[1].issues.length,0);
 assert.ok(preview.rows[2].issues.some(i=>i.field==='name'&&i.code==='required'));
 assert.equal(previewCsv(fixture('animals-corrected.csv'),mapping,job.matching,'2026-10-26',1001).issues.length,0);
 const connection=JSON.parse(fixture('connector.json'));
 validateConnection(connection);
 const page=JSON.parse(fixture('cognito-page.json'));
 const animal=normalizeCognito(connection,page.entries[0],'2026-10-26');
 assert.equal(animal.externalRecordId,'900001');
 assert.equal(animal.fields.name,'Pip');
 assert.equal(connection.orgId,1002);
});
