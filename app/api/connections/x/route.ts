import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

async function verifyXCredentials(username: string, bearerToken: string) {
  const cleanUsername = username.replace(/^@/, "");
  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?query=from:${cleanUsername}&max_results=10&tweet.fields=text`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API verification failed (${res.status}): ${body.slice(0, 120)}`);
  }

  return cleanUsername;
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { x_username, bearer_token } = await request.json();

    if (!x_username || !bearer_token) {
      return NextResponse.json(
        { error: "X username and bearer token are required" },
        { status: 400 }
      );
    }

    const verifiedUsername = await verifyXCredentials(x_username, bearer_token);
    const encryptedToken = encryptSecret(bearer_token);
    const sql = getDb();

    const rows = await sql`
      INSERT INTO widget_connections (user_id, provider, x_username, bearer_token_encrypted, status)
      VALUES (${userId}, 'x', ${verifiedUsername}, ${encryptedToken}, 'connected')
      ON CONFLICT (user_id, provider, x_username) DO UPDATE
      SET
        bearer_token_encrypted = ${encryptedToken},
        status = 'connected',
        updated_at = NOW()
      RETURNING id, provider, x_username, status, created_at, updated_at
    `;

    return NextResponse.json({ connection: rows[0] });
  } catch (err) {
    console.error("X connection error:", err);
    const message = err instanceof Error ? err.message : "Failed to connect X API";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
