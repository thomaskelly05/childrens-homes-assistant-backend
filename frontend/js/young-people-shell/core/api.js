const API_BASE = window.location.origin;

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
  return `Request failed (${response.status})`;
}

const API_ROUTE_ALIASES = [
  [/\/young-people\/(\d+)\/alerts$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/health-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/education-records$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/family-contact-records$/, "/young-people/$1/family"],
  [/\/young-people\/(\d+)\/safeguarding-records$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/missing-episodes$/, "/young-people/$1/incidents"],
  [/\/young-people\/(\d+)\/handover-records$/, "/young-people/$1/timeline?limit=12"],
  [/\/young-people\/(\d+)\/medication-profiles$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/medication-records$/, "/young-people/$1/health"],
  [/\/young-people\/(\d+)\/achievements$/, "/young-people/$1/education"],
  [/\/young-people\/(\d+)\/young-person-appointments$/, "/young-people/$1/appointments"],
  [/\/young-people\/(\d+)\/inspection-packs$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/monthly-reviews$/, "/young-people/$1/reports"],
  [/\/young-people\/(\d+)\/readiness$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/tasks$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/approvals$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/documents$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-review$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/manager-actions$/, "/young-people/$1/compliance"],
  [/\/young-people\/(\d+)\/risks$/, "/young-people/$1/plans"],
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

export async function apiRequest(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const resolvedUrl = resolveApiUrl(url, method);
  const isFormData = options.body instanceof FormData;

  const headers = withCsrfHeaders(method, {
    Accept: "application/json",
    ...(options.headers || {}),
  });

  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    credentials: "include",
    ...options,
    method,
    headers,
  };

  if (config.body && typeof config.body !== "string" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${resolvedUrl}`, config);
  } catch {
    throw new Error("Network error");
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

  return data;
}

export async function apiGet(url) {
  return apiRequest(url, {
    method: "GET",
  });
}

export async function apiSend(url, method = "POST", body = null) {
  return apiRequest(url, {
    method,
    body,
  });
}

export function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return response;

  const directKeys = [
    recordType,
    "item",
    "record",
    "data",
  ];

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
    profile_formulation: [
      "formulation",
      "young_person_formulation",
      "young_person_formulations",
    ],
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

export async function apiStreamAssistant(payload, handlers = {}) {
  const response = await buildSseContextFetch("/young-people/assistant", payload);

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

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    buffer = consumeSseBuffer(buffer, (eventName, payloadValue) => {
      if (payloadValue === "[DONE]" || eventName === "done") {
        onDone(streamedText);
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
    buffer = consumeSseBuffer(`${buffer}\n\n`, (eventName, payloadValue) => {
      if (payloadValue === "[DONE]" || eventName === "done") {
        onDone(streamedText);
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

  onDone(streamedText);
}
