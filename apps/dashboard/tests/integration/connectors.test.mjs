import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,owner,owner2,viewer} from './database.mjs';
import {SqlImportStore} from '../../../tenant-site/src/services/imports/sql-store.ts';
import {CsvImportService} from '../../../tenant-site/src/services/imports/service.ts';
import {SqlConnectorStore} from '../../../tenant-site/src/services/connectors/sql-store.ts';
import {ConnectorWorker} from '../../../tenant-site/src/services/connectors/worker.ts';
import {CognitoAdapter} from '../../../tenant-site/src/services/connectors/cognito.ts';
import {connection,raw,page,auth} from '../connectors/fixtures.mjs';

async function harness(t,entries=[raw()]){
  const f=await fixture();t.after(()=>f.db.close());
  const c=connection();const {credentialRef,...definition}=c;
  await f.db.query('insert into public.platform_connections(org_id,id,provider,definition) values($1,$2,$3,$4)',[c.orgId,c.id,c.provider,JSON.stringify(definition)]);
  await f.db.query('insert into public.platform_mappings(org_id,id,revision,connection_id,definition) values($1,$2,$3,$4,$5)',[c.orgId,c.mapping.id,c.mapping.revision,c.id,JSON.stringify(c.mapping)]);
  const scope={orgId:c.orgId,connectionId:c.id};
  const store=new SqlConnectorStore(f.database,{...scope,workerId:'worker-1'},f.safety,async()=>credentialRef);
  let values=entries,photo='https://images.example/1002/pip.jpg';
  const adapter=new CognitoAdapter({read:async()=>page(values.map(x=>({...x,Photos:[photo]})))},()=> '2026-10-26');
  const worker=new ConnectorWorker(store,auth,adapter,{leaseMs:60000,timeoutMs:45000,maxAttempts:3,baseDelayMs:1,maxDelayMs:10});
  const enqueue=key=>store.enqueue(scope,key);
  const retry=async()=>{await f.db.query('update public.platform_jobs set next_attempt_at=null where org_id=$1',[1002]);await worker.runOnce('verified-workload');};
  return {...f,store,worker,scope,enqueue,retry,setRows:rows=>{values=rows;},setPhoto:value=>{photo=value;}};
}
test('SQL connector page preserves mapped ownership/local data and commits source/outcomes/checkpoint together',async t=>{
  const h=await harness(t,[raw('7'),raw('8')]);const job=await h.enqueue('initial');await h.worker.runOnce('verified-workload');
  const status=await h.store.status(h.scope,job.id);assert.equal(status.state,'completed',JSON.stringify(status));assert.equal(status.counts.created,2);
  const rows=(await h.db.query('select * from public.platform_animals order by external_record_id')).rows;
  assert.equal(rows.length,2);assert.equal(rows[0].field_owners.biography.kind,'barkhaus');assert.equal(rows[0].custom_fields.kennel,'K2');
  assert.equal((await h.db.query('select * from public.platform_row_outcomes')).rows.length,2);
  assert.equal((await h.db.query('select * from public.platform_source_heads')).rows.length,2);
  assert.equal((await h.db.query('select * from public.platform_unit_receipts')).rows.length,1);
  const service=h.service(owner2);let a=await service.read(owner2,1002,rows[0].id);
  let result=await service.execute(owner2,{version:1,orgId:1002,kind:'edit_native',animalId:a.id,expectedRevision:a.revision,idempotencyKey:'notes',fields:{biography:'Local biography'},internalNotes:'Private notes'});assert.equal(result.ok,true);
  a=result.animal;result=await service.execute(owner2,{version:1,orgId:1002,kind:'publish',animalId:a.id,expectedRevision:a.revision,idempotencyKey:'publish',publicProfileKey:'dog-38-7',approvedPhotos:[{id:'cognito:https://images.example/1002/pip.jpg',url:'https://images.example/1002/pip.jpg'}]});assert.equal(result.ok,true);
  h.setPhoto('https://images.example/1002/replaced.jpg');
  h.setRows([raw('7','2026-10-26T00:00:00.000Z','New upstream'),raw('8','2026-10-26T00:00:00.000Z')]);await h.enqueue('second');await h.worker.runOnce('verified-workload');
  a=await service.read(owner2,1002,a.id);assert.equal(a.fields.name,'New upstream');assert.equal(a.fields.biography,'Local biography');assert.equal(a.privateData.internalNotes,'Private notes');assert.equal(a.publication.state,'published');assert.equal(a.publication.approvedPhotos.length,1);
  assert.deepEqual((await service.publicProfile(1002,'dog-38-7')).photos,[]);
  await assert.rejects(h.store.status({orgId:1001,connectionId:h.scope.connectionId},job.id));
  await assert.rejects(h.worker.runOnce({kind:'worker',orgId:1002,connectionId:h.scope.connectionId}));
});
test('combined two-organization SQL import and connector flows use the same private/public record interfaces',async t=>{
  const h=await harness(t);const imports=new SqlImportStore(h.database,owner,h.safety);
  const proof=Symbol('verified Auth session');
  const service=new CsvImportService(imports,async(context,orgId)=>{if(context!==proof||orgId!==owner.orgId)throw Error('Unauthenticated');return owner;},()=> '2026-10-26');
  const mapping={version:1,orgId:1001,id:'native',revision:1,fields:[{sourceColumn:'Name',target:{kind:'core',field:'name'},transform:'trim'},{sourceColumn:'Species',target:{kind:'core',field:'species'},transform:'trim'}],statusMap:{}};
  await imports.saveMapping(owner,mapping);
  await service.start(proof,{id:'combined-import',orgId:1001,mappingId:'native',mappingRevision:1,matching:{mode:'stable_key',mappingId:'native',keyColumn:'Key'},acknowledgeCreateOnly:false},'Key,Name,Species\na,Pip,dog');
  assert.equal((await service.runBatch(proof,1001,'combined-import')).state,'completed');
  await h.enqueue('combined-connector');await h.worker.runOnce('verified-workload');
  const native=(await h.service(owner).read(owner,1001))[0],external=(await h.service(owner2).read(owner2,1002))[0];
  assert.equal(native.source.kind,'native');assert.equal(external.source.kind,'connector');assert.equal(native.contractVersion,external.contractVersion);
  for(const [actor,animal] of [[owner,native],[owner2,external]]){
    assert.equal(animal.publication.state,'unpublished');
    const published=await h.service(actor).execute(actor,{version:1,orgId:actor.orgId,kind:'publish',animalId:animal.id,expectedRevision:animal.revision,idempotencyKey:'publish-combined',publicProfileKey:'pip',approvedPhotos:[]});
    assert.equal(published.ok,true);
    const profile=await h.service(actor).publicProfile(actor.orgId,'pip');assert.equal(profile.name,animal.fields.name);assert.equal('privateData' in profile,false);assert.equal('orgId' in profile,false);
  }
  assert.equal((await h.service(owner2).execute(owner,{version:1,orgId:1001,kind:'archive',animalId:native.id,expectedRevision:2,idempotencyKey:'cross-org'})).code,'forbidden');
  assert.equal((await h.service(viewer).execute({...viewer,role:'owner'},{version:1,orgId:1001,kind:'archive',animalId:native.id,expectedRevision:2,idempotencyKey:'viewer-forgery'})).code,'forbidden');
  await assert.rejects(h.db.transaction(async sql=>{await sql.query('set local role anon');return sql.query('select * from public.platform_animals');}),/permission denied/);
});

test('SQL connector failures at source/outcome/seen/unit-receipt stages roll back the whole page',async t=>{
  for(const stage of ['platform_source_heads','platform_source_commits','platform_row_outcomes','platform_connector_seen','platform_unit_receipts'])await t.test(stage,async sub=>{
    const h=await harness(sub,[raw('7'),raw('8')]);const job=await h.enqueue(stage);h.faults.match=new RegExp('insert into public.'+stage);
    await h.worker.runOnce('verified-workload');assert.equal((await h.store.status(h.scope,job.id)).counts.created,0);
    for(const table of ['platform_animals','platform_write_receipts','platform_source_heads','platform_row_outcomes','platform_connector_seen','platform_unit_receipts'])assert.equal((await h.db.query('select * from public.'+table)).rows.length,0,table);
    await h.retry();assert.equal((await h.store.status(h.scope,job.id)).state,'completed');
  });
});
test('SQL connection fences reject stale claims and disconnect cancels a prepared page',async t=>{
  const h=await harness(t);const job=await h.enqueue('fence');
  const claimed=await h.store.claim('worker-1',Date.now(),10000);assert.ok(claimed);
  await assert.rejects(h.store.assertLease({...claimed.lease,token:'0'},Date.now()));
  await h.store.disconnect(h.scope);await assert.rejects(h.store.assertLease(claimed.lease,Date.now()));
  assert.equal((await h.store.status(h.scope,job.id)).state,'failed');assert.equal((await h.db.query('select * from public.platform_animals')).rows.length,0);
});
test('SQL page checkpoint failure rolls back ALL animals, identities, receipts, heads and outcomes',async t=>{
  const h=await harness(t,[raw('7'),raw('8')]);const job=await h.enqueue('checkpoint');
  h.faults.match=/update public.platform_jobs set checkpoint/;
  await h.worker.runOnce('verified-workload');
  assert.equal((await h.store.status(h.scope,job.id)).state,'retry_wait');
  for(const table of ['platform_animals','platform_write_receipts','platform_source_revisions','platform_source_heads','platform_source_commits','platform_row_outcomes','platform_connector_seen','platform_unit_receipts'])assert.equal((await h.db.query('select * from public.'+table)).rows.length,0,table);
  assert.equal((await h.db.query('select * from public.platform_connector_inboxes')).rows.length,1);
  await h.retry();assert.equal((await h.store.status(h.scope,job.id)).state,'completed');assert.equal((await h.db.query('select * from public.platform_animals')).rows.length,2);
});
test('SQL page lost commit acknowledgement preserves authoritative completion and replays without duplicate writes',async t=>{
  const h=await harness(t);const job=await h.enqueue('lost');h.faults.afterUnitCommit=true;
  await h.worker.runOnce('verified-workload');assert.equal((await h.store.status(h.scope,job.id)).state,'completed');
  await h.worker.runOnce('verified-workload');
  await h.enqueue('same-source-new-job');await h.worker.runOnce('verified-workload');
  assert.equal((await h.db.query('select * from public.platform_animals')).rows.length,1);
  assert.equal((await h.db.query('select * from public.platform_write_receipts')).rows.length,1);
  assert.equal((await h.db.query('select * from public.platform_row_outcomes')).rows.length,2);
});
test('SQL deferred lease check rolls back page mutations when the lease expires immediately before COMMIT',async t=>{
  const h=await harness(t);const job=await h.enqueue('commit-expiry');h.faults.expireUnit=true;
  await h.worker.runOnce('verified-workload');
  assert.equal((await h.db.query('select * from public.platform_animals')).rows.length,0);
  assert.equal((await h.db.query('select * from public.platform_row_outcomes')).rows.length,0);
  assert.equal((await h.db.query('select * from public.platform_unit_receipts')).rows.length,0);
  await h.retry();assert.equal((await h.store.status(h.scope,job.id)).state,'completed');
});
