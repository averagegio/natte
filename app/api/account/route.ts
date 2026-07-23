import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

async function cancelStripeBilling(userId: string) {
  const sql = getDb();
  const users = await sql`
    SELECT stripe_customer_id
    FROM users
    WHERE id = ${userId}
  `;

  if (users.length === 0) {
    return;
  }

  const customerId = users[0].stripe_customer_id as string | null;
  const subscriptions = await sql`
    SELECT stripe_subscription_id
    FROM subscriptions
    WHERE user_id = ${userId}
      AND stripe_subscription_id IS NOT NULL
      AND status = 'active'
  `;

  if (!customerId && subscriptions.length === 0) {
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    if (subscriptions.length > 0) {
      throw new Error(
        "Stripe is not configured, so active subscriptions cannot be cancelled. Contact support."
      );
    }
    return;
  }

  const stripe = getStripe();

  for (const row of subscriptions) {
    const subscriptionId = row.stripe_subscription_id as string;
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Already cancelled/missing in Stripe is fine — local delete can continue.
      if (!message.toLowerCase().includes("no such subscription")) {
        throw err;
      }
    }
  }

  if (customerId) {
    try {
      // Cancel any remaining Stripe-side subscriptions not mirrored locally.
      const remote = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      for (const sub of remote.data) {
        if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
          await stripe.subscriptions.cancel(sub.id);
        }
      }
      await stripe.customers.del(customerId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("no such customer")) {
        console.error("Stripe customer cleanup failed:", err);
      }
    }
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await cancelStripeBilling(userId);

    const sql = getDb();
    const deleted = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    const message =
      err instanceof Error && err.message.includes("Stripe is not configured")
        ? err.message
        : "Failed to delete account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
