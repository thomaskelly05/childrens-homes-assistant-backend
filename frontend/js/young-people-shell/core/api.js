function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + escaped + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

function withCsrfHeaders(method, headers = {}) {
  const next = { ...headers };
  const upper = String(method || "GET").toUpperCase();

  if (["POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
    const token = getCsrfToken();
    if (token) next["X-CSRF-Token"] = token;
  }

  return next;
}

export async function apiGet(url) {
  if (typeof window.apiRequest === "function") {
    return window.apiRequest(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}

export async function apiSend(url, method, body) {
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
    let message = `Request failed (${response.status})`;
    try {
      const parsed = await response.json();
      message = parsed.detail || parsed.error || message;
    } catch {}
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
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
