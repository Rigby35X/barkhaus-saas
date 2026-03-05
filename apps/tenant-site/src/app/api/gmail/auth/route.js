// src/pages/api/gmail/auth.js
import oAuth2Client from '@/lib/googleAuth';

export default function handler(req, res) {
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'];

  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [    
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ],
  });

  res.redirect(url);
}
