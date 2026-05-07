const RUNTIME_STORAGE_KEY = "indicare.os.runtime.v1";

const defaultRuntimeState = {
  mode: "finished-shell",
  activeLayer: "child",
  activeView: "continuity-workspace",
  selectedHome: {
    id: "demo-home-meadow",
    name: "Meadow House",
    climate: "steady with elevated contact pressure",
    safeguardingIntensity: "moderate",
    staffingContinuity: "good",
  },
  selectedChild: {
    id: "demo-child-jamie",
    name: "Jamie",
    age: 15,
    emotionalState: "settled but watchful",
    riskState: "moderate",
    voiceState: "visible",
    placementStatus: "active",
    trustedAdult: "Sam",
  },
  governance: {
    awaitingReview: 2,
    draftDocuments: 3,
    approvedEvidence: 12,
    nextReview: "Behaviour Support Plan manager review",
  },
  signals: {
    nextAction: "Review behaviour support plan after family contact pattern.",
    continuityQuality: 74,
    emotionalTrend: "watchful after contact",
    safeguardingSignal: "monitor peer contact and missing-risk indicators",
    resilienceSignal: "football and trusted adult humour are protective factors",
  },
  featureFlags: {
    finishedShellDefault: true,
    liveDataWiring: false,
    narrativeOsPreview: true,
    continuityGraphPreview: true,
  },
};

let state = loadRuntimeState();
const listeners = new Set();

function loadRuntimeState() {
  try {
    const stored = JSON.parse(localStorage.getItem(RUNTIME_STORAGE_KEY) || "null");
    return deepMerge(defaultRuntimeState, stored || {});
  } catch {
    return structuredCloneSafe(defaultRuntimeState);
  }
}

function saveRuntimeState() {
  localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(state));
}

function getRuntimeState() {
  return structuredCloneSafe(state);
}

function setRuntimeState(patch = {}, options = {}) {
  state = deepMerge(state, patch);
  if (!options.skipSave) saveRuntimeState();
  notifyRuntimeChange(options.reason || "state-update");
  return getRuntimeState();
}

function resetRuntimeState() {
  state = structuredCloneSafe(defaultRuntimeState);
  saveRuntimeState();
  notifyRuntimeChange("reset");
  return getRuntimeState();
}

function subscribeRuntimeState(callback) {
  if (typeof callback !== "function") return () => {};
  listeners.add(callback);
  callback(getRuntimeState(), "initial");
  return () => listeners.delete(callback);
}

function notifyRuntimeChange(reason) {
  const snapshot = getRuntimeState();
  listeners.forEach((listener) => listener(snapshot, reason));
  window.dispatchEvent(new CustomEvent("indicare:runtime-state-change", { detail: { state: snapshot, reason } }));
}

function setActiveChild(child = {}) {
  return setRuntimeState({
    activeLayer: "child",
    activeView: "continuity-workspace",
    selectedChild: {
      id: child.id || child.young_person_id || child.childId || state.selectedChild.id,
      name: child.preferred_name || child.name || child.full_name || child.childName || state.selectedChild.name,
      age: child.age || state.selectedChild.age,
      emotionalState: child.emotional_state || child.emotionalState || state.selectedChild.emotionalState,
      riskState: child.risk_state || child.risk_level || child.riskState || state.selectedChild.riskState,
      voiceState: child.voice_state || child.voiceState || state.selectedChild.voiceState,
      placementStatus: child.placement_status || child.placementStatus || state.selectedChild.placementStatus,
      trustedAdult: child.trusted_adult || child.trustedAdult || state.selectedChild.trustedAdult,
    },
  }, { reason: "active-child" });
}

function setActiveHome(home = {}) {
  return setRuntimeState({
    activeLayer: "home",
    activeView: "home-overview",
    selectedHome: {
      id: home.id || home.home_id || home.homeId || state.selectedHome.id,
      name: home.name || home.homeName || state.selectedHome.name,
      climate: home.climate || home.emotional_climate || state.selectedHome.climate,
      safeguardingIntensity: home.safeguarding_intensity || home.safeguardingIntensity || state.selectedHome.safeguardingIntensity,
      staffingContinuity: home.staffing_continuity || home.staffingContinuity || state.selectedHome.staffingContinuity,
    },
  }, { reason: "active-home" });
}

function setActiveView(view, layer = state.activeLayer) {
  return setRuntimeState({ activeView: view, activeLayer: layer }, { reason: "active-view" });
}

function deepMerge(target, source) {
  const output = Array.isArray(target) ? [...target] : { ...target };
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] || {}, value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

window.IndiCareRuntimeState = {
  get: getRuntimeState,
  set: setRuntimeState,
  reset: resetRuntimeState,
  subscribe: subscribeRuntimeState,
  setActiveChild,
  setActiveHome,
  setActiveView,
};

notifyRuntimeChange("boot");
