import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";

function getSummaryHost() {
  return (
    els.workspaceSummaryStrip ||
    els.workspaceSummary ||
    document.querySelector("[data-workspace-summary-strip]") ||
    document.querySelector("[data-workspace-summary]") ||
    document.getElementById("workspace-summary-strip") ||
    document.getElementById("workspace-summary")
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
    <div class="workspace-summary-strip-inner">
      <div class="workspace-summary-card">
        <div class="workspace-summary-label">Today</div>
        <div class="workspace-summary-value">${escapeHtml(summary.today)}</div>
      </div>
      <div class="workspace-summary-card">
        <div class="workspace-summary-label">Next event</div>
        <div class="workspace-summary-value">${escapeHtml(summary.nextEvent)}</div>
      </div>
      <div class="workspace-summary-card">
        <div class="workspace-summary-label">Last record</div>
        <div class="workspace-summary-value">${escapeHtml(summary.lastRecord)}</div>
      </div>
      <div class="workspace-summary-card">
        <div class="workspace-summary-label">Open actions</div>
        <div class="workspace-summary-value">${escapeHtml(summary.openActions)}</div>
      </div>
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

  host.innerHTML = "";
  host.classList.add("hidden");
}
