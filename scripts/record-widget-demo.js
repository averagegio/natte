const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const VIEWPORT = { width: 1280, height: 720 };
const VIDEO_DIR = path.resolve(__dirname, "../demo/videos");
const OUTPUT_NAME = "widget-toggle-demo.webm";

async function waitForServer(url, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function recordStandaloneDemo() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const demoPath = "file://" + path.resolve(__dirname, "../demo/x-widget-demo.html");

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.goto(demoPath);

  // Full scripted demo: splash + 3 toggles + outro pause
  await page.waitForTimeout(14000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const savedPath = await video.path();
    const outputPath = path.join(VIDEO_DIR, OUTPUT_NAME);
    fs.renameSync(savedPath, outputPath);
    console.log(`Recording saved to ${outputPath}`);
    return outputPath;
  }

  throw new Error("No video was recorded");
}

async function recordAppDemo() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const projectRoot = path.resolve(__dirname, "..");

  const server = spawn("npm", ["run", "dev", "--", "--port", "3000"], {
    cwd: projectRoot,
    stdio: "pipe",
    env: { ...process.env, PORT: "3000" },
  });

  try {
    await waitForServer("http://localhost:3000");

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
    });
    const page = await context.newPage();
    await page.goto("http://localhost:3000");

    await page.click('button[aria-label="Scroll to main content"]');
    await page.waitForTimeout(1200);

    const postsHeading = page.getByRole("heading", { name: "Try it with sample posts" });
    await postsHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const postCards = page.locator("section").filter({ has: postsHeading }).locator(".rounded-2xl.border");

    for (let i = 0; i < 3; i++) {
      const card = postCards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.locator("button").click();
      await page.waitForTimeout(1800);
    }

    await page.waitForTimeout(1500);

    const video = page.video();
    await context.close();
    await browser.close();

    if (video) {
      const savedPath = await video.path();
      const outputPath = path.join(VIDEO_DIR, OUTPUT_NAME);
      fs.renameSync(savedPath, outputPath);
      console.log(`Recording saved to ${outputPath}`);
      return outputPath;
    }

    throw new Error("No video was recorded");
  } finally {
    server.kill("SIGTERM");
  }
}

async function main() {
  const mode = process.argv[2] || "standalone";

  if (mode === "app") {
    await recordAppDemo();
    return;
  }

  await recordStandaloneDemo();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
