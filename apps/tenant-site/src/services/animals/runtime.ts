import { requireOrganizationAccess } from '../../lib/dashboard-auth.ts';
import { jsonResponse } from './http.ts';
import { validateAnimalWrite } from './validation.ts';

/** Deliberately fail closed until A supplies reviewed transactional persistence and
 * verified actor resolution. No in-memory fallback, anon DB client or guessed RPC.
 * Integrator replaces this gate with createAnimalHttpHandler(reviewedDependencies).
 */
export async function animalRuntime(request: Request): Promise<Response> {
  let orgId: unknown;
  try {
    if (request.method === 'GET') orgId = Number(new URL(request.url).searchParams.get('orgId'));
    else {
      const reader = request.body?.getReader();
      if (!reader) return jsonResponse({ error: 'JSON required' }, 400);
      let size = 0; const chunks: Uint8Array[] = [];
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 256000) { await reader.cancel(); return jsonResponse({ error: 'Command too large' }, 413); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      orgId = validateAnimalWrite(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))).orgId;
    }
  } catch { return jsonResponse({ error: 'Invalid animal request' }, 400); }
  const access = await requireOrganizationAccess(request, orgId, ['owner', 'admin', 'staff', 'viewer'], { 'Cache-Control': 'private, no-store', Vary: 'Authorization' });
  if ('response' in access) return access.response;
  return jsonResponse({ error: 'Animal persistence is awaiting reviewed schema and authorization integration.' }, 503);
}
