import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,owner,owner2,staff,viewer,create} from './database.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {SqlAnimalRepository} from '../../../tenant-site/src/services/animals/sql-repository.ts';
import {AnimalWriteService} from '../../../tenant-site/src/services/animals/AnimalWriteService.ts';

test('actual SQL writer preserves records, enforces two-org roles/CAS and replays receipts',async t=>{
  const f=await fixture();t.after(()=>f.db.close());const s=f.service();
  const result=await s.execute(owner,create());assert.equal(result.ok,true,JSON.stringify(result));
  const a=result.animal;
  assert.deepEqual(await s.read(owner,1001,a.id),a);
  assert.equal((await s.execute(owner,create())).replayed,true);
  assert.equal((await s.execute(owner,create('native',{fields:{...a.fields,name:'Mismatch'}}))).code,'conflict');
  assert.equal(await f.service(owner2).read(owner2,1001,a.id),null);
  assert.equal((await f.service(viewer).execute({...viewer,role:'owner'},create('viewer'))).code,'forbidden');
  const edit={version:1,orgId:1001,kind:'edit_native',idempotencyKey:'edit',animalId:a.id,expectedRevision:a.revision,fields:{name:'Updated'}};
  assert.equal((await f.service(staff).execute(staff,edit)).ok,true);
  assert.equal((await s.execute(owner,{...edit,idempotencyKey:'stale'})).code,'conflict');
  for(const kind of ['publish','unpublish','archive'])assert.equal((await f.service(staff).execute(staff,{version:1,orgId:1001,kind,idempotencyKey:kind,animalId:a.id,expectedRevision:2,...(kind==='publish'?{publicProfileKey:'pip',approvedPhotos:[]}: {})})).code,'forbidden');
  await f.db.query('update public.organization_memberships set is_active=false where org_id=$1 and user_id=$2',[1001,owner.userId]);
  assert.equal((await s.execute(owner,create('revoked'))).code,'forbidden');
});
test('SQL receipt failure rolls back animal and replay after lost commit acknowledgement is exactly once',async t=>{
  const f=await fixture();t.after(()=>f.db.close());const s=f.service();
  f.faults.match=/insert into public.platform_write_receipts/;
  await assert.rejects(s.execute(owner,create('rollback')));
  assert.equal((await f.db.query('select * from public.platform_animals')).rows.length,0);
  f.faults.afterCommit=true;
  await assert.rejects(s.execute(owner,create('lost')),/acknowledgement/);
  const retry=await s.execute(owner,create('lost'));
  assert.equal(retry.replayed,true);
  assert.equal((await f.db.query('select * from public.platform_animals')).rows.length,1);
  assert.equal((await f.db.query('select * from public.platform_write_receipts')).rows.length,1);
});
test('SQL preserves explicitly adopted numeric IDs without using names as identity',async t=>{
  const f=await fixture();t.after(()=>f.db.close());
  const record=(await f.service().execute(owner,create())).animal;
  // Administrator fixture models a separately reviewed legacy identity adoption.
  await f.db.query(`insert into public.platform_animals(org_id,id,legacy_animal_id,source_kind,fields,field_owners,photos,lifecycle,availability)
    select org_id,'adopted-501',501,'native',fields,field_owners,photos,lifecycle,availability from public.platform_animals where org_id=1001 and id=$1`,[record.id]);
  const adopted=await f.service().read(owner,1001,501);assert.equal(adopted.id,501);
  const edited=await f.service().execute(owner,{version:1,orgId:1001,kind:'edit_native',animalId:501,expectedRevision:1,idempotencyKey:'edit-legacy',fields:{name:'Updated legacy'}});
  assert.equal(edited.ok,true);assert.equal(edited.animal.id,501);
  assert.equal((await f.service().read(owner,1001,record.id)).fields.name,'Pip');
});
test('SQL records and replay receipts survive closing and reopening an on-disk database',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'barkhaus-persistence-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const f=await fixture(directory);const command=create('restart');const first=await f.service().execute(owner,command);assert.equal(first.ok,true);await f.db.close();
  const reopened=new PGlite(directory);t.after(()=>reopened.close());
  const repository=new SqlAnimalRepository({transaction:run=>reopened.transaction(sql=>run(sql))},{principal:owner},f.safety);
  const service=new AnimalWriteService(repository);
  assert.equal((await service.read(owner,1001,first.animal.id)).fields.name,'Pip');
  const replay=await service.execute(owner,command);assert.equal(replay.replayed,true);assert.equal(replay.animal.id,first.animal.id);
});
