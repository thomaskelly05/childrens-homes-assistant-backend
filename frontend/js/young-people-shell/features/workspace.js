import { state } from "../state.js";
import { els } from "../dom.js";
import { VIEW_CONFIG } from "../core/config.js";
import { escapeHtml } from "../core/utils.js";
import { updatePageHeader, renderAssistantScopeBadges, renderMobileTabState } from "../ui/header.js";
import { updateActiveNav } from "../ui/nav.js";
import { updateAssistantContext } from "../ui/assistant-ui.js";

import { loadOverview } from "./overview.js";
import { loadProfile } from "./profile.js";
import { loadTimeline } from "./timeline.js";
import { loadHandover } from "./handover.js";
import { loadReports } from "./reports.js";
import { loadHealth } from "./health.js";
import { loadEducation } from "./education.js";
import { loadFamily } from "./family.js";
import { loadCompliance } from "./compliance.js";
import { loadManager } from "./manager.js";

import { loadRecordList } from "../ui/records.js";

function setViewLoading(message = "Loading...") {
  if (!els.viewContent) return;
  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function setViewEmpty(message = "Nothing to show yet.") {
  if (!els.viewContent) return;
  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

const VIEW_LOADERS = {
  overview: loadOverview,
  profile: loadProfile,
  daily_notes: () => loadRecordList(`/young-people/${state.youngPersonId}/daily-notes`, "Daily notes"),
  incidents: () => loadRecordList(`/young-people/${state.youngPersonId}/incidents`, "Important events"),
  plans: () => loadRecordList(`/young-people/${state.youngPersonId}/plans`, "Support plans"),
  appointments: () => loadRecordList(`/young-people/${state.youngPersonId}/appointments`, "Appointments"),
  keywork: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork"),
  timeline: loadTimeline,
  handover: loadHandover,
  reports: loadReports,
  health: loadHealth,
  education: loadEducation,
  family: loadFamily,
  compliance: loadCompliance,
  calendar: () => loadRecordList(`/young-people/${state.youngPersonId}/appointments`, "Calendar"),
  manager: loadManager,
};

export async function loadCurrentView() {
  updatePageHeader();
  updateActiveNav();
  updateAssistantContext();
  renderAssistantScopeBadges();
  renderMobileTabState();

  const config = VIEW_CONFIG[state.currentView];
  const loader = VIEW_LOADERS[state.currentView];

  if (!config || !loader) {
    setViewEmpty("Unknown view.");
    return;
  }

  try {
    setViewLoading(`Loading ${config.title.toLowerCase()}...`);
    await loader();
  } catch (error) {
    console.error(error);
    setViewEmpty(error.message || "Unable to load this view.");
  }
}
