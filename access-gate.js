(() => {
  "use strict";

  const TOKEN_KEY = "akkoflac-access-token";
  const VERIFY_URL = "/.netlify/functions/verify-token";
  const REQUEST_URL = "/.netlify/functions/request-access";

  const THEMES = {
    charcoal:  { bottom: "#1b1c24" },
    midnight:  { bottom: "#141a31" },
    ocean:     { bottom: "#102a39" },
    plum:      { bottom: "#251a2d" },
    dawn:      { bottom: "#352333" },
    forest:    { bottom: "#172c25" },
    lavender:  { bottom: "#2c2a45" },
    rosewood:  { bottom: "#321f2a" },
    ember:     { bottom: "#321e1a" },
    glacier:   { bottom: "#20343d" },
    cocoa:     { bottom: "#2d231f" },
    aurora:    { bottom: "#133b37" }
  };

  const STYLE = `
    #akkoflac-verify-overlay,
    #akkoflac-access-overlay {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      isolation: isolate;
      margin: 0 !important;
      box-sizing: border-box;
    }

    #akkoflac-verify-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #050505;
      color: var(--accent, #7b8cff);
      font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", Consolas, monospace;
      transition: opacity .45s ease, visibility .45s ease;
    }

    #akkoflac-verify-overlay.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #akkoflac-access-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--theme-bottom, var(--bg, #121212));
      transition: opacity .45s ease, visibility .45s ease;
      overflow: auto;
    }

    #akkoflac-access-overlay.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .akkoflac-access-box {
      position: relative;
      z-index: 1;
      width: min(440px, 100%);
      padding: 34px;
      text-align: center;
      border: 1px solid var(--glass-border-strong, rgba(255,255,255,.14));
      border-radius: 28px;
      background: rgba(255,255,255,.055);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow:
        0 25px 80px rgba(0,0,0,.45),
        0 0 45px var(--accent-glow, rgba(255,255,255,.08));
    }

    .akkoflac-access-title {
      margin: 0 0 9px;
      color: var(--text, #fff);
      font-size: 28px;
      font-weight: 800;
    }

    .akkoflac-access-subtitle {
      margin: 0 0 22px;
      color: var(--text-soft, rgba(255,255,255,.62));
      font-size: 14px;
      line-height: 1.5;
    }

    .akkoflac-field {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 12px;
      padding: 14px 16px;
      border: 1px solid var(--glass-border, rgba(255,255,255,.1));
      border-radius: 14px;
      outline: none;
      background: rgba(255,255,255,.06);
      color: var(--text, #fff);
      font-size: 15px;
      transition: .2s ease;
    }

    .akkoflac-field:focus {
      border-color: var(--accent, #fff);
      box-shadow: 0 0 0 3px var(--accent-glow, rgba(255,255,255,.12));
    }

    textarea.akkoflac-field {
      min-height: 88px;
      resize: vertical;
      font: inherit;
    }

    .akkoflac-access-button {
      width: 100%;
      margin-top: 6px;
      padding: 15px;
      border: 0;
      border-radius: 16px;
      cursor: pointer;
      background: var(--accent, #fff);
      color: var(--bg, #121212);
      font-size: 15px;
      font-weight: 800;
      transition: transform .18s ease, filter .18s ease;
    }

    .akkoflac-access-button:hover { transform: translateY(-2px); filter: brightness(1.08); }
    .akkoflac-access-button:disabled { opacity: .55; cursor: not-allowed; transform: none; }

    .akkoflac-access-button.secondary {
      margin-top: 10px;
      background: rgba(255,255,255,.08);
      color: var(--text, #fff);
      border: 1px solid rgba(255,255,255,.12);
    }

    .akkoflac-access-error {
      min-height: 20px;
      margin-top: 12px;
      color: #ff6b6b;
      font-size: 13px;
      font-weight: 700;
    }

    .akkoflac-access-ok {
      min-height: 20px;
      margin-top: 12px;
      color: #66e39a;
      font-size: 13px;
      font-weight: 700;
    }

    .akkoflac-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
    }

    .akkoflac-tab {
      flex: 1;
      padding: 10px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,.1);
      background: transparent;
      color: var(--text-soft, rgba(255,255,255,.62));
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .akkoflac-tab.active {
      background: color-mix(in srgb, var(--accent, #7b8cff) 22%, transparent);
      border-color: var(--accent, #7b8cff);
      color: #fff;
    }

    .akkoflac-panel { display: none; text-align: left; }
    .akkoflac-panel.active { display: block; }

    .akkoflac-label {
      display: block;
      margin: 0 0 6px 2px;
      color: var(--text-soft, rgba(255,255,255,.62));
      font-size: 12px;
      font-weight: 700;
    }

    body.akkoflac-gate-locked .sidebar,
    body.akkoflac-gate-locked .main,
    body.akkoflac-gate-locked .bottom-player,
    body.akkoflac-gate-locked .full-player,
    body.akkoflac-gate-locked .queue-panel,
    body.akkoflac-awaiting-access .sidebar,
    body.akkoflac-awaiting-access .main,
    body.akkoflac-awaiting-access .bottom-player,
    body.akkoflac-awaiting-access .full-player,
    body.akkoflac-awaiting-access .queue-panel {
      pointer-events: none !important;
      user-select: none !important;
      visibility: hidden !important;
    }
  `;

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  function clearPreverify() {
    document.documentElement.classList.remove("akkoflac-preverify");
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lightenHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.min(255, Math.round(r + (255 - r) * amount));
    const lg = Math.min(255, Math.round(g + (255 - g) * amount));
    const lb = Math.min(255, Math.round(b + (255 - b) * amount));
    return "#" + [lr, lg, lb].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function applySavedColors() {
    const root = document.documentElement;
    const accent = localStorage.getItem("akkoflac-accent") || "#7b8cff";
    const { r, g, b } = hexToRgb(accent);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-bright", lightenHex(accent, 0.18));
    root.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.15)`);
    root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.35)`);
    const themeName = localStorage.getItem("akkoflac-theme") || "charcoal";
    const theme = THEMES[themeName] || THEMES.charcoal;
    root.style.setProperty("--theme-bottom", theme.bottom);
    root.style.setProperty("--bg", theme.bottom);
    root.style.setProperty("--bg-deep", theme.bottom);
  }

  function lockUI() {
    document.body.classList.add("akkoflac-gate-locked", "akkoflac-awaiting-access");
  }

  function unlockUI() {
    document.body.classList.remove("akkoflac-gate-locked", "akkoflac-awaiting-access");
    clearPreverify();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getStoredToken() {
    try {
      return (localStorage.getItem(TOKEN_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function setStoredToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }

  function clearStoredToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  async function verifyToken(token) {
    if (!token) return { valid: false, reason: "missing" };
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ token })
      });
      const data = await res.json().catch(() => ({}));
      return {
        valid: !!(res.ok && data.valid && data.unlocked),
        reason: data.reason || null,
        label: data.label || null
      };
    } catch {
      return { valid: false, reason: "network" };
    }
  }

  function showVerifying(msg) {
    let overlay = document.getElementById("akkoflac-verify-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "akkoflac-verify-overlay";
      document.body.appendChild(overlay);
    }
    overlay.classList.remove("hidden");
    overlay.innerHTML = `<div style="font-family:monospace;font-weight:700;letter-spacing:.04em">${msg || "verifying..."}</div>`;
    return overlay;
  }

  function showVerificationSuccess() {
    const overlay = document.getElementById("akkoflac-verify-overlay");
    if (!overlay) return;
    overlay.innerHTML = `<div style="color:#66e39a;font-family:monospace;font-weight:700">ACCESS GRANTED</div>`;
  }

  async function unlockWithAnimation() {
    showVerifying("verifying token...");
    await sleep(650);
    showVerificationSuccess();
    await sleep(420);
    const overlay = document.getElementById("akkoflac-verify-overlay");
    if (overlay) overlay.classList.add("hidden");
    unlockUI();
    setTimeout(() => overlay?.remove(), 500);
  }

  function createGate(revoked) {
    document.getElementById("akkoflac-access-overlay")?.remove();
    document.getElementById("akkoflac-verify-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "akkoflac-access-overlay";
    overlay.innerHTML = `
      <div class="akkoflac-access-box">
        <h1 class="akkoflac-access-title">AkkoAudio</h1>
        <p class="akkoflac-access-subtitle">
          ${revoked
            ? "Your previous access token was revoked. Request access again or enter a new token."
            : "Request access for admin review, or enter your access token if you already have one."}
        </p>

        <div class="akkoflac-tabs">
          <button type="button" class="akkoflac-tab active" data-tab="request">Request access</button>
          <button type="button" class="akkoflac-tab" data-tab="token">I have a token</button>
        </div>

        <div class="akkoflac-panel active" data-panel="request">
          <label class="akkoflac-label" for="akko-req-name">Name *</label>
          <input class="akkoflac-field" id="akko-req-name" maxlength="64" autocomplete="name" placeholder="Your name">

          <label class="akkoflac-label" for="akko-req-contact">Contact (optional)</label>
          <input class="akkoflac-field" id="akko-req-contact" maxlength="120" placeholder="Discord / email / etc">

          <label class="akkoflac-label" for="akko-req-message">Message (optional)</label>
          <textarea class="akkoflac-field" id="akko-req-message" maxlength="500" placeholder="Why you want access"></textarea>

          <button type="button" class="akkoflac-access-button" id="akko-req-submit">Submit request</button>
          <div class="akkoflac-access-error" id="akko-req-error"></div>
          <div class="akkoflac-access-ok" id="akko-req-ok"></div>
        </div>

        <div class="akkoflac-panel" data-panel="token">
          <label class="akkoflac-label" for="akko-token-input">Access token</label>
          <input class="akkoflac-field" id="akko-token-input" autocomplete="off" spellcheck="false" placeholder="akko_...">
          <button type="button" class="akkoflac-access-button" id="akko-token-submit">Unlock</button>
          <div class="akkoflac-access-error" id="akko-token-error"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const tabs = overlay.querySelectorAll(".akkoflac-tab");
    const panels = overlay.querySelectorAll(".akkoflac-panel");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.toggle("active", t === tab));
        panels.forEach(p => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
      });
    });

    const reqBtn = overlay.querySelector("#akko-req-submit");
    const reqErr = overlay.querySelector("#akko-req-error");
    const reqOk = overlay.querySelector("#akko-req-ok");

    reqBtn.addEventListener("click", async () => {
      reqErr.textContent = "";
      reqOk.textContent = "";
      const name = overlay.querySelector("#akko-req-name").value.trim();
      const contact = overlay.querySelector("#akko-req-contact").value.trim();
      const message = overlay.querySelector("#akko-req-message").value.trim();
      if (!name) {
        reqErr.textContent = "Name is required.";
        return;
      }
      reqBtn.disabled = true;
      try {
        const res = await fetch(REQUEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, contact, message })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          reqErr.textContent = data.error || "Could not submit request.";
          reqBtn.disabled = false;
          return;
        }
        reqOk.textContent = "Request sent. Admin will review it. Once approved you’ll get a token to enter here.";
        reqBtn.disabled = false;
      } catch {
        reqErr.textContent = "Network error. Try again.";
        reqBtn.disabled = false;
      }
    });

    const tokenBtn = overlay.querySelector("#akko-token-submit");
    const tokenErr = overlay.querySelector("#akko-token-error");
    const tokenInput = overlay.querySelector("#akko-token-input");

    tokenBtn.addEventListener("click", async () => {
      tokenErr.textContent = "";
      const token = tokenInput.value.trim();
      if (!token) {
        tokenErr.textContent = "Paste your access token.";
        return;
      }
      tokenBtn.disabled = true;
      const result = await verifyToken(token);
      if (!result.valid) {
        if (result.reason === "revoked") {
          tokenErr.textContent = "This token was revoked.";
          clearStoredToken();
        } else {
          tokenErr.textContent = "Invalid token.";
        }
        tokenBtn.disabled = false;
        return;
      }
      setStoredToken(token);
      overlay.classList.add("hidden");
      await unlockWithAnimation();
      setTimeout(() => overlay.remove(), 500);
    });

    tokenInput.addEventListener("keydown", e => {
      if (e.key === "Enter") tokenBtn.click();
    });

    return overlay;
  }

  async function runGate() {
    lockUI();
    applySavedColors();

    document.getElementById("akkoflac-access-overlay")?.remove();
    document.getElementById("akkoflac-verify-overlay")?.remove();

    const stored = getStoredToken();
    if (stored) {
      showVerifying("checking access...");
      const result = await verifyToken(stored);
      if (result.valid) {
        await unlockWithAnimation();
        return;
      }
      if (result.reason === "revoked" || result.reason === "invalid") {
        clearStoredToken();
      }
      document.getElementById("akkoflac-verify-overlay")?.remove();
      createGate(result.reason === "revoked");
      return;
    }

    createGate(false);
  }

  function isOnboardingDone() {
    return localStorage.getItem("akkoflac-onboarded") === "1";
  }

  function start() {
    document.body.classList.add("akkoflac-awaiting-access");

    if (isOnboardingDone()) {
      runGate();
      return;
    }

    const onboarding = document.getElementById("onboarding");

    const afterOnboarding = () => {
      if (!isOnboardingDone()) return;
      const hidden = !onboarding || onboarding.classList.contains("hidden");
      if (!hidden) return;
      observer.disconnect();
      runGate();
    };

    const observer = new MutationObserver(afterOnboarding);
    if (onboarding) {
      observer.observe(onboarding, { attributes: true, attributeFilter: ["class", "style"] });
    }

    window.addEventListener("storage", e => {
      if (e.key === "akkoflac-onboarded" && e.newValue === "1") afterOnboarding();
    });

    let pollId = null;
    const startPoll = () => {
      if (pollId) return;
      pollId = setInterval(() => {
        if (document.hidden) return;
        afterOnboarding();
        if (isOnboardingDone()) {
          clearInterval(pollId);
          pollId = null;
        }
      }, 400);
    };
    const stopPoll = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopPoll();
      else startPoll();
    });
    if (!document.hidden) startPoll();
    afterOnboarding();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
