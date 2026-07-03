"use client";

import { useEffect, useState } from "react";

const SCENE_DURATIONS = [3500, 4000, 3500, 4500, 5000, 4500, 3000, 2500, 3000];

const FEATURES = [
  {
    name: "Slop Detection",
    gradient: "from-rose-500 via-red-500 to-orange-600",
  },
  {
    name: "Turing Test",
    gradient: "from-fuchsia-500 via-purple-500 to-violet-600",
  },
  {
    name: "Human Proof",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
  },
];

const SLOP_POST =
  "As an AI assistant, I can generate text that mimics human writing.";
const HUMAN_POST = "Hello everyone — excited to share my weekend photos!";

function IntroducingScene({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-white transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="relative px-8">
        <svg
          className="absolute -inset-x-6 top-1/2 h-16 w-[calc(100%+3rem)] -translate-y-1/2"
          viewBox="0 0 300 60"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 35 C40 10, 80 50, 120 30 S200 15, 300 35"
            stroke="#ef4444"
            strokeWidth="1.5"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M0 28 C50 45, 100 5, 150 32 S220 48, 300 22"
            stroke="#ef4444"
            strokeWidth="1.5"
            fill="none"
            opacity="0.5"
          />
        </svg>
        <h2 className="relative text-4xl font-bold tracking-tight text-black">Introducing</h2>
      </div>
    </div>
  );
}

function BrandingScene({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white px-8 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          className="text-black"
          aria-hidden="true"
        >
          <path
            d="M16 3l9 4v7c0 5-3.5 8.5-9 10.5C10.5 22.5 7 19 7 14V7l9-4z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M11.5 15.5l3 3 6.5-6.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-3xl font-semibold tracking-tight text-black">n.a.t.t.e.</span>
      </div>
      <p className="mt-4 max-w-[260px] text-center text-xs leading-relaxed tracking-wide text-[#536471] uppercase">
        Normative AI Turing Test that Eliminates slop
      </p>
    </div>
  );
}

function SlopTaglineScene({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black px-8 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <p className="text-center text-3xl font-bold leading-tight tracking-tight text-white">
        The slop
        <br />
        <span className="text-white/50">stops here.</span>
      </p>
      <p className="mt-4 text-center text-sm text-white/40">
        Real-time AI detection on X
      </p>
    </div>
  );
}

function FeaturePillsScene({ visible, activeIndex }: { visible: boolean; activeIndex: number }) {
  return (
    <div
      className={`absolute inset-0 bg-black transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
            style={{
              width: `${ring * 120 + 80}px`,
              height: `${ring * 120 + 80}px`,
            }}
          />
        ))}
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-px rounded-full bg-white/30"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              opacity: 0.2 + (i % 5) * 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6">
        {FEATURES.map((feature, i) => {
          const active = i === activeIndex;
          return (
            <div
              key={feature.name}
              className={`flex w-full max-w-[280px] items-center gap-3 rounded-full border px-4 py-3 transition-all duration-500 ${
                active
                  ? "border-white/25 bg-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                  : "border-white/10 bg-white/[0.03] opacity-60"
              }`}
            >
              <div
                className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${feature.gradient}`}
              />
              <span className="flex-1 text-sm font-medium text-white">{feature.name}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="text-white/40"
                aria-hidden="true"
              >
                <circle cx="8" cy="3" r="1.2" />
                <circle cx="8" cy="8" r="1.2" />
                <circle cx="8" cy="13" r="1.2" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function XPostScene({
  visible,
  post,
  detectionOn,
  result,
  checking,
}: {
  visible: boolean;
  post: string;
  detectionOn: boolean;
  result: "ai" | "human" | null;
  checking: boolean;
}) {
  const resultColor =
    result === "ai" ? "text-rose-500" : result === "human" ? "text-emerald-500" : "text-[#536471]";

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-[#f7f9f9] p-5 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="w-full max-w-[300px] rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
            X
          </div>
          <span className="text-sm font-semibold text-black">@natte</span>
        </div>
        <p className="text-sm leading-relaxed text-black">{post}</p>
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              detectionOn
                ? "border-emerald-500/50 bg-emerald-600 text-white"
                : "border-black/10 bg-black/[0.04] text-black/70"
            }`}
          >
            {detectionOn ? "AI detection: ON" : "AI detection: OFF"}
          </span>
          <span className={`text-xs font-medium ${resultColor}`}>
            {checking ? "Checking..." : result ? `Result: ${result}` : "Idle"}
          </span>
        </div>
      </div>
    </div>
  );
}

function TabNavScene({ visible }: { visible: boolean }) {
  const tabs = [
    { icon: "chat", active: true },
    { icon: "wrench", active: true },
    { icon: "sliders", active: true },
    { icon: "book", active: false },
    { icon: "shield", active: true },
  ];

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <p className="mb-8 text-xs font-medium tracking-wide text-[#536471] uppercase">
        Built for X
      </p>
      <div className="relative flex items-end gap-8 px-4">
        {tabs.map((tab, i) => (
          <div key={i} className="flex flex-col items-center">
            <TabIcon type={tab.icon} muted={!tab.active} />
          </div>
        ))}
        <div className="absolute -bottom-1 left-[calc(12%-4px)] h-0.5 w-[76%] rounded-full bg-[#f97316]" />
      </div>
    </div>
  );
}

function TabIcon({ type, muted }: { type: string; muted: boolean }) {
  const color = muted ? "text-black/25" : "text-black";
  const props = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", className: color };

  switch (type) {
    case "chat":
      return (
        <svg {...props} aria-hidden="true">
          <path
            d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "wrench":
      return (
        <svg {...props} aria-hidden="true">
          <path
            d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2 2-3.4-3.4 2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "sliders":
      return (
        <svg {...props} aria-hidden="true">
          <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...props} aria-hidden="true">
          <path
            d="M5 4h6a2 2 0 012 2v14a2 2 0 00-2-2H5a2 2 0 00-2 2V6a2 2 0 012-2zm8 0h6a2 2 0 012 2v14a2 2 0 01-2-2h-6a2 2 0 01-2-2V6a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );
    case "shield":
      return (
        <svg {...props} aria-hidden="true">
          <path
            d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function ProgressScene({ visible, progress }: { visible: boolean; progress: number }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white px-10 transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <p className="mb-6 text-xs font-medium tracking-wide text-[#536471] uppercase">
        Detection sensitivity
      </p>
      <div className="relative h-0.5 w-full max-w-[240px] rounded-full bg-[#f97316]">
        <div
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black transition-all duration-300"
          style={{ left: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
          style={{ left: `${Math.min(progress + 15, 95)}%` }}
        >
          <div className="relative h-4 w-4 -translate-x-1/2 rounded-full border-2 border-black bg-white">
            <div className="absolute top-1/2 left-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CtaScene({ visible, pressed }: { visible: boolean; pressed: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        className={`rounded-full bg-black px-8 py-3 text-sm font-bold text-white transition-transform duration-200 ${
          pressed ? "scale-95" : "scale-100"
        }`}
        tabIndex={-1}
      >
        Stop the Slop +
      </button>
      <p className="mt-4 text-xs text-[#536471]">n.a.t.t.e. for X</p>
    </div>
  );
}

export default function NatteFeatureDemo({ autoPlay = true }: { autoPlay?: boolean }) {
  const [scene, setScene] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [slopDetectionOn, setSlopDetectionOn] = useState(false);
  const [slopChecking, setSlopChecking] = useState(false);
  const [slopResult, setSlopResult] = useState<"ai" | "human" | null>(null);
  const [humanDetectionOn, setHumanDetectionOn] = useState(false);
  const [humanChecking, setHumanChecking] = useState(false);
  const [humanResult, setHumanResult] = useState<"ai" | "human" | null>(null);
  const [progress, setProgress] = useState(35);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;

    const duration = SCENE_DURATIONS[scene] ?? 3000;
    const timer = setTimeout(() => {
      setScene((s) => (s + 1) % SCENE_DURATIONS.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [scene, autoPlay]);

  useEffect(() => {
    if (scene !== 3) {
      setActiveFeature(0);
      return;
    }

    const timers = [
      setTimeout(() => setActiveFeature(1), 1200),
      setTimeout(() => setActiveFeature(2), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [scene]);

  useEffect(() => {
    if (scene !== 4) {
      setSlopDetectionOn(false);
      setSlopChecking(false);
      setSlopResult(null);
      return;
    }

    const t1 = setTimeout(() => setSlopDetectionOn(true), 800);
    const t2 = setTimeout(() => setSlopChecking(true), 1200);
    const t3 = setTimeout(() => {
      setSlopChecking(false);
      setSlopResult("ai");
    }, 2200);

    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [scene]);

  useEffect(() => {
    if (scene !== 5) {
      setHumanDetectionOn(false);
      setHumanChecking(false);
      setHumanResult(null);
      return;
    }

    const t1 = setTimeout(() => setHumanDetectionOn(true), 800);
    const t2 = setTimeout(() => setHumanChecking(true), 1200);
    const t3 = setTimeout(() => {
      setHumanChecking(false);
      setHumanResult("human");
    }, 2200);

    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [scene]);

  useEffect(() => {
    if (scene !== 7) {
      setProgress(35);
      return;
    }

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / 2000, 1);
      setProgress(35 + t * 30);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [scene]);

  useEffect(() => {
    if (scene !== 8) {
      setPressed(false);
      return;
    }

    const pressTimer = setTimeout(() => setPressed(true), 1800);
    const releaseTimer = setTimeout(() => setPressed(false), 2200);
    return () => {
      clearTimeout(pressTimer);
      clearTimeout(releaseTimer);
    };
  }, [scene]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black shadow-2xl shadow-black/50">
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
          <div className="h-1 w-24 rounded-full bg-white/20" />
        </div>

        <IntroducingScene visible={scene === 0} />
        <BrandingScene visible={scene === 1} />
        <SlopTaglineScene visible={scene === 2} />
        <FeaturePillsScene visible={scene === 3} activeIndex={activeFeature} />
        <XPostScene
          visible={scene === 4}
          post={SLOP_POST}
          detectionOn={slopDetectionOn}
          checking={slopChecking}
          result={slopResult}
        />
        <XPostScene
          visible={scene === 5}
          post={HUMAN_POST}
          detectionOn={humanDetectionOn}
          checking={humanChecking}
          result={humanResult}
        />
        <TabNavScene visible={scene === 6} />
        <ProgressScene visible={scene === 7} progress={progress} />
        <CtaScene visible={scene === 8} pressed={pressed} />

        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center gap-1.5 pb-3">
          {SCENE_DURATIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScene(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === scene ? "w-4 bg-white" : "w-1 bg-white/30"
              }`}
              aria-label={`Go to scene ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-white/40">
        n.a.t.t.e. — normative AI Turing test that eliminates slop
      </p>
    </div>
  );
}
