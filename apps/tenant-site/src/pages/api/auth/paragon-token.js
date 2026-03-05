import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";


dotenv.config();

const PARAGON_PROJECT_ID =
  process.env.PARAGON_PROJECT_ID || "4c35906a-b8f0-4fbf-9b85-733a876cd9a5";

function resolveSigningKey() {
  // 1️⃣ Prefer explicit file path
if (process.env.PARAGON_SIGNING_KEY_PATH) {
  const pemPath = path.resolve(process.env.PARAGON_SIGNING_KEY_PATH);
  console.log("🔑 Loading Paragon key from file:", pemPath);
  return fs.readFileSync(pemPath, "utf8");
}

  // 2️⃣ Inline key in .env
  if (process.env.PARAGON_SIGNING_KEY) {
    let key = process.env.PARAGON_SIGNING_KEY;
    key = key.replace(/\\n/g, "\n");
    console.log("✅ Inline key preview (first 80 chars):", key.slice(0, 80), "...");
    return key;
  }

  throw new Error("❌ No signing key configured.");
}

export async function GET() {
  try {
    const privateKey = resolveSigningKey();

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: "admin_user",
      email: "testuser@missionbaypuppyrescue.org",
      role: "admin",
      type: "user_session",
      iat: now,
      exp: now + 3600,
    };

    // 🔍 Log for debugging
    console.log("🧩 privateKey starts with:", privateKey.split("\n")[0]);
    console.log("🧩 privateKey ends with:", privateKey.split("\n").slice(-2).join("\n"));
    console.log("🧩 privateKey preview:", privateKey.substring(0, 100));
console.log("🧩 begins with:", privateKey.startsWith("-----BEGIN RSA PRIVATE KEY-----"));
console.log("🧩 ends with:", privateKey.trim().endsWith("-----END RSA PRIVATE KEY-----"));

    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      audience: `useparagon.com/${PARAGON_PROJECT_ID}`,
    });

    return new Response(JSON.stringify({ token, projectId: PARAGON_PROJECT_ID }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating Paragon JWT:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate JWT" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
