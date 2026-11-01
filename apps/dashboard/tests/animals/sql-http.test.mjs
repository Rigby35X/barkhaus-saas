import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqlAnimalHttpHandler} from '../../../tenant-site/src/services/animals/sql-http.ts';
import {fixture,owner,owner2,viewer,create} from '../integration/database.mjs';

const url='https://synthetic.local/api/v1/animals';
const tokens={owner,owner2,viewer};
function authorizer(request,orgId){
 const actor=tokens[request.headers.get('authorization')?.replace(/^Bearer /,'')];
 if(!actor)return Promise.resolve({response:new Response('{}',{status:401})});
 if(actor.orgId!==orgId)return Promise.resolve({response:new Response('{}',{status:403})});
 return Promise.resolve({actor,principal:{kind:'member',orgId:actor.orgId,userId:actor.userId}});
}
const post=(command,token='owner')=>new Request(url,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(command)});
const get=(orgId=1001,token='owner',suffix='')=>new Request(`${url}?orgId=${orgId}${suffix}`,{headers:token?{authorization:`Bearer ${token}`}:{}});

test('request-scoped SQL animal HTTP survives create/read/edit and enforces two-organization authorization',async()=>{
 const f=await fixture();
 try{
  const handle=createSqlAnimalHttpHandler({database:f.database,safety:f.safety,authorize:authorizer});
  const denied=await handle(get(1001,null));
  assert.equal(denied.status,401);
  assert.equal(denied.headers.get('cache-control'),'private, no-store');
  assert.equal(denied.headers.get('vary'),'Authorization');
  assert.equal((await handle(get(1002))).status,403);
  const response=await handle(post(create('native-http')));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const animal=(await response.json()).animal;
  const idQuery=`&animalId=${encodeURIComponent(JSON.stringify(animal.id))}`;
  assert.equal((await (await handle(get(1001,'owner',idQuery))).json()).id,animal.id);
  const edit={version:1,orgId:1001,kind:'edit_native',animalId:animal.id,expectedRevision:animal.revision,idempotencyKey:'native-http-edit',fields:{name:'Willow'},internalNotes:'PRIVATE_HTTP_NOTE'};
  assert.equal((await handle(post(edit,'viewer'))).status,403);
  const saved=await (await handle(post(edit))).json();
  assert.equal(saved.animal.fields.name,'Willow');
  assert.equal((await handle(post({...edit,idempotencyKey:'stale-http-edit',fields:{name:'Stale'}}))).status,409);
  assert.equal((await (await handle(get(1001,'owner',idQuery))).json()).privateData.internalNotes,'PRIVATE_HTTP_NOTE');
  assert.deepEqual(await (await handle(get(1002,'owner2'))).json(),[]);
  await f.db.query('update public.organization_memberships set is_active=false where user_id=$1',[owner.userId]);
  assert.equal((await handle(post({...edit,expectedRevision:saved.animal.revision,idempotencyKey:'revoked-http-edit'}))).status,403);
 }finally{await f.db.close();}
});

test('HTTP lost commit acknowledgement replays the durable command once and preserves receipt',async()=>{
 const f=await fixture();
 try{
  const handle=createSqlAnimalHttpHandler({database:f.database,safety:f.safety,authorize:authorizer});
  const command=create('native-http-lost-ack');
  f.faults.afterCommit=true;
  assert.equal((await handle(post(command))).status,503);
  const replay=await (await handle(post(command))).json();
  assert.equal(replay.ok,true);assert.equal(replay.replayed,true);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,1);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_write_receipts')).rows[0].n,1);
  assert.equal((await handle(post({...command,fields:{...command.fields,name:'Changed reused key'}}))).status,409);
 }finally{await f.db.close();}
});

test('HTTP composition refuses mismatched trusted scopes and unsafe photos without touching SQL',async()=>{
 let transactions=0;
 const database={async transaction(){transactions++;throw new Error('must not execute');}};
 const handle=createSqlAnimalHttpHandler({database,safety:{photoAllowed:async()=>false},authorize:async()=>({actor:owner,principal:{kind:'member',orgId:1001,userId:owner2.userId}})});
 assert.equal((await handle(post(create()))).status,403);
 assert.equal(transactions,0);
 const f=await fixture();
 try{
  const valid=createSqlAnimalHttpHandler({database:f.database,safety:f.safety,authorize:authorizer});
  const command=create('wrong-org-photo',{fields:{...create().fields,photos:[{id:'photo',url:'https://images.example/1002/photo.jpg',alt:''}]}});
  assert.equal((await valid(post(command))).status,400);
  assert.equal((await f.db.query('select count(*)::int as n from public.platform_animals')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('SQL HTTP private document signing binds animal, organization and a sixty-second capability',async()=>{
 const f=await fixture();
 const signed=[];
 try{
  const safety={...f.safety,async signDocument(orgId,objectName,seconds){signed.push({orgId,objectName,seconds});return 'https://private.synthetic.invalid/signed-document';}};
  const handle=createSqlAnimalHttpHandler({database:f.database,safety,authorize:authorizer});
  const animal=(await (await handle(post(create('http-document')))).json()).animal;
  await f.db.query("insert into public.platform_documents(org_id,id,animal_id,object_name,kind) values(1001,'synthetic-doc',$1,'1001/medical/synthetic.pdf','medical')",[animal.id]);
  const query=`&animalId=${encodeURIComponent(JSON.stringify(animal.id))}&documentId=synthetic-doc`;
  const response=await handle(get(1001,'owner',query));
  assert.equal(response.status,200);
  assert.equal((await response.json()).expiresInSeconds,60);
  assert.deepEqual(signed,[{orgId:1001,objectName:'1001/medical/synthetic.pdf',seconds:60}]);
  assert.equal((await handle(get(1002,'owner2',query))).status,404);
  assert.equal(signed.length,1);
  await f.db.query('update public.organization_memberships set is_active=false where user_id=$1',[owner.userId]);
  assert.equal((await handle(get(1001,'owner',query))).status,404);
  assert.equal(signed.length,1);
 }finally{await f.db.close();}
});
