import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AccessResult = { client: SupabaseClient } | { response: Response };

/** Verify identity and active membership before any paid/admin server operation. */
export async function requireOrganizationAccess(
  request: Request,
  orgId: unknown,
  roles: string[],
  headers: Record<string, string> = {},
): Promise<AccessResult> {
  const denied = (status: number, error: string): AccessResult => ({
    response: new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', ...headers } }),
  });
  if (typeof orgId !== 'number' || !Number.isSafeInteger(orgId) || orgId <= 0) return denied(400, 'A valid organization is required.');
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ') || authorization.length <= 7) return denied(401, 'Please sign in.');
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return denied(503, 'Authentication is not configured.');
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) return denied(401, 'Please sign in again.');
    const { data: membership, error: membershipError } = await client.from('organization_memberships')
      .select('role').eq('user_id', data.user.id).eq('org_id', orgId).eq('is_active', true).maybeSingle();
    if (membershipError) return denied(503, 'Organization access could not be verified.');
    if (!membership || !roles.includes(membership.role)) return denied(403, 'You do not have access to this operation.');
    return { client };
  } catch {
    return denied(503, 'Organization access could not be verified.');
  }
}
