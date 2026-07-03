const { chromium } = require("playwright");
const path = require("path");

async function record() {
  const demoPath = "file://" + path.resolve(__dirname, "../demo/agent-builder-demo.html");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: "demo/videos/", size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(demoPath);
  // Full demo cycle: ~27s total
  await page.waitForTimeout(28000);
  await context.close();
  await browser.close();
  console.log("Agent Builder demo recording saved in demo/videos/");
}

record().catch((e) => {
  console.error(e);
  process.exit(1);
});
