import { NextResponse } from "next/server";
import { getDb, type UserWithPassword } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, email, name, password_hash, created_at
      FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = rows[0] as UserWithPassword;
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    const message = err instanceof Error && err.message.includes("DATABASE_URL")
      ? "Database is not configured"
      : "Failed to log in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
