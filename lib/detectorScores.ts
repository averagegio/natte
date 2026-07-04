export type DetectorProvider = "sapling" | "winston" | "custom";

export function detectProvider(url: string | undefined): DetectorProvider {
  if (!url) return "custom";
  if (url.includes("sapling.ai")) return "sapling";
  if (url.includes("gowinston.ai")) return "winston";
  return "custom";
}

/** Normalize a probability that may be returned as 0-1 or 0-100. */
export function normalizeProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

/** Convert a human score (0-100, higher = more human) to AI probability. */
export function humanScoreToAiProbability(humanScore: number): number {
  const normalized = humanScore <= 1 ? humanScore * 100 : humanScore;
  return Math.max(0, Math.min(1, (100 - normalized) / 100));
}

export function classifyFromAiProbability(
  aiProbability: number,
  threshold: number
): "human" | "ai" {
  return aiProbability >= threshold ? "ai" : "human";
}

/** Request full-resolution X/Twitter images for better detector accuracy. */
export function upgradeTwitterImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("twimg.com")) {
      return url;
    }

    parsed.searchParams.set("name", "orig");
    return parsed.toString();
  } catch {
    return url;
  }
}
