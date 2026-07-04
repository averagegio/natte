import { NextResponse } from "next/server";
import { getDetectorStatus, isDetectorConfigured } from "@/lib/detector";
import { isSubscriptionRequiredForDetect } from "@/lib/subscriptions";
import { getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const xStatus = getXAppStatus();
  const detectorStatus = getDetectorStatus();

  return NextResponse.json({
    name: "NATTES Proof of Human Widget",
    version: "1.2.0",
    detectEndpoint: "/api/detect",
    postsEndpoint: "/api/x/posts",
    detection: {
      available: isDetectorConfigured(),
      requiresSubscription: isSubscriptionRequiredForDetect(),
      threshold: detectorStatus.threshold,
    },
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
