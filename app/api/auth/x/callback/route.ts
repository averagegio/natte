import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { assertAuthConfigured, getAuthErrorMessage } from "@/lib/auth-errors";
import { signInWithOAuthProfile } from "@/lib/oauthAccounts";
import {
  exchangeLoginAuthorizationCode,
  fetchAuthenticatedUser,
} from "@/lib/xOAuth";

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
    const savedState = cookieStore.get("x_login_state")?.value;
    const codeVerifier = cookieStore.get("x_login_verifier")?.value;

    cookieStore.delete("x_login_state");
    cookieStore.delete("x_login_verifier");

    if (!savedState || !codeVerifier || savedState !== state) {
      return signupRedirect(request, "invalid_state");
    }

    const tokens = await exchangeLoginAuthorizationCode(code, codeVerifier);
    const xUser = await fetchAuthenticatedUser(tokens.accessToken);

    const result = await signInWithOAuthProfile({
      provider: "x",
      providerUserId: xUser.id,
      name: xUser.name || xUser.username,
      username: xUser.username,
      avatarUrl: xUser.profileImageUrl || null,
      email: null,
    });

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
    console.error("X login callback error:", err);
    const message = getAuthErrorMessage(err, "x_signin_failed");
    return signupRedirect(request, message.slice(0, 120));
  }
}
