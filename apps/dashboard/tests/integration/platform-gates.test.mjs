import test from 'node:test';
import assert from 'node:assert/strict';
import {createGatedPlatformHandler} from '../../../tenant-site/src/services/platform/gated-runtime.ts';
import {resolvePlatformApiUrl} from '../../src/lib/platform-http.ts';
const post=(body)=>new Request('https://stage.invalid/api/v1/imports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('platform browser origins are explicit secure origins, with no tenant/provider fallback',()=>{
 for(const origin of [undefined,'','http://remote.invalid','https://user:pass@stage.invalid','https://stage.invalid/path','https://stage.invalid?token=x','https://stage.invalid/']) assert.throws(()=>resolvePlatformApiUrl(origin,'animals'));
 assert.equal(resolvePlatformApiUrl('http://localhost:5173','imports'),'http://localhost:5173/api/v1/imports');
 assert.equal(resolvePlatformApiUrl('https://stage.invalid','connectors'),'https://stage.invalid/api/v1/connectors');
});
test('mounted platform handlers authenticate organization and roles but remain unavailable',async()=>{
 const calls=[];
 const guard=async(request,orgId,roles)=>{calls.push({orgId,roles});return {client:{},principal:{kind:'member',userId:'synthetic',orgId,role:'owner'}};};
 const imports=createGatedPlatformHandler('imports',guard);
 assert.equal((await imports(post({op:'start',input:{orgId:1001},source:'synthetic'}))).status,503);
 assert.deepEqual(calls[0],{orgId:1001,roles:['owner','admin','staff']});
 const connectors=createGatedPlatformHandler('connectors',guard);
 assert.equal((await connectors(new Request('https://stage.invalid/api/v1/connectors?orgId=1002'))).status,503);
 assert.deepEqual(calls[1],{orgId:1002,roles:['owner','admin','staff','viewer']});
 assert.equal((await connectors(post({orgId:1002,action:'sync'}))).status,503);
 assert.deepEqual(calls[2].roles,['owner','admin']);
});
test('mounted platform gates preserve authorization denial and private cache headers',async()=>{
 for(const status of [401,403]){
  const denied=new Response('{}',{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization'}});
  const handler=createGatedPlatformHandler('imports',async()=>({response:denied}));
  const result=await handler(new Request('https://stage.invalid/api/v1/imports?op=mappings&orgId=1001'));
  assert.equal(result,denied);assert.equal(result.status,status);assert.match(result.headers.get('Cache-Control'),/no-store/);
 }
});
test('mounted platform gates reject invalid scopes and oversized streams before authorization',async()=>{
 let calls=0;
 const handler=createGatedPlatformHandler('connectors',async()=>{calls++;throw new Error('must not authorize');});
 for(const url of ['?orgId=1001&orgId=1002','?orgId=0','?orgId=1e3']) assert.equal((await handler(new Request('https://stage.invalid/api/v1/connectors'+url))).status,400);
 assert.equal((await handler(post({orgId:'1001'}))).status,400);
 assert.equal((await handler(post({orgId:1001,payload:'x'.repeat(33000)}))).status,413);
 assert.equal(calls,0);
});
