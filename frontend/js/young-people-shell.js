(() => {
  "use strict";

  const SHELL_MODULE = "/js/young-people-shell/index.js";

  /* -------------------------------------------------- */
  /* CORE HELPERS                                       */
  /* -------------------------------------------------- */

  function log(...args) {
    console.log("[young-people-shell]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function isVisible(el) {
    return (
      !!el &&
      !el.classList.contains("hidden") &&
      el.getAttribute("aria-hidden") !== "true"
    );
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle("hidden", hidden);
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function setExpanded(el, expanded) {
    if (!el) return;
    el.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  /* -------------------------------------------------- */
  /* DATA NORMALISATION                                 */
  /* -------------------------------------------------- */

  function normaliseDataset() {
    const app = byId("app");
    if (!app) return;

    app.dataset.workspace ||= "young-people-shell";
    app.dataset.scope ||= "child";
    app.dataset.userRole ||= "admin";
    app.dataset.allowedHomeIds ||= "[]";
    app.dataset.assistantScopeType ||= "child";

    app.dataset.youngPersonId ||= "";
    app.dataset.homeId ||= "";
    app.dataset.providerId ||= "";
  }

  /* -------------------------------------------------- */
  /* 🌙 DARK MODE                                       */
  /* -------------------------------------------------- */

  function initDarkMode() {
    const btn = byId("themeToggleBtn");
    const root = document.documentElement;

    const saved = localStorage.getItem("indicare-theme") || "light";
    root.setAttribute("data-theme", saved);

    btn?.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("indicare-theme", next);
    });
  }

  /* -------------------------------------------------- */
  /* 👋 DYNAMIC WELCOME                                 */
  /* -------------------------------------------------- */

  function injectWelcomeMessage() {
    const host = document.querySelector(".workspace-context-pill-value");
    if (!host) return;

    const role = byId("app")?.dataset.userRole || "staff";
    const hour = new Date().getHours();

    let greeting = "Welcome";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";
    else greeting = "Good evening";

    host.textContent = `${greeting} • ${role}`;
  }

  /* -------------------------------------------------- */
  /* 🎤 SPEECH TO TEXT                                 */
  /* -------------------------------------------------- */

  function initSpeechToText() {
    if (!("webkitSpeechRecognition" in window)) return;

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-speech]");
      if (!btn) return;

      const targetId = btn.dataset.target;
      const field = document.getElementById(targetId);
      if (!field) return;

      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        field.value += " " + transcript;
        field.dispatchEvent(new Event("input"));
      };
    });
  }

  /* -------------------------------------------------- */
  /* 🧠 THERAPEUTIC NUDGES                             */
  /* -------------------------------------------------- */

  function addTherapeuticNudges() {
    document.addEventListener("input", (e) => {
      const field = e.target;

      if (!field.matches("textarea")) return;

      const value = field.value.toLowerCase();

      if (value.includes("refused") && !value.includes("why")) {
        field.dataset.nudge =
          "Consider adding what the child may have been feeling or communicating.";
      } else {
        delete field.dataset.nudge;
      }
    });
  }

  /* -------------------------------------------------- */
  /* 📱 MOBILE NAV                                     */
  /* -------------------------------------------------- */

  function enhanceMobileNavigation() {
    const toggle = byId("mobileNavToggle");
    const panel = byId("mobileNavPanel");
    const backdrop = byId("mobileNavBackdrop");

    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const open = !isVisible(panel);
      setHidden(panel, !open);
      setHidden(backdrop, !open);
      setExpanded(toggle, open);
    });

    backdrop?.addEventListener("click", () => {
      setHidden(panel, true);
      setHidden(backdrop, true);
      setExpanded(toggle, false);
    });
  }

  /* -------------------------------------------------- */
  /* ⌨️ GLOBAL SEARCH SHORTCUT                         */
  /* -------------------------------------------------- */

  function addGlobalSearchShortcut() {
    const input = byId("recordSearchInput");

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        input?.focus();
      }
    });
  }

  /* -------------------------------------------------- */
  /* 🔒 MODAL CONTROL                                  */
  /* -------------------------------------------------- */

  function bindAssistant() {
    const modal = byId("assistantModal");
    const backdrop = byId("assistantBackdrop");

    function open() {
      setHidden(modal, false);
      setHidden(backdrop, false);
      byId("assistantInput")?.focus();
    }

    function close() {
      setHidden(modal, true);
      setHidden(backdrop, true);
    }

    document.querySelectorAll(
      "#assistantLauncher, #heroAssistantBtn, #safeStartAskAssistantBtn"
    ).forEach((btn) => btn?.addEventListener("click", open));

    byId("closeAssistantBtn")?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
  }

  /* -------------------------------------------------- */
  /* ✨ MICRO UX                                       */
  /* -------------------------------------------------- */

  function addMicroInteractions() {
    document.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.add("clicked");
        setTimeout(() => btn.classList.remove("clicked"), 150);
      });
    });
  }

  /* -------------------------------------------------- */
  /* 🧩 CORE INIT                                      */
  /* -------------------------------------------------- */

  async function loadModularShell() {
    try {
      await import(SHELL_MODULE);
      log("modular shell loaded");
    } catch (err) {
      console.error(err);
    }
  }

  function initEnhancements() {
    normaliseDataset();
    initDarkMode();
    injectWelcomeMessage();
    initSpeechToText();
    addTherapeuticNudges();
    enhanceMobileNavigation();
    addGlobalSearchShortcut();
    bindAssistant();
    addMicroInteractions();
  }

  async function init() {
    await loadModularShell();
    initEnhancements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
