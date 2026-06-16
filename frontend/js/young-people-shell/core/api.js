const API_BASE = "";

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
  // Young people
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/tasks$/, "/tasks?young_person_id=$1"],
  [/\/young-people\/(\d+)\/actions$/, "/actions?young_person_id=$1&scope=child"],
  [/\/young-people\/(\d+)\/visibility$/, "/visibility/young-people/$1"],

  [/\/young-people\/(\d+)\/daily-notes$/, "/young-people/$1/daily-notes"],
  [/\/young-people\/(\d+)\/daily-life$/, "/young-people/$1/daily-notes"],
  [/\/young-people\/(\d+)\/profile$/, "/young-people/$1/profile"],
  [/\/young-people\/(\d+)\/chronology$/, "/young-people/$1/timeline"],

  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],
  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/handover"],

  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/medication-records"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/medication-records"],

  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],

  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],

  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/safeguarding"],
  [/\/young-people\/(\d+)\/safeguarding$/, "/young-people/$1/safeguarding"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/missing-episodes"],

  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/documents"],
  [/\/young-people\/(\d+)\/statutory-documents$/, "/young-people/$1/statutory-documents"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/child-compliance$/, "/young-people/$1/compliance"],

  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/risk"],
  [/\/young-people\/(\d+)\/risk-assessments$/, "/young-people/$1/risk"],

  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],

  [/\/young-people\/(\d+)\/communications$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/therapy$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/keywork$/, "/young-people/$1/keywork"],

  // Homes - legacy operational routes
  [/\/homes\/(\d+)\/young-people$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/actions$/, "/actions?home_id=$1&scope=home"],
  [/\/homes\/(\d+)\/tasks$/, "/tasks?home_id=$1&scope=home"],
  [/\/homes\/(\d+)\/visibility$/, "/visibility/homes/$1"],

  [/\/homes\/(\d+)\/staff$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/staff-documents$/, "/homes/$1/staff-files"],
  [/\/homes\/(\d+)\/notifications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/safeguarding$/, "/homes/$1/safeguarding"],
  [/\/homes\/(\d+)\/child-compliance$/, "/homes/$1/child-compliance"],

  // Homes - older quality/ofsted/readiness URLs mapped to newer families
  [/\/homes\/(\d+)\/quality-dashboard$/, "/homes/$1/inspection-scores"],
  [/\/homes\/(\d+)\/compliance-dashboard$/, "/homes/$1/compliance-items"],
  [/\/homes\/(\d+)\/inspection evidence preparation$/, "/homes/$1/inspection-improvement-actions"],
  [/\/homes\/(\d+)\/quality$/, "/homes/$1/inspection-scores"],
  [/\/homes\/(\d+)\/compliance$/, "/homes/$1/compliance-items"],
  [/\/homes\/(\d+)\/dashboard$/, "/homes/$1/inspection-scores"],
  [/\/homes\/(\d+)\/ofsted-dashboard$/, "/homes/$1/inspection-scores"],
  [/\/homes\/(\d+)\/sccif-evidence$/, "/homes/$1/inspection-section-scores"],
  [/\/homes\/(\d+)\/judgement-builder$/, "/homes/$1/inspection-lines-of-enquiry"],

  // New inspection / quality families
  [/\/homes\/(\d+)\/quality-audits$/, "/homes/$1/quality-audits"],
  [/\/homes\/(\d+)\/quality-audit-findings$/, "/homes/$1/quality-audit-findings"],
  [/\/homes\/(\d+)\/quality-audit-actions$/, "/homes/$1/quality-audit-actions"],

  [/\/homes\/(\d+)\/compliance-items$/, "/homes/$1/compliance-items"],

  [/\/homes\/(\d+)\/reg44-visits$/, "/homes/$1/reg44-visits"],
  [/\/homes\/(\d+)\/reg44-findings$/, "/homes/$1/reg44-findings"],
  [/\/homes\/(\d+)\/reg44-actions$/, "/homes/$1/reg44-actions"],

  [/\/homes\/(\d+)\/reg45-reviews$/, "/homes/$1/reg45-reviews"],
  [/\/homes\/(\d+)\/reg45-actions$/, "/homes/$1/reg45-actions"],

  [/\/homes\/(\d+)\/inspection-scores$/, "/homes/$1/inspection-scores"],
  [/\/homes\/(\d+)\/inspection-section-scores$/, "/homes/$1/inspection-section-scores"],
  [/\/homes\/(\d+)\/inspection-score-reasons$/, "/homes/$1/inspection-score-reasons"],
  [/\/homes\/(\d+)\/inspection-lines-of-enquiry$/, "/homes/$1/inspection-lines-of-enquiry"],
  [/\/homes\/(\d+)\/inspection-improvement-actions$/, "/homes/$1/inspection-improvement-actions"],

  [/\/homes\/(\d+)\/manager-review-queue$/, "/homes/$1/manager-review-queue"],
];

function shouldResolveAlias(method = "GET") {
  const upper = String(method || "GET").toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

export function resolveApiUrl(url, method = "GET") {
  if (!url || typeof url !== "string") return url;
  if (!shouldResolveAlias(method)) return url;

  const [pathname, queryString = ""] = url.split("?");

  for (const [pattern, replacement] of API_ROUTE_ALIASES) {
    if (pattern.test(pathname)) {
      const rewritten = pathname.replace(pattern, replacement);
      if (!queryString) return rewritten;
      if (rewritten.includes("?")) return `${rewritten}&${queryString}`;
      return `${rewritten}?${queryString}`;
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

function createTimeoutSignal(
  timeoutMs,
  externalSignal,
  timeoutMessage = "Request timed out"
) {
  if (!timeoutMs && !externalSignal) {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  let timeoutId = null;

  const abortFromExternal = () => {
    try {
      controller.abort(externalSignal?.reason);
    } catch {
      // Ignore abort errors.
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
          // Ignore abort errors.
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
          // Ignore cleanup errors.
        }
      }
    },
  };
}

function buildAbortMessage(signal, fallback = "Request timed out") {
  const reason = signal?.reason;

  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason.trim();

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

  const safePrefixes = prefixes
    .filter(Boolean)
    .map((prefix) => resolveApiUrl(prefix, "GET"));

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
  return [
    ...new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    ),
  ];
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
    daily_life: [],
    incidents: [],
    safeguarding_records: [],
    tasks: [],
    health_records: [],
    education_records: [],
    family_contact_records: [],
    family_contacts: [],
    appointments: [],
    young_person_appointments: [],
    monthly_reviews: [],
    handover_records: [],
    handovers: [],
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
    staff_training_records: [],
    probations: [],
    vacancies: [],
    pipeline: [],
    shifts: [],
    absences: [],
    pipeline_candidates: [],
    maintenance: [],
    finance: [],
    medication: [],
    medication_records: [],
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

  const mappings = [
    ["daily_notes", "daily_notes"],
    ["daily_life", "daily_notes"],
    ["dailyNotes", "daily_notes"],
    ["incidents", "incidents"],
    ["home_incidents", "home_incidents"],
    ["safeguarding_records", "safeguarding_records"],
    ["safeguarding", "safeguarding_records"],
    ["tasks", "tasks"],
    ["health_records", "health_records"],
    ["education_records", "education_records"],
    ["family_contact_records", "family_contact_records"],
    ["family_contacts", "family_contact_records"],
    ["appointments", "appointments"],
    ["young_person_appointments", "appointments"],
    ["monthly_reviews", "monthly_reviews"],
    ["handover_records", "handover_records"],
    ["handover", "handover_records"],
    ["handovers", "handover_records"],
    ["timeline", "chronology_events"],
    ["chronology_events", "chronology_events"],
    ["risk", "risk_assessments"],
    ["risk_assessments", "risk_assessments"],
    ["risks", "risk_assessments"],
    ["support_plans", "support_plans"],
    ["compliance_items", "compliance_items"],
    ["documents", "documents"],
    ["statutory_documents", "statutory_documents"],
    ["communications", "communications"],
    ["therapy", "therapy"],
    ["therapy_records", "therapy_records"],
    ["team", "team"],
    ["staff", "team"],
    ["supervisions", "supervisions"],
    ["reports", "reports"],
    ["rota", "rota"],
    ["onboarding", "onboarding"],
    ["training", "training"],
    ["staff_training_records", "training"],
    ["probations", "probations"],
    ["vacancies", "vacancies"],
    ["pipeline", "pipeline"],
    ["pipeline_candidates", "pipeline_candidates"],
    ["shifts", "shifts"],
    ["absences", "absences"],
    ["maintenance", "maintenance"],
    ["finance", "finance"],
    ["medication", "medication"],
    ["medication_records", "medication_records"],
    ["admissions", "admissions"],
    ["discharges", "discharges"],
    ["visitors", "visitors"],
    ["staff_files", "staff_files"],
    ["audits", "audits"],
    ["manager_actions", "manager_actions"],
    ["reg40", "reg40"],
    ["reg44", "reg44"],
    ["reg45", "reg45"],
    ["keywork", "keywork"],
    ["transport", "transport"],
    ["young_people", "young_people"],
    ["alerts", "alerts"],
  ];

  for (const response of responses) {
    if (!response?.ok || !response.data || typeof response.data !== "object") {
      continue;
    }

    const data = response.data;

    if (Array.isArray(data.items)) {
      pushUniqueByKey(bundle.items, data.items, recordKey);
    }

    for (const [sourceKey, targetKey] of mappings) {
      const items = toArray(data[sourceKey]);
      if (items.length) {
        pushUniqueByKey(bundle[targetKey], items, recordKey);
      }
    }

    if (data.staffing) {
      const staffingArray = Array.isArray(data.staffing)
        ? data.staffing
        : [data.staffing];
      pushUniqueByKey(bundle.staffing, staffingArray, recordKey);
    }

    if (data.home && typeof data.home === "object") {
      if (!bundle.home) bundle.home = data.home;
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
    `/homes/${homeId}/inspection-scores`,
    `/homes/${homeId}/daily-notes`,
    `/homes/${homeId}/appointments`,
    `/homes/${homeId}/team`,
    `/homes/${homeId}/tasks`,
    `/homes/${homeId}/communications`,
    `/homes/${homeId}/documents`,
    `/homes/${homeId}/supervisions`,
    `/homes/${homeId}/reports`,
    `/homes/${homeId}/safeguarding`,
    `/homes/${homeId}/compliance-items`,
    `/homes/${homeId}/quality-audits`,
    `/homes/${homeId}/inspection-improvement-actions`,
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

  if (Number.isFinite(homeId) && homeId > 0) return [homeId];
  if (allowedHomeIds.length) return [allowedHomeIds[0]];

  return [];
}

export async function fetchYoungPersonAssistantBundle(youngPersonId) {
  if (!youngPersonId) {
    return mergeAssistantBundle([]);
  }

  const urls = [
    `/young-people/${youngPersonId}/daily-notes`,
    `/young-people/${youngPersonId}/incidents`,
    `/young-people/${youngPersonId}/safeguarding`,
    `/young-people/${youngPersonId}/tasks`,
    `/young-people/${youngPersonId}/health`,
    `/young-people/${youngPersonId}/education`,
    `/young-people/${youngPersonId}/family`,
    `/young-people/${youngPersonId}/appointments`,
    `/young-people/${youngPersonId}/reports`,
    `/young-people/${youngPersonId}/timeline`,
    `/young-people/${youngPersonId}/risk`,
    `/young-people/${youngPersonId}/plans`,
    `/young-people/${youngPersonId}/compliance`,
    `/young-people/${youngPersonId}/keywork`,
    `/young-people/${youngPersonId}/missing-episodes`,
    `/young-people/${youngPersonId}/medication-records`,
    `/young-people/${youngPersonId}/documents`,
    `/young-people/${youngPersonId}/statutory-documents`,
    `/young-people/${youngPersonId}/handover`,
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

  const settledGroups = await Promise.all(
    homeIds.map((homeId) => fetchHomeWideBundle(homeId))
  );
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

  const settledGroups = await Promise.all(
    homeIds.map((homeId) => fetchHomeWideBundle(homeId))
  );
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
  const scope = context.scope || context.current_scope || context.scope_type || "child";
  const youngPersonId = context.young_person_id || context.person_id || null;

  if (scope === "home") return fetchHomeAssistantBundle(context);
  if (scope === "quality") return fetchQualityAssistantBundle(context);

  if (scope === "ofsted") {
    return fetchQualityAssistantBundle({
      ...context,
      scope: "quality",
      current_scope: "quality",
      scope_type: "quality",
      access_level: String(context.access_level || "").toLowerCase() || "provider",
    });
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
      error.url = resolvedUrl;
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

  if (
    Array.isArray(options.invalidatePrefixes) &&
    options.invalidatePrefixes.length
  ) {
    invalidateCacheByPrefixes(options.invalidatePrefixes);
  } else if (method !== "GET") {
    clearApiCache();
  }

  return response;
}

export function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return response;

  const directKeys = ["item", "record", "data", recordType];

  for (const key of directKeys) {
    if (response[key] && typeof response[key] === "object") {
      return response[key];
    }
  }

  return response;
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

  const request = fetch(url, {
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
    payload?.context?.assistant_type || payload?.assistant_type || null;

  if (assistantType === "public" || assistantType === "general") {
    return "/assistant/general/stream";
  }

  if (assistantType === "young_people_os") {
    return "/assistant/os/young-people/stream";
  }

  const scope =
    payload?.context?.scope ||
    payload?.context?.current_scope ||
    payload?.context?.scope_type ||
    "child";

  if (scope === "home") return "/assistant/os/home/stream";
  if (scope === "quality") return "/assistant/os/quality/stream";
  if (scope === "ofsted") return "/assistant/os/quality/stream";
  if (scope === "child" || scope === "young_person") {
    return "/assistant/os/young-people/stream";
  }

  return "/assistant/os/young-people/stream";
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
  const { request, cleanup, signal } = buildSseContextFetch(
    endpoint,
    payload,
    options
  );

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

    buffer += decoder.decode();
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
      // Ignore release errors.
    }
  }
}
