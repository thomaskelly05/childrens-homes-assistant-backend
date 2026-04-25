const HARDENING_STATE = {
  lastFocusedElement: null,
  assistantMutationBound: false,
  composerMutationBound: false,
};

function getById(id) {
  return document.getElementById(id);
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
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function focusFirstInteractive(container) {
  const first = getFocusableElements(container)[0];
  if (first) first.focus({ preventScroll: true });
}

function markModalOpen(container) {
  HARDENING_STATE.lastFocusedElement = document.activeElement;
  document.body.dataset.modalOpen = "true";
  requestAnimationFrame(() => focusFirstInteractive(container));
}

function markModalClosed() {
  document.body.dataset.modalOpen = "false";

  const target = HARDENING_STATE.lastFocusedElement;
  if (target && typeof target.focus === "function") {
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }

  HARDENING_STATE.lastFocusedElement = null;
}

function isVisible(el) {
  return !!el && !el.classList.contains("hidden") && el.getAttribute("aria-hidden") !== "true";
}

function bindDialogFocusManagement() {
  const assistantModal = getById("assistantModal");
  const composerPage = getById("recordComposerPage");
  const recordDrawer = getById("recordDrawer");
  const fullscreenPanel = getById("fullscreenPanel");
  const suggestionsPanel = getById("suggestionsPanel");
  const mobileNavPanel = getById("mobileNavPanel");

  document.addEventListener("keydown", (event) => {
    const activeDialog =
      [assistantModal, composerPage, recordDrawer, fullscreenPanel, suggestionsPanel, mobileNavPanel].find(isVisible);

    if (activeDialog) {
      trapFocus(activeDialog, event);
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "attributes") continue;

      const target = mutation.target;
      const nowVisible = isVisible(target);

      if (nowVisible) {
        markModalOpen(target);
      } else {
        markModalClosed();
      }
    }
  });

  [assistantModal, composerPage, recordDrawer, fullscreenPanel, suggestionsPanel, mobileNavPanel]
    .filter(Boolean)
    .forEach((panel) => {
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
        if (headers[index]) {
          cell.dataset.label = headers[index];
        }
      });
    });
  });
}

function observeDynamicTables() {
  const content = getById("viewContent");
  if (!content) return;

  const observer = new MutationObserver(() => {
    addTableResponsiveLabels();
  });

  observer.observe(content, {
    childList: true,
    subtree: true,
  });

  addTableResponsiveLabels();
}

function normaliseAssistantMessageText() {
  const host = getById("assistantMessages");
  if (!host || HARDENING_STATE.assistantMutationBound) return;

  HARDENING_STATE.assistantMutationBound = true;

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
  if (!composer || HARDENING_STATE.composerMutationBound) return;

  HARDENING_STATE.composerMutationBound = true;

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

function improveStatusAnnouncements() {
  const statusBar = getById("statusBar");
  const statusMessage = getById("statusMessage");

  [statusBar, statusMessage].filter(Boolean).forEach((status) => {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  });
}

function addGlobalSearchShortcut() {
  const search = getById("recordSearchInput");

  document.addEventListener("keydown", (event) => {
    const isTyping =
      ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "");

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
    } catch (_) {}
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

function initPremiumHardening() {
  bindDialogFocusManagement();
  enhanceMobileNavigationState();
  observeDynamicTables();
  normaliseAssistantMessageText();
  improveComposerControls();
  improveStatusAnnouncements();
  addGlobalSearchShortcut();
  addSafeExternalLinkHandling();
  addLiveClockToShell();
  addPremiumReadyClass();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPremiumHardening, { once: true });
} else {
  initPremiumHardening();
}
