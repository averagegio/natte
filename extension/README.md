# natte Chrome extension

AI blocker for X (Twitter). Detects AI-generated posts and optionally blurs them out.

## Install (unpacked)

1. Start the natte app (`npm run dev`) or point the extension at your deployed URL.
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this `extension/` folder
5. Open the popup → set **API base URL** (default `http://127.0.0.1:3000`)
6. Click **Open dashboard** and sign in (session cookies power detection)
7. Visit [x.com](https://x.com) — posts get a **Check with natte** control; with auto-scan on they label themselves

## Package a zip

From the repo root:

```bash
npm run extension:pack
```

This writes `public/extension/natte-chrome.zip` for download from the site.

## Settings

| Setting | Default | Description |
|---|---|---|
| Enabled | on | Master switch for content script UI |
| Auto-scan posts | on | Run detection as posts enter the feed |
| Block AI posts | on | Blur / overlay posts flagged as AI |
| Scan images | off | Also call `/api/detect/image` (uses more credits) |
| API base URL | `http://127.0.0.1:3000` | Your natte backend |

## How it works

- Content script watches `article[data-testid="tweet"]` on x.com / twitter.com
- Background service worker calls `/api/detect` (and optionally `/api/detect/image`) with `credentials: "include"` so your natte login session is used
- Results are cached in the service worker to limit repeat API calls while scrolling

## Permissions

- **storage** — sync settings across Chrome profiles on the same machine
- **Host access to X** — inject detection UI into the feed
- **Host access to your natte API** — localhost by default; production HTTPS hosts are requested when you save a custom API URL
