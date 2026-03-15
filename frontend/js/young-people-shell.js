const state = {
  currentYoungPersonId: null,
  currentDailyNoteId: null,
  currentDailyNoteStatus: null,
  currentArchiveType: null
};

const els = {
  youngPersonSelector: document.getElementById("youngPersonSelector"),
  ypMiniSummary: document.getElementById("ypMiniSummary"),
  ypAlerts: document.getElementById("ypAlerts"),
  ypCompliance: document.getElementById("ypCompliance"),
  overviewContent: document.getElementById("overviewContent"),
  profileContent: document.getElementById("profileContent"),
  plansContent: document.getElementById("plansContent"),
  riskContent: document.getElementById("riskContent"),
  healthContent: document.getElementById("healthContent"),
  educationContent: document.getElementById("educationContent"),
  familyContent: document.getElementById("familyContent"),
  keyWorkContent: document.getElementById("keyWorkContent"),
  chronologyContent: document.getElementById("chronologyContent"),
  complianceContent: document.getElementById("complianceContent"),
  todayWorkflowPanel: document.getElementById("todayWorkflowPanel"),
  dailyNotesCurrentCard: document.getElementById("dailyNotesCurrentCard"),
  dailyNoteStatusPanel: document.getElementById("dailyNoteStatusPanel"),
  dailyNoteManagerComments: document.getElementById("dailyNoteManagerComments"),
  linkedRecordsSummary: document.getElementById("linkedRecordsSummary"),
  managerReviewSummary: document.getElementById("managerReviewSummary"),
  recentTimelineSummary: document.getElementById("recentTimelineSummary"),
  dailyNoteAiSuggestionsCard: document.getElementById("dailyNoteAiSuggestionsCard"),
  dailyNoteAiStatusBadge: document.getElementById("dailyNoteAiStatusBadge"),
  dailyNoteAiSummary: document.getElementById("dailyNoteAiSummary"),
  dailyNoteAiSuggestionsList: document.getElementById("dailyNoteAiSuggestionsList"),
  regenerateAiSuggestionsBtn: document.getElementById("regenerateAiSuggestionsBtn"),
  dailyNoteLinkedRecordsCard: document.getElementById("dailyNoteLinkedRecordsCard"),
  dailyNoteLinkedRecordsList: document.getElementById("dailyNoteLinkedRecordsList"),
  dailyNoteModal: document.getElementById("dailyNoteModal"),
  dailyNoteForm: document.getElementById("dailyNoteForm"),
  dailyNoteId: document.getElementById("dailyNoteId"),
  dnNoteDate: document.getElementById("dnNoteDate"),
  dnShiftType: document.getElementById("dnShiftType"),
  dnMood: document.getElementById("dnMood"),
  dnSignificance: document.getElementById("dnSignificance"),
  dnYoungPersonVoice: document.getElementById("dnYoungPersonVoice"),
  dnPresentation: document.getElementById("dnPresentation"),
  dnEducationUpdate: document.getElementById("dnEducationUpdate"),
  dnPositives: document.getElementById("dnPositives"),
  dnHealthUpdate: document.getElementById("dnHealthUpdate"),
  dnFamilyUpdate: document.getElementById("dnFamilyUpdate"),
  dnBehaviourUpdate: document.getElementById("dnBehaviourUpdate"),
  dnActivities: document.getElementById("dnActivities"),
  dnActionsRequired: document.getElementById("dnActionsRequired"),
  dnManagerReviewComment: document.getElementById("dnManagerReviewComment"),
  dnWorkflowStatus: document.getElementById("dnWorkflowStatus"),
  dailyNoteAiFeedback: document.getElementById("dailyNoteAiFeedback"),
  openDailyNoteModalBtn: document.getElementById("openDailyNoteModalBtn"),
  openDailyNotesArchiveBtn: document.getElementById("openDailyNotesArchiveBtn"),
  quickDailyNoteBtn: document.getElementById("quickDailyNoteBtn"),
  saveDraftDailyNoteBtn: document.getElementById("saveDraftDailyNoteBtn"),
  submitDailyNoteBtn: document.getElementById("submitDailyNoteBtn"),
  approveDailyNoteBtn: document.getElementById("approveDailyNoteBtn"),
  returnDailyNoteBtn: document.getElementById("returnDailyNoteBtn"),
  closeDailyNoteModalBtn: document.getElementById("closeDailyNoteModalBtn"),
  cancelDailyNoteBtn: document.getElementById("cancelDailyNoteBtn"),
  linkedDraftModal: document.getElementById("linkedDraftModal"),
  linkedDraftForm: document.getElementById("linkedDraftForm"),
  linkedDraftId: document.getElementById("linkedDraftId"),
  linkedDraftType: document.getElementById("linkedDraftType"),
  linkedDraftModalTitle: document.getElementById("linkedDraftModalTitle"),
  linkedDraftSourceInfo: document.getElementById("linkedDraftSourceInfo"),
  linkedDraftDynamicFields: document.getElementById("linkedDraftDynamicFields"),
  closeLinkedDraftModalBtn: document.getElementById("closeLinkedDraftModalBtn"),
  cancelLinkedDraftBtn: document.getElementById("cancelLinkedDraftBtn"),
  discardLinkedDraftBtn: document.getElementById("discardLinkedDraftBtn"),
  archiveDrawer: document.getElementById("archiveDrawer"),
  archiveDrawerTitle: document.getElementById("archiveDrawerTitle"),
  archiveSearchInput: document.getElementById("archiveSearchInput"),
  archiveDateFilter: document.getElementById("archiveDateFilter"),
  archiveMonthFilter: document.getElementById("archiveMonthFilter"),
  archiveYearFilter: document.getElementById("archiveYearFilter"),
  archiveResultsList: document.getElementById("archiveResultsList"),
  closeArchiveDrawerBtn: document.getElementById("closeArchiveDrawerBtn")
};

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "approved":
    case "saved":
    case "completed":
      return "badge success";
    case "submitted":
    case "review needed":
      return "badge warning";
    case "returned":
    case "critical":
      return "badge danger";
    default:
      return "badge muted";
  }
}

function getConfidenceLabel(score) {
  if (score == null) return "Unscored";
  if (score >= 0.85) return "High confidence";
  if (score >= 0.7) return "Medium confidence";
  return "Low confidence";
}

function formatArchiveType
