"use client";

import { useEffect, useState } from "react";

const TIMELINE = [
  { at: 0, scene: "intro" },
  { at: 1200, scene: "brand" },
  { at: 2600, scene: "phone" },
  { at: 3400, scene: "toast-old" },
  { at: 4200, scene: "toast-slop" },
  { at: 5000, scene: "detecting" },
  { at: 5600, scene: "ai-result" },
  { at: 6200, scene: "human-post" },
  { at: 6800, scene: "human-result" },
  { at: 7600, scene: "cta" },
];

const SLOP_POST = "As an AI assistant, I can generate text that mimics human writing.";
const HUMAN_POST = "Hello everyone — excited to share my weekend photos!";

export default function NatteFeatureDemo({ autoPlay = true }: { autoPlay?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [manualScene, setManualScene] = useState<number | null>(null);

  useEffect(() => {
    if (!autoPlay || manualScene !== null) return;

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - start) % 9500);
    }, 50);

    return () => clearInterval(interval);
  }, [autoPlay, manualScene]);

  const currentScene =
    manualScene !== null
      ? TIMELINE[manualScene]?.scene
      : [...TIMELINE].reverse().find((t) => elapsed >= t.at)?.scene ?? "intro";

  const show = (scene: string) => currentScene === scene || isPast(scene);

  function isPast(scene: string) {
    const order = TIMELINE.map((t) => t.scene);
    return order.indexOf(currentScene) >= order.indexOf(scene);
  }

  const postText =
    isPast("human-post") || currentScene === "human-result" || currentScene === "cta"
      ? HUMAN_POST
      : SLOP_POST;

  const detectionOn = isPast("detecting");
  const checking = currentScene === "detecting" || currentScene === "human-post";
  const result =
    isPast("human-result") || currentScene === "cta"
      ? "human"
      : isPast("ai-result")
        ? "ai"
        : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-video w-full max-w-[720px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#fafafa] to-[#f0f0f0] shadow-2xl">
        {/* Introducing */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-white transition-opacity duration-500 ${
            currentScene === "intro" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="relative">
            <svg
              className="absolute -inset-x-8 top-1/2 h-20 w-[calc(100%+4rem)] -translate-y-1/2"
              viewBox="0 0 300 60"
              fill="none"
              aria-hidden="true"
            >
              <path d="M0 35 C40 10, 80 50, 120 30 S200 15, 300 35" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
              <path d="M0 28 C50 45, 100 5, 150 32 S220 48, 300 22" stroke="#ef4444" strokeWidth="1.5" opacity="0.5" />
            </svg>
            <h2 className="relative text-4xl font-bold tracking-tight text-black sm:text-5xl">
              Introducing
            </h2>
          </div>
        </div>

        {/* Brand */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${
            currentScene === "brand" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 3l9 4v7c0 5-3.5 8.5-9 10.5C10.5 22.5 7 19 7 14V7l9-4z" stroke="#000" strokeWidth="1.5" />
              <path d="M11.5 15.5l3 3 6.5-6.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              n.a.t.t.e.
            </span>
          </div>
          <p className="mt-4 max-w-sm text-center text-[0.65rem] font-medium tracking-[0.1em] text-[#536471] uppercase">
            Normative AI Turing Test that Eliminates slop
          </p>
        </div>

        {/* Tagline */}
        <p
          className={`absolute top-6 left-1/2 -translate-x-1/2 text-lg font-bold whitespace-nowrap text-black transition-opacity duration-500 sm:text-xl ${
            isPast("phone") && !isPast("cta") ? "opacity-100" : "opacity-0"
          }`}
        >
          The slop <span className="text-[#536471]">stops here.</span>
        </p>

        {/* iPhone */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
            isPast("phone") && !isPast("cta") ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <div className="relative w-[200px] sm:w-[240px]">
            <div className="relative rounded-[2rem] bg-white p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_24px_80px_rgba(0,0,0,0.12)]">
              <div className="absolute top-2 left-1/2 z-30 h-5 w-16 -translate-x-1/2 rounded-full bg-[#1a1a1a]" />

              {/* Toasts */}
              <div
                className={`absolute top-7 left-1/2 z-40 w-[92%] -translate-x-1/2 rounded-[1.1rem] border-[1.5px] border-[#b8daf0] bg-[#eef6fc] px-3 py-2 shadow-md transition-all duration-500 ${
                  show("toast-old") && !isPast("toast-slop")
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-8 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-xs font-bold text-white">
                    !
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[0.6rem] font-semibold text-black">
                      Slop detected on your feed
                    </p>
                    <p className="truncate text-[0.55rem] text-[#536471]">As an AI assistant...</p>
                  </div>
                </div>
              </div>

              <div
                className={`absolute top-7 left-1/2 z-40 w-[88%] -translate-x-1/2 rounded-[1.4rem] bg-[#3a3a3c] px-3 py-2 shadow-lg transition-all duration-500 ${
                  (show("toast-slop") || show("detecting") || show("ai-result")) &&
                  !isPast("human-post")
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-8 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-[0.55rem] font-bold text-white">
                    AI
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[0.6rem] font-semibold text-white">
                      n.a.t.t.e. · Result: ai
                    </p>
                    <p className="truncate text-[0.55rem] text-white/55">Turing test failed</p>
                  </div>
                </div>
              </div>

              <div
                className={`absolute top-7 left-1/2 z-40 w-[88%] -translate-x-1/2 rounded-[1.4rem] bg-[#3a3a3c] px-3 py-2 shadow-lg transition-all duration-500 ${
                  show("human-result") ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs text-white">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[0.6rem] font-semibold text-white">
                      n.a.t.t.e. · Result: human
                    </p>
                    <p className="truncate text-[0.55rem] text-white/55">Verified authentic</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] bg-white pt-8 pb-3">
                <div className="px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[0.55rem] font-bold text-white">
                      X
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-bold text-black">natte</p>
                      <p className="text-[0.55rem] text-[#536471]">@natte</p>
                    </div>
                  </div>
                  <p className="mt-2 pl-9 text-[0.65rem] leading-relaxed text-black">{postText}</p>
                  {detectionOn && (
                    <div className="mt-2 flex items-center gap-2 pl-9">
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[0.55rem] font-semibold text-white">
                        AI detection: ON
                      </span>
                      <span
                        className={`text-[0.55rem] font-semibold ${
                          result === "ai"
                            ? "text-rose-500"
                            : result === "human"
                              ? "text-emerald-500"
                              : "text-[#536471]"
                        }`}
                      >
                        {checking ? "Checking..." : result ? `Result: ${result}` : "Idle"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 transition-opacity duration-500 ${
            isPast("cta") ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            className="rounded-full bg-black px-8 py-3 text-sm font-bold text-white shadow-lg"
            tabIndex={-1}
          >
            Stop the Slop +
          </button>
          <p className="text-xs text-[#536471]">n.a.t.t.e. for X</p>
        </div>
      </div>

      <div className="flex gap-1">
        {TIMELINE.map((t, i) => (
          <button
            key={t.scene}
            type="button"
            onClick={() => {
              setManualScene(i);
              setElapsed(t.at);
            }}
            className={`h-1 rounded-full transition-all ${
              currentScene === t.scene ? "w-4 bg-white" : "w-1 bg-white/30"
            }`}
            aria-label={t.scene}
          />
        ))}
      </div>
    </div>
  );
}
