import {
  classifyFromAiProbability,
  detectProvider,
  humanScoreToAiProbability,
  normalizeProbability,
  type DetectorProvider,
} from "./detectorScores";
import { normalizeDetectionText } from "./detectionText";

const WINSTON_TEXT_URL = "https://api.gowinston.ai/v2/ai-content-detection";

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
  let url = firstEnv("AI_DETECTOR_URL", "DETECTOR_URL");
  const winstonKey = firstEnv("AI_IMAGE_DETECTOR_KEY", "WINSTON_API_KEY");
  let key = firstEnv("AI_DETECTOR_KEY", "DETECTOR_KEY", "AI_DETECTOR_API_KEY");
  const provider = detectProvider(url);

  if (!key && provider === "winston") {
    key = winstonKey;
  }

  if (!url && winstonKey) {
    url = WINSTON_TEXT_URL;
    key = key || winstonKey;
  }

  const resolvedProvider = detectProvider(url);
  const threshold = Number(firstEnv("AI_DETECTOR_THRESHOLD") ?? "0.5");
  const timeoutMs = Number(firstEnv("AI_DETECTOR_TIMEOUT_MS") ?? "15000");

  return {
    url,
    key,
    provider: resolvedProvider,
    winstonKey,
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

async function callDetector(
  url: string,
  key: string | undefined,
  text: string,
  provider: DetectorProvider,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; json: unknown; message?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildRequestHeaders(url, key),
      body: JSON.stringify(buildRequestBody(url, key, text)),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        extractErrorMessage(json) ||
        `Detector API returned ${res.status} ${res.statusText}`;
      return { ok: false, status: res.status, json, message };
    }

    return { ok: true, status: res.status, json };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Detector request timed out."
        : "Detector request failed.";
    return { ok: false, status: 0, json: null, message };
  } finally {
    clearTimeout(timeout);
  }
}

async function detectWithWinstonFallback(
  text: string,
  config: ReturnType<typeof getDetectorConfig>
): Promise<DetectionResponse | null> {
  const winstonKey = config.winstonKey;
  if (!winstonKey || text.length < 300) {
    return null;
  }

  const response = await callDetector(
    WINSTON_TEXT_URL,
    winstonKey,
    text,
    "winston",
    config.timeoutMs
  );

  if (!response.ok) {
    return null;
  }

  const parsed = parseDetectorPayload(response.json, "winston", config.threshold);
  if (!parsed || parsed.result === "error") {
    return null;
  }

  return {
    ...parsed,
    reliability: "high",
    warning:
      "Sapling was unavailable for this post, so Winston AI was used instead. Best results need 300+ characters.",
  };
}

export async function validateDetectorKey(): Promise<{
  status: "ok" | "invalid" | "skipped" | "error";
  message?: string;
}> {
  const config = getDetectorConfig();
  if (!config.url || !config.key) {
    return { status: "skipped", message: "Detector is not configured." };
  }

  const sample =
    config.provider === "winston"
      ? "This is a validation sample for Winston text detection. ".repeat(12)
      : "This is a short validation sample for Sapling text detection.";

  const response = await callDetector(
    config.url,
    config.key,
    sample,
    config.provider,
    Math.min(config.timeoutMs, 10000)
  );

  if (response.ok) {
    const parsed = parseDetectorPayload(response.json, config.provider, config.threshold);
    if (parsed && parsed.result !== "error") {
      return { status: "ok" };
    }
    return {
      status: "error",
      message: "Detector responded but returned an unexpected payload.",
    };
  }

  const message = response.message || extractErrorMessage(response.json);
  if (message?.toLowerCase().includes("invalid api key")) {
    return { status: "invalid", message };
  }

  return { status: "error", message: message || "Detector validation failed." };
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

  const trimmed = normalizeDetectionText(text);
  if (!trimmed) {
    return {
      result: "error",
      source: "detector",
      message: "Text is required.",
    };
  }

  const reliability = getReliabilityWarning(config.provider, trimmed.length);

  const response = await callDetector(
    config.url,
    config.key,
    trimmed,
    config.provider,
    config.timeoutMs
  );

  if (!response.ok) {
    console.error("Detector API error:", response.status, response.json);
    const fallback =
      config.provider === "sapling" ? await detectWithWinstonFallback(trimmed, config) : null;
    if (fallback) {
      return fallback;
    }

    return {
      result: "error",
      source: "detector",
      message: response.message || "Detector request failed.",
    };
  }

  const parsed = parseDetectorPayload(response.json, config.provider, config.threshold);
  if (parsed && parsed.result !== "error") {
    return { ...parsed, ...reliability };
  }

  if (parsed?.result === "error") {
    const fallback =
      config.provider === "sapling" ? await detectWithWinstonFallback(trimmed, config) : null;
    if (fallback) {
      return fallback;
    }
    return parsed;
  }

  console.error("Unrecognized detector response:", response.json);
  const fallback =
    config.provider === "sapling" ? await detectWithWinstonFallback(trimmed, config) : null;
  if (fallback) {
    return fallback;
  }

  return {
    result: "error",
    source: "detector",
    message: "Detector returned an unexpected response format.",
  };
}
