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
  support_plan: {
    child: "/young-people/:youngPersonId/plans",
    home: "/homes/:homeId/support-plans",
  },
  risk: {
    child: "/young-people/:youngPersonId/risk",
    home: "/homes/:homeId/risk",
  },
  appointment: {
    child: "/young-people/:youngPersonId/appointments",
    home: "/homes/:homeId/appointments",
  },
  chronology_event: {
    child: "/young-people/:youngPersonId/timeline",
    home: "/homes/:homeId/timeline",
  },
  timeline: {
    child: "/young-people/:youngPersonId/timeline",
    home: "/homes/:homeId/timeline",
  },
  daily_note: {
    child: "/young-people/:youngPersonId/daily-notes",
    home: "/homes/:homeId/daily-notes",
  },
  incident: {
    child: "/young-people/:youngPersonId/incidents",
    home: "/homes/:homeId/incidents",
  },
  safeguarding_record: {
    child: "/young-people/:youngPersonId/safeguarding",
    home: "/homes/:homeId/safeguarding",
  },
  missing_episode: {
    child: "/young-people/:youngPersonId/missing-episodes",
    home: "/homes/:homeId/missing-episodes",
  },
  keywork: {
    child: "/young-people/:youngPersonId/keywork",
    home: "/homes/:homeId/keywork",
  },
  health_record: {
    child: "/young-people/:youngPersonId/health",
    home: "/homes/:homeId/health",
  },
  medication_record: {
    child: "/young-people/:youngPersonId/medication-records",
    home: "/homes/:homeId/medication-records",
  },
  education_record: {
    child: "/young-people/:youngPersonId/education",
    home: "/homes/:homeId/education",
  },
  family_contact: {
    child: "/young-people/:youngPersonId/family",
    home: "/homes/:homeId/family",
  },
  document: {
    child: "/young-people/:youngPersonId/documents",
    home: "/homes/:homeId/documents",
  },
  statutory_document: {
    child: "/young-people/:youngPersonId/statutory-documents",
    home: "/homes/:homeId/statutory-documents",
  },
  handover_record: {
    child: "/young-people/:youngPersonId/handover",
    home: "/homes/:homeId/handover",
  },
  task: {
    child: "/young-people/:youngPersonId/tasks",
    home: "/homes/:homeId/tasks",
  },
  report: {
    child: "/young-people/:youngPersonId/reports",
    home: "/homes/:homeId/reports",
  },
});

const FALLBACK_RECORD_LABELS = Object.freeze({
  support_plan: "Support plan",
  risk: "Risk assessment",
  appointment: "Appointment",
  chronology_event: "Timeline event",
  timeline: "Timeline event",
  daily_note: "Daily note",
  incident: "Incident",
  safeguarding_record: "Safeguarding record",
  missing_episode: "Missing episode",
  keywork: "Key work session",
  health_record: "Health record",
  medication_record: "Medication record",
  education_record: "Education record",
  family_contact: "Family contact",
  document: "Document",
  statutory_document: "Statutory document",
  handover_record: "Handover record",
  task: "Task",
  report: "Report",
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
  const query = new URLSearchParams();

  Object.entries(safeObject(params)).forEach(([key, value]) => {
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

function getFallbackRouteConfig(type) {
  return FALLBACK_RECORD_ROUTES[type] || null;
}

function getFallbackLabel(type) {
  return FALLBACK_RECORD_LABELS[type] || type || "Record";
}

function getIds(ids = {}) {
  const youngPersonId = normaliseId(
    ids.youngPersonId ?? ids.childId ?? ids.selectedYoungPersonId
  );

  const homeId = normaliseId(
    ids.homeId ?? ids.currentHomeId ?? ids.selectedHomeId
  );

  return { youngPersonId, homeId };
}

function resolveScope(ids = {}) {
  const { youngPersonId, homeId } = getIds(ids);

  if (youngPersonId) return "child";
  if (homeId) return "home";

  return "child";
}

function getFallbackRoute(type, ids = {}) {
  const config = getFallbackRouteConfig(type);
  if (!config) return "";

  if (typeof config === "string") return config;

  const scope = resolveScope(ids);
  return config[scope] || config.child || "";
}

function routeRequiresYoungPerson(route = "") {
  return route.includes(":youngPersonId") || route.includes(":childId");
}

function routeRequiresHome(route = "") {
  return route.includes(":homeId");
}

function resolveRecordType(recordType) {
  const type = normaliseRecordType(recordType);

  if (!type) {
    throw new Error(`Unknown record type: ${recordType || "empty"}`);
  }

  const contract = getRecordContract(type) || null;
  const fallbackConfig = getFallbackRouteConfig(type);

  if (!contract && !fallbackConfig) {
    throw new Error(`No record contract found for: ${type}`);
  }

  return { type, contract, fallbackConfig };
}

function hydrateRoute(route = "", ids = {}) {
  const { youngPersonId, homeId } = getIds(ids);

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
    safe.timeline,
    safe.daily_notes,
    safe.appointments,
    safe.incidents,
    safe.safeguarding,
    safe.safeguarding_records,
    safe.health_records,
    safe.education_records,
    safe.family_contact_records,
    safe.family_contacts,
    safe.support_plans,
    safe.risks,
    safe.risk_assessments,
    safe.tasks,
    safe.documents,
    safe.statutory_documents,
    safe.medication_records,
    safe.handover_records,
    safe.reports,
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
  const { type, contract } = resolveRecordType(recordType);
  const { youngPersonId, homeId } = getIds(ids);

  let baseUrl = "";

  if (contract && youngPersonId) {
    baseUrl = getRecordRoute(type, {
      youngPersonId,
      childId: youngPersonId,
      homeId,
    });
  }

  if (!baseUrl) {
    const fallbackRoute = getFallbackRoute(type, ids);

    if (fallbackRoute) {
      if (routeRequiresYoungPerson(fallbackRoute) && !youngPersonId) {
        throw new Error(`${contract?.label || getFallbackLabel(type)} requires youngPersonId`);
      }

      if (routeRequiresHome(fallbackRoute) && !homeId) {
        throw new Error(`${contract?.label || getFallbackLabel(type)} requires homeId`);
      }

      baseUrl = hydrateRoute(fallbackRoute, ids);
    }
  }

  if (!baseUrl) {
    throw new Error(
      `No route configured for ${getRecordLabel(type) || getFallbackLabel(type)}`
    );
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
  return normaliseRecord(unwrapSingleResponse(response), type);
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

export async function updateRecord(recordType, ids = {}, recordId = "", payload = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordItemUrl(type, ids, recordId);
  const listUrl = buildRecordUrl(type, ids);
  const response = await apiSend(url, "PATCH", payload, {
    invalidatePrefixes: [listUrl],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function replaceRecord(recordType, ids = {}, recordId = "", payload = {}) {
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

  if (fallbackType && getFallbackRouteConfig(fallbackType)) {
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

  if (fallbackType && getFallbackRouteConfig(fallbackType)) {
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

  if (fallbackType && getFallbackRouteConfig(fallbackType)) {
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
      `/young-people/${encodeURIComponent(youngPersonId)}/assistant/context${params}`,
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