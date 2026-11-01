import { supabase } from './supabase';
import { clearCache } from './apiCache';
import { isOrganizationRole, toOrgConfig, type OrganizationAccess } from './access';

const PREFERRED_ORG_KEY = 'barkhausPreferredOrganization';

export function clearLegacySession(): void {
  localStorage.removeItem('barkhausAdminSession');
  localStorage.removeItem('barkhausAuthToken');
  // Legacy query tokens are never accepted as proof of organization access.
  const url = new URL(window.location.href);
  if (url.searchParams.has('token')) {
    url.searchParams.delete('token');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

export function preferredOrganization(): number | null {
  const value = Number(localStorage.getItem(PREFERRED_ORG_KEY));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function rememberOrganization(id: number): void {
  localStorage.setItem(PREFERRED_ORG_KEY, String(id));
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  clearCache();
  clearLegacySession();
  localStorage.removeItem(PREFERRED_ORG_KEY);
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadOrganizationAccess(): Promise<OrganizationAccess[]> {
  // Validate the user with Auth; local storage or user_metadata cannot grant access.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Your session has expired. Please sign in again.');
  // The database derives active memberships from auth.uid() and returns only
  // approved organization display fields, without exposing the legacy table.
  const { data, error } = await supabase.rpc('my_organization_access');
  if (error) throw new Error('We could not load your organization access. Please retry or contact your administrator.');

  return ((data ?? []) as unknown[]).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const membership = entry as Record<string, unknown>;
    const org = membership.organizations;
    if (!org || typeof org !== 'object' || Array.isArray(org) ||
        typeof membership.org_id !== 'number' || !Number.isSafeInteger(membership.org_id) ||
        !isOrganizationRole(membership.role)) return [];
    return [{ orgId: membership.org_id, role: membership.role, orgConfig: toOrgConfig(org as Record<string, unknown>) }];
  });
}
