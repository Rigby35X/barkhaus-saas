import test from 'node:test';
import assert from 'node:assert/strict';
import { createCsvHttpHandler, MAX_IMPORT_REQUEST_BYTES } from '../../../tenant-site/src/services/imports/http.ts';
import { createCsvBatchRunner } from '../../../tenant-site/src/services/imports/runner.ts';
import { createCsvOnboardingHttpClient } from '../../src/features/imports/http-client.ts';
import { fixture, owner, owner2, viewer } from '../integration/database.mjs';
import { input, mapping } from './fixture-store.mjs';
const endpoint='https://staging.example/api/v1/imports';
const source='Key,Name,Species,Status\na,Willow,dog,Available\nb,"Fern, Junior",cat,Pending';
const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
const request=(body, token='owner')=>new Request(endpoint,{method:'POST',headers:{...headers,Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
function setup(f, extra={}) {
 const people={owner,owner2,viewer};
 const handler=createCsvHttpHandler({database:f.database,safety:f.safety,date:()=> '2026-10-26',authorize:async(req,orgId)=>{
  const who=people[req.headers.get('Authorization')?.slice(7)];
  if(!who)return new Response(JSON.stringify({error:'Sign in'}),{status:401});
  return who.orgId===orgId?who:null;
 },...extra});
 const client=createCsvOnboardingHttpClient({endpoint,accessToken:async()=> 'owner',fetch:async(url,init)=>handler(new Request(url,init))});
 return {handler,client};
}
test('persistent browser transport, HTTP service and supervised SQL runner complete/recover a job without browser writes',async()=>{
 const f=await fixture();
 try{
  const {handler,client}=setup(f);
  await client.saveMapping(mapping());
  assert.equal((await client.listMappings(1001)).length,1);
  const preview=await client.preview(input(),source);
  assert.equal(preview.issues.length,0);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,0);
  const job=await client.start(input(),source);
  assert.equal(job.state,'ready');assert.equal(job.sourceFile.storageRef,'private');
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,0);
  const runner=createCsvBatchRunner({database:f.database,safety:f.safety,resolveDelegation:async()=>owner});
  assert.equal((await runner({orgId:1001,jobId:job.id})).state,'completed');
  const recovered=await client.job(1001,job.id);assert.equal(recovered.processedRows,2);assert.equal(recovered.sourceFile.storageRef,'private');
  assert.equal((await client.retry(1001,job.id)).state,'completed');
  assert.equal((await runner({orgId:1001,jobId:job.id})).processedRows,2);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,2);
  const replay=await client.start(input(),source);assert.equal(replay.processedRows,2);
  const rejected=await handler(request({op:'start',input:input(),source:source+'\nc,Changed,dog,Available'}));
  assert.equal(rejected.status,409);assert.doesNotMatch(await rejected.text(),/Changed import job replay|private\/|postgres/i);
 }finally{await f.db.close();}
});
test('HTTP blocks unauthenticated, viewer, cross-org and forged actor inputs before SQL access',async()=>{
 const f=await fixture();
 try{
  const {handler}=setup(f);
  assert.equal((await handler(request({op:'save_mapping',mapping:mapping()},'unknown'))).status,401);
  assert.equal((await handler(request({op:'save_mapping',mapping:mapping()},'viewer'))).status,403);
  assert.equal((await handler(request({op:'save_mapping',mapping:mapping()},'owner2'))).status,403);
  assert.equal((await handler(request({op:'save_mapping',mapping:mapping(),actor:owner}))).status,400);
  assert.equal((await handler(new Request(endpoint+'?op=mappings&orgId=1001&actor=owner',{headers:{Authorization:'Bearer owner'}}))).status,400);
  assert.equal((await handler(new Request(endpoint+'?op=mappings&orgId=1001&orgId=1002',{headers:{Authorization:'Bearer owner'}}))).status,400);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_mappings')).rows[0].n,0);
 }finally{await f.db.close();}
});
test('HTTP classifies bounded malformed CSV input, preserves SQL membership rechecks and sanitizes DB errors',async()=>{
 const f=await fixture();
 try{
  const {handler,client}=setup(f);await client.saveMapping(mapping());
  assert.equal((await handler(request({op:'preview',input:input(),source:'Name,name\na,b'}))).status,400);
  assert.equal((await handler(request({op:'preview',input:{...input(),matching:{mode:'stable_key',mappingId:'wrong',keyColumn:'Key'}},source}))).status,400);
  const oversized=new Request(endpoint,{method:'POST',headers,body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_IMPORT_REQUEST_BYTES+1));controller.close();}}),duplex:'half'});
  assert.equal((await handler(oversized)).status,413);
  await f.db.query('update public.organization_memberships set is_active=false where user_id=$1 and org_id=1001',[owner.userId]);
  const revoked=await handler(request({op:'start',input:input(),source}));assert.equal(revoked.status,503);
  assert.doesNotMatch(await revoked.text(),/membership|SQL|source|file|password|owner@example/i);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_jobs')).rows[0].n,0);
 }finally{await f.db.close();}
});
test('HTTP client requires fresh auth, never follows redirects or exposes provider errors, and runner rejects queue actors',async()=>{
 let calls=0;
 const noSession=createCsvOnboardingHttpClient({endpoint,accessToken:async()=>null,fetch:async()=>{calls++;throw new Error();}});
 await assert.rejects(noSession.listMappings(1001),/sign in/);assert.equal(calls,0);
 const forbidden=createCsvOnboardingHttpClient({endpoint,accessToken:async()=> 'token',fetch:async(_url,init)=>{
  assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.headers.Authorization,'Bearer token');
  return new Response('DATABASE_PASSWORD_SECRET',{status:403});
 }});
 await assert.rejects(forbidden.listMappings(1001),/do not have import access/);
 assert.throws(()=>createCsvOnboardingHttpClient({endpoint:'https://user:password@example.test/api',accessToken:async()=> 'token'}),/credentials/);
 assert.throws(()=>createCsvOnboardingHttpClient({endpoint:'/\\unreviewed.example/imports',accessToken:async()=> 'token'}),/reviewed origin/);
 assert.doesNotThrow(()=>createCsvOnboardingHttpClient({endpoint:'http://127.0.0.1:4321/api/v1/imports',accessToken:async()=> 'token'}));
 assert.doesNotThrow(()=>createCsvOnboardingHttpClient({endpoint:'http://localhost:4321/api/v1/imports',accessToken:async()=> 'token'}));
 assert.throws(()=>createCsvOnboardingHttpClient({endpoint:'http://unreviewed.example/imports',accessToken:async()=> 'token'}),/HTTP loopback/);
 const runner=createCsvBatchRunner({database:{transaction:async()=>{throw new Error('must not query');}},safety:{},resolveDelegation:async()=>null});
 await assert.rejects(runner({orgId:1001,jobId:'j',actor:owner}),/Unexpected property/);
 await assert.rejects(runner({orgId:1001,jobId:'j'}),/delegation denied/);
});
