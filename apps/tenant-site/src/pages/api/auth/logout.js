import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    return await auth0.handleLogout(request);
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
