"use client";

import OnboardingTour, { type TourStep } from "./OnboardingTour";
import { ONBOARDING_KEYS } from "@/lib/onboarding";

type Props = {
  hasConnection: boolean;
};

export default function DashboardOnboarding({ hasConnection }: Props) {
  const steps: TourStep[] = [
    {
      targetId: "dashboard-header",
      title: "Your profile",
      body: "Add a display name and photo so your dashboard feels like home.",
      placement: "bottom",
    },
    {
      targetId: "dashboard-subscription",
      title: "Subscription",
      body: "Sync your plan here to unlock AI detection on posts and images.",
      placement: "bottom",
    },
    {
      targetId: "dashboard-connections",
      title: hasConnection ? "X connected" : "Connect X",
      body: hasConnection
        ? "Your X account is linked. Live posts will load on the homepage."
        : "Connect your X account so the homepage can load your real posts.",
      placement: "top",
    },
    {
      targetId: "dashboard-home-link",
      title: "Try detection toggles",
      body: "Head back to the homepage to flip AI detection on for your post text and images.",
      placement: "left",
    },
  ];

  return <OnboardingTour steps={steps} storageKey={ONBOARDING_KEYS.dashboard} />;
}
