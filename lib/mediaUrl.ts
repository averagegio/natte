const ALLOWED_MEDIA_HOSTS = new Set(["pbs.twimg.com", "video.twimg.com"]);

export function isAllowedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_MEDIA_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function getProxiedMediaUrl(url: string): string {
  return `/api/media/proxy?url=${encodeURIComponent(url)}`;
}

type XApiMediaVariant = {
  url?: string;
  content_type?: string;
};

export type XApiMediaItem = {
  media_key: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
  variants?: XApiMediaVariant[];
};

export function resolveMediaUrl(item: XApiMediaItem): string | null {
  if (item.type === "photo") {
    return item.url || item.preview_image_url || null;
  }

  if (item.preview_image_url) {
    return item.preview_image_url;
  }

  const imageVariant = (item.variants ?? []).find((variant) =>
    variant.content_type?.startsWith("image/")
  );
  if (imageVariant?.url) {
    return imageVariant.url;
  }

  return item.url || null;
}
