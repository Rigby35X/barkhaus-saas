import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    const session = await auth0.getSession(request);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get access token from session
    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No access token available' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      accessToken: accessToken,
      expiresAt: session.accessTokenExpiresAt 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Access token error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get access token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
