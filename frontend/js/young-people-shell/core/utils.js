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

export function normaliseNumericId(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getYoungPersonIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("young_person_id");
  return normaliseNumericId(id);
}

export function setYoungPersonIdInUrl(id) {
  const url = new URL(window.location.href);
  const safeId = normaliseNumericId(id);

  if (safeId) {
    url.searchParams.set("id", String(safeId));
    url.searchParams.delete("young_person_id");
  } else {
    url.searchParams.delete("id");
    url.searchParams.delete("young_person_id");
  }

  window.history.replaceState({}, "", url.toString());
}

// ========================
// DATE HELPERS
// ========================

export function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function toSafeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  if (!value) return "—";

  const date = toSafeDate(value);
  if (!date) return String(value);

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

export function formatDateTime(value) {
  if (!value) return "—";

  const date = toSafeDate(value);
  if (!date) return String(value);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(value) {
  if (!value) return "—";

  const date = toSafeDate(value);
  if (!date) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value) {
  if (!value) return "—";

  const date = toSafeDate(value);
  if (!date) return String(value);

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDate(value) {
  if (!value) return "—";

  const date = toSafeDate(value);
  if (!date) return String(value);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatShortDate(value);
}

export function daysBetween(fromValue, toValue = new Date()) {
  const from = toSafeDate(fromValue);
  const to = toSafeDate(toValue);

  if (!from || !to) return null;

  const diff = to.getTime() - from.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function toDateInputValue(date) {
  const d = toSafeDate(date);
  if (!d) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function toDateTimeLocalValue(value) {
  const d = toSafeDate(value);
  if (!d) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

// ========================
// STRING / NORMALISATION HELPERS
// ========================

export function cleanText(value) {
  return String(value ?? "").trim();
}

export function normaliseToken(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function truncateText(value, maxLength = 160) {
  const text = cleanText(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function compactTextList(values = []) {
  return arrayify(values)
    .map(cleanText)
    .filter(Boolean);
}

export function joinTextList(values = [], separator = " • ") {
  return compactTextList(values).join(separator);
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
    item.staff_member ||
    item.fullName ||
    item.title ||
    "Record"
  );
}

export function getRoleLabel(item = {}) {
  return item.role || item.job_title || item.position || item.staff_role || "";
}

export function getStatusLabel(item = {}) {
  return item.status || item.workflow_status || item.approval_status || "";
}

export function describePersonCard(item = {}) {
  return joinTextList([
    getDisplayName(item),
    getRoleLabel(item),
    getStatusLabel(item),
  ]);
}

// ========================
// IMAGE HELPERS
// ========================

export function normaliseImagePath(value = "") {
  const input = cleanText(value);
  if (!input) return "";

  const lower = input.toLowerCase();
  if (lower.endsWith("young_person_1.png")) {
    return "";
  }

  if (
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("data:image/")
  ) {
    return input;
  }

  if (input.startsWith("/")) {
    return input;
  }

  return `/${input.replace(/^\/+/, "")}`;
}

export function getProfileImage(item = {}) {
  return normaliseImagePath(
    item.photo_url ||
      item.profile_photo_url ||
      item.image_url ||
      item.avatar_url ||
      item.photo ||
      ""
  );
}

export function buildImageOrInitials(
  item = {},
  imageClass = "avatar",
  fallbackClass = "avatar avatar-fallback"
) {
  const name = getDisplayName(item);
  const imageUrl = getProfileImage(item);

  if (imageUrl) {
    return `
      <img
        class="${escapeHtml(imageClass)}"
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(name)}"
        loading="lazy"
      />
    `;
  }

  return `<div class="${escapeHtml(fallbackClass)}">${escapeHtml(
    initialsFromName(name)
  )}</div>`;
}

export function renderAvatar(
  item = {},
  imageClass = "avatar",
  fallbackClass = "avatar avatar-fallback"
) {
  return buildImageOrInitials(item, imageClass, fallbackClass);
}

// ========================
// ARRAY / OBJECT HELPERS
// ========================

export function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export function uniqueBy(items = [], getKey = (item) => item) {
  const seen = new Set();
  const result = [];

  for (const item of arrayify(items)) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function sortByDateDesc(items = [], getDate = (item) => item?.date) {
  return [...arrayify(items)].sort((a, b) => {
    const aTime = Date.parse(getDate(a) || "");
    const bTime = Date.parse(getDate(b) || "");
    const safeA = Number.isNaN(aTime) ? 0 : aTime;
    const safeB = Number.isNaN(bTime) ? 0 : bTime;
    return safeB - safeA;
  });
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

export function safeJsonArray(value, fallback = []) {
  const parsed = safeJsonParse(value, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

export function safeJsonObject(value, fallback = {}) {
  const parsed = safeJsonParse(value, fallback);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : fallback;
}

export function dedupeStrings(values = []) {
  return [
    ...new Set(
      arrayify(values)
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean)
    ),
  ];
}
