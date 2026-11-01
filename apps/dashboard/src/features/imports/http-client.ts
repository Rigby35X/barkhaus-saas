import type { CsvImportJob, SavedMapping } from '../../../../../shared/contracts/v1/ingestion.ts';
import type { CsvOnboardingClient, ImportRequest } from './CsvOnboarding.tsx';
import type { ImportPreview } from './csv.ts';

export interface CsvHttpClientOptions {
  /** Same-origin API path or explicit reviewed HTTPS staging API URL. */
  endpoint: string;
  accessToken(): Promise<string | null>;
  fetch?: typeof globalThis.fetch;
}
const maxResponseBytes = 16 * 1024 * 1024;
async function json(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Import service returned an invalid response');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Import service returned an invalid response');
  const parts: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.length;
    if (length > maxResponseBytes) { await reader.cancel(); throw new Error('Import response exceeds byte limit'); }
    parts.push(part.value);
  }
  const data = new Uint8Array(length); let offset = 0; for (const part of parts) { data.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); } catch { throw new Error('Import service returned an invalid response'); }
}
/** Persistent HTTP transport; browser sessions never execute an import batch. */
export function createCsvOnboardingHttpClient(options: CsvHttpClientOptions): CsvOnboardingClient {
  const endpoint = options.endpoint;
  const relative = endpoint.startsWith('/') && !endpoint.startsWith('//');
  const parsed = new URL(endpoint, 'https://barkhaus.invalid');
  const loopback = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (!relative && (!/^https?:\/\//.test(endpoint) || (parsed.protocol !== 'https:' && !loopback))) throw new Error('Import endpoint must be same-origin, HTTPS or explicit HTTP loopback');
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Import endpoint cannot contain credentials, query or fragment');
  if (endpoint !== endpoint.trim() || /[\\\r\n\t]/.test(endpoint) || (endpoint.startsWith('/') && parsed.origin !== 'https://barkhaus.invalid')) throw new Error('Import endpoint must use a reviewed origin');
  const send = async <T>(operation: string, values: Record<string, unknown>, get = false): Promise<T> => {
    const token = await options.accessToken();
    if (!token || /[\r\n]/.test(token)) throw new Error('Please sign in to use imports');
    const query = get ? '?' + new URLSearchParams({ op: operation, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])) }) : '';
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(endpoint + query, {
        method: get ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, ...(!get ? { 'Content-Type': 'application/json' } : {}) },
        ...(get ? {} : { body: JSON.stringify({ op: operation, ...values }) }),
        cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(30000),
      });
    } catch { throw new Error('Import service could not be reached; recover using the same request ID'); }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const message = response.status === 401 ? 'Please sign in again' : response.status === 403 ? 'You do not have import access' : response.status === 400 ? 'Review the CSV, mapping and matching decisions' : response.status === 409 ? 'Request ID is already used with different input; preview a new reviewed import' : response.status === 413 ? 'Import exceeds the request byte limit' : response.status === 503 ? 'Import service is not available yet' : 'Import request failed; recover using the same request ID';
      throw new Error(message);
    }
    return await json(response) as T;
  };
  return {
    behavior: 'persistent',
    listMappings: orgId => send<SavedMapping[]>('mappings', { orgId }, true),
    saveMapping: async mapping => { await send('save_mapping', { mapping }); },
    preview: (input: ImportRequest, source: string) => send<ImportPreview>('preview', { input, source }),
    start: (input: ImportRequest, source: string) => send<CsvImportJob>('start', { input, source }),
    job: (orgId, jobId) => send<CsvImportJob>('job', { orgId, jobId }, true),
    retry: (orgId, jobId) => send<CsvImportJob>('retry', { orgId, jobId }),
  };
}
