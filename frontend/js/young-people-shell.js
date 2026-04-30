(() => {
  "use strict";

  const SHELL_MODULE = "/js/young-people-shell/index.js";
  const STORAGE_THEME_KEY = "indicare-theme";
  const STORAGE_NIGHT_KEY = "indicare-night-shift";

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

  function normaliseDataset() {
    const app = byId("app");
    if (!app) return;

    app.dataset.workspace ||= "young-people-shell";
    app.dataset.scope ||= "child";
    app.dataset.section ||= "workspace";
    app.dataset.userRole ||= "admin";
    app.dataset.allowedHomeIds ||= "[]";
    app.dataset.assistantScopeType ||= "child";
    app.dataset.themePreference ||= "system";

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

  function setTheme(theme) {
    const app = byId("app");
    const safeTheme = ["light", "dark", "system"].includes(theme)
      ? theme
      : "system";

    document.documentElement.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-system"
    );
    document.body.classList.remove("theme-light", "theme-dark", "theme-system");
    app?.classList.remove("theme-light", "theme-dark", "theme-system");

    document.documentElement.classList.add(`theme-${safeTheme}`);
    document.body.classList.add(`theme-${safeTheme}`);
    app?.classList.add(`theme-${safeTheme}`);

    document.documentElement.dataset.theme = safeTheme;
    document.body.dataset.theme = safeTheme;
    if (app) {
      app.dataset.themePreference = safeTheme;
      app.setAttribute("data-theme", safeTheme);
    }

    localStorage.setItem(STORAGE_THEME_KEY, safeTheme);

    const toggle = byId("themeToggleBtn") || qs("[data-theme-toggle]");
    if (toggle) {
      const label =
        safeTheme === "light"
          ? "Light mode"
          : safeTheme === "dark"
            ? "Dark mode"
            : "System mode";

      toggle.textContent = label;
      toggle.setAttribute("aria-pressed", safeTheme === "dark" ? "true" : "false");
      toggle.title = "Toggle light, dark or system mode";
    }
  }

  function initThemeMode() {
    const toggle = byId("themeToggleBtn") || qs("[data-theme-toggle]");
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "system";

    setTheme(savedTheme);

    if (!toggle || toggle.dataset.themeBound === "true") return;
    toggle.dataset.themeBound = "true";

    toggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "system";
      const next =
        current === "system" ? "light" : current === "light" ? "dark" : "system";

      setTheme(next);
    });
  }

  function setNightShift(enabled) {
    const app = byId("app");
    document.body.classList.toggle("night-shift-mode", enabled);
    document.documentElement.classList.toggle("night-shift-mode", enabled);
    app?.classList.toggle("night-shift-mode", enabled);

    document.body.dataset.nightShift = enabled ? "true" : "false";
    app?.setAttribute("data-night-shift", enabled ? "true" : "false");

    localStorage.setItem(STORAGE_NIGHT_KEY, enabled ? "true" : "false");

    const toggle = byId("nightShiftModeBtn") || qs("[data-night-shift-toggle]");
    if (toggle) {
      toggle.textContent = enabled ? "Night mode on" : "Night mode";
      toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    }
  }

  function initNightShiftMode() {
    const toggle = byId("nightShiftModeBtn") || qs("[data-night-shift-toggle]");
    setNightShift(localStorage.getItem(STORAGE_NIGHT_KEY) === "true");

    if (!toggle || toggle.dataset.nightShiftBound === "true") return;
    toggle.dataset.nightShiftBound = "true";

    toggle.addEventListener("click", () => {
      const enabled = document.body.dataset.nightShift === "true";
      setNightShift(!enabled);
    });
  }

  function getRoleLabel(role = "") {
    const value = String(role || "").replaceAll("_", " ").trim();
    if (!value) return "Care team";

    return value
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
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

    const welcomeText = firstName ? `${greeting}, ${firstName}` : greeting;

    [byId("welcomeMessage"), byId("userWelcomeMessage"), qs("[data-user-welcome]")]
      .filter(Boolean)
      .forEach((target) => {
        target.textContent = welcomeText;
      });

    [byId("welcomeRole"), byId("userRoleLabel"), qs("[data-user-role-label]")]
      .filter(Boolean)
      .forEach((target) => {
        target.textContent = getRoleLabel(role);
      });
  }

  function enhanceSafeStartLayout() {
    const selectorPanel = byId("selectorPanel");
    if (!selectorPanel) return;

    selectorPanel.classList.add("safe-start-clean-entry");
    selectorPanel
      .querySelector(".selector-screen-inner")
      ?.classList.add("selector-screen-inner--simple");

    selectorPanel
      .querySelector(".safe-start-launch-grid")
      ?.classList.add("safe-start-launch-grid");

    selectorPanel
      .querySelector(".simple-home-panel")
      ?.classList.add("safe-start-home-column");

    selectorPanel
      .querySelector(".simple-children-panel")
      ?.classList.add("safe-start-young-people-column");

    byId("homeChipList")?.classList.add("safe-start-home-row");
    byId("selectorList")?.classList.add("safe-start-young-people-row");
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
        getFocusableElements(panel)[0]?.focus?.();
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
      if (event.key !== "Escape" || !isVisible(panel)) return;
      setHidden(panel, true);
      syncMobileDrawerState();
      toggle.focus();
    });

    syncMobileDrawerState();
  }

  function addTableResponsiveLabels() {
    qsa(".record-table").forEach((table) => {
      const headers = qsa("thead th", table).map((th) => th.textContent.trim());

      qsa("tbody tr", table).forEach((row) => {
        Array.from(row.children).forEach((cell, index) => {
          if (headers[index]) cell.dataset.label = headers[index];
        });
      });
    });
  }

  function improvePlainWorkspaceBlocks() {
    const content = byId("viewContent");
    if (!content) return;

    qsa(".panel", content).forEach((panel, index) => {
      panel.dataset.panelTone = String((index % 6) + 1);
    });

    qsa(".record-table-shell", content).forEach((table, index) => {
      table.dataset.tableTone = String((index % 6) + 1);
    });

    qsa(".empty-state", content).forEach((empty) => {
      if (empty.querySelector(".empty-state-icon")) return;

      const icon = document.createElement("div");
      icon.className = "empty-state-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "○";
      empty.prepend(icon);
    });

    qsa("table", content).forEach((table) => {
      if (table.closest(".record-table-scroll")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "record-table-scroll";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
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

  function observeWorkspaceContent() {
    const content = byId("viewContent");
    if (!content || content.dataset.observed === "true") return;
    content.dataset.observed = "true";

    const enhance = () => {
      addTableResponsiveLabels();
      improvePlainWorkspaceBlocks();
      enhanceRecordSurfaces();
    };

    const observer = new MutationObserver(enhance);
    observer.observe(content, { childList: true, subtree: true });

    enhance();
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

  function ensureFieldId(field, index) {
    if (field.id) return field.id;

    const name = field.getAttribute("name") || "composer-field";
    field.id = `${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index}`;
    return field.id;
  }

  function createSpeechButton(field) {
    if (!field?.id) return null;

    const wrap = field.closest(".field, .composer-field");
    if (wrap?.querySelector(`[data-speech-target="${field.id}"]`)) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "speech-input-btn";
    button.dataset.speechTarget = field.id;
    button.setAttribute("aria-label", "Dictate into this field");
    button.title = "Dictate into this field";
    button.innerHTML = `<span aria-hidden="true">🎙</span><span>Dictate</span>`;

    return button;
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

      const wrap = textarea.closest(".field, .composer-field");
      if (!wrap) return;

      wrap.classList.add("field--speech-ready");

      if (!supported) {
        wrap.classList.add("field--speech-unsupported");
        return;
      }

      const button = createSpeechButton(textarea);
      if (!button) return;

      const label =
        wrap.querySelector(".label, .form-label") || wrap.querySelector("label");

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

  function getSpeechFieldFromButton(button) {
    const targetId = button.dataset.speechTarget;
    const direct = targetId ? byId(targetId) : null;

    if (direct && ["INPUT", "TEXTAREA"].includes(direct.tagName)) return direct;

    if (direct) {
      return direct.querySelector("textarea, input[type='text'], input[type='search']");
    }

    return null;
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

      const field = getSpeechFieldFromButton(button);
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

  function updateRecordQualityMeter() {
    const composer = byId("recordComposerPage");
    if (!composer || !isVisible(composer)) return;

    const textValue = qsa("textarea", composer)
      .map((field) => field.value || "")
      .join(" ")
      .toLowerCase();

    const setStatus = (id, ok, good = "Present", missing = "Add detail") => {
      const el = byId(id);
      if (!el) return;
      el.textContent = ok ? good : missing;
      el.closest("div")?.classList.toggle("quality-ok", ok);
      el.closest("div")?.classList.toggle("quality-missing", !ok);
    };

    setStatus(
      "qualityFactsStatus",
      textValue.length > 40,
      "Detail added",
      "Needs facts"
    );
    setStatus(
      "qualityChildVoiceStatus",
      textValue.includes("said") ||
        textValue.includes("voice") ||
        textValue.includes("wishes") ||
        textValue.includes("feel"),
      "Included",
      "Add voice"
    );
    setStatus(
      "qualityActionsStatus",
      textValue.includes("action") ||
        textValue.includes("next") ||
        textValue.includes("follow"),
      "Included",
      "Add actions"
    );
    setStatus(
      "qualityOversightStatus",
      textValue.includes("manager") ||
        textValue.includes("oversight") ||
        textValue.includes("review"),
      "Considered",
      "Consider oversight"
    );
  }

  function improveComposerControls() {
    const composer = byId("recordComposerPage");
    if (!composer || composer.dataset.composerEnhanced === "true") return;
    composer.dataset.composerEnhanced = "true";

    const enhance = () => {
      qsa("textarea", composer).forEach((textarea) => {
        textarea.setAttribute("rows", textarea.getAttribute("rows") || "5");
        textarea.setAttribute("spellcheck", "true");
        textarea.setAttribute("autocomplete", "off");
      });

      qsa("input, textarea, select", composer).forEach((field) => {
        if (!field.id && field.name) field.id = `composer-${field.name}`;
        if (!field.id || field.dataset.premiumEnhanced === "true") return;

        field.dataset.premiumEnhanced = "true";

        field.addEventListener("invalid", () => {
          field.closest(".composer-field, .field")?.classList.add("field-has-error");
        });

        field.addEventListener("input", () => {
          field.closest(".composer-field, .field")?.classList.remove("field-has-error");
          updateTherapeuticNudge(field);
          updateRecordQualityMeter();
        });
      });

      enhanceSpeechToTextControls(composer);
      enhanceComposerSections(composer);
      updateRecordQualityMeter();
    };

    const observer = new MutationObserver(enhance);
    observer.observe(composer, { childList: true, subtree: true });

    enhance();
  }

  function bindComposerModeControls() {
    if (document.body.dataset.composerModeBound === "true") return;
    document.body.dataset.composerModeBound = "true";

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-composer-view]");
      if (!button) return;

      const mode = button.dataset.composerView || "factual";
      qsa("[data-composer-view]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      byId("recordComposerPage")?.setAttribute("data-composer-view", mode);
    });
  }

  function improveAssistantText() {
    const host = byId("assistantMessages");
    if (!host || host.dataset.assistantTextEnhanced === "true") return;
    host.dataset.assistantTextEnhanced = "true";

    const enhance = () => {
      qsa(".assistant-message-body", host).forEach((body) => {
        body.innerHTML = body.innerHTML
          .replaceAll("&amp;bull;", "•")
          .replaceAll("&amp;nbsp;", " ")
          .replaceAll("Thinking...", "Thinking…");
      });
    };

    const observer = new MutationObserver(enhance);
    observer.observe(host, { childList: true, subtree: true });
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

    document.addEventListener("keydown", (event) => {
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName || ""
      );

      if (isTyping) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const search = byId("recordSearchInput") || byId("selectorSearch");
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
    const host = qs(".workspace-context-pill-value");
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

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

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
        (
          qs('[data-action="daily-note"]') ||
          qs('[data-action-router="new-task"]')
        )?.click();
        return;
      }

      if (action === "home") {
        (qs('[data-view="home"]') || byId("goHomeBtn"))?.click();
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

        qsa("details[data-workspace-menu][open]").forEach((menu) => {
          if (menu !== current) menu.open = false;
        });
      },
      true
    );

    document.addEventListener("click", (event) => {
      if (event.target.closest("details[data-workspace-menu]")) return;

      qsa("details[data-workspace-menu][open]").forEach((menu) => {
        menu.open = false;
      });
    });
  }

  function bindAssistantLaunchers() {
    const openAssistant = () => {
      setHidden(byId("assistantBackdrop"), false);
      setHidden(byId("assistantModal"), false);
      requestAnimationFrame(() => byId("assistantInput")?.focus?.());
    };

    const closeAssistant = () => {
      setHidden(byId("assistantModal"), true);
      setHidden(byId("assistantBackdrop"), true);
    };

    [
      byId("safeStartAskAssistantBtn"),
      byId("heroAssistantBtn"),
      byId("assistantLauncher"),
    ]
      .filter(Boolean)
      .forEach((button) => {
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

  function bindTherapeuticPrompt() {
    const prompt = byId("therapeuticPromptPanel");
    const dismiss = byId("dismissTherapeuticPromptBtn");

    dismiss?.addEventListener("click", () => setHidden(prompt, true));

    document.addEventListener("click", (event) => {
      const recordButton = event.target.closest(
        '[data-action="incident"], [data-action="risk"], [data-nav-section="safeguarding"]'
      );

      if (!recordButton || !prompt) return;
      setHidden(prompt, false);
    });
  }

  function bindEntryReadinessBridge() {
    if (document.body.dataset.entryReadinessBound === "true") return;
    document.body.dataset.entryReadinessBound = "true";

    const sync = () => {
      const homeSelect = byId("homeSelect");
      const childSelect = byId("youngPersonSelect");
      const openBtn = byId("launchOpenCareHubBtn");

      const homeText =
        homeSelect?.selectedOptions?.[0]?.textContent?.trim() ||
        byId("selectedHomeSummary")?.textContent?.trim() ||
        "Not selected";

      const childText =
        childSelect?.selectedOptions?.[0]?.textContent?.trim() ||
        byId("selectedChildSummary")?.textContent?.trim() ||
        "Not selected";

      const hasChild = !!childSelect?.value;

      if (byId("launchReadyHome")) byId("launchReadyHome").textContent = homeText;
      if (byId("launchReadyChild")) {
        byId("launchReadyChild").textContent = hasChild ? childText : "Not selected";
      }
      if (byId("launchLastRefreshed")) {
        byId("launchLastRefreshed").textContent = new Date().toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit" }
        );
      }

      if (openBtn) openBtn.disabled = !hasChild;
    };

    ["homeSelect", "youngPersonSelect"].forEach((id) => {
      byId(id)?.addEventListener("change", sync);
    });

    byId("selectorRefreshBtn")?.addEventListener("click", () => {
      window.setTimeout(sync, 350);
    });

    byId("launchOpenCareHubBtn")?.addEventListener("click", () => {
      byId("openCareHubBtn")?.click();
    });

    const observerTargets = [byId("homeChipList"), byId("selectorList")].filter(Boolean);
    observerTargets.forEach((target) => {
      new MutationObserver(sync).observe(target, { childList: true, subtree: true });
    });

    sync();
  }

  function addClickFeedback() {
    if (document.body.dataset.clickFeedbackBound === "true") return;
    document.body.dataset.clickFeedbackBound = "true";

    document.addEventListener("click", (event) => {
      const button = event.target.closest(
        "button, .primary-btn, .secondary-btn, .ghost-btn"
      );

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
      byId("statusBar") || byId("selectorStatusMessage") || byId("statusMessage");

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
    initNightShiftMode();
    initWelcomeMessage();
    improveCareHubCopy();
    enhanceMobileNavigation();
    observeWorkspaceContent();
    bindDialogFocusManagement();
    bindSpeechToText();
    improveComposerControls();
    bindComposerModeControls();
    improveAssistantText();
    improveStatusAnnouncements();
    addGlobalSearchShortcut();
    addSafeExternalLinkHandling();
    addLiveClockToShell();
    addMobileBottomNavFallback();
    closeOtherCareMenus();
    bindAssistantLaunchers();
    bindPanelCloseButtons();
    bindTherapeuticPrompt();
    bindEntryReadinessBridge();
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