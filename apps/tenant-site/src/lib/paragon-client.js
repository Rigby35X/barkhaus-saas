// Paragon SDK Client for Barkhaus Multi-Tenant Setup
import Paragon from "@useparagon/connect";
paragon.configureGlobal({
  host: "useparagon.com",
});

// Paragon configuration
const PARAGON_CONFIG = {
  apiKey: import.meta.env.PUBLIC_PARAGON_API_KEY || import.meta.env.PARAGON_API_KEY,
  environment: import.meta.env.PUBLIC_PARAGON_ENVIRONMENT || "production", // or "sandbox"
};

// Create Paragon client instance with user token (Auth0 or admin session)
export function createParagonClient(userToken) {
  const apiKey = import.meta.env.PUBLIC_PARAGON_API_KEY || import.meta.env.PARAGON_API_KEY;

  if (!apiKey) {
    throw new Error('Paragon API key not configured');
  }

  if (!userToken) {
    throw new Error('User token is required to create Paragon client');
  }

  return new Paragon({
    apiKey: apiKey,
    userToken: userToken, // Auth0 token or admin session token
    environment: import.meta.env.PUBLIC_PARAGON_ENVIRONMENT || "production",
  });
}

// Legacy global client (for backwards compatibility)
export const paragon = new Paragon(PARAGON_CONFIG);

// Mailchimp integration configuration
export const MAILCHIMP_CONFIG = {
  clientId: "478281090595",
  clientSecret: "0dd870abb43ea888550f05d8e23440a1b5e82a6067adebcd56",
  apiKey: "7eeab2a90c1343c04dadea14a2a6c37a-us9",
  callbackUrl: "https://passport.useparagon.com/oauth"
};

/**
 * Initialize Paragon with Auth0 token for multi-tenant setup
 * @param {string} auth0Token - Auth0 access token used as Paragon user token
 */
export function initializeParagonWithUser(auth0Token) {
  if (auth0Token) {
    paragon.setUserToken(auth0Token);
  }
}

/**
 * Get available Mailchimp actions
 * @returns {Promise<Array>} List of available Mailchimp actions
 */
export async function getMailchimpActions() {
  try {
    // Use our API endpoint instead of direct Paragon call for better error handling
    const response = await fetch('/api/integrations/mailchimp/actions');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.actions || [];
  } catch (error) {
    console.error("Error fetching Mailchimp actions:", error);
    throw error;
  }
}

/**
 * Execute a Mailchimp action
 * @param {string} actionKey - The action to execute
 * @param {Object} params - Parameters for the action
 * @returns {Promise<Object>} Action execution result
 */
export async function executeMailchimpAction(actionKey, params = {}) {
  try {
    // Use our API endpoint for execution
    const response = await fetch('/api/integrations/mailchimp/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: actionKey,
        parameters: params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Error executing Mailchimp action:", error);
    throw error;
  }
}

/**
 * Check if user has connected Mailchimp
 * @returns {Promise<boolean>} Connection status
 */
export async function isMailchimpConnected() {
  try {
    const integrations = await paragon.integrations.list();
    const mailchimp = integrations.find(integration => integration.type === "mailchimp");
    return mailchimp?.connected || false;
  } catch (error) {
    console.error("Error checking Mailchimp connection:", error);
    return false;
  }
}

/**
 * Get Mailchimp connection URL for user
 * @param {string} userId - User ID for the connection
 * @returns {string} Connection URL
 */
export function getMailchimpConnectionUrl(userId) {
  return paragon.connect.getConnectionUrl("mailchimp", {
    userId: userId,
    redirectUrl: window.location.origin + "/integrations/mailchimp/callback"
  });
}

export default paragon;
