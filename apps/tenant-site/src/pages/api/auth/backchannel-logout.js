import { auth0 } from '../../../lib/auth0.js';

export async function POST(request) {
  try {
    // Handle back-channel logout
    return await auth0.handleBackchannelLogout(request);
  } catch (error) {
    console.error('Back-channel logout error:', error);
    return new Response(JSON.stringify({ error: 'Back-channel logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
