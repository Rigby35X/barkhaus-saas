// Astro middleware for Auth0 authentication
// import { auth0 } from './lib/auth0.js'; // Temporarily disabled

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/admin',
  '/protected'
];

// Define public routes that should always be accessible
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/our-animals',
  '/applications',
  '/donate',
  '/events',
  '/auth-test',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/callback',
  '/api/auth/me'
];

export async function onRequest(context, next) {
  const { request, url } = context;
  const pathname = url.pathname;

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') && !pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return next();
  }

  // Handle Auth0 routes
  if (pathname.startsWith('/api/auth/')) {
    return next();
  }

  // Auto-configure Auth0 routes (similar to Next.js middleware)
  if (pathname === '/auth/login') {
    return Response.redirect(new URL('/api/auth/login', url.origin));
  }

  if (pathname === '/auth/logout') {
    return Response.redirect(new URL('/api/auth/logout', url.origin));
  }

  if (pathname === '/auth/callback') {
    return Response.redirect(new URL('/api/auth/callback', url.origin));
  }

  if (pathname === '/auth/profile') {
    return Response.redirect(new URL('/api/auth/me', url.origin));
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    return next();
  }

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    // Temporarily disabled Auth0 authentication
    // Admin dashboard uses its own authentication system
    return next();

    /*
    try {
      // Get the session from Auth0
      const session = await auth0.getSession(request);

      if (!session || !session.user) {
        // Redirect to login if not authenticated
        const loginUrl = new URL('/api/auth/login', url.origin);
        loginUrl.searchParams.set('returnTo', pathname);
        return Response.redirect(loginUrl);
      }

      // User is authenticated, continue to the route
      return next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      // On error, redirect to login
      const loginUrl = new URL('/api/auth/login', url.origin);
      loginUrl.searchParams.set('returnTo', pathname);
      return Response.redirect(loginUrl);
    }
    */
  }

  // For all other routes, continue without authentication check
  return next();
}

// Export configuration for Astro
export const config = {
  // This middleware will run on all routes
  matcher: "/*"
};
