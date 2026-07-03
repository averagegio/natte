import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  PRICING_TIERS,
  getStripePriceEnvKey,
  getTierPrice,
  type BillingInterval,
} from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const { tierId, interval } = await request.json() as {
      tierId: string;
      interval: BillingInterval;
    };

    const tier = PRICING_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!["monthly", "yearly"].includes(interval)) {
      return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
    }

    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const sql = getDb();
    const users = await sql`SELECT id, email, stripe_customer_id FROM users WHERE id = ${userId}`;
    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];
    const stripe = getStripe();
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let customerId = user.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}`;
    }

    const priceEnvKey = getStripePriceEnvKey(tierId, interval);
    const stripePriceId = process.env[priceEnvKey];

    const priceAmount = getTierPrice(tier, interval) * 100;
    const lineItems = stripePriceId
      ? [{ price: stripePriceId, quantity: 1 }]
      : [{
          price_data: {
            currency: "usd",
            unit_amount: priceAmount,
            recurring: {
              interval: interval === "monthly" ? "month" as const : "year" as const,
            },
            product_data: {
              name: `Proof of Human — ${tier.name}`,
              description: tier.description,
            },
          },
          quantity: 1,
        }];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId,
        tierId,
        interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    const message = err instanceof Error && err.message.includes("STRIPE_SECRET_KEY")
      ? "Stripe is not configured"
      : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
