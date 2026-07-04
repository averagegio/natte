import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
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

    const sql = getDb();
    let users;
    try {
      users = await sql`
        SELECT id, email, name, profile_pic, created_at
        FROM users WHERE id = ${userId}
      `;
    } catch {
      users = await sql`
        SELECT id, email, name, created_at
        FROM users WHERE id = ${userId}
      `;
    }

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let connections: unknown[] = [];
    try {
      connections = await sql`
        SELECT id, provider, x_username, status, created_at, updated_at
        FROM widget_connections
        WHERE user_id = ${userId} AND status != 'disconnected'
        ORDER BY created_at DESC
      `;
    } catch {
      connections = [];
    }

    let subscription =
      (await getActiveSubscription(userId)) ?? (await syncSubscriptionFromStripe(userId));

    const usage = subscription ? await getMonthlyDetectionUsage(userId) : 0;
    const limit = subscription ? getMonthlyDetectionLimit(subscription.tier) : null;

    return NextResponse.json({
      user: { ...users[0], profile_pic: users[0].profile_pic ?? null },
      connections,
      subscription: subscription
        ? {
            tier: subscription.tier,
            tierName: getTierName(subscription.tier),
            billingInterval: subscription.billing_interval,
            status: subscription.status,
            usage,
            limit,
          }
        : null,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
