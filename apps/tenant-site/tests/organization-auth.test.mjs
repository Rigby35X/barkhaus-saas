import assert from 'node:assert/strict';
import {authorizeOrganization, needsOrganizationAccess} from '../src/lib/organization-auth.js';
const env={url:'https://example.invalid',key:'test-public-key'};
const request=new Request('https://rescue.example/api/admin/animals',{headers:{Authorization:'Bearer test-token'}});
const mock=(items)=>{let calls=[];return {calls,fetch:async(url,options)=>{calls.push({url,options});let item=items.shift();if(item instanceof Error)throw item;return new Response(JSON.stringify(item?.body),{status:item?.status||200});}};};
for (const id of [undefined,0,-1,'1&org_id=eq.2','1e2','1.0','9007199254740992']) {
 const m=mock([]);assert.equal((await authorizeOrganization(request,id,env,m.fetch)).status,400);assert.equal(m.calls.length,0);
}
let m=mock([]);
assert.equal((await authorizeOrganization(new Request('https://example.invalid'),1,env,m.fetch)).status,401);
assert.equal(m.calls.length,0);
m=mock([{status:401}]);assert.equal((await authorizeOrganization(request,1,env,m.fetch)).status,401);assert.equal(m.calls.length,1);
for(const membership of [[],[{role:'member',organizations:{is_active:true}}],[{role:'owner',organizations:{is_active:false}}]]) {
 m=mock([{body:{id:'user-a'}},{body:membership}]);assert.equal((await authorizeOrganization(request,1,env,m.fetch)).status,403);
}
m=mock([{body:{id:'user-a'}},{status:500}]);assert.equal((await authorizeOrganization(request,1,env,m.fetch)).status,503);
m=mock([new Error('offline')]);assert.equal((await authorizeOrganization(request,1,env,m.fetch)).status,503);
m=mock([{body:{id:'user-a'}},{body:[{role:'owner',organizations:{is_active:true}}]}]);
const result=await authorizeOrganization(request,1,env,m.fetch);
assert.equal(result.orgId,1);assert.equal(result.userId,'user-a');assert.equal(result.headers.Authorization,'Bearer test-token');
assert.match(m.calls[1].url,/organization_id=eq.1/);assert.match(m.calls[1].url,/user_id=eq.user-a/);
assert(needsOrganizationAccess('/api/admin/animals','GET'));assert(needsOrganizationAccess('/api/upload-image','POST'));
assert(needsOrganizationAccess('/api/website-content','PUT'));assert(!needsOrganizationAccess('/api/website-content','GET'));
assert(!needsOrganizationAccess('/api/admin/animals','OPTIONS'));
console.log('PASS: verified identity, role/active-org checks, invalid scopes, fail-closed errors, caller JWT forwarding and protected route classification.');
