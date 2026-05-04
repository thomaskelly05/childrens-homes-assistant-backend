const DEFAULT_TIMEOUT_MS = 20_000;

export function youngPersonPath(youngPersonId, suffix = "") {
  if (!youngPersonId) throw new Error("No young person selected.");
  return `/young-people/${encodeURIComponent(youngPersonId)}${suffix}`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .map((part) => part.split("="))
    .find(([key]) => decodeURIComponent(key || "") === name)?.[1] || "";
}

function getCsrfToken() {
  if (typeof window.getCsrfToken === "function") return window.getCsrfToken() || "";
  const cookie = getCookie("indicare_csrf");
  if (cookie) return decodeURIComponent(cookie);
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}

function needsCsrf(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

function authRedirect(status) {
  const current = encodeURIComponent(window.location.pathname + window.location.search);
  if (status === 401) window.location.replace(`/login?next=${current}`);
  if (status === 403) window.location.replace(`/access-denied?blocked=${current}`);
}

async function readBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json().catch(() => null);
  return response.text().catch(() => "");
}

function errorMessage(method, path, response, body) {
  if (body && typeof body === "object") {
    return body.detail || body.error || body.message || `${method} ${path} failed with ${response.status}`;
  }
  if (typeof body === "string" && body.trim()) return body.trim();
  return `${method} ${path} failed with ${response.status}`;
}

function buildHeaders(method, headers = {}) {
  const safeHeaders = { Accept: "application/json", ...headers };
  const token = getCsrfToken();
  if (needsCsrf(method) && token && !safeHeaders["X-CSRF-Token"]) {
    safeHeaders["X-CSRF-Token"] = token;
  }
  return safeHeaders;
}

export async function ypApiRequest(path, options = {}) {
  if (typeof window.apiRequest === "function") {
    return window.apiRequest(path, options);
  }

  const method = String(options.method || "GET").toUpperCase();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      ...options,
      method,
      credentials: "include",
      headers: buildHeaders(method, options.headers || {}),
      signal: options.signal || controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      authRedirect(response.status);
      return null;
    }

    const body = await readBody(response);

    if (!response.ok) {
      const error = new Error(errorMessage(method, path, response, body));
      error.status = response.status;
      error.body = body;
      error.path = path;
      throw error;
    }

    return body || {};
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The request timed out. Please check your connection and try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function ypApiGet(path, options = {}) {
  return ypApiRequest(path, options);
}

export function ypApiPost(path, payload = {}, options = {}) {
  return ypApiRequest(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
}

export async function ypAssistantStream(payload = {}, handlers = {}) {
  const response = await fetch("/assistant/os/young-people/stream", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(getCsrfToken() ? { "X-CSRF-Token": getCsrfToken() } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    authRedirect(response.status);
    return;
  }

  if (!response.ok || !response.body) {
    const body = await readBody(response);
    throw new Error(errorMessage("POST", "/assistant/os/young-people/stream", response, body));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      let event = "message";
      let data = "";

      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }

      if (event === "meta") handlers.onMeta?.(safeJson(data));
      else if (event === "token") handlers.onToken?.(data);
      else if (event === "done") handlers.onDone?.(safeJson(data));
      else if (event === "error") handlers.onError?.(safeJson(data));
      else if (data) handlers.onToken?.(data);
    }
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}
