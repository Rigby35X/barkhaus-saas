import { ORGANIZATIONS, type OrgConfig } from './api';

const STORAGE_KEY = 'barkhausAdminSession';
export const TOKEN_KEY = 'barkhausAuthToken';

const AUTH_API = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_XANO_AUTH_URL) ?? '';

export interface Session {
  orgId: number;
  accessCode: string;
  loginTime: string;
  userId?: number;
  userName?: string;
  email?: string;
  plan?: string;
}

export interface JwtSession {
  userId: number;
  userName: string;
  email: string;
  plan: string;
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

export function logout(): void {
  clearSession();
  localStorage.removeItem(TOKEN_KEY);
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

/** Reads JWT token from localStorage, calls GET /api/auth/me, returns JwtSession or null */
export async function initSession(): Promise<JwtSession | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const res = await fetch(`${AUTH_API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: number; name?: string; email?: string; plan?: string };
    return {
      userId: data.id ?? 0,
      userName: data.name ?? '',
      email: data.email ?? '',
      plan: data.plan ?? '',
    };
  } catch {
    return null;
  }
}

/** Calls POST /api/auth/login, returns authToken or throws */
export async function jwtLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${AUTH_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Login failed');
  }
  const data = await res.json() as { authToken?: string; token?: string };
  const token = data.authToken ?? data.token ?? '';
  if (!token) throw new Error('No token returned');
  return token;
}

/** Unified login: tries JWT first, falls back to legacy org credentials */
export async function loginUnified(
  emailOrOrgId: string,
  password: string,
): Promise<{ type: 'jwt'; token: string } | { type: 'legacy'; orgId: number; orgConfig: OrgConfig }> {
  // Try JWT login first
  try {
    const token = await jwtLogin(emailOrOrgId, password);
    return { type: 'jwt', token };
  } catch {
    // fall through to legacy
  }

  // Legacy fallback: org ID + access code
  const orgId = parseInt(emailOrOrgId, 10);
  if (!isNaN(orgId)) {
    const config = validateLogin(orgId, password);
    if (config) {
      return { type: 'legacy', orgId, orgConfig: config };
    }
  }
  throw new Error('Invalid credentials');
}

/** Legacy login by org ID + access code */
export function login(orgId: number, accessCode: string): OrgConfig | null {
  return validateLogin(orgId, accessCode);
}
