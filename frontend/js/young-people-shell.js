/* frontend/js/young-people-shell.js */
/* Production bridge + premium hardening for IndiCare young people shell */

const SHELL_BOOT_STATE = {
  appImported: false,
  hardeningStarted: false,
  lastFocusedElement: null,
  assistantMutationBound: false,
  composerMutationBound: false,
  tableObserverBound: false,
};

function getById(id) {
  return document.getElementById(id);
}

function isVisible(el) {
  return !!el && !el.classList.contains("hidden") && el.getAttribute("aria-hidden") !== "true";
}

function setExpanded(button, expanded) {
  if (!button) return;
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function setHidden(panel, hidden) {
  if (!panel) return;
  panel.classList.toggle("hidden", hidden);
  panel.setAttribute("aria-hidden", hidden ? "true" : "false");
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
    return;
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function focusFirstInteractive(container) {
  const first = getFocusableElements(container)[0];
  if (first) first.focus({ preventScroll: true });
}

function markModalOpen(container) {
  if (!container) return;

  SHELL_BOOT_STATE.lastFocusedElement = document.activeElement;
  document.body.dataset.modalOpen = "true";

  requestAnimationFrame(() => focusFirstInteractive(container));
}

function markModalClosed() {
  document.body.dataset.modalOpen = "false";

  const target = SHELL_BOOT_STATE.lastFocusedElement;
  if (target && typeof target.focus === "function") {
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }

  SHELL_BOOT_STATE.lastFocusedElement = null;
}

function bindDialogFocusManagement() {
  const panels = [
    getById("assistantModal"),
    getById("recordComposerPage"),
    getById("recordDrawer"),
    getById("fullscreenPanel"),
    getById("suggestionsPanel"),
    getById("mobileNavPanel"),
  ].filter(Boolean);

  if (!panels.length) return;

  document.addEventListener("keydown", (event) => {
    const activeDialog = panels.find(isVisible);
    if (activeDialog) trapFocus(activeDialog, event);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "attributes") continue;

      const target = mutation.target;
      if (!panels.includes(target)) continue;

      if (isVisible(target)) {
        markModalOpen(target);
      } else {
        markModalClosed();
      }
    }
  });

  panels.forEach((panel) => {
    observer.observe(panel, {
      attributes: true,
      attributeFilter: ["class", "aria-hidden"],
    });
  });
}

function enhanceMobileNavigationState() {
  const toggle = getById("mobileNavToggle");
  const panel = getById("mobileNavPanel");
  const backdrop = getById("mobileNavBackdrop");
  const closeBtn = getById("closeMobileNavBtn");

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

function observeDynamicTables() {
  if (SHELL_BOOT_STATE.tableObserverBound) return;
  SHELL_BOOT_STATE.tableObserverBound = true;

  const content = getById("viewContent");
  if (!content) return;

  const observer = new MutationObserver(() => {
    addTableResponsiveLabels();
    enhanceWorkspaceContentPresentation();
  });

  observer.observe(content, {
    childList: true,
    subtree: true,
  });

  addTableResponsiveLabels();
}

function normaliseAssistantMessageText() {
  const host = getById("assistantMessages");
  if (!host || SHELL_BOOT_STATE.assistantMutationBound) return;

  SHELL_BOOT_STATE.assistantMutationBound = true;

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

function improveComposerControls() {
  const composer = getById("recordComposerPage");
  if (!composer || SHELL_BOOT_STATE.composerMutationBound) return;

  SHELL_BOOT_STATE.composerMutationBound = true;

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
        field.closest(".composer-field")?.classList.add("field-has-error");
      });

      field.addEventListener("input", () => {
        field.closest(".composer-field")?.classList.remove("field-has-error");
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

function improveStatusAnnouncements() {
  [getById("statusBar"), getById("statusMessage")].filter(Boolean).forEach((status) => {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  });
}

function addGlobalSearchShortcut() {
  const search = getById("recordSearchInput");

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
    } catch (_) {
      // Ignore malformed href values.
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
  window.setInterval(tick, 30_000);
}

function addPremiumReadyClass() {
  const app = getById("app");
  if (!app) return;

  requestAnimationFrame(() => {
    app.classList.add("premium-ready");
  });
}

function classifyText(text = "") {
  const value = String(text).toLowerCase();

  if (
    value.includes("urgent") ||
    value.includes("overdue") ||
    value.includes("high") ||
    value.includes("critical") ||
    value.includes("safeguarding") ||
    value.includes("risk")
  ) {
    return "danger";
  }

  if (
    value.includes("due") ||
    value.includes("pending") ||
    value.includes("review") ||
    value.includes("returned") ||
    value.includes("medium")
  ) {
    return "warning";
  }

  if (
    value.includes("complete") ||
    value.includes("completed") ||
    value.includes("approved") ||
    value.includes("good") ||
    value.includes("positive") ||
    value.includes("no active")
  ) {
    return "success";
  }

  return "";
}

function enhanceWorkspaceSummaryCards() {
  document.querySelectorAll(".workspace-summary-item").forEach((item) => {
    if (item.dataset.presentationEnhanced === "true") return;

    const text = item.textContent || "";
    const tone = classifyText(text);

    item.dataset.presentationEnhanced = "true";
    item.dataset.tone = tone || "neutral";
  });
}

function enhanceRecordsAndBlocks() {
  const content = getById("viewContent");
  if (!content) return;

  content.querySelectorAll(".record-list > article, .record-list > div:not(.empty-state), .entity-row, .timeline-item, .record-card, .insight-card").forEach((card, index) => {
    if (card.dataset.presentationEnhanced === "true") return;

    card.dataset.presentationEnhanced = "true";
    card.dataset.cardIndex = String((index % 5) + 1);

    const tone = classifyText(card.textContent || "");
    if (tone) card.dataset.tone = tone;
  });

  content.querySelectorAll(".panel, .overview-panel, .record-table-shell, .detail-section").forEach((section, index) => {
    if (section.dataset.sectionTone) return;
    section.dataset.sectionTone = String((index % 6) + 1);
  });
}

function enhanceWorkspaceContentPresentation() {
  enhanceWorkspaceSummaryCards();
  enhanceRecordsAndBlocks();
}

function bindMenuBehaviour() {
  document.addEventListener("click", (event) => {
    const currentMenu = event.target.closest("[data-workspace-menu]");

    document.querySelectorAll("[data-workspace-menu][open]").forEach((menu) => {
      if (menu !== currentMenu) menu.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    document.querySelectorAll("[data-workspace-menu][open]").forEach((menu) => {
      menu.removeAttribute("open");
    });
  });
}

function addConnectionStatus() {
  const app = getById("app");
  if (!app) return;

  const sync = () => {
    app.dataset.connection = navigator.onLine ? "online" : "offline";
  };

  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
}

function initPremiumHardening() {
  if (SHELL_BOOT_STATE.hardeningStarted) return;
  SHELL_BOOT_STATE.hardeningStarted = true;

  bindDialogFocusManagement();
  enhanceMobileNavigationState();
  observeDynamicTables();
  normaliseAssistantMessageText();
  improveComposerControls();
  improveStatusAnnouncements();
  addGlobalSearchShortcut();
  addSafeExternalLinkHandling();
  addLiveClockToShell();
  bindMenuBehaviour();
  addConnectionStatus();
  enhanceWorkspaceContentPresentation();
  addPremiumReadyClass();
}

async function importShellApp() {
  if (SHELL_BOOT_STATE.appImported) return;
  SHELL_BOOT_STATE.appImported = true;

  try {
    await import("./young-people-shell/index.js");
  } catch (error) {
    console.error("[young-people-shell] Failed to import modular shell", error);

    const status =
      getById("statusBar") ||
      getById("statusMessage");

    if (status) {
      status.classList.remove("hidden");
      status.textContent = "The workspace could not start. Please refresh or check the console.";
    }
  }
}

async function bootYoungPeopleShell() {
  await importShellApp();
  initPremiumHardening();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootYoungPeopleShell, { once: true });
} else {
  bootYoungPeopleShell();
}
