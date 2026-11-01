import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const read=name=>readFileSync(new URL('../../../../supabase/'+name,import.meta.url),'utf8');
const owner='00000000-0000-0000-0000-000000000001';
const viewer='00000000-0000-0000-0000-000000000003';
const other='00000000-0000-0000-0000-000000000004';
const revoked='00000000-0000-0000-0000-000000000005';
const migrations=['202609290000_identity_foundation.sql','202610260001_platform_v1.sql','202610260002_identity_invitation.sql','202610260003_transactional_ingestion.sql'];

// Source export showed RLS-disabled legacy tables, broad anon grants and no
// public-schema policies. Synthetic rows only; no production data or credentials.
test('additive platform identity preserves legacy anonymous behavior while securing new platform records',async t=>{
 const db=new PGlite();
 const as=async(role,user,sql,args=[])=>{
  await db.exec(`set role ${role}`);
  try {await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);return await db.query(sql,args);}
  finally {await db.exec('reset role');}
 };
 try {
  await db.exec(read('audits/platform_v1_fixture.sql'));
  await db.exec(`create table public.tokens_table(id bigint primary key,org_id bigint,payload text);
   create table public.linked_accounts(id bigint primary key,org_id bigint,payload text);
   create table public.health_records(id bigint primary key,animal_id bigint,payload text);
   create table public.policies(id bigint primary key,org_id integer not null,policy_type text);
   create table public.site_config(id bigint primary key,setting text);
   alter table public.site_config enable row level security;
   alter table public.organizations add column secret_check text default 'SYNTHETIC_NOT_PUBLIC';
   insert into public.animals values(1,1001,'Synthetic legacy animal');
   insert into public.form_submissions values(1,1001,'Synthetic legacy form');
   insert into auth.users(id,email) values('${other}','other@example.test'),('${revoked}','revoked@example.test');`);
  const legacy=['organizations','animals','applications','form_submissions','website_content','tokens_table','linked_accounts','health_records','policies','site_config'];
  const snapshot=async()=>{
   const relation=(await db.query(`select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text as acl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1) order by c.relname`,[legacy])).rows;
   const policy=(await db.query(`select tablename,policyname,permissive,roles,cmd,qual,with_check
    from pg_policies where schemaname='public' and tablename=any($1) order by tablename,policyname`,[legacy])).rows;
   const trigger=(await db.query(`select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any($1) and not t.tgisinternal order by c.relname,t.tgname`,[legacy])).rows;
   return {relation,policy,trigger};
  };
  const before=await snapshot();
  assert.equal(before.policy.length,0);
  assert.ok(before.relation.filter(r=>r.relname!=='site_config').every(r=>!r.relrowsecurity));
  const priorRead=await as('anon',null,'select id,org_id,name from public.animals order by id');
  assert.equal(priorRead.rows.length,1);
  assert.equal((await as('anon',null,"insert into public.form_submissions values(2,1001,'Before identity') returning id")).rows.length,1);

  for(const name of migrations)await db.exec(read('migrations/'+name));

  await t.test('legacy grants, RLS flags, policies and row triggers are unchanged',async()=>{
   assert.deepEqual(await snapshot(),before);
   assert.deepEqual((await as('anon',null,'select id,org_id,name from public.animals order by id')).rows,priorRead.rows);
   assert.equal((await as('anon',null,"insert into public.form_submissions values(3,1001,'After identity') returning id")).rows.length,1);
   assert.equal((await as('anon',null,'select count(*)::int as n from public.form_submissions')).rows[0].n,3);
  });

  await db.exec(`insert into public.organization_memberships(user_id,org_id,role,is_active) values
   ('${owner}',1001,'owner',true),('${viewer}',1001,'viewer',true),('${other}',1002,'owner',true),('${revoked}',1001,'staff',false);
   insert into public.platform_animals(org_id,id,source_kind,fields) values
   (1001,'native-a','native','{"name":"Willow","species":"dog"}'),
   (1002,'native-b','native','{"name":"Fern","species":"cat"}');`);

  await t.test('new memberships and animals deny anonymous and cross-organization access',async()=>{
   await assert.rejects(as('anon',null,'select * from public.organization_memberships'),/permission denied/);
   await assert.rejects(as('anon',null,'select * from public.platform_animals'),/permission denied/);
   assert.deepEqual((await as('authenticated',owner,'select id from public.platform_animals order by id')).rows,[{id:'native-a'}]);
   assert.deepEqual((await as('authenticated',other,'select id from public.platform_animals order by id')).rows,[{id:'native-b'}]);
   assert.deepEqual((await as('authenticated',owner,'select user_id from public.organization_memberships')).rows,[{user_id:owner}]);
   assert.deepEqual((await as('authenticated',revoked,'select id from public.platform_animals')).rows,[]);
   assert.deepEqual((await as('authenticated',revoked,'select user_id from public.organization_memberships')).rows,[]);
  });

  await t.test('organization-access RPC returns only own active membership and explicit safe display fields',async()=>{
   await assert.rejects(as('anon',null,'select * from public.my_organization_access()'),/permission denied/);
   const own=(await as('authenticated',owner,'select * from public.my_organization_access()')).rows;
   assert.equal(own.length,1);
   assert.equal(Number(own[0].org_id),1001);
   assert.equal(own[0].role,'owner');
   assert.ok(own[0].organizations && typeof own[0].organizations==='object');
   assert.ok(!('secret_check' in own[0].organizations));
   assert.ok(!JSON.stringify(own).includes('SYNTHETIC_NOT_PUBLIC'));
   const theirs=(await as('authenticated',other,'select * from public.my_organization_access()')).rows;
   assert.equal(theirs.length,1);assert.equal(Number(theirs[0].org_id),1002);
   assert.deepEqual((await as('authenticated',revoked,'select * from public.my_organization_access()')).rows,[]);
   assert.deepEqual((await as('authenticated',null,'select * from public.my_organization_access()')).rows,[]);
  });

  await t.test('new native writer boundaries hold without legacy RLS migration',async()=>{
   await assert.rejects(as('authenticated',owner,"update public.platform_animals set notes='REST bypass' where id='native-a'"),/permission denied/);
   assert.equal((await as('barkhaus_native_writer',owner,"update public.platform_animals set notes='Own synthetic note',revision=revision+1 where id='native-a' returning id")).rows.length,1);
   assert.equal((await as('barkhaus_native_writer',owner,"update public.platform_animals set notes='Cross-org',revision=revision+1 where id='native-b' returning id")).rows.length,0);
   assert.equal((await as('barkhaus_native_writer',viewer,"update public.platform_animals set notes='Viewer',revision=revision+1 where id='native-a' returning id")).rows.length,0);
   assert.equal((await as('barkhaus_native_writer',revoked,"update public.platform_animals set notes='Revoked',revision=revision+1 where id='native-a' returning id")).rows.length,0);
   const saved=(await as('authenticated',owner,"select notes from public.platform_animals where id='native-a'")).rows[0];
   assert.equal(saved.notes,'Own synthetic note');
  });
 }finally{await db.close();}
});
