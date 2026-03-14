const API_BASE = window.location.origin;

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const data = await response.json();
      message = data.detail || message;
    } catch (err) {
      // ignore parse failure
    }

    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";

  if (
    contentType.includes("application/json") ||
    contentType.includes("application/problem+json")
  ) {
    return await response.json();
  }

  return response;
}
