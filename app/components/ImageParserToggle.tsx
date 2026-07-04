"use client";

import { useEffect, useState } from "react";

type Props = {
  imageUrl: string;
  alt?: string;
};

type DetectStatus = {
  available: boolean;
  requiresSubscription: boolean;
};

export default function ImageParserToggle({ imageUrl, alt }: Props) {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DetectStatus | null>(null);

  useEffect(() => {
    fetch("/api/detect/image")
      .then((res) => res.json())
      .then((data: DetectStatus) => setStatus(data))
      .catch(() => setStatus({ available: false, requiresSubscription: false }));
  }, []);

  async function check() {
    setLoading(true);
    setResult(null);
    setConfidence(null);
    setError(null);

    try {
      const res = await fetch("/api/detect/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Image detection unavailable");
        setResult("error");
        return;
      }

      setResult(json.result ?? "unknown");
      setConfidence(typeof json.confidence === "number" ? json.confidence : null);
    } catch {
      setError("Network error");
      setResult("error");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (!status?.available) {
      setError("AI image detection is not configured yet.");
      return;
    }

    const newOn = !on;
    setOn(newOn);
    if (newOn) await check();
    else {
      setResult(null);
      setConfidence(null);
      setError(null);
    }
  }

  const unavailable = status && !status.available;

  return (
    <div className="space-y-3">
      <img
        src={imageUrl}
        alt={alt || "Post media"}
        className="max-h-72 w-full rounded-xl border border-white/10 object-cover"
      />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            disabled={Boolean(unavailable)}
            className={`rounded-full border px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              on
                ? "border-violet-500/50 bg-violet-600 text-white"
                : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            {on ? "Image detection: ON" : "Image detection: OFF"}
          </button>
          <div className="text-sm text-white/50">
            {unavailable
              ? "Image detector not configured"
              : loading
                ? "Checking..."
                : result
                  ? `Result: ${result}${
                      confidence !== null ? ` (${Math.round(confidence * 100)}% AI)` : ""
                    }`
                  : "Idle"}
          </div>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    </div>
  );
}
