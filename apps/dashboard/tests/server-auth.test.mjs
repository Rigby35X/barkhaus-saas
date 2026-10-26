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
  return { check: exports.requireOrganizationAccess, calls: () => calls };
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
