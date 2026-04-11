import { state } from "../state.js";
import { els } from "../dom.js";
import { NAV_SECTIONS } from "../core/config.js";
import { escapeHtml } from "../core/utils.js";
import { loadCurrentView } from "../features/workspace.js";
import { openYoungPerson, goBackToSelector, loadYoungPersonSelector, filterSelectorList } from "./selector.js";
import {
  updatePageHeader,
  renderAssistantScopeBadges,
  renderMobileTabState,
} from "./header.js";
import {
  updateAssistantContext,
  askAssistant,
  renderAssistantMessages,
  openAssistant,
  closeAssistant,
} from "./assistant-ui.js";
import {
  openComposerFor,
  closeComposer,
  saveComposer,
  buildAiFeedback,
} from "./composer.js";
import {
  closeDrawer,
  openRecordDetail,
  runDrawerWorkflow,
} from "./records.js";

function showStatus(message, type = "info") {
  if (!els.statusBar) return;
  els.statusBar.textContent = message || "";
  els.statusBar.classList.remove("hidden");
  els.statusBar.dataset.statusType = type;
}

function showError(message) {
  showStatus(message || "Something went wrong.", "error");
}

function showMessage(message) {
  showStatus(message || "", "info");
}

export function clearStatus() {
  if (!els.statusBar) return;
  els.statusBar.textContent = "";
  els.statusBar.classList.add("hidden");
  delete els.statusBar.dataset.statusType;
}

export function setActiveView(view) {
  state.currentView = view || "overview";
  updatePageHeader();
  updateActiveNav();
  renderMobileTabState();
  renderAssistantScopeBadges();
  updateAssistantContext();
}

export function renderDesktopNav() {
  if (!els.desktopNav) return;

  els.desktopNav.innerHTML = `
    <div class="workspace-nav-inner">
      ${NAV_SECTIONS.map((section) => `
        <div class="nav-section">
          <div class="nav-section-title">${escapeHtml(section.title)}</div>
          ${section.items.map((item) => `
            <button
              class="nav-btn ${state.currentView === item.key ? "active" : ""}"
              type="button"
              data-view="${escapeHtml(item.key)}"
            >
              ${escapeHtml(item.icon)} ${escapeHtml(item.label)}
            </button>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

export function renderMobileNav() {
  if (!els.mobileNavContent) return;

  els.mobileNavContent.innerHTML = `
    ${NAV_SECTIONS.map((section) => `
      <div class="nav-section">
        <div class="nav-section-title">${escapeHtml(section.title)}</div>
        ${section.items.map((item) => `
          <button
            class="nav-btn ${state.currentView === item.key ? "active" : ""}"
            type="button"
            data-view="${escapeHtml(item.key)}"
          >
            ${escapeHtml(item.icon)} ${escapeHtml(item.label)}
          </button>
        `).join("")}
      </div>
    `).join("")}
  `;
}

export function openMobileNav() {
  state.mobileNavOpen = true;
  els.mobileNavDrawer?.classList.remove("hidden");
  els.mobileNavBackdrop?.classList.remove("hidden");
  els.mobileNavDrawer?.setAttribute("aria-hidden", "false");
}

export function closeMobileNav() {
  state.mobileNavOpen = false;
  els.mobileNavDrawer?.classList.add("hidden");
  els.mobileNavBackdrop?.classList.add("hidden");
  els.mobileNavDrawer?.setAttribute("aria-hidden", "true");
}

export function updateActiveNav() {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });
}

async function handleViewChange(view) {
  if (!state.youngPersonId) {
    showError("Select a young person first.");
    return;
  }

  setActiveView(view);
  closeMobileNav();
  clearStatus();

  try {
    await loadCurrentView();
  } catch (error) {
    console.error(error);
    showError(error?.message || "Failed to load this section.");
  }
}

function handleQuickAction(action) {
  if (action === "daily-note") openComposerFor("daily_note", "create");
  if (action === "incident") openComposerFor("incident", "create");
  if (action === "risk") openComposerFor("risk", "create");
  if (action === "plan") openComposerFor("support_plan", "create");
}

function handleAssistantQuick(action) {
  const prompts = {
    handover: "Draft a handover for the next shift for this young person.",
    priorities: "Summarise what matters most right now.",
  };

  askAssistant(prompts[action] || "Summarise what matters most right now.");
}

export function bindGlobalEvents() {
  document.addEventListener("click", async (event) => {
    const navBtn = event.target.closest("[data-view]");
    if (navBtn) {
      await handleViewChange(navBtn.dataset.view);
      return;
    }

    const mobileBtn = event.target.closest("[data-mobile-view]");
    if (mobileBtn) {
      const key = mobileBtn.dataset.mobileView;

      if (key === "assistant") {
        openAssistant();
        return;
      }

      await handleViewChange(key);
      return;
    }

    const openBtn = event.target.closest("[data-open-young-person]");
    if (openBtn) {
      try {
        await openYoungPerson(Number(openBtn.dataset.openYoungPerson));
      } catch (error) {
        console.error(error);
        showError(error?.message || "Unable to open workspace.");
      }
      return;
    }

    const openRecordBtn = event.target.closest("[data-open-record]");
    if (openRecordBtn) {
      try {
        const item = JSON.parse(openRecordBtn.dataset.openRecord);
        await openRecordDetail(item);
      } catch (error) {
        console.error(error);
        showError("Could not open record.");
      }
      return;
    }

    const quickBtn = event.target.closest("[data-action]");
    if (quickBtn) {
      handleQuickAction(quickBtn.dataset.action);
      return;
    }

    const assistantQuickBtn = event.target.closest("[data-assistant-quick]");
    if (assistantQuickBtn) {
      handleAssistantQuick(assistantQuickBtn.dataset.assistantQuick);
      return;
    }

    const assistantChip = event.target.closest("[data-assistant-chip]");
    if (assistantChip) {
      const text = assistantChip.dataset.assistantChip || "";
      if (els.assistantInput) els.assistantInput.value = text;
      if (els.assistantModalInput) els.assistantModalInput.value = text;
      return;
    }

    const suggestionBtn = event.target.closest("[data-prompt]");
    if (suggestionBtn) {
      askAssistant(suggestionBtn.dataset.prompt || "");
      return;
    }
  });

  els.selectorSearch?.addEventListener("input", filterSelectorList);
  els.selectorRefreshBtn?.addEventListener("click", loadYoungPersonSelector);

  els.refreshBtn?.addEventListener("click", async () => {
    if (!state.youngPersonId) {
      await loadYoungPersonSelector();
      return;
    }

    try {
      await openYoungPerson(Number(state.youngPersonId), { preserveView: true });
      showMessage("Workspace refreshed.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Failed to refresh workspace.");
    }
  });

  els.homeBtn?.addEventListener("click", goBackToSelector);
  els.mobileHomeBtn?.addEventListener("click", goBackToSelector);
  els.logoBtn?.addEventListener("click", goBackToSelector);
  els.changePersonBtn?.addEventListener("click", goBackToSelector);

  els.mobileNavBtn?.addEventListener("click", openMobileNav);
  els.closeMobileNavBtn?.addEventListener("click", closeMobileNav);
  els.mobileNavBackdrop?.addEventListener("click", closeMobileNav);

  els.closeDrawerBtn?.addEventListener("click", closeDrawer);
  els.drawerBackdrop?.addEventListener("click", closeDrawer);

  els.drawerEditBtn?.addEventListener("click", () => {
    if (!state.activeRecordItem || !state.activeRecordType) return;
    openComposerFor(state.activeRecordType, "edit", state.activeRecordItem);
  });

  els.drawerSubmitBtn?.addEventListener("click", async () => {
    try {
      await runDrawerWorkflow("submit");
      closeDrawer();
      await loadCurrentView();
      showMessage("Record sent for review.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Unable to submit record.");
    }
  });

  els.drawerApproveBtn?.addEventListener("click", async () => {
    try {
      await runDrawerWorkflow("approve");
      closeDrawer();
      await loadCurrentView();
      showMessage("Record approved.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Unable to approve record.");
    }
  });

  els.drawerReturnBtn?.addEventListener("click", async () => {
    try {
      await runDrawerWorkflow("return");
      closeDrawer();
      await loadCurrentView();
      showMessage("Record returned.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Unable to return record.");
    }
  });

  els.drawerArchiveBtn?.addEventListener("click", async () => {
    try {
      await runDrawerWorkflow("archive");
      closeDrawer();
      await loadCurrentView();
      showMessage("Record archived.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Unable to archive record.");
    }
  });

  els.closeComposerBtn?.addEventListener("click", () => closeComposer());
  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("draft");
      showMessage("Draft saved.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Could not save draft.");
    }
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    try {
      await saveComposer("submit");
      showMessage("Record sent for review.");
    } catch (error) {
      console.error(error);
      showError(error?.message || "Could not submit record.");
    }
  });

  els.composerCheckBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
  });

  els.composerGrammarBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("grammar");
  });

  els.composerClarityBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("clarity");
  });

  els.composerSafeguardingBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("safeguarding");
  });

  els.composerChildVoiceBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) els.composerAiFeedback.textContent = buildAiFeedback("child_voice");
  });

  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.assistantExpandBtn?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    state.assistantMessages = [];
    state.assistantModalMessages = [];
    renderAssistantMessages();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) els.assistantInput.value = "";
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) els.assistantModalInput.value = "";
    await askAssistant(question);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeAssistant();
      closeComposer(false);
      closeMobileNav();
    }
  });
}
