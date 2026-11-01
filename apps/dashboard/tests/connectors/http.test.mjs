import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnectorHttpHandler} from '../../../tenant-site/src/services/connectors/http.ts';
import {createConnectorClient} from '../../src/features/connectors/client.ts';
import {connection} from './fixtures.mjs';
const scope={orgId:1002,connectionId:'source-a'};
const member={kind:'member',orgId:1002,userId:'verified-user',role:'owner'};
const c=connection();
const syncJob={version:1,id:'job-1',orgId:1002,connectionId:c.id,mappingRevision:1,cursor:'PRIVATE_CURSOR',state:'queued',attempt:0,nextAttemptAt:null,counts:{created:0,updated:0,rejected:0,missingReview:0},credentialRef:'PRIVATE_SECRET_REF'};
function harness(actor=member){
 let calls=0;let disconnected=false;let reconnected=false;
 const store={
  describe:async()=>{calls++;return {id:c.id,orgId:c.orgId,provider:c.provider,state:'active',mapping:{...c.mapping,credentialRef:'PRIVATE_MAPPING_REF'},lastSuccessAt:null,error:{code:'credentials',message:'PRIVATE_PROVIDER_BODY'},activationRequired:false,config:c.config,credentialRef:c.credentialRef};},
  enqueue:async()=>{calls++;return syncJob;},status:async()=>{calls++;return syncJob;},
  disconnect:async()=>{calls++;disconnected=true;},reconnect:async()=>{calls++;reconnected=true;},
 };
 const handler=createConnectorHttpHandler({authenticate:async(_request,orgId)=>actor?.orgId===orgId?actor:null,store:()=>store});
 const request=(method='GET',value={})=>new Request(method==='GET'?`http://localhost/api/v1/connectors?${new URLSearchParams({...scope,...value})}`:'http://localhost/api/v1/connectors',{method,headers:{Authorization:'Bearer synthetic-token',...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify({...scope,...value})}:{})});
 return {handler,request,calls:()=>calls,disconnected:()=>disconnected,reconnected:()=>reconnected};
}
test('connector HTTP applies nested public allowlists and sanitizes provider errors',async()=>{
 const h=harness();const response=await h.handler(h.request());assert.equal(response.status,200);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const result=await response.json();assert.equal(result.error.code,'credentials');assert.match(result.error.message,/Reconnect/);
 const encoded=JSON.stringify(result);assert.doesNotMatch(encoded,/PRIVATE_|credentialRef|fixture.invalid|endpoint|"config"/);
 const jobResponse=await h.handler(h.request('GET',{jobId:'job-1'}));assert.equal(jobResponse.status,200);
 assert.doesNotMatch(JSON.stringify(await jobResponse.json()),/PRIVATE_|cursor|mapping|credential/);
});
test('anonymous, cross-org, revoked, viewer and forged authority do not reach stores',async()=>{
 const h=harness();const anonymous=h.request();anonymous.headers.delete('Authorization');
 assert.equal((await h.handler(anonymous)).status,401);
 assert.equal((await h.handler(h.request('GET',{orgId:1001}))).status,403);
 assert.equal((await h.handler(h.request('POST',{action:'sync',requestKey:'r',role:'owner'}))).status,400);
 assert.equal(h.calls(),0);
 const revoked=harness(null);assert.equal((await revoked.handler(revoked.request())).status,403);assert.equal(revoked.calls(),0);
 const viewer=harness({...member,role:'viewer'});assert.equal((await viewer.handler(viewer.request())).status,403);assert.equal(viewer.calls(),0);
 const staff=harness({...member,role:'staff'});assert.equal((await staff.handler(staff.request())).status,200);
 assert.equal((await staff.handler(staff.request('POST',{action:'disconnect'}))).status,403);assert.equal(staff.calls(),1);
});
test('strict request validation, bounded streamed bytes and safe service failure',async()=>{
 const h=harness();
 assert.equal((await h.handler(h.request('GET',{orgId:'1e3'}))).status,400);
 assert.equal((await h.handler(h.request('GET',{unexpected:'x'}))).status,400);
 assert.equal((await h.handler(h.request('POST',{action:'sync'}))).status,400);
 assert.equal((await h.handler(h.request('POST',{action:'disconnect',requestKey:'extra'}))).status,400);
 const huge=h.request('POST',{action:'sync',requestKey:'x'.repeat(33000)});assert.equal((await h.handler(huge)).status,413);
 const broken=createConnectorHttpHandler({authenticate:async()=>{throw Error('PRIVATE_FAILURE_DETAIL');},store:()=>{throw Error('unused');}});
 const response=await broken(h.request());assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/PRIVATE_FAILURE/);
});
test('browser client handles sync/status/disconnect/reconnect without a worker or provider secret',async()=>{
 const h=harness();const sent=[];
 const client=createConnectorClient({endpoint:'http://localhost/api/v1/connectors',accessToken:async()=>'synthetic-token',fetch:async(input,init)=>{
   sent.push({url:String(input),method:init.method,redirect:init.redirect});return h.handler(new Request(input,init));
 }});
 const summary=await client.connection(1002,c.id);assert.equal(summary.id,c.id);
 const job=await client.sync(1002,c.id,'request-1');assert.equal(job.id,'job-1');
 assert.equal((await client.job(1002,c.id,job.id)).id,job.id);
 assert.deepEqual(await client.disconnect(1002,c.id),{state:'disconnected'});
 assert.deepEqual(await client.reconnect(1002,c.id),{state:'configured',activationRequired:true});
 assert.equal(h.disconnected(),true);assert.equal(h.reconnected(),true);assert.equal(sent.length,5);
 assert.ok(sent.every(s=>s.redirect==='error'));assert.ok(sent.every(s=>!s.url.includes('synthetic-token')));
 assert.throws(()=>createConnectorClient({endpoint:'http://provider.example/control',accessToken:async()=>'token'}),/HTTPS/);
});
test('browser client never surfaces arbitrary server errors or signs in implicitly',async()=>{
 const missing=createConnectorClient({endpoint:'http://localhost/api',accessToken:async()=>null,fetch:async()=>{throw Error('must not fetch');}});
 await assert.rejects(()=>missing.connection(1002,c.id),/sign in/);
 const client=createConnectorClient({endpoint:'http://localhost/api',accessToken:async()=>'token',fetch:async()=>new Response('PRIVATE_PROVIDER_ERROR',{status:503})});
 await assert.rejects(()=>client.connection(1002,c.id),e=>!/PRIVATE/.test(e.message)&&/unavailable/.test(e.message));
});
test('browser rejects mismatched organization and malformed successful payloads',async()=>{
 for(const value of [null,{id:c.id,orgId:1001,provider:'cognito',state:'active',mapping:c.mapping,activationRequired:false},{id:c.id,orgId:1002,provider:'cognito',state:'active',mapping:null,activationRequired:false}]){
  const client=createConnectorClient({endpoint:'http://localhost/api',accessToken:async()=>'token',fetch:async()=>Response.json(value)});
  await assert.rejects(()=>client.connection(1002,c.id),/invalid response/);
 }
 const client=createConnectorClient({endpoint:'http://localhost/api',accessToken:async()=>'token',fetch:async()=>Response.json({...syncJob,orgId:1001})});
 await assert.rejects(()=>client.sync(1002,c.id,'request'),/invalid response/);
});
