export type PlatformResource = 'animals' | 'imports' | 'connectors';

/** Explicit API origin only; never infer a provider or tenant from legacy rows. */
export function resolvePlatformApiUrl(origin: unknown, resource: PlatformResource): string {
  if (typeof origin !== 'string' || !origin) throw new Error('Your animal workspace is not available yet. Please contact your administrator.');
  let url: URL;
  try { url = new URL(origin); } catch { throw new Error('The workspace connection is not configured correctly.'); }
  if (url.origin !== origin || url.username || url.password || url.search || url.hash ||
      !['animals', 'imports', 'connectors'].includes(resource)) throw new Error('The workspace connection is not configured correctly.');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('The workspace requires a secure connection.');
  return new URL(`/api/v1/${resource}`, origin).href;
}

export function getPlatformApiUrl(resource: PlatformResource): string {
  return resolvePlatformApiUrl(import.meta.env.VITE_PLATFORM_API_ORIGIN, resource);
}
