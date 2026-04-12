export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========================
// URL
// ========================

export function getYoungPersonIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return id ? Number(id) : null;
}

export function setYoungPersonIdInUrl(id) {
  const url = new URL(window.location.href);

  if (id) {
    url.searchParams.set("id", String(id));
    url.searchParams.delete("young_person_id");
  } else {
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
  }

  window.history.replaceState({}, "", url.toString());
}

// ========================
// DATE FORMATTING
// ========================

export function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

export function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toDateTimeLocalValue(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

// ========================
// DISPLAY HELPERS
// ========================

export function initialsFromName(name) {
  if (!name) return "YP";

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "YP";
}

export function getDisplayName(item = {}) {
  return (
    item.preferred_name ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    item.full_name ||
    item.name ||
    "Young person"
  );
}

export function normaliseImagePath() {
  return "";
}

export function getProfileImage() {
  return "";
}

export function buildImageOrInitials(
  item = {},
  imageClass = "avatar",
  fallbackClass = "avatar avatar-fallback"
) {
  const name = getDisplayName(item);
  return `<div class="${escapeHtml(fallbackClass)}">${escapeHtml(initialsFromName(name))}</div>`;
}

export function renderAvatar(
  item = {},
  imageClass = "avatar",
  fallbackClass = "avatar avatar-fallback"
) {
  return buildImageOrInitials(item, imageClass, fallbackClass);
}

// ========================
// DATA HELPERS
// ========================

export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function dedupeStrings(values = []) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean)
    ),
  ];
}
