const EVENT_LOG_KEY = "indicare.os.eventLog.v1";
const MAX_EVENT_LOG = 120;

const subscribers = new Map();
let eventLog = loadEventLog();

function publish(type, payload = {}, options = {}) {
  const event = {
    id: createEventId(),
    type,
    payload,
    source: options.source || "indicare-os",
    scope: options.scope || inferScope(type),
    createdAt: new Date().toISOString(),
  };

  eventLog = [event, ...eventLog].slice(0, MAX_EVENT_LOG);
  persistEventLog();
  notify(type, event);
  notify("*", event);
  window.dispatchEvent(new CustomEvent("indicare:continuity-event", { detail: event }));
  return event;
}

function subscribe(type, callback) {
  if (typeof callback !== "function") return () => {};
  const key = type || "*";
  const set = subscribers.get(key) || new Set();
  set.add(callback);
  subscribers.set(key, set);
  return () => set.delete(callback);
}

function getEvents(filter = {}) {
  return eventLog.filter((event) => {
    if (filter.type && event.type !== filter.type) return false;
    if (filter.scope && event.scope !== filter.scope) return false;
    if (filter.childId && event.payload?.childId !== filter.childId) return false;
    if (filter.homeId && event.payload?.homeId !== filter.homeId) return false;
    return true;
  });
}

function clearEvents() {
  eventLog = [];
  persistEventLog();
  window.dispatchEvent(new CustomEvent("indicare:continuity-events-cleared"));
}

function notify(type, event) {
  (subscribers.get(type) || []).forEach((callback) => {
    try {
      callback(event);
    } catch (error) {
      console.warn("IndiCare event subscriber failed", error);
    }
  });
}

function inferScope(type) {
  if (String(type).startsWith("provider.")) return "provider";
  if (String(type).startsWith("home.")) return "home";
  if (String(type).startsWith("governance.")) return "governance";
  if (String(type).startsWith("safeguarding.")) return "safeguarding";
  if (String(type).startsWith("document.")) return "document";
  return "child";
}

function loadEventLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(EVENT_LOG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persistEventLog() {
  localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(eventLog));
}

function createEventId() {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

window.IndiCareEventBus = {
  publish,
  subscribe,
  getEvents,
  clearEvents,
};

publish("runtime.eventBus.booted", { message: "Continuity event bus active" }, { source: "indicare-event-bus", scope: "system" });
