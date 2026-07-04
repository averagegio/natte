import {
  classifyFromAiProbability,
  detectProvider,
  humanScoreToAiProbability,
  normalizeProbability,
  type DetectorProvider,
} from "./detectorScores";

export type DetectionResult = "human" | "ai" | "error";

export type DetectionResponse = {
  result: DetectionResult;
  confidence?: number;
  humanScore?: number;
  source: "detector" | "unavailable";
  message?: string;
  reliability?: "high" | "low";
  warning?: string;
};

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getDetectorConfig() {
  const url = firstEnv("AI_DETECTOR_URL", "DETECTOR_URL");
  const provider = detectProvider(url);
  let key = firstEnv("AI_DETECTOR_KEY", "DETECTOR_KEY", "AI_DETECTOR_API_KEY");

  if (!key && provider === "winston") {
    key = firstEnv("AI_IMAGE_DETECTOR_KEY", "WINSTON_API_KEY");
  }

  const threshold = Number(firstEnv("AI_DETECTOR_THRESHOLD") ?? "0.5");
  const timeoutMs = Number(firstEnv("AI_DETECTOR_TIMEOUT_MS") ?? "15000");

  return {
    url,
    key,
    provider,
    threshold: Number.isFinite(threshold) ? threshold : 0.5,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
  };
}

export function isDetectorConfigured() {
  const config = getDetectorConfig();
  return Boolean(config.url && config.key);
}

export function getDetectorStatus() {
  const config = getDetectorConfig();
  return {
    configured: isDetectorConfigured(),
    hasApiKey: Boolean(config.key),
    hasUrl: Boolean(config.url),
    provider: config.provider,
    threshold: config.threshold,
    timeoutMs: config.timeoutMs,
  };
}

function isSaplingDetector(url: string) {
  return url.includes("sapling.ai");
}

function isWinstonDetector(url: string) {
  return url.includes("gowinston.ai");
}

function normalizeResult(value: unknown): DetectionResult | null {
  if (typeof value === "boolean") {
    return value ? "ai" : "human";
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["ai", "machine", "bot", "generated", "fake"].includes(normalized)) {
    return "ai";
  }
  if (["human", "real", "authentic", "genuine"].includes(normalized)) {
    return "human";
  }
  if (normalized === "error") {
    return "error";
  }

  return null;
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const data = payload as Record<string, unknown>;
  const message = data.msg ?? data.message ?? data.error ?? data.detail ?? data.description;

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(data.errors) && typeof data.errors[0] === "string") {
    return data.errors[0];
  }

  return undefined;
}

function parseScoreValue(
  score: number,
  provider: DetectorProvider,
  threshold: number
): Pick<DetectionResponse, "result" | "confidence" | "humanScore"> {
  if (provider === "winston" || score > 1) {
    const humanScore = score > 1 ? score : score * 100;
    const aiProbability = humanScoreToAiProbability(humanScore);
    return {
      result: classifyFromAiProbability(aiProbability, threshold),
      confidence: aiProbability,
      humanScore,
    };
  }

  const aiProbability = normalizeProbability(score);
  return {
    result: classifyFromAiProbability(aiProbability, threshold),
    confidence: aiProbability,
  };
}

function parseDetectorPayload(
  payload: unknown,
  provider: DetectorProvider,
  threshold: number
): DetectionResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const errorMessage = extractErrorMessage(payload);
  if (errorMessage && typeof data.score !== "number") {
    return {
      result: "error",
      source: "detector",
      message: errorMessage,
    };
  }

  const direct =
    normalizeResult(data.result) ??
    normalizeResult(data.label) ??
    normalizeResult(data.prediction) ??
    normalizeResult(data.classification) ??
    normalizeResult(data.verdict);

  if (direct) {
    const confidence =
      typeof data.confidence === "number"
        ? normalizeProbability(data.confidence)
        : typeof data.score === "number"
          ? parseScoreValue(data.score, provider, threshold).confidence
          : typeof data.probability === "number"
            ? normalizeProbability(data.probability)
            : undefined;

    return { result: direct, confidence, source: "detector" };
  }

  if (typeof data.is_ai === "boolean") {
    return {
      result: data.is_ai ? "ai" : "human",
      source: "detector",
    };
  }

  if (typeof data.ai_probability === "number") {
    const aiProbability = normalizeProbability(data.ai_probability);
    return {
      result: classifyFromAiProbability(aiProbability, threshold),
      confidence: aiProbability,
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
    return {
      ...parseScoreValue(data.score, provider, threshold),
      source: "detector",
    };
  }

  return null;
}

function buildRequestBody(url: string, key: string | undefined, text: string) {
  if (isSaplingDetector(url)) {
    return {
      key,
      text,
      sent_scores: false,
    };
  }

  if (isWinstonDetector(url)) {
    return {
      text,
      version: "latest",
      sentences: true,
    };
  }

  return { text };
}

function buildRequestHeaders(url: string, key: string | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (key && !isSaplingDetector(url)) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function getReliabilityWarning(
  provider: DetectorProvider,
  textLength: number
): Pick<DetectionResponse, "reliability" | "warning"> {
  if (provider === "winston" && textLength < 300) {
    return {
      reliability: "low",
      warning:
        "Short posts are less reliable for Winston text detection. Results work best with 300+ characters.",
    };
  }

  if (provider === "sapling" && textLength < 50) {
    return {
      reliability: "low",
      warning:
        "Short posts are less reliable for AI text detection. Try a longer post for a stronger signal.",
    };
  }

  return { reliability: "high" };
}

export async function detectText(text: string): Promise<DetectionResponse> {
  const config = getDetectorConfig();

  if (!config.url) {
    return {
      result: "error",
      source: "unavailable",
      message: "AI_DETECTOR_URL is not configured.",
    };
  }

  if (!config.key) {
    return {
      result: "error",
      source: "unavailable",
      message: "AI_DETECTOR_KEY is not configured.",
    };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      result: "error",
      source: "detector",
      message: "Text is required.",
    };
  }

  const reliability = getReliabilityWarning(config.provider, trimmed.length);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: buildRequestHeaders(config.url, config.key),
      body: JSON.stringify(buildRequestBody(config.url, config.key, trimmed)),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        extractErrorMessage(json) ||
        `Detector API returned ${res.status} ${res.statusText}`;
      console.error("Detector API error:", res.status, json);
      return { result: "error", source: "detector", message };
    }

    const parsed = parseDetectorPayload(json, config.provider, config.threshold);
    if (parsed) {
      return { ...parsed, ...reliability };
    }

    console.error("Unrecognized detector response:", json);
    return {
      result: "error",
      source: "detector",
      message: "Detector returned an unexpected response format.",
    };
  } catch (err) {
    console.error("Detector request failed:", err);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Detector request timed out."
        : "Detector request failed.";
    return { result: "error", source: "detector", message };
  } finally {
    clearTimeout(timeout);
  }
}
