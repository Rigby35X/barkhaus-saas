import type { WriteActor } from '../../../../../shared/contracts/v1/ingestion.ts';
import { AnimalWriteService } from './AnimalWriteService.ts';
import { InvalidAnimalInput, positive, text, validateAnimalWrite } from './validation.ts';

export interface AnimalHttpDependencies {
  service: AnimalWriteService;
  /** A's verified bearer identity resolver. Never deserialize an actor from the body. */
  authenticate(request: Request, orgId: number): Promise<WriteActor | null>;
}
export const privateHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
export function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: privateHeaders }); }
const codes = { forbidden: 403, conflict: 409, invalid: 400, not_found: 404 };
export function createAnimalHttpHandler(deps: AnimalHttpDependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return jsonResponse({ error: 'JSON required' }, 415);
        // Bound streamed bytes, not just Content-Length supplied by the caller.
        const reader = request.body?.getReader();
        if (!reader) return jsonResponse({ error: 'JSON required' }, 400);
        let size = 0; const chunks: Uint8Array[] = [];
        while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 256000) { await reader.cancel(); return jsonResponse({ error: 'Command too large' }, 413); } chunks.push(part.value); }
        const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        let command;
        try { command = validateAnimalWrite(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))); }
        catch { return jsonResponse({ error: 'Invalid animal command' }, 400); }
        const actor = await deps.authenticate(request, command.orgId);
        if (!actor) return jsonResponse({ error: 'forbidden' }, 403);
        // HTTP is member-only. Trusted workers call the shared service server-to-server.
        if (actor.kind !== 'member' || command.kind === 'source_upsert' || (command.kind === 'create_native' && command.csvOrigin)) return jsonResponse({ error: 'forbidden' }, 403);
        const result = await deps.service.execute(actor, command);
        return jsonResponse(result, result.ok ? 200 : codes[result.code]);
      }
      if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
      const u = new URL(request.url);
      const rawOrg = u.searchParams.get('orgId');
      if (!rawOrg || !/^[1-9]\d*$/.test(rawOrg)) return jsonResponse({ error: 'Organization required' }, 400);
      const orgId = Number(rawOrg); positive(orgId);
      const actor = await deps.authenticate(request, orgId);
      if (!actor || actor.kind !== 'member') return jsonResponse({ error: 'forbidden' }, 403);
      // JSON encoded ID preserves numeric vs string identity exactly.
      const rawId = u.searchParams.get('animalId');
      const id = rawId === null ? undefined : JSON.parse(rawId);
      const documentId = u.searchParams.get('documentId');
      if (documentId !== null) {
        if (id === undefined) return jsonResponse({ error: 'Animal required' }, 400);
        text(documentId, true, 200);
        const access = await deps.service.document(actor, orgId, id, documentId);
        return access ? jsonResponse(access) : jsonResponse({ error: 'not_found' }, 404);
      }
      const result = await deps.service.read(actor, orgId, id);
      return result === null ? jsonResponse({ error: 'not_found' }, 404) : jsonResponse(result);
    } catch (e) {
      if (e instanceof InvalidAnimalInput || e instanceof SyntaxError) return jsonResponse({ error: 'Invalid animal request' }, 400);
      // Never expose DB/provider errors, private values or credentials.
      return jsonResponse({ error: 'Animal service unavailable' }, 503);
    }
  };
}
