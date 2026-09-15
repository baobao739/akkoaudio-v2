(() => {
  "use strict";

  const SESSION_URL = "/.netlify/functions/verify-session";
  const LOGIN_URL = "/.netlify/functions/login";
  const REGISTER_URL = "/.netlify/functions/register";

  const THEMES = {
    charcoal: { bottom: "#1b1c24" },
    midnight: { bottom: "#141a31" },
    ocean: { bottom: "#102a39" },
    plum: { bottom: "#251a2d" },
    dawn: { bottom: "#352333" },
    forest: { bottom: "#172c25" },
    lavender: { bottom: "#2c2a45" },
    rosewood: { bottom: "#321f2a" },
    ember: { bottom: "#321e1a" },
    glacier: { bottom: "#20343d" },
    cocoa: { bottom: "#2d231f" },
    aurora: { bottom: "#133b37" }
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
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lightenHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.min(255, Math.round(r + (255 - r) * amount));
    const lg = Math.min(255, Math.round(g + (255 - g) * amount));
    const lb = Math.min(255, Math.round(b + (255 - b) * amount));
    return "#" + [lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("");
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function checkSession() {
    try {
      const res = await fetch(SESSION_URL, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      const data = await res.json().catch(() => ({}));
      return {
        valid: !!(res.ok && data.valid && data.unlocked),
        reason: data.reason || data.status || null,
        username: data.username || null
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
    showVerifying("signing in...");
    await sleep(500);
    showVerificationSuccess();
    await sleep(400);
    const overlay = document.getElementById("akkoflac-verify-overlay");
    if (overlay) overlay.classList.add("hidden");
    unlockUI();
    setTimeout(() => overlay?.remove(), 500);
  }

  function createGate(statusHint) {
    document.getElementById("akkoflac-access-overlay")?.remove();
    document.getElementById("akkoflac-verify-overlay")?.remove();

    let subtitle =
      "Create an account or log in. New accounts need admin approval before they can unlock the player.";
    if (statusHint === "pending") {
      subtitle = "Your account is still pending approval. Try logging in again after the admin approves you.";
    } else if (statusHint === "denied") {
      subtitle = "This account was denied. Contact the admin if you think that was a mistake.";
    }

    const overlay = document.createElement("div");
    overlay.id = "akkoflac-access-overlay";
    overlay.innerHTML = `
      <div class="akkoflac-access-box">
        <h1 class="akkoflac-access-title">AkkoAudio</h1>
        <p class="akkoflac-access-subtitle">${subtitle}</p>

        <div class="akkoflac-tabs">
          <button type="button" class="akkoflac-tab active" data-tab="login">Log in</button>
          <button type="button" class="akkoflac-tab" data-tab="register">Create account</button>
        </div>

        <div class="akkoflac-panel active" data-panel="login">
          <label class="akkoflac-label" for="akko-login-user">Username</label>
          <input class="akkoflac-field" id="akko-login-user" maxlength="32" autocomplete="username" spellcheck="false">

          <label class="akkoflac-label" for="akko-login-pass">Password</label>
          <input class="akkoflac-field" id="akko-login-pass" type="password" maxlength="128" autocomplete="current-password">

          <button type="button" class="akkoflac-access-button" id="akko-login-submit">Log in</button>
          <div class="akkoflac-access-error" id="akko-login-error"></div>
          <div class="akkoflac-access-ok" id="akko-login-ok"></div>
        </div>

        <div class="akkoflac-panel" data-panel="register">
          <label class="akkoflac-label" for="akko-reg-user">Username</label>
          <input class="akkoflac-field" id="akko-reg-user" maxlength="32" autocomplete="username" spellcheck="false" placeholder="letters, numbers, _">

          <label class="akkoflac-label" for="akko-reg-pass">Password</label>
          <input class="akkoflac-field" id="akko-reg-pass" type="password" maxlength="128" autocomplete="new-password" placeholder="at least 6 characters">

          <label class="akkoflac-label" for="akko-reg-pass2">Confirm password</label>
          <input class="akkoflac-field" id="akko-reg-pass2" type="password" maxlength="128" autocomplete="new-password">

          <button type="button" class="akkoflac-access-button" id="akko-reg-submit">Create account</button>
          <div class="akkoflac-access-error" id="akko-reg-error"></div>
          <div class="akkoflac-access-ok" id="akko-reg-ok"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const tabs = overlay.querySelectorAll(".akkoflac-tab");
    const panels = overlay.querySelectorAll(".akkoflac-panel");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === tab.dataset.tab));
      });
    });

    const loginBtn = overlay.querySelector("#akko-login-submit");
    const loginErr = overlay.querySelector("#akko-login-error");
    const loginOk = overlay.querySelector("#akko-login-ok");
    const loginUser = overlay.querySelector("#akko-login-user");
    const loginPass = overlay.querySelector("#akko-login-pass");

    async function doLogin() {
      loginErr.textContent = "";
      loginOk.textContent = "";
      const username = loginUser.value.trim();
      const password = loginPass.value;
      if (!username || !password) {
        loginErr.textContent = "Enter username and password.";
        return;
      }
      loginBtn.disabled = true;
      try {
        const res = await fetch(LOGIN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));

        if (data.ok && data.status === "approved") {
          overlay.classList.add("hidden");
          await unlockWithAnimation();
          setTimeout(() => overlay.remove(), 500);
          return;
        }

        if (data.status === "pending") {
          loginOk.textContent = "";
          loginErr.textContent = data.message || "Account is pending approval.";
        } else if (data.status === "denied") {
          loginErr.textContent = data.message || "Account was denied.";
        } else {
          loginErr.textContent = data.error || "Login failed.";
        }
      } catch {
        loginErr.textContent = "Network error. Try again.";
      }
      loginBtn.disabled = false;
    }

    loginBtn.addEventListener("click", doLogin);
    loginPass.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
    loginUser.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginPass.focus();
    });

    const regBtn = overlay.querySelector("#akko-reg-submit");
    const regErr = overlay.querySelector("#akko-reg-error");
    const regOk = overlay.querySelector("#akko-reg-ok");

    regBtn.addEventListener("click", async () => {
      regErr.textContent = "";
      regOk.textContent = "";
      const username = overlay.querySelector("#akko-reg-user").value.trim();
      const password = overlay.querySelector("#akko-reg-pass").value;
      const password2 = overlay.querySelector("#akko-reg-pass2").value;

      if (!username || !password) {
        regErr.textContent = "Username and password are required.";
        return;
      }
      if (password !== password2) {
        regErr.textContent = "Passwords do not match.";
        return;
      }

      regBtn.disabled = true;
      try {
        const res = await fetch(REGISTER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          regErr.textContent = data.error || "Could not create account.";
          regBtn.disabled = false;
          return;
        }
        regOk.textContent =
          data.message || "Account created. Wait for admin approval, then log in.";
        regBtn.disabled = false;
        // Switch to login tab
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === "login"));
        panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === "login"));
        loginUser.value = username;
        loginPass.value = "";
        loginOk.textContent = "Account created — pending approval. Log in after admin approves.";
      } catch {
        regErr.textContent = "Network error. Try again.";
        regBtn.disabled = false;
      }
    });

    return overlay;
  }

  async function runGate() {
    lockUI();
    applySavedColors();

    document.getElementById("akkoflac-access-overlay")?.remove();
    document.getElementById("akkoflac-verify-overlay")?.remove();

    showVerifying("checking session...");
    const session = await checkSession();
    if (session.valid) {
      await unlockWithAnimation();
      return;
    }

    document.getElementById("akkoflac-verify-overlay")?.remove();
    createGate(session.reason === "pending" || session.reason === "denied" ? session.reason : null);
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

    window.addEventListener("storage", (e) => {
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
