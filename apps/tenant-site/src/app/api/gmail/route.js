// src/app/api/gmail/auth/route.js
import { NextResponse } from "next/server";
import oAuth2Client from "@/lib/googleAuth";

export async function GET() {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  });

  return NextResponse.redirect(url);
}
