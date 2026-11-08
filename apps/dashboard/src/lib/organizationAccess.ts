import { supabase } from './supabase';
import type { OrgConfig } from './api';

export interface OrganizationAccess {
  orgId: number;
  role: 'owner' | 'admin';
  orgConfig: OrgConfig;
}

export function organizationAccessFromRows(rows: unknown): OrganizationAccess[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const org = row.organizations;
    if (!org || Array.isArray(org) || !Number.isSafeInteger(row.organization_id) ||
        row.organization_id <= 0 || org.id !== row.organization_id || org.is_active === false ||
        !['owner', 'admin'].includes(row.role)) return [];
    const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
    return [{
      orgId: row.organization_id,
      role: row.role as 'owner' | 'admin',
      orgConfig: {
        name: text(org.org, 'Your organization'),
        accessCode: '',
        logo: text(org.logo_dark_url),
        colors: { primary: text(org.primary_color, '#804e3f'), secondary: text(org.secondary_color, '#b9a38e') },
        contact: { email: text(org.contact_email || org.email), phone: text(org.phone), address: text(org.address) },
        social: { facebook: text(org.facebook_url), instagram: text(org.instagram_url), twitter: text(org.twitter_url) },
        subdomain: text(org.subdomain),
        // Organization owner is distinct from unrestricted platform administration.
        isAdmin: false,
      },
    }];
  });
}

export async function loadOrganizationAccess(expectedUserId: string): Promise<OrganizationAccess[]> {
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError || !identity.user || identity.user.id !== expectedUserId) throw new Error('Please sign in again to verify your account.');
  const { data, error } = await supabase.from('organization_memberships')
    .select('organization_id, role, organizations(*)').eq('user_id', identity.user.id);
  if (error) throw new Error('Could not load your organization access. Please retry.');
  return organizationAccessFromRows(data);
}
