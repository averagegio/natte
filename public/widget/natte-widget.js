/**
 * NATTES Widget — Proof of Human AI detection toggle
 *
 * Basic embed:
 *   <div data-natte-text="Post text here">
 *     <div data-natte-widget></div>
 *   </div>
 *   <script src="https://your-domain.com/widget/natte-widget.js"></script>
 *
 * X Developer App feed embed:
 *   <div data-natte-x-username="yourhandle" data-natte-x-count="3">
 *     <div data-natte-widget></div>
 *   </div>
 *   <script src="https://your-domain.com/widget/natte-widget.js"></script>
 */
(function () {
  const ORIGIN = (function () {
    const scripts = document.querySelectorAll('script[src*="natte-widget"]');
    const script = scripts[scripts.length - 1];
    if (script && script.src) {
      try {
        return new URL(script.src).origin;
      } catch (_) {}
    }
    return "";
  })();

  const API_DETECT = ORIGIN ? ORIGIN + "/api/detect" : "/api/detect";
  const API_POSTS = ORIGIN ? ORIGIN + "/api/x/posts" : "/api/x/posts";

  let detectorAvailable = true;

  fetch(API_DETECT)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      detectorAvailable = Boolean(data.available);
    })
    .catch(function () {
      detectorAvailable = false;
    });

  function createToggle(text) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "display:flex;align-items:center;gap:12px;margin-top:8px;font-family:system-ui,sans-serif;font-size:14px";

    let on = false;
    let loading = false;
    let result = null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText =
      "padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#ccc;cursor:pointer;transition:all 0.2s";

    const status = document.createElement("span");
    status.style.color = "#888";

    function updateUI() {
      if (on) {
        btn.style.borderColor = "rgba(16,185,129,0.5)";
        btn.style.background = "#059669";
        btn.style.color = "#fff";
        btn.textContent = "AI detection: ON";
      } else {
        btn.style.borderColor = "rgba(255,255,255,0.2)";
        btn.style.background = "rgba(255,255,255,0.05)";
        btn.style.color = "#ccc";
        btn.textContent = "AI detection: OFF";
      }
      status.textContent = loading ? "Checking..." : result ? "Result: " + result : "Idle";
    }

    btn.addEventListener("click", async function () {
      if (!detectorAvailable) {
        status.textContent = "Detector not configured";
        status.style.color = "#f87171";
        return;
      }

      on = !on;
      if (on) {
        loading = true;
        result = null;
        updateUI();
        try {
          const res = await fetch(API_DETECT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
          });
          const json = await res.json();
          if (!res.ok) {
            result = "error";
            status.textContent = json.message || "Access denied";
            status.style.color = "#f87171";
          } else {
            result = json.result || "unknown";
            status.style.color = "#888";
          }
        } catch (_) {
          result = "error";
          status.textContent = "Network error";
          status.style.color = "#f87171";
        }
        loading = false;
      } else {
        result = null;
        status.style.color = "#888";
      }
      updateUI();
    });

    updateUI();
    wrapper.appendChild(btn);
    wrapper.appendChild(status);
    return wrapper;
  }

  function createPostCard(post) {
    const card = document.createElement("div");
    card.style.cssText =
      "border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;margin-bottom:12px;font-family:system-ui,sans-serif";

    const text = document.createElement("div");
    text.style.cssText = "font-size:14px;color:#ccc;margin-bottom:8px";
    text.textContent = post.text;
    card.appendChild(text);
    card.appendChild(createToggle(post.text));
    return card;
  }

  async function initXFeed(container) {
    const username = container.getAttribute("data-natte-x-username");
    if (!username) return;

    const count = container.getAttribute("data-natte-x-count") || "3";
    const widgetSlot = container.querySelector("[data-natte-widget]") || container;
    widgetSlot.innerHTML = "";

    const loading = document.createElement("div");
    loading.style.cssText = "font-size:13px;color:#888;font-family:system-ui,sans-serif";
    loading.textContent = "Loading X posts...";
    widgetSlot.appendChild(loading);

    try {
      const res = await fetch(
        API_POSTS + "?username=" + encodeURIComponent(username) + "&count=" + encodeURIComponent(count)
      );
      const json = await res.json();
      widgetSlot.innerHTML = "";

      if (!json.posts || json.posts.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "font-size:13px;color:#888;line-height:1.5";
        empty.textContent = json.message || "No live posts found. Connect X on your dashboard.";
        widgetSlot.appendChild(empty);
        return;
      }

      json.posts.forEach(function (post) {
        widgetSlot.appendChild(createPostCard(post));
      });
    } catch (_) {
      widgetSlot.innerHTML = "";
      const err = document.createElement("div");
      err.style.cssText = "font-size:13px;color:#f87171";
      err.textContent = "Failed to load X posts.";
      widgetSlot.appendChild(err);
    }
  }

  function init() {
    document.querySelectorAll("[data-natte-x-username]").forEach(function (el) {
      initXFeed(el);
    });

    document.querySelectorAll("[data-natte-widget]").forEach(function (el) {
      if (el.closest("[data-natte-x-username]")) return;

      const parent = el.closest("[data-natte-text]") || el.parentElement;
      const text = parent
        ? parent.getAttribute("data-natte-text") || parent.textContent.trim()
        : "";
      el.appendChild(createToggle(text));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.NatteWidget = { createToggle: createToggle, init: init, initXFeed: initXFeed };
})();
