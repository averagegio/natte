"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AIParserToggle from "./AIParserToggle";
import GlossyCard from "./GlossyCard";

interface XPost {
  id: string;
  text: string;
}

type PostSource = "live" | "mock" | "unavailable";

export default function XPostsSection() {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<PostSource>("unavailable");
  const [username, setUsername] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/x/posts", { credentials: "include" })
      .then((res) => res.json())
      .then(
        (data: {
          posts: XPost[];
          source: PostSource;
          username?: string;
          message?: string;
        }) => {
          setPosts(data.posts);
          setSource(data.source);
          setUsername(data.username ?? null);
          setMessage(data.message ?? null);
        }
      )
      .catch(() => {
        setPosts([]);
        setSource("unavailable");
        setMessage("Failed to load posts.");
      })
      .finally(() => setLoading(false));
  }, []);

  const badgeLabel =
    source === "live"
      ? "Live X feed"
      : source === "mock"
        ? "Demo posts"
        : "Live feed unavailable";

  const badgeClass =
    source === "live"
      ? "bg-emerald-500/20 text-emerald-400"
      : source === "mock"
        ? "bg-amber-500/20 text-amber-300"
        : "bg-white/10 text-white/50";

  return (
    <section className="mt-12 space-y-6">
      <GlossyCard>
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">Try it with posts</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
              {badgeLabel}
            </span>
            {username && source === "live" && (
              <span className="text-xs text-white/40">@{username}</span>
            )}
          </div>
          <p className="mt-2 text-sm text-white/50">
            {source === "live"
              ? "These are your latest posts from X. Toggle AI detection on each one."
              : "Connect X on your dashboard to load real posts from your timeline."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : source === "unavailable" ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm text-white/60">
              {message || "Live X posts are not available yet."}
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full border border-sky-500/40 bg-sky-500/10 px-5 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-500/60 hover:bg-sky-500/20"
              >
                Connect X on dashboard
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/10"
              >
                Subscribe to detect
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-white/10 p-4">
                <div className="mb-3 text-sm text-white/70">{post.text}</div>
                <AIParserToggle text={post.text} />
              </div>
            ))}
          </div>
        )}
      </GlossyCard>
    </section>
  );
}
