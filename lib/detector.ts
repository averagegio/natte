export type DetectionResult = "human" | "ai" | "error";

export type DetectionResponse = {
  result: DetectionResult;
  confidence?: number;
  source: "detector" | "unavailable";
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
  return Boolean(getDetectorConfig().url);
}

export function getDetectorStatus() {
  const config = getDetectorConfig();
  return {
    configured: Boolean(config.url),
    hasApiKey: Boolean(config.key),
    threshold: config.threshold,
    timeoutMs: config.timeoutMs,
  };
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

function parseDetectorPayload(payload: unknown): DetectionResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;

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

export async function detectText(text: string): Promise<DetectionResponse> {
  const config = getDetectorConfig();

  if (!config.url) {
    return {
      result: "error",
      source: "unavailable",
    };
  }

  if (!text.trim()) {
    return {
      result: "error",
      source: "detector",
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
        ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("Detector API error:", res.status, json);
      return { result: "error", source: "detector" };
    }

    const parsed = parseDetectorPayload(json);
    if (parsed) {
      return parsed;
    }

    console.error("Unrecognized detector response:", json);
    return { result: "error", source: "detector" };
  } catch (err) {
    console.error("Detector request failed:", err);
    return { result: "error", source: "detector" };
  } finally {
    clearTimeout(timeout);
  }
}
