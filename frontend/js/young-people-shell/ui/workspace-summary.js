import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";

function getSummaryHost() {
  return (
    els.workspaceSummaryStrip ||
    document.getElementById("workspaceSummaryStrip") ||
    document.querySelector(".workspace-summary-strip")
  );
}

function normaliseSummary(summary = {}) {
  return {
    today: summary.today || "No summary available",
    nextEvent: summary.nextEvent || "No upcoming appointments",
    lastRecord: summary.lastRecord || "No recent records",
    openActions: summary.openActions || "No open actions",
    pressure: summary.pressure || "No active alerts",
  };
}

function buildSummaryItem(label, value) {
  return `
    <div class="workspace-summary-item">
      <span class="workspace-summary-label">${escapeHtml(label)}</span>
      <strong class="workspace-summary-value">${escapeHtml(value)}</strong>
    </div>
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
}

export function resetWorkspaceSummaryStrip() {
  const host = getSummaryHost();
  if (!host) return;

  host.innerHTML = buildSummaryHtml(
    normaliseSummary({
      today: "No summary yet",
      nextEvent: "No event loaded",
      lastRecord: "No record loaded",
      openActions: "No actions loaded",
      pressure: "No active alerts",
    })
  );

  host.classList.remove("hidden");
}
