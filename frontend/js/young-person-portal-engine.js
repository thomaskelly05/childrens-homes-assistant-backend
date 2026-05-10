import { createCareHubAction } from './care-hub-actions.js';
import { saveEvidenceEntry } from './sccif-outcomes-engine.js';

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

const CONCERNING_MOODS = new Set(['sad', 'angry', 'worried', 'scared', 'unsafe']);

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

function shouldCreateAction(entry = {}) {
  if (entry.type === 'voice' && String(entry.body || '').trim()) return true;
  if (entry.type === 'check_in' && String(entry.body || '').trim()) return true;
  if (entry.mood && CONCERNING_MOODS.has(String(entry.mood).toLowerCase())) return true;
  return false;
}

async function createFollowUpForEntry(entry = {}) {
  if (!shouldCreateAction(entry)) return null;
  const moodConcern = entry.mood && CONCERNING_MOODS.has(String(entry.mood).toLowerCase());
  const actionType = moodConcern ? 'child_voice_follow_up' : 'child_voice_follow_up';
  const priority = moodConcern ? 'high' : 'medium';
  try {
    return await createCareHubAction({
      type: actionType,
      title: moodConcern ? `Check-in follow-up: ${entry.mood}` : 'Young person voice follow-up',
      body: entry.body || entry.feeling || `Young person selected mood: ${entry.mood}`,
      child_id: entry.child_id,
      child_name: entry.child_name || '',
      section_id: 'young-person-portal',
      priority,
      source: 'young_person_portal',
    });
  } catch (error) {
    console.warn('[young-person-portal-engine] action creation failed', error);
    return null;
  }
}

function savePortalEvidence(entry = {}) {
  saveEvidenceEntry({
    child_id: entry.child_id,
    child_name: entry.child_name || '',
    source_id: entry.id,
    source_type: 'young_person_portal',
    actionType: entry.type === 'mood' ? 'child_voice_follow_up' : 'child_voice_follow_up',
    sectionId: 'child_voice',
    title: entry.title || 'Young person voice',
    summary: entry.body || entry.feeling || entry.mood || 'Young person entry recorded.',
    outcome_domains: entry.mood ? ['voice', 'emotional_wellbeing'] : ['voice'],
    sccif_areas: ['experiences_progress'],
    quality_standards: ['views_wishes'],
  });
}

export function createYoungPersonEntry(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const entry = {
    id: input.id || stableId(['yp-entry', childId, input.type || 'check_in', nowIso()]),
    child_id: childId,
    child_name: input.child_name || input.childName || '',
    type: input.type || 'check_in',
    title: input.title || YOUNG_PERSON_PORTAL_AREAS[input.type] || 'Young person entry',
    mood: input.mood || '',
    feeling: input.feeling || '',
    body: input.body || input.message || '',
    staff_response: input.staff_response || '',
    you_said_we_did_status: input.you_said_we_did_status || 'new',
    action_created: false,
    private_to_staff: Boolean(input.private_to_staff),
    date: input.date || todayIso(),
    created_at: input.created_at || nowIso(),
  };
  bucket.entries = [entry, ...(bucket.entries || [])].slice(0, 500);
  store[key] = bucket;
  setStore(store);
  savePortalEvidence(entry);
  createFollowUpForEntry(entry).then((action) => {
    if (!action) return;
    updateYoungPersonEntry(entry.child_id, entry.id, { action_created: true, linked_action_id: action.id });
  });
  window.dispatchEvent(new CustomEvent('indicare:young-person-entry-created', { detail: entry }));
  return entry;
}

export function updateYoungPersonEntry(childId, entryId, patch = {}) {
  const { store, key, bucket } = childBucket(childId);
  bucket.entries = (bucket.entries || []).map((entry) => String(entry.id) === String(entryId) ? { ...entry, ...patch, updated_at: nowIso() } : entry);
  store[key] = bucket;
  setStore(store);
  const updated = bucket.entries.find((entry) => String(entry.id) === String(entryId));
  window.dispatchEvent(new CustomEvent('indicare:young-person-entry-updated', { detail: updated }));
  return updated;
}

export function createYoungPersonMemory(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const memory = {
    id: input.id || stableId(['yp-memory', childId, nowIso()]),
    child_id: childId,
    child_name: input.child_name || '',
    title: input.title || 'Memory',
    body: input.body || '',
    date: input.date || todayIso(),
    tags: input.tags || [],
    created_at: input.created_at || nowIso(),
  };
  bucket.memories = [memory, ...(bucket.memories || [])].slice(0, 300);
  store[key] = bucket;
  setStore(store);
  saveEvidenceEntry({ child_id: childId, child_name: memory.child_name, source_id: memory.id, source_type: 'young_person_memory', sectionId: 'life-story', title: memory.title, summary: memory.body || 'Memory recorded.', sccif_areas: ['experiences_progress'], outcome_domains: ['identity', 'emotional_wellbeing'] });
  window.dispatchEvent(new CustomEvent('indicare:young-person-memory-created', { detail: memory }));
  return memory;
}

export function createYoungPersonPlan(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const plan = {
    id: input.id || stableId(['yp-plan', childId, input.type || 'child_plan', nowIso()]),
    child_id: childId,
    child_name: input.child_name || '',
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
  saveEvidenceEntry({ child_id: childId, child_name: plan.child_name, source_id: plan.id, source_type: 'young_person_plan', sectionId: 'support-plans', title: plan.title, summary: [plan.what_matters, plan.what_helps, plan.what_i_want_adults_to_know].filter(Boolean).join(' · ') || 'Young person plan updated.', sccif_areas: ['experiences_progress'], outcome_domains: ['voice'] });
  window.dispatchEvent(new CustomEvent('indicare:young-person-plan-updated', { detail: plan }));
  return plan;
}

export function createYoungPersonActivityChoice(input = {}) {
  const childId = input.child_id || input.childId || null;
  const { store, key, bucket } = childBucket(childId);
  const activity = {
    id: input.id || stableId(['yp-activity', childId, nowIso()]),
    child_id: childId,
    child_name: input.child_name || '',
    title: input.title || 'Activity idea',
    preference: input.preference || 'interested',
    notes: input.notes || '',
    date: input.date || todayIso(),
    created_at: input.created_at || nowIso(),
  };
  bucket.activities = [activity, ...(bucket.activities || [])].slice(0, 300);
  store[key] = bucket;
  setStore(store);
  saveEvidenceEntry({ child_id: childId, child_name: activity.child_name, source_id: activity.id, source_type: 'young_person_activity', sectionId: 'daily-life', title: activity.title, summary: activity.notes || activity.preference, sccif_areas: ['experiences_progress'], outcome_domains: ['voice', 'emotional_wellbeing'] });
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
    concerning_mood: entries.filter((entry) => entry.mood && CONCERNING_MOODS.has(String(entry.mood).toLowerCase())).length,
    memories: data.memories.length,
    plans: data.plans.length,
    activities: data.activities.length,
  };
}

window.IndiCareYoungPersonPortalEngine = Object.freeze({
  YOUNG_PERSON_PORTAL_AREAS,
  createYoungPersonEntry,
  updateYoungPersonEntry,
  createYoungPersonMemory,
  createYoungPersonPlan,
  createYoungPersonActivityChoice,
  getYoungPersonPortalData,
  youngPersonVoiceSummary,
});
