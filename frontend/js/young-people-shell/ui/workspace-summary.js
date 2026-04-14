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
  };
}

function buildSummaryHtml(summary) {
  return `
    <div class="workspace-summary-item">
      <span class="workspace-summary-label">Today</span>
      <strong class="workspace-summary-value">${escapeHtml(summary.today)}</strong>
    </div>

    <div class="workspace-summary-item">
      <span class="workspace-summary-label">Next event</span>
      <strong class="workspace-summary-value">${escapeHtml(summary.nextEvent)}</strong>
    </div>

    <div class="workspace-summary-item">
      <span class="workspace-summary-label">Last record</span>
      <strong class="workspace-summary-value">${escapeHtml(summary.lastRecord)}</strong>
    </div>

    <div class="workspace-summary-item">
      <span class="workspace-summary-label">Open actions</span>
      <strong class="workspace-summary-value">${escapeHtml(summary.openActions)}</strong>
    </div>
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
    })
  );
}