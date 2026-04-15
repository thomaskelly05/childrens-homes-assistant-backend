import { state } from "../state.js";
import { updateWorkspaceSummaryStrip } from "./workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getSelectedYoungPerson() {
  return state.selectedYoungPerson || null;
}

function getActiveSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function humaniseSection(section = "") {
  return String(section || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function getPersonName() {
  const person = getSelectedYoungPerson() || {};

  return (
    person.preferred_name ||
    person.full_name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.name ||
    "Young person"
  );
}

function getHomeName() {
  const person = getSelectedYoungPerson() || {};

  return (
    person.home_name ||
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

function hasYoungPersonContext() {
  return Boolean(state.youngPersonId && getSelectedYoungPerson());
}

function buildNoSelectionSummary() {
  return {
    today: "No young person selected",
    nextEvent: "Select a young person to load appointments and events",
    lastRecord: "No child context loaded",
    openActions: "No actions loaded",
  };
}

function buildChildSummary() {
  const name = getPersonName();
  const homeName = getHomeName();
  const activeSection = getActiveSection();

  return {
    today: `${name} • ${homeName}`,
    nextEvent: "No upcoming appointments",
    lastRecord: `Viewing ${humaniseSection(activeSection)}`,
    openActions: "No open actions",
  };
}

function buildHomeSummary() {
  const homeName = getHomeName();
  const activeSection = getActiveSection();

  return {
    today: `${homeName} • Live operational view`,
    nextEvent: "No upcoming home events",
    lastRecord: `Viewing ${humaniseSection(activeSection)}`,
    openActions: "No open actions across home",
  };
}

function buildQualitySummary() {
  const homeName = getHomeName();
  const activeSection = getActiveSection();

  return {
    today: `${homeName} • Quality oversight`,
    nextEvent: "No inspections or audits scheduled",
    lastRecord: `Viewing ${humaniseSection(activeSection)}`,
    openActions: "No compliance actions due",
  };
}

export function refreshWorkspaceSummary() {
  const scope = getCurrentScope();

  if (scope === "home") {
    updateWorkspaceSummaryStrip(buildHomeSummary());
    return;
  }

  if (scope === "quality") {
    updateWorkspaceSummaryStrip(buildQualitySummary());
    return;
  }

  if (!hasYoungPersonContext()) {
    updateWorkspaceSummaryStrip(buildNoSelectionSummary());
    return;
  }

  updateWorkspaceSummaryStrip(buildChildSummary());
}
