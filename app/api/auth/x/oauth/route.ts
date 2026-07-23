import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isXOAuthConfigured } from "@/lib/xConfig";
import {
  buildLoginAuthorizationUrl,
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
    if (!isXOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "X sign-in is not configured. Set X_CLIENT_ID and X_CLIENT_SECRET in your environment.",
        },
        { status: 503 }
      );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateOAuthState();
    const authorizeUrl = buildLoginAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    cookieStore.set("x_login_verifier", codeVerifier, OAUTH_COOKIE_OPTS);
    cookieStore.set("x_login_state", state, OAUTH_COOKIE_OPTS);

    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("X login OAuth start error:", err);
    const message = err instanceof Error ? err.message : "Failed to start X sign-in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
