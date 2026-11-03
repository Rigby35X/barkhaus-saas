import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

let identity = { user: { id: 'verified-user' } };
let identityError = null;
let rows = [];
let databaseError = null;
let requestedUser = '';
let reads = 0;
globalThis.authMock = {
  auth: { getUser: async () => ({ data: identity, error: identityError }) },
  from: (table) => {
    reads++;
    assert.equal(table, 'organization_memberships');
    return { select: () => ({ eq: async (key, value) => {
      assert.equal(key, 'user_id');
      requestedUser = value;
      return { data: rows, error: databaseError };
    } }) };
  },
};
let source = await readFile(new URL('../src/lib/organizationAccess.ts', import.meta.url), 'utf8');
source = source.replace("import { supabase } from './supabase';", 'const supabase = globalThis.authMock;')
  .replace("import type { OrgConfig } from './api';", '');
const code = stripTypeScriptTypes(source, { mode: 'transform' });
const { loadOrganizationAccess, organizationAccessFromRows } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const membership = { organization_id: 9, role: 'owner', organizations: { id: 9, org: 'Mission Bay Puppy Rescue', subdomain: 'mbpr', is_active: true } };
rows = [membership];
const access = await loadOrganizationAccess('verified-user');
assert.equal(requestedUser, 'verified-user');
assert.equal(access[0].orgId, 9);
assert.equal(access[0].role, 'owner');
assert.equal(access[0].orgConfig.name, 'Mission Bay Puppy Rescue');
assert.equal(access[0].orgConfig.isAdmin, false, 'rescue owner must not become a platform admin');
assert.equal(access[0].orgConfig.accessCode, '');
assert.deepEqual(organizationAccessFromRows(null), []);
assert.deepEqual(organizationAccessFromRows([{ ...membership, organizations: null }]), []);
assert.deepEqual(organizationAccessFromRows([{ ...membership, role: 'member' }]), []);
assert.deepEqual(organizationAccessFromRows([{ ...membership, organization_id: -1 }]), []);
assert.deepEqual(organizationAccessFromRows([{ ...membership, organizations: { ...membership.organizations, id: 10 } }]), []);
assert.deepEqual(organizationAccessFromRows([{ ...membership, organizations: { ...membership.organizations, is_active: false } }]), []);
rows = [];
assert.deepEqual(await loadOrganizationAccess('verified-user'), [], 'unlinked user must not fall back to another organization');
let before = reads;
await assert.rejects(loadOrganizationAccess('different-user'), /verify your account/);
assert.equal(reads, before, 'identity mismatch must stop before reading memberships');
identityError = { message: 'expired' };
await assert.rejects(loadOrganizationAccess('verified-user'), /verify your account/);
identityError = null;
databaseError = { message: 'permission denied' };
await assert.rejects(loadOrganizationAccess('verified-user'), /Could not load/);
console.log('PASS: owner resolution, verified identity filter, no default org/admin, inactive/mismatched/missing membership rejection, and database failures.');
