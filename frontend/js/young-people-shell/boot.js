import { bindAssistant } from "./assistant.js";
import { bindComposer } from "./composer.js";
import { assertYoungPeopleShellContract } from "./contract.js";
import { loadTabData } from "./data-loader.js";
import { state, initialiseStateGuards } from "./state.js";
import {
  renderError,
  renderLoading,
  renderRecords,
  setActiveTabButton,
  setStatus,
  showAssistantPanel,
  showRecordsPanel,
  updateTabCopy,
} from "./ui.js";

const TAB_COPY = Object.freeze({
  daily: { title: "Daily notes", subtitle: "Load and record daily life information for this young person." },
  health: { title: "Health", subtitle: "Health, wellbeing and medical updates." },
  education: { title: "Education", subtitle: "Education, learning, attendance and progress." },
  family: { title: "Family", subtitle: "Family time, relationships and important contact." },
  incidents: { title: "Incidents", subtitle: "Important events, responses and follow-up." },
  medication: { title: "Medication", subtitle: "Medication profiles and medication records from the health bundle." },
  assistant: { title: "Assistant", subtitle: "Ask IndiCare about this young person." },
});

function currentYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("young_person_id") || params.get("youngPersonId") || params.get("id") || document.body?.dataset?.youngPersonId || null;
}

function recordsForTab(tab) {
  if (tab === "daily") return state.dailyRecords || [];
  if (tab === "health") return state.healthRecords || [];
  if (tab === "education") return state.educationRecords || [];
  if (tab === "family") return state.familyRecords || [];
  if (tab === "incidents") return state.incidentRecords || [];
  if (tab === "medication") return [...(state.medicationProfiles || []), ...(state.medicationRecords || [])];
  return [];
}

async function loadCurrentTab(tab = state.currentSection || "daily") {
  if (tab === "assistant") {
    showAssistantPanel();
    setStatus("Assistant ready.");
    return true;
  }

  if (!state.youngPersonId) {
    setStatus("Select a young person to begin.");
    return false;
  }

  showRecordsPanel();
  renderLoading();
  setStatus("Loading...");

  try {
    await loadTabData(tab, state.youngPersonId);
    renderRecords(recordsForTab(tab), tab);
    setStatus("Loaded.");
    return true;
  } catch (error) {
    renderError(error);
    setStatus("Could not load this area.");
    return false;
  }
}

async function setCurrentTab(tab = "daily") {
  const safeTab = TAB_COPY[tab] ? tab : "daily";
  state.currentSection = safeTab;
  state.activeSection = safeTab;
  setActiveTabButton(safeTab);
  updateTabCopy(safeTab, TAB_COPY);
  await loadCurrentTab(safeTab);
  return safeTab;
}

function bindTabs() {
  document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
    button.addEventListener("click", () => setCurrentTab(button.dataset.tab || "daily"));
  });
}

function bindSelector() {
  const selector = document.getElementById("ypSelector");
  if (!selector) return;
  selector.addEventListener("change", () => {
    const id = selector.value || null;
    state.youngPersonId = id;
    if (id) document.body.dataset.youngPersonId = id;
    loadCurrentTab(state.currentSection || "daily");
  });
}

export async function bootYoungPeopleShell() {
  if (!assertYoungPeopleShellContract({ warnOnly: true })) return false;
  initialiseStateGuards();
  state.youngPersonId = currentYoungPersonId();
  bindTabs();
  bindSelector();
  bindAssistant();
  bindComposer();
  await setCurrentTab(state.currentSection || "daily");
  if (!state.youngPersonId) setStatus("Select a young person to begin.");
  return true;
}

window.IndiCareYoungPeopleBoot = Object.freeze({ bootYoungPeopleShell, setCurrentTab, loadCurrentTab });
