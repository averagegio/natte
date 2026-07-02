"use client";

import { useState } from "react";

type Props = {
  text: string;
};

export default function AIParserToggle({ text }: Props) {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      setResult(json.result ?? "unknown");
    } catch (e) {
      setResult("error");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const newOn = !on;
    setOn(newOn);
    if (newOn) await check();
    else setResult(null);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className={`px-3 py-1 rounded-full border transition-colors ${
          on ? "bg-green-600 text-white" : "bg-white text-black"
        }`}
      >
        {on ? "AI detection: ON" : "AI detection: OFF"}
      </button>
      <div className="text-sm text-zinc-600">
        {loading ? "Checking..." : result ? `Result: ${result}` : "Idle"}
      </div>
    </div>
  );
}
