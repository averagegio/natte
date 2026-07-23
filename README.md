# natte

AI blocker widget because the slop has to stop.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Chrome extension

Block AI slop on X with the unpacked extension in `extension/`.

1. Run the app (`npm run dev`) or deploy it
2. Open Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`
3. In the popup, set the API base URL (default `http://127.0.0.1:3000`) and sign in via **Open dashboard**
4. Browse [x.com](https://x.com) — posts are labeled and AI content can be blurred

Pack a downloadable zip (also served at `/extension/natte-chrome.zip`):

```bash
npm run extension:pack
```

See [`extension/README.md`](extension/README.md) for settings and permissions.

## Proof of Human — X Pilot

This repo includes a small `AIParserToggle` widget that checks whether a piece of text looks AI-generated. It exposes a server API at `app/api/detect/route.ts` which can proxy to an external detector (set `AI_DETECTOR_URL` and optional `AI_DETECTOR_KEY`).

Quick demo (creates a short screen recording using Playwright):

1. Install dev dependencies:

```bash
npm install
npx playwright install
```

2. Run the recorder (it opens `demo/demo.html` and saves a video in `demo/videos/`):

```bash
npm run record-demo
```

You can also run the Next.js app and see the widget at the homepage:

```bash
npm run dev
```

## Environment Variables

Set these in Vercel (or locally via `.env.local`). See `.env.example` for the full list.

| Variable | Required | Description |
|---|---|---|
| `X_CLIENT_ID` | For OAuth | X Developer App client ID |
| `X_CLIENT_SECRET` | For OAuth | X Developer App client secret |
| `X_BEARER_TOKEN` | No | App-only bearer token for live post fetching |
| `X_DEFAULT_USERNAME` | No | X username to fetch posts from (default: `natte`) |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | App URL for OAuth callback and Stripe |
| `AI_DETECTOR_URL` | **Yes** | Text detector endpoint (Sapling or Winston) |
| `AI_DETECTOR_KEY` | **Yes** | API key for the text detector (Winston can reuse `AI_IMAGE_DETECTOR_KEY`) |
| `AI_DETECTOR_THRESHOLD` | No | Score threshold for AI classification (default: `0.5`) |
| `AI_IMAGE_DETECTOR_URL` | For images | Image detector endpoint (default: Winston AI) |
| `AI_IMAGE_DETECTOR_KEY` | For images | Winston AI API key (`WINSTON_API_KEY` alias supported) |
| `DETECT_REQUIRE_SUBSCRIPTION` | No | Require login + active plan (default: `true` in production) |

Without `AI_DETECTOR_URL`, detection returns **503 unavailable** — the heuristic fallback has been removed.

### Text detection

**Sapling (recommended for short posts / tweets):**

```
AI_DETECTOR_URL=https://api.sapling.ai/api/v1/aidetect
AI_DETECTOR_KEY=<your 32-char Sapling key>
```

Sapling returns a 0–1 AI probability score. Short tweets may be less reliable — the UI will warn you but still runs detection.

**Winston AI (better for longer text, 300+ characters):**

```
AI_DETECTOR_URL=https://api.gowinston.ai/v2/ai-content-detection
AI_DETECTOR_KEY=<your Winston key>   # or reuse AI_IMAGE_DETECTOR_KEY
```

Winston returns a 0–100 human score. Use the same key as image detection if you already have Winston configured.

### Detector API contract

Your detector should accept:

```json
POST { "text": "string to analyze" }
```

And return any of these shapes:

```json
{ "result": "ai" }
{ "result": "human" }
{ "score": 0.92 }
{ "is_ai": true }
{ "ai_probability": 0.92 }
```

Authorization header is sent when `AI_DETECTOR_KEY` is set.

### Image detection (Winston AI)

Set `AI_IMAGE_DETECTOR_KEY` from [gowinston.ai](https://gowinston.ai/ai-image-detector-api/). The API accepts a public image URL:

```json
POST { "imageUrl": "https://pbs.twimg.com/media/example.jpg" }
→ { "result": "ai" | "human", "confidence": 0.87 }
```

Image detection costs ~300 Winston credits per image. Posts with photos from X are analyzed automatically when media is attached.

### X Developer App setup

1. Create an app at [developer.x.com](https://developer.x.com/en/portal/dashboard)
2. Enable OAuth 2.0 and add callback URL: `https://your-domain.com/api/connections/x/callback`
3. Set `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `X_BEARER_TOKEN` in Vercel env vars
4. Go to `/dashboard` and click **Connect with X**

The downloadable widget supports X feed embeds via `data-natte-x-username` — see the setup guide on the homepage.

