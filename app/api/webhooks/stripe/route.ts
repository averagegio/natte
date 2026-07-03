import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sql = getDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tierId = session.metadata?.tierId;
        const interval = session.metadata?.interval;

        if (userId && tierId && interval && session.subscription) {
          await sql`
            INSERT INTO subscriptions (user_id, stripe_subscription_id, tier, billing_interval, status)
            VALUES (${userId}, ${String(session.subscription)}, ${tierId}, ${interval}, 'active')
            ON CONFLICT (stripe_subscription_id) DO UPDATE
            SET status = 'active', tier = ${tierId}, billing_interval = ${interval}, updated_at = NOW()
          `;
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status === "active" ? "active" : "inactive";
        await sql`
          UPDATE subscriptions
          SET status = ${status}, updated_at = NOW()
          WHERE stripe_subscription_id = ${subscription.id}
        `;
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
