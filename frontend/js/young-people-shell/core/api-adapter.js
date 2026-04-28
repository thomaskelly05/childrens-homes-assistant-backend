import { apiSend } from "./api.js";
import {
  normaliseRecordType,
} from "./contracts.js";
import {
  getRecordContract,
  getRecordRoute,
  getRecordLabel,
} from "./record-contracts.js";

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

function assertRecordType(recordType) {
  const type = normaliseRecordType(recordType);

  if (!type) {
    throw new Error(`Unknown record type: ${recordType || "empty"}`);
  }

  const contract = getRecordContract(type);

  if (!contract) {
    throw new Error(`No record contract found for: ${type}`);
  }

  return { type, contract };
}

function assertYoungPersonId(contract, ids = {}) {
  const youngPersonId = normaliseId(
    ids.youngPersonId ?? ids.childId ?? ids.selectedYoungPersonId
  );

  if (contract.requiresYoungPerson && !youngPersonId) {
    throw new Error(`${contract.label || "Record"} requires youngPersonId`);
  }

  return youngPersonId;
}

function assertHomeId(contract, ids = {}) {
  const homeId = normaliseId(ids.homeId ?? ids.currentHomeId);

  if (contract.requiresHome && !homeId) {
    throw new Error(`${contract.label || "Record"} requires homeId`);
  }

  return homeId;
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
    safe
  );
}

function buildRecordUrl(recordType, ids = {}, query = {}) {
  const { type, contract } = assertRecordType(recordType);

  const youngPersonId = assertYoungPersonId(contract, ids);
  const homeId = assertHomeId(contract, ids);

  const baseUrl = getRecordRoute(type, {
    youngPersonId,
    childId: youngPersonId,
    homeId,
  });

  if (!baseUrl) {
    throw new Error(`No route configured for ${getRecordLabel(type)}`);
  }

  return `${baseUrl}${buildQuery(query)}`;
}

function buildRecordItemUrl(recordType, ids = {}, recordId = "") {
  const base = buildRecordUrl(recordType, ids);
  const id = normaliseId(recordId ?? ids.recordId ?? ids.id);

  if (!id) {
    throw new Error(`${getRecordLabel(recordType)} requires recordId`);
  }

  return `${base}/${encodeURIComponent(id)}`;
}

export async function listRecords(recordType, ids = {}, query = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordUrl(type, ids, query);
  const response = await apiSend(url, { method: "GET" });

  return unwrapListResponse(response, type);
}

export async function getRecord(recordType, ids = {}, recordId = "") {
  const url = buildRecordItemUrl(recordType, ids, recordId);
  const response = await apiSend(url, { method: "GET" });

  return unwrapSingleResponse(response);
}

export async function createRecord(recordType, ids = {}, payload = {}) {
  const type = normaliseRecordType(recordType);
  const url = buildRecordUrl(type, ids);
  const response = await apiSend(url, {
    method: "POST",
    body: payload,
  });

  return unwrapSingleResponse(response);
}

export async function updateRecord(recordType, ids = {}, recordId = "", payload = {}) {
  const url = buildRecordItemUrl(recordType, ids, recordId);
  const response = await apiSend(url, {
    method: "PATCH",
    body: payload,
  });

  return unwrapSingleResponse(response);
}

export async function replaceRecord(recordType, ids = {}, recordId = "", payload = {}) {
  const url = buildRecordItemUrl(recordType, ids, recordId);
  const response = await apiSend(url, {
    method: "PUT",
    body: payload,
  });

  return unwrapSingleResponse(response);
}

export async function deleteRecord(recordType, ids = {}, recordId = "") {
  const url = buildRecordItemUrl(recordType, ids, recordId);
  const response = await apiSend(url, {
    method: "DELETE",
  });

  return unwrapSingleResponse(response);
}

export async function listSectionRecords(section, ids = {}, query = {}) {
  const contract = getRecordContract(section);

  if (contract) {
    return listRecords(contract.type, ids, query);
  }

  throw new Error(`No record contract found for section: ${section}`);
}

export async function createSectionRecord(section, ids = {}, payload = {}) {
  const contract = getRecordContract(section);

  if (contract) {
    return createRecord(contract.type, ids, payload);
  }

  throw new Error(`No record contract found for section: ${section}`);
}

export async function getVisibilityContext(ids = {}) {
  const youngPersonId = normaliseId(ids.youngPersonId ?? ids.childId);

  if (!youngPersonId) {
    throw new Error("Visibility context requires youngPersonId");
  }

  return apiSend(`/visibility/young-people/${encodeURIComponent(youngPersonId)}`, {
    method: "GET",
  });
}

export async function getAssistantContext(ids = {}, query = {}) {
  const youngPersonId = normaliseId(ids.youngPersonId ?? ids.childId);
  const homeId = normaliseId(ids.homeId);
  const params = buildQuery(query);

  if (youngPersonId) {
    return apiSend(
      `/young-people/${encodeURIComponent(youngPersonId)}/assistant/context${params}`,
      { method: "GET" }
    );
  }

  if (homeId) {
    return apiSend(
      `/homes/${encodeURIComponent(homeId)}/assistant/context${params}`,
      { method: "GET" }
    );
  }

  return apiSend(`/assistant/context${params}`, { method: "GET" });
}

export async function runAssistantAction(action = {}) {
  const safe = safeObject(action);

  return apiSend("/assistant/actions", {
    method: "POST",
    body: safe,
  });
}

export async function submitAssistantMessage(payload = {}) {
  return apiSend("/assistant/message", {
    method: "POST",
    body: safeObject(payload),
  });
}

export const recordApi = Object.freeze({
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  replaceRecord,
  deleteRecord,
  listSectionRecords,
  createSectionRecord,
  getVisibilityContext,
  getAssistantContext,
  runAssistantAction,
  submitAssistantMessage,
});