"use client";

import { useState } from "react";
import GlossyCard from "./GlossyCard";

export type WidgetConnection = {
  id: string;
  provider: "x";
  x_username: string;
  status: "connected" | "disconnected" | "error";
  created_at: string;
  updated_at: string;
};

type Props = {
  connections: WidgetConnection[];
  onChange: (connections: WidgetConnection[]) => void;
};

export default function WidgetConnectionsList({ connections, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [xUsername, setXUsername] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connectX(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/connections/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x_username: xUsername, bearer_token: bearerToken }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to connect");
        return;
      }

      const existing = connections.filter((c) => c.id !== json.connection.id);
      onChange([json.connection, ...existing]);
      setXUsername("");
      setBearerToken("");
      setShowForm(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect(id: string) {
    setDisconnecting(id);
    setError(null);

    try {
      const res = await fetch(`/api/connections/x/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to disconnect");
        return;
      }
      onChange(connections.filter((c) => c.id !== id));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Widget connections</h2>
          <p className="mt-1 text-sm text-white/50">
            Connect your X API credentials to power the NATTES detection widget on your posts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="self-start rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-500/60 hover:bg-sky-500/20"
        >
          {showForm ? "Cancel" : "+ Connect X API"}
        </button>
      </div>

      {showForm && (
        <GlossyCard className="mb-6">
          <form onSubmit={connectX} className="space-y-4">
            <div>
              <label htmlFor="x-username" className="block text-sm font-medium text-white/70">
                X username
              </label>
              <input
                id="x-username"
                type="text"
                required
                value={xUsername}
                onChange={(e) => setXUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
                placeholder="@yourhandle"
              />
            </div>
            <div>
              <label htmlFor="bearer-token" className="block text-sm font-medium text-white/70">
                X API bearer token
              </label>
              <input
                id="bearer-token"
                type="password"
                required
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
                placeholder="AAAAAAAAAAAAAAAAAAAA..."
              />
              <p className="mt-2 text-xs text-white/40">
                Get your token from the{" "}
                <a
                  href="https://developer.x.com/en/portal/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  X Developer Portal
                </a>
                . Your token is encrypted before storage.
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Connect X API"}
            </button>
          </form>
        </GlossyCard>
      )}

      {error && !showForm && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {connections.length === 0 ? (
        <GlossyCard>
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-xl font-bold text-white/60">
              𝕏
            </div>
            <p className="text-white/70">No widget connections yet</p>
            <p className="mt-2 text-sm text-white/40">
              Connect your X API to start detecting AI-generated posts on your timeline.
            </p>
          </div>
        </GlossyCard>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <GlossyCard key={connection.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg font-bold text-white">
                    𝕏
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">X (Twitter)</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          connection.status === "connected"
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {connection.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/50">@{connection.x_username}</p>
                    <p className="mt-1 text-xs text-white/30">
                      Connected {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => disconnect(connection.id)}
                  disabled={disconnecting === connection.id}
                  className="self-start rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  {disconnecting === connection.id ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </GlossyCard>
          ))}
        </div>
      )}
    </section>
  );
}
