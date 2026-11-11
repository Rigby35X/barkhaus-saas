import type { OrgConfig } from './api';

export type OrganizationRole = 'owner' | 'admin' | 'staff' | 'viewer';
export interface OrganizationAccess {
  orgId: number;
  role: OrganizationRole;
  orgConfig: OrgConfig;
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return value === 'owner' || value === 'admin' || value === 'staff' || value === 'viewer';
}

export function selectOrganization(access: OrganizationAccess[], preferredId: number | null): OrganizationAccess | null {
  return access.find((org) => org.orgId === preferredId) ?? access[0] ?? null;
}

export function canManageOrganization(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function toOrgConfig(row: Record<string, unknown>): OrgConfig {
  const text = (field: string, fallback = '') => typeof row[field] === 'string' ? row[field] as string : fallback;
  return {
    name: text('org', text('name', 'Your organization')),
    logo: text('logo_dark_url'),
    colors: { primary: text('primary_color', '#804e3f'), secondary: text('secondary_color', '#6b7280') },
    contact: { email: text('contact_email', text('email')), phone: text('phone'), address: text('address') },
    social: { facebook: text('facebook_url'), instagram: text('instagram_url'), twitter: text('twitter_url') },
    subdomain: text('subdomain'),
    siteUrl: text('website'),
  };
}
