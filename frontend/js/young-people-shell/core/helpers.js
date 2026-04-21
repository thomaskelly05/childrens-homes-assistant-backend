export function noop() {}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function pickFirst(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    if (typeof value === "string") {
      const cleaned = value.trim();
      if (cleaned) return cleaned;
      continue;
    }

    return value;
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
  const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 280;

  if (!text) return "";
  if (text.length <= safeMax) return text;
  if (safeMax === 1) return "…";

  return `${text.slice(0, safeMax - 1).trimEnd()}…`;
}

export function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value === null || value === undefined) return false;

  const normalised = String(value).trim().toLowerCase();

  if (!normalised) return false;
  if (["true", "1", "yes", "y", "on"].includes(normalised)) return true;
  if (["false", "0", "no", "n", "off", "null", "undefined"].includes(normalised)) {
    return false;
  }

  return Boolean(normalised);
}

export function toJsonObject(value, fallback = {}) {
  const safeFallback =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback
      : {};

  if (value === null || value === undefined || value === "") {
    return safeFallback;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return safeFallback;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : safeFallback;
  } catch {
    return safeFallback;
  }
}

export function toJsonArray(value, fallback = []) {
  const safeFallback = Array.isArray(fallback) ? fallback : [];

  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return safeFallback;
  if (typeof value !== "string") return safeFallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : safeFallback;
  } catch {
    return safeFallback;
  }
}

export function normaliseToken(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

export function normaliseId(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
}

export function unique(values = []) {
  const seen = new Set();
  const result = [];

  for (const item of arrayify(values)) {
    if (
      item === null ||
      item === undefined ||
      (typeof item === "string" && !item.trim())
    ) {
      continue;
    }

    const key =
      typeof item === "object"
        ? JSON.stringify(item)
        : String(item);

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function compactTextList(values = []) {
  return arrayify(values).map(cleanText).filter(Boolean);
}

export function parseDateValue(value) {
  if (!value) return 0;

  const time = Date.parse(value);
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
  const safeThreshold =
    Number.isFinite(thresholdDays) && thresholdDays >= 0
      ? thresholdDays
      : 7;

  return days !== null && days >= 0 && days <= safeThreshold;
}
