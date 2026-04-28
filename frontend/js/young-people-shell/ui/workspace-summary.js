import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";

function getSummaryHost() {
  return (
    els.workspaceSummaryStrip ||
    document.getElementById("workspaceSummaryStrip") ||
    document.querySelector(".workspace-summary-strip")
  );
}

function getCurrentPersonName() {
  return (
    getDisplayName?.(state.selectedYoungPerson || {}) ||
    state.selectedYoungPerson?.preferred_name ||
    state.selectedYoungPerson?.first_name ||
    document.getElementById("personName")?.textContent?.trim() ||
    ""
  );
}

function normaliseSummary(summary = {}) {
  const personName = getCurrentPersonName();

  return {
    today: summary.today || (personName ? `${personName} selected` : "No summary available"),
    nextEvent: summary.nextEvent || "No upcoming appointments",
    lastRecord: summary.lastRecord || "No recent records",
    openActions: summary.openActions || "No open actions",
    pressure: summary.pressure || "No active alerts",
  };
}

function buildSummaryItem(label, value) {
  return `
    <details class="summary-drawer">
      <summary>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </summary>
    </details>
  `;
}

function buildSummaryHtml(summary) {
  return `
    ${buildSummaryItem("Today", summary.today)}
    ${buildSummaryItem("Next event", summary.nextEvent)}
    ${buildSummaryItem("Last record", summary.lastRecord)}
    ${buildSummaryItem("Open actions", summary.openActions)}
    ${buildSummaryItem("Visibility alerts", summary.pressure)}
  `;
}

export function updateWorkspaceSummaryStrip(summary = {}) {
  const host = getSummaryHost();
  if (!host) return;

  const safeSummary = normaliseSummary(summary);
  host.innerHTML = buildSummaryHtml(safeSummary);
  host.classList.remove("hidden");
  host.setAttribute("aria-hidden", "false");
}

export function resetWorkspaceSummaryStrip() {
  const host = getSummaryHost();
  if (!host) return;

  const personName = getCurrentPersonName();

  host.innerHTML = buildSummaryHtml(
    normaliseSummary({
      today: personName ? `${personName} selected` : "No summary yet",
      nextEvent: "No event loaded",
      lastRecord: "No record loaded",
      openActions: "No actions loaded",
      pressure: "No active alerts",
    })
  );

  host.classList.remove("hidden");
  host.setAttribute("aria-hidden", "false");
}
