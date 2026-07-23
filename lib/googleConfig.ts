export type GoogleAppConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getGoogleAppConfig(): GoogleAppConfig | null {
  const clientId = firstEnv("GOOGLE_CLIENT_ID");
  const clientSecret = firstEnv("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return null;
  }

  const appUrl = firstEnv("NEXT_PUBLIC_APP_URL", "APP_BASE_URL") || "http://127.0.0.1:3000";
  const redirectUri =
    firstEnv("GOOGLE_REDIRECT_URI") ||
    `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function isGoogleOAuthConfigured(): boolean {
  return getGoogleAppConfig() !== null;
}

export function getGoogleAuthStatus() {
  const config = getGoogleAppConfig();
  return {
    oauthConfigured: config !== null,
    redirectUri: config?.redirectUri ?? null,
  };
}
