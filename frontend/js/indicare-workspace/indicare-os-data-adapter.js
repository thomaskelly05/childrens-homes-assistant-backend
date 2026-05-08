import { apiGet } from "../young-people-shell/core/api.js";

const WORKSPACE_RECORD_TYPES = [
  "daily",
  "incident",
  "safeguarding",
  "missing",
  "keywork",
  "direct_work",
  "handover",
  "handover_item",
  "support_plan",
  "health",
  "education",
  "family_contact",
  "review_meeting",
];

const ENDPOINT_GROUPS = {
  children: ["/api/children", "/api/young-people", "/api/young_people", "/children"],
  homes: ["/api/homes", "/api/provider/homes", "/homes"],
  documents: ["workspace:records", "/api/documents", "/api/records", "/api/children/documents"],
  chronology: ["/api/chronology", "/api/timeline", "/api/events"],
  safeguarding: ["workspace:safeguarding", "/api/safeguarding", "/api/risks", "/api/concerns"],
  workforce: ["/api/workforce", "/api/staff", "/api/users"],
  tasks: ["workspace:tasks", "/api/tasks", "/api/actions", "/api/reminders"],
  reports: ["workspace:reports", "/api/reports", "/api/inspection", "/api/inspection/readiness"],
  handover: ["workspace:handover", "/api/handover", "/api/shift-handover"],
  health: ["workspace:health", "/api/health", "/api/wellbeing"],
  education: ["workspace:education", "/api/education", "/api/pep"],
  family_contact: ["workspace:family_contact", "/api/family-contact", "/api/contact"],
};

const cache = new Map();

async function tryJson(url) {
  if (url.startsWith("workspace:")) return loadWorkspaceGroup(url.slice("workspace:".length));
  const payload = await apiGet(url, { skipCache: true });
  return normalisePayload(payload);
}

function normalisePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (payload?.data && Array.isArray(payload.data.items)) return payload.data.items;
  return payload ? [payload] : [];
}

async function loadWorkspaceGroup(group) {
  if (group === "records") {
    return loadWorkspaceTypes(WORKSPACE_RECORD_TYPES);
  }
  if (group === "safeguarding") {
    return loadWorkspaceTypes(["safeguarding", "missing", "incident"]);
  }
  if (group === "tasks") {
    return loadWorkspaceTypes(["handover_item", "support_plan", "review_meeting", "safeguarding", "missing"]);
  }
  if (group === "reports") {
    return loadWorkspaceTypes(["daily", "incident", "safeguarding", "missing", "keywork", "direct_work", "support_plan", "health", "education", "family_contact", "review_meeting"]);
  }
  if (group === "handover") {
    return loadWorkspaceTypes(["handover", "handover_item"]);
  }
  return loadWorkspaceTypes([group]);
}

async function loadWorkspaceTypes(types) {
  const results = await Promise.allSettled(types.map(async (type) => {
    const payload = await apiGet(`/workspace-records/${encodeURIComponent(type)}?limit=100`, { skipCache: true });
    return normalisePayload(payload.records || payload.items || payload.data || payload).map((item) => ({
      ...item,
      record_type: item.record_type || type,
      type: item.type || item.record_type || type,
      _workspace_type: type,
      _source: "workspace-records",
    }));
  }));
  return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

async function loadGroup(name) {
  if (cache.has(name)) return cache.get(name);
  const urls = ENDPOINT_GROUPS[name] || [];
  for (const url of urls) {
    try {
      const items = await tryJson(url);
      if (items.length || String(url).startsWith("workspace:")) {
        cache.set(name, items);
        window.dispatchEvent(new CustomEvent("indicare:data-loaded", { detail: { name, source: url, count: items.length } }));
        return items;
      }
    } catch (error) {
      // Try the next known endpoint. The active deployment may expose only one.
    }
  }
  cache.set(name, []);
  window.dispatchEvent(new CustomEvent("indicare:data-empty", { detail: { name } }));
  return [];
}

function clearCache() {
  cache.clear();
}

window.IndiCareData = {
  load: loadGroup,
  clear: clearCache,
  endpoints: ENDPOINT_GROUPS,
  workspaceTypes: WORKSPACE_RECORD_TYPES,
};
