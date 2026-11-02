import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

let rows = [];
let jsonOnly = false;
let denyWrites = false;
let staleRead = false;
let writes = 0;
let missingColumnRetries = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function builder() {
  let operation = 'select';
  let payload;
  const filters = [];
  const q = {
    select() { return q; },
    eq(key, value) { filters.push([key, value]); return q; },
    insert(value) { operation = 'insert'; payload = value; return q; },
    update(value) { operation = 'update'; payload = value; return q; },
    upsert() { throw new Error('No unique constraint is installed in this test database'); },
    maybeSingle() { return execute(true, false); },
    single() { return execute(true, true); },
    then(resolve, reject) { return execute(false, false).then(resolve, reject); },
  };
  async function execute(single, required) {
    let matched = rows.filter(row => filters.every(([key, value]) => row[key] === value));
    if (operation !== 'select') {
      writes++;
      if (denyWrites) return { data: null, error: { code: '42501', message: 'permission denied' } };
      if (jsonOnly && Object.keys(payload).some(key => key.startsWith('footer_'))) {
        missingColumnRetries++;
        return { data: null, error: { code: 'PGRST204', message: "Could not find the 'footer_email' column" } };
      }
      if (operation === 'insert') {
        const row = { id: rows.length + 1, ...clone(payload) };
        rows.push(row);
        matched = [row];
      } else {
        matched.forEach(row => Object.assign(row, clone(payload)));
      }
    }
    if (single) {
      if (matched.length !== 1) return { data: null, error: required || matched.length ? new Error('Row not found or ambiguous') : null };
      const result = clone(matched[0]);
      if (staleRead && operation === 'select') result.footer_email = 'stale@example.org';
      return { data: result, error: null };
    }
    return { data: clone(matched), error: null };
  }
  return q;
}
globalThis.mockSupabase = { from(table) { assert.equal(table, 'website_content'); return builder(); } };
let source = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
source = source.replace("import { supabase } from './supabase';", 'const supabase = globalThis.mockSupabase;')
  .replace("import { getCached, setCached } from './apiCache';", 'const getCached = () => null; const setCached = () => {};');
const js = stripTypeScriptTypes(source, { mode: 'transform' });
const api = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const created = await api.saveWebsiteContentSection(9, 'homepage', 'footer', { footer_email: 'first@example.org' });
assert.equal(created.page_slug, 'global');
assert.equal(rows.length, 1);
assert.equal((await api.fetchWebsiteContent(9))[0].footer_email, 'first@example.org');
await api.saveWebsiteContentSection(9, 'global', 'footer', { footer_phone: '123' });
assert.equal(rows.length, 1, 'saving an existing footer must not create a duplicate');
assert.equal(rows[0].footer_email, 'first@example.org', 'partial edits must preserve other fields');
await api.updateWebsiteSection(created.id, { footer_phone: '' }, 9);
assert.equal((await api.fetchWebsiteContent(9))[0].footer_phone, '');

jsonOnly = true;
rows = [{ id: 10, org_id: 10, page_slug: 'global', section_key: 'footer', content: JSON.stringify({ content: { footer_email: 'original@example.org', footer_phone: '456' } }) }];
const jsonSaved = await api.updateWebsiteSection(10, { footer_email: 'new@example.org' }, 10);
assert.equal(jsonSaved.footer_email, 'new@example.org');
assert.equal(rows[0].content.footer_phone, '456');
assert.equal((await api.fetchWebsiteContent(10))[0].footer_email, 'new@example.org');
assert.equal(missingColumnRetries, 1);
await assert.rejects(api.updateWebsiteSection(10, { footer_email: 'wrong@example.org' }, 9));
assert.equal(rows[0].content.footer_email, 'new@example.org', 'wrong organization must not be updated');
assert.deepEqual(await api.fetchWebsiteContent(9), []);

denyWrites = true;
const before = writes;
await assert.rejects(api.updateWebsiteSection(10, { footer_email: 'denied@example.org' }, 10), error => error.code === '42501');
assert.equal(writes, before + 1, 'permission errors must not be retried as schema errors');
denyWrites = false;
jsonOnly = false;
rows = [{ id: 20, org_id: 20, page_slug: 'global', section_key: 'footer', footer_email: 'old@example.org' }];
staleRead = true;
await assert.rejects(api.updateWebsiteSection(20, { footer_email: 'wanted@example.org' }, 20), /could not be verified/);
console.log('PASS: create without upsert constraint, save/reload, partial edits, empty values, JSON schema compatibility, organization isolation, permission errors, and read-back mismatch.');
