(() => {
  "use strict";

  const SHELL_MODULE = "/js/young-people-shell/index.js";

  function log(...args) {
    console.log("[young-people-shell]", ...args);
  }

  function warn(...args) {
    console.warn("[young-people-shell]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function isVisible(el) {
    return !!el && !el.classList.contains("hidden") && el.getAttribute("aria-hidden") !== "true";
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

  function ensureRequiredDomAliases() {
    const selectorPanel = byId("selectorPanel");
    const workspacePanel = byId("workspacePanel");

    if (selectorPanel && !byId("selectorScreen")) {
      selectorPanel.id = "selectorScreen";
      selectorPanel.dataset.originalId = "selectorPanel";
    }

    if (workspacePanel && !byId("workspaceScreen")) {
      workspacePanel.id = "workspaceScreen";
      workspacePanel.dataset.originalId = "workspacePanel";
    }
  }

  function restoreHtmlCompatibilityIds() {
    const selectorScreen = byId("selectorScreen");
    const workspaceScreen = byId("workspaceScreen");

    if (selectorScreen && selectorScreen.dataset.originalId === "selectorPanel") {
      selectorScreen.id = "selectorPanel";
    }

    if (workspaceScreen && workspaceScreen.dataset.originalId === "workspacePanel") {
      workspaceScreen.id = "workspacePanel";
    }
  }

  function normaliseDataset() {
    const app = byId("app");
    if (!app) return;

    app.dataset.workspace = app.dataset.workspace || "young-people-shell";
    app.dataset.scope = app.dataset.scope || "child";
    app.dataset.userRole = app.dataset.userRole || "admin";
    app.dataset.allowedHomeIds = app.dataset.allowedHomeIds || "[]";
    app.dataset.assistantScopeType = app.dataset.assistantScopeType || "child";
  }

  function enhanceMobileNavigation() {
    const toggle = byId("mobileNavToggle");
    const panel = byId("mobileNavPanel");
    const backdrop = byId("mobileNavBackdrop");
    const closeBtn = byId("closeMobileNavBtn");

    if (!toggle || !panel) return;

    const sync = () => {
      const open = isVisible(panel);
      setExpanded(toggle, open);
      setHidden(backdrop, !open);
    };

    toggle.addEventListener("click", () => requestAnimationFrame(sync));
    closeBtn?.addEventListener("click", () => requestAnimationFrame(sync));
    backdrop?.addEventListener("click", () => requestAnimationFrame(sync));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") requestAnimationFrame(sync);
    });

    sync();
  }

  function addTableResponsiveLabels() {
    document.querySelectorAll(".record-table").forEach((table) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        th.textContent.trim()
      );

      table.querySelectorAll("tbody tr").forEach((row) => {
        Array.from(row.children).forEach((cell, index) => {
          if (headers[index]) cell.dataset.label = headers[index];
        });
      });
    });
  }

  function observeWorkspaceContent() {
    const content = byId("viewContent");
    if (!content) return;

    const observer = new MutationObserver(() => {
      addTableResponsiveLabels();
      improvePlainWorkspaceBlocks();
    });

    observer.observe(content, {
      childList: true,
      subtree: true,
    });

    addTableResponsiveLabels();
    improvePlainWorkspaceBlocks();
  }

  function improvePlainWorkspaceBlocks() {
    const content = byId("viewContent");
    if (!content) return;

    content.querySelectorAll(".panel").forEach((panel, index) => {
      panel.dataset.panelTone = String((index % 6) + 1);
    });

    content.querySelectorAll(".record-table-shell").forEach((table, index) => {
      table.dataset.tableTone = String((index % 6) + 1);
    });

    content.querySelectorAll(".empty-state").forEach((empty) => {
      if (!empty.querySelector(".empty-state-icon")) {
        const icon = document.createElement("div");
        icon.className = "empty-state-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "○";
        empty.prepend(icon);
      }
    });
  }

  function getFocusableElements(container) {
    if (!container) return [];

    return Array.from(
      container.querySelectorAll(
        [
          "a[href]",
          "button:not([disabled])",
          "textarea:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }

  function trapFocus(container, event) {
    if (!container || event.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bindDialogFocusManagement() {
    const dialogs = [
      byId("assistantModal"),
      byId("recordComposerPage"),
      byId("recordDrawer"),
      byId("fullscreenPanel"),
      byId("suggestionsPanel"),
      byId("mobileNavPanel"),
    ].filter(Boolean);

    document.addEventListener("keydown", (event) => {
      const activeDialog = dialogs.find(isVisible);
      if (activeDialog) trapFocus(activeDialog, event);
    });
  }

  function improveComposerControls() {
    const composer = byId("recordComposerPage");
    if (!composer) return;

    const observer = new MutationObserver(() => {
      composer.querySelectorAll("textarea").forEach((textarea) => {
        textarea.setAttribute("rows", textarea.getAttribute("rows") || "5");
        textarea.setAttribute("spellcheck", "true");
        textarea.setAttribute("autocomplete", "off");
      });

      composer.querySelectorAll("input, textarea, select").forEach((field) => {
        if (!field.id || field.dataset.premiumEnhanced === "true") return;

        field.dataset.premiumEnhanced = "true";

        field.addEventListener("invalid", () => {
          field.closest(".composer-field")?.classList.add("field-has-error");
        });

        field.addEventListener("input", () => {
          field.closest(".composer-field")?.classList.remove("field-has-error");
        });
      });
    });

    observer.observe(composer, {
      childList: true,
      subtree: true,
    });
  }

  function improveAssistantText() {
    const host = byId("assistantMessages");
    if (!host) return;

    const observer = new MutationObserver(() => {
      host.querySelectorAll(".assistant-message-body").forEach((body) => {
        body.innerHTML = body.innerHTML
          .replaceAll("&amp;bull;", "•")
          .replaceAll("&amp;nbsp;", " ")
          .replaceAll("Thinking...", "Thinking…");
      });
    });

    observer.observe(host, {
      childList: true,
      subtree: true,
    });
  }

  function improveStatusAnnouncements() {
    ["statusBar", "statusMessage"].forEach((id) => {
      const status = byId(id);
      if (!status) return;
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
    });
  }

  function addGlobalSearchShortcut() {
    const search = byId("recordSearchInput");

    document.addEventListener("keydown", (event) => {
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName || ""
      );

      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (!search) return;
        event.preventDefault();
        search.focus();
      }
    });
  }

  function addSafeExternalLinkHandling() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!href.startsWith("http")) return;

      try {
        const url = new URL(href);
        if (url.origin === window.location.origin) return;

        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } catch {
        // Ignore invalid URLs.
      }
    });
  }

  function addLiveClockToShell() {
    const host = document.querySelector(".workspace-context-pill-value");
    if (!host || host.dataset.clockBound === "true") return;

    host.dataset.clockBound = "true";
    const original = host.textContent.trim() || "Residential care workspace";

    const tick = () => {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      host.textContent = `${original} • ${time}`;
    };

    tick();
    window.setInterval(tick, 30000);
  }

  function addProductionReadyClass() {
    const app = byId("app");
    if (!app) return;

    requestAnimationFrame(() => {
      app.classList.add("premium-ready");
      document.body.classList.add("indicare-shell-ready");
    });
  }

  async function loadModularShell() {
    try {
      ensureRequiredDomAliases();
      normaliseDataset();

      await import(SHELL_MODULE);

      restoreHtmlCompatibilityIds();
      log("modular shell loaded");
    } catch (error) {
      restoreHtmlCompatibilityIds();
      console.error("[young-people-shell] failed to load modular shell", error);

      const status = byId("statusBar") || byId("statusMessage");
      if (status) {
        status.classList.remove("hidden");
        status.textContent =
          "The workspace could not start. Check that /js/young-people-shell/index.js is available.";
      }
    }
  }

  function initEnhancements() {
    enhanceMobileNavigation();
    observeWorkspaceContent();
    bindDialogFocusManagement();
    improveComposerControls();
    improveAssistantText();
    improveStatusAnnouncements();
    addGlobalSearchShortcut();
    addSafeExternalLinkHandling();
    addLiveClockToShell();
    addProductionReadyClass();
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
