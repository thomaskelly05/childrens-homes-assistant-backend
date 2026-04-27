(() => {
  "use strict";

  const SHELL_MODULE = "/js/young-people-shell/index.js";

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

    if (!app.dataset.youngPersonId) app.dataset.youngPersonId = "";
    if (!app.dataset.homeId) app.dataset.homeId = "";
    if (!app.dataset.providerId) app.dataset.providerId = "";
  }

  function addCareHubClasses() {
    const app = byId("app");
    if (!app) return;

    app.classList.add("indicare-care-hub");
    document.body.classList.add("indicare-care-hub-body");
  }

  function syncMobileDrawerState() {
    const toggle = byId("mobileNavToggle");
    const panel = byId("mobileNavPanel");
    const backdrop = byId("mobileNavBackdrop");

    if (!toggle || !panel) return;

    const open = isVisible(panel);
    setExpanded(toggle, open);
    setHidden(backdrop, !open);

    document.body.classList.toggle("mobile-nav-open", open);
  }

  function enhanceMobileNavigation() {
    const toggle = byId("mobileNavToggle");
    const panel = byId("mobileNavPanel");
    const backdrop = byId("mobileNavBackdrop");
    const closeBtn = byId("closeMobileNavBtn");

    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const nextOpen = !isVisible(panel);
      setHidden(panel, !nextOpen);
      syncMobileDrawerState();

      if (nextOpen) {
        const firstFocusable = getFocusableElements(panel)[0];
        firstFocusable?.focus?.();
      }
    });

    closeBtn?.addEventListener("click", () => {
      setHidden(panel, true);
      syncMobileDrawerState();
      toggle.focus();
    });

    backdrop?.addEventListener("click", () => {
      setHidden(panel, true);
      syncMobileDrawerState();
      toggle.focus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!isVisible(panel)) return;

      setHidden(panel, true);
      syncMobileDrawerState();
      toggle.focus();
    });

    syncMobileDrawerState();
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

    content.querySelectorAll("table").forEach((table) => {
      if (table.closest(".record-table-scroll")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "record-table-scroll";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
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
          "summary",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter((el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
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
    const getDialogs = () =>
      [
        byId("assistantModal"),
        byId("recordComposerPage"),
        byId("recordDrawer"),
        byId("fullscreenPanel"),
        byId("suggestionsPanel"),
        byId("mobileNavPanel"),
      ].filter(Boolean);

    document.addEventListener("keydown", (event) => {
      const activeDialog = getDialogs().find(isVisible);
      if (activeDialog) trapFocus(activeDialog, event);
    });
  }

  function improveComposerControls() {
    const composer = byId("recordComposerPage");
    if (!composer) return;

    const enhance = () => {
      composer.querySelectorAll("textarea").forEach((textarea) => {
        textarea.setAttribute("rows", textarea.getAttribute("rows") || "5");
        textarea.setAttribute("spellcheck", "true");
        textarea.setAttribute("autocomplete", "off");
      });

      composer.querySelectorAll("input, textarea, select").forEach((field) => {
        if (!field.id || field.dataset.premiumEnhanced === "true") return;

        field.dataset.premiumEnhanced = "true";

        field.addEventListener("invalid", () => {
          field.closest(".composer-field, .field")?.classList.add("field-has-error");
        });

        field.addEventListener("input", () => {
          field.closest(".composer-field, .field")?.classList.remove("field-has-error");
        });
      });
    };

    const observer = new MutationObserver(enhance);
    observer.observe(composer, {
      childList: true,
      subtree: true,
    });

    enhance();
  }

  function improveAssistantText() {
    const host = byId("assistantMessages");
    if (!host) return;

    const enhance = () => {
      host.querySelectorAll(".assistant-message-body").forEach((body) => {
        body.innerHTML = body.innerHTML
          .replaceAll("&amp;bull;", "•")
          .replaceAll("&amp;nbsp;", " ")
          .replaceAll("Thinking...", "Thinking…");
      });
    };

    const observer = new MutationObserver(enhance);
    observer.observe(host, {
      childList: true,
      subtree: true,
    });

    enhance();
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

    const original =
      host.textContent.trim() ||
      "Child-centred Care Hub";

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

  function improveCareHubCopy() {
    const replacements = [
      ["Residential care workspace", "Child-centred Care Hub"],
      ["Today at a glance", "My Day"],
      ["Ask assistant", "Ask IndiCare"],
      ["Assistant", "IndiCare Assistant"],
      ["Dashboard", "Care Hub"],
      ["Change child", "Change child"],
      ["Search records", "Search care story"],
      ["Loading workspace…", "Opening Care Hub…"],
    ];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          const tag = parent.tagName;
          if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      let text = node.nodeValue;
      replacements.forEach(([from, to]) => {
        text = text.replaceAll(from, to);
      });
      node.nodeValue = text;
    });
  }

  function addMobileBottomNavFallback() {
    const host = byId("mobileBottomNav");
    if (!host || host.dataset.bound === "true") return;

    host.dataset.bound = "true";

    host.innerHTML = `
      <button class="nav-btn" type="button" data-mobile-nav-action="home">My Day</button>
      <button class="nav-btn" type="button" data-mobile-nav-action="record">Record</button>
      <button class="nav-btn" type="button" data-mobile-nav-action="menu">Menu</button>
      <button class="nav-btn" type="button" data-mobile-nav-action="assistant">Ask</button>
    `;

    host.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mobile-nav-action]");
      if (!button) return;

      const action = button.dataset.mobileNavAction;

      if (action === "menu") {
        byId("mobileNavToggle")?.click();
        return;
      }

      if (action === "assistant") {
        byId("assistantLauncher")?.click();
        byId("heroAssistantBtn")?.click();
        return;
      }

      if (action === "record") {
        const dailyNote =
          document.querySelector('[data-action="daily-note"]') ||
          document.querySelector('[data-action-router="new-task"]');

        dailyNote?.click();
        return;
      }

      if (action === "home") {
        const homeBtn =
          document.querySelector('[data-view="home"]') ||
          byId("goHomeBtn");

        homeBtn?.click();
      }
    });
  }

  function closeOtherCareMenus() {
    document.addEventListener("toggle", (event) => {
      const current = event.target;
      if (!(current instanceof HTMLDetailsElement)) return;
      if (!current.matches("[data-workspace-menu]")) return;
      if (!current.open) return;

      document.querySelectorAll("details[data-workspace-menu][open]").forEach((menu) => {
        if (menu !== current) menu.open = false;
      });
    }, true);

    document.addEventListener("click", (event) => {
      const clickedInside = event.target.closest("details[data-workspace-menu]");
      if (clickedInside) return;

      document.querySelectorAll("details[data-workspace-menu][open]").forEach((menu) => {
        menu.open = false;
      });
    });
  }

  function addProductionReadyClass() {
    const app = byId("app");
    if (!app) return;

    requestAnimationFrame(() => {
      app.classList.add("premium-ready", "care-hub-ready");
      document.body.classList.add("indicare-shell-ready");
    });
  }

  function showStartupError(error) {
    const status = byId("statusBar") || byId("statusMessage");
    if (status) {
      status.classList.remove("hidden");
      status.removeAttribute("aria-hidden");
      status.textContent =
        "The Care Hub could not start. Check that /js/young-people-shell/index.js is available and has no import errors.";
    }

    console.error("[young-people-shell] failed to load modular shell", error);
  }

  async function loadModularShell() {
    try {
      ensureRequiredDomAliases();
      normaliseDataset();
      addCareHubClasses();

      await import(SHELL_MODULE);

      restoreHtmlCompatibilityIds();
      log("modular shell loaded");
      return true;
    } catch (error) {
      restoreHtmlCompatibilityIds();
      showStartupError(error);
      return false;
    }
  }

  function initEnhancements() {
    addCareHubClasses();
    improveCareHubCopy();
    enhanceMobileNavigation();
    observeWorkspaceContent();
    bindDialogFocusManagement();
    improveComposerControls();
    improveAssistantText();
    improveStatusAnnouncements();
    addGlobalSearchShortcut();
    addSafeExternalLinkHandling();
    addLiveClockToShell();
    addMobileBottomNavFallback();
    closeOtherCareMenus();
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