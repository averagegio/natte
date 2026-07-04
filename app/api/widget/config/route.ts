import { NextResponse } from "next/server";
import { getDetectorStatus, isDetectorConfigured } from "@/lib/detector";
import { getImageDetectorStatus, isImageDetectorConfigured } from "@/lib/imageDetector";
import { isSubscriptionRequiredForDetect } from "@/lib/subscriptions";
import { getXAppStatus } from "@/lib/xConfig";

export async function GET() {
  const xStatus = getXAppStatus();
  const detectorStatus = getDetectorStatus();
  const imageDetectorStatus = getImageDetectorStatus();

  return NextResponse.json({
    name: "NATTES Proof of Human Widget",
    version: "1.3.0",
    detectEndpoint: "/api/detect",
    imageDetectEndpoint: "/api/detect/image",
    postsEndpoint: "/api/x/posts",
    detection: {
      text: {
        available: isDetectorConfigured(),
        requiresSubscription: isSubscriptionRequiredForDetect(),
        threshold: detectorStatus.threshold,
      },
      image: {
        available: isImageDetectorConfigured(),
        requiresSubscription: isSubscriptionRequiredForDetect(),
        threshold: imageDetectorStatus.threshold,
        provider: imageDetectorStatus.provider,
      },
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
