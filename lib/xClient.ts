export async function fetchXPosts(username: string, count = 3) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    // return mocked posts if token not provided
    return [
      { id: "1", text: "Hello world — this is a human post." },
      { id: "2", text: "As an AI assistant, I can't do that." },
      { id: "3", text: "Quick demo post for the Proof of Human pilot." },
    ].slice(0, count);
  }

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?query=from:${username}&max_results=${count}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return [];
  const json = await res.json();
  // adapt to simple structure
  return (json.data || []).map((t: any) => ({ id: t.id, text: t.text }));
}
