import { ORGANIZATIONS, type OrgConfig } from './api';

const STORAGE_KEY = 'barkhausAdminSession';

export interface Session {
  orgId: number;
  accessCode: string;
  loginTime: string;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(orgId: number, accessCode: string): void {
  const session: Session = { orgId, accessCode, loginTime: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns org config if credentials are valid, otherwise null */
export function validateLogin(orgId: number, accessCode: string): OrgConfig | null {
  const org = ORGANIZATIONS[orgId];
  if (!org) return null;
  if (org.accessCode !== accessCode) return null;
  return org;
}

/** Restores session from localStorage, returns org config or null */
export function restoreSession(): { session: Session; org: OrgConfig } | null {
  const session = getSession();
  if (!session) return null;
  const org = ORGANIZATIONS[session.orgId];
  if (!org || org.accessCode !== session.accessCode) {
    clearSession();
    return null;
  }
  return { session, org };
}
