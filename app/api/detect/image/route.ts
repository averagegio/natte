import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { detectImage, isImageDetectorConfigured } from "@/lib/imageDetector";
import {
  checkDetectionAccess,
  isSubscriptionRequiredForDetect,
  recordDetectionUsage,
} from "@/lib/subscriptions";

export async function GET() {
  return NextResponse.json({
    available: isImageDetectorConfigured(),
    requiresSubscription: isSubscriptionRequiredForDetect(),
    message: isImageDetectorConfigured()
      ? "AI image detection is configured."
      : "AI image detection is unavailable. Set AI_IMAGE_DETECTOR_KEY in environment variables.",
  });
}

export async function POST(req: NextRequest) {
  if (!isImageDetectorConfigured()) {
    return NextResponse.json(
      {
        result: "error",
        error: "detector_unavailable",
        message:
          "AI image detection is not configured. Set AI_IMAGE_DETECTOR_KEY before allowing access.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const imageUrl = String(body.imageUrl || body.url || "");

  if (!imageUrl.trim()) {
    return NextResponse.json(
      { result: "error", error: "missing_image", message: "Image URL is required." },
      { status: 400 }
    );
  }

  const userId = await getSessionUserId();
  const access = await checkDetectionAccess(userId);

  if (!access.allowed) {
    return NextResponse.json(
      {
        result: "error",
        error: "access_denied",
        message: access.reason,
        requiresAuth: !userId,
        requiresSubscription: isSubscriptionRequiredForDetect() && !access.subscription,
        usage: access.usage,
        limit: access.limit,
      },
      { status: userId ? 403 : 401 }
    );
  }

  const detection = await detectImage(imageUrl);

  if (detection.result === "error") {
    return NextResponse.json(
      {
        result: "error",
        error: "detector_failed",
        message: detection.message || "The AI image detector could not analyze this image.",
        source: detection.source,
      },
      { status: 502 }
    );
  }

  if (userId) {
    await recordDetectionUsage(userId);
  }

  return NextResponse.json({
    result: detection.result,
    confidence: detection.confidence,
    humanScore: detection.humanScore,
    source: detection.source,
    usage: access.usage !== undefined ? access.usage + 1 : undefined,
    limit: access.limit,
  });
}
