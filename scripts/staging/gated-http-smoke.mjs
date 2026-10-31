import { pathToFileURL } from 'node:url';
import { validateStagingConfig } from './config.mjs';

/** Explicit operator command only. Auth sign-ins plus read-only GETs; no animal writes, remote SQL or migrations. */
export async function runGatedSmoke(env = process.env, fetchImpl = globalThis.fetch) {
  const config = validateStagingConfig(env);
  const results = [];
  async function get(label, orgId, expected, token) {
    let response;
    try {
      response = await fetchImpl(`${config.tenantOrigin}/api/v1/animals?orgId=${orgId}`, {
        method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {},
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
    } catch { throw new Error(`${label}: request failed; inspect staging access locally.`); }
    await response.body?.cancel().catch(() => {});
    if (response.status !== expected) throw new Error(`${label}: expected HTTP ${expected}, received ${response.status}.`);
    results.push(`${label}: HTTP ${expected}`);
  }
  await get('Unauthenticated organization A', 1001, 401);
  if (!Object.keys(config.accounts).length) {
    results.push('Authenticated checks outstanding: configure all three synthetic smoke accounts.');
    return { complete: false, results };
  }
  async function signIn(role) {
    let response, data;
    try {
      response = await fetchImpl(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(config.accounts[role]), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (response.ok) data = await response.json();
      else await response.body?.cancel().catch(() => {});
    } catch { throw new Error(`${role}: synthetic sign-in failed; inspect staging Auth locally.`); }
    if (!response.ok || typeof data?.access_token !== 'string' || !data.access_token) throw new Error(`${role}: synthetic sign-in failed; inspect staging Auth locally.`);
    return data.access_token;
  }
  const owner = await signIn('OWNER_A');
  const viewer = await signIn('VIEWER_A');
  const revoked = await signIn('REVOKED_A');
  await get('Owner organization A gate', 1001, 503, owner);
  await get('Viewer organization A gate', 1001, 503, viewer);
  await get('Owner cross-organization denial', 1002, 403, owner);
  await get('Revoked membership denial', 1001, 403, revoked);
  return { complete: true, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { complete, results } = await runGatedSmoke();
    console.log(results.join('\n'));
    if (!complete) process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
