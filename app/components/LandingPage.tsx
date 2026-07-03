"use client";

import { useRef } from "react";
import GlossyCard from "./GlossyCard";
import IntroSection from "./IntroSection";
import NattesSection from "./NattesSection";
import SideDrawer from "./SideDrawer";
import StarConstellation from "./StarConstellation";
import XPostsSection from "./XPostsSection";

const features = [
  {
    title: "Fast detection",
    description:
      "Check posts instantly and see whether the content feels human or machine-made.",
  },
  {
    title: "Clear signals",
    description:
      "Understand how writing style, tone, and structure influence the AI detection result.",
  },
  {
    title: "Built for trust",
    description:
      "A focused interface for evaluating AI detection on short-form writing.",
  },
];

export default function LandingPage() {
  const mainRef = useRef<HTMLElement>(null);

  const scrollToMain = () => {
    mainRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative bg-black">
      <SideDrawer />

      <IntroSection onEnter={scrollToMain} />

      <main ref={mainRef} className="relative">
        <div className="pointer-events-none fixed inset-0 z-0 bg-black">
          <StarConstellation />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 pb-8 sm:px-10">
          <NattesSection />

          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-10 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col gap-6 text-center sm:text-left">
              <span className="inline-flex w-fit rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-sm font-semibold text-sky-300">
                Proof of Human
              </span>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Detect whether text feels human or AI-generated.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
                  Explore real-time AI detection on posts, with a clean interface for reviewing
                  and sharing results.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {features.map((feature, index) => (
                <GlossyCard key={feature.title}>
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-lg font-semibold text-white">
                      {index + 1}
                    </div>
                    <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {feature.description}
                    </p>
                  </div>
                </GlossyCard>
              ))}
            </div>
          </section>

          <XPostsSection />
        </div>
      </main>
    </div>
  );
}
