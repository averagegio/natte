export type BillingInterval = "monthly" | "yearly";

export type PricingTier = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  highlighted?: boolean;
};

export const YEARLY_DISCOUNT = 0.2; // 20% off yearly

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For individuals exploring AI detection.",
    monthlyPrice: 7,
    features: [
      "1,000 detections / month",
      "Text + image AI detection",
      "Browser widget access",
      "Email support",
      "Basic API access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For individuals exploring AI detection.",
    monthlyPrice: 50,
    highlighted: true,
    features: [
      "1,000 detections / month",
      "Text + image AI detection",
      "Browser widget access",
      "Email support",
      "Basic API access",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For organizations at scale.",
    monthlyPrice: 100,
    features: [
      "Unlimited detections",
      "Custom widget branding",
      "Dedicated support",
      "Team seats (up to 10)",
      "SLA & audit logs",
    ],
  },
];

export function getTierPrice(tier: PricingTier, interval: BillingInterval) {
  if (interval === "monthly") {
    return tier.monthlyPrice;
  }
  const yearlyTotal = tier.monthlyPrice * 12 * (1 - YEARLY_DISCOUNT);
  return Math.round(yearlyTotal);
}

export function getMonthlyEquivalent(tier: PricingTier, interval: BillingInterval) {
  if (interval === "monthly") {
    return tier.monthlyPrice;
  }
  return Math.round((getTierPrice(tier, "yearly") / 12) * 100) / 100;
}

export function getStripePriceEnvKey(tierId: string, interval: BillingInterval) {
  return `STRIPE_PRICE_${tierId.toUpperCase()}_${interval.toUpperCase()}`;
}
