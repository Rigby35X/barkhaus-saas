import test from 'node:test';
import assert from 'node:assert/strict';
import { runIdentityAcceptance } from '../../../../scripts/staging/identity-acceptance.mjs';
const roles = { OWNER_A: [1001, 'owner'], STAFF_A: [1001, 'staff'], VIEWER_A: [1001, 'viewer'], REVOKED_A: [1001, null], OWNER_B: [1002, 'owner'] };
const ref='abcdefghijklmnopqrst';
function env(storage=false) {
 const key='sb_publishable_synthetic';
 const result={BARKHAUS_STAGING_PROJECT_REF:ref,BARKHAUS_STAGING_RUNTIME_MODE:'gated',BARKHAUS_STAGING_APP_ORIGIN:'http://localhost:5173',BARKHAUS_STAGING_API_ORIGIN:'http://localhost:4321',VITE_SUPABASE_URL:`https://${ref}.supabase.co`,PUBLIC_SUPABASE_URL:`https://${ref}.supabase.co`,VITE_SUPABASE_ANON_KEY:key,PUBLIC_SUPABASE_ANON_KEY:key};
 for(const role of Object.keys(roles)){result[`BARKHAUS_STAGING_${role}_EMAIL`]=`${role.toLowerCase()}@example.test`;result[`BARKHAUS_STAGING_${role}_PASSWORD`]='synthetic-test-password';}
 if(storage)result.BARKHAUS_STAGING_PRIVATE_FIXTURE_PATH='1001/acceptance/identity-fixture.txt';
 return result;
}
function fixture({cross=false,missingFile=false,extraField=false}={}) {
 const calls=[];const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 async function fetch(url,init={}) {
  const u=new URL(url);calls.push({path:u.pathname,method:init.method??'GET'});
  assert.equal(u.hostname,`${ref}.supabase.co`);assert.equal(init.redirect,'error');
  const token=init.headers?.Authorization?.slice(7);const role=token?.replace('token-','');
  if(u.pathname==='/auth/v1/token'){const body=JSON.parse(init.body);const name=Object.keys(roles).find(r=>body.email===`${r.toLowerCase()}@example.test`);assert.ok(name);return json({access_token:`token-${name}`});}
  if(u.pathname==='/auth/v1/user')return json({id:`uuid-${role}`});
  if(u.pathname==='/auth/v1/logout')return new Response(null,{status:204});
  if(u.pathname==='/rest/v1/rpc/my_organization_access'){
   if(!role)return json({},401);const [id,r]=roles[role];return json(r?[{org_id:id,role:r,organizations:{org:'Synthetic rescue',...(extraField?{secret:'do not expose'}:{})}}]:[]);
  }
  if(u.pathname==='/rest/v1/organization_memberships'){
   if(!role)return json({},401);if(u.searchParams.has('org_id'))return json(cross?[{org_id:999}]:[]);const [id,r]=roles[role];return json(r?[{user_id:`uuid-${role}`,org_id:id,role:r}]:[]);
  }
  if(u.pathname.startsWith('/storage/v1/object/sign/')){
   if(u.searchParams.has('token'))return new Response(null,{status:missingFile?404:200});
   if(['OWNER_A','VIEWER_A'].includes(role))return json({signedURL:`${u.pathname.replace('/storage/v1','')}?token=synthetic-signed-token`});
   return json({},400);
  }
  if(u.pathname.startsWith('/storage/v1/object/public/'))return json({},404);
  throw new Error('Unexpected request');
 }
 return {fetch,calls};
}
test('identity acceptance verifies five roles and private fixture boundaries using only designated requests',async()=>{
 const f=fixture();const result=await runIdentityAcceptance(env(true),f.fetch);
 assert.equal(result.complete,true);assert.ok(result.results.some(r=>r.includes('OWNER_B private fixture: denied')));
 assert.equal(f.calls.filter(c=>c.path==='/auth/v1/logout').length,5);
 assert.ok(f.calls.every(c=>c.method==='GET'||['/auth/v1/token','/auth/v1/logout','/rest/v1/rpc/my_organization_access'].includes(c.path)||c.path.startsWith('/storage/v1/object/sign/')));
 assert.ok(!JSON.stringify(result).includes('synthetic-test-password'));assert.ok(!JSON.stringify(result).includes('synthetic-signed-token'));
});
test('missing fixture reports incomplete instead of claiming private Storage acceptance',async()=>{
 const result=await runIdentityAcceptance(env(),fixture().fetch);assert.equal(result.complete,false);assert.ok(result.results.some(r=>r.includes('Private Storage checks outstanding')));
});
test('identity acceptance fails on cross-organization rows, extra display fields or missing authorized fixture and cleans up',async()=>{
 for(const options of [{cross:true},{extraField:true},{missingFile:true}]){const f=fixture(options);await assert.rejects(runIdentityAcceptance(env(true),f.fetch));assert.ok(f.calls.some(c=>c.path==='/auth/v1/logout'));}
});
test('production config, missing accounts and arbitrary fixture paths fail before any network request',async()=>{
 let calls=0;const fetch=async()=>{calls++;throw new Error('must not run');};
 const bad=[{...env(),BARKHAUS_STAGING_PROJECT_REF:'vycwqnsjhwviryfrdwfr'},{...env(),BARKHAUS_STAGING_OWNER_B_PASSWORD:''},{...env(),BARKHAUS_STAGING_PRIVATE_FIXTURE_PATH:'1001/customer-record.pdf'}];
 for(const config of bad)await assert.rejects(runIdentityAcceptance(config,fetch));assert.equal(calls,0);
});
