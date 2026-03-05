import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    return await auth0.handleCallback(request);
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ error: 'Authentication callback failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
