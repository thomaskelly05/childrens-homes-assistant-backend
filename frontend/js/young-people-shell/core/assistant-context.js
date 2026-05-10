import { cleanText } from "./helpers.js";

const KNOWN_SCOPES = new Set([
  "child",
  "home",
  "quality",
  "ofsted",
  "staffing",
  "reports",
]);

const PROVIDER_LEVEL_ROLES = new Set([
  "ri",
  "responsible_individual",
  "admin",
  "administrator",
  "super_admin",
  "superadmin",
  "head_office",
  "provider",
  "director",
  "ceo",
  "owner",
]);

export function normaliseScope(scope = "child", fallback = "child") {
  const value = cleanText(scope).toLowerCase();
  if (!value) return fallback;
  if (KNOWN_SCOPES.has(value)) return value;
  return fallback;
}

export function normaliseSection(section = "workspace", fallback = "workspace") {
  const value = cleanText(section).toLowerCase();
  return value || fallback;
}

export function normaliseRole(role = "staff", fallback = "staff") {
  const value = cleanText(role).toLowerCase();
  if (!value) return fallback;

  if (
    value === "administrator" ||
    value === "super_admin" ||
    value === "superadmin" ||
    value === "admin_user" ||
    value === "system_admin"
  ) {
    return "admin";
  }

  if (value === "responsible_individual") return "ri";
  if (value === "rm") return "manager";
  if (value === "residential_support_worker") return "staff";

  return value;
}

export function isProviderLevelRole(role = "staff") {
  return PROVIDER_LEVEL_ROLES.has(normaliseRole(role));
}

export function resolveAccessLevelForScope({
  scope = "child",
  role = "staff",
} = {}) {
  const safeScope = normaliseScope(scope);
  const safeRole = normaliseRole(role);

  if (safeScope === "child") return "child";

  if (safeScope === "home" || safeScope === "staffing") {
    return "home";
  }

  if (
    safeScope === "quality" ||
    safeScope === "ofsted" ||
    safeScope === "reports"
  ) {
    return isProviderLevelRole(safeRole) ? "provider" : "home";
  }

  return "home";
}

export function resolveAssistantScopeType({
  scope = "child",
  youngPersonId = null,
} = {}) {
  const safeScope = normaliseScope(scope);

  if (safeScope === "home" || safeScope === "staffing") return "home";

  if (
    safeScope === "quality" ||
    safeScope === "ofsted" ||
    safeScope === "reports"
  ) {
    return "quality";
  }

  return youngPersonId ? "young_person" : "global";
}

export function resolveAssistantTypeForScope(scope = "child") {
  const safeScope = normaliseScope(scope);

  if (safeScope === "home" || safeScope === "staffing") return "home_os";

  if (
    safeScope === "quality" ||
    safeScope === "ofsted" ||
    safeScope === "reports"
  ) {
    return "quality_os";
  }

  return "young_people_os";
}

export function isProviderWideScope(scope = "child") {
  const safeScope = normaliseScope(scope);
  return (
    safeScope === "quality" ||
    safeScope === "ofsted" ||
    safeScope === "reports"
  );
}

export function inferAssistantAnalysisLens({
  scope = "child",
  section = "workspace",
  role = "staff",
  intent = "summary",
} = {}) {
  const safeScope = normaliseScope(scope);
  const safeSection = normaliseSection(section);
  const safeRole = normaliseRole(role);
  const safeIntent = cleanText(intent).toLowerCase() || "summary";

  if (/safeguarding|risk|missing/.test(safeSection) || safeIntent === "risk") {
    return "safeguarding";
  }

  if (
    safeScope === "quality" ||
    safeScope === "ofsted" ||
    safeScope === "reports" ||
    safeIntent === "quality" ||
    safeIntent === "compliance" ||
    /quality|compliance|reg44|reg45|ofsted|inspection|audit|sccif/.test(
      safeSection
    )
  ) {
    return isProviderLevelRole(safeRole) ? "quality" : "inspection";
  }

  if (
    safeIntent === "management" ||
    ["manager", "registered_manager", "deputy_manager"].includes(safeRole) ||
    /manager|team|supervision|home-dashboard|operations/.test(safeSection)
  ) {
    return "manager";
  }

  if (
    safeIntent === "handover" ||
    /handover|workspace|daily-notes|daily-life|keywork|family|education|health|timeline|chronology/.test(
      safeSection
    )
  ) {
    return "shift";
  }

  if (safeScope === "child") return "child_centred";
  if (safeScope === "home" || safeScope === "staffing") return "operational";
  return "general";
}
