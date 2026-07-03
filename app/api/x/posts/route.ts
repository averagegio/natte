import { NextRequest, NextResponse } from "next/server";
import { fetchXPosts } from "@/lib/xClient";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? undefined;
  const countParam = request.nextUrl.searchParams.get("count");
  const count = countParam ? parseInt(countParam, 10) : 3;

  const { posts, source } = await fetchXPosts(username, count);

  return NextResponse.json({ posts, source });
}
