/**
 * Smoke-test: launch Chromium with the unpacked natte extension loaded.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const extensionPath = path.join(__dirname, "..", "extension");
  const userDataDir = path.join(__dirname, "..", "demo", ".ext-profile");
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
    ],
  });

  // Wait for service worker / extension to register
  let sw = context.serviceWorkers()[0];
  if (!sw) {
    sw = await context.waitForEvent("serviceworker", { timeout: 15000 });
  }

  const swUrl = sw.url();
  const extensionId = swUrl.split("/")[2];
  console.log("service_worker:", swUrl);
  console.log("extension_id:", extensionId);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionPath, "manifest.json"), "utf8")
  );
  console.log("manifest_name:", manifest.name);
  console.log("manifest_version:", manifest.manifest_version);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  const title = await popup.title();
  const brand = await popup.locator(".brand strong").textContent();
  const enabled = await popup.locator("#enabled").isChecked();
  console.log("popup_title:", title);
  console.log("popup_brand:", brand);
  console.log("enabled_default:", enabled);

  if (brand?.trim() !== "natte") {
    throw new Error("Popup brand text missing");
  }

  console.log("SMOKE_OK");
  await context.close();
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err);
  process.exit(1);
});
