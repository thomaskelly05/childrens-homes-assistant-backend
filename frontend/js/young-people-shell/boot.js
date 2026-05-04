import { assertYoungPeopleShellContract } from "./contract.js";
import { state, initialiseStateGuards } from "./state.js";
import { setActiveTabButton, setStatus, showAssistantPanel, showRecordsPanel, updateTabCopy } from "./ui.js";

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

function setCurrentTab(tab = "daily") {
  const safeTab = TAB_COPY[tab] ? tab : "daily";
  state.currentSection = safeTab;
  state.activeSection = safeTab;
  setActiveTabButton(safeTab);
  updateTabCopy(safeTab, TAB_COPY);

  if (safeTab === "assistant") {
    showAssistantPanel();
    setStatus("Assistant ready.");
  } else {
    showRecordsPanel();
  }

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
  });
}

export function bootYoungPeopleShell() {
  if (!assertYoungPeopleShellContract({ warnOnly: true })) return false;
  initialiseStateGuards();
  state.youngPersonId = currentYoungPersonId();
  bindTabs();
  bindSelector();
  setCurrentTab(state.currentSection || "daily");
  setStatus(state.youngPersonId ? "Care Hub ready." : "Select a young person to begin.");
  return true;
}

window.IndiCareYoungPeopleBoot = Object.freeze({ bootYoungPeopleShell, setCurrentTab });
