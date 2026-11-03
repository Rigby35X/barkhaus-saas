import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('exported UI renders fixture disclosure, photo boundary, server queue flow and viewer permissions', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'barkhaus-import-ui-'));
  try {
    const outfile = join(temp, 'ui.cjs');
    await build({ stdin: { contents: `import { createElement } from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { CsvOnboarding } from './apps/dashboard/src/features/imports/index.ts'; export const render = props => renderToStaticMarkup(createElement(CsvOnboarding, props));`, resolveDir: process.cwd(), loader: 'tsx' }, outfile, jsx: 'automatic', bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
    const { render } = (await import(pathToFileURL(outfile).href)).default;
    const html = render({ orgId: 1001, canImport: false, client: { behavior: 'fixture' } });
    assert.match(html, /Fixture mode: synthetic data only; nothing is persisted/);
    assert.match(html, /Photo URL imports are disabled/);
    assert.match(html, /View-only access/); assert.match(html, /<fieldset disabled=""/);
    assert.match(html, /Preview without writes/); assert.match(html, /Create-only/);
    const writable = render({ orgId: 1002, canImport: true, client: { behavior: 'persistent' } });
    assert.doesNotMatch(writable, /<fieldset disabled=""/); assert.match(writable, /Server import service/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
