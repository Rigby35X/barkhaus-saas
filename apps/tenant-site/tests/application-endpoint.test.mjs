import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../src/pages/api/applications.js', import.meta.url), 'utf8'))
  .replaceAll('import.meta.env.SUPABASE_SERVICE_ROLE_KEY', "'server-test-key'")
  .replaceAll('import.meta.env.PUBLIC_SUPABASE_URL', "'https://database.example.invalid'");
const { POST } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let quota = true;
let writes = [];
let calls = 0;
globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(options.headers.apikey, 'server-test-key');
  assert.equal(options.headers.Authorization, 'Bearer server-test-key');
  if (url.endsWith('/rpc/consume_application_quota')) {
    assert.match(JSON.parse(options.body).identity_hash, /^[a-f0-9]{64}$/);
    return Response.json(quota);
  }
  assert.ok(url.endsWith('/rest/v1/applications'));
  writes.push(JSON.parse(options.body));
  return new Response(null, { status: 201 });
};
const payload = { first_name: 'Test', last_name: 'Applicant', email: 'test@example.invalid',
  org_id: 999, status: 'approved', notes: 'injected', form_data: { pet: 'Test Dog' } };
const request = (origin = 'https://rescue.example.invalid', body = payload) => new Request('https://rescue.example.invalid/api/applications', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const locals = { tenant: { orgId: 41 } };
let response = await POST({ request: request('https://elsewhere.example.invalid'), locals });
assert.equal(response.status, 403);
assert.equal(calls, 0);
response = await POST({ request: request(), locals: {} });
assert.equal(response.status, 404);
assert.equal(calls, 0);
response = await POST({ request: request(), locals, clientAddress: '203.0.113.1' });
assert.equal(response.status, 201);
assert.equal(writes.length, 1);
assert.equal(writes[0].org_id, 41);
assert.equal(writes[0].status, 'new');
assert.ok(!('notes' in writes[0]));
assert.deepEqual(await response.json(), { success: true });
quota = false;
response = await POST({ request: request(), locals, clientAddress: '203.0.113.1' });
assert.equal(response.status, 429);
assert.equal(writes.length, 1, 'rate-limited request must not insert an application');
response = await POST({ request: request(undefined, { ...payload, form_data: [] }), locals });
assert.equal(response.status, 400);
assert.equal(writes.length, 1);
console.log('PASS: application endpoint enforces origin, tenant, server credentials, quota and protected fields before writing.');
