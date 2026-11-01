import { requireOrganizationAccess } from '../../lib/dashboard-auth.ts';

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const reply = (error: string, status: number) => new Response(JSON.stringify({error}), {status, headers});
type Guard = typeof requireOrganizationAccess;

/** Mounted unavailable-state handler only. No database, queue, provider or
 * deployment flag can activate writes through this module. */
export function createGatedPlatformHandler(kind: 'imports' | 'connectors', guard: Guard = requireOrganizationAccess) {
  return async (request: Request): Promise<Response> => {
    if (!['GET', 'POST'].includes(request.method)) return reply('Method not allowed',405);
    let orgId: unknown;
    try {
      if (request.method === 'GET') {
        const query = new URL(request.url).searchParams;
        const value = query.get('orgId');
        if (query.getAll('orgId').length !== 1 || !value || !/^[1-9]\d*$/.test(value)) return reply('Organization required',400);
        orgId = Number(value);
      } else {
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply('JSON required',415);
        const reader = request.body?.getReader();
        if (!reader) return reply('JSON required',400);
        const parts: Uint8Array[] = []; let size = 0;
        const limit = kind === 'imports' ? 11 * 1024 * 1024 : 32768;
        while (true) {
          const part = await reader.read(); if (part.done) break;
          size += part.value.length;
          if (size > limit) { await reader.cancel(); return reply('Request exceeds byte limit',413); }
          parts.push(part.value);
        }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const part of parts) { bytes.set(part,offset); offset += part.length; }
        const body = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
        if (!body || typeof body !== 'object' || Array.isArray(body)) return reply('Invalid request',400);
        orgId = kind === 'imports' ? body.op === 'save_mapping' ? body.mapping?.orgId : body.input?.orgId ?? body.orgId : body.orgId;
      }
    } catch { return reply('Invalid request',400); }
    if (typeof orgId !== 'number' || !Number.isSafeInteger(orgId) || orgId < 1) return reply('Organization required',400);
    const roles = kind === 'imports' ? ['owner','admin','staff'] : request.method === 'GET' ? ['owner','admin','staff','viewer'] : ['owner','admin'];
    const access = await guard(request,orgId,roles,headers);
    if ('response' in access) return access.response;
    return reply(kind === 'imports' ? 'CSV imports are not available for this workspace yet.' : 'Connections are not available for this workspace yet.',503);
  };
}
