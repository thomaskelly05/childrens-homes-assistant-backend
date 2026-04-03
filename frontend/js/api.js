const API_BASE = window.location.origin;

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

function getCsrfToken() {
  return (
    getCookie("__Host-indicare_csrf") ||
    getCookie("indicare_csrf") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const isFormData = options.body instanceof FormData;
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (needsCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  } catch (_) {
    throw new Error("Network error");
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (
    contentType.includes("application/json") ||
    contentType.includes("application/problem+json")
  ) {
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { detail: text } : null;
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.error ||
      (response.status === 401
        ? "Authentication required"
        : response.status === 403
          ? "Access denied"
          : response.status === 404
            ? "Not found"
            : response.status >= 500
              ? "Server error"
              : "Request failed");

    throw new Error(message);
  }

  return data ?? response;
}

window.apiRequest = apiRequest;
window.getCsrfToken = getCsrfToken;
