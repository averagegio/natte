"use client";

import { useEffect, useState } from "react";
import GlossyCard from "./GlossyCard";
import { requestOnboarding, ONBOARDING_KEYS } from "@/lib/onboarding";

type Mode = "login" | "signup";

type AuthProviders = {
  x: { available: boolean; loginPath: string };
};

function friendlyOAuthError(raw: string) {
  const normalized = raw.toLowerCase();
  if (normalized.includes("account_not_found")) {
    return "No account found for that social login. Use Sign Up with X first.";
  }
  return raw.replace(/_/g, " ");
}

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");

    const timer = window.setTimeout(() => {
      if (oauthError) {
        setError(friendlyOAuthError(decodeURIComponent(oauthError)));
        window.history.replaceState({}, "", "/signup");
      }
    }, 0);

    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((data: AuthProviders) => setProviders(data))
      .catch(() => setProviders(null));

    return () => window.clearTimeout(timer);
  }, []);

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
      if (mode === "signup") {
        requestOnboarding([ONBOARDING_KEYS.dashboard, ONBOARDING_KEYS.toggles]);
      }
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showSocial = Boolean(providers?.x.available);
  const xLabel = mode === "signup" ? "Sign up with X" : "Log in with X";
  const socialDivider = mode === "signup" ? "or sign up with email" : "or log in with email";

  function startOAuth(path: string) {
    setError(null);
    const intent = mode === "login" ? "login" : "signup";
    window.location.href = `${path}?intent=${intent}`;
  }

  return (
    <GlossyCard>
      <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "signup" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
          }`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccess(null);
          }}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
          }`}
        >
          Log In
        </button>
      </div>

      {showSocial ? (
        <div className="mt-6 space-y-3">
          {providers?.x.available ? (
            <button
              type="button"
              onClick={() => startOAuth(providers.x.loginPath)}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.913L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {xLabel}
            </button>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs tracking-wide text-white/40 uppercase">{socialDivider}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={`space-y-4 ${showSocial ? "mt-4" : "mt-6"}`}>
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
