# Paragon Mailchimp Integration Setup Guide

## Overview
This guide walks through configuring Paragon to enable Mailchimp integration for the Barkhaus admin dashboard.

## Prerequisites
- Paragon account (sign up at useparagon.com)
- Mailchimp Developer account
- Admin access to your organization's systems

## Step 1: Paragon Account Setup

### 1.1 Create Paragon Account
1. Go to [useparagon.com](https://useparagon.com)
2. Sign up for a Paragon account
3. Complete account verification

### 1.2 Get API Keys
1. Navigate to **Settings** → **API Keys**
2. Copy your **Public API Key** (starts with `pk_`)
3. Copy your **Server API Key** (starts with `sk_`)
4. Add to your `.env` file:
```bash
PUBLIC_PARAGON_API_KEY=pk_your_public_key_here
PARAGON_API_KEY=sk_your_server_key_here
PUBLIC_PARAGON_ENVIRONMENT=production
```

## Step 2: Mailchimp App Registration

### 2.1 Create Mailchimp Developer Account
1. Go to [mailchimp.com/developer](https://mailchimp.com/developer)
2. Sign in with your Mailchimp account
3. Navigate to **Your Apps** → **Create New App**

### 2.2 Configure Mailchimp App
**App Details:**
- **App Name**: `Barkhaus Admin Integration`
- **Description**: `Email marketing integration for animal rescue organizations`
- **Company**: Your organization name
- **Website**: Your website URL

**OAuth Settings:**
- **Redirect URI**: `https://connect.useparagon.com/oauth/redirect`
- **Scopes**: Select all required permissions:
  - `campaigns:read` - Read campaign data
  - `campaigns:write` - Create and manage campaigns
  - `lists:read` - Read audience/list data
  - `lists:write` - Manage audiences and subscribers
  - `templates:read` - Read email templates
  - `templates:write` - Create and edit templates
  - `reports:read` - Access campaign reports

### 2.3 Get Mailchimp Credentials
After creating the app, copy:
- **Client ID**
- **Client Secret**

## Step 3: Paragon Integration Configuration

### 3.1 Enable Mailchimp Integration
1. In Paragon Dashboard → **Integrations**
2. Find **Mailchimp** in the catalog
3. Click **Enable Integration**

### 3.2 Configure OAuth
1. **Client ID**: Paste your Mailchimp Client ID
2. **Client Secret**: Paste your Mailchimp Client Secret
3. **Scopes**: Ensure all required scopes are selected
4. **Redirect URI**: Verify it's set to `https://connect.useparagon.com/oauth/redirect`

### 3.3 Configure Actions
Enable the following Mailchimp actions in Paragon:
- **Get Lists** - Retrieve audience lists
- **Add Subscriber** - Add new subscribers
- **Update Subscriber** - Update subscriber information
- **Create Campaign** - Create email campaigns
- **Send Campaign** - Send campaigns
- **Get Campaign Reports** - Retrieve campaign analytics

## Step 4: User Authentication Configuration

### 4.1 Configure User Identification
In Paragon Dashboard → **Settings** → **User Management**:

**User Token Strategy**: Custom (Admin Session)
- **Token Format**: `org-{organization_id}-{timestamp}-{random}`
- **User Identification**: Organization ID
- **Isolation**: Per organization

### 4.2 Webhook Configuration (Optional)
For real-time updates:
- **Webhook URL**: `https://yourdomain.com/api/webhooks/paragon`
- **Events**: Connection status, action completion

## Step 5: Testing the Integration

### 5.1 Test Connection
1. Login to admin dashboard
2. Navigate to Communications → Mailchimp
3. Click "Connect Mailchimp Account"
4. Complete OAuth flow
5. Verify connection status

### 5.2 Test Actions
Try these basic actions:
- **Get Lists**: Should return your Mailchimp audiences
- **Create Campaign**: Create a test campaign
- **Get Reports**: View campaign statistics

## Step 6: Production Deployment

### 6.1 Environment Variables
Ensure production environment has:
```bash
PUBLIC_PARAGON_API_KEY=pk_prod_your_key
PARAGON_API_KEY=sk_prod_your_key
PUBLIC_PARAGON_ENVIRONMENT=production
```

### 6.2 Domain Configuration
Update Mailchimp app settings:
- **Redirect URI**: Update to your production domain
- **Webhook URLs**: Update to production endpoints

## Troubleshooting

### Common Issues

**1. OAuth Redirect Mismatch**
- Ensure Mailchimp redirect URI matches Paragon's exactly
- Check for trailing slashes or protocol mismatches

**2. Scope Permissions**
- Verify all required scopes are enabled in Mailchimp app
- Check Paragon integration has matching scopes

**3. API Key Issues**
- Ensure public key is used in frontend
- Ensure server key is used in backend API calls
- Check environment variable names match exactly

**4. User Token Format**
- Verify admin API generates tokens in expected format
- Check organization ID is properly included

### Support Resources
- **Paragon Documentation**: [docs.useparagon.com](https://docs.useparagon.com)
- **Mailchimp API Docs**: [mailchimp.com/developer/marketing/api](https://mailchimp.com/developer/marketing/api)
- **Integration Support**: Contact Paragon support for integration-specific issues

## Security Considerations

1. **API Key Security**: Never expose server API keys in frontend code
2. **Token Isolation**: Ensure each organization's tokens are isolated
3. **Scope Limitation**: Only request necessary Mailchimp permissions
4. **Regular Rotation**: Rotate API keys periodically
5. **Audit Logging**: Monitor integration usage and access patterns
