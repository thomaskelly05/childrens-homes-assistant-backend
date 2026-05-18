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

const RECORD_ENDPOINTS = Object.freeze({
  daily_note: {
    list: "/young-people/:youngPersonId/daily-notes",
    create: "/young-people/:youngPersonId/daily-notes",
    get: "/young-people/daily-notes/:recordId",
    update: "/young-people/daily-notes/:recordId",
    replace: "/young-people/daily-notes/:recordId",
    delete: "/young-people/daily-notes/:recordId/archive",
    deleteMethod: "POST",
  },
  incident: {
    list: "/young-people/:youngPersonId/incidents",
    create: "/young-people/:youngPersonId/incidents",
    get: "/young-people/incidents/:recordId",
    update: "/young-people/incidents/:recordId",
    replace: "/young-people/incidents/:recordId",
    delete: "/young-people/incidents/:recordId/archive",
    deleteMethod: "POST",
  },
  health_record: {
    list: "/young-people/:youngPersonId/health",
    create: "/young-people/:youngPersonId/health-records",
    get: "/young-people/health-records/:recordId",
    update: "/young-people/health-records/:recordId",
    replace: "/young-people/health-records/:recordId",
  },
  medication_record: {
    list: "/young-people/:youngPersonId/medication-records",
    create: "/young-people/:youngPersonId/medication-records",
    get: "/young-people/medication-records/:recordId",
    update: "/young-people/medication-records/:recordId",
    replace: "/young-people/medication-records/:recordId",
  },
  education_record: {
    list: "/young-people/:youngPersonId/education",
    create: "/young-people/:youngPersonId/education-records",
    get: "/young-people/education-records/:recordId",
    update: "/young-people/education-records/:recordId",
    replace: "/young-people/education-records/:recordId",
  },
  family_contact: {
    list: "/young-people/:youngPersonId/family",
    create: "/young-people/:youngPersonId/family/records",
    get: "/young-people/family/records/:recordId",
    update: "/young-people/family/records/:recordId",
    replace: "/young-people/family/records/:recordId",
  },
  keywork: {
    list: "/young-people/:youngPersonId/keywork",
    create: "/young-people/:youngPersonId/keywork",
    get: "/young-people/keywork/:recordId",
    update: "/young-people/keywork/:recordId",
    replace: "/young-people/keywork/:recordId",
  },
  risk: {
    list: "/young-people/:youngPersonId/risk",
    create: "/young-people/:youngPersonId/risk",
    get: "/young-people/risk/:recordId",
    update: "/young-people/risk/:recordId",
    replace: "/young-people/risk/:recordId",
  },
  support_plan: {
    list: "/young-people/:youngPersonId/plans",
    create: "/young-people/:youngPersonId/plans",
    get: "/young-people/plans/:recordId",
    update: "/young-people/plans/:recordId",
    replace: "/young-people/plans/:recordId",
  },
  appointment: {
    list: "/young-people/:youngPersonId/appointments",
    create: "/young-people/:youngPersonId/appointments",
    get: "/young-people/appointments/:recordId",
    update: "/young-people/appointments/:recordId",
    replace: "/young-people/appointments/:recordId",
  },
  chronology_event: {
    list: "/young-people/:youngPersonId/timeline",
    create: "/young-people/:youngPersonId/timeline",
    get: "/young-people/timeline/:recordId",
    update: "/young-people/timeline/:recordId",
    replace: "/young-people/timeline/:recordId",
  },
  timeline: {
    list: "/young-people/:youngPersonId/timeline",
    create: "/young-people/:youngPersonId/timeline",
    get: "/young-people/timeline/:recordId",
    update: "/young-people/timeline/:recordId",
    replace: "/young-people/timeline/:recordId",
  },
  safeguarding_record: {
    list: "/young-people/:youngPersonId/safeguarding",
    create: "/young-people/:youngPersonId/safeguarding",
    get: "/young-people/safeguarding/:recordId",
    update: "/young-people/safeguarding/:recordId",
    replace: "/young-people/safeguarding/:recordId",
  },
  missing_episode: {
    list: "/young-people/:youngPersonId/missing-episodes",
    create: "/young-people/:youngPersonId/missing-episodes",
    get: "/young-people/missing-episodes/:recordId",
    update: "/young-people/missing-episodes/:recordId",
    replace: "/young-people/missing-episodes/:recordId",
  },
  statutory_document: {
    list: "/young-people/:youngPersonId/statutory-documents",
    create: "/young-people/:youngPersonId/statutory-documents",
    get: "/young-people/statutory-documents/:recordId",
    update: "/young-people/statutory-documents/:recordId",
    replace: "/young-people/statutory-documents/:recordId",
  },
  handover_record: {
    list: "/young-people/:youngPersonId/handover",
    create: "/young-people/:youngPersonId/handover",
    get: "/young-people/handover/:recordId",
    update: "/young-people/handover/:recordId",
    replace: "/young-people/handover/:recordId",
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

function truthy(value) {
  return value === true || ["true", "1", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function compactText(...values) {
  const parts = values
    .filter((value) => hasValue(value))
    .map((value) => String(value).trim())
    .filter(Boolean);
  return parts.join("\n") || "";
}

function toNumberOrNull(value) {
  if (!hasValue(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalisePayloadForRecordType(recordType, payload = {}) {
  const type = normaliseRecordType(recordType);
  const data = safeObject(payload);

  if (type !== "medication_record") return data;

  const status = String(data.status || "recorded").trim().toLowerCase();
  const administeredTime = data.administered_time || data.administered_at || data.recorded_at || "";
  const scheduledTime = data.scheduled_time || data.scheduled_at || administeredTime || "";
  const notes = compactText(data.notes, data.actions_required);
  const errorDetails = compactText(data.error_details, status === "error" ? notes : "");
  const managerReviewStatus =
    data.manager_review_status || (truthy(data.manager_review_needed) ? "required" : "");

  const normalised = {
    ...data,
    medication_profile_id: toNumberOrNull(data.medication_profile_id),
    scheduled_time: scheduledTime,
    administered_time: administeredTime,
    medication_name: data.medication_name || data.title || "Medication",
    dose: data.dose || data.dosage || "",
    route: data.route || "",
    status,
    refusal_reason: data.refusal_reason || "",
    omission_reason: data.omission_reason || "",
    error_flag: data.error_flag ?? (status === "error" || Boolean(errorDetails)),
    error_details: errorDetails,
    manager_review_status: managerReviewStatus,
    administered_by: toNumberOrNull(data.administered_by),
  };

  if (!normalised.error_details && notes) {
    normalised.error_details = notes;
  }

  return normalised;
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

  const recordId = normaliseId(
    ids.recordId ?? ids.id ?? ids.source_id ?? ids.sourceId
  );

  return { youngPersonId, homeId, recordId };
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

function routeRequiresRecord(route = "") {
  return route.includes(":recordId") || route.includes(":id");
}

function resolveRecordType(recordType) {
  const type = normaliseRecordType(recordType);

  if (!type) {
    throw new Error(`Unknown record type: ${recordType || "empty"}`);
  }

  const contract = getRecordContract(type) || null;
  const fallbackConfig = getFallbackRouteConfig(type);
  const endpointConfig = RECORD_ENDPOINTS[type] || null;

  if (!contract && !fallbackConfig && !endpointConfig) {
    throw new Error(`No record contract found for: ${type}`);
  }

  return { type, contract, fallbackConfig, endpointConfig };
}

function hydrateRoute(route = "", ids = {}) {
  const { youngPersonId, homeId, recordId } = getIds(ids);

  return route
    .replaceAll(":youngPersonId", encodeURIComponent(youngPersonId))
    .replaceAll(":childId", encodeURIComponent(youngPersonId))
    .replaceAll(":homeId", encodeURIComponent(homeId))
    .replaceAll(":recordId", encodeURIComponent(recordId))
    .replaceAll(":id", encodeURIComponent(recordId));
}

function assertRouteIds(route = "", ids = {}, label = "Record") {
  const { youngPersonId, homeId, recordId } = getIds(ids);

  if (routeRequiresYoungPerson(route) && !youngPersonId) {
    throw new Error(`${label} requires youngPersonId`);
  }

  if (routeRequiresHome(route) && !homeId) {
    throw new Error(`${label} requires homeId`);
  }

  if (routeRequiresRecord(route) && !recordId) {
    throw new Error(`${label} requires recordId`);
  }
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
      assertRouteIds(fallbackRoute, ids, contract?.label || getFallbackLabel(type));
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

function buildRecordActionUrl(recordType, action, ids = {}, query = {}) {
  const { type, contract, endpointConfig } = resolveRecordType(recordType);
  const label = contract?.label || getFallbackLabel(type);
  const route = endpointConfig?.[action] || null;

  if (route) {
    const hydratedIds = {
      ...ids,
      recordId: ids.recordId ?? ids.id ?? ids.source_id ?? ids.sourceId,
    };
    assertRouteIds(route, hydratedIds, label);
    return `${hydrateRoute(route, hydratedIds)}${buildQuery(query)}`;
  }

  if (action === "list" || action === "create") {
    return buildRecordUrl(type, ids, query);
  }

  return buildRecordItemUrl(type, ids, ids.recordId ?? ids.id, query);
}

function buildRecordItemUrl(recordType, ids = {}, recordId = "", query = {}) {
  const type = normaliseRecordType(recordType);
  const id = normaliseId(recordId ?? ids.recordId ?? ids.id);

  if (!id) {
    throw new Error(`${getRecordLabel(type) || getFallbackLabel(type)} requires recordId`);
  }

  const base = buildRecordUrl(type, ids);
  return `${base}/${encodeURIComponent(id)}${buildQuery(query)}`;
}

function getActionMethod(recordType, action, fallback) {
  const type = normaliseRecordType(recordType);
  const config = RECORD_ENDPOINTS[type] || {};
  return config[`${action}Method`] || fallback;
}

function idsWithRecordId(ids = {}, recordId = "") {
  return {
    ...ids,
    recordId: recordId || ids.recordId || ids.id,
  };
}

export async function listRecords(recordType, ids = {}, query = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordActionUrl(type, "list", ids, query);
  const response = await apiSend(url, "GET", null, { skipCache: true });
  const rows = unwrapListResponse(response, type);

  return normaliseRecords(rows, type);
}

export async function listRawRecords(recordType, ids = {}, query = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordActionUrl(type, "list", ids, query);
  const response = await apiSend(url, "GET", null, { skipCache: true });

  return unwrapListResponse(response, type);
}

export async function getRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const url = buildRecordActionUrl(type, "get", idsWithRecordId(ids, recordId));
  const response = await apiSend(url, "GET", null, { skipCache: true });
  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function getRawRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const url = buildRecordActionUrl(type, "get", idsWithRecordId(ids, recordId));
  const response = await apiSend(url, "GET", null, { skipCache: true });

  return unwrapSingleResponse(response);
}

export async function createRecord(recordType, ids = {}, payload = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordActionUrl(type, "create", ids);
  const listUrl = buildRecordActionUrl(type, "list", ids);
  const normalisedPayload = normalisePayloadForRecordType(type, payload);
  const response = await apiSend(url, "POST", normalisedPayload, {
    invalidatePrefixes: [listUrl, url],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function updateRecord(recordType, ids = {}, recordId = "", payload = {}) {
  const type = normaliseRecordType(recordType);
  const scopedIds = idsWithRecordId(ids, recordId);
  const url = buildRecordActionUrl(type, "update", scopedIds);
  const listUrl = buildRecordActionUrl(type, "list", ids);
  const normalisedPayload = normalisePayloadForRecordType(type, payload);
  const response = await apiSend(url, getActionMethod(type, "update", "PATCH"), normalisedPayload, {
    invalidatePrefixes: [listUrl],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function replaceRecord(recordType, ids = {}, recordId = "", payload = {}) {
  const type = normaliseRecordType(recordType);
  const scopedIds = idsWithRecordId(ids, recordId);
  const url = buildRecordActionUrl(type, "replace", scopedIds);
  const listUrl = buildRecordActionUrl(type, "list", ids);
  const normalisedPayload = normalisePayloadForRecordType(type, payload);
  const response = await apiSend(url, getActionMethod(type, "replace", "PUT"), normalisedPayload, {
    invalidatePrefixes: [listUrl],
  });

  return normaliseRecord(unwrapSingleResponse(response), type);
}

export async function deleteRecord(recordType, ids = {}, recordId = "") {
  const type = normaliseRecordType(recordType);
  const scopedIds = idsWithRecordId(ids, recordId);
  const url = buildRecordActionUrl(type, "delete", scopedIds);
  const listUrl = buildRecordActionUrl(type, "list", ids);
  const response = await apiSend(url, getActionMethod(type, "delete", "DELETE"), null, {
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

  if (fallbackType && (getFallbackRouteConfig(fallbackType) || RECORD_ENDPOINTS[fallbackType])) {
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

  if (fallbackType && (getFallbackRouteConfig(fallbackType) || RECORD_ENDPOINTS[fallbackType])) {
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

  if (fallbackType && (getFallbackRouteConfig(fallbackType) || RECORD_ENDPOINTS[fallbackType])) {
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
      `/assistant/os/context/${encodeURIComponent(youngPersonId)}${params}`,
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
