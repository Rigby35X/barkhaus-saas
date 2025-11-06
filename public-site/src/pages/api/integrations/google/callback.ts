import { providers } from '@/lib/oauth/providers';
import { saveLinkedAccountToXano } from '@/lib/xano';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cfg = providers.google;
  if(!code || !state) return res.status(400).send('Bad request');
  const { tenant_id } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: cfg.redirectUri,
        code
      })
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(JSON.stringify(tokens));

    // Save per-tenant in Xano
    await saveLinkedAccountToXano({
      tenant_id,
      provider: 'google',
      auth_type: 'oauth',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? new Date(Date.now()+tokens.expires_in*1000).toISOString() : undefined,
      scope: cfg.scope,
      metadata: { raw: tokens }
    });
    res.writeHead(302, { Location: '/settings/integrations?connected=google' }).end();
  } catch (e) {
    res.writeHead(302, { Location: '/settings/integrations?error=google' }).end();
  }
}
