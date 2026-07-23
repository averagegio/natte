"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  /** Ask before starting the tour (default true). */
  askBeforeStart?: boolean;
  promptTitle?: string;
  promptBody?: string;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Placement = "top" | "bottom" | "left" | "right";

type TooltipLayout = {
  top: number;
  left: number;
  placement: Placement;
};

const VIEW_MARGIN = 16;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_ESTIMATE_HEIGHT = 190;
const SPOTLIGHT_PAD = 8;

function measureRect(el: Element): Rect {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function fitsVertically(top: number, height: number) {
  return top >= VIEW_MARGIN && top + height <= window.innerHeight - VIEW_MARGIN;
}

function fitsHorizontally(left: number, width: number) {
  return left >= VIEW_MARGIN && left + width <= window.innerWidth - VIEW_MARGIN;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeTooltipLayout(
  target: Rect,
  preferred: Placement,
  tooltipHeight: number
): TooltipLayout {
  const spotlight = {
    top: target.top - SPOTLIGHT_PAD,
    left: target.left - SPOTLIGHT_PAD,
    width: target.width + SPOTLIGHT_PAD * 2,
    height: target.height + SPOTLIGHT_PAD * 2,
  };

  const candidates: Placement[] = [
    preferred,
    ...(["bottom", "top", "right", "left"] as Placement[]).filter((p) => p !== preferred),
  ];

  for (const placement of candidates) {
    let top = 0;
    let left = 0;

    if (placement === "bottom") {
      top = spotlight.top + spotlight.height + 16;
      left = spotlight.left + spotlight.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (placement === "top") {
      top = spotlight.top - tooltipHeight - 16;
      left = spotlight.left + spotlight.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (placement === "left") {
      top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
      left = spotlight.left - TOOLTIP_WIDTH - 16;
    } else {
      top = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
      left = spotlight.left + spotlight.width + 16;
    }

    if (fitsVertically(top, tooltipHeight) && fitsHorizontally(left, TOOLTIP_WIDTH)) {
      return { top, left, placement };
    }
  }

  // Fallback: keep card fully on screen near the target.
  const left = clamp(
    spotlight.left + spotlight.width / 2 - TOOLTIP_WIDTH / 2,
    VIEW_MARGIN,
    window.innerWidth - TOOLTIP_WIDTH - VIEW_MARGIN
  );

  const spaceBelow = window.innerHeight - (spotlight.top + spotlight.height) - VIEW_MARGIN;
  const spaceAbove = spotlight.top - VIEW_MARGIN;
  const placeBottom = spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove;

  const top = placeBottom
    ? clamp(
        spotlight.top + spotlight.height + 16,
        VIEW_MARGIN,
        window.innerHeight - tooltipHeight - VIEW_MARGIN
      )
    : clamp(
        spotlight.top - tooltipHeight - 16,
        VIEW_MARGIN,
        window.innerHeight - tooltipHeight - VIEW_MARGIN
      );

  return { top, left, placement: placeBottom ? "bottom" : "top" };
}

function arrowClassFor(placement: Placement) {
  if (placement === "top") {
    return "bottom-0 left-1/2 -mb-2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-sky-500/40 border-b-transparent";
  }
  if (placement === "left") {
    return "right-0 top-1/2 -mr-2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-sky-500/40 border-r-transparent";
  }
  if (placement === "right") {
    return "left-0 top-1/2 -ml-2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-sky-500/40 border-l-transparent";
  }
  return "top-0 left-1/2 -mt-2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-sky-500/40 border-t-transparent";
}

export default function OnboardingTour({
  steps,
  storageKey,
  enabled = true,
  askBeforeStart = true,
  promptTitle = "Take a quick tour?",
  promptBody = "We can walk you through the key controls. It only takes a moment — or you can explore on your own.",
}: Props) {
  const [phase, setPhase] = useState<"idle" | "prompt" | "tour">("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipLayout, setTooltipLayout] = useState<TooltipLayout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const dismiss = useCallback(() => {
    completeOnboarding(storageKey);
    setPhase("idle");
    setTargetRect(null);
    setTooltipLayout(null);
  }, [storageKey]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setPhase("tour");
  }, []);

  useEffect(() => {
    if (!enabled || steps.length === 0 || !shouldShowOnboarding(storageKey)) return;

    const timer = window.setTimeout(() => {
      const firstTarget = document.getElementById(steps[0].targetId);
      if (!firstTarget) {
        completeOnboarding(storageKey);
        return;
      }

      if (askBeforeStart) {
        setPhase("prompt");
      } else {
        setPhase("tour");
        setStepIndex(0);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [askBeforeStart, enabled, steps, storageKey]);

  const syncTarget = useCallback(
    (options?: { scroll?: boolean }) => {
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (!el) {
        setTargetRect(null);
        return;
      }

      if (options?.scroll) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }

      setTargetRect(measureRect(el));
    },
    [step]
  );

  useEffect(() => {
    if (phase !== "tour" || !step) return;

    let cancelled = false;

    const run = (scroll: boolean) => {
      if (!cancelled) syncTarget({ scroll });
    };

    // Defer so we don't setState synchronously inside the effect body.
    const start = window.setTimeout(() => run(true), 0);
    const t1 = window.setTimeout(() => run(false), 350);
    const t2 = window.setTimeout(() => run(false), 700);

    const onResizeOrScroll = () => run(false);
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [phase, step, syncTarget]);

  useLayoutEffect(() => {
    if (phase !== "tour" || !targetRect || !step) return;

    const measuredHeight = tooltipRef.current?.offsetHeight || TOOLTIP_ESTIMATE_HEIGHT;
    const preferred = step.placement ?? "bottom";
    setTooltipLayout(computeTooltipLayout(targetRect, preferred, measuredHeight));
  }, [phase, targetRect, step, stepIndex]);

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

  if (phase === "prompt") {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-prompt-title"
        aria-describedby="tour-prompt-body"
      >
        <div className="absolute inset-0 bg-black/70" onClick={dismiss} />
        <div className="relative z-[101] w-full max-w-md rounded-3xl border border-sky-500/35 bg-black/95 p-7 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-300 uppercase">
            First-time visit
          </p>
          <h2 id="tour-prompt-title" className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {promptTitle}
          </h2>
          <p id="tour-prompt-body" className="mt-3 text-sm leading-7 text-white/55">
            {promptBody}
          </p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/65 transition hover:border-white/30 hover:text-white"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={startTour}
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Start tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase !== "tour" || !step || !targetRect) return null;

  const placement = tooltipLayout?.placement ?? step.placement ?? "bottom";
  const spotlight = {
    top: targetRect.top - SPOTLIGHT_PAD,
    left: targetRect.left - SPOTLIGHT_PAD,
    width: targetRect.width + SPOTLIGHT_PAD * 2,
    height: targetRect.height + SPOTLIGHT_PAD * 2,
  };

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
        ref={tooltipRef}
        className="absolute z-[101] w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-sky-500/40 bg-black/95 p-5 shadow-2xl backdrop-blur-md"
        style={{
          top: tooltipLayout?.top ?? VIEW_MARGIN,
          left: tooltipLayout?.left ?? VIEW_MARGIN,
        }}
      >
        <div
          className={`absolute h-0 w-0 border-[8px] ${arrowClassFor(placement)}`}
          aria-hidden="true"
        />
        <p className="text-xs font-medium tracking-wide text-sky-300 uppercase">
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
