const enabledEl = document.getElementById("enabled");
const autoScanEl = document.getElementById("autoScan");
const blockAiEl = document.getElementById("blockAi");
const scanImagesEl = document.getElementById("scanImages");
const apiBaseUrlEl = document.getElementById("apiBaseUrl");
const saveApiEl = document.getElementById("saveApi");
const openAppEl = document.getElementById("openApp");
const refreshEl = document.getElementById("refresh");
const statusDot = document.getElementById("statusDot");
const statusTitle = document.getElementById("statusTitle");
const statusDetail = document.getElementById("statusDetail");

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function setStatus(kind, title, detail) {
  statusDot.className = "status-dot " + kind;
  statusTitle.textContent = title;
  statusDetail.textContent = detail;
}

async function loadSettings() {
  const res = await send("GET_SETTINGS");
  const s = res.settings || {};
  enabledEl.checked = Boolean(s.enabled);
  autoScanEl.checked = Boolean(s.autoScan);
  blockAiEl.checked = Boolean(s.blockAi);
  scanImagesEl.checked = Boolean(s.scanImages);
  apiBaseUrlEl.value = s.apiBaseUrl || "http://127.0.0.1:3000";
}

async function savePartial(patch) {
  await send("SET_SETTINGS", { settings: patch });
}

async function refreshStatus() {
  setStatus("", "Checking…", "Connecting to natte API");
  try {
    const status = await send("AUTH_STATUS");
    const base = status.apiBaseUrl || apiBaseUrlEl.value;

    if (!status.detectorAvailable) {
      setStatus(
        "bad",
        "Detector offline",
        status.message || "Set AI_DETECTOR_URL on the natte server."
      );
      return;
    }

    if (status.signedIn) {
      const email = status.user?.email ? ` · ${status.user.email}` : "";
      setStatus("ok", "Signed in" + email, `Ready · ${base}`);
      return;
    }

    if (status.requiresSubscription) {
      setStatus(
        "warn",
        "Sign in required",
        "Open the dashboard, sign in, then return here."
      );
      return;
    }

    setStatus("ok", "API reachable", `Detection available · ${base}`);
  } catch (err) {
    setStatus("bad", "Cannot reach API", err.message || "Check the API base URL");
  }
}

enabledEl.addEventListener("change", () => savePartial({ enabled: enabledEl.checked }));
autoScanEl.addEventListener("change", () => savePartial({ autoScan: autoScanEl.checked }));
blockAiEl.addEventListener("change", () => savePartial({ blockAi: blockAiEl.checked }));
scanImagesEl.addEventListener("change", () =>
  savePartial({ scanImages: scanImagesEl.checked })
);

saveApiEl.addEventListener("click", async () => {
  const apiBaseUrl = apiBaseUrlEl.value.trim().replace(/\/$/, "");
  if (!apiBaseUrl) return;

  try {
    const origin = new URL(apiBaseUrl).origin + "/*";
    const needsOptional =
      origin !== "http://127.0.0.1:3000/*" && origin !== "http://localhost:3000/*";
    if (needsOptional) {
      await chrome.permissions.request({ origins: [origin] });
    }
  } catch {
    /* invalid URL handled below */
  }

  await savePartial({ apiBaseUrl });
  await send("CLEAR_CACHE");
  await refreshStatus();
});

openAppEl.addEventListener("click", async () => {
  const base = (apiBaseUrlEl.value || "http://127.0.0.1:3000").replace(/\/$/, "");
  chrome.tabs.create({ url: base + "/dashboard" });
});

refreshEl.addEventListener("click", refreshStatus);

(async function init() {
  await loadSettings();
  await refreshStatus();
})();
