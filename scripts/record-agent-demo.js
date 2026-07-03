const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function record() {
  const outDir = path.resolve(__dirname, "../demo/videos");
  fs.mkdirSync(outDir, { recursive: true });

  const demoPath = "file://" + path.resolve(__dirname, "../demo/agent-builder-demo.html");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(demoPath);
  // Full demo cycle: ~27s total
  await page.waitForTimeout(28000);
  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tempPath = await video.path();
    const finalPath = path.join(outDir, "agent-builder-demo.webm");
    fs.renameSync(tempPath, finalPath);
    console.log(`Agent Builder demo saved to ${finalPath}`);
  }
}

record().catch((e) => {
  console.error(e);
  process.exit(1);
});
