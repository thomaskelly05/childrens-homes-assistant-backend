const API_BASE = window.location.origin;

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
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
