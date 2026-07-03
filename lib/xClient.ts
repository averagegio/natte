export interface XPost {
  id: string;
  text: string;
}

export type XPostSource = "live" | "mock";

const MOCK_POSTS: XPost[] = [
  { id: "1", text: "Hello everyone — excited to share my weekend photos!" },
  { id: "2", text: "As an AI assistant, I can generate text that mimics human writing." },
  { id: "3", text: "This post was written by a human tester for the Proof of Human pilot." },
];

function getBearerToken(): string | undefined {
  return (
    process.env.X_BEARER_TOKEN ||
    process.env.TWITTER_BEARER_TOKEN ||
    process.env.X_API_BEARER_TOKEN
  );
}

function getDefaultUsername(): string {
  return process.env.X_DEFAULT_USERNAME || "natte";
}

export async function fetchXPosts(
  username?: string,
  count = 3
): Promise<{ posts: XPost[]; source: XPostSource }> {
  const token = getBearerToken();
  const user = username || getDefaultUsername();

  if (!token) {
    return {
      posts: MOCK_POSTS.slice(0, count),
      source: "mock",
    };
  }

  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=from:${user}&max_results=${Math.min(Math.max(count, 10), 100)}&tweet.fields=text`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error(`X API error: ${res.status} ${res.statusText}`);
      return {
        posts: MOCK_POSTS.slice(0, count),
        source: "mock",
      };
    }

    const json = await res.json();
    const posts: XPost[] = (json.data || [])
      .slice(0, count)
      .map((t: { id: string; text: string }) => ({ id: t.id, text: t.text }));

    if (posts.length === 0) {
      return {
        posts: MOCK_POSTS.slice(0, count),
        source: "mock",
      };
    }

    return { posts, source: "live" };
  } catch (err) {
    console.error("X API fetch failed:", err);
    return {
      posts: MOCK_POSTS.slice(0, count),
      source: "mock",
    };
  }
}
