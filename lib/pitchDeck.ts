export type PitchSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  code?: string;
  cta?: { label: string; href: string };
};

export type PitchDeck = {
  brand: string;
  product: string;
  tagline: string;
  version: string;
  slides: PitchSlide[];
};

export const PITCH_DECK: PitchDeck = {
  brand: "Proof of Human",
  product: "NATTES",
  tagline: "AI detection API for the real web.",
  version: "1.0",
  slides: [
    {
      id: "title",
      eyebrow: "Pitch deck",
      title: "Proof of Human",
      body: "AI detection for posts, widgets, and products that need to know what is still human.",
      detail: "NATTES API · text + image",
    },
    {
      id: "problem",
      eyebrow: "The problem",
      title: "The slop does not stop on its own.",
      body: "Feeds, comments, and product surfaces are flooded with machine-written text and synthetic images. Readers lose trust. Platforms lose signal.",
      detail: "Short-form content is especially hard to judge by eye alone.",
    },
    {
      id: "solution",
      eyebrow: "The solution",
      title: "A detection API built for the feed.",
      body: "NATTES scores text and images in real time, then surfaces a clear human-or-AI signal you can show in your UI or enforce in your product.",
      detail: "Same engine powering the Proof of Human widget and dashboard.",
    },
    {
      id: "api-text",
      eyebrow: "Text API",
      title: "POST /api/detect",
      body: "Send a string. Get a result, confidence score, and detector source — ready for widgets, moderation, or review queues.",
      code: `POST /api/detect
{ "text": "Is this post human?" }

→ { "result": "ai" | "human", "score": 0.92 }`,
    },
    {
      id: "api-image",
      eyebrow: "Image API",
      title: "POST /api/detect/image",
      body: "Pass a public image URL. Receive an AI-or-human classification with confidence — built for media-heavy posts.",
      code: `POST /api/detect/image
{ "imageUrl": "https://…/photo.jpg" }

→ { "result": "ai" | "human", "confidence": 0.87 }`,
    },
    {
      id: "product",
      eyebrow: "Product surface",
      title: "API, widget, and dashboard.",
      body: "Ship the downloadable browser widget, connect X accounts, and manage usage from the dashboard — all on the same detection stack.",
      detail: "OAuth connections · usage limits · Stripe plans",
    },
    {
      id: "why",
      eyebrow: "Why NATTES",
      title: "Fast signals. Clear answers.",
      body: "Designed for short-form posts, not 10,000-word essays. One request, one decisive result, with subscription-aware access when you need it.",
      detail: "Sapling + Winston detectors behind a stable contract.",
    },
    {
      id: "close",
      eyebrow: "Next step",
      title: "Stop guessing. Start detecting.",
      body: "Explore pricing, open the dashboard, or hit the pitch API to pull this deck as JSON for your own presentations.",
      detail: "GET /api/pitch",
      cta: { label: "View pricing", href: "/pricing" },
    },
  ],
};

export function getPitchDeck(): PitchDeck {
  return PITCH_DECK;
}
