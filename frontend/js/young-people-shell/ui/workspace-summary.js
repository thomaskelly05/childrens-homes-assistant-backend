import { els } from "../dom.js";

export function updateWorkspaceSummaryStrip({
  today = "Live overview",
  nextEvent = "No event loaded",
  lastRecord = "No record loaded",
  openActions = "No actions loaded",
} = {}) {
  if (els.summaryToday) {
    els.summaryToday.textContent = today;
  }

  if (els.summaryNextEvent) {
    els.summaryNextEvent.textContent = nextEvent;
  }

  if (els.summaryLastRecord) {
    els.summaryLastRecord.textContent = lastRecord;
  }

  if (els.summaryOpenActions) {
    els.summaryOpenActions.textContent = openActions;
  }
}

export function resetWorkspaceSummaryStrip() {
  updateWorkspaceSummaryStrip({
    today: "No summary yet",
    nextEvent: "No event loaded",
    lastRecord: "No record loaded",
    openActions: "No actions loaded",
  });
}