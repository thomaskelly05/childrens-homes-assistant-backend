import { state } from "./state.js";
import { ypApiGet, youngPersonPath } from "./api.js";

const CACHE_TTL_MS = 30_000;
const cache = new Map();

function pickArray(source, keys = []) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key];
  }
  return [];
}

function cacheKey(scope, youngPersonId = "all") {
  return `${scope}:${youngPersonId || "all"}`;
}

function getCached(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.storedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(key, value) {
  cache.set(key, { value, storedAt: Date.now() });
  return value;
}

async function cachedGet(key, loader) {
  const cached = getCached(key);
  if (cached) return cached;
  return setCached(key, await loader());
}

export function clearYoungPeopleDataCache(youngPersonId = null) {
  if (!youngPersonId) {
    cache.clear();
    return;
  }

  for (const key of [...cache.keys()]) {
    if (key.endsWith(`:${youngPersonId}`)) cache.delete(key);
  }
}

export async function loadYoungPeople({ force = false } = {}) {
  const key = cacheKey("young-people");
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet("/young-people"));
  const people = pickArray(data, ["items", "young_people", "youngPeople", "records", "data"]);
  state.youngPeople = people;
  return people;
}

export async function loadDaily(youngPersonId, { force = false } = {}) {
  const key = cacheKey("daily", youngPersonId);
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet(youngPersonPath(youngPersonId, "/daily-notes")));
  state.dailyRecords = pickArray(data, ["items", "records", "daily_notes", "daily_life"]);
  return state.dailyRecords;
}

export async function loadHealth(youngPersonId, { force = false } = {}) {
  const key = cacheKey("health", youngPersonId);
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet(youngPersonPath(youngPersonId, "/health")));
  state.healthRecords = pickArray(data, ["health_records", "items", "records"]);
  state.medicationProfiles = pickArray(data, ["medication_profiles", "profiles"]);
  state.medicationRecords = pickArray(data, ["medication_records", "administrations"]);
  return data;
}

export async function loadEducation(youngPersonId, { force = false } = {}) {
  const key = cacheKey("education", youngPersonId);
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet(youngPersonPath(youngPersonId, "/education")));
  state.educationRecords = pickArray(data, ["education_records", "items", "records"]);
  return state.educationRecords;
}

export async function loadFamily(youngPersonId, { force = false } = {}) {
  const key = cacheKey("family", youngPersonId);
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet(youngPersonPath(youngPersonId, "/family")));
  state.familyRecords = pickArray(data, ["family_contact_records", "contacts", "items", "records"]);
  return state.familyRecords;
}

export async function loadIncidents(youngPersonId, { force = false } = {}) {
  const key = cacheKey("incidents", youngPersonId);
  if (force) cache.delete(key);
  const data = await cachedGet(key, () => ypApiGet(youngPersonPath(youngPersonId, "/incidents")));
  state.incidentRecords = pickArray(data, ["incidents", "items", "records"]);
  return state.incidentRecords;
}

export async function loadTabData(tab, youngPersonId, options = {}) {
  if (!youngPersonId) throw new Error("No young person selected.");
  if (tab === "daily") return loadDaily(youngPersonId, options);
  if (tab === "health") return loadHealth(youngPersonId, options);
  if (tab === "education") return loadEducation(youngPersonId, options);
  if (tab === "family") return loadFamily(youngPersonId, options);
  if (tab === "incidents") return loadIncidents(youngPersonId, options);
  if (tab === "medication") return loadHealth(youngPersonId, options);
  return [];
}

window.IndiCareYoungPeopleDataLoader = Object.freeze({
  loadYoungPeople,
  loadDaily,
  loadHealth,
  loadEducation,
  loadFamily,
  loadIncidents,
  loadTabData,
  clearYoungPeopleDataCache,
});
