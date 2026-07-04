import { decryptSecret, encryptSecret } from "./crypto";
import { getDb } from "./db";
import { resolveMediaUrl, type XApiMediaItem } from "./mediaUrl";
import { getXBearerToken, getXDefaultUsername } from "./xConfig";
import { DEFAULT_X_POST_COUNT } from "./xPostCount";
import { refreshAccessToken } from "./xOAuth";

export interface XPostMedia {
  mediaKey: string;
  type: string;
  url: string;
  altText?: string;
}

export interface XPost {
  id: string;
  text: string;
  media: XPostMedia[];
}

export type XPostSource = "live" | "mock" | "unavailable";

export type FetchXPostsResult = {
  posts: XPost[];
  source: XPostSource;
  username: string;
  message?: string;
};

const MOCK_POSTS: XPost[] = [
  {
    id: "1",
    text: "Hello everyone — excited to share my weekend photos!",
    media: [],
  },
  {
    id: "2",
    text: "As an AI assistant, I can generate text that mimics human writing.",
    media: [],
  },
  {
    id: "3",
    text: "This post was written by a human tester for the Proof of Human pilot.",
    media: [],
  },
];

type ConnectionRow = {
  id: string;
  x_username: string;
  bearer_token_encrypted: string;
  refresh_token_encrypted: string | null;
  auth_type: string | null;
};

type XApiTweet = {
  id: string;
  text: string;
  attachments?: {
    media_keys?: string[];
  };
};

const MEDIA_FIELDS = "url,preview_image_url,type,alt_text,variants";

function mapTweetMedia(
  tweet: XApiTweet,
  mediaByKey: Map<string, XApiMediaItem>
): XPostMedia[] {
  const keys = tweet.attachments?.media_keys ?? [];
  const media: XPostMedia[] = [];

  for (const mediaKey of keys) {
    const item = mediaByKey.get(mediaKey);
    if (!item) continue;

    const url = resolveMediaUrl(item);
    if (!url) continue;

    media.push({
      mediaKey: item.media_key,
      type: item.type || "photo",
      url,
      altText: item.alt_text,
    });
  }

  return media;
}

function buildMediaMap(includes: { media?: XApiMediaItem[] } | undefined) {
  const mediaByKey = new Map<string, XApiMediaItem>();

  for (const item of includes?.media ?? []) {
    if (item.media_key) {
      mediaByKey.set(item.media_key, item);
    }
  }

  return mediaByKey;
}

function mapTweets(json: { data?: XApiTweet[]; includes?: { media?: XApiMediaItem[] } }, count: number): XPost[] {
  const mediaByKey = buildMediaMap(json.includes);

  return ((json.data || []) as XApiTweet[])
    .slice(0, count)
    .map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      media: mapTweetMedia(tweet, mediaByKey),
    }));
}

async function getAuthenticatedUserId(token: string): Promise<string | null> {
  const res = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  return json.data?.id ?? null;
}

async function getUserIdByUsername(token: string, username: string): Promise<string | null> {
  const res = await fetch(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  return json.data?.id ?? null;
}

async function fetchUserTimeline(
  token: string,
  userId: string,
  count: number
): Promise<XPost[]> {
  const params = new URLSearchParams({
    max_results: String(Math.min(Math.max(count, 5), 100)),
    "tweet.fields": "text,attachments",
    expansions: "attachments.media_keys",
    "media.fields": MEDIA_FIELDS,
  });

  const res = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error(`X API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return mapTweets(json, count);
}

async function fetchPostsBySearch(
  token: string,
  username: string,
  count: number
): Promise<XPost[]> {
  const params = new URLSearchParams({
    query: `from:${username}`,
    max_results: String(Math.min(Math.max(count, 10), 100)),
    "tweet.fields": "text,attachments",
    expansions: "attachments.media_keys",
    "media.fields": MEDIA_FIELDS,
  });

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error(`X API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return mapTweets(json, count);
}

async function fetchPostsWithToken(
  token: string,
  username: string,
  count: number,
  options?: { preferTimeline?: boolean }
): Promise<XPost[]> {
  if (options?.preferTimeline) {
    const userId =
      (await getAuthenticatedUserId(token)) ||
      (await getUserIdByUsername(token, username));

    if (userId) {
      try {
        return await fetchUserTimeline(token, userId, count);
      } catch (timelineError) {
        console.warn("X user timeline fetch failed, falling back to search:", timelineError);
      }
    }
  }

  return fetchPostsBySearch(token, username, count);
}

async function getUserConnectionToken(
  userId: string,
  username?: string
): Promise<{ token: string; username: string; authType: string | null } | null> {
  const sql = getDb();
  let rows: ConnectionRow[];

  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    rows = (await sql`
      SELECT id, x_username, bearer_token_encrypted, refresh_token_encrypted, auth_type
      FROM widget_connections
      WHERE user_id = ${userId}
        AND provider = 'x'
        AND status = 'connected'
        AND x_username = ${cleanUsername}
      LIMIT 1
    `) as ConnectionRow[];
  } else {
    rows = (await sql`
      SELECT id, x_username, bearer_token_encrypted, refresh_token_encrypted, auth_type
      FROM widget_connections
      WHERE user_id = ${userId}
        AND provider = 'x'
        AND status = 'connected'
      ORDER BY updated_at DESC
      LIMIT 1
    `) as ConnectionRow[];
  }

  if (rows.length === 0) {
    return null;
  }

  const connection = rows[0];
  let accessToken = decryptSecret(connection.bearer_token_encrypted);

  if (connection.auth_type === "oauth2" && connection.refresh_token_encrypted) {
    try {
      await fetchPostsWithToken(accessToken, connection.x_username, 1);
    } catch {
      try {
        const refreshed = await refreshAccessToken(
          decryptSecret(connection.refresh_token_encrypted)
        );
        accessToken = refreshed.accessToken;
        await sql`
          UPDATE widget_connections
          SET
            bearer_token_encrypted = ${encryptSecret(refreshed.accessToken)},
            refresh_token_encrypted = ${refreshed.refreshToken ? encryptSecret(refreshed.refreshToken) : connection.refresh_token_encrypted},
            updated_at = NOW()
          WHERE id = ${connection.id}
        `;
      } catch (refreshErr) {
        console.error("X token refresh failed:", refreshErr);
        await sql`
          UPDATE widget_connections
          SET status = 'error', updated_at = NOW()
          WHERE id = ${connection.id}
        `;
        return null;
      }
    }
  }

  return {
    token: accessToken,
    username: connection.x_username,
    authType: connection.auth_type,
  };
}

export async function fetchXPosts(
  username?: string,
  count = DEFAULT_X_POST_COUNT,
  userId?: string,
  options?: { allowMock?: boolean }
): Promise<FetchXPostsResult> {
  const requestedUser = (username || getXDefaultUsername()).replace(/^@/, "");
  const connection = userId ? await getUserConnectionToken(userId, username) : null;
  const resolvedUsername = connection?.username || requestedUser;
  const token = connection?.token || getXBearerToken();

  if (!token) {
    if (options?.allowMock) {
      return {
        posts: MOCK_POSTS.slice(0, count),
        source: "mock",
        username: resolvedUsername,
        message: "Demo posts shown. Connect X or set X_BEARER_TOKEN for live posts.",
      };
    }

    return {
      posts: [],
      source: "unavailable",
      username: resolvedUsername,
      message:
        "Live X posts are unavailable. Connect your X account on the dashboard or configure X_BEARER_TOKEN.",
    };
  }

  try {
    const posts = await fetchPostsWithToken(token, resolvedUsername, count, {
      preferTimeline: connection?.authType === "oauth2",
    });

    if (posts.length === 0) {
      return {
        posts: [],
        source: "unavailable",
        username: resolvedUsername,
        message: `No recent posts found for @${resolvedUsername}.`,
      };
    }

    return { posts, source: "live", username: resolvedUsername };
  } catch (err) {
    console.error("X API fetch failed:", err);

    if (options?.allowMock) {
      return {
        posts: MOCK_POSTS.slice(0, count),
        source: "mock",
        username: resolvedUsername,
        message: "X API request failed. Showing demo posts instead.",
      };
    }

    return {
      posts: [],
      source: "unavailable",
      username: resolvedUsername,
      message: "Could not load live X posts. Check your X API credentials.",
    };
  }
}
