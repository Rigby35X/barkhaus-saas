// Admin API endpoint to get organization-specific token for Mailchimp integration
// ✅ Uses orgId + accessCode authentication and the same Paragon private key system as paragon-token.js

import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const PARAGON_PROJECT_ID =
  process.env.PARAGON_PROJECT_ID || "f8dcc8f0-7214-4bd6-8e84-99a82f7f6e6b";

// Reuse same signing key resolver logic as paragon-token.js
function resolveSigningKey() {
  // Prefer file path from .env
  if (process.env.PARAGON_SIGNING_KEY_PATH) {
    const pemPath = path.resolve(process.env.PARAGON_SIGNING_KEY_PATH);
    console.log("🔑 Loading signing key from:", pemPath);
    if (!fs.existsSync(pemPath)) throw new Error("Signing key file not found");
    return fs.readFileSync(pemPath, "utf8");
  }

  // Fallback inline key (not ideal but works)
  if (process.env.PARAGON_SIGNING_KEY) {
    let key = process.env.PARAGON_SIGNING_KEY.replace(/\\n/g, "\n");
    return key;
  }

  throw new Error("❌ No signing key configured.");
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { orgId, accessCode } = body;

    if (!orgId || !accessCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing parameters",
          message: "Organization ID and access code are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Basic access code validation
    const validCodes = {
      "3": "shelter123",
      "4": "happy456",
      "5": "paws789",
      "6": "second123",
      "7": "loving456",
      "8": "barkhaus789",
      "9": "rangers789",
    };

    const expectedCode = validCodes[orgId];
    if (!expectedCode || accessCode !== expectedCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication failed",
          message: "Invalid organization ID or access code",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get key from .env or file
    const signingKey = resolveSigningKey();
    console.log("🧩 begins with:", signingKey.startsWith("-----BEGIN"));
    console.log("🧩 ends with:", signingKey.trim().endsWith("END RSA PRIVATE KEY-----"));

    // Build JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: `org-${orgId}`,
      aud: `useparagon.com/${PARAGON_PROJECT_ID}`,
      iat: now,
      exp: now + 3600,
      org_id: orgId,
      type: "admin_session",
    };

    // Sign JWT with RS256 private key
    const jwtToken = jwt.sign(payload, signingKey, {
      algorithm: "RS256",
      header: { typ: "JWT", alg: "RS256" },
    });

    return new Response(
      JSON.stringify({
        success: true,
        userToken: jwtToken,
        orgId,
        message: "Signed JWT token generated successfully",
        metadata: {
          organization_id: orgId,
          type: "admin_session",
          scope: "mailchimp_integration",
          token_type: "jwt_signed",
          algorithm: "RS256",
          expires_in: 3600,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin Mailchimp token API error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
