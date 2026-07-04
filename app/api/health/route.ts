import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDetectorStatus } from "@/lib/detector";
import { isSubscriptionRequiredForDetect } from "@/lib/subscriptions";
import { getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.database_url = process.env.DATABASE_URL ? "set" : "missing";
  checks.auth_secret = process.env.AUTH_SECRET ? "set" : "missing";

  const detectorStatus = getDetectorStatus();
  checks.ai_detector_url = detectorStatus.configured ? "set" : "missing";
  checks.ai_detector_key = detectorStatus.hasApiKey ? "set" : "missing";
  checks.detect_require_subscription = isSubscriptionRequiredForDetect() ? "enabled" : "disabled";

  const xStatus = getXAppStatus();
  checks.x_oauth = xStatus.oauthConfigured ? "configured" : "missing";
  checks.x_bearer_token = xStatus.bearerTokenConfigured ? "set" : "missing";
  checks.x_api_key = xStatus.apiKeyConfigured ? "set" : "missing";

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: false,
      checks,
      message: "DATABASE_URL is not set in environment variables.",
    });
  }

  try {
    const sql = getDb();
    await sql`SELECT 1 AS ok`;

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'subscriptions', 'widget_connections', 'detection_usage')
    `;

    const found = tables.map((t) => String(t.table_name));
    checks.users_table = found.includes("users") ? "ok" : "missing";
    checks.subscriptions_table = found.includes("subscriptions") ? "ok" : "missing";
    checks.widget_connections_table = found.includes("widget_connections") ? "ok" : "missing";
    checks.detection_usage_table = found.includes("detection_usage") ? "ok" : "missing";

    const ready =
      checks.auth_secret === "set" &&
      checks.users_table === "ok" &&
      checks.ai_detector_url === "set";

    return NextResponse.json({
      ok: ready,
      checks,
      detector: detectorStatus,
      x: xStatus,
      message: ready
        ? "Auth, database, and AI detector are ready."
        : "Configuration incomplete. See checks for details.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database check failed";
    return NextResponse.json({
      ok: false,
      checks,
      message,
    });
  }
}
