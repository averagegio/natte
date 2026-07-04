"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
};

type DetectStatus = {
  available: boolean;
  requiresSubscription: boolean;
};

export default function AIParserToggle({ text }: Props) {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DetectStatus | null>(null);

  useEffect(() => {
    fetch("/api/detect")
      .then((res) => res.json())
      .then((data: DetectStatus) => setStatus(data))
      .catch(() => setStatus({ available: false, requiresSubscription: false }));
  }, []);

  async function check() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Detection unavailable");
        setResult("error");
        return;
      }

      setResult(json.result ?? "unknown");
    } catch {
      setError("Network error");
      setResult("error");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (!status?.available) {
      setError("AI detection is not configured yet.");
      return;
    }

    const newOn = !on;
    setOn(newOn);
    if (newOn) await check();
    else {
      setResult(null);
      setError(null);
    }
  }

  const unavailable = status && !status.available;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={Boolean(unavailable)}
          className={`rounded-full border px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            on
              ? "border-emerald-500/50 bg-emerald-600 text-white"
              : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          {on ? "AI detection: ON" : "AI detection: OFF"}
        </button>
        <div className="text-sm text-white/50">
          {unavailable
            ? "Detector not configured"
            : loading
              ? "Checking..."
              : result
                ? `Result: ${result}`
                : "Idle"}
        </div>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {status?.requiresSubscription && status.available && (
        <p className="text-xs text-white/40">Sign in with an active plan to run detection.</p>
      )}
    </div>
  );
}
