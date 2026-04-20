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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  return value;
}

export function normaliseId(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "_");
}
