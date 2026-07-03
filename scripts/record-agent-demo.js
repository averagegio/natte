const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

function startServer(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url === "/" ? "/natte-feature-demo.html" : req.url;
      const filePath = path.join(root, decodeURIComponent(url.split("?")[0]));
      if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      const types = {
        ".html": "text/html",
        ".jpg": "image/jpeg",
        ".png": "image/png",
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function record() {
  const demoDir = path.resolve(__dirname, "../demo");
  const outDir = path.resolve(__dirname, "../demo/videos");
  fs.mkdirSync(outDir, { recursive: true });

  const server = await startServer(demoDir);
  const port = server.address().port;
  const demoUrl = `http://127.0.0.1:${port}/natte-feature-demo.html`;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto(demoUrl, { waitUntil: "networkidle" });
  // ~41s to match X Design launch video pacing
  await page.waitForTimeout(42000);
  const video = page.video();
  await context.close();
  await browser.close();
  server.close();

  if (video) {
    const tempPath = await video.path();
    const webmPath = path.join(outDir, "natte-feature-demo.webm");
    const mp4Path = path.join(outDir, "natte-feature-demo.mp4");
    fs.renameSync(tempPath, webmPath);

    execFileSync("ffmpeg", [
      "-y", "-i", webmPath,
      "-c:v", "libx264", "-crf", "17",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      mp4Path,
    ], { stdio: "inherit" });

    console.log(`n.a.t.t.e. feature demo saved to ${mp4Path}`);
  }
}

record().catch((e) => {
  console.error(e);
  process.exit(1);
});
