(function () {
  const DEFAULT_REDIRECT = "/os-command";
  const REDIRECT_GUARD_KEY = "indicare_login_redirect_guard";
  const RECENT_GUARD_MS = 4500;
  const PASSKEY_PROMPT_WATCHDOG_MS = 90000;
  const LOGIN_PATHS = new Set(["/", "/login", "/login.html", "/oslogin", "/oslogin.html"]);
  let passkeyInFlight = false;
  let passwordInFlight = false;
  let passkeyWatchdog = null;

  function qs(id) {
    return document.getElementById(id);
  }

  function isLoginPage() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return LOGIN_PATHS.has(path) && Boolean(qs("loginForm") || qs("passkeyBtn") || document.querySelector(".signin-card"));
  }

  function safeNextUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || params.get("redirect");
      if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    } catch (_) {}
    return DEFAULT_REDIRECT;
  }

  function markRedirectGuard() {
    try { sessionStorage.setItem(REDIRECT_GUARD_KEY, String(Date.now())); } catch (_) {}
  }

  function hasRecentRedirectGuard() {
    try {
      const ts = Number(sessionStorage.getItem(REDIRECT_GUARD_KEY));
      return Boolean(ts && Date.now() - ts < RECENT_GUARD_MS);
    } catch (_) {
      return false;
    }
  }

  function clearRedirectGuard() {
    try { sessionStorage.removeItem(REDIRECT_GUARD_KEY); } catch (_) {}
  }

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function setStatus(message, type) {
    const status = qs("loginStatus");
    if (!status) return;
    status.textContent = message || "";
    status.classList.remove("is-error", "is-success", "error", "success");
    if (type === "error") {
      status.classList.add(status.classList.contains("status") ? "error" : "is-error");
    }
    if (type === "success") {
      status.classList.add(status.classList.contains("status") ? "success" : "is-success");
    }
  }

  function allControls() {
    return ["email", "password", "rememberMe", "passkeyBtn", "loginBtn", "togglePassword"]
      .map(qs)
      .filter(Boolean);
  }

  function setBusy(isBusy, mode) {
    allControls().forEach((el) => { el.disabled = Boolean(isBusy); });
    const passkeyBtn = qs("passkeyBtn");
    const loginBtn = qs("loginBtn");
    setText(passkeyBtn, isBusy && mode === "passkey" ? "Checking passkey..." : "Continue with passkey");
    setText(loginBtn, isBusy && mode === "password" ? "Signing in..." : "Sign in with password");
  }

  function resetPasskeyPromptState(message, type) {
    passkeyInFlight = false;
    if (passkeyWatchdog) {
      clearTimeout(passkeyWatchdog);
      passkeyWatchdog = null;
    }
    setBusy(false, "passkey");
    if (message) setStatus(message, type);
  }

  function startPasskeyWatchdog() {
    if (passkeyWatchdog) clearTimeout(passkeyWatchdog);
    passkeyWatchdog = setTimeout(() => {
      if (!passkeyInFlight) return;
      resetPasskeyPromptState("Passkey check timed out. Try again or use password fallback.", "error");
    }, PASSKEY_PROMPT_WATCHDOG_MS);
  }

  function emailValue() {
    const email = qs("email");
    const value = String(email?.value || "").trim().toLowerCase();
    if (!value) {
      if (email) {
        email.setAttribute("aria-invalid", "true");
        email.focus();
      }
      setStatus("Enter your work email address first.", "error");
      return null;
    }
    if (email) email.setAttribute("aria-invalid", "false");
    return value;
  }

  function redirectAfterAuth(data) {
    markRedirectGuard();
    if (data?.mfa_pending || data?.mfa_required) {
      if (data?.mfa_setup_required || data?.mfa_enabled === false) {
        window.location.replace("/mfa-setup");
      } else {
        window.location.replace("/mfa");
      }
      return;
    }
    window.location.replace(safeNextUrl());
  }

  async function bootExistingSession() {
    if (hasRecentRedirectGuard()) return;
    if (!window.auth?.validateSession) return;
    try {
      const state = await window.auth.validateSession();
      if (state?.mfa_pending) {
        setStatus("Security check required. Redirecting...", "success");
        redirectAfterAuth(state);
        return;
      }
      if (state?.authenticated) {
        setStatus("Existing secure session found. Redirecting...", "success");
        redirectAfterAuth(state);
        return;
      }
      clearRedirectGuard();
    } catch (_) {
      clearRedirectGuard();
    }
  }

  async function handlePasskey(event) {
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    if (passkeyInFlight) {
      setStatus("Passkey check already open. Complete it or cancel on your device.");
      return;
    }
    const email = emailValue();
    if (!email) return;
    if (!window.auth?.beginPasskeyLogin) {
      setStatus("Passkey sign-in is not ready. Use password fallback.", "error");
      return;
    }
    passkeyInFlight = true;
    setBusy(true, "passkey");
    startPasskeyWatchdog();
    setStatus("Opening Face ID, Touch ID, Windows Hello or your device passkey check...");
    try {
      const result = await window.auth.beginPasskeyLogin(email);
      passkeyInFlight = false;
      if (passkeyWatchdog) {
        clearTimeout(passkeyWatchdog);
        passkeyWatchdog = null;
      }
      setStatus("Passkey accepted. Redirecting...", "success");
      redirectAfterAuth(result);
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();
      const userCancelled = message.includes("cancel") || message.includes("notallowed") || message.includes("not allowed") || message.includes("abort");
      resetPasskeyPromptState(
        userCancelled ? "Passkey check cancelled. Try again or use password fallback." : (error?.message || "Passkey sign-in failed. Use password fallback if needed."),
        "error",
      );
    }
  }

  async function handlePassword(event) {
    event?.preventDefault?.();
    if (passwordInFlight || passkeyInFlight) return;
    passwordInFlight = true;
    const email = emailValue();
    const password = qs("password");
    const rememberMe = qs("rememberMe");
    if (!email) {
      passwordInFlight = false;
      return;
    }
    if (!password?.value) {
      if (password) {
        password.setAttribute("aria-invalid", "true");
        password.focus();
      }
      setStatus("Enter your password or use passkey sign-in.", "error");
      passwordInFlight = false;
      return;
    }
    password.setAttribute("aria-invalid", "false");
    setBusy(true, "password");
    setStatus("Checking your details securely...");
    try {
      const result = await window.auth.login({
        email,
        password: password.value,
        remember: Boolean(rememberMe?.checked),
      });
      setStatus("Accepted. Redirecting...", "success");
      redirectAfterAuth(result);
    } catch (error) {
      setStatus(error?.message || "Sign-in failed.", "error");
    } finally {
      passwordInFlight = false;
      setBusy(false, "password");
    }
  }

  function bindPasswordToggle() {
    const toggle = qs("togglePassword");
    const password = qs("password");
    if (!toggle || !password || toggle.dataset.indicareBound === "1") return;
    toggle.dataset.indicareBound = "1";
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", String(show));
    });
  }

  function bindStickyPromptResets() {
    window.addEventListener("pageshow", () => {
      if (passkeyInFlight) resetPasskeyPromptState("Passkey check reset. Try again when ready.");
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && passkeyInFlight) {
        setTimeout(() => {
          if (passkeyInFlight) resetPasskeyPromptState("Passkey check reset. Try again when ready.");
        }, 800);
      }
    });
  }

  function injectSecurityBadges() {
    const card = document.querySelector(".signin-card, .card");
    if (!card || document.getElementById("enterpriseSecurityBadges")) return;
    const badges = document.createElement("div");
    badges.id = "enterpriseSecurityBadges";
    badges.setAttribute("aria-label", "Security controls enabled");
    badges.style.cssText = "display:flex;flex-wrap:wrap;gap:.5rem;margin:.85rem 0 0;";
    ["Passkey-first", "MFA protected", "Audited access", "Secure session"].forEach((text) => {
      const badge = document.createElement("span");
      badge.textContent = text;
      badge.style.cssText = "display:inline-flex;align-items:center;padding:.45rem .65rem;border-radius:999px;background:#eef8f2;color:#244f38;font-weight:800;font-size:.78rem;border:1px solid rgba(31,122,79,.12);";
      badges.appendChild(badge);
    });
    const header = document.querySelector(".signin-header") || card.firstElementChild;
    if (header) header.appendChild(badges);
  }

  function bindExclusiveLoginHandlers() {
    const passkeyBtn = qs("passkeyBtn");
    const passkeyForm = qs("passkeyForm");
    const form = qs("loginForm");
    if (passkeyForm && passkeyForm.dataset.indicareGatewayBound !== "1") {
      passkeyForm.dataset.indicareGatewayBound = "1";
      passkeyForm.addEventListener("submit", handlePasskey, true);
    }
    if (passkeyBtn && passkeyBtn.dataset.indicareGatewayBound !== "1") {
      passkeyBtn.dataset.indicareGatewayBound = "1";
      passkeyBtn.addEventListener("click", handlePasskey, true);
    }
    if (form && form.dataset.indicareGatewayBound !== "1") {
      form.dataset.indicareGatewayBound = "1";
      form.addEventListener("submit", handlePassword, true);
    }
  }

  function init() {
    if (!isLoginPage()) return;
    bindExclusiveLoginHandlers();
    bindPasswordToggle();
    bindStickyPromptResets();
    injectSecurityBadges();
    bootExistingSession();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.indicareLoginGateway = { init, handlePasskey, handlePassword, resetPasskeyPromptState };
})();
