"use client";

import { useState } from "react";
import GlossyCard from "./GlossyCard";
import {
  PRICING_TIERS,
  YEARLY_DISCOUNT,
  getMonthlyEquivalent,
  getTierPrice,
  type BillingInterval,
} from "@/lib/pricing";

export default function PricingCards() {
  const [intervals, setIntervals] = useState<Record<string, BillingInterval>>({
    starter: "monthly",
    pro: "monthly",
    business: "monthly",
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setInterval(tierId: string, interval: BillingInterval) {
    setIntervals((prev) => ({ ...prev, [tierId]: interval }));
  }

  async function handleCheckout(tierId: string) {
    setLoading(tierId);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, interval: intervals[tierId] }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Checkout failed");
        return;
      }

      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const interval = intervals[tier.id];
          const price = getTierPrice(tier, interval);
          const monthlyEq = getMonthlyEquivalent(tier, interval);

          return (
            <GlossyCard
              key={tier.id}
              className={tier.highlighted ? "ring-2 ring-sky-500/40" : ""}
            >
              {tier.highlighted && (
                <span className="mb-4 inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-semibold text-sky-300">
                  Most popular
                </span>
              )}

              <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
              <p className="mt-2 text-sm text-white/50">{tier.description}</p>

              <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setInterval(tier.id, "monthly")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    interval === "monthly"
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setInterval(tier.id, "yearly")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    interval === "yearly"
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Yearly
                  <span className="ml-1 text-emerald-400">-{YEARLY_DISCOUNT * 100}%</span>
                </button>
              </div>

              <div className="mt-6">
                <span className="text-4xl font-bold text-white">${price}</span>
                <span className="text-white/50">
                  /{interval === "monthly" ? "mo" : "yr"}
                </span>
                {interval === "yearly" && (
                  <p className="mt-1 text-xs text-emerald-400">
                    ${monthlyEq}/mo billed annually
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/60">
                    <svg
                      className="mt-0.5 shrink-0 text-sky-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8l3.5 3.5L13 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleCheckout(tier.id)}
                disabled={loading === tier.id}
                className={`mt-8 w-full rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:opacity-90"
                    : "border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
                }`}
              >
                {loading === tier.id ? "Redirecting..." : "Get started"}
              </button>
            </GlossyCard>
          );
        })}
      </div>
    </div>
  );
}
