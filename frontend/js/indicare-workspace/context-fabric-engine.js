const CONTEXT_FABRIC_EVENT = "indicare:context-fabric-update";
const CONTEXT_FABRIC_STORAGE = "indicare.context.fabric";

const initialFabric = {
  home: null,
  child: null,
  operationalMemory: null,
  workflow: {
    activeSurface: "child-workspace",
    activeObjectType: null,
    activeObjectId: null,
    lifecycleState: null,
  },
  governance: {
    awaitingReview: 0,
    documentsAwaitingReview: 0,
    recordsAwaitingReview: 0,
  },
  signals: {
    emotionalState: "building picture",
    riskState: "unknown",
    childVoiceGap: false,
    nextAction: "Select a child to begin.",
  },
  updatedAt: null,
};

let fabric = loadFabric();
let refreshTimer = null;

bootContextFabric();

function bootContextFabric() {
  window.IndiCareContextFabric = {
    get: () => ({ ...fabric }),
    set: updateFabric,
    refresh: refreshFabric,
    setWorkflow,
    subscribe,
  };

  window.addEventListener("indicare:context-change", () => refreshFabric());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshFabric();
  });
  refreshFabric();
}

async function refreshFabric() {
  const ctx = context();
  const next = {
    ...fabric,
    home: ctx.homeId ? { id: ctx.homeId, name: ctx.homeName || "Selected home" } : null,
    child: ctx.childId ? {
      id: ctx.childId,
      name: ctx.childName || "Selected child",
      photoUrl: ctx.childPhotoUrl || "",
      riskLevel: ctx.childRiskLevel || "monitor",
      placementStatus: ctx.childPlacementStatus || "active",
    } : null,
    updatedAt: new Date().toISOString(),
  };

  if (ctx.childId) {
    const memory = await getJson(`/operational-memory/children/${encodeURIComponent(ctx.childId)}?days=5`);
    if (memory?.ok) {
      next.operationalMemory = memory;
      next.governance = {
        awaitingReview: memory.governance?.awaiting_review || memory.metrics?.awaiting_review || 0,
        documentsAwaitingReview: memory.governance?.documents_awaiting_review || 0,
        recordsAwaitingReview: memory.governance?.records_awaiting_review || 0,
      };
      next.signals = {
        emotionalState: memory.emotional_state?.dominant || "building picture",
        riskState: memory.risk_state?.level || "unknown",
        childVoiceGap: Boolean(memory.child_voice?.gap),
        nextAction: (memory.next_actions || [])[0] || "Continue recording lived experience, adult response and outcomes.",
      };
    }
  } else {
    next.operationalMemory = null;
    next.governance = { ...initialFabric.governance };
    next.signals = { ...initialFabric.signals };
  }

  commitFabric(next);
  scheduleRefresh();
  return fabric;
}

function updateFabric(partial) {
  commitFabric({ ...fabric, ...partial, updatedAt: new Date().toISOString() });
  return fabric;
}

function setWorkflow(nextWorkflow) {
  updateFabric({ workflow: { ...fabric.workflow, ...nextWorkflow } });
}

function subscribe(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(CONTEXT_FABRIC_EVENT, handler);
  callback({ ...fabric });
  return () => window.removeEventListener(CONTEXT_FABRIC_EVENT, handler);
}

function commitFabric(next) {
  fabric = next;
  try { localStorage.setItem(CONTEXT_FABRIC_STORAGE, JSON.stringify(fabric)); } catch {}
  window.dispatchEvent(new CustomEvent(CONTEXT_FABRIC_EVENT, { detail: { ...fabric } }));
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (document.hidden) return;
  refreshTimer = setTimeout(refreshFabric, 60000);
}

function loadFabric() {
  try {
    return { ...initialFabric, ...(JSON.parse(localStorage.getItem(CONTEXT_FABRIC_STORAGE) || "{}")) };
  } catch {
    return { ...initialFabric };
  }
}

function context() {
  return window.IndiCareContext?.get?.() || { homeId: "", homeName: "", childId: "", childName: "" };
}

async function getJson(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return await response.json();
  } catch {
    return null;
  }
}
