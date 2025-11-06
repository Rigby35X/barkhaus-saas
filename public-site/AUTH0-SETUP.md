# 🔐 Auth0 Setup Guide for Mission Bay Puppy Rescue

## ✅ Completed Setup

### 1. Environment Variables Added
The following Auth0 configuration has been added to `mission-bay-site/.env`:

```bash
# Auth0 Configuration
AUTH0_SECRET=488c06d904ae86c5497be90b3fa91a7575cffa7b586ad79c40a587e920f97bee
APP_BASE_URL=http://localhost:4321/
AUTH0_DOMAIN=https://dev-mgyaisokgc1vbt30.us.auth0.com
AUTH0_CLIENT_ID=FxTfaIyhvqRankjCNuN6Np1iLSK6GUHp
AUTH0_CLIENT_SECRET=sggijyDQ7DRiyTsUBxz56eq-gtBSV-h0fnaZslwHbyaLXB6_W94-4Vycqtcn9wDO
AUTH0_AUDIENCE=your_auth_api_identifier
AUTH0_SCOPE=openid profile email read:shows
```

### 2. Files Created
- ✅ `src/lib/auth0.js` - Auth0 configuration
- ✅ `src/pages/api/auth/login.js` - Login endpoint
- ✅ `src/pages/api/auth/logout.js` - Logout endpoint  
- ✅ `src/pages/api/auth/callback.js` - Auth callback endpoint
- ✅ `src/pages/api/auth/me.js` - Get current user endpoint
- ✅ `src/js/auth.js` - Client-side auth utilities
- ✅ `src/components/AuthButton.astro` - Login/logout component
- ✅ `src/pages/auth-test.astro` - Test page for authentication

### 3. Package Installed
- ✅ `@auth0/nextjs-auth0` - Auth0 SDK for Node.js

## 🔧 Required Auth0 Dashboard Configuration

### 1. Update Application Settings
In your Auth0 dashboard for application `FxTfaIyhvqRankjCNuN6Np1iLSK6GUHp`:

**Allowed Callback URLs:**
```
http://localhost:4321/api/auth/callback,
https://missionbaypuppyrescue.org/api/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:4321/,
https://missionbaypuppyrescue.org/
```

**Allowed Web Origins:**
```
http://localhost:4321,
https://missionbaypuppyrescue.org
```

**Allowed Origins (CORS):**
```
http://localhost:4321,
https://missionbaypuppyrescue.org
```

### 2. Update Environment Variables (Optional)
If you have a custom Auth0 API:
- Update `AUTH0_AUDIENCE` in `.env` with your actual API identifier
- Update `AUTH0_SCOPE` with your required scopes

## 🚀 Testing the Integration

### 1. Start Development Server
```bash
cd mission-bay-site
npm run dev
```

### 2. Test Authentication
Visit: `http://localhost:4321/auth-test`

### 3. Test Flow
1. Click "Sign In" → Redirects to Auth0
2. Login with your credentials
3. Redirects back to test page
4. Protected content becomes visible
5. Click "Sign Out" → Logs out and hides protected content

## 🔗 Integration Points

### Using Auth in Components
```astro
---
// In any Astro component
import AuthButton from "@components/AuthButton.astro";
---

<AuthButton />
```

### Using Auth in JavaScript
```javascript
// Import the auth client
import auth0Client from '/src/js/auth.js';

// Check if user is authenticated
if (auth0Client.isUserAuthenticated()) {
  const user = auth0Client.getUser();
  console.log('User:', user);
}
```

### Protecting Content with HTML Attributes
```html
<!-- Only visible when logged in -->
<div data-auth="protected">
  This content requires authentication
</div>

<!-- Only visible when logged out -->
<div data-auth="public">
  Please sign in to continue
</div>

<!-- Login button -->
<button data-auth="login">Sign In</button>

<!-- Logout button -->
<button data-auth="logout">Sign Out</button>

<!-- User info display -->
<span data-auth="user-info"></span>
```

## 🛡️ Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use HTTPS in production** - Update `APP_BASE_URL` for production
3. **Rotate secrets regularly** - Generate new `AUTH0_SECRET` periodically
4. **Validate on server-side** - Always verify auth on API endpoints

## 🔄 Next Steps

1. **Configure Auth0 Dashboard** with the callback URLs above
2. **Test the integration** using the test page
3. **Add authentication** to your existing pages
4. **Protect API endpoints** using the auth session
5. **Customize login experience** in Auth0 dashboard

## 🐛 Troubleshooting

### Common Issues:
- **Callback URL mismatch** - Ensure URLs match exactly in Auth0 dashboard
- **CORS errors** - Add your domain to Allowed Origins
- **Session issues** - Check `AUTH0_SECRET` is properly set
- **Redirect loops** - Verify `APP_BASE_URL` matches your actual URL

### Debug Mode:
Add to `.env` for more verbose logging:
```bash
DEBUG=@auth0/nextjs-auth0*
```
