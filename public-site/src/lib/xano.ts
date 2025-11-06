export async function xanoFetch(path: string, init?: RequestInit) {
  const base = process.env.XANO_BASE_URL!;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.XANO_API_KEY!,
      ...(init?.headers || {})
    }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Save linked account to Xano
export async function saveLinkedAccountToXano(payload: any) {
  return xanoFetch('/integrations/link', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
