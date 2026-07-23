export type XAppConfig = {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  apiSecret?: string;
  bearerToken?: string;
  redirectUri: string;
  defaultUsername: string;
};

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getXLoginRedirectUri(): string {
  const appUrl = firstEnv("NEXT_PUBLIC_APP_URL", "APP_BASE_URL") || "http://127.0.0.1:3000";
  return (
    firstEnv("X_LOGIN_REDIRECT_URI") ||
    `${appUrl.replace(/\/$/, "")}/api/auth/x/callback`
  );
}

export function getXAppConfig(): XAppConfig | null {
  const clientId = firstEnv("X_CLIENT_ID", "TWITTER_CLIENT_ID");
  const clientSecret = firstEnv("X_CLIENT_SECRET", "TWITTER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return null;
  }

  const appUrl = firstEnv("NEXT_PUBLIC_APP_URL", "APP_BASE_URL") || "http://127.0.0.1:3000";
  const redirectUri =
    firstEnv("X_REDIRECT_URI", "TWITTER_REDIRECT_URI") ||
    `${appUrl.replace(/\/$/, "")}/api/connections/x/callback`;

  return {
    clientId,
    clientSecret,
    apiKey: firstEnv("X_API_KEY", "TWITTER_API_KEY", "X_CONSUMER_KEY"),
    apiSecret: firstEnv("X_API_SECRET", "TWITTER_API_SECRET", "X_CONSUMER_SECRET"),
    bearerToken: firstEnv(
      "X_BEARER_TOKEN",
      "TWITTER_BEARER_TOKEN",
      "X_API_BEARER_TOKEN"
    ),
    redirectUri,
    defaultUsername: firstEnv("X_DEFAULT_USERNAME") || "natte",
  };
}

export function getXBearerToken(): string | undefined {
  return (
    getXAppConfig()?.bearerToken ||
    firstEnv("X_BEARER_TOKEN", "TWITTER_BEARER_TOKEN", "X_API_BEARER_TOKEN")
  );
}

export function getXDefaultUsername(): string {
  return getXAppConfig()?.defaultUsername || firstEnv("X_DEFAULT_USERNAME") || "natte";
}

export function isXOAuthConfigured(): boolean {
  return getXAppConfig() !== null;
}

export function getXAppStatus() {
  const config = getXAppConfig();
  return {
    oauthConfigured: config !== null,
    bearerTokenConfigured: Boolean(getXBearerToken()),
    apiKeyConfigured: Boolean(config?.apiKey),
    redirectUri: config?.redirectUri ?? null,
    loginRedirectUri: config ? getXLoginRedirectUri() : null,
    defaultUsername: getXDefaultUsername(),
  };
}
