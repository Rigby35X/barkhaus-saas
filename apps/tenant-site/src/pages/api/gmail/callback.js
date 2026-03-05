// src/pages/api/gmail/callback.js
import oAuth2Client from '@/lib/googleAuth';
import { google } from 'googleapis';

export default async function handler(req, res) {
  const code = req.query.code;

  try {
    const { tokens } = await oAuth2Client.getToken(req.query.code);
    oAuth2Client.setCredentials(tokens);

    // Save tokens (in DB or encrypted storage)
    // After oAuth2Client.getToken(code)
const { token } = await oAuth2Client.getToken(code);
await saveTokensToDB({
  tenant_id: session.tenantId,
  user_id: session.userId,
  access_token: encrypt(tokens.access_token),
  refresh_token: encrypt(tokens.refresh_token),
  token_expiry: tokens.expiry_date,
});

    // e.g., await saveUserTokens(userId, tokens);

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    res.status(200).json({
      message: 'Gmail authorization successful',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
  } catch (err) {
    console.error('Error retrieving tokens:', err);
    res.status(500).json({ error: 'Failed to exchange code for tokens' });
  }
}
