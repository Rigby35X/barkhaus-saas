// lib/auth0.js - Simplified authentication for Paragon integration

// Simple authentication configuration
const authConfig = {
  domain: process.env.AUTH0_DOMAIN || 'dev-mgyaisokgc1vbt30.us.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || 'FxTfaIyhvqRankjCNuN6Np1iLSK6GUHp',
  baseURL: process.env.APP_BASE_URL || 'http://localhost:4322/',
  secret: process.env.AUTH0_SECRET || '488c06d904ae86c5497be90b3fa91a7575cffa7b586ad79c40a587e920f97bee',
  scope: 'openid profile email',
};

// Simplified auth functions for Paragon integration
export const auth0 = {
  // Generate login URL (simplified)
  getLoginUrl(returnTo = '/') {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: authConfig.clientId,
      redirect_uri: `${authConfig.baseURL}api/auth/callback`,
      scope: authConfig.scope,
      state: returnTo,
    });

    return `https://${authConfig.domain}/authorize?${params.toString()}`;
  },

  // Generate logout URL
  getLogoutUrl(returnTo = '/') {
    const params = new URLSearchParams({
      client_id: authConfig.clientId,
      returnTo: `${authConfig.baseURL}${returnTo}`,
    });

    return `https://${authConfig.domain}/v2/logout?${params.toString()}`;
  },

  // Handle login redirect
  handleLogin(request) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/';
    const loginUrl = this.getLoginUrl(returnTo);

    return Response.redirect(loginUrl, 302);
  },

  // Handle logout redirect
  handleLogout(request) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get('returnTo') || '/';
    const logoutUrl = this.getLogoutUrl(returnTo);

    // Clear session cookie
    const response = Response.redirect(logoutUrl, 302);
    response.headers.set('Set-Cookie', 'simple-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');

    return response;
  },

  // Simplified callback handler
  async handleCallback(request) {
    try {
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        throw new Error('Authorization code not found');
      }

      // For now, create a simple session without full OAuth flow
      // In production, you would exchange the code for tokens
      const session = {
        user: {
          sub: 'user_123',
          email: 'user@example.com',
          name: 'Test User',
        },
        idToken: 'simple_token_for_testing',
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
      };

      // Set session cookie
      const sessionCookie = this.encryptSession(session);
      const returnTo = state || '/';

      const response = Response.redirect(`${authConfig.baseURL}${returnTo}`, 302);
      response.headers.set('Set-Cookie', `simple-session=${sessionCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);

      return response;
    } catch (error) {
      console.error('Callback error:', error);
      return Response.redirect(`${authConfig.baseURL}?error=auth_failed`, 302);
    }
  },

  // Get user session from cookie
  async getSession(request) {
    try {
      const cookies = request.headers.get('cookie') || '';
      const sessionCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('simple-session='))
        ?.split('=')[1];

      if (!sessionCookie) {
        return null;
      }

      const session = this.decryptSession(sessionCookie);

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        return null;
      }

      return session;
    } catch (error) {
      console.error('Session error:', error);
      return null;
    }
  },

  // Simple session encryption (in production, use proper encryption)
  encryptSession(session) {
    return Buffer.from(JSON.stringify(session)).toString('base64');
  },

  // Simple session decryption
  decryptSession(encryptedSession) {
    return JSON.parse(Buffer.from(encryptedSession, 'base64').toString());
  },
};

export default auth0;
