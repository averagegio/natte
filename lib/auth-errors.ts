export function getAuthErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof Error)) return fallback;

  const msg = err.message;

  if (msg.includes("DATABASE_URL")) {
    return "Database is not configured. Add DATABASE_URL in Vercel env vars.";
  }
  if (msg.includes("AUTH_SECRET")) {
    return "Auth is not configured. Add AUTH_SECRET in Vercel env vars.";
  }
  if (msg.includes('relation "users" does not exist')) {
    return "Database tables are missing. Run npm run db:migrate or paste scripts/migrate.sql in Neon.";
  }
  if (msg.includes("password authentication failed") || msg.includes("connection")) {
    return "Database connection failed. Check your DATABASE_URL in Vercel.";
  }

  return fallback;
}

export function assertAuthConfigured() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is not configured");
  }
}
