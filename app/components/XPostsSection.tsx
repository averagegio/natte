"use client";

import { useEffect, useState } from "react";
import AIParserToggle from "./AIParserToggle";
import GlossyCard from "./GlossyCard";

interface XPost {
  id: string;
  text: string;
}

export default function XPostsSection() {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "mock">("mock");

  useEffect(() => {
    fetch("/api/x/posts")
      .then((res) => res.json())
      .then((data: { posts: XPost[]; source: "live" | "mock" }) => {
        setPosts(data.posts);
        setSource(data.source);
      })
      .catch(() => {
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-12 space-y-6">
      <GlossyCard>
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">Try it with posts</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                source === "live"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {source === "live" ? "Live X feed" : "Cached posts"}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Toggle the AI detector on each example to see the result and learn how the model
            interprets each message.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-white/10 p-4"
              >
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
