import { createHash, randomBytes } from "crypto";
import { getXAppConfig } from "./xConfig";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USERS_ME_URL = "https://api.twitter.com/2/users/me";

export const X_OAUTH_SCOPES = ["tweet.read", "users.read", "offline.access"];

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateCodeVerifier() {
  return base64UrlEncode(randomBytes(32));
}

export function generateCodeChallenge(verifier: string) {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export function generateOAuthState() {
  return base64UrlEncode(randomBytes(16));
}

export function buildAuthorizationUrl(state: string, codeChallenge: string) {
  const config = getXAppConfig();
  if (!config) {
    throw new Error("X OAuth is not configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: X_OAUTH_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${X_AUTHORIZE_URL}?${params.toString()}`;
}

export type XOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
};

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<XOAuthTokens> {
  const config = getXAppConfig();
  if (!config) {
    throw new Error("X OAuth is not configured");
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
    "base64"
  );

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type || "bearer",
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<XOAuthTokens> {
  const config = getXAppConfig();
  if (!config) {
    throw new Error("X OAuth is not configured");
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: config.clientId,
  });

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
    "base64"
  );

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X token refresh failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiresIn: json.expires_in,
    tokenType: json.token_type || "bearer",
  };
}

export async function fetchAuthenticatedUser(accessToken: string) {
  const res = await fetch(X_USERS_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X user lookup failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const user = json.data;
  if (!user?.username) {
    throw new Error("X user lookup returned no username");
  }

  return {
    id: String(user.id),
    username: String(user.username),
    name: user.name ? String(user.name) : undefined,
  };
}
