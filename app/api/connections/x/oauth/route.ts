import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "@/lib/auth";
import { isXOAuthConfigured } from "@/lib/xConfig";
import {
  buildAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
} from "@/lib/xOAuth";

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isXOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "X Developer App is not configured. Set X_CLIENT_ID and X_CLIENT_SECRET in your environment.",
        },
        { status: 503 }
      );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateOAuthState();
    const authorizeUrl = buildAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    cookieStore.set("x_oauth_verifier", codeVerifier, OAUTH_COOKIE_OPTS);
    cookieStore.set("x_oauth_state", state, OAUTH_COOKIE_OPTS);

    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("X OAuth start error:", err);
    const message = err instanceof Error ? err.message : "Failed to start X OAuth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
