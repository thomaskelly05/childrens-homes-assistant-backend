import { state } from "../state.js";
import { els } from "../dom.js";
import { NAV_SECTIONS } from "../core/config.js";
import { escapeHtml } from "../core/utils.js";
import { loadCurrentView } from "../features/workspace.js";
import {
  openYoungPerson,
  goBackToSelector,
  loadYoungPersonSelector,
  filterSelectorList,
} from "./selector.js";
import {
  updateAssistantScopeDataset,
  renderAssistantScopeBadges,
  updateYoungPersonHeader,
  renderHeroQuickActions,
  renderMobileBottomBar,
  updatePageHeader,
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
              <span class="nav-btn-icon">${escapeHtml(item.icon)}</span>
              <span class="nav-btn-label">${escapeHtml(item.label)}</span>
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
            <span class="nav-btn-icon">${escapeHtml(item.icon)}</span>
            <span class="nav-btn-label">${escapeHtml(item.label)}</span>
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
}

export function closeMobileNav() {
  state.mobileNavOpen = false;
  els.mobileNavDrawer?.classList.add("hidden");
  els.mobileNavBackdrop?.classList.add("hidden");
}

export function updateActiveNav() {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === state.currentView);
  });
}

async function handleViewChange(view) {
  if (!state.youngPersonId) return;

  setActiveView(view);
  closeMobileNav();
  await loadCurrentView();
}

function handleQuickAction(action) {
  if (action === "daily-note") {
    openComposerFor("daily_note", "create");
    return;
  }

  if (action === "incident") {
    openComposerFor("incident", "create");
    return;
  }

  if (action === "plan") {
    openComposerFor("support_plan", "create");
    return;
  }

  if (action === "profile") {
    setActiveView("profile");
    loadCurrentView();
  }
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
      await openYoungPerson(Number(openBtn.dataset.openYoungPerson));
      return;
    }

    const openRecordBtn = event.target.closest("[data-open-record]");
    if (openRecordBtn) {
      try {
        const item = JSON.parse(openRecordBtn.dataset.openRecord);
        await openRecordDetail(item);
      } catch (error) {
        console.error(error);
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
    } catch (error) {
      console.error(error);
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

  els.drawerSubmitBtn?.addEventListener("click", () => runDrawerWorkflow("submit"));
  els.drawerApproveBtn?.addEventListener("click", () => runDrawerWorkflow("approve"));
  els.drawerReturnBtn?.addEventListener("click", () => runDrawerWorkflow("return"));
  els.drawerArchiveBtn?.addEventListener("click", () => runDrawerWorkflow("archive"));

  els.closeComposerBtn?.addEventListener("click", () => closeComposer());
  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    await saveComposer("draft");
  });
  els.composerSubmitBtn?.addEventListener("click", async () => {
    await saveComposer("submit");
  });

  els.composerCheckBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
  });

  els.composerGrammarBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("grammar");
    }
  });

  els.composerClarityBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
  });

  els.composerSafeguardingBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("safeguarding");
    }
  });

  els.composerChildVoiceBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("child_voice");
    }
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
