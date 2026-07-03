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

## Proof of Human — X Pilot

This repo includes a small `AIParserToggle` widget that checks whether a piece of text looks AI-generated. It exposes a server API at `app/api/detect/route.ts` which can proxy to an external detector (set `AI_DETECTOR_URL` and optional `AI_DETECTOR_KEY`) or fall back to a simple heuristic.

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
| `X_BEARER_TOKEN` | No | X API v2 bearer token for live post fetching |
| `X_DEFAULT_USERNAME` | No | X username to fetch posts from (default: `natte`) |
| `AI_DETECTOR_URL` | No | External AI detector endpoint |
| `AI_DETECTOR_KEY` | No | API key for the external detector |

Without `X_BEARER_TOKEN`, the app falls back to demo post data.

