export type DetectionResult = "human" | "ai" | "error";

export type DetectionResponse = {
  result: DetectionResult;
  confidence?: number;
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

export function getDetectorConfig() {
  const url = firstEnv("AI_DETECTOR_URL", "DETECTOR_URL");
  const key = firstEnv("AI_DETECTOR_KEY", "DETECTOR_KEY", "AI_DETECTOR_API_KEY");
  const threshold = Number(firstEnv("AI_DETECTOR_THRESHOLD") ?? "0.5");
  const timeoutMs = Number(firstEnv("AI_DETECTOR_TIMEOUT_MS") ?? "15000");

  return {
    url,
    key,
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
    provider: config.url?.includes("sapling.ai") ? "sapling" : "custom",
    threshold: config.threshold,
    timeoutMs: config.timeoutMs,
  };
}

function isSaplingDetector(url: string) {
  return url.includes("sapling.ai");
}

function normalizeResult(value: unknown): DetectionResult | null {
  if (typeof value === "boolean") {
    return value ? "ai" : "human";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const config = getDetectorConfig();
    return value >= config.threshold ? "ai" : "human";
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
  const message = data.msg ?? data.message ?? data.error ?? data.detail;

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(data.errors) && typeof data.errors[0] === "string") {
    return data.errors[0];
  }

  return undefined;
}

function parseDetectorPayload(payload: unknown): DetectionResponse | null {
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
        ? data.confidence
        : typeof data.score === "number"
          ? data.score
          : typeof data.probability === "number"
            ? data.probability
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
    const config = getDetectorConfig();
    return {
      result: data.ai_probability >= config.threshold ? "ai" : "human",
      confidence: data.ai_probability,
      source: "detector",
    };
  }

  if (typeof data.score === "number") {
    const config = getDetectorConfig();
    return {
      result: data.score >= config.threshold ? "ai" : "human",
      confidence: data.score,
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

  return { text };
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

  if (isSaplingDetector(config.url) && trimmed.length < 50) {
    return {
      result: "error",
      source: "detector",
      message:
        "This post is too short for reliable AI detection. Sapling works best with at least 50–300 characters.",
    };
  }

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

    const parsed = parseDetectorPayload(json);
    if (parsed) {
      return parsed;
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
