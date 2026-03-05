import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    return await auth0.handleLogin(request);
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
