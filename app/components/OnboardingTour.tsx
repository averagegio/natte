"use client";

import { useCallback, useEffect, useState } from "react";
import { completeOnboarding, shouldShowOnboarding } from "@/lib/onboarding";

export type TourStep = {
  targetId: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type Props = {
  steps: TourStep[];
  storageKey: string;
  enabled?: boolean;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function OnboardingTour({ steps, storageKey, enabled = true }: Props) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const dismiss = useCallback(() => {
    completeOnboarding(storageKey);
    setActive(false);
  }, [storageKey]);

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  useEffect(() => {
    if (!enabled || steps.length === 0 || !shouldShowOnboarding(storageKey)) return;

    const timer = window.setTimeout(() => {
      const firstTarget = document.getElementById(steps[0].targetId);
      if (firstTarget) {
        setActive(true);
        setStepIndex(0);
      } else {
        completeOnboarding(storageKey);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [enabled, steps, storageKey]);

  useEffect(() => {
    if (!active || !step) return;
    updateRect();

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, step, updateRect]);

  if (!active || !step || !targetRect) return null;

  const placement = step.placement ?? "bottom";
  const pad = 8;
  const spotlight = {
    top: targetRect.top - pad,
    left: targetRect.left - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  const tooltipWidth = 300;
  let tooltipTop = spotlight.top + spotlight.height + 16;
  let tooltipLeft = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;

  if (placement === "top") {
    tooltipTop = spotlight.top - 180;
  } else if (placement === "left") {
    tooltipTop = spotlight.top + spotlight.height / 2 - 60;
    tooltipLeft = spotlight.left - tooltipWidth - 16;
  } else if (placement === "right") {
    tooltipTop = spotlight.top + spotlight.height / 2 - 60;
    tooltipLeft = spotlight.left + spotlight.width + 16;
  }

  tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16));

  const arrowClass =
    placement === "top"
      ? "bottom-0 left-1/2 -mb-2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-sky-500/40 border-b-transparent"
      : placement === "left"
        ? "right-0 top-1/2 -mr-2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-sky-500/40 border-r-transparent"
        : placement === "right"
          ? "left-0 top-1/2 -ml-2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-sky-500/40 border-l-transparent"
          : "top-0 left-1/2 -mt-2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-sky-500/40 border-t-transparent";

  function goNext() {
    if (isLast) {
      dismiss();
      return;
    }

    let nextIndex = stepIndex + 1;
    while (nextIndex < steps.length) {
      if (document.getElementById(steps[nextIndex].targetId)) {
        setStepIndex(nextIndex);
        return;
      }
      nextIndex += 1;
    }

    dismiss();
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      <div className="absolute inset-0 bg-black/70" onClick={dismiss} />

      <div
        className="pointer-events-none absolute rounded-2xl border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />

      <div
        className="absolute z-[101] w-[300px] rounded-2xl border border-sky-500/40 bg-black/95 p-5 shadow-2xl backdrop-blur-md"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div
          className={`absolute h-0 w-0 border-[8px] ${arrowClass}`}
          aria-hidden="true"
        />
        <p className="text-xs font-medium uppercase tracking-wide text-sky-300">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/60">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-white/40 transition hover:text-white/70"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {isLast ? "Got it" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
