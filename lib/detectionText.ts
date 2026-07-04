const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity) => {
    const lower = entity.toLowerCase();
    if (HTML_ENTITY_MAP[lower]) {
      return HTML_ENTITY_MAP[lower];
    }

    if (lower.startsWith("&#x")) {
      const code = Number.parseInt(lower.slice(3, -1), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }

    if (lower.startsWith("&#")) {
      const code = Number.parseInt(lower.slice(2, -1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }

    return entity;
  });
}

export function normalizeDetectionText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type DetectionInput = {
  text?: string;
  media?: Array<{ altText?: string }>;
};

export function buildDetectionText(input: DetectionInput): string {
  const parts: string[] = [];

  const normalizedText = normalizeDetectionText(input.text || "");
  if (normalizedText) {
    parts.push(normalizedText);
  }

  for (const item of input.media || []) {
    const alt = normalizeDetectionText(item.altText || "");
    if (alt && !parts.includes(alt)) {
      parts.push(alt);
    }
  }

  return parts.join("\n\n");
}
