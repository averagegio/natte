import { NextResponse } from "next/server";
import { getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const xStatus = getXAppStatus();

  return NextResponse.json({
    name: "NATTES Proof of Human Widget",
    version: "1.1.0",
    detectEndpoint: "/api/detect",
    postsEndpoint: "/api/x/posts",
    x: {
      oauthConfigured: xStatus.oauthConfigured,
      bearerTokenConfigured: xStatus.bearerTokenConfigured,
      defaultUsername: xStatus.defaultUsername,
    },
    embed: {
      basic: '<div data-natte-text="Your text here"><div data-natte-widget></div></div>',
      xFeed:
        '<div data-natte-x-username="yourhandle" data-natte-x-count="3"><div data-natte-widget></div></div>',
    },
  });
}
