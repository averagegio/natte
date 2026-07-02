const { chromium } = require('playwright');
const path = require('path');

async function record() {
  const demoPath = 'file://' + path.resolve(__dirname, '../demo/demo.html');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'demo/videos/', size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(demoPath);
  // Wait long enough for the demo auto-click to happen
  await page.waitForTimeout(3500);
  const videos = context.pages().map(p => p.video()).filter(Boolean);
  await context.close();
  await browser.close();
  console.log('Recording saved in demo/videos/');
}

record().catch(e=>{ console.error(e); process.exit(1)});
