// src/lib/googleAuth.js
import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,      // from Google Cloud Console
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI    // e.g. "http://localhost:3000/api/gmail/callback"
);

export default oAuth2Client;
