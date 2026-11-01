import { pathToFileURL } from 'node:url';
import { validateStagingConfig } from './config.mjs';

const roles = { OWNER_A: [1001, 'owner'], STAFF_A: [1001, 'staff'], VIEWER_A: [1001, 'viewer'], REVOKED_A: [1001, null], OWNER_B: [1002, 'owner'] };
const fixturePath = '1001/acceptance/identity-fixture.txt';
const displayFields = new Set(['org', 'logo_dark_url', 'primary_color', 'secondary_color', 'contact_email', 'email', 'phone', 'address', 'facebook_url', 'instagram_url', 'twitter_url', 'subdomain', 'website']);
const denied = new Set([400, 401, 403, 404]);

/** Operator-invoked only after approved staging schema/seed setup. No migration,
 * provisioning, customer records, file upload or password changes. Never log env,
 * request bodies, tokens, signed URLs, response bodies or account identities. */
export async function runIdentityAcceptance(env = process.env, fetchImpl = globalThis.fetch) {
  const config = validateStagingConfig(env);
  const accounts = {};
  for (const role of Object.keys(roles)) {
    const email = env[`BARKHAUS_STAGING_${role}_EMAIL`];
    const password = env[`BARKHAUS_STAGING_${role}_PASSWORD`];
    if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || typeof password !== 'string' || !password) throw new Error(`${role}: configure the synthetic account privately before running acceptance.`);
    accounts[role] = { email, password };
  }
  if (new Set(Object.values(accounts).map(a => a.email.toLowerCase())).size !== 5) throw new Error('Five distinct synthetic staging accounts are required.');
  const storage = env.BARKHAUS_STAGING_PRIVATE_FIXTURE_PATH;
  if (storage && storage !== fixturePath) throw new Error('Private Storage acceptance accepts only the designated synthetic fixture path.');
  const sessions = new Map();
  const results = [];
  async function request(label, path, method = 'GET', token, body) {
    let response;
    try {
      response = await fetchImpl(`${config.supabaseUrl}${path}`, {
        method, headers: { apikey: config.anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
    } catch { throw new Error(`${label}: request failed; inspect staging access locally.`); }
    return response;
  }
  async function json(label, response) {
    if (!response.ok) { await response.body?.cancel().catch(() => {}); throw new Error(`${label}: expected successful staging response, received HTTP ${response.status}.`); }
    try { return await response.json(); } catch { throw new Error(`${label}: malformed staging response.`); }
  }
  async function requireDenied(label, response) {
    await response.body?.cancel().catch(() => {});
    if (!denied.has(response.status)) throw new Error(`${label}: expected access denial, received HTTP ${response.status}.`);
    results.push(`${label}: denied`);
  }
  try {
    await requireDenied('Anonymous membership table', await request('Anonymous membership table', '/rest/v1/organization_memberships?select=user_id&limit=1'));
    await requireDenied('Anonymous organization RPC', await request('Anonymous organization RPC', '/rest/v1/rpc/my_organization_access', 'POST', undefined, {}));
    for (const [role, [orgId, expectedRole]] of Object.entries(roles)) {
      const signedIn = await json(role, await request(role, '/auth/v1/token?grant_type=password', 'POST', undefined, accounts[role]));
      if (typeof signedIn.access_token !== 'string' || !signedIn.access_token) throw new Error(`${role}: synthetic sign-in did not provide a session.`);
      sessions.set(role, signedIn.access_token);
      const user = await json(`${role} verified identity`, await request(role, '/auth/v1/user', 'GET', signedIn.access_token));
      if (typeof user.id !== 'string' || !user.id) throw new Error(`${role}: verified synthetic identity missing.`);
      const choices = await json(`${role} organization RPC`, await request(role, '/rest/v1/rpc/my_organization_access', 'POST', signedIn.access_token, {}));
      if (!Array.isArray(choices) || choices.length !== (expectedRole ? 1 : 0)) throw new Error(`${role}: unexpected organization access.`);
      if (expectedRole) {
        const choice = choices[0];
        if (choice.org_id !== orgId || choice.role !== expectedRole || !choice.organizations || typeof choice.organizations !== 'object' || Array.isArray(choice.organizations) || Object.keys(choice.organizations).some(key => !displayFields.has(key))) throw new Error(`${role}: incorrect organization or display-field boundary.`);
      }
      const memberships = await json(`${role} membership RLS`, await request(role, '/rest/v1/organization_memberships?select=user_id,org_id,role&order=org_id', 'GET', signedIn.access_token));
      if (!Array.isArray(memberships) || memberships.length !== (expectedRole ? 1 : 0) || memberships.some(row => row.user_id !== user.id || row.org_id !== orgId || row.role !== expectedRole)) throw new Error(`${role}: membership isolation failed.`);
      const otherOrg = orgId === 1001 ? 1002 : 1001;
      const cross = await json(`${role} cross-organization RLS`, await request(role, `/rest/v1/organization_memberships?select=org_id&org_id=eq.${otherOrg}`, 'GET', signedIn.access_token));
      if (!Array.isArray(cross) || cross.length) throw new Error(`${role}: cross-organization membership was visible.`);
      results.push(`${role}: verified role, organization and membership isolation`);
    }
    if (storage) {
      const signPath = `/storage/v1/object/sign/animal-private-documents/${fixturePath}`;
      for (const role of ['OWNER_A', 'VIEWER_A']) {
        const signed = await json(`${role} private fixture signing`, await request(role, signPath, 'POST', sessions.get(role), { expiresIn: 60 }));
        const raw = signed.signedURL ?? signed.signedUrl;
        if (typeof raw !== 'string') throw new Error(`${role}: private fixture signing failed.`);
        let url;
        try { url = new URL(raw.startsWith('/object/') ? `/storage/v1${raw}` : raw, config.supabaseUrl); } catch { throw new Error(`${role}: invalid signed fixture URL.`); }
        if (url.origin !== config.supabaseUrl || url.pathname !== signPath || !url.searchParams.get('token')) throw new Error(`${role}: signed fixture URL left staging scope.`);
        let read;
        try { read = await fetchImpl(url.href, { method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) }); } catch { throw new Error(`${role}: signed synthetic fixture read failed.`); }
        await read.body?.cancel().catch(() => {});
        if (!read.ok) throw new Error(`${role}: authorized synthetic fixture is missing or inaccessible.`);
        results.push(`${role}: private synthetic fixture signed/read`);
      }
      for (const role of ['OWNER_B', 'REVOKED_A']) await requireDenied(`${role} private fixture`, await request(role, signPath, 'POST', sessions.get(role), { expiresIn: 60 }));
      await requireDenied('Anonymous private fixture signing', await request('Anonymous private fixture', signPath, 'POST', undefined, { expiresIn: 60 }));
      await requireDenied('Public private-fixture URL', await request('Public private-fixture URL', `/storage/v1/object/public/animal-private-documents/${fixturePath}`));
    } else results.push('Private Storage checks outstanding: provision the approved synthetic fixture separately before configuring its path.');
    results.push('Recovery/invitation email delivery, token expiry/reuse and signed-URL expiry remain separate hosted checks.');
    return { complete: Boolean(storage), results };
  } finally {
    let failed = false;
    for (const token of sessions.values()) {
      try {
        const response = await request('Synthetic session cleanup', '/auth/v1/logout?scope=local', 'POST', token);
        await response.body?.cancel().catch(() => {});
        if (!response.ok) failed = true;
      } catch { failed = true; }
    }
    if (failed) throw new Error('Synthetic session cleanup failed; sign out the staging test accounts locally.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { complete, results } = await runIdentityAcceptance();
    console.log(results.join('\n'));
    if (!complete) process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
