import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function guard(client, configured = true) {
  let calls = 0;
  const raw = readFileSync(new URL('../../tenant-site/src/lib/dashboard-auth.ts', import.meta.url), 'utf8');
  const source = raw.replaceAll('import.meta.env.PUBLIC_SUPABASE_URL', configured ? "'https://project.supabase.co'" : "''").replaceAll('import.meta.env.PUBLIC_SUPABASE_ANON_KEY', "'public-key'");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Response, require: () => ({ createClient: (_url, _key, options) => { calls++; assert.equal(options.auth.persistSession, false); return client; } }) });
  return { check: exports.requireOrganizationAccess, sign: exports.signPrivateAnimalDocument, calls: () => calls };
}
const request = (token = 'verified-token') => new Request('https://api.barkhaus.io/admin', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
function client(role = 'staff', valid = true, active = true) {
  const filters = [];
  const chain = { select() { return this; }, eq(k, v) { filters.push([k, v]); return this; }, async maybeSingle() { return { data: active ? { role } : null, error: null }; } };
  return {
    filters,
    auth: { getUser: async (token) => { assert.equal(token, 'verified-token'); return { data: { user: valid ? { id: 'verified-user' } : null }, error: valid ? null : new Error('invalid JWT') }; } },
    from: (table) => { assert.equal(table, 'organization_memberships'); return chain; },
  };
}

test('missing credentials and invalid organization never reach Supabase', async () => {
  const auth = guard({});
  assert.equal((await auth.check(request(null), 9, ['staff'])).response.status, 401);
  assert.equal((await auth.check(request(), '9', ['staff'])).response.status, 400);
  assert.equal(auth.calls(), 0);
});
test('expired/invalid JWT cannot authorize a paid operation', async () => {
  const auth = guard(client('owner', false));
  assert.equal((await auth.check(request(), 9, ['owner'])).response.status, 401);
});
test('active membership is checked against the validated identity and requested org', async () => {
  const sdk = client();
  const auth = guard(sdk);
  assert.ok('client' in await auth.check(request(), 9, ['staff']));
  assert.deepEqual(sdk.filters, [['user_id', 'verified-user'], ['org_id', 9], ['is_active', true]]);
});
test('viewer, revoked membership, and inadequate management role are denied', async () => {
  assert.equal((await guard(client('viewer')).check(request(), 9, ['owner', 'admin', 'staff'])).response.status, 403);
  assert.equal((await guard(client('staff', true, false)).check(request(), 9, ['staff'])).response.status, 403);
  assert.equal((await guard(client('staff')).check(request(), 9, ['owner', 'admin'])).response.status, 403);
});
test('missing project configuration fails closed', async () => {
  const auth = guard({}, false);
  assert.equal((await auth.check(request(), 9, ['staff'])).response.status, 503);
  assert.equal(auth.calls(), 0);
});

test('private document signing rechecks membership, uses private bucket and bounded expiry', async()=>{
 const sdk=client('viewer');
 sdk.storage={from(bucket){ assert.equal(bucket,'animal-private-documents');return {async createSignedUrl(path,ttl){assert.equal(path,'9/medical/file.pdf');assert.equal(ttl,60);return {data:{signedUrl:'https://fixture.test/signed'},error:null};}};}};
 const auth=guard(sdk);
 const response=await auth.sign(request(),9,'9/medical/file.pdf');
 assert.equal(response.status,200); assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal((await response.json()).expiresIn,60);
 assert.equal((await auth.sign(request(),9,'10/medical/file.pdf')).status,400);
 assert.equal((await auth.sign(request(),9,'9/../file.pdf')).status,400);
 assert.equal((await guard(client('viewer',true,false)).sign(request(),9,'9/medical/file.pdf')).status,403);
});

test('recovery redirects fixed; expired Auth session fails; password update signs out',async()=>{
 const raw=readFileSync(new URL('../src/features/identity/recovery.ts',import.meta.url),'utf8');
 const exports={};vm.runInNewContext(ts.transpileModule(raw,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,Set,crypto:globalThis.crypto,TextEncoder});
 assert.equal(exports.identityRedirect('https://app.barkhaus.io'),'https://app.barkhaus.io/?identity=recovery');
 for(const origin of ['https://app.barkhaus.io.evil.test','javascript:alert(1)','https://evil.test','https://app.barkhaus.io/path']) assert.throws(()=>exports.identityRedirect(origin));
 let updated=0, signedOut=0;
 const sdk={auth:{getUser:async()=>({data:{user:null},error:new Error('expired')}),updateUser:async()=>{updated++;return {error:null};},signOut:async()=>{signedOut++;return {error:null};}}};
 await assert.rejects(exports.finishRecovery(sdk,'long password value'),/expired/);assert.equal(updated,0);
 sdk.auth.getUser=async()=>({data:{user:{id:'verified'}},error:null});
 await assert.rejects(exports.finishRecovery(sdk,'short'),/12 characters/);
 await exports.finishRecovery(sdk,'long password value');assert.equal(updated,1);assert.equal(signedOut,1);
 let rpcCalls=0;
 const invitationClient={async rpc(name,args){rpcCalls++;assert.equal(name,'accept_organization_invitation');assert.deepEqual(Object.keys(args),['token_digest']);assert.match(args.token_digest,/^[a-f0-9]{64}$/);assert.notEqual(args.token_digest,'a'.repeat(64));return {error:null};}};
 await exports.acceptInvitation(invitationClient,'a'.repeat(64));assert.equal(rpcCalls,1);
 await assert.rejects(exports.acceptInvitation(invitationClient,'invalid'),/Invalid invitation/);assert.equal(rpcCalls,1);
});
