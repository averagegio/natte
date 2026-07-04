import { getDb } from "./db";
import { PRICING_TIERS } from "./pricing";
import { getStripe } from "./stripe";

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

  const subscription =
    (await getActiveSubscription(userId)) ?? (await syncSubscriptionFromStripe(userId));
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

function inferTierFromAmount(amountCents: number, interval: "monthly" | "yearly") {
  const amount = amountCents / 100;
  for (const tier of PRICING_TIERS) {
    if (interval === "monthly" && tier.monthlyPrice === amount) {
      return tier.id;
    }
    if (interval === "yearly" && Math.round(tier.monthlyPrice * 12 * 0.8) === amount) {
      return tier.id;
    }
  }
  return null;
}

export async function syncSubscriptionFromStripe(
  userId: string
): Promise<ActiveSubscription | null> {
  try {
    const sql = getDb();
    const users = await sql`
      SELECT stripe_customer_id, email
      FROM users
      WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return null;
    }

    const stripe = getStripe();
    let customerId = users[0].stripe_customer_id as string | null;

    if (!customerId) {
      const customers = await stripe.customers.list({
        email: users[0].email,
        limit: 1,
      });
      if (customers.data.length === 0) {
        return null;
      }
      customerId = customers.data[0].id;
      await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}`;
    }

    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
      expand: ["data.items.data.price"],
    });

    if (subscriptions.data.length === 0) {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
        expand: ["data.items.data.price"],
      });
    }

    if (subscriptions.data.length === 0) {
      return null;
    }

    const sub = subscriptions.data[0];
    const price = sub.items.data[0]?.price;
    const billingInterval =
      price?.recurring?.interval === "year" ? "yearly" : "monthly";

    let tierId = sub.metadata?.tierId || null;
    let interval = sub.metadata?.interval || billingInterval;

    if (!tierId) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 10,
      });
      const session = sessions.data.find(
        (item) => String(item.subscription) === sub.id
      );
      if (session?.metadata?.tierId) {
        tierId = session.metadata.tierId;
        interval = session.metadata.interval || interval;
      }
    }

    if (!tierId && price?.unit_amount) {
      tierId = inferTierFromAmount(price.unit_amount, billingInterval);
    }

    if (!tierId) {
      tierId = "starter";
    }

    const status = sub.status === "active" || sub.status === "trialing" ? "active" : "inactive";

    await sql`
      INSERT INTO subscriptions (
        user_id,
        stripe_subscription_id,
        stripe_price_id,
        tier,
        billing_interval,
        status
      )
      VALUES (
        ${userId},
        ${sub.id},
        ${price?.id ?? null},
        ${tierId},
        ${interval},
        ${status}
      )
      ON CONFLICT (stripe_subscription_id) DO UPDATE
      SET
        stripe_price_id = ${price?.id ?? null},
        tier = ${tierId},
        billing_interval = ${interval},
        status = ${status},
        updated_at = NOW()
    `;

    return getActiveSubscription(userId);
  } catch (err) {
    console.error("Stripe subscription sync failed:", err);
    return null;
  }
}
