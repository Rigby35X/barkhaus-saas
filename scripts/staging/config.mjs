export const PRODUCTION_REF = 'vycwqnsjhwviryfrdwfr';

function required(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !value || value !== value.trim()) throw new Error(`${name} is required without surrounding whitespace.`);
  return value;
}

function origin(env, name, localPort) {
  const value = required(env, name);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an origin.`); }
  if (url.origin !== value || url.username || url.password) throw new Error(`${name} must be an origin without path, credentials or query.`);
  const host = url.hostname.toLowerCase();
  if (['barkhaus.io', 'barkhaus.com', 'barkhaus.app'].some(domain => host === domain || host.endsWith(`.${domain}`)) || host === 'barkhaus-admin.vercel.app') {
    throw new Error(`${name} must exclude BarkHaus production domains.`);
  }
  if (value !== `http://localhost:${localPort}` && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(host))) {
    throw new Error(`${name} requires HTTPS staging or http://localhost:${localPort}.`);
  }
  return value;
}

function publicKey(value, ref, name) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return value;
  let claims;
  try {
    const parts = value.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { throw new Error(`${name} must be a public publishable key or anon JWT.`); }
  if (claims.role !== 'anon' || claims.ref !== ref) throw new Error(`${name} must be an anon JWT for the explicit staging project.`);
  return value;
}

/** Local validation only. Never log the returned object: it contains public keys and optional synthetic passwords. */
export function validateStagingConfig(env = process.env) {
  const ref = required(env, 'BARKHAUS_STAGING_PROJECT_REF');
  if (!/^[a-z]{20}$/.test(ref) || ref === PRODUCTION_REF) throw new Error('BARKHAUS_STAGING_PROJECT_REF must identify a separate staging project.');
  if (required(env, 'BARKHAUS_STAGING_RUNTIME_MODE') !== 'gated') throw new Error('BARKHAUS_STAGING_RUNTIME_MODE must remain gated. This check does not enable persistence.');
  const supabaseUrl = `https://${ref}.supabase.co`;
  for (const name of ['VITE_SUPABASE_URL', 'PUBLIC_SUPABASE_URL']) {
    if (required(env, name) !== supabaseUrl) throw new Error(`${name} must exactly match the explicit staging project URL.`);
  }
  const anonKey = publicKey(required(env, 'PUBLIC_SUPABASE_ANON_KEY'), ref, 'PUBLIC_SUPABASE_ANON_KEY');
  const dashboardKey = publicKey(required(env, 'VITE_SUPABASE_ANON_KEY'), ref, 'VITE_SUPABASE_ANON_KEY');
  if (dashboardKey !== anonKey) throw new Error('Dashboard and tenant public keys must match.');
  const dashboardOrigin = origin(env, 'BARKHAUS_STAGING_APP_ORIGIN', 5173);
  const tenantOrigin = origin(env, 'BARKHAUS_STAGING_API_ORIGIN', 4321);
  const platformOrigin = env.VITE_PLATFORM_API_ORIGIN;
  if (platformOrigin && ![dashboardOrigin, tenantOrigin].includes(platformOrigin)) throw new Error('VITE_PLATFORM_API_ORIGIN must match a validated staging application or API origin.');
  const accounts = {};
  const roles = ['OWNER_A', 'VIEWER_A', 'REVOKED_A'];
  const hasAccount = roles.some(role => ['EMAIL', 'PASSWORD'].some(field => Boolean(env[`BARKHAUS_STAGING_${role}_${field}`])));
  if (hasAccount) {
    for (const role of roles) {
      const email = required(env, `BARKHAUS_STAGING_${role}_EMAIL`);
      const password = required(env, `BARKHAUS_STAGING_${role}_PASSWORD`);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`BARKHAUS_STAGING_${role}_EMAIL must be a synthetic account email.`);
      accounts[role] = { email, password };
    }
    if (new Set(Object.values(accounts).map(account => account.email.toLowerCase())).size !== roles.length) throw new Error('Synthetic smoke accounts must be distinct.');
  }
  return { ref, supabaseUrl, anonKey, dashboardOrigin, tenantOrigin, mode: 'gated', accounts };
}
