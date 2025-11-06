// Client-side Auth0 utilities for Astro
class Auth0Client {
  constructor() {
    this.user = null;
    this.isLoading = true;
    this.isAuthenticated = false;
  }

  // Initialize auth state
  async init() {
    try {
      await this.checkAuth();
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      this.isLoading = false;
      this.updateUI();
    }
  }

  // Check current authentication status
  async checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.user) {
        this.user = data.user;
        this.isAuthenticated = true;
      } else {
        this.user = null;
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Check auth error:', error);
      this.user = null;
      this.isAuthenticated = false;
    }
  }

  // Login redirect
  login() {
    window.location.href = '/api/auth/login';
  }

  // Logout redirect
  logout() {
    window.location.href = '/api/auth/logout';
  }

  // Update UI based on auth state
  updateUI() {
    // Update login/logout buttons
    const loginButtons = document.querySelectorAll('[data-auth="login"]');
    const logoutButtons = document.querySelectorAll('[data-auth="logout"]');
    const userInfo = document.querySelectorAll('[data-auth="user-info"]');
    const protectedContent = document.querySelectorAll('[data-auth="protected"]');

    if (this.isAuthenticated) {
      // Show logout buttons and user info
      loginButtons.forEach(btn => btn.style.display = 'none');
      logoutButtons.forEach(btn => btn.style.display = 'block');
      userInfo.forEach(el => {
        el.style.display = 'block';
        el.textContent = `Welcome, ${this.user.name || this.user.email}!`;
      });
      protectedContent.forEach(el => el.style.display = 'block');
    } else {
      // Show login buttons, hide user info
      loginButtons.forEach(btn => btn.style.display = 'block');
      logoutButtons.forEach(btn => btn.style.display = 'none');
      userInfo.forEach(el => el.style.display = 'none');
      protectedContent.forEach(el => el.style.display = 'none');
    }

    // Remove loading states
    const loadingElements = document.querySelectorAll('[data-auth="loading"]');
    loadingElements.forEach(el => el.style.display = 'none');
  }

  // Get current user
  getUser() {
    return this.user;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create global auth instance
const auth0Client = new Auth0Client();

// Initialize when page loads
document.addEventListener('astro:page-load', () => {
  auth0Client.init();

  // Add event listeners for auth buttons (for button elements)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.matches && e.target.matches('button[data-auth="login"]')) {
      e.preventDefault();
      auth0Client.login();
    }

    if (e.target && e.target.matches && e.target.matches('button[data-auth="logout"]')) {
      e.preventDefault();
      auth0Client.logout();
    }
  });

  // Note: For anchor tags with href="/auth/login" and href="/auth/logout",
  // we let them navigate naturally - no JavaScript intervention needed
});

// Export for use in other modules
export default auth0Client;
