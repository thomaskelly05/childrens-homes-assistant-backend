import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normaliseStatus(value = "") {
  return String(value || "").toLowerCase().trim().replaceAll(" ", "_");
}

function getStatusTone(status = "") {
  const normalised = normaliseStatus(status);

  if (
    [
      "overdue",
      "high",
      "critical",
      "expired",
      "missing",
      "non_compliant",
      "failed",
      "at_risk",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "review_due",
      "attention",
      "incomplete",
      "pending",
      "expiring",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "complete",
      "completed",
      "ok",
      "good",
      "passed",
      "compliant",
      "booked",
      "up_to_date",
      "current",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function hasUsableData(data = {}) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.staff) && data.staff.length > 0) return true;
  if (Array.isArray(data.team) && data.team.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.training) && data.training.length > 0) return true;
  if (Array.isArray(data.staff_training_records) && data.staff_training_records.length > 0) return true;
  if (Array.isArray(data.supervisions) && data.supervisions.length > 0) return true;
  if (Array.isArray(data.staff_supervisions) && data.staff_supervisions.length > 0) return true;
  if (Array.isArray(data.staff_supervision_sessions) && data.staff_supervision_sessions.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.staff_documents) && data.staff_documents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.notifications) && data.notifications.length > 0) return true;
  if (Array.isArray(data.onboarding) && data.onboarding.length > 0) return true;
  if (Array.isArray(data.staff_onboarding_profiles) && data.staff_onboarding_profiles.length > 0) return true;
  if (Array.isArray(data.staff_onboarding_tasks) && data.staff_onboarding_tasks.length > 0) return true;
  if (Array.isArray(data.checklist) && data.checklist.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.staff_summary && typeof data.staff_summary === "object") return true;
  return false;
}

function normaliseStaffSummary(data = {}) {
  return data.summary || data.staff_summary || data.dashboard || data || {};
}

function normaliseStaffItems(data = {}) {
  return toArray(data.items, [data.staff, data.team, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "staff_profile",
    full_name:
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      item.staff_member ||
      "Staff member",
    staff_member:
      item.staff_member ||
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Staff member",
    role: item.role || item.job_role || "",
    line_manager:
      item.line_manager ||
      item.line_manager_name ||
      "",
    employment_status:
      item.employment_status ||
      item.status ||
      "active",
    start_date:
      item.start_date ||
      item.employment_start_date ||
      null,
    summary:
      item.summary ||
      item.notes ||
      item.role ||
      "Staff profile record.",
    status: item.status || item.employment_status || "active",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [
    data.training,
    data.staff_training_records,
    data.staff_training_matrix,
    data.records,
  ]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "training",
    staff_member:
      item.staff_member ||
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Staff member",
    training_name:
      item.training_name ||
      item.course_name ||
      item.title ||
      "Training",
    expiry_date:
      item.expiry_date ||
      item.expires_on ||
      null,
    summary:
      item.summary ||
      item.notes ||
      `${item.course_name || item.training_name || "Training"} record.`,
    status: item.status || "recorded",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [
    data.supervisions,
    data.staff_supervisions,
    data.staff_supervision_sessions,
    data.records,
  ]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "supervision",
    staff_member:
      item.staff_member ||
      item.full_name ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Staff member",
    supervisor:
      item.supervisor ||
      item.supervisor_name ||
      "",
    next_due_date:
      item.next_due_date ||
      item.next_supervision_date ||
      item