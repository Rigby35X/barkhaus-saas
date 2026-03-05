# Paragon + Auth0 Integration Setup

This integration uses Auth0 tokens directly as Paragon user tokens for a simplified multi-tenant architecture.

## Architecture Overview

```
Auth0 Login → Get Auth0 Token → Use as Paragon User Token → Connect Mailchimp → Execute Actions
```

## Environment Variables

Add these to your `.env` file:

```bash
# Paragon Integration (using Auth0 tokens as user tokens)
PUBLIC_PARAGON_API_KEY=your_paragon_public_api_key_here
PUBLIC_PARAGON_ENVIRONMENT=production
```

## How It Works

### 1. User Authentication
- User logs in with Auth0
- Auth0 provides access token/ID token

### 2. Paragon User Token
- Auth0 token is used directly as Paragon user token
- No need to create separate Paragon users
- Each Auth0 user gets isolated Paragon access

### 3. Mailchimp Connection
- User clicks "Connect Mailchimp" 
- Paragon opens OAuth popup using Auth0 token as user identifier
- Mailchimp tokens are stored securely by Paragon, scoped to the Auth0 user

### 4. Action Execution
- All actions are automatically scoped to the logged-in Auth0 user
- Each user can only access their own connected Mailchimp account

## API Endpoints

### `/api/auth/user-token`
- **Method:** GET
- **Purpose:** Get Auth0 token for use as Paragon user token
- **Returns:** `{ userToken, userId, email, name }`
- **Authentication:** Requires Auth0 session

## Components

### `MailchimpConnector.astro`
- Handles Mailchimp account connection
- Shows connection status
- Manages OAuth flow

### `MailchimpActions.astro`
- Lists available Mailchimp actions
- Executes actions on user's account
- Displays results

## Security Benefits

- **Isolated:** Each Auth0 user has completely isolated access
- **Secure:** No shared tokens or cross-user access possible
- **Simple:** No complex user mapping or token management
- **Scalable:** Supports unlimited users automatically

## Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit: `http://localhost:4321/communications`

3. Login with Auth0

4. Connect your Mailchimp account

5. Execute actions on your data

## Paragon Dashboard Configuration

1. **Create Integration:**
   - Add Mailchimp integration
   - Configure OAuth credentials
   - Set redirect URLs

2. **User Token Configuration:**
   - Configure Paragon to accept Auth0 tokens as user tokens
   - Set up proper scoping and isolation

3. **Webhook Setup (Optional):**
   - Configure webhooks for real-time updates
   - Set up event handling

## Troubleshooting

### "Authentication required" error
- Ensure user is logged in with Auth0
- Check Auth0 session is valid

### "No token available" error
- Verify Auth0 is providing access token or ID token
- Check Auth0 configuration

### "Paragon client not initialized" error
- Ensure `/api/auth/user-token` is returning valid token
- Check Paragon public API key is set

### Connection issues
- Verify Paragon integration is configured correctly
- Check Mailchimp OAuth credentials in Paragon dashboard
