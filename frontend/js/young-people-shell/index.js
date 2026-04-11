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

import { initNav } from "./ui/nav.js";

// ========================
// INIT
// ========================

async function init() {
  state.youngPersonId = getYoungPersonIdFromUrl();

  bindGlobalEvents();
  bindRecordDrawerEvents({
    onWorkflowComplete: refreshView,
  });

  initNav();

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

    // ========================
    // OPEN RECORD (drawer)
    // ========================
    if (target.dataset.openRecord) {
      try {
        const item = JSON.parse(target.dataset.openRecord);
        await openRecordDetail(item);
      } catch (err) {
        console.error("Invalid record payload", err);
      }
      return;
    }

    // ========================
    // ROUTER ACTIONS
    // ========================
    if (target.dataset.actionRouter) {
      const action = target.dataset.actionRouter;

      if (action === "back-to-selector") {
        goBackToSelector();
        return;
      }

      if (action.startsWith("edit-")) {
        console.log("Edit action:", action);
        // hook your edit forms here later
        return;
      }
    }

    // ========================
    // SELECT YOUNG PERSON
    // ========================
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

  // ========================
  // SEARCH FILTER
  // ========================
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
