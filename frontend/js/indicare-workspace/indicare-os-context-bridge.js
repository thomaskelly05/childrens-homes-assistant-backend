import { loadOsContext, getOsContext, getOperationalSession, scopeContextToSession } from "./indicare-os-context.js";

const BRIDGE_STATE = {
  lastSyncAt: 0,
  syncInFlight: null,
};

bootContextBridge();

function bootContextBridge() {
  syncContext({ force: false });
  window.addEventListener("indicare:refresh-live-os", () => syncContext({ force: true }));
  document.addEventListener("click", handleContextSensitiveClick, true);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - BRIDGE_STATE.lastSyncAt > 60000) syncContext({ force: true });
  });
}

function handleContextSensitiveClick(event) {
  if (event.target.closest?.(".sp-ai-bubble") || event.target.closest?.("[data-open-ai-handover]") || event.target.closest?.("[data-open-ai-report]") || event.target.closest?.("[data-open-ai-chronology]") || event.target.closest?.("[data-open-ai-safeguarding]")) {
    syncContext({ force: false });
  }
}

async function syncContext({ force = false } = {}) {
  if (BRIDGE_STATE.syncInFlight) return BRIDGE_STATE.syncInFlight;
  BRIDGE_STATE.syncInFlight = (async () => {
    const context = await loadOsContext({ force });
    const session = getOperationalSession();
    const scoped = scopeContextToSession(context, session);
    window.IndiCareLiveContext = context;
    window.IndiCareScopedOSContext = scoped;
    window.IndiCareOperationalSession = session;
    window.dispatchEvent(new CustomEvent("indicare:os-context-ready", { detail: { context, scoped, session } }));
    BRIDGE_STATE.lastSyncAt = Date.now();
    BRIDGE_STATE.syncInFlight = null;
    return { context, scoped, session };
  })();
  return BRIDGE_STATE.syncInFlight;
}

window.IndiCareOSContextBridge = {
  syncContext,
  getContext: getOsContext,
  getScopedContext: () => window.IndiCareScopedOSContext || scopeContextToSession(getOsContext(), getOperationalSession()),
};
