import { state } from "./state.js";
import { ypApiGet, youngPersonPath } from "./api.js";

function pickArray(source, keys = []) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key];
  }
  return [];
}

export async function loadYoungPeople() {
  const data = await ypApiGet("/young-people");
  const people = pickArray(data, ["items", "young_people", "youngPeople", "records", "data"]);
  state.youngPeople = people;
  return people;
}

export async function loadDaily(youngPersonId) {
  const data = await ypApiGet(youngPersonPath(youngPersonId, "/daily-notes"));
  state.dailyRecords = pickArray(data, ["items", "records", "daily_notes", "daily_life"]);
  return state.dailyRecords;
}

export async function loadHealth(youngPersonId) {
  const data = await ypApiGet(youngPersonPath(youngPersonId, "/health"));
  state.healthRecords = pickArray(data, ["health_records", "items", "records"]);
  state.medicationProfiles = pickArray(data, ["medication_profiles", "profiles"]);
  state.medicationRecords = pickArray(data, ["medication_records", "administrations"]);
  return data;
}

export async function loadEducation(youngPersonId) {
  const data = await ypApiGet(youngPersonPath(youngPersonId, "/education"));
  state.educationRecords = pickArray(data, ["education_records", "items", "records"]);
  return state.educationRecords;
}

export async function loadFamily(youngPersonId) {
  const data = await ypApiGet(youngPersonPath(youngPersonId, "/family"));
  state.familyRecords = pickArray(data, ["family_contact_records", "contacts", "items", "records"]);
  return state.familyRecords;
}

export async function loadIncidents(youngPersonId) {
  const data = await ypApiGet(youngPersonPath(youngPersonId, "/incidents"));
  state.incidentRecords = pickArray(data, ["incidents", "items", "records"]);
  return state.incidentRecords;
}

export async function loadTabData(tab, youngPersonId) {
  if (!youngPersonId) throw new Error("No young person selected.");
  if (tab === "daily") return loadDaily(youngPersonId);
  if (tab === "health") return loadHealth(youngPersonId);
  if (tab === "education") return loadEducation(youngPersonId);
  if (tab === "family") return loadFamily(youngPersonId);
  if (tab === "incidents") return loadIncidents(youngPersonId);
  if (tab === "medication") return loadHealth(youngPersonId);
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
});
