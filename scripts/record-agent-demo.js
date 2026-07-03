const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function record() {
  const outDir = path.resolve(__dirname, "../demo/videos");
  fs.mkdirSync(outDir, { recursive: true });

  const demoPath = "file://" + path.resolve(__dirname, "../demo/natte-feature-demo.html");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(demoPath);
  // Full demo cycle: ~33s total
  await page.waitForTimeout(19000);
  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tempPath = await video.path();
    const webmPath = path.join(outDir, "natte-feature-demo.webm");
    const mp4Path = path.join(outDir, "natte-feature-demo.mp4");
    fs.renameSync(tempPath, webmPath);

    execFileSync("ffmpeg", [
      "-y",
      "-i",
      webmPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4Path,
    ], { stdio: "inherit" });

    console.log(`n.a.t.t.e. feature demo saved to ${mp4Path}`);
  }
}

record().catch((e) => {
  console.error(e);
  process.exit(1);
});
