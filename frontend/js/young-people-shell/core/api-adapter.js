import { apiSend } from "./api.js";
import { normaliseRecordType } from "./contracts.js";
import {
  getRecordContract,
  getRecordContractBySection,
  getRecordRoute,
  getRecordLabel,
} from "./record-contracts.js";
import { normaliseRecord, normaliseRecords } from "./record-normaliser.js";

const FALLBACK_RECORD_ROUTES = Object.freeze({
  support_plan: "/young-people/:youngPersonId/plans",
  risk: "/young-people/:youngPersonId/plans",

  appointment: "/young-people/:youngPersonId/appointments",
  chronology_event: "/young-people/:youngPersonId/timeline",
  timeline: "/young-people/:youngPersonId/timeline",
  daily_note: "/young-people/:youngPersonId/daily-notes",
  incident: "/young-people/:youngPersonId/incidents",

  safeguarding_record: "/young-people/:youngPersonId/safeguarding",
  missing_episode: "/young-people/:youngPersonId/missing",
  keywork: "/young-people/:youngPersonId/keywork",

  health_record: "/young-people/:youngPersonId/health",
  medication_record: "/young-people/:youngPersonId/medication",

  education_record: "/young-people/:youngPersonId/education",
  family_contact: "/young-people/:youngPersonId/family",

  document: "/young-people/:youngPersonId/documents",
  statutory_document: "/young-people/:youngPersonId/documents",
  handover_record: "/young-people/:youngPersonId/handover",
  task: "/young-people/:youngPersonId/tasks",
});

const FALLBACK_RECORD_LABELS = Object.freeze({
  support_plan: "Support plan",
  risk: "Risk",
  appointment: "Appointment",
  chronology_event: "Timeline event",
  timeline: "Timeline event",
  daily_note: "Daily note",
  incident: "Incident",
  safeguarding_record: "Safeguarding record",
  missing_episode: "Missing episode",
  keywork: "Keywork",
  health_record: "Health record",
  medication_record: "Medication record",
  education_record: "Education record",
  family_contact: "Family contact",
  document: "Document",
  statutory_document: "Statutory document",
  handover_record: "Handover record",
  task: "Task",
});

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function buildQuery(params = {}) {
  const safe = safeObject(params);
  const query = new URLSearchParams();

  Object.entries(safe).forEach(([key, value]) => {
    if (!hasValue(value)) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (hasValue(item)) query.append(key, item);
      });
      return;
    }

    query.set(key, value);
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

function normaliseId(value) {
  if (!hasValue(value)) return "";
  return String(value).trim();
}

function getFallbackRoute(type) {
  return FALLBACK_RECORD_ROUTES[type] || "";
}

function getFallbackLabel(type) {
  return FALLBACK_RECORD_LABELS[type] || type || "Record";
}

function needsYoungPersonFallback(type) {
  return Boolean(getFallbackRoute(type)?.includes(":youngPersonId"));
}

function resolveRecordType(recordType) {
  const type = normaliseRecordType(recordType);

  if (!type) {
    throw new Error(`Unknown record type: ${recordType || "empty"}`);
  }

  const contract = getRecordContract(type) || null;
  const fallbackRoute = getFallbackRoute(type);

  if (!contract && !fallbackRoute) {
    throw new Error(`No record contract found for: ${type}`);
  }

  return { type, contract, fallbackRoute };
}

function assertYoungPersonId(contract, ids = {}, type = "") {
  const youngPersonId = normaliseId(
    ids.youngPersonId ?? ids.childId ?? ids.selectedYoungPersonId
  );

  const requiredByContract = Boolean(contract?.requiresYoungPerson);
  const requiredByFallback = needsYoungPersonFallback(type);

  if ((requiredByContract || requiredByFallback) && !youngPersonId) {
    throw new Error(
      `${contract?.label || getFallbackLabel(type)} requires youngPersonId`
    );
  }

  return youngPersonId;
}

function assertHomeId(contract, ids = {}) {
  const homeId = normaliseId(ids.homeId ?? ids.currentHomeId);

  if (contract?.requiresHome && !homeId) {
    throw new Error(`${contract.label || "Record"} requires homeId`);
  }

  return homeId;
}

function hydrateFallbackRoute(route = "", ids = {}) {
  const youngPersonId = normaliseId(
    ids.youngPersonId ?? ids.childId ?? ids.selectedYoungPersonId
  );

  const homeId = normaliseId(ids.homeId ?? ids.currentHomeId);

  return route
    .replaceAll(":youngPersonId", encodeURIComponent(youngPersonId))
    .replaceAll(":childId", encodeURIComponent(youngPersonId))
    .replaceAll(":homeId", encodeURIComponent(homeId));
}

function unwrapListResponse(response, recordType) {
  const contract = getRecordContract(recordType);
  const safe = safeObject(response);

  if (Array.isArray(response)) return response;

  const candidates = [
    safe.items,
    safe.records,
    safe.results,
    safe.data,
    safe.young_people,
    safe.youngPeople,
    safe.timeline,
    safe.daily_notes,
    safe.appointments,
    safe.incidents,
    safe.health_records,
    safe.education_records,
    safe.family_contact_records,
    safe.support_plans,
    safe.risks,
    safe.risk_assessments,
    safe.tasks,
    safe.documents,
    safe[recordType],
    safe[contract?.section],
    safe[contract?.table],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function unwrapSingleResponse(response) {
  const safe = safeObject(response);

  if (!safe || Array.isArray(response)) return safe;

  return (
    safe.item ||
    safe.record ||
    safe.result ||
    safe.data ||
    safe.created ||
    safe.updated ||
    safe.young_person ||
    safe
  );
}

function buildRecordUrl(recordType, ids = {}, query = {}) {
  const { type, contract, fallbackRoute } = resolveRecordType(recordType);

  const youngPersonId = assertYoungPersonId(contract, ids, type);
  const homeId = assertHomeId(contract, ids);

  let baseUrl = "";

  if (contract) {
    baseUrl = getRecordRoute(type, {
      youngPersonId,
      childId: youngPersonId,
      homeId,
    });
  }

  if (!baseUrl && fallbackRoute) {
    baseUrl = hydrateFallbackRoute(fallbackRoute, {
      ...ids,
      youngPersonId,
      childId: youngPersonId,
      homeId,
    });
  }

  if (!baseUrl) {
    throw new Error(`No route configured for ${getRecordLabel(type) || getFallbackLabel(type)}`);
  }

  return `${baseUrl}${buildQuery(query)}`;
}

function buildRecordItemUrl(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const base = buildRecordUrl(type, ids);
  const id = normaliseId(recordId ?? ids.recordId ?? ids.id);

  if (!id) {
    throw new Error(`${getRecordLabel(type) || getFallbackLabel(type)} requires recordId`);
  }

  return `${base}/${encodeURIComponent(id)}`;
}

export async function listRecords(recordType, ids = {}, query = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordUrl(type, ids, query);
  const response = await apiSend(url, "GET", null, { skipCache: true });
  const rows = unwrapListResponse(response, type);

  return normaliseRecords(rows, type);
}

export async function listRawRecords(recordType, ids = {}, query = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordUrl(type, ids, query);
  const response = await apiSend(url, "GET", null, { skipCache: true });

  return unwrapListResponse(response, type);
}

export async function getRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const response = await apiSend(url, "GET", null, { skipCache: true });
  const row = unwrapSingleResponse(response);

  return normaliseRecord(row, type);
}

export async function getRawRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const response = await apiSend(url, "GET", null, { skipCache: true });

  return unwrapSingleResponse(response);
}

export async function createRecord(recordType, ids = {}, payload = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordUrl(type, ids);
  const response = await apiSend(url, "POST", payload, {
    invalidatePrefixes: [url],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function updateRecord(
  recordType,
  ids = {},
  recordId = "",
  payload = {}
) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const listUrl = buildRecordUrl(type, ids);
  const response = await apiSend(url, "PATCH", payload, {
    invalidatePrefixes: [listUrl],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function replaceRecord(
  recordType,
  ids = {},
  recordId = "",
  payload = {}
) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const listUrl = buildRecordUrl(type, ids);
  const response = await apiSend(url, "PUT", payload, {
    invalidatePrefixes: [listUrl],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function deleteRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const listUrl = buildRecordUrl(type, ids);
  const response = await apiSend(url, "DELETE", null, {
    invalidatePrefixes: [listUrl],
  });

  return unwrapSingleResponse(response);
}

export async function listSectionRecords(section, ids = {}, query = {}) {
  const contract = getRecordContractBySection(section);

  if (contract) {
    return listRecords(contract.type, ids, query);
  }

  const fallbackType = normaliseRecordType(section);

  if (fallbackType && getFallbackRoute(fallbackType)) {
    return listRecords(fallbackType, ids, query);
  }

  throw new Error(`No record contract found for section: ${section}`);
}

export async function listRawSectionRecords(section, ids = {}, query = {}) {
  const contract = getRecordContractBySection(section);

  if (contract) {
    return listRawRecords(contract.type, ids, query);
  }

  const fallbackType = normaliseRecordType(section);

  if (fallbackType && getFallbackRoute(fallbackType)) {
    return listRawRecords(fallbackType, ids, query);
  }

  throw new Error(`No record contract found for section: ${section}`);
}

export async function createSectionRecord(section, ids = {}, payload = {}) {
  const contract = getRecordContractBySection(section);

  if (contract) {
    return createRecord(contract.type, ids, payload);
  }

  const fallbackType = normaliseRecordType(section);

  if (fallbackType && getFallbackRoute(fallbackType)) {
    return createRecord(fallbackType, ids, payload);
  }

  throw new Error(`No record contract found for section: ${section}`);
}

export async function getVisibilityContext(ids = {}) {
  const youngPersonId = normaliseId(ids.youngPersonId ?? ids.childId);

  if (!youngPersonId) {
    throw new Error("Visibility context requires youngPersonId");
  }

  return apiSend(
    `/visibility/young-people/${encodeURIComponent(youngPersonId)}`,
    "GET",
    null,
    { skipCache: true }
  );
}

export async function getAssistantContext(ids = {}, query = {}) {
  const youngPersonId = normaliseId(ids.youngPersonId ?? ids.childId);
  const homeId = normaliseId(ids.homeId);
  const params = buildQuery(query);

  if (youngPersonId) {
    return apiSend(
      `/young-people/${encodeURIComponent(
        youngPersonId
      )}/assistant/context${params}`,
      "GET",
      null,
      { skipCache: true }
    );
  }

  if (homeId) {
    return apiSend(
      `/homes/${encodeURIComponent(homeId)}/assistant/context${params}`,
      "GET",
      null,
      { skipCache: true }
    );
  }

  return apiSend(`/assistant/context${params}`, "GET", null, {
    skipCache: true,
  });
}

export async function runAssistantAction(action = {}) {
  return apiSend("/assistant/actions", "POST", safeObject(action));
}

export async function submitAssistantMessage(payload = {}) {
  return apiSend("/assistant/message", "POST", safeObject(payload));
}

export const recordApi = Object.freeze({
  listRecords,
  listRawRecords,
  getRecord,
  getRawRecord,
  createRecord,
  updateRecord,
  replaceRecord,
  deleteRecord,
  listSectionRecords,
  listRawSectionRecords,
  createSectionRecord,
  getVisibilityContext,
  getAssistantContext,
  runAssistantAction,
  submitAssistantMessage,
});