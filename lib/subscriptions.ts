import { getDb } from "./db";
import { PRICING_TIERS } from "./pricing";

export type ActiveSubscription = {
  id: string;
  tier: string;
  billing_interval: string;
  status: string;
};

const TIER_LIMITS: Record<string, number | null> = {
  starter: 1000,
  pro: 1000,
  business: null,
};

function requireSubscriptionEnabled() {
  const flag = process.env.DETECT_REQUIRE_SUBSCRIPTION?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.NODE_ENV === "production";
}

export function isSubscriptionRequiredForDetect() {
  return requireSubscriptionEnabled();
}

export async function getActiveSubscription(
  userId: string
): Promise<ActiveSubscription | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, tier, billing_interval, status
    FROM subscriptions
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return rows[0] as ActiveSubscription;
}

export function getMonthlyDetectionLimit(tierId: string): number | null {
  return TIER_LIMITS[tierId] ?? TIER_LIMITS.starter;
}

export async function getMonthlyDetectionUsage(userId: string): Promise<number> {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM detection_usage
      WHERE user_id = ${userId}
        AND created_at >= date_trunc('month', NOW())
    `;

    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function recordDetectionUsage(userId: string) {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO detection_usage (user_id)
      VALUES (${userId})
    `;
  } catch (err) {
    console.error("Failed to record detection usage:", err);
  }
}

export async function checkDetectionAccess(userId: string | null): Promise<{
  allowed: boolean;
  reason?: string;
  subscription?: ActiveSubscription | null;
  usage?: number;
  limit?: number | null;
}> {
  if (!isSubscriptionRequiredForDetect()) {
    return { allowed: true };
  }

  if (!userId) {
    return {
      allowed: false,
      reason: "Sign in and subscribe to use AI detection.",
    };
  }

  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return {
      allowed: false,
      reason: "An active subscription is required to use AI detection.",
      subscription: null,
    };
  }

  const limit = getMonthlyDetectionLimit(subscription.tier);
  if (limit === null) {
    return { allowed: true, subscription, limit: null };
  }

  const usage = await getMonthlyDetectionUsage(userId);
  if (usage >= limit) {
    return {
      allowed: false,
      reason: `Monthly detection limit reached (${limit}). Upgrade your plan for more.`,
      subscription,
      usage,
      limit,
    };
  }

  return {
    allowed: true,
    subscription,
    usage,
    limit,
  };
}

export function getTierName(tierId: string) {
  return PRICING_TIERS.find((tier) => tier.id === tierId)?.name ?? tierId;
}
