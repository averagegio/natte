/**
 * NATTES Widget — Proof of Human AI detection toggle
 * Embed: <script src="https://your-domain.com/widget/natte-widget.js"></script>
 * Or add data-natte-widget to a container with data-natte-text on the parent.
 */
(function () {
  const API_URL = (function () {
    const scripts = document.querySelectorAll('script[src*="natte-widget"]');
    const script = scripts[scripts.length - 1];
    if (script && script.src) {
      try {
        const url = new URL(script.src);
        return url.origin + "/api/detect";
      } catch (_) {}
    }
    return "/api/detect";
  })();

  function createToggle(text) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;align-items:center;gap:12px;margin-top:8px;font-family:system-ui,sans-serif;font-size:14px";

    let on = false;
    let loading = false;
    let result = null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText = "padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#ccc;cursor:pointer;transition:all 0.2s";

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
      on = !on;
      if (on) {
        loading = true;
        result = null;
        updateUI();
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
          });
          const json = await res.json();
          result = json.result || "unknown";
        } catch (_) {
          result = "error";
        }
        loading = false;
      } else {
        result = null;
      }
      updateUI();
    });

    updateUI();
    wrapper.appendChild(btn);
    wrapper.appendChild(status);
    return wrapper;
  }

  function init() {
    document.querySelectorAll("[data-natte-widget]").forEach(function (el) {
      const parent = el.closest("[data-natte-text]") || el.parentElement;
      const text = parent ? parent.getAttribute("data-natte-text") || parent.textContent.trim() : "";
      el.appendChild(createToggle(text));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.NatteWidget = { createToggle: createToggle, init: init };
})();
