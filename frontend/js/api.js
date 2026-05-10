const API_BASE = window.location.origin;

let refreshInFlight = null;

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + escaped + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

function isAuthPath(path) {
  return String(path || "").startsWith("/auth/");
}

function redirectToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
}

function redirectToAccessDenied() {
  const blocked = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/access-denied?blocked=${blocked}`);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
    try { return await response.json(); } catch (_) { return null; }
  }
  try {
    const text = await response.text();
    return text ? { detail: text } : null;
  } catch (_) {
    return null;
  }
}

function buildHeaders(method, body, providedHeaders = {}) {
  const isFormData = body instanceof FormData;
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const headers = { ...providedHeaders };

  if (!isFormData && body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (needsCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

async function rawApiFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = buildHeaders(method, options.body, options.headers || {});
  return fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}

async function refreshSession() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await rawApiFetch("/auth/refresh", { method: "POST" });
      return response.ok;
    } catch (_) {
      return false;
    } finally {
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();

  return refreshInFlight;
}

async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await rawApiFetch(path, options);
  } catch (_) {
    throw new Error("Network error");
  }

  if (response.status === 401 && !options.__retriedAfterRefresh && !isAuthPath(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest(path, { ...options, __retriedAfterRefresh: true });
    }
    redirectToLogin();
    return;
  }

  if (response.status === 401) {
    if (!isAuthPath(path)) redirectToLogin();
    const data = await parseResponse(response);
    throw new Error(data?.detail || data?.error || "Authentication required");
  }

  if (response.status === 403) {
    const data = await parseResponse(response);
    const detail = data?.detail;
    const code = typeof detail === "object" ? detail.code : data?.code;
    if (code === "step_up_required") {
      throw new Error("Recent verification required");
    }
    if (!isAuthPath(path)) redirectToAccessDenied();
    throw new Error((typeof detail === "string" && detail) || data?.error || "Access denied");
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      (typeof detail === "string" && detail) ||
      data?.error ||
      (response.status >= 500 ? "Server error" : "Request failed");
    throw new Error(message);
  }

  return data ?? response;
}

window.apiRequest = apiRequest;
window.getCsrfToken = getCsrfToken;
window.refreshSession = refreshSession;
