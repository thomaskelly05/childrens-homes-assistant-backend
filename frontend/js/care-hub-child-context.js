import { CARE_HUB_NAVIGATION } from "./care-hub-navigation.js";

const SELECTED_CHILD_KEY = "indicare.careHub.selectedChildId";
let childrenCache = [];

function safeStorageGet(key) {
  try {
    return window.localStorage?.getItem(key) || "";
  } catch (_) {
    return "";
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage?.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

function normaliseId(value) {
  const raw = String(value ?? "").trim();
  return raw && raw !== "null" && raw !== "undefined" ? raw : "";
}

function childName(child = {}) {
  const first = child.first_name || child.firstName || "";
  const last = child.last_name || child.lastName || "";
  return child.name || child.full_name || child.display_name || `${first} ${last}`.trim() || `Child ${child.id || child.young_person_id || ""}`.trim();
}

function normaliseChildren(payload) {
  const records = Array.isArray(payload) ? payload : payload?.items || payload?.young_people || payload?.youngPeople || payload?.records || payload?.data || [];
  return records
    .map((child) => ({
      ...child,
      id: normaliseId(child.id || child.young_person_id || child.youngPersonId),
      name: childName(child),
    }))
    .filter((child) => child.id);
}

export function childWorkspaceMenu() {
  return CARE_HUB_NAVIGATION.find((item) => item.id === "children")?.childWorkspace || [];
}

export async function loadCareHubChildren({ force = false } = {}) {
  if (childrenCache.length && !force) return childrenCache;

  const response = await fetch("/young-people", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    childrenCache = [];
    return childrenCache;
  }

  childrenCache = normaliseChildren(await response.json());
  return childrenCache;
}

export function selectedChildId() {
  const params = new URLSearchParams(window.location.search);
  return normaliseId(params.get("young_person_id") || params.get("child_id") || safeStorageGet(SELECTED_CHILD_KEY));
}

export function selectedChild(children = childrenCache) {
  const id = selectedChildId();
  return children.find((child) => String(child.id) === String(id)) || null;
}

export function setSelectedChildId(childId) {
  const id = normaliseId(childId);
  if (id) safeStorageSet(SELECTED_CHILD_KEY, id);
  return id;
}

export function childWorkspaceHref(childId, workspace = "about") {
  const id = normaliseId(childId);
  const params = id ? `?young_person_id=${encodeURIComponent(id)}` : "";
  return `/young-people-shell${params}#${encodeURIComponent(workspace)}`;
}

export function embeddedChildWorkspaceSrc(childId, workspace = "about") {
  const id = normaliseId(childId);
  const params = new URLSearchParams();
  if (id) params.set("young_person_id", id);
  params.set("embedded", "1");
  return `/young-people-shell?${params.toString()}#${encodeURIComponent(workspace)}`;
}

window.IndiCareCareHubChildContext = Object.freeze({
  loadCareHubChildren,
  childWorkspaceMenu,
  selectedChildId,
  selectedChild,
  setSelectedChildId,
  childWorkspaceHref,
  embeddedChildWorkspaceSrc,
});
