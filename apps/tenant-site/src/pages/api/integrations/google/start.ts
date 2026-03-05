import { providers } from '@/lib/oauth/providers';

export default function handler(req, res) {
  const cfg = providers.google;
  const state = Buffer.from(JSON.stringify({
    tenant_id: req.cookies.tenant_id ?? 'demo-tenant',
    provider: 'google'
  })).toString('base64');
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
    ...cfg.extraAuthParams
  });
  res.writeHead(302, { Location: `${cfg.authUrl}?${params}` }).end();
}
