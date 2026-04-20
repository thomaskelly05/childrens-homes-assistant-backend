export function noop() {}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function pickFirst(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}

export function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

export function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function truncateText(value, max = 280) {
  const text = cleanText(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function toBool(value) {
  return Boolean(value);
}

export function toJsonObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object" && !Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

export function toJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function normaliseToken(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function normaliseId(value) {
  return normaliseToken(value);
}

export function unique(values = []) {
  return [...new Set(arrayify(values).filter(Boolean))];
}

export function compactTextList(values = []) {
  return arrayify(values).map(cleanText).filter(Boolean);
}

export function parseDateValue(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? 0 : time;
}

export function daysFromNow(value) {
  const time = parseDateValue(value);
  if (!time) return null;
  const diff = time - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(value) {
  const days = daysFromNow(value);
  return days !== null && days < 0;
}

export function isDueSoon(value, thresholdDays = 7) {
  const days = daysFromNow(value);
  return days !== null && days >= 0 && days <= thresholdDays;
}
