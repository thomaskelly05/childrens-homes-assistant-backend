import { state } from "../state.js";
import { updateWorkspaceSummaryStrip } from "./workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getPersonName() {
  const p = state.selectedYoungPerson || {};
  return (
    p.preferred_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    "Young person"
  );
}

function buildChildSummary() {
  const name = getPersonName();

  return {
    today: `${name} • Live overview`,
    nextEvent: "No upcoming appointments",
    lastRecord: "No recent records",
    openActions: "No open actions",
  };
}

function buildHomeSummary() {
  return {
    today: "Home • Live operational view",
    nextEvent: "No upcoming home events",
    lastRecord: "No recent home updates",
    openActions: "No open actions across home",
  };
}

function buildQualitySummary() {
  return {
    today: "Quality • Oversight and trends",
    nextEvent: "No inspections or audits scheduled",
    lastRecord: "No recent quality updates",
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

  updateWorkspaceSummaryStrip(buildChildSummary());
}