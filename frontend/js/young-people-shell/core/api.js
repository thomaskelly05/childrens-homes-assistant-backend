function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + escaped + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : "";
}

export function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

export function withCsrfHeaders(method, headers = {}) {
  const next = { ...headers };
  const upper = String(method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
    const token = getCsrfToken();
    if (token) {
      next["X-CSRF-Token"] = token;
    }
  }

  return next;
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

export function resolveApiUrl(url) {
  if (!url || typeof url !== "string") return url;

  for (const [pattern, replacement] of API_ROUTE_ALIASES) {
    if (pattern.test(url)) {
      return url.replace(pattern, replacement);
    }
  }

  return url;
}

async function parseErrorResponse(response) {
  let message = `Request failed (${response.status})`;

  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await response.json();
      message = body.detail || body.error || body.message || message;
    } else {
      const text = await response.text();
      if (text && text.trim()) {
        message = text.trim();
      }
    }
  } catch {
    // keep default message
  }

  return message;
}

async function parseJsonSafe(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function apiGet(url) {
  const resolvedUrl = resolveApiUrl(url);

  if (typeof window.apiRequest === "function") {
    return window.apiRequest(resolvedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  const response = await fetch(resolvedUrl, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return parseJsonSafe(response);
}

export async function apiSend(url, method = "POST", body = null) {
  if (typeof window.apiRequest === "function") {
    return window.apiRequest(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    });
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: withCsrfHeaders(method, {
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return parseJsonSafe(response);
}

export function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return null;

  const map = {
    daily_note: response.daily_note,
    incident: response.incident,
    risk: response.risk || response.risk_assessment,
    support_plan: response.support_plan || response.plan,
    appointment: response.appointment,
  };

  return map[recordType] || response;
}

export function buildSseContextFetch(url, payload) {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: withCsrfHeaders("POST", {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    }),
    body: JSON.stringify(payload),
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
    throw new Error(await parseErrorResponse(response));
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

    if (done) {
      break;
    }

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
