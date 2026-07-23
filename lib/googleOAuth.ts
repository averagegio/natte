import { createHash, randomBytes } from "crypto";
import { getGoogleAppConfig } from "./googleConfig";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_OAUTH_SCOPES = ["openid", "email", "profile"];

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateGoogleCodeVerifier() {
  return base64UrlEncode(randomBytes(32));
}

export function generateGoogleCodeChallenge(verifier: string) {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export function generateGoogleOAuthState() {
  return base64UrlEncode(randomBytes(16));
}

export function buildGoogleAuthorizationUrl(state: string, codeChallenge: string) {
  const config = getGoogleAppConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });

  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleOAuthTokens = {
  accessToken: string;
  idToken?: string;
  expiresIn?: number;
  tokenType: string;
};

export async function exchangeGoogleAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<GoogleOAuthTokens> {
  const config = getGoogleAppConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return {
    accessToken: json.access_token,
    idToken: json.id_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type || "bearer",
  };
}

export async function fetchGoogleUser(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google user lookup failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!json.sub) {
    throw new Error("Google user lookup returned no subject");
  }

  return {
    id: String(json.sub),
    email: json.email ? String(json.email).toLowerCase() : null,
    emailVerified: Boolean(json.email_verified),
    name: json.name ? String(json.name) : null,
    picture: json.picture ? String(json.picture) : null,
  };
}
