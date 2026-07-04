"use client";

import OnboardingTour, { type TourStep } from "./OnboardingTour";
import { ONBOARDING_KEYS } from "@/lib/onboarding";

type Props = {
  hasPosts: boolean;
  hasImages: boolean;
};

export default function ToggleOnboarding({ hasPosts, hasImages }: Props) {
  if (!hasPosts) return null;

  const steps: TourStep[] = [
    {
      targetId: "toggle-text-detection",
      title: "Text detection toggle",
      body: "Turn this on to scan a post's text for AI-generated writing. Results appear beside the toggle.",
      placement: "bottom",
    },
  ];

  if (hasImages) {
    steps.push({
      targetId: "toggle-image-detection",
      title: "Image detection toggle",
      body: "Posts with photos get an image toggle too. Flip it on to check whether media looks AI-generated.",
      placement: "top",
    });
  }

  return <OnboardingTour steps={steps} storageKey={ONBOARDING_KEYS.toggles} />;
}
