import {
  classifyFromAiProbability,
  detectProvider,
  humanScoreToAiProbability,
  normalizeDetectorUrl,
  normalizeProbability,
  sanitizeEnv,
  type DetectorProvider,
} from "./detectorScores";
import { normalizeDetectionText } from "./detectionText";

const WINSTON_TEXT_URL = "https://api.gowinston.ai/v2/ai-content-detection";
const ACTIVE_DETECTOR_CACHE_MS = 5 * 60 * 1000;

type ActiveDetectorConfig = {
  url: string;
  key: string;
  provider: DetectorProvider;
  threshold: number;
  timeoutMs: number;
  winstonKey?: string;
  preference: "auto" | "sapling" | "winston";
};

type ActiveDetectorCache = ActiveDetectorConfig & {
  expiresAt: number;
};

let activeDetectorCache: ActiveDetectorCache | null = null;

function isSaplingUnavailableMessage(message?: string): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("sapling.ai") ||
    normalized.includes("subscription expired") ||
    normalized.includes("invalid api key")
  );
}

export function formatDetectorErrorMessage(message?: string): string {
  if (!message) {
    return "The AI detector could not analyze this text.";
  }

  if (isSaplingUnavailableMessage(message)) {
    return "Sapling text API is unavailable (expired or invalid key). Winston is used automatically for longer posts. This is separate from your NATTES subscription.";
  }

  return message;
}

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
    const value = sanitizeEnv(process.env[name]);
    if (value) return value;
  }
  return undefined;
}

function getTextDetectorPreference(): "auto" | "sapling" | "winston" {
  const value = firstEnv("AI_TEXT_DETECTOR_PROVIDER", "AI_DETECTOR_PROVIDER")?.toLowerCase();
  if (value === "sapling" || value === "winston") {
    return value;
  }
  return "auto";
}

export function getDetectorConfig() {
  const preference = getTextDetectorPreference();
  const winstonKey = firstEnv("AI_IMAGE_DETECTOR_KEY", "WINSTON_API_KEY");
  let url = normalizeDetectorUrl(firstEnv("AI_DETECTOR_URL", "DETECTOR_URL"));
  let key = firstEnv("AI_DETECTOR_KEY", "DETECTOR_KEY", "AI_DETECTOR_API_KEY");
  let provider = detectProvider(url);

  if (preference === "winston" && winstonKey) {
    url = WINSTON_TEXT_URL;
    key = key || winstonKey;
    provider = "winston";
  } else if (!url && winstonKey) {
    url = WINSTON_TEXT_URL;
    key = key || winstonKey;
    provider = "winston";
  } else if (provider === "winston" && !key) {
    key = winstonKey;
  }

  const threshold = Number(firstEnv("AI_DETECTOR_THRESHOLD") ?? "0.5");
  const timeoutMs = Number(firstEnv("AI_DETECTOR_TIMEOUT_MS") ?? "15000");

  return {
    url,
    key,
    provider,
    preference,
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
        : err instanceof Error
          ? err.message.includes("URL")
            ? `Invalid detector URL: ${err.message}`
            : err.message
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
  provider?: DetectorProvider;
  message?: string;
}> {
  const config = getDetectorConfig();
  if (!config.url || !config.key) {
    return { status: "skipped", message: "Detector is not configured." };
  }

  return validateDetectorEndpoint({
    url: config.url,
    key: config.key,
    provider: config.provider,
    timeoutMs: config.timeoutMs,
  });
}

export async function validateWinstonTextKey(): Promise<{
  status: "ok" | "invalid" | "skipped" | "error";
  provider: "winston";
  message?: string;
}> {
  const config = getDetectorConfig();
  if (!config.winstonKey) {
    return {
      status: "skipped",
      provider: "winston",
      message: "Winston text detector key is not configured.",
    };
  }

  const result = await validateDetectorEndpoint({
    url: WINSTON_TEXT_URL,
    key: config.winstonKey,
    provider: "winston",
    timeoutMs: config.timeoutMs,
  });

  return { ...result, provider: "winston" };
}

export async function resolveTextDetectorValidation(): Promise<{
  activeProvider: DetectorProvider | null;
  primary: Awaited<ReturnType<typeof validateDetectorKey>>;
  winston: Awaited<ReturnType<typeof validateWinstonTextKey>>;
}> {
  const config = getDetectorConfig();
  const primary = await validateDetectorKey();
  const winston = await validateWinstonTextKey();

  if (primary.status === "ok") {
    return { activeProvider: config.provider, primary, winston };
  }

  if (config.preference === "auto" && winston.status === "ok") {
    return { activeProvider: "winston", primary, winston };
  }

  return { activeProvider: null, primary, winston };
}

export async function getActiveTextDetectorConfig(): Promise<ActiveDetectorConfig> {
  const config = getDetectorConfig();
  if (!config.url || !config.key) {
    throw new Error("Text detector is not configured.");
  }

  const now = Date.now();
  if (activeDetectorCache && activeDetectorCache.expiresAt > now) {
    return activeDetectorCache;
  }

  if (config.preference === "winston" && config.winstonKey) {
    activeDetectorCache = {
      expiresAt: now + ACTIVE_DETECTOR_CACHE_MS,
      url: WINSTON_TEXT_URL,
      key: config.winstonKey,
      provider: "winston",
      threshold: config.threshold,
      timeoutMs: config.timeoutMs,
      winstonKey: config.winstonKey,
      preference: config.preference,
    };
    return activeDetectorCache;
  }

  const resolved = await resolveTextDetectorValidation();
  const useWinston =
    resolved.activeProvider === "winston" && Boolean(config.winstonKey);

  activeDetectorCache = {
    expiresAt: now + ACTIVE_DETECTOR_CACHE_MS,
    url: useWinston ? WINSTON_TEXT_URL : config.url,
    key: useWinston ? config.winstonKey! : config.key,
    provider: useWinston ? "winston" : config.provider,
    threshold: config.threshold,
    timeoutMs: config.timeoutMs,
    winstonKey: config.winstonKey,
    preference: config.preference,
  };

  return activeDetectorCache;
}

async function validateDetectorEndpoint({
  url,
  key,
  provider,
  timeoutMs,
}: {
  url: string;
  key: string;
  provider: DetectorProvider;
  timeoutMs: number;
}): Promise<{
  status: "ok" | "invalid" | "skipped" | "error";
  provider?: DetectorProvider;
  message?: string;
}> {
  const sample =
    provider === "winston"
      ? "This is a validation sample for Winston text detection. ".repeat(12)
      : "This is a short validation sample for Sapling text detection.";

  const response = await callDetector(
    url,
    key,
    sample,
    provider,
    Math.min(timeoutMs, 10000)
  );

  if (response.ok) {
    const parsed = parseDetectorPayload(response.json, provider, 0.5);
    if (parsed && parsed.result !== "error") {
      return { status: "ok", provider };
    }
    return {
      status: "error",
      provider,
      message: parsed?.message || "Detector responded but returned an unexpected payload.",
    };
  }

  const message = response.message || extractErrorMessage(response.json);
  const normalized = message?.toLowerCase() || "";

  if (
    normalized.includes("invalid api key") ||
    normalized.includes("unauthorized") ||
    response.status === 401
  ) {
    return { status: "invalid", provider, message: formatDetectorErrorMessage(message) };
  }

  if (normalized.includes("invalid detector url") || normalized.includes("failed to parse url")) {
    return {
      status: "error",
      provider,
      message:
        message ||
        "AI_DETECTOR_URL is invalid. Use https://api.sapling.ai/api/v1/aidetect",
    };
  }

  if (isSaplingUnavailableMessage(message)) {
    return {
      status: "error",
      provider,
      message: formatDetectorErrorMessage(message),
    };
  }

  return { status: "error", provider, message: message || "Detector validation failed." };
}

async function detectWithConfiguredProvider(
  text: string,
  config: ReturnType<typeof getDetectorConfig>,
  url: string,
  key: string,
  provider: DetectorProvider
): Promise<DetectionResponse> {
  const reliability = getReliabilityWarning(provider, text.length);
  const response = await callDetector(url, key, text, provider, config.timeoutMs);

  if (!response.ok) {
    return {
      result: "error",
      source: "detector",
      message: response.message || "Detector request failed.",
    };
  }

  const parsed = parseDetectorPayload(response.json, provider, config.threshold);
  if (parsed && parsed.result !== "error") {
    return { ...parsed, ...reliability };
  }

  if (parsed?.result === "error") {
    return parsed;
  }

  return {
    result: "error",
    source: "detector",
    message: "Detector returned an unexpected response format.",
  };
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
  let config: ActiveDetectorConfig;
  try {
    config = await getActiveTextDetectorConfig();
  } catch {
    return {
      result: "error",
      source: "unavailable",
      message: "AI_DETECTOR_URL is not configured.",
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

  if (config.provider === "winston" && trimmed.length < 300) {
    return {
      result: "error",
      source: "detector",
      message:
        "This post is too short for Winston text detection (300+ characters). Renew your Sapling API plan for short-post detection, or try a longer post.",
      reliability: "low",
    };
  }

  const result = await detectWithConfiguredProvider(
    trimmed,
    {
      url: config.url,
      key: config.key,
      provider: config.provider,
      threshold: config.threshold,
      timeoutMs: config.timeoutMs,
      winstonKey: config.winstonKey,
      preference: config.preference,
    },
    config.url,
    config.key,
    config.provider
  );

  if (result.result !== "error") {
    if (config.provider === "winston" && config.preference !== "winston") {
      return {
        ...result,
        warning:
          result.warning ||
          "Sapling text API is unavailable, so Winston AI was used for this post.",
      };
    }
    return result;
  }

  if (config.winstonKey && trimmed.length >= 300) {
    const winstonResult = await detectWithWinstonFallback(trimmed, {
      url: config.url,
      key: config.key,
      provider: config.provider,
      threshold: config.threshold,
      timeoutMs: config.timeoutMs,
      winstonKey: config.winstonKey,
      preference: config.preference,
    });
    if (winstonResult) {
      return winstonResult;
    }
  }

  return {
    ...result,
    message: formatDetectorErrorMessage(result.message),
  };
}
