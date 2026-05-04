export function youngPersonPath(youngPersonId, suffix = "") {
  if (!youngPersonId) throw new Error("No young person selected.");
  return `/young-people/${encodeURIComponent(youngPersonId)}${suffix}`;
}

export async function ypApiRequest(path, options = {}) {
  if (typeof window.apiRequest === "function") {
    return window.apiRequest(path, options);
  }

  const response = await fetch(path, {
    ...options,
    credentials: "include",
  });

  if (response.status === 401) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
    return null;
  }

  if (response.status === 403) {
    const blocked = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/access-denied?blocked=${blocked}`);
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `Request failed with ${response.status}`);
  }

  return data;
}

export function ypApiGet(path) {
  return ypApiRequest(path);
}

export function ypApiPost(path, payload = {}) {
  return ypApiRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

export async function ypAssistantStream(payload = {}, handlers = {}) {
  const response = await fetch("/assistant/os/young-people/stream", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(window.getCsrfToken?.() ? { "X-CSRF-Token": window.getCsrfToken() } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    await ypApiRequest("/assistant/os/young-people/stream", { method: "GET" });
    return;
  }

  if (!response.ok || !response.body) {
    throw new Error(`Assistant stream failed with ${response.status}`);
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
