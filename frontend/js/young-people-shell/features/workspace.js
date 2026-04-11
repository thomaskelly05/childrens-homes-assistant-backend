import { state } from "../state.js";
import { els } from "../dom.js";
import { VIEW_CONFIG } from "../core/config.js";
import { updatePageHeader, renderAssistantScopeBadges } from "../ui/header.js";
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
import { loadCalendar } from "./calendar.js";

const VIEW_LOADERS = {
  overview: loadOverview,
  profile: loadProfile,
  timeline: loadTimeline,
  handover: loadHandover,
  reports: loadReports,
  health: loadHealth,
  education: loadEducation,
  family: loadFamily,
  calendar: loadCalendar,
};

function renderUnknownView() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>That section is not available yet.</p>
    </div>
  `;
}

function renderViewError(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
    </div>
  `;
}

export async function loadCurrentView() {
  updatePageHeader();
  updateActiveNav();
  updateAssistantContext();
  renderAssistantScopeBadges();

  const currentView = state.currentView || "overview";
  const config = VIEW_CONFIG[currentView];
  const loader = VIEW_LOADERS[currentView];

  if (!config || !loader) {
    renderUnknownView();
    return;
  }

  try {
    await loader();
  } catch (error) {
    console.error(`Failed to load view: ${currentView}`, error);
    renderViewError(error?.message || "Unable to load this section.");
  }
}
