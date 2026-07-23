/**
 * natte content script — labels and blocks AI posts on X / Twitter.
 */
(function () {
  const processed = new WeakSet();
  let settings = {
    enabled: true,
    autoScan: true,
    blockAi: true,
    scanImages: false,
  };
  let observer = null;
  let scanTimer = null;

  function send(type, payload = {}) {
    return chrome.runtime.sendMessage({ type, ...payload });
  }

  async function loadSettings() {
    try {
      const res = await send("GET_SETTINGS");
      if (res?.settings) settings = res.settings;
    } catch {
      /* extension context may be unavailable during reload */
    }
  }

  function tweetText(article) {
    const nodes = article.querySelectorAll('[data-testid="tweetText"]');
    const parts = [];
    nodes.forEach((node) => {
      const text = (node.innerText || node.textContent || "").trim();
      if (text) parts.push(text);
    });
    return parts.join("\n").trim();
  }

  function tweetImages(article) {
    const urls = [];
    article.querySelectorAll('img[src*="pbs.twimg.com/media"]').forEach((img) => {
      const src = img.currentSrc || img.src;
      if (src && !urls.includes(src)) urls.push(src);
    });
    return urls;
  }

  function formatConfidence(confidence) {
    if (typeof confidence !== "number") return "";
    return Math.round(confidence * 100) + "%";
  }

  function setBadgeState(badge, state, label, meta) {
    badge.dataset.state = state;
    const button = badge.querySelector("button");
    const metaEl = badge.querySelector(".natte-meta");
    if (button) button.textContent = label;
    if (metaEl) metaEl.textContent = meta || "";
  }

  function ensureBadge(article) {
    let badge = article.querySelector(":scope > .natte-badge, .natte-badge");
    if (badge && badge.closest('[data-testid="tweet"]') === article) return badge;

    badge = document.createElement("div");
    badge.className = "natte-badge";
    badge.dataset.state = "idle";
    badge.innerHTML =
      '<button type="button">Check with natte</button><span class="natte-meta"></span>';

    const anchor =
      article.querySelector('[data-testid="tweetText"]') ||
      article.querySelector('[data-testid="tweetPhoto"]') ||
      article.querySelector("div[lang]");

    if (anchor && anchor.parentElement) {
      anchor.parentElement.appendChild(badge);
    } else {
      article.appendChild(badge);
    }

    badge.querySelector("button").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      analyzeArticle(article, { force: true });
    });

    return badge;
  }

  function clearBlock(article) {
    article.classList.remove("natte-blocked");
    article.querySelectorAll(".natte-block-overlay").forEach((el) => el.remove());
  }

  function applyBlock(article, detail) {
    if (!settings.blockAi) {
      clearBlock(article);
      return;
    }
    if (article.classList.contains("natte-blocked")) return;

    article.classList.add("natte-blocked");
    const overlay = document.createElement("div");
    overlay.className = "natte-block-overlay";
    overlay.innerHTML =
      '<div class="natte-block-card">' +
      "<strong>AI slop blocked</strong>" +
      "<span>" +
      (detail || "natte flagged this post as AI-generated.") +
      "</span>" +
      '<button type="button">Show anyway</button>' +
      "</div>";

    overlay.querySelector("button").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearBlock(article);
    });

    article.style.position = article.style.position || "relative";
    article.appendChild(overlay);
  }

  async function analyzeArticle(article, options = {}) {
    if (!settings.enabled && !options.force) return;

    const badge = ensureBadge(article);
    const button = badge.querySelector("button");
    const text = tweetText(article);

    if (!text) {
      setBadgeState(badge, "error", "No text", "Nothing to scan");
      return;
    }

    button.disabled = true;
    setBadgeState(badge, "loading", "Checking…", "");

    try {
      const res = await send("DETECT_TEXT", { text });
      if (!res) throw new Error("No response from extension");

      if (!res.ok) {
        const msg =
          res.message ||
          (res.requiresAuth
            ? "Sign in on natte"
            : res.requiresSubscription
              ? "Subscription required"
              : "Detection failed");
        setBadgeState(badge, "error", "Unavailable", msg);
        clearBlock(article);
        return;
      }

      const result = String(res.result || "unknown").toLowerCase();
      const conf = formatConfidence(res.confidence);

      if (result === "ai") {
        setBadgeState(badge, "ai", "AI detected", conf);
        applyBlock(article, conf ? "Confidence " + conf : "");
      } else if (result === "human") {
        setBadgeState(badge, "human", "Human", conf);
        clearBlock(article);
      } else {
        setBadgeState(badge, "idle", "Unknown", conf || result);
        clearBlock(article);
      }

      if (settings.scanImages) {
        const images = tweetImages(article);
        for (const imageUrl of images.slice(0, 2)) {
          const imageRes = await send("DETECT_IMAGE", { imageUrl });
          if (imageRes?.ok && String(imageRes.result).toLowerCase() === "ai") {
            setBadgeState(
              badge,
              "ai",
              "AI media",
              formatConfidence(imageRes.confidence) || "image"
            );
            applyBlock(article, "AI-generated image detected");
            break;
          }
        }
      }
    } catch (err) {
      setBadgeState(badge, "error", "Error", err.message || "Failed");
    } finally {
      button.disabled = false;
    }
  }

  function processArticle(article) {
    if (!(article instanceof HTMLElement)) return;
    if (processed.has(article)) {
      if (settings.enabled) ensureBadge(article);
      return;
    }
    processed.add(article);
    ensureBadge(article);

    if (settings.enabled && settings.autoScan) {
      analyzeArticle(article);
    }
  }

  function scanVisibleTweets() {
    if (!settings.enabled) return;
    document.querySelectorAll('article[data-testid="tweet"]').forEach(processArticle);
  }

  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scanVisibleTweets, 250);
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function resetUiForSettings() {
    document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
      const badge = article.querySelector(".natte-badge");
      if (!settings.enabled) {
        if (badge) badge.remove();
        clearBlock(article);
        return;
      }
      ensureBadge(article);
      if (!settings.blockAi) clearBlock(article);
    });
    if (settings.enabled && settings.autoScan) scanVisibleTweets();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    let changed = false;
    for (const key of Object.keys(changes)) {
      if (key in settings || key === "enabled" || key === "autoScan" || key === "blockAi" || key === "scanImages") {
        settings[key] = changes[key].newValue;
        changed = true;
      }
    }
    if (changed) resetUiForSettings();
  });

  async function init() {
    await loadSettings();
    if (!document.body) return;
    startObserver();
    scanVisibleTweets();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
