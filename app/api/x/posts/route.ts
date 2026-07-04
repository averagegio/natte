import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { fetchXPosts } from "@/lib/xClient";
import { DEFAULT_X_POST_COUNT } from "@/lib/xPostCount";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? undefined;
  const countParam = request.nextUrl.searchParams.get("count");
  const count = countParam ? parseInt(countParam, 10) : DEFAULT_X_POST_COUNT;
  const allowMock = request.nextUrl.searchParams.get("demo") === "true";
  const userId = await getSessionUserId();

  const result = await fetchXPosts(username, count, userId ?? undefined, { allowMock });

  return NextResponse.json(result);
}
