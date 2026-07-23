import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { assertAuthConfigured, getAuthErrorMessage } from "@/lib/auth-errors";
import {
  OAuthAccountError,
  parseOAuthIntent,
  signInWithOAuthProfile,
} from "@/lib/oauthAccounts";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleUser,
} from "@/lib/googleOAuth";

function signupRedirect(request: NextRequest, error: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function dashboardRedirect(request: NextRequest, isNewUser: boolean) {
  const url = new URL("/dashboard", request.url);
  if (isNewUser) {
    url.searchParams.set("onboarding", "1");
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return signupRedirect(request, error);
  }

  if (!code || !state) {
    return signupRedirect(request, "missing_code");
  }

  try {
    assertAuthConfigured();

    const cookieStore = await cookies();
    const savedState = cookieStore.get("google_login_state")?.value;
    const codeVerifier = cookieStore.get("google_login_verifier")?.value;
    const intent = parseOAuthIntent(cookieStore.get("google_login_intent")?.value);

    cookieStore.delete("google_login_state");
    cookieStore.delete("google_login_verifier");
    cookieStore.delete("google_login_intent");

    if (!savedState || !codeVerifier || savedState !== state) {
      return signupRedirect(request, "invalid_state");
    }

    const tokens = await exchangeGoogleAuthorizationCode(code, codeVerifier);
    const googleUser = await fetchGoogleUser(tokens.accessToken);

    if (!googleUser.email) {
      return signupRedirect(request, "google_email_required");
    }

    const result = await signInWithOAuthProfile(
      {
        provider: "google",
        providerUserId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
      intent
    );

    if (result.isNewUser) {
      cookieStore.set("poh_oauth_new_user", "1", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      });
    }

    return dashboardRedirect(request, result.isNewUser);
  } catch (err) {
    console.error("Google login callback error:", err);
    if (err instanceof OAuthAccountError) {
      return signupRedirect(request, err.code);
    }
    const message = getAuthErrorMessage(err, "google_signin_failed");
    return signupRedirect(request, message.slice(0, 120));
  }
}
