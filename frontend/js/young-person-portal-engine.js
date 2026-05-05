const LOCAL_YOUNG_PERSON_PORTAL_KEY = 'indicare.youngPersonPortal.v1';

export const YOUNG_PERSON_PORTAL_AREAS = Object.freeze({
  check_in: 'Check-in',
  mood: 'Mood',
  memories: 'Memories',
  family_plan: 'Family plan',
  child_plan: 'My plans',
  activities: 'Activities',
  voice: 'My voice',
});

function nowIso() { return new Date().toISOString(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function safeJsonParse(value, fallback) { try { return JSON.parse(value) ?? fallback; } catch (_) { return fallback; } }
function getStore() { try { return safeJsonParse(window.localStorage?.getItem(LOCAL_YOUNG_PERSON_PORTAL_KEY), {}); } catch (_) { return {}; } }
function setStore(value) { try { window.localStorage?.setItem(LOCAL_YOUNG_PERSON_PORTAL_KEY, JSON.stringify(value)); } catch (_) {} return value; }
function stableId(parts = []) { return parts.filter(Boolean).join(':').replace(/[^a-zA-Z0-9:_-]/g, '_'); }

function childBucket(childId) {
  const store = getStore();
  const key = String(childId || 'unknown');
  if (!store[key]) store[key] = { entries: [], plans: [], memories: [], activities: [] };
  return { store, key, bucket: store[key] };
}

export function createYoungPersonEntry(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const entry = {
    id: input.id || stableId(['yp-entry', childId, input.type || 'check_in', nowIso()]),
    child_id: childId,
    type: input.type || 'check_in',
    title: input.title || YOUNG_PERSON_PORTAL_AREAS[input.type] || 'Young person entry',
    mood: input.mood || '',
    feeling: input.feeling || '',
    body: input.body || input.message || '',
    staff_response: input.staff_response || '',
    you_said_we_did_status: input.you_said_we_did_status || 'new',
    private_to_staff: Boolean(input.private_to_staff),
    date: input.date || todayIso(),
    created_at: input.created_at || nowIso(),
  };
  bucket.entries = [entry, ...(bucket.entries || [])].slice(0, 500);
  store[key] = bucket;
  setStore(store);
  window.dispatchEvent(new CustomEvent('indicare:young-person-entry-created', { detail: entry }));
  return entry;
}

export function createYoungPersonMemory(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const memory = {
    id: input.id || stableId(['yp-memory', childId, nowIso()]),
    child_id: childId,
    title: input.title || 'Memory',
    body: input.body || '',
    date: input.date || todayIso(),
    tags: input.tags || [],
    created_at: input.created_at || nowIso(),
  };
  bucket.memories = [memory, ...(bucket.memories || [])].slice(0, 300);
  store[key] = bucket;
  setStore(store);
  window.dispatchEvent(new CustomEvent('indicare:young-person-memory-created', { detail: memory }));
  return memory;
}

export function createYoungPersonPlan(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const plan = {
    id: input.id || stableId(['yp-plan', childId, input.type || 'child_plan', nowIso()]),
    child_id: childId,
    type: input.type || 'child_plan',
    title: input.title || 'My plan',
    what_matters: input.what_matters || '',
    what_helps: input.what_helps || '',
    what_i_want_adults_to_know: input.what_i_want_adults_to_know || '',
    progress: input.progress || 'not_started',
    updated_at: nowIso(),
  };
  bucket.plans = [plan, ...(bucket.plans || []).filter((item) => item.id !== plan.id)].slice(0, 200);
  store[key] = bucket;
  setStore(store);
  window.dispatchEvent(new CustomEvent('indicare:young-person-plan-updated', { detail: plan }));
  return plan;
}

export function createYoungPersonActivityChoice(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const activity = {
    id: input.id || stableId(['yp-activity', childId, nowIso()]),
    child_id: childId,
    title: input.title || 'Activity idea',
    preference: input.preference || 'interested',
    notes: input.notes || '',
    date: input.date || todayIso(),
    created_at: input.created_at || nowIso(),
  };
  bucket.activities = [activity, ...(bucket.activities || [])].slice(0, 300);
  store[key] = bucket;
  setStore(store);
  window.dispatchEvent(new CustomEvent('indicare:young-person-activity-created', { detail: activity }));
  return activity;
}

export function getYoungPersonPortalData(childId) {
  const { bucket } = childBucket(childId);
  return {
    entries: bucket.entries || [],
    memories: bucket.memories || [],
    plans: bucket.plans || [],
    activities: bucket.activities || [],
  };
}

export function youngPersonVoiceSummary(childId) {
  const data = getYoungPersonPortalData(childId);
  const entries = data.entries || [];
  const openVoice = entries.filter((entry) => ['new', 'in_progress'].includes(entry.you_said_we_did_status));
  return {
    total_entries: entries.length,
    mood_entries: entries.filter((entry) => entry.type === 'mood' || entry.mood).length,
    open_voice: openVoice.length,
    memories: data.memories.length,
    plans: data.plans.length,
    activities: data.activities.length,
  };
}

window.IndiCareYoungPersonPortalEngine = Object.freeze({
  YOUNG_PERSON_PORTAL_AREAS,
  createYoungPersonEntry,
  createYoungPersonMemory,
  createYoungPersonPlan,
  createYoungPersonActivityChoice,
  getYoungPersonPortalData,
  youngPersonVoiceSummary,
});
