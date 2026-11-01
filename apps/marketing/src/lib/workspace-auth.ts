const APP_ORIGINS = new Set(['https://app.barkhaus.io', 'http://localhost:5173']);

/** Deployment destination only, never a returnTo URL, provider or organization. */
export function workspaceAuthUrl(appUrl: string | undefined, mode: 'login' | 'signup', search = ''): string {
  if (!['login', 'signup'].includes(mode)) throw new Error('Choose sign in or sign up.');
  const configured = appUrl ?? 'https://app.barkhaus.io';
  let app: URL;
  try { app = new URL(configured); } catch { throw new Error('The workspace connection is not configured.'); }
  if (!APP_ORIGINS.has(app.origin) || ![app.origin, app.origin + '/'].includes(configured) || app.username || app.password) throw new Error('The workspace connection is not configured.');
  const destination = new URL('/' + mode, app.origin);
  if (mode === 'signup') {
    const query = new URLSearchParams(search);
    const plan = query.get('plan');
    if (query.getAll('plan').length === 1 && ['starter', 'growth', 'pro'].includes(plan ?? '')) destination.searchParams.set('plan', plan!);
    const billing = query.get('billing');
    if (query.getAll('billing').length === 1 && ['paid', 'trial'].includes(billing ?? '')) destination.searchParams.set('billing', billing!);
  }
  return destination.href;
}
