import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Pool } from 'pg';
import { createPostgresPersistence } from '../../../tenant-site/src/services/animals/pg-pool.ts';
import { createSqlAnimalHttpHandler } from '../../../tenant-site/src/services/animals/sql-http.ts';
import { createCsvHttpHandler } from '../../../tenant-site/src/services/imports/http.ts';
import { createCsvBatchRunner } from '../../../tenant-site/src/services/imports/runner.ts';
import { createCsvOnboardingHttpClient } from '../../src/features/imports/http-client.ts';
import { SqlConnectorStore } from '../../../tenant-site/src/services/connectors/sql-store.ts';
import { SqlConnectorControlStore } from '../../../tenant-site/src/services/connectors/sql-control-store.ts';
import { createConnectorHttpHandler } from '../../../tenant-site/src/services/connectors/http.ts';
import { ConnectorWorker } from '../../../tenant-site/src/services/connectors/worker.ts';
import { CognitoAdapter } from '../../../tenant-site/src/services/connectors/cognito.ts';
import { connection, raw, page, auth } from '../connectors/fixtures.mjs';

// Deliberately fixed, disposable LOOPBACK target. Never accept a connection URL,
// host override, Supabase reference, or inherited PG* setting for this fixture.
const config={host:'127.0.0.1',port:55432,database:'barkhaus_round1_local',user:'postgres',password:'synthetic-local-only',ssl:false,max:4};
const enabled=process.env.BARKHAUS_LOCAL_POSTGRES_TEST==='1';
const read=name=>readFileSync(new URL('../../../../supabase/'+name,import.meta.url),'utf8');
const owner={kind:'member',orgId:1001,userId:'00000000-0000-0000-0000-000000000001',role:'owner'};
const staff={...owner,userId:'00000000-0000-0000-0000-000000000002',role:'staff'};
const viewer={...owner,userId:'00000000-0000-0000-0000-000000000003',role:'viewer'};
const ownerB={...owner,orgId:1002,userId:'00000000-0000-0000-0000-000000000004'};
const revoked={...owner,userId:'00000000-0000-0000-0000-000000000005'};
const actors={owner,staff,viewer,ownerB,revoked};
const fields={name:'Willow',species:'dog',breed:null,age:{kind:'unknown'},sex:'unknown',size:'small',biography:null,photos:[],lifecycle:'care',availability:'available'};
const create=(key,extra={})=>({version:1,orgId:1001,kind:'create_native',idempotencyKey:key,fields:{...fields},...extra});
const safety={photoAllowed:async(org,url)=>url.startsWith(`https://images.example/${org}/`)};
const response=(status)=>new Response(JSON.stringify({error:'Synthetic test identity denied'}),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store',Vary:'Authorization'}});
// Synthetic identity only; actual SQL rechecks persisted memberships. This does
// not claim to test Supabase Auth, JWT signature verification or workload identity.
async function member(request,orgId){
 const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
 const actor=actors[token];
 if(!actor)return response(401);
 if(actor.orgId!==orgId)return response(403);
 return actor;
}
async function authorize(request,orgId){const actor=await member(request,orgId);return actor instanceof Response?{response:actor}:{principal:actor,actor:actor.userId===viewer.userId?{...actor,role:'owner'}:actor};}
function faultDatabase(database,{match,afterReceipt=false}={}){
 let injected=false;
 return {get injected(){return injected;},async transaction(run){
  let receipt=false;
  const result=await database.transaction(sql=>run({async query(statement,args){
   if(match?.test(statement)&&!injected){injected=true;throw new Error('Synthetic checkpoint failure');}
   if(/insert into public.platform_(?:write|unit)_receipts/.test(statement))receipt=true;
   return sql.query(statement,args);
  }}));
  if(afterReceipt&&receipt&&!injected){injected=true;throw new Error('Synthetic lost COMMIT acknowledgement');}
  return result;
 }};
}
async function serve(handlers){
 const server=createServer(async(req,res)=>{
  try{
   const origin=`http://127.0.0.1:${server.address().port}`;
   const parts=[];for await(const chunk of req)parts.push(chunk);
   const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,...(parts.length?{body:Buffer.concat(parts)}:{})});
   const handler=handlers[new URL(request.url).pathname];
   const result=handler?await handler(request):response(404);
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Synthetic harness failed');}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`;
 return {origin,fetch:(url,init)=>fetch(new URL(url,origin),init),close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
const post=(origin,path,token,value)=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(value)});
const get=(origin,path,token='owner')=>fetch(origin+path,{headers:{Authorization:`Bearer ${token}`}});

test('disposable PostgreSQL: native HTTP, independent pools, CSV batches and durable replay',{skip:!enabled,timeout:30000},async t=>{
 const admin=new Pool(config);
 const first=createPostgresPersistence({config,allowLocalPlaintext:true});
 const second=createPostgresPersistence({config,allowLocalPlaintext:true});
 t.after(async()=>{await first.close();await second.close();await admin.end();});
 assert.equal((await admin.query('select current_database() as name')).rows[0].name,'barkhaus_round1_local');
 const existing=await admin.query("select to_regclass('public.platform_animals') as existing");
 assert.equal(existing.rows[0].existing,null,'This acceptance fixture requires a fresh disposable local PostgreSQL container; do not point it at an existing database.');
 await admin.query(read('audits/platform_v1_fixture.sql'));
 for(const name of ['202609290000_identity_foundation.sql','202610260001_platform_v1.sql','202610260002_identity_invitation.sql','202610260003_transactional_ingestion.sql'])await admin.query(read('migrations/'+name));
 await admin.query(`insert into auth.users(id,email) values('${ownerB.userId}','owner-b@example.test'),('${revoked.userId}','revoked@example.test');
 insert into public.organization_memberships(user_id,org_id,role,is_active) values
 ('${owner.userId}',1001,'owner',true),('${staff.userId}',1001,'staff',true),('${viewer.userId}',1001,'viewer',true),('${ownerB.userId}',1002,'owner',true),('${revoked.userId}',1001,'owner',false);`);
 const handlers={
  '/animals':createSqlAnimalHttpHandler({database:first.database,safety,authorize}),
  '/animals-second':createSqlAnimalHttpHandler({database:second.database,safety,authorize}),
  '/imports':createCsvHttpHandler({database:first.database,safety,authorize:member,date:()=> '2026-10-26'}),
 };
 const server=await serve(handlers);t.after(()=>server.close());
 let native;
 await t.test('native HTTP create/reload and distinct active PostgreSQL connections',async()=>{
  const res=await post(server.origin,'/animals','owner',create('native-http'));assert.equal(res.status,200);native=(await res.json()).animal;
  const reload=await get(server.origin,`/animals-second?orgId=1001&animalId=${encodeURIComponent(JSON.stringify(native.id))}`);assert.equal(reload.status,200);assert.deepEqual(await reload.json(),native);
  let release;const barrier=new Promise(resolve=>release=resolve);let arrived=0;
  const pid=database=>database.transaction(async sql=>{const value=(await sql.query('select pg_backend_pid() as pid')).rows[0].pid;if(++arrived===2)release();await barrier;return value;});
  const pids=await Promise.all([pid(first.database),pid(second.database)]);assert.notEqual(pids[0],pids[1]);
 });
 await t.test('two pool-backed concurrent edits of revision N yield one success and one HTTP409',async()=>{
  const edit={version:1,orgId:1001,kind:'edit_native',animalId:native.id,expectedRevision:native.revision,fields:{name:'Concurrent A'},idempotencyKey:'race-a'};
  const results=await Promise.all([post(server.origin,'/animals','owner',edit),post(server.origin,'/animals-second','owner',{...edit,idempotencyKey:'race-b',fields:{name:'Concurrent B'}})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const saved=await (await get(server.origin,`/animals?orgId=1001&animalId=${encodeURIComponent(JSON.stringify(native.id))}`)).json();assert.equal(saved.revision,native.revision+1);assert.ok(['Concurrent A','Concurrent B'].includes(saved.fields.name));
 });
 await t.test('database denies forged viewer role, revoked membership and cross-organization requests',async()=>{
  assert.equal((await post(server.origin,'/animals','viewer',create('viewer-denied'))).status,403);
  assert.equal((await post(server.origin,'/animals','revoked',create('revoked-denied'))).status,403);
  assert.equal((await post(server.origin,'/animals','ownerB',create('cross-denied'))).status,403);
  assert.equal((await get(server.origin,'/animals?orgId=1001','unknown')).status,401);
  const other=await post(server.origin,'/animals','ownerB',create('org-b',{orgId:1002}));assert.equal(other.status,200);
  const own=await (await get(server.origin,'/animals?orgId=1001')).json();assert.ok(own.every(a=>a.orgId===1001));
 });
 await t.test('actual committed native write with lost acknowledgement replays once through HTTP',async()=>{
  const broken=faultDatabase(first.database,{afterReceipt:true});
  handlers['/animals-lost']=createSqlAnimalHttpHandler({database:broken,safety,authorize});
  const command=create('native-lost');assert.equal((await post(server.origin,'/animals-lost','owner',command)).status,503);assert.equal(broken.injected,true);
  const retried=await post(server.origin,'/animals-second','owner',command);assert.equal(retried.status,200);assert.equal((await retried.json()).replayed,true);
  assert.equal((await admin.query("select count(*)::int as n from public.platform_write_receipts where idempotency_key='native-lost'")).rows[0].n,1);
 });
 const mapping={version:1,id:'csv-http',orgId:1001,revision:1,fields:[{sourceColumn:'Name',target:{kind:'core',field:'name'},transform:'trim'},{sourceColumn:'Species',target:{kind:'core',field:'species'},transform:'trim'}],statusMap:{}};
 const input=id=>({id,orgId:1001,mappingId:mapping.id,mappingRevision:1,matching:{mode:'stable_key',mappingId:mapping.id,keyColumn:'Key'},acknowledgeCreateOnly:false});
 const csv='Key,Name,Species\ncsv-a,Fern,cat\ncsv-b,Moss,dog';
 const browser=createCsvOnboardingHttpClient({endpoint:'/imports',accessToken:async()=> 'owner',fetch:server.fetch});
 const runner=database=>createCsvBatchRunner({database,safety,resolveDelegation:async org=>org===1001?owner:null});
 await t.test('persistent browser CSV client previews/enqueues, supervised runner commits, reload recovers job',async()=>{
  await browser.saveMapping(mapping);
  const before=(await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n;
  const preview=await browser.preview(input('csv-http'),csv);assert.equal(preview.rows.length,2);assert.equal(preview.issues.length,0);
  const queued=await browser.start(input('csv-http'),csv);assert.equal(queued.processedRows,0);assert.equal(queued.sourceFile.storageRef,'private');
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n,before);
  const done=await runner(second.database)({orgId:1001,jobId:'csv-http'});assert.equal(done.state,'completed');assert.equal(done.processedRows,2);
  const recovered=await browser.job(1001,'csv-http');assert.equal(recovered.state,'completed');assert.equal(recovered.outcomes.length,2);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n,before+2);
  assert.equal((await runner(first.database)({orgId:1001,jobId:'csv-http'})).processedRows,2);
 });
 await t.test('CSV checkpoint failure rolls back complete real PostgreSQL batch then resumes once',async()=>{
  await browser.start(input('csv-failure'),csv.replaceAll('csv-a','csv-fail-a').replaceAll('csv-b','csv-fail-b'));
  const before=(await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n;
  const receiptsBefore=(await admin.query('select count(*)::int as n from public.platform_write_receipts')).rows[0].n;
  const identitiesBefore=(await admin.query('select count(*)::int as n from public.platform_import_identities')).rows[0].n;
  const broken=faultDatabase(first.database,{match:/update public.platform_jobs set checkpoint=/});
  const failed=await runner(broken)({orgId:1001,jobId:'csv-failure'});assert.equal(broken.injected,true);assert.equal(failed.processedRows,0);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_write_receipts')).rows[0].n,receiptsBefore);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_import_identities')).rows[0].n,identitiesBefore);
  assert.equal((await admin.query("select checkpoint from public.platform_jobs where id='csv-failure'")).rows[0].checkpoint,null);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n,before);
  assert.equal((await admin.query("select count(*)::int as n from public.platform_row_outcomes where job_id='csv-failure'")).rows[0].n,0);
  assert.equal((await admin.query("select count(*)::int as n from public.platform_unit_receipts where job_id='csv-failure'")).rows[0].n,0);
  const done=await runner(second.database)({orgId:1001,jobId:'csv-failure'});assert.equal(done.state,'completed');assert.equal(done.processedRows,2);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n,before+2);
 });
 await t.test('CSV lost COMMIT acknowledgement resolves durable completion and replays without duplicates',async()=>{
  await browser.start(input('csv-lost'),csv.replaceAll('csv-a','csv-lost-a').replaceAll('csv-b','csv-lost-b'));
  const before=(await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n;
  const lost=faultDatabase(first.database,{afterReceipt:true});
  const done=await runner(lost)({orgId:1001,jobId:'csv-lost'});assert.equal(lost.injected,true);assert.equal(done.state,'completed');
  assert.equal((await runner(second.database)({orgId:1001,jobId:'csv-lost'})).processedRows,2);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals')).rows[0].n,before+2);
  assert.equal((await admin.query("select count(*)::int as n from public.platform_unit_receipts where job_id='csv-lost'")).rows[0].n,1);
 });
 await t.test('configured synthetic connector page checkpoint rolls back atomically and retries once',async()=>{
  const c=connection();c.id='pg-source';c.config.formId='999';c.mapping.id='pg-source-map';c.credentialRef='fixture://private-pg-credential';
  const {credentialRef,...definition}=c;
  await admin.query('insert into public.platform_connections(org_id,id,provider,definition) values($1,$2,$3,$4)',[c.orgId,c.id,c.provider,definition]);
  await admin.query('insert into public.platform_mappings(org_id,id,revision,connection_id,definition) values($1,$2,$3,$4,$5)',[c.orgId,c.mapping.id,c.mapping.revision,c.id,c.mapping]);
  const scope={orgId:c.orgId,connectionId:c.id};
  let version='2026-10-26T00:00:00.000Z';
  const adapter=new CognitoAdapter({read:async()=>page([{...raw('900001',version,'Pip'),Photos:[]},{...raw('900002',version,'Fern'),Photos:[]}])},()=> '2026-10-26');
  const broken=faultDatabase(first.database,{match:/update public.platform_jobs set checkpoint=/});
  const store=new SqlConnectorStore(broken,{...scope,workerId:'worker-1'},safety,async()=>credentialRef);
  const worker=new ConnectorWorker(store,auth,adapter,{leaseMs:60000,timeoutMs:45000,maxAttempts:3,baseDelayMs:1,maxDelayMs:10});
  const job=await store.enqueue(scope,'pg-source-initial');
  await worker.runOnce('verified-workload');assert.equal(broken.injected,true);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals where connection_id=$1',[c.id])).rows[0].n,0);
  for(const table of ['platform_row_outcomes','platform_unit_receipts'])assert.equal((await admin.query(`select count(*)::int as n from public.${table} where job_id=$1`,[job.id])).rows[0].n,0);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_source_heads where connection_id=$1',[c.id])).rows[0].n,0);
  await admin.query('update public.platform_jobs set next_attempt_at=null where id=$1',[job.id]);
  await worker.runOnce('verified-workload');assert.equal((await store.status(scope,job.id)).state,'completed');
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals where connection_id=$1',[c.id])).rows[0].n,2);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_unit_receipts where job_id=$1',[job.id])).rows[0].n,1);

  // A later actual COMMIT loses its acknowledgement: durable completion wins.
  version='2026-10-27T00:00:00.000Z';
  const lost=faultDatabase(second.database,{afterReceipt:true});
  const nextStore=new SqlConnectorStore(lost,{...scope,workerId:'worker-1'},safety,async()=>credentialRef);
  const nextWorker=new ConnectorWorker(nextStore,auth,adapter,{leaseMs:60000,timeoutMs:45000,maxAttempts:3,baseDelayMs:1,maxDelayMs:10});
  const next=await nextStore.enqueue(scope,'pg-source-lost');await nextWorker.runOnce('verified-workload');assert.equal(lost.injected,true);
  assert.equal((await nextStore.status(scope,next.id)).state,'completed');
  assert.equal((await admin.query('select count(*)::int as n from public.platform_animals where connection_id=$1',[c.id])).rows[0].n,2);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_unit_receipts where job_id=$1',[next.id])).rows[0].n,1);
  assert.equal((await admin.query('select count(*)::int as n from public.platform_row_outcomes where job_id=$1',[next.id])).rows[0].n,2);

  handlers['/connectors']=createConnectorHttpHandler({authenticate:async(request,org)=>{const a=await member(request,org);return a instanceof Response?null:a;},store:actor=>new SqlConnectorControlStore(first.database,actor,safety)});
  const status=await get(server.origin,`/connectors?orgId=1002&connectionId=${c.id}`,'ownerB');assert.equal(status.status,200);
  const summary=await status.json();assert.ok(summary.lastSuccessAt);assert.equal(summary.mapping.id,c.mapping.id);
  assert.ok(!JSON.stringify(summary).includes('fixture://'));assert.ok(!JSON.stringify(summary).includes('fixture.invalid'));
  assert.equal((await get(server.origin,`/connectors?orgId=1002&connectionId=${c.id}`,'owner')).status,403);
 });

});
