import { bindAssistant } from "./assistant.js";
import { bindComposer } from "./composer.js";
import { assertYoungPeopleShellContract } from "./contract.js";
import { loadTabData, loadYoungPeople } from "./data-loader.js";
import { state, initialiseStateGuards } from "./state.js";
import {
  bindErrorRetry,
  escapeHtml,
  renderError,
  renderLoading,
  renderRecords,
  setActiveTabButton,
  setStatus,
  setText,
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

function normaliseId(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "null" || raw === "undefined") return null;
  return raw;
}

function currentYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  return normaliseId(params.get("young_person_id") || params.get("youngPersonId") || params.get("id") || document.body?.dataset?.youngPersonId || null);
}

function youngPersonName(person) {
  const first = person?.first_name || person?.firstName || "";
  const last = person?.last_name || person?.lastName || "";
  const combined = `${first} ${last}`.trim();
  return person?.name || person?.full_name || person?.display_name || combined || `Young person ${person?.id ?? ""}`.trim();
}

function setYoungPersonId(id) {
  const youngPersonId = normaliseId(id);
  state.youngPersonId = youngPersonId;

  if (youngPersonId) {
    document.body.dataset.youngPersonId = youngPersonId;
    const shell = document.getElementById("ypShell");
    if (shell) shell.dataset.youngPersonId = youngPersonId;
  }

  return youngPersonId;
}

function updateSelectedPersonText(youngPersonId) {
  const selected = (state.youngPeople || []).find((person) => String(person?.id || person?.young_person_id) === String(youngPersonId));
  setText("ypPersonName", selected ? youngPersonName(selected) : youngPersonId ? `Young person ${youngPersonId}` : "Young People Care Hub");
  setText("ypPersonMeta", youngPersonId ? "Care Hub open" : "Select a young person to begin.");
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

async function populateYoungPeopleSelector() {
  const selector = document.getElementById("ypSelector");
  if (!selector) return;

  selector.disabled = true;
  selector.innerHTML = '<option value="">Loading young people...</option>';

  try {
    const people = await loadYoungPeople();
    if (!people.length) {
      selector.innerHTML = '<option value="">No young people found</option>';
      setYoungPersonId(null);
      updateSelectedPersonText(null);
      return;
    }

    selector.innerHTML = people
      .map((person) => {
        const id = normaliseId(person?.id || person?.young_person_id);
        if (!id) return "";
        return `<option value="${escapeHtml(id)}">${escapeHtml(youngPersonName(person))}</option>`;
      })
      .join("");

    const requestedId = currentYoungPersonId();
    const firstId = normaliseId(people[0]?.id || people[0]?.young_person_id);
    const selectedId = requestedId || firstId;
    setYoungPersonId(selectedId);
    selector.value = selectedId || "";
    updateSelectedPersonText(selectedId);
  } catch (error) {
    console.error("[young-people-shell/boot] selector load failed", error);
    selector.innerHTML = '<option value="">Current young person</option>';
    setYoungPersonId(currentYoungPersonId());
    updateSelectedPersonText(state.youngPersonId);
  } finally {
    selector.disabled = false;
  }
}

async function loadCurrentTab(tab = state.currentSection || "daily", options = {}) {
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
  renderLoading(options.force ? "Retrying and getting the latest information." : "Getting the latest information.");
  setStatus(options.force ? "Retrying..." : "Loading...");

  try {
    await loadTabData(tab, state.youngPersonId, options);
    renderRecords(recordsForTab(tab), tab);
    setStatus("Loaded.");
    return true;
  } catch (error) {
    renderError(error);
    bindErrorRetry(() => loadCurrentTab(tab, { force: true }));
    setStatus("Could not load this area.");
    return false;
  }
}

async function setCurrentTab(tab = "daily", options = {}) {
  const safeTab = TAB_COPY[tab] ? tab : "daily";
  state.currentSection = safeTab;
  state.activeSection = safeTab;
  setActiveTabButton(safeTab);
  updateTabCopy(safeTab, TAB_COPY);
  await loadCurrentTab(safeTab, options);
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
    const id = setYoungPersonId(selector.value);
    updateSelectedPersonText(id);
    loadCurrentTab(state.currentSection || "daily", { force: true });
  });
}

export async function bootYoungPeopleShell() {
  if (!assertYoungPeopleShellContract({ warnOnly: true })) return false;
  initialiseStateGuards();
  bindTabs();
  bindSelector();
  bindAssistant();
  bindComposer();
  await populateYoungPeopleSelector();
  await setCurrentTab(state.currentSection || "daily");
  if (!state.youngPersonId) setStatus("Select a young person to begin.");
  return true;
}

window.IndiCareYoungPeopleBoot = Object.freeze({ bootYoungPeopleShell, setCurrentTab, loadCurrentTab });
