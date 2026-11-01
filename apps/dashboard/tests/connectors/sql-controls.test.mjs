import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,owner,owner2,viewer} from '../integration/database.mjs';
import {connection,raw,page,auth} from './fixtures.mjs';
import {SqlConnectorControlStore} from '../../../tenant-site/src/services/connectors/sql-control-store.ts';
import {SqlConnectorStore} from '../../../tenant-site/src/services/connectors/sql-store.ts';
import {ConnectorWorker} from '../../../tenant-site/src/services/connectors/worker.ts';
import {CognitoAdapter} from '../../../tenant-site/src/services/connectors/cognito.ts';
const scope={orgId:1002,connectionId:'source-a'};
async function setup(t){
 const h=await fixture();t.after(()=>h.db.close());const c=connection();const {credentialRef,...definition}=c;
 await h.db.query('insert into public.platform_connections(org_id,id,provider,definition) values($1,$2,$3,$4)',[c.orgId,c.id,c.provider,JSON.stringify(definition)]);
 await h.db.query('insert into public.platform_mappings(org_id,id,revision,connection_id,definition) values($1,$2,$3,$4,$5)',[c.orgId,c.mapping.id,c.mapping.revision,c.id,JSON.stringify(c.mapping)]);
 const controls=new SqlConnectorControlStore(h.database,owner2,h.safety);
 const workerStore=new SqlConnectorStore(h.database,{...scope,workerId:'worker-1'},h.safety,async()=>credentialRef);
 return {...h,c,controls,workerStore};
}
test('SQL member controls enqueue durably, expose mapping and record successful sync time atomically',async t=>{
 const h=await setup(t);
 const queued=await h.controls.enqueue(scope,'manual-request');
 assert.equal((await h.controls.enqueue(scope,'manual-request')).id,queued.id);
 const adapter=new CognitoAdapter({read:async()=>page([{...raw(),Photos:[]}])},()=> '2026-10-26');
 const worker=new ConnectorWorker(h.workerStore,auth,adapter,{leaseMs:60000,timeoutMs:45000,maxAttempts:3,baseDelayMs:1,maxDelayMs:10});
 await worker.runOnce('verified-workload');
 const summary=await h.controls.describe(scope);assert.equal(summary.state,'active');assert.ok(!Number.isNaN(Date.parse(summary.lastSuccessAt)));
 assert.equal(summary.mapping.id,h.c.mapping.id);assert.equal(summary.error,null);
 assert.equal((await h.controls.status(scope,queued.id)).state,'completed');
 assert.doesNotMatch(JSON.stringify(summary),/vault|credential|fixture.invalid|EntryNumber/);
 assert.equal((await h.db.query('select count(*)::int as n from public.platform_unit_receipts')).rows[0].n,1);
});
test('SQL controls recheck actual membership and reject cross-org before metadata operations',async t=>{
 const h=await setup(t);
 await assert.rejects(new SqlConnectorControlStore(h.database,owner,h.safety).describe(scope),/denied/);
 const viewer2={...viewer,orgId:1002};await h.db.query('insert into public.organization_memberships(user_id,org_id,role) values($1,$2,$3)',[viewer.userId,1002,'viewer']);
 await assert.rejects(new SqlConnectorControlStore(h.database,viewer2,h.safety).enqueue(scope,'viewer'),/denied/);
 await h.db.query('update public.organization_memberships set is_active=false where user_id=$1 and org_id=1002',[owner2.userId]);
 await assert.rejects(h.controls.enqueue(scope,'revoked'),/denied/);
 assert.equal((await h.db.query('select count(*)::int as n from public.platform_jobs')).rows[0].n,0);
});
test('SQL disconnect and reconnect fence pending work without activating or transferring ownership',async t=>{
 const h=await setup(t);const queued=await h.controls.enqueue(scope,'before-disconnect');
 await h.controls.disconnect(scope);
 let row=(await h.db.query('select active,state,generation from public.platform_connections')).rows[0];
 assert.equal(row.active,false);assert.equal(row.state,'disconnected');assert.equal(Number(row.generation),2);
 assert.equal((await h.controls.status(scope,queued.id)).state,'failed');
 await h.controls.disconnect(scope);assert.equal(Number((await h.db.query('select generation from public.platform_connections')).rows[0].generation),2);
 await h.controls.reconnect(scope);row=(await h.db.query('select active,state,generation from public.platform_connections')).rows[0];
 assert.equal(row.active,false);assert.equal(row.state,'configured');assert.equal(Number(row.generation),3);
 assert.equal((await h.controls.describe(scope)).activationRequired,true);
 await assert.rejects(h.controls.enqueue(scope,'not-activated'),/stopped/);
});
test('failed page cannot publish a success timestamp and later success clears its older safe error',async t=>{
 const h=await setup(t);await h.controls.enqueue(scope,'checkpoint-rollback');
 const adapter=new CognitoAdapter({read:async()=>page([{...raw(),Photos:[]}])},()=> '2026-10-26');
 const worker=new ConnectorWorker(h.workerStore,auth,adapter,{leaseMs:60000,timeoutMs:45000,maxAttempts:3,baseDelayMs:1,maxDelayMs:10});
 h.faults.match=/insert into public.platform_unit_receipts/;
 await worker.runOnce('verified-workload');
 let summary=await h.controls.describe(scope);assert.equal(summary.lastSuccessAt,null);assert.equal(summary.error.code,'unavailable');
 assert.equal((await h.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,0);
 await h.db.exec('update public.platform_jobs set next_attempt_at=null');
 await worker.runOnce('verified-workload');summary=await h.controls.describe(scope);
 assert.ok(!Number.isNaN(Date.parse(summary.lastSuccessAt)));assert.equal(summary.error,null);
});
