import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const sql = getDb();
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;

    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const rows = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${name || null})
      RETURNING id, email, name
    `;

    const user = rows[0];
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("Signup error:", err);
    const message = err instanceof Error && err.message.includes("DATABASE_URL")
      ? "Database is not configured"
      : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
