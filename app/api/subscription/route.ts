import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import {
  getActiveSubscription,
  getMonthlyDetectionLimit,
  getMonthlyDetectionUsage,
  getTierName,
  syncSubscriptionFromStripe,
} from "@/lib/subscriptions";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let subscription = await getActiveSubscription(userId);
    let synced = false;

    if (!subscription) {
      subscription = await syncSubscriptionFromStripe(userId);
      synced = Boolean(subscription);
    }

    const usage = subscription ? await getMonthlyDetectionUsage(userId) : 0;
    const limit = subscription ? getMonthlyDetectionLimit(subscription.tier) : null;

    return NextResponse.json({
      subscription: subscription
        ? {
            tier: subscription.tier,
            tierName: getTierName(subscription.tier),
            billingInterval: subscription.billing_interval,
            status: subscription.status,
          }
        : null,
      synced,
      usage,
      limit,
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await syncSubscriptionFromStripe(userId);
    if (!subscription) {
      return NextResponse.json(
        {
          error: "No active Stripe subscription found for this account.",
        },
        { status: 404 }
      );
    }

    const usage = await getMonthlyDetectionUsage(userId);
    const limit = getMonthlyDetectionLimit(subscription.tier);

    return NextResponse.json({
      subscription: {
        tier: subscription.tier,
        tierName: getTierName(subscription.tier),
        billingInterval: subscription.billing_interval,
        status: subscription.status,
      },
      synced: true,
      usage,
      limit,
    });
  } catch (err) {
    console.error("Subscription sync error:", err);
    return NextResponse.json({ error: "Failed to sync subscription" }, { status: 500 });
  }
}
