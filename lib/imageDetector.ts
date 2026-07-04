import {
  classifyFromAiProbability,
  humanScoreToAiProbability,
  normalizeProbability,
  upgradeTwitterImageUrl,
} from "./detectorScores";

export type ImageDetectionResult = "human" | "ai" | "error";

export type ImageDetectionResponse = {
  result: ImageDetectionResult;
  confidence?: number;
  humanScore?: number;
  source: "detector" | "unavailable";
  message?: string;
};

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getImageDetectorConfig() {
  const url =
    firstEnv("AI_IMAGE_DETECTOR_URL", "IMAGE_DETECTOR_URL") ||
    "https://api.gowinston.ai/v2/image-detection";
  const key = firstEnv(
    "AI_IMAGE_DETECTOR_KEY",
    "IMAGE_DETECTOR_KEY",
    "WINSTON_API_KEY"
  );
  const threshold = Number(firstEnv("AI_IMAGE_DETECTOR_THRESHOLD") ?? "0.5");
  const timeoutMs = Number(firstEnv("AI_IMAGE_DETECTOR_TIMEOUT_MS") ?? "30000");

  return {
    url,
    key,
    threshold: Number.isFinite(threshold) ? threshold : 0.5,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000,
  };
}

export function isImageDetectorConfigured() {
  const config = getImageDetectorConfig();
  return Boolean(config.url && config.key);
}

export function getImageDetectorStatus() {
  const config = getImageDetectorConfig();
  return {
    configured: isImageDetectorConfigured(),
    hasApiKey: Boolean(config.key),
    hasUrl: Boolean(config.url),
    provider: config.url?.includes("gowinston.ai") ? "winston" : "custom",
    threshold: config.threshold,
    timeoutMs: config.timeoutMs,
  };
}

function isWinstonDetector(url: string) {
  return url.includes("gowinston.ai");
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const data = payload as Record<string, unknown>;
  const message = data.description ?? data.message ?? data.error ?? data.detail;

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return undefined;
}

function parseImagePayload(payload: unknown, threshold: number): ImageDetectionResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const errorMessage = extractErrorMessage(payload);

  if (typeof data.ai_probability === "number") {
    const aiProbability = normalizeProbability(data.ai_probability);
    const humanScore =
      typeof data.score === "number"
        ? data.score
        : Math.round((1 - aiProbability) * 100);
    return {
      result: classifyFromAiProbability(aiProbability, threshold),
      confidence: aiProbability,
      humanScore,
      source: "detector",
    };
  }

  if (typeof data.human_probability === "number") {
    const humanProbability = normalizeProbability(data.human_probability);
    const aiProbability = 1 - humanProbability;
    return {
      result: classifyFromAiProbability(aiProbability, threshold),
      confidence: aiProbability,
      humanScore: humanProbability * 100,
      source: "detector",
    };
  }

  if (typeof data.score === "number") {
    const humanScore = data.score;
    const aiProbability = humanScoreToAiProbability(humanScore);
    return {
      result: classifyFromAiProbability(aiProbability, threshold),
      confidence: aiProbability,
      humanScore,
      source: "detector",
    };
  }

  if (errorMessage) {
    return {
      result: "error",
      source: "detector",
      message: errorMessage,
    };
  }

  return null;
}

function buildRequestBody(url: string, imageUrl: string) {
  if (isWinstonDetector(url)) {
    return { url: imageUrl, version: "3" };
  }

  return { url: imageUrl, imageUrl };
}

export async function detectImage(imageUrl: string): Promise<ImageDetectionResponse> {
  const config = getImageDetectorConfig();

  if (!config.url) {
    return {
      result: "error",
      source: "unavailable",
      message: "AI_IMAGE_DETECTOR_URL is not configured.",
    };
  }

  if (!config.key) {
    return {
      result: "error",
      source: "unavailable",
      message: "AI_IMAGE_DETECTOR_KEY is not configured.",
    };
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    return {
      result: "error",
      source: "detector",
      message: "Image URL is required.",
    };
  }

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return {
      result: "error",
      source: "detector",
      message: "Image URL must be a public http(s) URL.",
    };
  }

  const analysisUrl = upgradeTwitterImageUrl(trimmedUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify(buildRequestBody(config.url, analysisUrl)),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        extractErrorMessage(json) ||
        `Image detector API returned ${res.status} ${res.statusText}`;
      console.error("Image detector API error:", res.status, json);
      return { result: "error", source: "detector", message };
    }

    const parsed = parseImagePayload(json, config.threshold);
    if (parsed) {
      return parsed;
    }

    console.error("Unrecognized image detector response:", json);
    return {
      result: "error",
      source: "detector",
      message: "Image detector returned an unexpected response format.",
    };
  } catch (err) {
    console.error("Image detector request failed:", err);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Image detector request timed out."
        : "Image detector request failed.";
    return { result: "error", source: "detector", message };
  } finally {
    clearTimeout(timeout);
  }
}
