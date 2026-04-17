const API_BASE = window.location.origin;

const GET_CACHE_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;
const SSE_TIMEOUT_MS = 60000;

const inflightGetRequests = new Map();
const getResponseCache = new Map();

async function readJsonSafely(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildErrorMessage(response, data) {
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (typeof data?.raw === "string" && data.raw.trim()) return data.raw.trim();
  return `Request failed (${response.status})`;
}

const API_ROUTE_ALIASES = [
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],
  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/timeline?limit=12"],

  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/health"],

  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],

  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],

  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/safeguarding$/, "/young-people/$1/incidents"],

  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/child-compliance$/, "/young-people/$1/compliance"],

  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/plans"],

  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],

  [/\/young-people\/(\d+)\/communications$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/therapy$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/keywork$/, "/young-people/$1/keywork"],

  [/\/homes\/(\d+)\/young-people$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/quality-dashboard$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance-dashboard$/, "/homes/$1/compliance"],

  [/\/homes\/(\d+)\/staff$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/staff-documents$/, "/homes/$1/staff-files"],
  [/\/homes\/(\d+)\/notifications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/inspection-readiness$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/safeguarding$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/child-compliance$/, "/homes/$1/compliance"],
];

function shouldResolveAlias(method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

export function resolveApiUrl(url, method = "GET") {
  if (!url || typeof url !== "string") return url;
  if (!shouldResolveAlias(method)) return url;

  const [pathname, queryString = ""] = url.split("?");
  const suffix = queryString ? `?${queryString}` : "";

  for (const [pattern, replacement] of API_ROUTE_ALIASES) {
    if (pattern.test(pathname)) {
      return pathname.replace(pattern, replacement) + suffix;
    }
  }

  return url;
}

function getCookie(name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

export function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

export function withCsrfHeaders(method = "GET", headers = {}) {
  const upper = String(method || "GET").toUpperCase();
  const nextHeaders = { ...(headers || {}) };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
    const csrfToken = getCsrfToken();
    if (csrfToken && !nextHeaders["X-CSRF-Token"]) {
      nextHeaders["X-CSRF-Token"] = csrfToken;
    }
  }

  return nextHeaders;
}

function makeCacheKey(method, resolvedUrl) {
  return `${String(method || "GET").toUpperCase()}::${resolvedUrl}`;
}

function getCachedResponse(cacheKey) {
  const cached = getResponseCache.get(cacheKey);
  if (!cached) return null;

  const expired = Date.now() - cached.timestamp > GET_CACHE_MS;
  if (expired) {
    getResponseCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedResponse(cacheKey, data) {
  getResponseCache.set(cacheKey, {
    timestamp: Date.now(),
    data,
  });
}

function shouldCacheRequest(method = "GET", options = {}) {
  const upper = String(method || "GET").toUpperCase();
  if (upper !== "GET") return false;
  if (options.skipCache) return false;
  return true;
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

function buildFetchConfig(method, options, headers) {
  const config = {
    credentials: "include",
    ...options,
    method,
    headers,
  };

  delete config.accept;
  delete config.invalidatePrefixes;
  delete config.skipCache;
  delete config.timeoutMs;

  if (
    config.body &&
    typeof config.body !== "string" &&
    !(config.body instanceof FormData)
  ) {
    config.body = JSON.stringify(config.body);
  }

  return config;
}

function createTimeoutSignal(timeoutMs, externalSignal, timeoutMessage = "Request timed out") {
  if (!timeoutMs && !externalSignal) {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  let timeoutId = null;

  const abortFromExternal = () => {
    try {
      controller.abort(externalSignal?.reason);
    } catch {
      // ignore
    }
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error(timeoutMessage));
      } catch {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (externalSignal) {
        try {
          externalSignal.removeEventListener("abort", abortFromExternal);
        } catch {
          // ignore
        }
      }
    },
  };
}

function buildAbortMessage(signal, fallback = "Request timed out") {
  const reason = signal?.reason;

  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }

  return fallback;
}

export function clearApiCache(url = null) {
  if (!url) {
    getResponseCache.clear();
    inflightGetRequests.clear();
    return;
  }

  const resolvedUrl = resolveApiUrl(url, "GET");
  const cacheKey = makeCacheKey("GET", resolvedUrl);
  getResponseCache.delete(cacheKey);
  inflightGetRequests.delete(cacheKey);
}

function invalidateCacheByPrefixes(prefixes = []) {
  if (!Array.isArray(prefixes) || !prefixes.length) {
    clearApiCache();
    return;
  }

  const safePrefixes = prefixes.filter(Boolean);
  if (!safePrefixes.length) {
    clearApiCache();
    return;
  }

  for (const key of [...getResponseCache.keys()]) {
    const [, urlPart = ""] = key.split("::");
    if (safePrefixes.some((prefix) => urlPart.startsWith(prefix))) {
      getResponseCache.delete(key);
    }
  }

  for (const key of [...inflightGetRequests.keys()]) {
    const [, urlPart = ""] = key.split("::");
    if (safePrefixes.some((prefix) => urlPart.startsWith(prefix))) {
      inflightGetRequests.delete(key);
    }
  }
}

function pushUniqueByKey(target, items, keyBuilder) {
  const seen = new Set(target.map((item) => keyBuilder(item)));

  for (const item of items) {
    const key = keyBuilder(item);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(item);
  }
}

function recordKey(item = {}) {
  return [
    item.record_type || item.source_table || "",
    item.id ?? item.record_id ?? item.source_id ?? "",
    item.title || item.name || item.staff_member || item.full_name || "",
    item.date ||
      item.created_at ||
      item.updated_at ||
      item.contact_datetime ||
      item.event_datetime ||
      item.review_date ||
      item.start_datetime ||
      item.session_date ||
      item.visit_date ||
      item.due_date ||
      item.next_due_date ||
      "",
  ].join("::");
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIdArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

async function apiGetSettled(urls = []) {
  const settled = await Promise.allSettled(urls.map((url) => apiGet(url)));
  return settled.map((result, index) => ({
    url: urls[index],
    ok: result.status === "fulfilled",
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason : null,
  }));
}

function mergeAssistantBundle(responses = []) {
  const bundle = {
    items: [],
    daily_notes: [],
    incidents: [],
    tasks: [],
    health_records: [],
    education_records: [],
    family_contact_records: [],
    appointments: [],
    monthly_reviews: [],
    chronology_events: [],
    risk_assessments: [],
    support_plans: [],
    compliance_items: [],
    statutory_documents: [],
    documents: [],
    communications: [],
    therapy: [],
    therapy_records: [],
    team: [],
    supervisions: [],
    reports: [],
    rota: [],
    staffing: [],
    onboarding: [],
    training: [],
    probations: [],
    vacancies: [],
    pipeline: [],
    shifts: [],
    absences: [],
    pipeline_candidates: [],
    maintenance: [],
    finance: [],
    medication: [],
    admissions: [],
    discharges: [],
    visitors: [],
    staff_files: [],
    audits: [],
    manager_actions: [],
    reg40: [],
    reg44: [],
    reg45: [],
    home_incidents: [],
    keywork: [],
    transport: [],
    home: null,
    young_people: [],
    summary: {},
    alerts: [],
    scope_meta: {},
    homes: [],
  };

  for (const response of responses) {
    if (!response?.ok || !response.data || typeof response.data !== "object") continue;
    const data = response.data;

    if (Array.isArray(data.items)) {
      pushUniqueByKey(bundle.items, data.items, recordKey);
    }

    const mappings = [
      ["daily_notes", bundle.daily_notes],
      ["incidents", bundle.incidents],
      ["home_incidents", bundle.home_incidents],
      ["tasks", bundle.tasks],
      ["health_records", bundle.health_records],
      ["education_records", bundle.education_records],
      ["family_contact_records", bundle.family_contact_records],
      ["appointments", bundle.appointments],
      ["monthly_reviews", bundle.monthly_reviews],
      ["timeline", bundle.chronology_events],
      ["chronology_events", bundle.chronology_events],
      ["risk_assessments", bundle.risk_assessments],
      ["risks", bundle.risk_assessments],
      ["support_plans", bundle.support_plans],
      ["compliance_items", bundle.compliance_items],
      ["documents", bundle.documents],
      ["statutory_documents", bundle.statutory_documents],
      ["communications", bundle.communications],
      ["therapy", bundle.therapy],
      ["therapy_records", bundle.therapy_records],
      ["team", bundle.team],
      ["staff", bundle.team],
      ["supervisions", bundle.supervisions],
      ["reports", bundle.reports],
      ["rota", bundle.rota],
      ["onboarding", bundle.onboarding],
      ["training", bundle.training],
      ["probations", bundle.probations],
      ["vacancies", bundle.vacancies],
      ["pipeline", bundle.pipeline],
      ["pipeline_candidates", bundle.pipeline_candidates],
      ["shifts", bundle.shifts],
      ["absences", bundle.absences],
      ["maintenance", bundle.maintenance],
      ["finance", bundle.finance],
      ["medication", bundle.medication],
      ["admissions", bundle.admissions],
      ["discharges", bundle.discharges],
      ["visitors", bundle.visitors],
      ["staff_files", bundle.staff_files],
      ["audits", bundle.audits],
      ["manager_actions", bundle.manager_actions],
      ["reg40", bundle.reg40],
      ["reg44", bundle.reg44],
      ["reg45", bundle.reg45],
      ["keywork", bundle.keywork],
      ["transport", bundle.transport],
      ["young_people", bundle.young_people],
      ["alerts", bundle.alerts],
    ];

    for (const [sourceKey, target] of mappings) {
      const items = toArray(data[sourceKey]);
      if (items.length) {
        pushUniqueByKey(target, items, recordKey);
      }
    }

    if (data.staffing) {
      const staffingArray = Array.isArray(data.staffing) ? data.staffing : [data.staffing];
      pushUniqueByKey(bundle.staffing, staffingArray, recordKey);
    }

    if (data.home && typeof data.home === "object") {
      if (!bundle.home) {
        bundle.home = data.home;
      }
      pushUniqueByKey(bundle.homes, [data.home], (item) => String(item?.id ?? ""));
    }

    if (Array.isArray(data.homes)) {
      pushUniqueByKey(bundle.homes, data.homes, (item) => String(item?.id ?? ""));
    }

    if (data.summary && typeof data.summary === "object") {
      bundle.summary = {
        ...bundle.summary,
        ...data.summary,
      };
    }

    if (data.scope_meta && typeof data.scope_meta === "object") {
      bundle.scope_meta = {
        ...bundle.scope_meta,
        ...data.scope_meta,
      };
    }
  }

  return bundle;
}

async function fetchHomeWideBundle(homeId) {
  if (!homeId) return [];

  const urls = [
    `/homes/${homeId}/dashboard`,
    `/homes/${homeId}/team`,
    `/homes/${homeId}/tasks`,
    `/homes/${homeId}/communications`,
    `/homes/${homeId}/documents`,
    `/homes/${homeId}/supervisions`,
    `/homes/${homeId}/reports`,
    `/homes/${homeId}/therapy`,
    `/homes/${homeId}/compliance`,
    `/homes/${homeId}/quality`,
    `/homes/${homeId}/audits`,
    `/homes/${homeId}/incidents`,
  ];

  return apiGetSettled(urls);
}

function resolveAccessibleHomeIds(context = {}) {
  const accessLevel = String(context.access_level || "").toLowerCase();
  const scope = String(context.scope || context.current_scope || "child").toLowerCase();
  const homeId = Number(context.home_id);
  const allowedHomeIds = toIdArray(
    context.allowed_home_ids || context.allowedHomeIds || []
  );

  if (scope === "quality" && accessLevel === "provider" && allowedHomeIds.length) {
    return allowedHomeIds;
  }

  if (Number.isFinite(homeId)) {
    return [homeId];
  }

  if (allowedHomeIds.length) {
    return [allowedHomeIds[0]];
  }

  return [];
}

export async function fetchYoungPersonAssistantBundle(youngPersonId) {
  if (!youngPersonId) {
    return mergeAssistantBundle([]);
  }

  const urls = [
    `/young-people/${youngPersonId}/incidents`,
    `/young-people/${youngPersonId}/tasks`,
    `/young-people/${youngPersonId}/health`,
    `/young-people/${youngPersonId}/education`,
    `/young-people/${youngPersonId}/family`,
    `/young-people/${youngPersonId}/appointments`,
    `/young-people/${youngPersonId}/reports`,
    `/young-people/${youngPersonId}/timeline`,
    `/young-people/${youngPersonId}/plans`,
    `/young-people/${youngPersonId}/compliance`,
    `/young-people/${youngPersonId}/keywork`,
  ];

  const responses = await apiGetSettled(urls);
  return mergeAssistantBundle(responses);
}

export async function fetchHomeAssistantBundle(context = {}) {
  const homeIds = resolveAccessibleHomeIds({
    ...context,
    access_level: "home",
  });

  if (!homeIds.length) {
    return mergeAssistantBundle([]);
  }

  const settledGroups = await Promise.all(homeIds.map((homeId) => fetchHomeWideBundle(homeId)));
  const merged = mergeAssistantBundle(settledGroups.flat());

  merged.scope_meta = {
    ...(merged.scope_meta || {}),
    scope: "home",
    access_level: "home",
    home_ids: homeIds,
  };

  return merged;
}

export async function fetchQualityAssistantBundle(context = {}) {
  const homeIds = resolveAccessibleHomeIds(context);

  if (!homeIds.length) {
    return mergeAssistantBundle([]);
  }

  const settledGroups = await Promise.all(homeIds.map((homeId) => fetchHomeWideBundle(homeId)));
  const merged = mergeAssistantBundle(settledGroups.flat());

  merged.scope_meta = {
    ...(merged.scope_meta || {}),
    scope: "quality",
    access_level:
      String(context.access_level || "").toLowerCase() === "provider"
        ? "provider"
        : "home",
    home_ids: homeIds,
    provider_id: context.provider_id || null,
    selected_home_id: context.home_id || null,
  };

  return merged;
}

export async function fetchAssistantScopeBundle(context = {}) {
  const scope =
    context.scope ||
    context.current_scope ||
    context.scope_type ||
    "child";

  const youngPersonId =
    context.young_person_id ||
    context.person_id ||
    null;

  if (scope === "home") {
    return fetchHomeAssistantBundle(context);
  }

  if (scope === "quality") {
    return fetchQualityAssistantBundle(context);
  }

  return fetchYoungPersonAssistantBundle(youngPersonId);
}

export async function apiRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const resolvedUrl = resolveApiUrl(url, method);
  const isFormData = options.body instanceof FormData;
  const useCache = shouldCacheRequest(method, options);
  const cacheKey = makeCacheKey(method, resolvedUrl);

  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return cached;

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) return inflight;
  }

  const headers = withCsrfHeaders(method, {
    Accept: options.accept || "application/json",
    ...(options.headers || {}),
  });

  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const timeoutMs =
    Number.isFinite(options.timeoutMs) && options.timeoutMs >= 0
      ? options.timeoutMs
      : REQUEST_TIMEOUT_MS;

  const { signal, cleanup } = createTimeoutSignal(
    timeoutMs,
    options.signal,
    "Request timed out"
  );

  const config = buildFetchConfig(method, { ...options, signal }, headers);

  const requestPromise = (async () => {
    let response;

    try {
      response = await fetch(`${API_BASE}${resolvedUrl}`, config);
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(buildAbortMessage(signal, "Request timed out"));
      }
      throw new Error("Network error");
    } finally {
      cleanup();
    }

    const data = await readJsonSafely(response);

    if (!response.ok) {
      const error = new Error(buildErrorMessage(response, data));
      error.status = response.status;
      error.data = data;
      error.url = `${API_BASE}${resolvedUrl}`;
      error.originalUrl = url;
      throw error;
    }

    if (useCache) {
      setCachedResponse(cacheKey, data);
    }

    return data;
  })();

  if (useCache) {
    inflightGetRequests.set(cacheKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (useCache) {
      inflightGetRequests.delete(cacheKey);
    }
  }
}

export async function apiGet(url, options = {}) {
  return apiRequest(url, {
    method: "GET",
    ...options,
  });
}

export async function apiSend(url, method = "POST", body = null, options = {}) {
  const response = await apiRequest(url, {
    method,
    body,
    skipCache: true,
    ...options,
  });

  if (Array.isArray(options.invalidatePrefixes) && options.invalidatePrefixes.length) {
    invalidateCacheByPrefixes(options.invalidatePrefixes);
  } else {
    clearApiCache();
  }

  return response;
}

export async function apiPost(url, body = null, options = {}) {
  return apiSend(url, "POST", body, options);
}

export async function apiPut(url, body = null, options = {}) {
  return apiSend(url, "PUT", body, options);
}

export async function apiPatch(url, body = null, options = {}) {
  return apiSend(url, "PATCH", body, options);
}

export async function apiDelete(url, body = null, options = {}) {
  return apiSend(url, "DELETE", body, options);
}

export function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return response;

  const directKeys = ["item", "record", "data", recordType];

  for (const key of directKeys) {
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
  }

  const commonByType = {
    daily_note: ["daily_note"],
    incident: ["incident"],
    support_plan: ["support_plan", "plan"],
    risk: ["risk", "risk_assessment"],
    health_record: ["health_record"],
    education_record: ["education_record"],
    family_contact: ["family_contact_record", "contact"],
    keywork: ["keywork", "keywork_session"],
    appointment: ["appointment", "young_person_appointment"],
    achievement_record: ["achievement_record", "achievement"],
    safeguarding_record: ["safeguarding_record"],
    missing_episode: ["missing_episode"],
    task: ["task"],
    profile_identity: ["identity_profile", "young_person_identity_profile"],
    profile_communication: ["communication_profile", "young_person_communication_profile"],
    profile_education: ["education_profile", "young_person_education_profile"],
    profile_health: ["health_profile", "young_person_health_profile"],
    profile_legal: ["legal_status", "young_person_legal_status"],
    profile_formulation: ["formulation", "young_person_formulation", "young_person_formulations"],
    communication: ["communication"],
    document: ["document"],
    therapy: ["therapy"],
    team: ["team"],
    supervision: ["supervision"],
    compliance: ["compliance", "compliance_item"],
    audit: ["audit"],
    rota: ["rota_shift", "rota"],
    staffing: ["staffing", "staffing_snapshot"],
    onboarding: ["onboarding"],
    training: ["training_record", "training"],
    probation: ["probation"],
    vacancy: ["vacancy"],
    pipeline: ["pipeline_candidate", "pipeline"],
    shift: ["shift"],
    absence: ["absence"],
    maintenance: ["maintenance_item"],
    finance: ["finance_item"],
    medication: ["medication_item"],
    admission: ["admission"],
    discharge: ["discharge"],
    visitor: ["visitor_log"],
    staff_file: ["staff_file"],
    manager_action: ["manager_action"],
    reg40: ["reg40_item"],
    reg44: ["reg44_item"],
    reg45: ["reg45_item"],
    transport: ["transport_log"],
  };

  const keys = commonByType[recordType] || [];
  for (const key of keys) {
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
  }

  return response;
}

export function buildInspectionUiEndpoints(homeId) {
  const safeHomeId = Number(homeId);
  if (!Number.isFinite(safeHomeId) || safeHomeId <= 0) {
    return null;
  }

  return {
    homeCards: "/inspection/ui/home-cards",
    homeHeader: `/inspection/ui/homes/${safeHomeId}/header`,
    sectionPanels: `/inspection/ui/homes/${safeHomeId}/sections`,
    reasons: `/inspection/ui/homes/${safeHomeId}/reasons`,
    actions: `/inspection/ui/homes/${safeHomeId}/actions`,
    tasks: `/inspection/ui/homes/${safeHomeId}/tasks`,
    briefing: `/inspection/ui/homes/${safeHomeId}/briefing`,
    prep72h: `/inspection/ui/homes/${safeHomeId}/72-hour`,
    refresh: `/inspection/homes/${safeHomeId}/refresh`,
    syncTasks: `/inspection/homes/${safeHomeId}/sync-tasks`,
  };
}

export async function getInspectionHomeCards(options = {}) {
  return apiGet("/inspection/ui/home-cards", options);
}

export async function getInspectionHomeDetail(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.homeHeader, options);
}

export async function getInspectionSectionPanels(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.sectionPanels, options);
}

export async function getInspectionReasons(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.reasons, options);
}

export async function getInspectionActions(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.actions, options);
}

export async function getInspectionTasks(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.tasks, options);
}

export async function getInspectionBriefing(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.briefing, options);
}

export async function getInspection72Hour(homeId, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");
  return apiGet(endpoints.prep72h, options);
}

export async function refreshInspectionCycle(homeId, body = {}, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");

  return apiPost(endpoints.refresh, body, {
    ...options,
    invalidatePrefixes: [
      "/inspection/ui",
      `/inspection/ui/homes/${Number(homeId)}`,
      `/inspection/homes/${Number(homeId)}`,
      "/homes/",
    ],
  });
}

export async function syncInspectionTasks(homeId, body = {}, options = {}) {
  const endpoints = buildInspectionUiEndpoints(homeId);
  if (!endpoints) throw new Error("A valid home id is required.");

  return apiPost(endpoints.syncTasks, body, {
    ...options,
    invalidatePrefixes: [
      "/inspection/ui",
      `/inspection/ui/homes/${Number(homeId)}`,
      `/inspection/homes/${Number(homeId)}`,
      "/homes/",
      "/tasks",
    ],
  });
}

export function buildSseContextFetch(url, payload, options = {}) {
  const timeoutMs =
    Number.isFinite(options.timeoutMs) && options.timeoutMs >= 0
      ? options.timeoutMs
      : SSE_TIMEOUT_MS;

  const { signal, cleanup } = createTimeoutSignal(
    timeoutMs,
    options.signal,
    "Assistant request timed out"
  );

  const request = fetch(`${API_BASE}${url}`, {
    method: "POST",
    credentials: "include",
    signal,
    headers: withCsrfHeaders("POST", {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    }),
    body: JSON.stringify(payload || {}),
  });

  return {
    request,
    cleanup,
    signal,
  };
}

function parseSseBlock(block) {
  const lines = block.split("\n");
  let eventName = "message";
  const dataLines = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;

    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
    }
  }

  return {
    eventName,
    payload: dataLines.join("\n"),
  };
}

function consumeSseBuffer(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const completeBlocks = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of completeBlocks) {
    if (!block.trim()) continue;
    const parsed = parseSseBlock(block);
    onEvent(parsed.eventName, parsed.payload);
  }

  return remainder;
}

function resolveAssistantEndpoint(payload = {}) {
  const assistantType =
    payload?.context?.assistant_type ||
    payload?.assistant_type ||
    null;

  if (assistantType === "public") {
    return "/assistant";
  }

  if (assistantType === "young_people_os") {
    return "/young-people/assistant";
  }

  const scope =
    payload?.context?.scope ||
    payload?.context?.current_scope ||
    payload?.context?.scope_type ||
    "child";

  if (scope === "home") return "/home/assistant";
  if (scope === "quality") return "/quality/assistant";
  if (scope === "child" || scope === "young_person") return "/young-people/assistant";

  return "/assistant";
}

function parseAssistantEventPayload(payloadValue = "") {
  const raw = String(payloadValue || "");
  if (!raw.trim()) {
    return { raw: "", text: "" };
  }

  try {
    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") {
      return { raw, parsed, text: parsed };
    }

    if (parsed && typeof parsed === "object") {
      const text =
        parsed.text ||
        parsed.message ||
        parsed.content?.text ||
        (typeof parsed.content === "string" ? parsed.content : "") ||
        parsed.answer ||
        parsed.output ||
        "";

      return {
        raw,
        parsed,
        text: typeof text === "string" ? text : "",
      };
    }

    return { raw, parsed, text: "" };
  } catch {
    return { raw, text: raw };
  }
}

export async function apiStreamAssistant(payload, handlers = {}, options = {}) {
  const endpoint = resolveAssistantEndpoint(payload);
  const { request, cleanup, signal } = buildSseContextFetch(endpoint, payload, options);

  let response;

  try {
    response = await request;
  } catch (error) {
    cleanup();
    if (isAbortError(error)) {
      throw new Error(buildAbortMessage(signal, "Assistant request timed out"));
    }
    throw new Error("Assistant network error");
  }

  if (!response.ok) {
    cleanup();
    const data = await readJsonSafely(response);
    throw new Error(buildErrorMessage(response, data));
  }

  if (!response.body) {
    cleanup();
    throw new Error("No assistant response stream was returned.");
  }

  const {
    onMeta = () => {},
    onMessage = () => {},
    onProgress = () => {},
    onDone = () => {},
  } = handlers;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedText = "";
  let lastStructuredMessage = null;
  let doneEmitted = false;

  const finish = () => {
    if (doneEmitted) return;
    doneEmitted = true;

    if (lastStructuredMessage && typeof lastStructuredMessage === "object") {
      onDone({
        ...lastStructuredMessage,
        accumulated_text: streamedText,
      });
      return;
    }

    onDone(streamedText);
  };

  const handleEvent = (eventName, payloadValue) => {
    if (payloadValue === "[DONE]" || eventName === "done") {
      finish();
      return;
    }

    if (eventName === "meta") {
      try {
        onMeta(JSON.parse(payloadValue || "{}"));
      } catch {
        onMeta({});
      }
      return;
    }

    if (eventName === "progress") {
      onProgress(payloadValue || "");
      return;
    }

    if (eventName === "message") {
      const parsedEvent = parseAssistantEventPayload(payloadValue);

      if (parsedEvent.text) {
        streamedText += parsedEvent.text;
      }

      if (parsedEvent.parsed && typeof parsedEvent.parsed === "object") {
        lastStructuredMessage = parsedEvent.parsed;
        onMessage({
          ...parsedEvent.parsed,
          accumulated_text: streamedText,
        });
        return;
      }

      onMessage(streamedText);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = consumeSseBuffer(buffer, handleEvent);
    }

    if (buffer.trim()) {
      consumeSseBuffer(`${buffer}\n\n`, handleEvent);
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(buildAbortMessage(signal, "Assistant request timed out"));
    }
    throw error;
  } finally {
    finish();
    cleanup();
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}
