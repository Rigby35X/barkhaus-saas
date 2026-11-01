import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspaceRoute, workspacePath } from '../src/lib/routes.ts';

const mbpr = { orgId: 9, role: 'staff', orgConfig: { subdomain: 'mbpr' } };
test('deep links resolve their organization and tab from current membership', () => {
  const result = resolveWorkspaceRoute('/mbpr/animals', [mbpr]);
  assert.equal(result.kind, 'workspace');
  assert.equal(result.organization, mbpr);
  assert.equal(result.tab, 'animals');
  assert.equal(workspacePath(mbpr, 'applications'), '/mbpr/applications');
  assert.equal(resolveWorkspaceRoute('/mbpr', [mbpr]).tab, 'overview');
});
test('unknown, revoked and ambiguous organization paths fail closed', () => {
  assert.equal(resolveWorkspaceRoute('/other/animals', [mbpr]).kind, 'denied');
  assert.equal(resolveWorkspaceRoute('/mbpr/animals', []).kind, 'denied');
  assert.equal(resolveWorkspaceRoute('/mbpr/animals', [mbpr, { ...mbpr, orgId: 10 }]).kind, 'denied');
});
test('unknown pages are not silently rendered as the overview', () => {
  assert.equal(resolveWorkspaceRoute('/mbpr/unknown', [mbpr]).kind, 'missing');
  assert.equal(resolveWorkspaceRoute('/mbpr/animals/extra', [mbpr]).kind, 'missing');
  assert.equal(resolveWorkspaceRoute('/login', [mbpr]).kind, 'entry');
});
test('organizations without a valid slug get a stable id route', () => {
  const org = { ...mbpr, orgConfig: { subdomain: 'invalid/path' } };
  assert.equal(workspacePath(org, 'overview'), '/org-9/overview');
  assert.equal(resolveWorkspaceRoute('/org-9/animals', [org]).organization, org);
});


test('login, signup and callback paths are entry routes rather than customer organizations', () => {
  for (const path of ['/login','/login/','/signup','/signup/','/auth/callback','/auth/callback/']) assert.equal(resolveWorkspaceRoute(path,[mbpr]).kind,'entry');
  for (const slug of ['login','signup','auth','dashboard']) {
    const organization={...mbpr,orgId:12,orgConfig:{subdomain:slug}};
    assert.equal(workspacePath(organization,'animals'),'/org-12/animals');
  }
});
