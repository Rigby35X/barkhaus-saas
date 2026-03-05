// API endpoint to get Auth0 token for use as Paragon user token
import { auth0 } from '../../../lib/auth0.js';

export async function GET(request) {
  try {
    // Check authentication
    const session = await auth0.getSession(request);
    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the Auth0 access token to use as Paragon user token
    const userToken = session.accessToken || session.idToken || session.user.sub;
    
    if (!userToken) {
      return new Response(JSON.stringify({ 
        error: 'No token available',
        message: 'Auth0 session does not contain access token or ID token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      userToken: userToken,
      userId: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      message: 'Auth0 token retrieved successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get Auth0 token API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
