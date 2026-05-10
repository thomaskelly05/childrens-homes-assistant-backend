export const REQUIRED_IDS = Object.freeze([
  "ypShell",
  "ypHeader",
  "ypSelector",
  "ypStatus",
  "ypTabs",
  "ypContent",
  "ypRecordsPanel",
  "ypRecordsTitle",
  "ypRecordsSubtitle",
  "ypRecordsList",
  "ypAssistantPanel",
  "ypAssistantTitle",
  "ypAssistantMessages",
  "ypAssistantInput",
  "ypAssistantSend",
  "ypAssistantStatus",
  "ypComposer",
  "ypComposerBackdrop",
  "ypComposerDialog",
  "ypComposerTitle",
  "ypComposerSubtitle",
  "ypComposerClose",
  "ypComposerForm",
  "ypComposerFields",
  "ypComposerSaveDraft",
  "ypComposerSubmit",
  "ypComposerStatus",
]);

export function missingRequiredIds(root = document) {
  return REQUIRED_IDS.filter((id) => !root.getElementById(id));
}

export function assertYoungPeopleShellContract({ warnOnly = true } = {}) {
  const missing = missingRequiredIds(document);
  if (!missing.length) return true;

  const message = `[young-people-shell] Missing required DOM ids: ${missing.join(", ")}`;

  if (warnOnly) {
    console.error(message);
    const status = document.getElementById("ypStatus");
    if (status) status.textContent = "Care Hub layout is incomplete. Please refresh or contact support.";
    return false;
  }

  throw new Error(message);
}

window.IndiCareYoungPeopleContract = Object.freeze({
  REQUIRED_IDS,
  missingRequiredIds,
  assertYoungPeopleShellContract,
});
