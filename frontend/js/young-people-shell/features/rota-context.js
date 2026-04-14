import { state } from "../state.js";
import { apiGet } from "./api.js";

const ROTA_CONTEXT_TTL_MS = 60 * 1000;

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function normaliseShiftItems(data = {}) {
  return toArray(data.items, [data.shifts, data.rota, data.records]);
}

function normaliseAbsenceItems(data = {}) {
  return toArray(data.items, [data.absences, data.leave, data.records]);
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getShiftDateValue(item = {}) {
  return (
    item.shift_date ||
    item.date ||
    item.start_datetime ||
    item.start_time ||
    item.created_at ||
    null
  );
}

function getShiftStart(item = {}) {
  return item.start_datetime || item.start_time || null;
}

function getShiftEnd(item = {}) {
  return item.end_datetime || item.end_time || null;
}

function getShiftStaffName(item = {}) {
  return (
    item.staff_member ||
    item.staff_name ||
    item.name ||
    item.full_name ||
    ""
  );
}

function getShiftRole(item = {}) {
  return item.role || item.shift_role || item.job_title || "";
}

function getShiftSource(item = {}) {
  return item.source || item.cover_type || "";
}

function getShiftStatus(item = {}) {
  return String(item.status || "").toLowerCase();
}

function isFilledShift(item = {}) {
  const status = getShiftStatus(item);
  const staffName = getShiftStaffName(item);

  if (!staffName.trim()) return false;
  if (["unfilled", "gap", "cancelled"].includes(status)) return false;

  return true;
}

function isAgencyShift(item = {}) {
  const source = String(getShiftSource(item) || "").toLowerCase();
  const role = String(getShiftRole(item) || "").toLowerCase();
  const staff = String(getShiftStaffName(item) || "").toLowerCase();
  const status = getShiftStatus(item);

  return (
    ["agency", "bank"].includes(source) ||
    ["agency", "bank"].includes(status) ||
    role.includes("agency") ||
    role.includes("bank") ||
    staff.includes("agency") ||
    staff.includes("bank")
  );
}

function isShiftLead(item = {}) {
  return Boolean(item.is_shift_lead || item.shift_lead || item.isLead);
}

function sortSoonestFirst(items = []) {
  return [...items].sort((a, b) => {
    const aDate = safeDate(getShiftDateValue(a))?.getTime() || 0;
    const bDate = safeDate(getShiftDateValue(b))?.getTime() || 0;
    return aDate - bDate;
  });
}

function dedupeBy(items = [], getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatPersonOption(item = {}) {
  const name = getShiftStaffName(item);
  return {
    id:
      item.staff_id ||
      item.user_id ||
      item.id ||
      name.toLowerCase().replace(/\s+/g, "-"),
    label: name,
    name,
    role: getShiftRole(item),
    shift_lead: isShiftLead(item),
    source: getShiftSource(item) || "core",
    raw: item,
  };
}

function buildFallbackRotaContext(homeId) {
  const now = new Date();
  const at = (offsetDays, hours, minutes = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return {
    summary: {
      home_id: homeId,
      home_name:
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        `Home ${homeId}`,
    },
    shifts: [
      {
        id: "shift-1",
        shift_date: at(0, 8),
        shift_name: "Day shift",
        start_time: "08:00",
        end_time: "20:00",
        staff_member: "Sarah Ahmed",
        role: "Deputy manager",
        is_shift_lead: true,
        source: "core",
        status: "confirmed",
      },
      {
        id: "shift-2",
        shift_date: at(0, 8),
        shift_name: "Day shift",
        start_time: "08:00",
        end_time: "20:00",
        staff_member: "Lena Morris",
        role: "Residential worker",
        is_shift_lead: false,
        source: "core",
        status: "confirmed",
      },
      {
        id: "shift-3",
        shift_date: at(0, 20),
        shift_name: "Waking night",
        start_time: "20:00",
        end_time: "08:00",
        staff_member: "Agency worker",
        role: "Agency",
        is_shift_lead: false,
        source: "agency",
        status: "agency",
      },
      {
        id: "shift-4",
        shift_date: at(1, 8),
        shift_name: "Day shift",
        start_time: "08:00",
        end_time: "20:00",
        staff_member: "Ben Carter",
        role: "Senior residential worker",
        is_shift_lead: true,
        source: "core",
        status: "planned",
      },
    ],
    absences: [
      {
        id: "abs-1",
        staff_member: "Aimee Khan",
        reason: "Sickness",
        shift_date: at(0, 8),
        status: "sick",
      },
    ],
    isFallback: true,
  };
}

function getCacheKey(homeId) {
  return `rota-context:${homeId || "none"}`;
}

function getCachedContext(homeId) {
  const cacheKey = getCacheKey(homeId);
  const cached = state.resourceCache?.[cacheKey];

  if (!cached) return null;
  if (Date.now() - cached.timestamp > ROTA_CONTEXT_TTL_MS) return null;

  return cached.value;
}

function setCachedContext(homeId, value) {
  const cacheKey = getCacheKey(homeId);

  if (!state.resourceCache) {
    state.resourceCache = Object.create(null);
  }

  state.resourceCache[cacheKey] = {
    timestamp: Date.now(),
    value,
  };
}

export async function loadRotaContext({ force = false } = {}) {
  const homeId = getHomeId();

  if (!homeId) {
    return {
      summary: {},
      shifts: [],
      absences: [],
      isFallback: false,
      homeId: null,
    };
  }

  if (!force) {
    const cached = getCachedContext(homeId);
    if (cached) return cached;
  }

  const results = await Promise.allSettled([
    apiGet(`/homes/${homeId}/rota`),
    apiGet(`/homes/${homeId}/rota-absences`),
  ]);

  const hasLiveSuccess = results.some((result) => result.status === "fulfilled");

  let context;

  if (!hasLiveSuccess) {
    const fallback = buildFallbackRotaContext(homeId);
    context = {
      homeId,
      summary: fallback.summary || {},
      shifts: sortSoonestFirst(normaliseShiftItems({ items: fallback.shifts })),
      absences: sortSoonestFirst(normaliseAbsenceItems({ items: fallback.absences })),
      isFallback: true,
    };
  } else {
    const shiftData =
      results[0].status === "fulfilled" ? results[0].value : { items: [] };
    const absenceData =
      results[1].status === "fulfilled" ? results[1].value : { items: [] };

    context = {
      homeId,
      summary: shiftData.summary || shiftData.rota_summary || {},
      shifts: sortSoonestFirst(normaliseShiftItems(shiftData)),
      absences: sortSoonestFirst(normaliseAbsenceItems(absenceData)),
      isFallback: false,
    };
  }

  setCachedContext(homeId, context);
  return context;
}

export async function getAllShifts(options = {}) {
  const context = await loadRotaContext(options);
  return context.shifts || [];
}

export async function getTodayShifts(options = {}) {
  const shifts = await getAllShifts(options);
  const todayKey = new Date().toDateString();

  return shifts.filter((item) => {
    const date = safeDate(getShiftDateValue(item));
    return date && date.toDateString() === todayKey;
  });
}

export async function getUpcomingShifts({ limit = 10, ...options } = {}) {
  const now = Date.now();
  const shifts = await getAllShifts(options);

  return shifts
    .filter((item) => {
      const date = safeDate(getShiftDateValue(item));
      return date && date.getTime() >= now - 12 * 60 * 60 * 1000;
    })
    .slice(0, limit);
}

export async function getCurrentShiftStaff(options = {}) {
  const shifts = await getTodayShifts(options);
  const currentMinutes = (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const liveShifts = shifts.filter((item) => {
    const start = String(getShiftStart(item) || "");
    const end = String(getShiftEnd(item) || "");

    if (!/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) {
      return false;
    }

    const [startH, startM] = start.slice(0, 5).split(":").map(Number);
    const [endH, endM] = end.slice(0, 5).split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    let compareMinutes = currentMinutes;
    if (compareMinutes < startMinutes && endMinutes > 24 * 60) {
      compareMinutes += 24 * 60;
    }

    return compareMinutes >= startMinutes && compareMinutes <= endMinutes;
  });

  return dedupeBy(
    liveShifts.filter(isFilledShift).map(formatPersonOption),
    (item) => item.id || item.name
  );
}

export async function getTodayShiftStaff(options = {}) {
  const shifts = await getTodayShifts(options);

  return dedupeBy(
    shifts.filter(isFilledShift).map(formatPersonOption),
    (item) => item.id || item.name
  );
}

export async function getUpcomingShiftStaff({ limit = 20, ...options } = {}) {
  const shifts = await getUpcomingShifts({ limit, ...options });

  return dedupeBy(
    shifts.filter(isFilledShift).map(formatPersonOption),
    (item) => item.id || item.name
  );
}

export async function getShiftLead(options = {}) {
  const currentStaff = await getCurrentShiftStaff(options);
  const currentLead = currentStaff.find((item) => item.shift_lead);
  if (currentLead) return currentLead;

  const todayStaff = await getTodayShiftStaff(options);
  const todayLead = todayStaff.find((item) => item.shift_lead);
  if (todayLead) return todayLead;

  return null;
}

export async function getTodayShiftLead(options = {}) {
  const todayStaff = await getTodayShiftStaff(options);
  return todayStaff.find((item) => item.shift_lead) || null;
}

export async function getRotaGaps(options = {}) {
  const shifts = await getAllShifts(options);

  return shifts.filter((item) => !isFilledShift(item));
}

export async function getAgencyShifts(options = {}) {
  const shifts = await getAllShifts(options);
  return shifts.filter(isAgencyShift);
}

export async function getStaffOptionsForForms({
  includeAgency = false,
  includeUpcoming = true,
  ...options
} = {}) {
  const base = includeUpcoming
    ? await getUpcomingShiftStaff({ limit: 30, ...options })
    : await getTodayShiftStaff(options);

  return base.filter((item) => (includeAgency ? true : item.source !== "agency"));
}

export async function getRotaSummary(options = {}) {
  const context = await loadRotaContext(options);
  const shifts = context.shifts || [];
  const todayShifts = await getTodayShifts(options);
  const gaps = shifts.filter((item) => !isFilledShift(item));
  const agency = shifts.filter(isAgencyShift);
  const leads = shifts.filter(isShiftLead);

  return {
    homeId: context.homeId,
    homeName:
      context.summary?.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      "",
    totalShifts: shifts.length,
    todayShifts: todayShifts.length,
    gaps: gaps.length,
    agency: agency.length,
    shiftLeads: leads.length,
    absences: (context.absences || []).length,
    isFallback: Boolean(context.isFallback),
  };
}

export function clearRotaContextCache() {
  const homeId = getHomeId();
  if (!homeId || !state.resourceCache) return;

  delete state.resourceCache[getCacheKey(homeId)];
}