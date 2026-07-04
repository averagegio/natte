"use client";

import { useState } from "react";
import GlossyCard from "./GlossyCard";

export type SubscriptionInfo = {
  tier: string;
  tierName: string;
  billingInterval: string;
  status: string;
  usage: number;
  limit: number | null;
};

type Props = {
  subscription: SubscriptionInfo | null;
  onSync: (subscription: SubscriptionInfo | null) => void;
};

export default function SubscriptionStatus({ subscription, onSync }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function syncSubscription() {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch("/api/subscription", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to sync subscription");
        return;
      }

      onSync({
        tier: json.subscription.tier,
        tierName: json.subscription.tierName,
        billingInterval: json.subscription.billingInterval,
        status: json.subscription.status,
        usage: json.usage,
        limit: json.limit,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <GlossyCard className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Subscription</h2>
          {subscription ? (
            <div className="mt-2 space-y-1 text-sm text-white/60">
              <p>
                <span className="text-white">{subscription.tierName}</span> plan ·{" "}
                {subscription.billingInterval}
              </p>
              <p>
                Status:{" "}
                <span className="text-emerald-300">{subscription.status}</span>
              </p>
              {subscription.limit !== null && (
                <p>
                  Detections this month: {subscription.usage} / {subscription.limit}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/50">
              No active subscription found in the app yet. If you already paid in Stripe,
              sync your subscription below.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={syncSubscription}
          disabled={syncing}
          className="self-start rounded-full border border-violet-500/40 bg-violet-500/10 px-5 py-2 text-sm font-medium text-violet-300 transition hover:border-violet-500/60 hover:bg-violet-500/20 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : subscription ? "Refresh from Stripe" : "Sync subscription"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </GlossyCard>
  );
}
