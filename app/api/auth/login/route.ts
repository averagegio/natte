import { NextResponse } from "next/server";
import { getDb, type UserWithPassword } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { assertAuthConfigured, getAuthErrorMessage } from "@/lib/auth-errors";

export async function POST(request: Request) {
  try {
    assertAuthConfigured();

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

    if (!user.password_hash) {
      return NextResponse.json(
        {
          error:
            "This account uses social sign-in. Continue with X instead of a password.",
        },
        { status: 401 }
      );
    }

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
    return NextResponse.json(
      { error: getAuthErrorMessage(err, "Failed to log in") },
      { status: 500 }
    );
  }
}
