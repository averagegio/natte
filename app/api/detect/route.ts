import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { detectText, isDetectorConfigured } from "@/lib/detector";
import {
  checkDetectionAccess,
  isSubscriptionRequiredForDetect,
  recordDetectionUsage,
} from "@/lib/subscriptions";

export async function GET() {
  return NextResponse.json({
    available: isDetectorConfigured(),
    requiresSubscription: isSubscriptionRequiredForDetect(),
    message: isDetectorConfigured()
      ? "AI detection is configured."
      : "AI detection is unavailable. Set AI_DETECTOR_URL in environment variables.",
  });
}

export async function POST(req: NextRequest) {
  if (!isDetectorConfigured()) {
    return NextResponse.json(
      {
        result: "error",
        error: "detector_unavailable",
        message:
          "AI detection is not configured. Set AI_DETECTOR_URL before allowing access.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "");

  if (!text.trim()) {
    return NextResponse.json(
      { result: "error", error: "missing_text", message: "Text is required." },
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

  const detection = await detectText(text);

  if (detection.result === "error") {
    return NextResponse.json(
      {
        result: "error",
        error: "detector_failed",
        message:
          detection.message || "The AI detector could not analyze this text.",
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
    reliability: detection.reliability,
    warning: detection.warning,
    source: detection.source,
    usage: access.usage !== undefined ? access.usage + 1 : undefined,
    limit: access.limit,
  });
}
