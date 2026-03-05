import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    const session = await auth0.getSession(request);

    if (!session) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ user: session.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
