import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserId } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { exchangeAuthorizationCode, fetchAuthenticatedUser } from "@/lib/xOAuth";

function dashboardRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return dashboardRedirect(request, { x_error: error });
  }

  if (!code || !state) {
    return dashboardRedirect(request, { x_error: "missing_code" });
  }

  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.redirect(new URL("/signup", request.url));
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get("x_oauth_state")?.value;
    const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;

    cookieStore.delete("x_oauth_state");
    cookieStore.delete("x_oauth_verifier");

    if (!savedState || !codeVerifier || savedState !== state) {
      return dashboardRedirect(request, { x_error: "invalid_state" });
    }

    const tokens = await exchangeAuthorizationCode(code, codeVerifier);
    const xUser = await fetchAuthenticatedUser(tokens.accessToken);

    const sql = getDb();
    const rows = await sql`
      INSERT INTO widget_connections (
        user_id,
        provider,
        x_username,
        bearer_token_encrypted,
        refresh_token_encrypted,
        auth_type,
        status
      )
      VALUES (
        ${userId},
        'x',
        ${xUser.username},
        ${encryptSecret(tokens.accessToken)},
        ${tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null},
        'oauth2',
        'connected'
      )
      ON CONFLICT (user_id, provider, x_username) DO UPDATE
      SET
        bearer_token_encrypted = ${encryptSecret(tokens.accessToken)},
        refresh_token_encrypted = ${tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null},
        auth_type = 'oauth2',
        status = 'connected',
        updated_at = NOW()
      RETURNING id, provider, x_username, status, created_at, updated_at
    `;

    return dashboardRedirect(request, { x_connected: rows[0].x_username });
  } catch (err) {
    console.error("X OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "oauth_failed";
    return dashboardRedirect(request, { x_error: message.slice(0, 120) });
  }
}
