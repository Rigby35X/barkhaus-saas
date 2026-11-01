import test from 'node:test';
import assert from 'node:assert/strict';
import { CognitoAdapter, normalizeCognito } from '../../../tenant-site/src/services/connectors/cognito.ts';
import { validateConnection } from '../../../tenant-site/src/services/connectors/config.ts';
import { ConnectorWorker } from '../../../tenant-site/src/services/connectors/worker.ts';
import { createConnectorControl } from '../../../tenant-site/src/services/connectors/control.ts';
import { toPublicAnimal } from '../../../../shared/contracts/v1/animal.ts';
import { connection, raw, page, auth, FixtureStore } from './fixtures.mjs';
const scope={orgId:1002,connectionId:'source-a'};
const admin={orgId:1002,role:'admin',active:true};
function harness(read=async()=>page([raw()]),c=connection(),extra={}) {
  const store=new FixtureStore(c);let time=1000;let calls=0;
  const adapter=new CognitoAdapter({read:async input=>{calls++;return read(input);}},()=> '2026-10-26');
  const options={leaseMs:1000,timeoutMs:500,maxAttempts:3,baseDelayMs:10,maxDelayMs:100,...extra};
  const worker=new ConnectorWorker(store,auth,adapter,options,()=>time,()=>0);
  return {store,worker,control:createConnectorControl(store,auth),calls:()=>calls,advance:(ms=200)=>time+=ms,
    enqueue:()=>store.enqueue({orgId:c.orgId,connectionId:c.id},'request'),run:()=>worker.runOnce('verified-workload')};
}
test('Cognito explicit config, status mapping, scoped identity and compatibility key',()=>{
  const r=normalizeCognito(connection(),raw(),'2026-10-26');
  assert.equal(r.externalRecordId,'7');assert.equal(r.compatibilityPublicKey,'dog-38-7');assert.equal(r.fields.availability,'available');
  for(const change of [{provider:undefined},{orgId:undefined},{config:{}},{mapping:{...connection().mapping,orgId:1001}}])assert.throws(()=>validateConnection({...connection(),...change}));
  const c=connection();c.mapping.fields.push(c.mapping.fields[0]);assert.throws(()=>validateConnection(c));
});
test('unmapped statuses and malformed success bodies fail; valid empty remains success',async()=>{
  for(const response of [page([{...raw(),Code:'Published'}]),{status:200,body:{}},page([raw('7','opaque')]),page([raw(),raw()]),{status:429,retryAfterSeconds:Number.MAX_VALUE}]){
    const a=new CognitoAdapter({read:async()=>response},()=> '2026-10-26');
    assert.equal((await a.fetchPage(connection(),null,new AbortController().signal)).kind,'failure');
  }
  const a=new CognitoAdapter({read:async()=>page([])},()=> '2026-10-26');assert.equal((await a.fetchPage(connection(),null,new AbortController().signal)).kind,'success');
});
test('replay same job/source page is idempotent and new animals unpublished',async()=>{
  const h=harness();await h.enqueue();await h.run();await h.enqueue();await h.run();
  assert.equal(h.store.writes,1);assert.equal(Object.keys(h.store.animals).length,1);assert.equal(toPublicAnimal(h.store.animals['7']),null);
  assert.notEqual(h.store.animals['7'].id,'dog-38-7');
});
test('second-row failure rolls back the entire page and retry reuses its immutable inbox',async()=>{
  const h=harness(async()=>page([raw('7'),raw('8')],'cursor-2',false));h.store.failId='8';
  await h.enqueue();await h.run();assert.equal(h.store.jobs[0].cursor,null);assert.equal(h.store.writes,0);assert.equal(h.store.reviews,0);assert.equal(h.store.outcomes.length,0);assert.deepEqual(h.store.jobs[0].box.completed,[]);
  h.advance();await h.run();assert.equal(h.calls(),1);assert.equal(h.store.writes,2);assert.equal(h.store.jobs[0].cursor,'cursor-2');assert.equal(h.store.outcomes.length,2);
});
test('outcome failure rolls back writer and retry creates once',async()=>{
  const h=harness();h.store.failOutcome=true;await h.enqueue();await h.run();assert.equal(h.store.writes,0);
  h.advance();await h.run();assert.equal(h.store.writes,1);assert.equal(h.store.jobs[0].counts.created,1);
});
test('overlapping enqueue coalesces, only one worker fetches',async()=>{
  let finish;const h=harness(()=>new Promise(resolve=>finish=resolve));
  const jobs=await Promise.all([h.enqueue(),h.enqueue()]);assert.equal(jobs[0].id,jobs[1].id);
  const first=h.run();while(!finish)await new Promise(r=>setImmediate(r));
  assert.equal(await h.run(),false);finish(page([raw()]));await first;assert.equal(h.calls(),1);assert.equal(h.store.writes,1);
});
test('older source timestamps cannot revert later revision; changed equal revision conflicts',async()=>{
  let row=raw('7','2026-10-26T00:00:00.000Z','New');const h=harness(async()=>page([row]));
  await h.enqueue();await h.run();row=raw();await h.enqueue();await h.run();assert.equal(h.store.animals['7'].fields.name,'New');
  row=raw('7','2026-10-26T00:00:00.000Z','Altered');await h.enqueue();await h.run();assert.equal(h.store.jobs.at(-1).error.code,'conflict');assert.equal(h.store.writes,1);
});
test('local edit during fetch conflicts against pre-fetch revision',async()=>{
  let mutate=false;let h;h=harness(async()=>{
    if(mutate)h.store.animals['7'].revision++;
    return page([raw('7',mutate?'2026-10-26T00:00:00.000Z':'2026-10-25T00:00:00.000Z',mutate?'Changed':'Moss')]);
  });await h.enqueue();await h.run();mutate=true;await h.enqueue();await h.run();assert.equal(h.store.animals['7'].fields.name,'Moss');assert.equal(h.store.jobs.at(-1).error.code,'conflict');
});
test('source updates preserve local fields, notes, applications, publication and approvals',async()=>{
  let row=raw();const h=harness(async()=>page([row]));await h.enqueue();await h.run();
  const a=h.store.animals['7'];a.privateData.internalNotes='Local note';a.ownership.biography={kind:'barkhaus'};a.fields.biography='Local biography';
  a.customFields.kennel.owner={kind:'barkhaus'};a.customFields.kennel.value='Local kennel';
  a.publication={state:'published',publicProfileKey:'dog-38-7',approvedPhotos:a.fields.photos.map(p=>({id:p.id,url:p.url}))};
  const local=structuredClone({notes:a.privateData,publication:a.publication,applications:a.applications});
  row={...raw('7','2026-10-26T00:00:00.000Z','New name'),Photos:['https://fixture.invalid/new-v2.jpg'],Code:'Placed'};
  await h.enqueue();await h.run();const updated=h.store.animals['7'];assert.equal(updated.fields.name,'New name');assert.equal(updated.fields.biography,'Local biography');assert.equal(updated.customFields.kennel.value,'Local kennel');
  assert.deepEqual({notes:updated.privateData,publication:updated.publication,applications:updated.applications},local);
  assert.equal(updated.fields.availability,'unavailable');assert.deepEqual(toPublicAnimal(updated).photos,[]);
  await h.control.disconnect(admin,scope);assert.equal(h.store.animals['7'].privateData.internalNotes,'Local note');
});
test('failure and partial traversal never mark missing; complete empty marks review only',async()=>{
  let response=page([raw()]);const h=harness(async()=>response);await h.enqueue();await h.run();
  response={status:503};await h.enqueue();await h.run();assert.equal(h.store.reviews,0);
  // Terminal fail this synthetic job, then request a fresh complete traversal.
  h.store.jobs.at(-1).state='failed';response=page([],null,false);await h.enqueue();await h.run();assert.equal(h.store.reviews,0);
  response=page([]);await h.enqueue();await h.run();assert.equal(h.store.reviews,1);assert.equal(Object.keys(h.store.animals).length,1);
});
test('credentials sanitized; Retry-After respected; bounded retries',async()=>{
  const c=harness(async()=>({status:401,body:{secret:'DO-NOT-LOG'}}));await c.enqueue();await c.run();
  assert.equal(c.store.jobs[0].error.code,'credentials');assert.match(c.store.jobs[0].error.message,/Reconnect/);assert.doesNotMatch(JSON.stringify(c.store.jobs),/DO-NOT-LOG/);
  const h=harness(async()=>({status:429,retryAfterSeconds:300}));await h.enqueue();await h.run();
  assert.ok(Date.parse(h.store.jobs[0].nextAttemptAt)>=301000);h.advance(300001);await h.run();h.advance(300001);await h.run();assert.equal(h.store.jobs[0].state,'failed');
});
test('disconnect during source response fences write; all records survive',async()=>{
  let finish;const h=harness(()=>new Promise(r=>finish=r));await h.enqueue();const run=h.run();while(!finish)await new Promise(r=>setImmediate(r));
  await h.control.disconnect(admin,scope);finish(page([raw()]));await run;assert.equal(h.store.writes,0);assert.equal(h.store.jobs[0].state,'failed');
});
test('expired lease fences response and another worker safely resumes',async()=>{
  let first=true,finish;const h=harness(()=>first?(first=false,new Promise(r=>finish=r)):Promise.resolve(page([raw()])));
  await h.enqueue();const run=h.run();while(!finish)await new Promise(r=>setImmediate(r));h.advance(1001);await h.run();finish(page([raw('7','2026-10-24T00:00:00.000Z','Old')]));await run;
  assert.equal(h.store.writes,1);assert.equal(h.store.animals['7'].fields.name,'Moss');
});
test('cross-org, revoked, viewer and forged worker denied; status has no secret ref',async()=>{
  const h=harness();
  for(const proof of [{...admin,orgId:1001},{...admin,active:false},{...admin,role:'viewer'}])await assert.rejects(()=>h.control.enqueue(proof,scope,'x'));
  await assert.rejects(()=>h.control.enqueue(admin,{...scope,connectionId:'other'},'x'));
  await assert.rejects(()=>h.worker.runOnce({kind:'worker',orgId:1002,connectionId:'source-a'}));
  const job=await h.control.enqueue(admin,scope,'x');assert.doesNotMatch(JSON.stringify(job),/vault|credential|cursor|mapping/);
  await h.run();assert.equal(h.store.writes,1); // no browser involved
  const other=harness(undefined,connection(1001));await other.enqueue();await other.run();assert.notEqual(other.store.animals['7'].id,h.store.animals['7'].id);
});
test('worker deadline rejects non-cooperating transport',async()=>{
  const h=harness(()=>new Promise(()=>{}),connection(),{timeoutMs:10});await h.enqueue();
  // Keep event loop alive because AbortSignal.timeout is unrefed by Node.
  const keep=setInterval(()=>{},20);try{await h.run();}finally{clearInterval(keep);}
  assert.equal(h.store.jobs[0].state,'retry_wait');assert.equal(h.store.writes,0);
});


test('multi-page traversal completes only after all page outcomes; earlier seen animals remain current',async()=>{
  let empty=false;const h=harness(async input=> empty?page([]):input.cursor===null?page([raw('7')],'next',false):page([raw('8')]));
  await h.enqueue();await h.run();assert.equal(h.store.jobs[0].state,'queued');assert.equal(h.store.jobs[0].cursor,'next');
  await h.run();assert.equal(h.store.jobs[0].state,'completed');assert.equal(h.store.reviews,0);assert.equal(h.store.writes,2);
  empty=true;await h.enqueue();await h.run();assert.equal(h.store.reviews,2);
});
test('saved birthday mapping preserves explicit estimate and rejects impossible/future dates',()=>{
  const c=connection();c.mapping.fields.push({sourceColumn:'Birthday',target:{kind:'core',field:'age'},transform:'birthday'});
  assert.equal(normalizeCognito(c,{...raw(),Birthday:{date:'2025-01-01',estimated:true}},'2026-10-26').fields.age.estimated,true);
  for(const date of ['2026-02-30','2027-01-01'])assert.throws(()=>normalizeCognito(c,{...raw(),Birthday:{date,estimated:false}},'2026-10-26'));
});


test('checkpoint failure rolls back all page animals, outcomes, source heads and counts',async()=>{
  const h=harness(async()=>page([raw('7'),raw('8')],'next-page',false));
  h.store.failCheckpoint=true;await h.enqueue();await h.run();
  assert.equal(h.store.writes,0);assert.deepEqual(h.store.animals,{});assert.deepEqual(h.store.heads,{});
  assert.equal(h.store.outcomes.length,0);assert.equal(h.store.jobs[0].cursor,null);
  assert.deepEqual(h.store.jobs[0].box.completed,[]);assert.equal(h.store.jobs[0].counts.created,0);
  h.advance();await h.run();assert.equal(h.calls(),1);assert.equal(h.store.writes,2);
  assert.equal(h.store.outcomes.length,2);assert.equal(h.store.jobs[0].cursor,'next-page');
});
test('lost commit acknowledgement preserves the committed cursor and never repeats page writes',async()=>{
  const h=harness(async input=>input.cursor===null?page([raw('7')],'next-page',false):page([raw('8')]));
  h.store.loseCommitAck=true;await h.enqueue();await h.run();
  assert.equal(h.store.writes,1);assert.equal(h.store.jobs[0].cursor,'next-page');
  assert.equal(h.store.jobs[0].state,'queued');assert.equal(h.store.jobs[0].box,null);
  assert.equal(h.store.outcomes.length,1);
  await h.run();assert.equal(h.store.writes,2);assert.equal(h.store.outcomes.length,2);
  assert.equal(h.store.jobs[0].state,'completed');assert.equal(h.calls(),2);
});
test('committed unit receipt resolves direct replay after acknowledgement loss without invoking callback',async()=>{
  const store=new FixtureStore();await store.enqueue(scope,'request');
  const {lease}=await store.claim('worker-1',1000,1000);
  await store.saveInbox(lease,{kind:'success',records:[],nextCursor:null,completeSnapshot:true},{});
  store.loseCommitAck=true;let callbacks=0;
  await assert.rejects(()=>store.commitPage(lease,async tx=>{callbacks++;await tx.checkpoint();return 'committed';}),/acknowledgement lost/);
  assert.equal(store.jobs[0].state,'completed');
  const result=await store.commitPage(lease,async()=>{callbacks++;throw Error('must not rerun');});
  assert.equal(result,'committed');assert.equal(callbacks,1);assert.equal(store.committedLeases.size,1);
});
test('empty complete page missing-review changes roll back with checkpoint failure',async()=>{
  let response=page([raw()]);const h=harness(async()=>response);await h.enqueue();await h.run();
  response=page([]);h.store.failCheckpoint=true;await h.enqueue();await h.run();
  assert.equal(h.store.reviews,0);assert.equal(h.store.animals['7'].syncState,'current');
  assert.notEqual(h.store.jobs.at(-1).box,null);
  h.advance();await h.run();assert.equal(h.store.reviews,1);
  assert.equal(h.store.jobs.at(-1).state,'completed');
});
test('pre-fetch snapshots retain revision metadata only, excluding private animal values',async()=>{
  const h=harness();await h.enqueue();await h.run();
  h.store.animals['7'].privateData.internalNotes='DO-NOT-PERSIST-IN-INBOX';
  await h.enqueue();const {lease}=await h.store.claim('worker-1',1000,1000);
  const snapshot=await h.store.snapshot(lease);
  assert.deepEqual(snapshot,{'7':{revision:1}});
  assert.doesNotMatch(JSON.stringify(snapshot),/DO-NOT|privateData|photos|customFields/);
});
