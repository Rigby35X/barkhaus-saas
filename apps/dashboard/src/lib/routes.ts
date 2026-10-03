import type { OrganizationAccess } from './access';
import type { TabKey } from '../components/Sidebar';

const TABS: TabKey[] = ['overview', 'animals', 'applications', 'events', 'donations', 'communications', 'website-content', 'policies', 'social-media', 'integrations', 'settings'];

export function organizationSlug(org: OrganizationAccess): string {
  const slug = org.orgConfig.subdomain?.toLowerCase();
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !['login', 'dashboard'].includes(slug)
    ? slug : `org-${org.orgId}`;
}

export function workspacePath(org: OrganizationAccess, tab: TabKey): string {
  return `/${organizationSlug(org)}/${tab}`;
}

export function resolveWorkspaceRoute(pathname: string, access: OrganizationAccess[]) {
  if (['/', '/login', '/dashboard'].includes(pathname)) return { kind: 'entry' as const };
  const match = /^\/([a-z0-9-]+)(?:\/([a-z-]+))?\/?$/.exec(pathname);
  if (!match || (match[2] && !TABS.includes(match[2] as TabKey))) return { kind: 'missing' as const };
  // Resolve only among verified memberships. Ambiguous slugs fail closed.
  const organizations = access.filter(org => organizationSlug(org) === match[1]);
  if (organizations.length !== 1) return { kind: 'denied' as const };
  return { kind: 'workspace' as const, organization: organizations[0], tab: (match[2] || 'overview') as TabKey };
}
