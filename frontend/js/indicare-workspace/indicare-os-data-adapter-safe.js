import { apiGet } from "../young-people-shell/core/api.js";

const cache = new Map();
const failed = new Map();
const FAILED_TTL = 120000;
const GROUP_KEYS = {
  children: ["children", "young_people", "youngPeople", "items"],
  homes: ["homes", "user_homes", "authorised_homes"],
  documents: ["documents", "records", "recordings"],
  chronology: ["chronology", "timeline", "events"],
  safeguarding: ["safeguarding", "alerts", "risks", "concerns"],
  workforce: ["workforce", "staff", "users"],
  tasks: ["tasks", "actions", "reminders"],
  reports: ["reports", "inspection", "inspection_readiness"],
};
const WORKSPACE_TYPES = {
  handover: ["handover"],
  health: ["health"],
  education: ["education"],
  family_contact: ["family_contact"],
};

async function load(name) {
  if (cache.has(name)) return cache.get(name);
  let items = await fromOsContext(name);
  if (!items.length && WORKSPACE_TYPES[name]) items = await loadWorkspaceTypes(WORKSPACE_TYPES[name]);
  cache.set(name, items);
  window.dispatchEvent(new CustomEvent(items.length ? "indicare:data-loaded" : "indicare:data-empty", { detail: { name, source: "safe-os-adapter", count: items.length } }));
  return items;
}

async function fromOsContext(name) {
  const payload = await safeGet("/api/os/context");
  if (!payload) return [];
  return extract(payload, name);
}

function extract(payload, name) {
  if (!payload || typeof payload !== "object") return [];
  for (const key of GROUP_KEYS[name] || [name]) {
    const items = normalise(payload[key]);
    if (items.length) return items;
  }
  const nested = payload.data || payload.context || payload.os_context;
  if (nested && nested !== payload) return extract(nested, name);
  return [];
}

async function loadWorkspaceTypes(types) {
  const out = [];
  for (const type of types) {
    const payload = await safeGet(`/workspace-records/${encodeURIComponent(type)}?limit=100`, `workspace:${type}`);
    out.push(...normalise(payload?.records || payload?.items || payload?.data || payload).map((item) => ({ ...item, record_type: item.record_type || type, type: item.type || item.record_type || type, _workspace_type: type })));
  }
  return out;
}

async function safeGet(url, key = url) {
  if (isFailed(key)) return null;
  try {
    return await apiGet(url, { skipCache: true, timeoutMs: 8000 });
  } catch {
    failed.set(key, Date.now());
    return null;
  }
}

function isFailed(key) {
  const at = failed.get(key);
  if (!at) return false;
  if (Date.now() - at > FAILED_TTL) { failed.delete(key); return false; }
  return true;
}

function normalise(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

window.IndiCareData = { load, clear: () => cache.clear(), endpoints: { os_context: ["/api/os/context"] }, workspaceTypes: Object.values(WORKSPACE_TYPES).flat() };
