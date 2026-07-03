"use client";

import { useState } from "react";
import GlossyCard from "./GlossyCard";

type Mode = "login" | "signup";

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const body = mode === "signup" ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Something went wrong");
        return;
      }

      setSuccess(mode === "signup" ? "Account created! Redirecting..." : "Logged in! Redirecting...");
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlossyCard>
      <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Log In
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/70">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/70">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
    </GlossyCard>
  );
}
