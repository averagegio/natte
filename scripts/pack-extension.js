#!/usr/bin/env node
/**
 * Pack extension/ into public/extension/natte-chrome.zip for site download.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const src = path.join(root, "extension");
const outDir = path.join(root, "public", "extension");
const outZip = path.join(outDir, "natte-chrome.zip");

if (!fs.existsSync(src)) {
  console.error("extension/ folder missing");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

// zip is widely available in CI/dev images
execFileSync(
  "zip",
  ["-r", outZip, ".", "-x", "*.DS_Store", "-x", "**/.git/**"],
  { cwd: src, stdio: "inherit" }
);

const bytes = fs.statSync(outZip).size;
console.log(`Wrote ${path.relative(root, outZip)} (${bytes} bytes)`);
