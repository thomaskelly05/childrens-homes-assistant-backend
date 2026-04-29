(() => {
  "use strict";

  const SHELL_MODULE = "/js/young-people-shell/index.js";
  const STORAGE_THEME_KEY = "indicare-theme";

  let speechRecognition = null;
  let activeSpeechField = null;

  function log(...args) {
    console.log("[young-people-shell]", ...args);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
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

  function safeJsonParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function getStoredUser() {
    return (
      safeJsonParse(sessionStorage.getItem("current_user"), null) ||
      safeJsonParse(localStorage.getItem("current_user"), null) ||
      null
    );
  }

  function getRoleLabel(role = "") {
    const value = String(role || "").replaceAll("_", " ").trim();
    if (!value) return "Care team";
    return value
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function normaliseDataset() {
    const app = byId("app");
    if (!app) return;

    app.dataset.workspace ||= "young-people-shell";
    app.dataset.scope ||= "child";
    app.dataset.userRole ||= "admin";
    app.dataset.allowedHomeIds ||= "[]";
    app.dataset.assistantScopeType ||= "child";

    if (!app.dataset.youngPersonId) app.dataset.youngPersonId = "";
    if (!app.dataset.homeId) app.dataset.homeId = "";
    if (!app.dataset.providerId) app.dataset.providerId = "";
  }

  function addCareHubClasses() {
    const app = byId("app");
    if (!app) return;

    app.classList.add(
      "indicare-care-hub",
      "safe-start-shell",
      "premium-ready",
      "care-hub-ready"
    );

    document.body.classList.add(
      "indicare-care-hub-body",
      "safe-start-body",
      "indicare-shell-ready"
    );
  }

  function enhanceSafeStartLayout() {
    const selectorPanel = byId("selectorPanel");
    const selectorInner = selectorPanel?.querySelector(".selector-screen-inner");
    const launchGrid = selectorPanel?.querySelector(".safe-start-launch-grid");
    const homePanel = selectorPanel?.querySelector(".simple-home-panel");
    const childPanel = selectorPanel?.querySelector(".simple-children-panel");
    const homeList = byId("homeChipList");
    const childList = byId("selectorList");

    if (!selectorPanel) return;

    selectorPanel.classList.add("safe-start-clean-entry");
    selectorInner?.classList.add("selector-screen-inner--simple");
    launchGrid?.classList.add("safe-start-launch-grid");
    homePanel?.classList.add("safe-start-home-column");
    childPanel?.classList.add("safe-start-young-people-column");
    homeList?.classList.add("safe-start-home-row");
    childList?.classList.add("safe-start-young-people-row");
  }

  function initThemeMode() {
    const app = byId("app");
    const toggle =
      byId("themeToggleBtn") ||
      byId("darkModeToggleBtn") ||
      qs("[data-theme-toggle]");

    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    const preferredDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : preferredDark
          ? "dark"
          : "light";

    document.documentElement.dataset.theme = initialTheme;
    document.body.dataset.theme = initialTheme;
    app?.setAttribute("data-theme", initialTheme);

    if (toggle) {
      toggle.setAttribute("aria-pressed", initialTheme === "dark" ? "true" : "false");
      toggle.title =
        initialTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }

    if (!toggle || toggle.dataset.themeBound === "true") return;
    toggle.dataset.themeBound = "true";

    toggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "light";
      const next = current === "dark" ? "light" : "dark";

      document.documentElement.dataset.theme = next;
      document.body.dataset.theme = next;
      app?.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_THEME_KEY, next);

      toggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      toggle.title = next === "dark" ? "Switch to light mode" : "Switch to dark mode";
    });
  }

  function initWelcomeMessage() {
    const user = getStoredUser();
    const app = byId("app");

    const role =
      user?.role ||
      user?.user_role ||
      user?.account_role ||
      app?.dataset.userRole ||
      "care team";

    const firstName =
      user?.first_name ||
      user?.firstName ||
      user?.name?.split?.(" ")?.[0] ||
      "";

    const hour = new Date().getHours();

    let greeting = "Welcome";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";
    else greeting = "Good evening";

    const welcomeText = firstName
      ? `${greeting}, ${firstName}`
      : `${greeting}`;

    const welcomeTargets = [
      byId("welcomeMessage"),
      byId("userWelcomeMessage"),
      qs("[data-user-welcome]"),
    ].filter(Boolean);

    welcomeTargets.forEach((target) => {
      target.textContent = welcomeText;
    });

    const roleTargets = [
      byId("welcomeRole"),
      byId("userRoleLabel"),
      qs("[data-user-role-label]"),
    ].filter(Boolean);

    roleTargets.forEach((target) => {
      target.textContent = getRoleLabel(role);
    });
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

  function enhanceMobileNavigation() {
    const toggle = byId("mobileNavToggle");
    const panel = byId("mobileNavPanel");
    const backdrop = byId("mobileNavBackdrop");
    const closeBtn = byId("closeMobileNavBtn");

    if (!toggle || !panel || toggle.dataset.bound === "true") return;

    toggle.dataset.bound = "true";

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
    if (!content || content.dataset.observed === "true") return;

    content.dataset.observed = "true";

    const observer = new MutationObserver(() => {
      addTableResponsiveLabels();
      improvePlainWorkspaceBlocks();
      enhanceRecordSurfaces();
    });

    observer.observe(content, {
      childList: true,
      subtree: true,
    });

    addTableResponsiveLabels();
    improvePlainWorkspaceBlocks();
    enhanceRecordSurfaces();
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
    if (document.body.dataset.dialogFocusBound === "true") return;
    document.body.dataset.dialogFocusBound = "true";

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

  function createSpeechButton(field) {
    if (!field || !field.id) return null;
    if (field.closest(".field")?.querySelector(`[data-speech-target="${field.id}"]`)) {
      return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "speech-input-btn";
    button.dataset.speechTarget = field.id;
    button.setAttribute("aria-label", "Dictate into this field");
    button.title = "Dictate into this field";
    button.innerHTML = `<span aria-hidden="true">🎙</span><span>Dictate</span>`;

    return button;
  }

  function ensureFieldId(field, index) {
    if (field.id) return field.id;

    const name = field.getAttribute("name") || "composer-field";
    field.id = `${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index}`;
    return field.id;
  }

  function setupSpeechRecognition() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      if (!activeSpeechField) return;

      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) return;

      const current = activeSpeechField.value || "";
      const separator = current.trim() ? " " : "";

      activeSpeechField.value = `${current}${separator}${transcript}`;
      activeSpeechField.dispatchEvent(new Event("input", { bubbles: true }));
    };

    recognition.onerror = () => {
      document.body.classList.remove("speech-listening");
      activeSpeechField = null;
    };

    recognition.onend = () => {
      document.body.classList.remove("speech-listening");
      activeSpeechField = null;
    };

    return recognition;
  }

  function enhanceSpeechToTextControls(root = document) {
    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

    qsa("textarea", root).forEach((textarea, index) => {
      ensureFieldId(textarea, index);

      const fieldWrap = textarea.closest(".field, .composer-field");
      if (!fieldWrap) return;

      fieldWrap.classList.add("field--speech-ready");

      if (!supported) {
        fieldWrap.classList.add("field--speech-unsupported");
        return;
      }

      const button = createSpeechButton(textarea);
      if (!button) return;

      const label =
        fieldWrap.querySelector(".label, .form-label") ||
        fieldWrap.querySelector("label");

      if (label) {
        const actions = document.createElement("div");
        actions.className = "field-inline-actions";
        actions.appendChild(button);
        label.after(actions);
      } else {
        textarea.before(button);
      }
    });
  }

  function bindSpeechToText() {
    if (document.body.dataset.speechBound === "true") return;
    document.body.dataset.speechBound = "true";

    speechRecognition = setupSpeechRecognition();

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-speech-target]");
      if (!button) return;

      if (!speechRecognition) {
        window.alert("Speech-to-text is not supported in this browser.");
        return;
      }

      const field = byId(button.dataset.speechTarget);
      if (!field) return;

      try {
        activeSpeechField = field;
        document.body.classList.add("speech-listening");
        speechRecognition.start();
      } catch {
        document.body.classList.remove("speech-listening");
      }
    });
  }

  function improveComposerControls() {
    const composer = byId("recordComposerPage");
    if (!composer || composer.dataset.composerEnhanced === "true") return;

    composer.dataset.composerEnhanced = "true";

    const enhance = () => {
      composer.querySelectorAll("textarea").forEach((textarea) => {
        textarea.setAttribute("rows", textarea.getAttribute("rows") || "5");
        textarea.setAttribute("spellcheck", "true");
        textarea.setAttribute("autocomplete", "off");
      });

      composer.querySelectorAll("input, textarea, select").forEach((field) => {
        if (!field.id && field.name) {
          field.id = `composer-${field.name}`;
        }

        if (!field.id || field.dataset.premiumEnhanced === "true") return;

        field.dataset.premiumEnhanced = "true";

        field.addEventListener("invalid", () => {
          field.closest(".composer-field, .field")?.classList.add("field-has-error");
        });

        field.addEventListener("input", () => {
          field.closest(".composer-field, .field")?.classList.remove("field-has-error");
          updateTherapeuticNudge(field);
        });
      });

      enhanceSpeechToTextControls(composer);
      enhanceComposerSections(composer);
    };

    const observer = new MutationObserver(enhance);
    observer.observe(composer, {
      childList: true,
      subtree: true,
    });

    enhance();
  }

  function updateTherapeuticNudge(field) {
    if (!field || field.tagName !== "TEXTAREA") return;

    const wrap = field.closest(".field, .composer-field");
    if (!wrap) return;

    let nudge = wrap.querySelector(".therapeutic-nudge");
    const value = String(field.value || "").toLowerCase();

    const needsNudge =
      value.includes("refused") ||
      value.includes("challenging") ||
      value.includes("attention seeking") ||
      value.includes("non compliant") ||
      value.includes("aggressive");

    if (!needsNudge) {
      nudge?.remove();
      return;
    }

    if (!nudge) {
      nudge = document.createElement("div");
      nudge.className = "therapeutic-nudge";
      wrap.appendChild(nudge);
    }

    nudge.textContent =
      "Therapeutic prompt: add what the young person may have been feeling, needing, communicating, and what adults did to help them feel safer.";
  }

  function enhanceComposerSections(root = document) {
    qsa(".section, .composer-section", root).forEach((section, index) => {
      section.classList.add("composer-section-card");
      section.dataset.sectionStep = String(index + 1);

      if (!section.querySelector(".composer-section-step")) {
        const step = document.createElement("div");
        step.className = "composer-section-step";
        step.textContent = `Step ${index + 1}`;
        section.prepend(step);
      }
    });
  }

  function improveAssistantText() {
    const host = byId("assistantMessages");
    if (!host || host.dataset.assistantTextEnhanced === "true") return;

    host.dataset.assistantTextEnhanced = "true";

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
    ["statusBar", "statusMessage", "selectorStatusMessage"].forEach((id) => {
      const status = byId(id);
      if (!status) return;

      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
    });
  }

  function addGlobalSearchShortcut() {
    if (document.body.dataset.searchShortcutBound === "true") return;
    document.body.dataset.searchShortcutBound = "true";

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
    if (document.body.dataset.externalLinkHandlingBound === "true") return;
    document.body.dataset.externalLinkHandlingBound = "true";

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

    const original = host.textContent.trim() || "Choose home and young person";

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
    if (document.body.dataset.copyImproved === "true") return;
    document.body.dataset.copyImproved = "true";

    const replacements = [
      ["Residential care workspace", "Child-centred Care Hub"],
      ["Today at a glance", "My Day"],
      ["Ask assistant", "Ask IndiCare"],
      ["Assistant", "IndiCare Assistant"],
      ["Dashboard", "Care Hub"],
      ["Search records", "Search care story"],
      ["Loading workspace…", "Opening Care Hub…"],
      ["Care Hub menu", "Care Hub folders"],
      ["What do you need to do?", "Choose the area you need"],
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
    if (document.body.dataset.careMenuBound === "true") return;
    document.body.dataset.careMenuBound = "true";

    document.addEventListener(
      "toggle",
      (event) => {
        const current = event.target;
        if (!(current instanceof HTMLDetailsElement)) return;
        if (!current.matches("[data-workspace-menu]")) return;
        if (!current.open) return;

        document.querySelectorAll("details[data-workspace-menu][open]").forEach((menu) => {
          if (menu !== current) menu.open = false;
        });
      },
      true
    );

    document.addEventListener("click", (event) => {
      const clickedInside = event.target.closest("details[data-workspace-menu]");
      if (clickedInside) return;

      document.querySelectorAll("details[data-workspace-menu][open]").forEach((menu) => {
        menu.open = false;
      });
    });
  }

  function bindEntryPointButtons() {
    const logoBtn = byId("logoBtn");
    const goHomeBtn = byId("goHomeBtn");
    const changePersonBtn = byId("changePersonBtn");
    const mobileHomeBtn = byId("mobileHomeBtn");

    const goToEntry = () => {
      const selectorPanel = byId("selectorPanel");
      const workspacePanel = byId("workspacePanel");

      if (selectorPanel && workspacePanel) {
        setHidden(workspacePanel, true);
        setHidden(selectorPanel, false);
        selectorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    [logoBtn, goHomeBtn, changePersonBtn, mobileHomeBtn].forEach((button) => {
      if (!button || button.dataset.entryBound === "true") return;
      button.dataset.entryBound = "true";
      button.addEventListener("click", goToEntry);
    });
  }

  function bindAssistantLaunchers() {
    const launchers = [
      byId("safeStartAskAssistantBtn"),
      byId("heroAssistantBtn"),
      byId("assistantLauncher"),
    ].filter(Boolean);

    const openAssistant = () => {
      const modal = byId("assistantModal");
      const backdrop = byId("assistantBackdrop");

      setHidden(backdrop, false);
      setHidden(modal, false);

      const input = byId("assistantInput");
      requestAnimationFrame(() => input?.focus?.());
    };

    const closeAssistant = () => {
      setHidden(byId("assistantModal"), true);
      setHidden(byId("assistantBackdrop"), true);
    };

    launchers.forEach((button) => {
      if (button.dataset.assistantLauncherBound === "true") return;
      button.dataset.assistantLauncherBound = "true";
      button.addEventListener("click", openAssistant);
    });

    const closeBtn = byId("closeAssistantBtn");
    if (closeBtn && closeBtn.dataset.assistantCloseBound !== "true") {
      closeBtn.dataset.assistantCloseBound = "true";
      closeBtn.addEventListener("click", closeAssistant);
    }

    const backdrop = byId("assistantBackdrop");
    if (backdrop && backdrop.dataset.assistantBackdropBound !== "true") {
      backdrop.dataset.assistantBackdropBound = "true";
      backdrop.addEventListener("click", closeAssistant);
    }
  }

  function bindPanelCloseButtons() {
    const bindings = [
      ["closeFullscreenPanelBtn", "fullscreenPanel"],
      ["closeSuggestionsPanelBtn", "suggestionsPanel"],
      ["closeComposerBtn", "recordComposerPage"],
      ["closeRecordDrawerBtn", "recordDrawer"],
    ];

    bindings.forEach(([buttonId, panelId]) => {
      const button = byId(buttonId);
      const panel = byId(panelId);

      if (!button || !panel || button.dataset.closeBound === "true") return;

      button.dataset.closeBound = "true";

      button.addEventListener("click", () => {
        setHidden(panel, true);

        if (panelId === "recordDrawer") {
          setHidden(byId("recordDrawerBackdrop"), true);
        }
      });
    });

    const drawerBackdrop = byId("recordDrawerBackdrop");
    if (drawerBackdrop && drawerBackdrop.dataset.drawerBackdropBound !== "true") {
      drawerBackdrop.dataset.drawerBackdropBound = "true";
      drawerBackdrop.addEventListener("click", () => {
        setHidden(byId("recordDrawer"), true);
        setHidden(drawerBackdrop, true);
      });
    }
  }

  function enhanceRecordSurfaces() {
    const root = byId("viewContent");
    if (!root) return;

    qsa(".record-row, .record-card, .timeline-item, .entity-row", root).forEach(
      (record) => {
        record.classList.add("production-record-card");

        if (!record.querySelector(".record-card-action-hint")) {
          const hint = document.createElement("span");
          hint.className = "record-card-action-hint";
          hint.textContent = "Open";
          record.appendChild(hint);
        }
      }
    );

    qsa(".record-list, .timeline-list, .entity-list", root).forEach((list) => {
      list.classList.add("production-record-list");
    });
  }

  function addClickFeedback() {
    if (document.body.dataset.clickFeedbackBound === "true") return;
    document.body.dataset.clickFeedbackBound = "true";

    document.addEventListener("click", (event) => {
      const button = event.target.closest("button, .primary-btn, .secondary-btn, .ghost-btn");
      if (!button) return;

      button.classList.add("is-clicked");
      window.setTimeout(() => button.classList.remove("is-clicked"), 180);
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
    const status =
      byId("statusBar") ||
      byId("selectorStatusMessage") ||
      byId("statusMessage");

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
      normaliseDataset();
      addCareHubClasses();

      await import(SHELL_MODULE);

      log("modular shell loaded");
      return true;
    } catch (error) {
      showStartupError(error);
      return false;
    }
  }

  function initEnhancements() {
    addCareHubClasses();
    enhanceSafeStartLayout();
    initThemeMode();
    initWelcomeMessage();
    improveCareHubCopy();
    enhanceMobileNavigation();
    observeWorkspaceContent();
    bindDialogFocusManagement();
    bindSpeechToText();
    improveComposerControls();
    improveAssistantText();
    improveStatusAnnouncements();
    addGlobalSearchShortcut();
    addSafeExternalLinkHandling();
    addLiveClockToShell();
    addMobileBottomNavFallback();
    closeOtherCareMenus();
    bindEntryPointButtons();
    bindAssistantLaunchers();
    bindPanelCloseButtons();
    addClickFeedback();
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