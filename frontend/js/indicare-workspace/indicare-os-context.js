import { apiGet } from "../young-people-shell/core/api.js";

const OS_CONTEXT_URL = "/api/os/context";
const OS_CONTEXT_STATE = {
  raw: null,
  normalised: null,
  lastLoadedAt: 0,
};

export function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.results)) return value.results;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.records)) return value.records;
  return [];
}

export function normaliseOsContext(payload = {}) {
  const source = payload || {};
  return {
    children: arrayFrom(source.children || source.items || source.young_people || source.youngPeople),
    documents: arrayFrom(source.documents || source.records || source.recordings),
    chronology: arrayFrom(source.chronology || source.timeline || source.events),
    safeguarding: arrayFrom(source.safeguarding || source.alerts || source.risks || source.concerns),
    homes: arrayFrom(source.homes || source.user_homes || source.authorised_homes),
    workforce: arrayFrom(source.workforce || source.staff || source.users || source.team),
    tasks: arrayFrom(source.tasks || source.actions || source.reminders || source.manager_actions),
    reports: arrayFrom(source.reports || source.inspection_reports || source.management_reports),
    raw: source,
  };
}

export async function loadOsContext({ force = false } = {}) {
  const cached = window.IndiCareLiveContext || OS_CONTEXT_STATE.raw;
  if (!force && cached) {
    const normalised = normaliseOsContext(cached);
    OS_CONTEXT_STATE.raw = cached;
    OS_CONTEXT_STATE.normalised = normalised;
    return normalised;
  }

  try {
    const payload = await apiGet(OS_CONTEXT_URL, { skipCache: true });
    const normalised = normaliseOsContext(payload || {});
    OS_CONTEXT_STATE.raw = payload || {};
    OS_CONTEXT_STATE.normalised = normalised;
    OS_CONTEXT_STATE.lastLoadedAt = Date.now();
    window.IndiCareLiveContext = normalised;
    return normalised;
  } catch {
    const normalised = normaliseOsContext(cached || {});
    OS_CONTEXT_STATE.raw = cached || {};
    OS_CONTEXT_STATE.normalised = normalised;
    return normalised;
  }
}

export function getOsContext() {
  const normalised = normaliseOsContext(window.IndiCareLiveContext || OS_CONTEXT_STATE.normalised || OS_CONTEXT_STATE.raw || {});
  OS_CONTEXT_STATE.normalised = normalised;
  return normalised;
}

export function getOperationalSession() {
  if (window.IndiCareOperationalSession) return window.IndiCareOperationalSession;
  try {
    return JSON.parse(localStorage.getItem("indicare.os.operational.session.v1") || "null") || null;
  } catch {
    return null;
  }
}

export function childKey(child = {}) {
  return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child));
}

export function childName(child = {}) {
  return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person";
}

export function recordKey(record = {}) {
  return String(record.id || record.record_id || record.document_id || record.uuid || record.source_id || "");
}

export function recordType(record = {}) {
  return String(record.record_type || record.type || record.category || "record").toLowerCase();
}

export function homeKey(home = {}) {
  return String(home.id || home.home_id || home.name || home.home_name || "home");
}

export function homeName(home = {}) {
  return home.name || home.home_name || home.title || "Selected home";
}

export function scopeContextToSession(context = getOsContext(), session = getOperationalSession()) {
  const selected = new Set((session?.selectedChildren || []).map(String));
  if (!selected.size) return context;

  const children = context.children.filter((child) => selected.has(childKey(child)));
  return scopeContextToChildren(context, children);
}

export function scopeContextToChild(context = getOsContext(), childOrId = null) {
  const id = typeof childOrId === "object" ? childKey(childOrId) : String(childOrId || "");
  const child = context.children.find((item) => childKey(item) === id || childName(item).toLowerCase() === id.toLowerCase());
  return scopeContextToChildren(context, child ? [child] : []);
}

export function scopeContextToChildren(context = getOsContext(), children = []) {
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => childName(child).toLowerCase()));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || "")) || names.has(String(item.childName || item.child_name || item.young_person_name || item.name || "").toLowerCase());

  return {
    ...context,
    children,
    documents: context.documents.filter(filterByChild),
    chronology: context.chronology.filter(filterByChild),
    safeguarding: context.safeguarding.filter(filterByChild),
    tasks: context.tasks.filter(filterByChild),
    reports: context.reports.filter(filterByChild),
  };
}

export function findChildForRecord(record = {}, children = getOsContext().children) {
  const childId = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || record.child || "");
  const name = String(record.childName || record.child_name || record.young_person_name || "").toLowerCase();
  return children.find((child) => childKey(child) === childId || childName(child).toLowerCase() === name) || null;
}

export function linkedItemsForRecord(record = {}, child = null, items = []) {
  const sourceRecordId = recordKey(record);
  const sourceChildId = child ? childKey(child) : String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || "");
  const sourceName = child ? childName(child).toLowerCase() : String(record.childName || record.child_name || record.young_person_name || "").toLowerCase();
  return arrayFrom(items).filter((item) => {
    const itemRecord = String(item.record_id || item.source_record_id || item.document_id || item.doc_id || "");
    const itemChild = String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || "");
    const itemName = String(item.childName || item.child_name || item.young_person_name || item.name || "").toLowerCase();
    return (sourceRecordId && itemRecord === sourceRecordId) || (sourceChildId && itemChild === sourceChildId) || (sourceName && itemName === sourceName);
  });
}

export function isHighPriority(item = {}) {
  return /high|critical|red|significant|escalated|overdue/i.test(`${item.severity || ""} ${item.risk_level || ""} ${item.status || ""} ${item.priority || ""}`);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

export function formatDate(value, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function displayType(type) {
  return String(type || "record").replaceAll("_", " ").replaceAll("-", " ");
}

export function statusClass(value) {
  return /high|critical|open|overdue|escalated|returned|rejected|submitted|pending|requires/i.test(String(value || "")) ? "submitted-for-review" : "approved";
}

export function statusBadge(value) {
  return `<span class="sp-status ${escapeHtml(statusClass(value))}">${escapeHtml(displayType(value || "recorded"))}</span>`;
}

window.IndiCareOSContext = {
  loadOsContext,
  getOsContext,
  normaliseOsContext,
  scopeContextToSession,
  scopeContextToChild,
  scopeContextToChildren,
  findChildForRecord,
  linkedItemsForRecord,
  childKey,
  childName,
  recordKey,
  recordType,
  homeKey,
  homeName,
};
