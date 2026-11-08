// Verify identity with Supabase Auth; never authorize from decoded JWT claims alone.
export async function authorizeOrganization(request, orgId, env, fetcher = fetch) {
  const raw = String(orgId ?? '');
  if (!/^[1-9][0-9]*$/.test(raw) || !Number.isSafeInteger(Number(raw)))
    return { error: 'A valid organization is required.', status: 400 };
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer [^\s]+$/i.test(authorization)) return { error: 'Please sign in.', status: 401 };
  if (!env.url || !env.key) return { error: 'Authentication is not configured.', status: 503 };
  const headers = { apikey: env.key, Authorization: authorization };
  try {
    const identity = await fetcher(`${env.url}/auth/v1/user`, { headers });
    if (!identity.ok) return { error: 'Please sign in again.', status: identity.status >= 500 ? 503 : 401 };
    const user = await identity.json();
    if (!user.id) return { error: 'Please sign in again.', status: 401 };
    const query = new URLSearchParams({select: 'role,organizations!inner(is_active)',
      organization_id: `eq.${raw}`, user_id: `eq.${user.id}`});
    const membership = await fetcher(`${env.url}/rest/v1/organization_memberships?${query}`, { headers });
    if (!membership.ok) return { error: 'Could not verify access.', status: 503 };
    const rows = await membership.json();
    const row = rows.find(m => ['owner','admin'].includes(m.role) && m.organizations?.is_active === true);
    if (!row) return { error: 'You do not have management access to this organization.', status: 403 };
    return { orgId: Number(raw), userId: user.id, headers: {...headers, 'Content-Type':'application/json', Prefer:'return=representation'} };
  } catch { return { error: 'Could not verify access.', status: 503 }; }
}

export function needsOrganizationAccess(path, method) {
  if (method === 'OPTIONS') return false;
  return path.startsWith('/api/admin/') || path.startsWith('/api/gmail/') ||
    path.startsWith('/api/integrations/') || path === '/api/upload-image' ||
    ['/api/auth/paragon-token','/api/auth/user-token','/api/auth/access-token'].includes(path) ||
    (['/api/website-content','/api/client-data'].includes(path) && method !== 'GET');
}
