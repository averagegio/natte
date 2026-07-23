export type PitchProjection = {
  year: string;
  customers: number;
  arr: number;
  note: string;
};

export type PitchSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  detail?: string;
  code?: string;
  projections?: PitchProjection[];
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
  version: "1.2",
  slides: [
    {
      id: "title",
      eyebrow: "Pitch deck",
      title: "Proof of Human",
      body: "AI detection for posts, the Chrome feed, widgets, and products that need to know what is still human.",
      detail: "NATTES API · Chrome extension · text + image",
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
      body: "NATTES scores text and images in real time, then surfaces a clear human-or-AI signal you can show in your UI, block in the browser, or enforce in your product.",
      detail: "Same engine powering the Chrome extension, widget, and dashboard.",
    },
    {
      id: "api-text",
      eyebrow: "Text API",
      title: "POST /api/detect",
      body: "Send a string. Get a result, confidence score, and detector source — ready for the extension, widgets, moderation, or review queues.",
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
      id: "chrome-extension",
      eyebrow: "Chrome extension",
      title: "Block AI slop where people actually scroll.",
      body: "A Manifest V3 extension for X that labels posts in the feed and can blur AI content on sight — powered by the same NATTES detect API and the user's signed-in session.",
      detail: "Auto-scan · block AI · optional image detection",
      code: `chrome://extensions → Load unpacked → extension/

Popup → API URL → Open dashboard → sign in
Browse x.com → posts labeled · AI blocked`,
      cta: { label: "Download extension", href: "/extension/natte-chrome.zip" },
    },
    {
      id: "product",
      eyebrow: "Product surface",
      title: "API, Chrome extension, widget, and dashboard.",
      body: "Ship detection in the browser on X, embed the downloadable widget, connect accounts, and manage usage from the dashboard — all on one stack.",
      detail: "OAuth connections · usage limits · Stripe plans",
    },
    {
      id: "sales",
      eyebrow: "Sales projections",
      title: "Path to seven figures.",
      body: "Conservative SaaS ramp on Starter ($7), Pro ($50), and Business ($100) — weighted toward Pro as teams adopt the API, Chrome extension, and widget.",
      detail: "ARR assumes blended net revenue after yearly discounts.",
      projections: [
        {
          year: "Year 1",
          customers: 420,
          arr: 148000,
          note: "Founder-led · extension + widget pilots",
        },
        {
          year: "Year 2",
          customers: 1600,
          arr: 620000,
          note: "Self-serve + partner channels",
        },
        {
          year: "Year 3",
          customers: 3800,
          arr: 1450000,
          note: "Enterprise seats · API volume",
        },
      ],
    },
    {
      id: "why",
      eyebrow: "Why NATTES",
      title: "Fast signals. Clear answers.",
      body: "Designed for short-form posts, not 10,000-word essays. One request, one decisive result — in your product or right in the Chrome feed.",
      detail: "Sapling + Winston detectors behind a stable contract.",
    },
    {
      id: "close",
      eyebrow: "Next step",
      title: "Stop guessing. Start detecting.",
      body: "Install the Chrome extension, explore pricing, open the dashboard, or pull this deck as JSON for your own presentations.",
      detail: "GET /api/pitch",
      cta: { label: "View pricing", href: "/pricing" },
    },
  ],
};

export function getPitchDeck(): PitchDeck {
  return PITCH_DECK;
}

export function formatArr(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`;
  }
  return `$${amount}`;
}
