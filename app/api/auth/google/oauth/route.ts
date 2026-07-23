import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isGoogleOAuthConfigured } from "@/lib/googleConfig";
import { parseOAuthIntent } from "@/lib/oauthAccounts";
import {
  buildGoogleAuthorizationUrl,
  generateGoogleCodeChallenge,
  generateGoogleCodeVerifier,
  generateGoogleOAuthState,
} from "@/lib/googleOAuth";

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        },
        { status: 503 }
      );
    }

    const intent = parseOAuthIntent(request.nextUrl.searchParams.get("intent"));
    const codeVerifier = generateGoogleCodeVerifier();
    const codeChallenge = generateGoogleCodeChallenge(codeVerifier);
    const state = generateGoogleOAuthState();
    const authorizeUrl = buildGoogleAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    cookieStore.set("google_login_verifier", codeVerifier, OAUTH_COOKIE_OPTS);
    cookieStore.set("google_login_state", state, OAUTH_COOKIE_OPTS);
    cookieStore.set("google_login_intent", intent, OAUTH_COOKIE_OPTS);

    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error("Google login OAuth start error:", err);
    const message = err instanceof Error ? err.message : "Failed to start Google sign-in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
