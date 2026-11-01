import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStagingConfig, PRODUCTION_REF } from '../../../../scripts/staging/config.mjs';
import { checkConfig } from '../../../../scripts/staging/check-config.mjs';
import { runGatedSmoke } from '../../../../scripts/staging/gated-http-smoke.mjs';

const ref = 'abcdefghijklmnopqrst';
const jwt = claims => `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
function env() {
  const key = jwt({ role: 'anon', ref });
  return {
    BARKHAUS_STAGING_PROJECT_REF: ref, BARKHAUS_STAGING_RUNTIME_MODE: 'gated',
    BARKHAUS_STAGING_APP_ORIGIN: 'http://localhost:5173', BARKHAUS_STAGING_API_ORIGIN: 'http://localhost:4321',
    VITE_SUPABASE_URL: `https://${ref}.supabase.co`, PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    VITE_SUPABASE_ANON_KEY: key, PUBLIC_SUPABASE_ANON_KEY: key,
  };
}
function withAccounts() {
  const config = env();
  for (const role of ['OWNER_A', 'VIEWER_A', 'REVOKED_A']) {
    config[`BARKHAUS_STAGING_${role}_EMAIL`] = `${role.toLowerCase()}@example.test`;
    config[`BARKHAUS_STAGING_${role}_PASSWORD`] = `synthetic-only-${role}`;
  }
  return config;
}

test('validates isolated staging configuration locally, with anon or publishable keys', () => {
  assert.equal(validateStagingConfig(env()).mode, 'gated');
  assert.equal(validateStagingConfig({...env(),VITE_PLATFORM_API_ORIGIN:'http://localhost:5173'}).mode,'gated');
  assert.match(checkConfig(env()), /No network requests/);
  const publishable = { ...env(), VITE_SUPABASE_ANON_KEY: 'sb_publishable_public_test', PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_public_test' };
  assert.equal(validateStagingConfig(publishable).anonKey, publishable.PUBLIC_SUPABASE_ANON_KEY);
  assert.equal(validateStagingConfig({ ...env(), BARKHAUS_STAGING_OWNER_A_EMAIL: '', BARKHAUS_STAGING_OWNER_A_PASSWORD: '' }).accounts.OWNER_A, undefined);
});

test('rejects production refs, mismatched URLs, missing keys, privileged keys and enabled runtime', () => {
  const cases = [
    { VITE_PLATFORM_API_ORIGIN: 'https://app.barkhaus.io' },
    { BARKHAUS_STAGING_PROJECT_REF: PRODUCTION_REF },
    { BARKHAUS_STAGING_PROJECT_REF: '' },
    { PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` },
    { VITE_SUPABASE_URL: `https://${ref}.supabase.co/` },
    { PUBLIC_SUPABASE_ANON_KEY: '' },
    { PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'service_role', ref }) },
    { PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: PRODUCTION_REF }) },
    { PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_DO_NOT_LOG' },
    { VITE_SUPABASE_ANON_KEY: 'sb_publishable_different' },
    { BARKHAUS_STAGING_RUNTIME_MODE: 'enabled' },
  ];
  for (const change of cases) assert.throws(() => validateStagingConfig({ ...env(), ...change }));
  try { validateStagingConfig({ ...env(), PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_DO_NOT_LOG' }); }
  catch (error) { assert.ok(!error.message.includes('DO_NOT_LOG')); }
});

test('origins permit local designated ports or HTTPS staging while rejecting production and URL tricks', () => {
  validateStagingConfig({ ...env(), BARKHAUS_STAGING_APP_ORIGIN: 'https://barkhaus-staging.example.test', BARKHAUS_STAGING_API_ORIGIN: 'https://staging-api.example.test' });
  for (const origin of ['http://localhost:4321', 'http://evil.test', 'https://app.barkhaus.io', 'https://mbpr.barkhaus.io', 'https://barkhaus.com', 'https://barkhaus-admin.vercel.app', 'https://api.example.test/path', 'https://user:pass@api.example.test', 'https://api.example.test?secret=1', 'https://localhost']) {
    assert.throws(() => validateStagingConfig({ ...env(), BARKHAUS_STAGING_APP_ORIGIN: origin }));
  }
});

test('requires complete distinct synthetic accounts when optional sign-in is configured', () => {
  assert.throws(() => validateStagingConfig({ ...env(), BARKHAUS_STAGING_OWNER_A_EMAIL: 'owner@example.test' }));
  assert.throws(() => validateStagingConfig({ ...withAccounts(), BARKHAUS_STAGING_VIEWER_A_EMAIL: 'owner_a@example.test' }));
  assert.equal(Object.keys(validateStagingConfig(withAccounts()).accounts).length, 3);
});

test('HTTP smoke checks exact gated/authorization responses with no animal mutations or secret output', async () => {
  const calls = [];
  const mock = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'error');
    if (url.includes('/auth/v1/token')) {
      assert.equal(options.method, 'POST');
      const account = JSON.parse(options.body);
      return Response.json({ access_token: `${account.email}-SECRET_TOKEN` });
    }
    assert.equal(options.method, 'GET');
    const authorization = options.headers.Authorization;
    const status = !authorization ? 401 : url.endsWith('1002') || authorization.includes('revoked_a') ? 403 : 503;
    return new Response('body must never be printed', { status });
  };
  const result = await runGatedSmoke(withAccounts(), mock);
  assert.equal(result.complete, true);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 3);
  assert.equal(calls.filter(call => call.options.method === 'GET').length, 5);
  assert.ok(!JSON.stringify(result).includes('SECRET_TOKEN'));
  assert.ok(!JSON.stringify(result).includes('synthetic-only'));
});

test('HTTP smoke reports incomplete authenticated checks and rejects ungated responses or redirects', async () => {
  const partial = await runGatedSmoke(env(), async () => new Response(null, { status: 401 }));
  assert.equal(partial.complete, false);
  await assert.rejects(() => runGatedSmoke(withAccounts(), async () => new Response(null, { status: 200 })), /expected HTTP 401/);
  await assert.rejects(() => runGatedSmoke(withAccounts(), async (url, options) => {
    if (options.method === 'POST') return Response.json({ access_token: 'synthetic-token' });
    return new Response(null, { status: options.headers.Authorization ? 200 : 401 });
  }), /expected HTTP 503, received 200/);
  await assert.rejects(() => runGatedSmoke(env(), async () => { throw new Error('secret network detail'); }), error => !error.message.includes('secret network detail'));
  let calls = 0;
  await assert.rejects(() => runGatedSmoke({ ...env(), BARKHAUS_STAGING_PROJECT_REF: PRODUCTION_REF }, async () => { calls++; }), /separate staging/);
  assert.equal(calls, 0);
});
