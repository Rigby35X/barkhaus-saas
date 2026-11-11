// AI reply drafting for Applications / Communications.
//
// IMPORTANT: this deliberately does NOT call api.anthropic.com directly from the
// browser. A VITE_-prefixed env var (e.g. VITE_ANTHROPIC_API_KEY) is bundled into
// the client-side JS and would expose a real API key to every visitor via devtools,
// letting anyone extract it and run up unlimited usage billed to this org's account.
//
// Instead, this calls apps/tenant-site's /api/admin/draft-reply proxy, which holds
// ANTHROPIC_API_KEY server-side only. Required env var (set on the tenant-site
// Vercel project, NOT the dashboard project, and NOT VITE_-prefixed):
//   ANTHROPIC_API_KEY

import { getAdminApiUrl, getAuthHeaders } from './api';

export interface DraftReplyContext {
  applicantName: string;
  formType: string;
  formData: Record<string, unknown>;
  orgName: string;
  status: string;
}

export async function draftReply(orgId: number, context: DraftReplyContext): Promise<string> {
  const endpoint = await getAdminApiUrl(orgId, 'draft-reply');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
    body: JSON.stringify({ ...context, orgId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(err.error ?? `Draft reply failed (${res.status})`);
  }

  const data = await res.json() as { content?: string; error?: string };
  if (!data.content) throw new Error(data.error ?? 'No reply generated.');
  return data.content;
}
