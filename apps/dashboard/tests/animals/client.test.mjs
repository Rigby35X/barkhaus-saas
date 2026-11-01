import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client(fetchImpl){
 const source=readFileSync(new URL('../../src/features/animals/client.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 vm.runInNewContext(code,{exports,URL,fetch:fetchImpl,require(name){
  if(name==='../../lib/api')return {getAuthHeaders:async()=>({Authorization:'Bearer synthetic-only'})};
  if(name==='../../lib/platform-http')return {getPlatformApiUrl(resource){assert.equal(resource,'animals');return 'http://localhost:4321/api/v1/animals';}};
  throw new Error(`Unexpected dependency ${name}`);
 }});
 return exports;
}

test('native client uses explicit platform origin and verified session headers without legacy organization lookup',async()=>{
 const calls=[];
 const api=client(async(url,options)=>{calls.push({url:String(url),options});return {ok:true,json:async()=>[]};});
 await api.listAnimals(1001);
 assert.equal(calls[0].url,'http://localhost:4321/api/v1/animals?orgId=1001');
 assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-only');
 assert.equal(calls[0].options.cache,'no-store');
 await assert.rejects(api.listAnimals(0),/organization/);
 assert.equal(calls.length,1);
});

test('native client preserves typed IDs and command keys, reports conflict without changing attempted payload',async()=>{
 const calls=[];
 const api=client(async(url,options)=>{calls.push({url:String(url),options});return {ok:false,status:409};});
 await assert.rejects(api.readAnimal(1001,'001'),/attempted input is preserved/);
 assert.equal(new URL(calls[0].url).searchParams.get('animalId'),'"001"');
 const command={version:1,orgId:1001,kind:'edit_native',idempotencyKey:'stable-key',animalId:'001',expectedRevision:1,fields:{name:'Attempted'}};
 await assert.rejects(api.writeAnimal(command),error=>error.status===409);
 assert.equal(JSON.parse(calls[1].options.body).idempotencyKey,'stable-key');
 assert.equal(command.fields.name,'Attempted');
});
