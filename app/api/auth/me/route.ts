import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, email, name, profile_pic, created_at FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: rows[0] });
  } catch {
    return NextResponse.json({ user: null });
  }
}
