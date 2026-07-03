import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, profile_pic } = await request.json();
    const sql = getDb();

    const rows = await sql`
      UPDATE users
      SET
        name = COALESCE(${name ?? null}, name),
        profile_pic = COALESCE(${profile_pic ?? null}, profile_pic)
      WHERE id = ${userId}
      RETURNING id, email, name, profile_pic, created_at
    `;

    return NextResponse.json({ user: rows[0] });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
