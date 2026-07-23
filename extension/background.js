/**
 * natte Chrome extension — background service worker
 * Proxies detection requests to the natte API using the user's session cookies.
 */

const DEFAULTS = {
  enabled: true,
  autoScan: true,
  blockAi: true,
  scanImages: false,
  apiBaseUrl: "http://127.0.0.1:3000",
};

const cache = new Map();
const CACHE_LIMIT = 200;

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const patch = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (current[key] === undefined) patch[key] = value;
  }
  if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
});

function normalizeBase(url) {
  return String(url || DEFAULTS.apiBaseUrl).replace(/\/$/, "");
}

function cacheKey(kind, payload) {
  return kind + ":" + payload.slice(0, 500);
}

function remember(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
}

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

async function ensureHostPermission(apiBaseUrl) {
  const origin = new URL(apiBaseUrl).origin + "/*";
  const alwaysAllowed = [
    "http://127.0.0.1:3000/*",
    "http://localhost:3000/*",
  ];
  if (alwaysAllowed.includes(origin)) return true;

  const has = await chrome.permissions.contains({ origins: [origin] });
  if (has) return true;

  try {
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

async function apiFetch(path, options = {}) {
  const settings = await getSettings();
  const base = normalizeBase(settings.apiBaseUrl);
  const allowed = await ensureHostPermission(base);
  if (!allowed) {
    return {
      ok: false,
      status: 0,
      json: {
        result: "error",
        message: "Permission denied for API host. Allow access in the extension popup.",
      },
    };
  }

  const res = await fetch(base + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let json = {};
  try {
    json = await res.json();
  } catch {
    json = { result: "error", message: "Invalid response from API" };
  }

  return { ok: res.ok, status: res.status, json };
}

async function detectText(text) {
  const key = cacheKey("text", text);
  if (cache.has(key)) return cache.get(key);

  const { ok, status, json } = await apiFetch("/api/detect", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  const result = {
    ok,
    status,
    result: json.result || (ok ? "unknown" : "error"),
    confidence: typeof json.confidence === "number" ? json.confidence : null,
    message: json.message || null,
    requiresAuth: Boolean(json.requiresAuth),
    requiresSubscription: Boolean(json.requiresSubscription),
    warning: json.warning || null,
  };

  if (ok) remember(key, result);
  return result;
}

async function detectImage(imageUrl) {
  const key = cacheKey("image", imageUrl);
  if (cache.has(key)) return cache.get(key);

  const { ok, status, json } = await apiFetch("/api/detect/image", {
    method: "POST",
    body: JSON.stringify({ imageUrl }),
  });

  const result = {
    ok,
    status,
    result: json.result || (ok ? "unknown" : "error"),
    confidence: typeof json.confidence === "number" ? json.confidence : null,
    message: json.message || null,
    requiresAuth: Boolean(json.requiresAuth),
    requiresSubscription: Boolean(json.requiresSubscription),
  };

  if (ok) remember(key, result);
  return result;
}

async function getAuthStatus() {
  const settings = await getSettings();
  const base = normalizeBase(settings.apiBaseUrl);

  try {
    const allowed = await ensureHostPermission(base);
    if (!allowed) {
      return { signedIn: false, message: "API host permission required" };
    }

    const detect = await apiFetch("/api/detect", { method: "GET" });
    const me = await apiFetch("/api/auth/me", { method: "GET" });

    const user = me.ok ? me.json.user || me.json : null;
    return {
      signedIn: Boolean(user && (user.id || user.email)),
      user,
      detectorAvailable: Boolean(detect.json.available),
      requiresSubscription: Boolean(detect.json.requiresSubscription),
      apiBaseUrl: base,
      message: detect.json.message || null,
    };
  } catch (err) {
    return {
      signedIn: false,
      detectorAvailable: false,
      message: err.message || "Could not reach natte API",
      apiBaseUrl: base,
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "GET_SETTINGS":
        sendResponse({ ok: true, settings: await getSettings() });
        break;
      case "SET_SETTINGS": {
        const next = { ...(message.settings || {}) };
        if (next.apiBaseUrl) {
          next.apiBaseUrl = normalizeBase(next.apiBaseUrl);
          await ensureHostPermission(next.apiBaseUrl);
        }
        await chrome.storage.sync.set(next);
        sendResponse({ ok: true, settings: await getSettings() });
        break;
      }
      case "DETECT_TEXT":
        sendResponse(await detectText(String(message.text || "")));
        break;
      case "DETECT_IMAGE":
        sendResponse(await detectImage(String(message.imageUrl || "")));
        break;
      case "AUTH_STATUS":
        sendResponse(await getAuthStatus());
        break;
      case "CLEAR_CACHE":
        cache.clear();
        sendResponse({ ok: true });
        break;
      default:
        sendResponse({ ok: false, message: "Unknown message type" });
    }
  })().catch((err) => {
    sendResponse({ ok: false, result: "error", message: err.message || "Extension error" });
  });

  return true;
});
