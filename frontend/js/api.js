const API_BASE = window.location.origin;

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

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
    throw new Error(
      data?.detail ||
      data?.error ||
      "Request failed"
    );
  }

  return data ?? response;
}
