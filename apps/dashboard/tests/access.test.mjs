import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { selectOrganization, isOrganizationRole, canManageOrganization, toOrgConfig } from '../src/lib/access.ts';

const org = (orgId, role = 'staff') => ({ orgId, role, orgConfig: toOrgConfig({ org: `Rescue ${orgId}` }) });

test('stored preference cannot grant access to an unknown organization', () => {
  assert.equal(selectOrganization([org(9)], 8)?.orgId, 9);
  assert.equal(selectOrganization([], 8), null);
  assert.equal(selectOrganization([org(9), org(10)], 10)?.orgId, 10);
});

test('roles and organization configs do not adopt legacy access codes/admin flags', () => {
  assert.equal(isOrganizationRole('super_admin'), false);
  assert.equal(canManageOrganization('viewer'), false);
  assert.equal(canManageOrganization('staff'), false);
  assert.equal(canManageOrganization('admin'), true);
  const config = toOrgConfig({ id: 12, org: 'New Rescue', isAdmin: true, accessCode: 'fake', role: 'owner' });
  assert.equal(config.name, 'New Rescue');
  assert.equal('isAdmin' in config, false);
  assert.equal('accessCode' in config, false);
});

function authModule(client) {
  const source = readFileSync(new URL('../src/lib/auth.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const storage = new Map([['barkhausAdminSession', '{"orgId":8}'], ['barkhausAuthToken', 'legacy']]);
  let cleanedUrl = '';
  vm.runInNewContext(code, {
    exports,
    require: (id) => {
      if (id === './supabase') return { supabase: client };
      if (id === './apiCache') return { clearCache() {} };
      if (id === './access') return { isOrganizationRole, toOrgConfig };
      throw new Error(`Unexpected dependency: ${id}`);
    },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) },
    URL,
    window: { location: { href: 'https://app.barkhaus.io/?token=legacy&view=animals#section' }, history: { replaceState: (_state, _unused, url) => { cleanedUrl = url; } } },
  });
  return { exports, storage, cleanedUrl: () => cleanedUrl };
}

test('legacy token/session are discarded; unrelated URL state is retained', () => {
  const module = authModule({});
  module.exports.clearLegacySession();
  assert.equal(module.storage.has('barkhausAdminSession'), false);
  assert.equal(module.storage.has('barkhausAuthToken'), false);
  assert.equal(module.cleanedUrl(), '/?view=animals#section');
});

test('invalid Auth user blocks memberships even with a stored legacy session', async () => {
  const module = authModule({ auth: { getUser: async () => ({ data: { user: null }, error: new Error('expired') }) }, from: () => { throw new Error('must not query'); } });
  await assert.rejects(module.exports.loadOrganizationAccess(), /expired/);
});

test('membership queries use validated user ID and active status; unknown roles are rejected', async () => {
  const filters = [];
  const rows = [
    { org_id: 9, role: 'viewer', organizations: { org: 'Rescue Nine' } },
    { org_id: 10, role: 'super_admin', organizations: { org: 'Forbidden' } },
  ];
  const chain = { select() { return this; }, eq(k, v) { filters.push([k, v]); return this; }, async order() { return { data: rows, error: null }; } };
  const module = authModule({ auth: { getUser: async () => ({ data: { user: { id: 'verified-user' } }, error: null }) }, from: (table) => { assert.equal(table, 'organization_memberships'); return chain; } });
  const access = await module.exports.loadOrganizationAccess();
  assert.deepEqual(filters, [['user_id', 'verified-user'], ['is_active', true]]);
  assert.equal(access.length, 1);
  assert.equal(access[0].orgId, 9);
  assert.equal(access[0].role, 'viewer');
});

test('membership database errors fail closed without a default admin fallback', async () => {
  const chain = { select() { return this; }, eq() { return this; }, async order() { return { data: null, error: new Error('missing table') }; } };
  const module = authModule({ auth: { getUser: async () => ({ data: { user: { id: 'verified' } }, error: null }) }, from: () => chain });
  await assert.rejects(module.exports.loadOrganizationAccess(), /could not load/);
});
