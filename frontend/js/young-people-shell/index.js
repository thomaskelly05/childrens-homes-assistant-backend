import { state } from "./state.js";
import { els } from "./dom.js";

import { getYoungPersonIdFromUrl, setYoungPersonIdInUrl } from "./core/utils.js";

import { loadCurrentView } from "./features/workspace.js";
import { bindRecordDrawerEvents, openRecordDetail } from "./ui/records.js";

import {
  loadYoungPersonSelector,
  openYoungPerson,
  goBackToSelector,
  filterSelectorList,
} from "./ui/selector.js";

import {
  renderDesktopNav,
  renderMobileNav,
  updateActiveNav,
  bindGlobalEvents as bindNavEvents,
} from "./ui/nav.js";

// ========================
// INIT
// ========================

async function init() {
  state.youngPersonId = getYoungPersonIdFromUrl();

  bindGlobalEvents();
  bindNavEvents();

  bindRecordDrawerEvents({
    onWorkflowComplete: refreshView,
  });

  renderDesktopNav();
  renderMobileNav();
  updateActiveNav();

  if (state.youngPersonId) {
    await openYoungPerson(state.youngPersonId);
    await loadCurrentView();
  } else {
    await loadYoungPersonSelector();
  }
}

// ========================
// GLOBAL EVENT DELEGATION
// ========================

function bindGlobalEvents() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("button, a");
    if (!target) return;

    if (target.dataset.openRecord) {
      try {
        const item = JSON.parse(target.dataset.openRecord);
        await openRecordDetail(item);
      } catch (err) {
        console.error("Invalid record payload", err);
      }
      return;
    }

    if (target.dataset.actionRouter) {
      const action = target.dataset.actionRouter;

      if (action === "back-to-selector") {
        goBackToSelector();
        return;
      }

      if (action.startsWith("edit-")) {
        console.log("Edit action:", action);
        return;
      }
    }

    if (target.dataset.youngPersonId) {
      const id = Number(target.dataset.youngPersonId);
      if (!id) return;

      setYoungPersonIdInUrl(id);
      state.youngPersonId = id;

      await openYoungPerson(id);
      await loadCurrentView();
      return;
    }
  });

  els.selectorSearchInput?.addEventListener("input", (e) => {
    filterSelectorList(e.target.value);
  });
}

// ========================
// REFRESH
// ========================

async function refreshView() {
  await loadCurrentView();
}

// ========================
// START
// ========================

init();
