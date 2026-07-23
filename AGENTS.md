<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

`natte` ("Proof of Human") is a single npm-managed Next.js 16 / React 19 app. Package manager is npm (`package-lock.json`). Scripts live in `package.json`: `dev`, `build`, `start`, `lint`, `record-demo`.

- Run the app: `npm run dev` (Turbopack, serves on port 3000). This is the only service needed to exercise the product end to end.
- The `/api/detect` route and `lib/xClient.ts` gracefully fall back to a built-in heuristic / mocked X posts, so no secrets or external services are required. Optional env vars: `AI_DETECTOR_URL`, `AI_DETECTOR_KEY`, `X_BEARER_TOKEN`.
- No automated test suite exists (no `test` script, no `*.test.*`/`*.spec.*` files). `npm run lint` currently reports pre-existing lint errors/warnings in `lib/xClient.ts` and `scripts/record-demo.js` — these are not environment problems.
- `npm run build` fetches Geist fonts from Google Fonts at build time, so it needs outbound network access.
