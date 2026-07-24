/**
 * Record the first-time user walkthrough demo to demo/videos/.
 *
 * Usage: npm run record-walkthrough
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function record() {
  const root = path.join(__dirname, "..");
  const demoPath = "file://" + path.resolve(root, "demo/first-time-walkthrough.html");
  const outDir = path.join(root, "demo", "videos");
  fs.mkdirSync(outDir, { recursive: true });

  // Clear old walkthrough recordings so the newest file is easy to find.
  for (const file of fs.readdirSync(outDir)) {
    if (file.startsWith("walkthrough-") || file.includes("first-time")) {
      fs.unlinkSync(path.join(outDir, file));
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  await page.goto(demoPath, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-demo="first-time-walkthrough"]');

  // Wait until the walkthrough script marks itself done.
  await page.waitForFunction(
    () => document.getElementById("stage")?.dataset.playing === "done",
    { timeout: 45000 }
  );
  await page.waitForTimeout(800);

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    throw new Error("No video was recorded");
  }

  const rawPath = await video.path();
  const finalPath = path.join(outDir, "first-time-walkthrough.webm");
  if (rawPath !== finalPath) {
    fs.renameSync(rawPath, finalPath);
  }

  // Optional MP4 for broader playback (ffmpeg from Playwright cache if present).
  const mp4Path = path.join(outDir, "first-time-walkthrough.mp4");
  try {
    const { execFileSync } = require("child_process");
    const ffmpegCandidates = [
      process.env.FFMPEG_PATH,
      "ffmpeg",
      path.join(
        process.env.HOME || "",
        ".cache/ms-playwright/ffmpeg-1011/ffmpeg-linux"
      ),
    ].filter(Boolean);

    let ffmpeg = null;
    for (const candidate of ffmpegCandidates) {
      try {
        if (candidate === "ffmpeg") {
          execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
          ffmpeg = "ffmpeg";
          break;
        }
        if (fs.existsSync(candidate)) {
          ffmpeg = candidate;
          break;
        }
      } catch {
        /* try next */
      }
    }

    if (ffmpeg) {
      execFileSync(
        ffmpeg,
        [
          "-y",
          "-i",
          finalPath,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-an",
          mp4Path,
        ],
        { stdio: "inherit" }
      );
      console.log("MP4:", mp4Path);
    }
  } catch (err) {
    console.warn("MP4 conversion skipped:", err.message || err);
  }

  console.log("WEB M:", finalPath);
  console.log("Recording saved in demo/videos/");

  // Keep the public demo assets in sync for the site.
  const publicDemo = path.join(root, "public", "demo");
  fs.mkdirSync(publicDemo, { recursive: true });
  for (const name of [
    "first-time-walkthrough.webm",
    "first-time-walkthrough.mp4",
  ]) {
    const src = path.join(outDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(publicDemo, name));
    }
  }
  fs.copyFileSync(
    path.join(root, "demo", "first-time-walkthrough.html"),
    path.join(publicDemo, "first-time-walkthrough.html")
  );
  console.log("Synced public/demo/");

  return finalPath;
}

record().catch((err) => {
  console.error(err);
  process.exit(1);
});
