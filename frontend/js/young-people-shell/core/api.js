const API_BASE = window.location.origin;

const GET_CACHE_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;

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
  // ------------------------------
  // Young person aliases
  // ------------------------------
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],
  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/timeline?limit=12"],

  // Health
  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/health"],

  // Education
  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],

  // Family
  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],

  // Timeline / safeguarding
  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/safeguarding$/, "/young-people/$1/incidents"],

  // Readiness / action fallbacks
  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/child-compliance$/, "/young-people/$1/compliance"],

  // Planning / risk
  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/plans"],

  // Reports
  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],

  // Optional child routes
  [/\/young-people\/(\d+)\/communications$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/therapy$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/keywork$/, "/young-people/$1/keywork"],

  // ------------------------------
  // Home aliases
  // ------------------------------
  [/\/homes\/(\d+)\/young-people$/, "/homes/$1/dashboard"],
  [/\/homes\/(\d+)\/quality-dashboard$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance-dashboard$/, "/homes/$1/compliance"],

  // Stable direct home routes
  [/\/homes\/(\d+)\/communications$/, "/homes/$1/communications"],
  [/\/homes\/(\d+)\/documents$/, "/homes/$1/documents"],
  [/\/homes\/(\d+)\/therapy$/, "/homes/$1/therapy"],
  [/\/homes\/(\d+)\/team$/, "/homes/$1/team"],
  [/\/homes\/(\d+)\/supervisions$/, "/homes/$1/supervisions"],
  [/\/homes\/(\d+)\/reports$/, "/homes/$1/reports"],
  [/\/homes\/(\d+)\/quality$/, "/homes/$1/quality"],
  [/\/homes\/(\d+)\/compliance$/, "/homes/$1/compliance"],
  [/\/homes\/(\d+)\/rota$/, "/homes/$1/rota"],
  [/\/homes\/(\d+)\/staffing$/, "/homes/$1/staffing"],
  [/\/homes\/(\d+)\/onboarding$/, "/homes/$1/onboarding"],
  [/\/homes\/(\d+)\/training$/, "/homes/$1/training"],
  [/\/homes\/(\d+)\/probations$/, "/homes/$1/probations"],
  [/\/homes\/(\d+)\/vacancies$/, "/homes/$1/vacancies"],
  [/\/homes\/(\d+)\/pipeline$/, "/homes/$1/pipeline"],
  [/\/homes\/(\d+)\/shifts$/, "/homes/$1/shifts"],
  [/\/homes\/(\d+)\/absences$/, "/homes/$1/absences"],
  [/\/homes\/(\d+)\/maintenance$/, "/homes/$1/maintenance"],
  [/\/homes\/(\d+)\/finance$/, "/homes/$1/finance"],
  [/\/homes\/(\d+)\/medication$/, "/homes/$1/medication"],
  [/\/homes\/(\d+)\/admissions$/, "/homes/$1/admissions"],
  [/\/homes\/(\d+)\/discharges$/, "/homes/$1/discharges"],
  [/\/homes\/(\d+)\/visitors$/, "/homes/$1/visitors"],
  [/\/homes\/(\d+)\/staff-files$/, "/homes/$1/staff-files"],
  [/\/homes\/(\d+)\/audits$/, "/homes/$1/audits"],
  [/\/homes\/(\d+)\/manager-actions$/, "/homes/$1/manager-actions"],
  [/\/homes\/(\d+)\/reg40$/, "/homes/$1/reg40"],
  [/\/homes\/(\d+)\/reg44$/, "/homes/$1/reg44"],
  [/\/homes\/(\d+)\/reg45$/, "/homes/$1/reg45"],
  [/\/homes\/(\d+)\/daily-notes$/, "/homes/$1/daily-notes"],
  [/\/homes\/(\d+)\/incidents$/, "/homes/$1/incidents"],
  [/\/homes\/(\d+)\/keywork$/, "/homes/$1/keywork"],
  [/\/homes\/(\d+)\/transport$/, "/homes/$1/transport"],

  // Backwards-compatible fallbacks
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

  for (const [pattern, replacement] of API_ROUTE_ALIASES) {
    if (pattern.test(url)) {
      return url.replace(pattern, replacement);
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
  const nextHeaders = {
    ...(headers || {}),
  };

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

function createTimeoutSignal(timeoutMs, externalSignal) {
  if (!timeoutMs && !externalSignal) {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  let timeoutId = null;

  const abortFromExternal = () => {
    try {
      controller.abort();
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
    timeoutId = window.setTimeout(() => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
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
      "",
  ].join("::");
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
      if (Array.isArray(data[sourceKey])) {
        pushUniqueByKey(target, data[sourceKey], recordKey);
      }
    }

    if (data.staffing) {
      const staffingArray = Array.isArray(data.staffing) ? data.staffing : [data.staffing];
      pushUniqueByKey(bundle.staffing, staffingArray, recordKey);
    }

    if (data.home && !bundle.home) {
      bundle.home = data.home;
    }

    if (data.summary && typeof data.summary === "object") {
      bundle.summary = {
        ...bundle.summary,
        ...data.summary,
      };
    }
  }

  return bundle;
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

export async function fetchHomeAssistantBundle(homeId) {
  if (!homeId) {
    return mergeAssistantBundle([]);
  }

  const urls = [
    `/homes/${homeId}/dashboard`,
    `/homes/${homeId}/team`,
    `/homes/${homeId}/documents`,
    `/homes/${homeId}/therapy`,
    `/homes/${homeId}/communications`,
    `/homes/${homeId}/supervisions`,
    `/homes/${homeId}/reports`,
    `/homes/${homeId}/quality`,
    `/homes/${homeId}/compliance`,
    `/homes/${homeId}/rota`,
    `/homes/${homeId}/staffing`,
    `/homes/${homeId}/onboarding`,
    `/homes/${homeId}/training`,
    `/homes/${homeId}/probations`,
    `/homes/${homeId}/vacancies`,
    `/homes/${homeId}/pipeline`,
    `/homes/${homeId}/shifts`,
    `/homes/${homeId}/absences`,
    `/homes/${homeId}/maintenance`,
    `/homes/${homeId}/finance`,
    `/homes/${homeId}/medication`,
    `/homes/${homeId}/admissions`,
    `/homes/${homeId}/discharges`,
    `/homes/${homeId}/visitors`,
    `/homes/${homeId}/staff-files`,
    `/homes/${homeId}/audits`,
    `/homes/${homeId}/manager-actions`,
    `/homes/${homeId}/reg40`,
    `/homes/${homeId}/reg44`,
    `/homes/${homeId}/reg45`,
    `/homes/${homeId}/daily-notes`,
    `/homes/${homeId}/incidents`,
    `/homes/${homeId}/keywork`,
    `/homes/${homeId}/transport`,
  ];

  const responses = await apiGetSettled(urls);
  return mergeAssistantBundle(responses);
}

export async function fetchQualityAssistantBundle(homeId) {
  return fetchHomeAssistantBundle(homeId);
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

  const homeId =
    context.home_id ||
    null;

  if (scope === "home") {
    return fetchHomeAssistantBundle(homeId);
  }

  if (scope === "quality") {
    return fetchQualityAssistantBundle(homeId);
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

  const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
  const config = buildFetchConfig(method, { ...options, signal }, headers);

  const requestPromise = (async () => {
    let response;

    try {
      response = await fetch(`${API_BASE}${resolvedUrl}`, config);
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error("Request timed out");
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

export function buildSseContextFetch(url, payload) {
  return fetch(`${API_BASE}${url}`, {
    method: "POST",
    credentials: "include",
    headers: withCsrfHeaders("POST", {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    }),
    body: JSON.stringify(payload || {}),
  });
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
  const scope =
    payload?.context?.scope ||
    payload?.context?.current_scope ||
    payload?.context?.scope_type ||
    "child";

  if (scope === "home") return "/home/assistant";
  if (scope === "quality") return "/quality/assistant";
  return "/young-people/assistant";
}

export async function apiStreamAssistant(payload, handlers = {}) {
  const endpoint = resolveAssistantEndpoint(payload);
  const response = await buildSseContextFetch(endpoint, payload);

  if (!response.ok) {
    const data = await readJsonSafely(response);
    throw new Error(buildErrorMessage(response, data));
  }

  if (!response.body) {
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
  let doneEmitted = false;

  const finish = () => {
    if (doneEmitted) return;
    doneEmitted = true;
    onDone(streamedText);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      buffer = consumeSseBuffer(buffer, (eventName, payloadValue) => {
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
          streamedText += payloadValue || "";
          onMessage(streamedText);
        }
      });
    }

    if (buffer.trim()) {
      consumeSseBuffer(`${buffer}\n\n`, (eventName, payloadValue) => {
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
          streamedText += payloadValue || "";
          onMessage(streamedText);
        }
      });
    }
  } finally {
    finish();
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}