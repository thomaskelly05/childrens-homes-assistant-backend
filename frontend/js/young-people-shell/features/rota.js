import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(value) {
  if (!value) return "";

  if (/^\d{2}:\d{2}/.test(String(value))) {
    return String(value).slice(0, 5);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShiftTime(start, end) {
  const startText = formatTime(start);
  const endText = formatTime(end);

  if (!startText && !endText) return "Time not set";
  if (!endText) return startText;
  if (!startText) return endText;

  return `${startText}–${endText}`;
}

function getStatusTone(status = "") {
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "unfilled",
      "gap",
      "critical",
      "sick",
      "absence",
      "absent",
      "overdue",
      "cancelled",
      "vacant",
      "vacancy",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "partial",
      "leave",
      "annual_leave",
      "training",
      "agency",
      "bank",
      "pending",
      "due_soon",
      "review_due",
      "open",
      "planned",
      "bank_staff",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "confirmed",
      "filled",
      "active",
      "complete",
      "completed",
      "on_shift",
      "planned_ok",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(aValue) - toTime(bValue);
  });
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(bValue) - toTime(aValue);
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.shifts) && data.shifts.length > 0) return true;
  if (Array.isArray(data.rota) && data.rota.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.absences) && data.absences.length > 0) return true;
  if (Array.isArray(data.leave) && data.leave.length > 0) return true;
  if (Array.isArray(data.gaps) && data.gaps.length > 0) return true;
  if (Array.isArray(data.unfilled) && data.unfilled.length > 0) return true;
  if (Array.isArray(data.notifications) && data.notifications.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.rota_summary || data.dashboard || data || {};
}

function normaliseShiftItems(data = {}) {
  return toArray(data.items, [data.shifts, data.rota, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "rota_shift",
      shift_date:
        item.shift_date ||
        item.date ||
        item.start_datetime ||
        item.start_time ||
        null,
      shift_name: item.shift_name || item.title || item.shift || "Shift",
      staff_member: item.staff_member || item.staff_name || item.full_name || "",
      role: item.role || item.shift_role || "",
      start_time: item.start_time || item.start_datetime || "",
      end_time: item.end_time || item.end_datetime || "",
      is_shift_lead: Boolean(item.is_shift_lead || item.shift_lead),
      source: item.source || item.cover_source || "",
      status: item.status || "planned",
      summary: item.summary || item.notes || "Planned rota assignment.",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
}

function normaliseAbsenceItems(data = {}) {
  return toArray(data.items, [data.absences, data.leave, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "absence",
      staff_member: item.staff_member || item.full_name || item.name || "Staff member",
      reason: item.reason || item.absence_type || "Absence",
      shift_date: item.shift_date || item.start_date || null,
      start_date: item.start_date || item.shift_date || null,
      end_date: item.end_date || null,
      summary:
        item.summary ||
        item.notes ||
        `${item.reason || item.absence_type || "Absence"} affecting cover.`,
      status: item.status || item.absence_status || "absence",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
}

function normaliseGapItems(data = {}) {
  return toArray(data.items, [data.gaps, data.unfilled, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "rota_shift",
      shift_name: item.shift_name || item.title || "Shift gap",
      shift_date:
        item.shift_date ||
        item.date ||
        item.start_datetime ||
        item.start_time ||
        null,
      start_time: item.start_time || item.start_datetime || "",
      end_time: item.end_time || item.end_datetime || "",
      summary: item.summary || item.notes || "Shift still needs cover.",
      status: item.status || "unfilled",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
}

function normaliseNotificationItems(data = {}) {
  return toArray(data.items, [data.notifications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "notification",
    title: item.title || item.subject || "Notification",
    summary: item.summary || item.message || item.notes || "Notification recorded.",
    recipient_name: item.recipient_name || item.staff_member || "",
    status: item.status || "recorded",
    created_at: item.created_at || item.updated_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  shifts = [],
  todayShifts = [],
  unfilled = [],
  agency = [],
  absences = [],
  shiftLeads = [],
}) {
  return [
    {
      label: "Planned shifts",
      value: shifts.length,
      note: "Current rota period",
      tone: "muted",
    },
    {
      label: "Today",
      value: todayShifts.length,
      note: "Shifts scheduled today",
      tone: "muted",
    },
    {
      label: "Unfilled",
      value: unfilled.length,
      note: "Gaps needing cover",
      tone: unfilled.length ? "danger" : "success",
    },
    {
      label: "Agency / bank",
      value: agency.length,
      note: "Cover not from core team",
      tone: agency.length ? "warning" : "success",
    },
    {
      label: "Absence",
      value: absences.length,
      note: "Sickness or leave affecting cover",
      tone: absences.length ? "warning" : "success",
    },
    {
      label: "Shift leads set",
      value: shiftLeads.length,
      note: "Shifts with named lead",
      tone: shiftLeads.length ? "success" : "warning",
    },
  ];
}

function buildProgressCards({
  shifts = [],
  filled = [],
  unfilled = [],
  internalCover = [],
  agency = [],
}) {
  const filledPercent =
    shifts.length > 0 ? Math.round((filled.length / shifts.length) * 100) : 0;

  const internalPercent =
    shifts.length > 0
      ? Math.round((internalCover.length / shifts.length) * 100)
      : 0;

  const agencyPercent =
    shifts.length > 0 ? Math.round((agency.length / shifts.length) * 100) : 0;

  const gapPercent =
    shifts.length > 0 ? Math.round((unfilled.length / shifts.length) * 100) : 0;

  return [
    {
      label: "Filled shifts",
      value: `${filledPercent}%`,
      percent: filledPercent,
      tone:
        filledPercent >= 95 ? "success" : filledPercent >= 80 ? "warning" : "danger",
    },
    {
      label: "Internal cover",
      value: `${internalPercent}%`,
      percent: internalPercent,
      tone:
        internalPercent >= 80 ? "success" : internalPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Agency reliance",
      value: `${agencyPercent}%`,
      percent: agencyPercent,
      tone:
        agencyPercent <= 10 ? "success" : agencyPercent <= 25 ? "warning" : "danger",
    },
    {
      label: "Gap pressure",
      value: `${gapPercent}%`,
      percent: gapPercent,
      tone: gapPercent <= 5 ? "success" : gapPercent <= 15 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  unfilled = [],
  absences = [],
  agency = [],
  notifications = [],
}) {
  const items = [];

  unfilled.slice(0, 3).forEach((item) => {
    items.push({
      title: item.shift_name || item.title || "Unfilled shift",
      summary:
        item.summary ||
        `${formatShortDate(item.shift_date)} • ${formatShiftTime(
          item.start_time,
          item.end_time
        )}`,
    });
  });

  absences.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Absence",
      summary:
        item.summary ||
        `${item.reason || "Absence"} affecting ${formatShortDate(
          item.shift_date || item.start_date
        )}`,
    });
  });

  agency.slice(0, 1).forEach((item) => {
    items.push({
      title: item.shift_name || "Agency cover",
      summary:
        item.summary || "Shift currently depends on agency or bank cover.",
    });
  });

  notifications.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Rota reminder",
      summary: item.summary || item.message || "Rota action still needs attention.",
    });
  });

  return items.slice(0, 6);
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(
                    card.tone || "muted"
                  )}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.staff_member ||
            item?.shift_name ||
            item?.title ||
            "Shift";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.role ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent rota issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function groupShiftsByDate(items = []) {
  const map = new Map();

  items.forEach((item) => {
    const key = item.shift_date || item.date || "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });

  return [...map.entries()].sort(
    (a, b) => toTime(a[0]) - toTime(b[0])
  );
}

function renderGroupedShiftBlocks(groups = []) {
  if (!groups.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>No rota loaded</h3>
          <p>No shifts are currently loaded for this period.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="rota-day-stack">
      ${groups
        .map(
          ([dateKey, items]) => `
            <section class="overview-section-card">
              <div class="overview-section-head">
                <h3>${safeText(formatDate(dateKey))}</h3>
                <p>${safeText(items.length)} shift${items.length === 1 ? "" : "s"} planned.</p>
              </div>

              <div class="record-list">
                ${items
                  .map((item) => {
                    const tone = getStatusTone(item.status || "");
                    const assigned =
                      item.staff_member || item.staff_name || "Unassigned";
                    const role = item.role || item.shift_role || "";
                    const lead = item.is_shift_lead ? "Shift lead" : "";
                    const source = item.source || "";
                    const meta = [
                      formatShiftTime(item.start_time, item.end_time),
                      role,
                      lead,
                      source,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return `
                      <article
                        class="record-row"
                        data-open-record="true"
                        data-record-id="${safeText(item.id || "")}"
                        data-record-type="rota_shift"
                        data-title="${safeText(item.shift_name || assigned)}"
                        tabindex="0"
                        role="button"
                      >
                        <div class="record-row-main">
                          <div class="record-row-title">${safeText(
                            item.shift_name || "Shift"
                          )} • ${safeText(assigned)}</div>
                          <div class="record-row-summary">${safeText(
                            item.summary || "Planned rota assignment."
                          )}</div>
                          <div class="record-row-meta">${safeText(meta)}</div>
                        </div>
                        <div class="record-row-side">
                          <span class="row-pill ${safeText(tone)}">${safeText(
                            item.status || "planned"
                          )}</span>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRotaHtml({
  title = "Rota",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  groupedShifts = [],
  absences = [],
  unfilled = [],
  notifications = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Rota and staffing cover</div>
          <h2>${safeText(title)}</h2>
          <p>A live rota view across staffing cover, shift leads, absences, agency use and gaps.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live rota endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Rota snapshot</h3>
          <p>A quick visual read across coverage, internal fill, agency use and gap pressure.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Planned shifts</h3>
              <p>Who is working, what shift they are on, and where gaps remain.</p>
            </div>

            ${renderGroupedShiftBlocks(groupedShifts)}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent rota issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Unfilled or risky shifts</h3>
              <p>Shifts needing cover or posing operational risk.</p>
            </div>

            ${renderRows(unfilled, {
              emptyMessage: "No unfilled shifts found.",
              titleKey: "shift_name",
              summaryKey: "summary",
              recordType: "rota_shift",
              metaBuilder: (item) =>
                [
                  item.shift_date ? formatDate(item.shift_date) : "",
                  formatShiftTime(item.start_time, item.end_time),
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Absence and leave</h3>
              <p>Sickness, leave and other availability issues affecting cover.</p>
            </div>

            ${renderRows(absences, {
              emptyMessage: "No absences affecting the rota.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "absence",
              metaBuilder: (item) =>
                [
                  item.reason || "",
                  item.shift_date
                    ? formatDate(item.shift_date)
                    : item.start_date
                    ? formatDate(item.start_date)
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Rota notifications</h3>
              <p>Messages and reminders linked to staffing cover.</p>
            </div>

            ${renderRows(notifications, {
              emptyMessage: "No rota notifications found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "notification",
              metaBuilder: (item) =>
                [
                  item.recipient_name || "",
                  item.created_at ? formatDateTime(item.created_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function buildFallbackRotaData(homeId) {
  const now = new Date();
  const isoDay = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId} rota`,
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    shiftData: {
      items: [
        {
          id: "shift-1",
          shift_date: isoDay(0),
          shift_name: "Day shift",
          start_time: "08:00",
          end_time: "20:00",
          staff_member: "Sarah Ahmed",
          role: "Deputy manager",
          is_shift_lead: true,
          source: "core",
          status: "confirmed",
          summary: "Shift lead for daytime cover.",
        },
        {
          id: "shift-2",
          shift_date: isoDay(0),
          shift_name: "Day shift",
          start_time: "08:00",
          end_time: "20:00",
          staff_member: "Lena Morris",
          role: "Residential worker",
          is_shift_lead: false,
          source: "core",
          status: "confirmed",
          summary: "Allocated to daytime cover.",
        },
        {
          id: "shift-3",
          shift_date: isoDay(0),
          shift_name: "Waking night",
          start_time: "20:00",
          end_time: "08:00",
          staff_member: "Agency worker",
          role: "Agency",
          is_shift_lead: false,
          source: "agency",
          status: "agency",
          summary: "Agency cover used for waking night.",
        },
        {
          id: "shift-4",
          shift_date: isoDay(1),
          shift_name: "Day shift",
          start_time: "08:00",
          end_time: "20:00",
          staff_member: "",
          role: "Residential worker",
          is_shift_lead: false,
          source: "unfilled",
          status: "unfilled",
          summary: "Shift still needs cover.",
        },
        {
          id: "shift-5",
          shift_date: isoDay(1),
          shift_name: "Sleep-in",
          start_time: "20:00",
          end_time: "08:00",
          staff_member: "Ben Carter",
          role: "Senior residential worker",
          is_shift_lead: false,
          source: "core",
          status: "planned",
          summary: "Planned sleep-in shift.",
        },
      ],
    },
    absenceData: {
      items: [
        {
          id: "abs-1",
          staff_member: "Aimee Khan",
          reason: "Sickness",
          shift_date: isoDay(0),
          summary: "Reported sick for today’s late shift.",
          status: "sick",
        },
      ],
    },
    gapData: {
      items: [
        {
          id: "gap-1",
          shift_name: "Day shift",
          shift_date: isoDay(1),
          start_time: "08:00",
          end_time: "20:00",
          summary: "One residential worker still needed.",
          status: "unfilled",
        },
      ],
    },
    notificationData: {
      items: [
        {
          id: "rotan-1",
          title: "Cover needed tomorrow",
          recipient_name: "Sarah Ahmed",
          created_at: new Date().toISOString(),
          summary: "Tomorrow’s day shift still has one unfilled post.",
          status: "warning",
        },
        {
          id: "rotan-2",
          title: "Agency in use tonight",
          recipient_name: "Tom Kelly",
          created_at: new Date().toISOString(),
          summary: "Waking night currently relies on agency cover.",
          status: "due_soon",
        },
      ],
    },
  };
}

async function fetchRotaDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/rota`).catch(() => null),
    apiGet(`/homes/${homeId}/rota-absences`).catch(() => null),
    apiGet(`/homes/${homeId}/rota-gaps`).catch(() => null),
    apiGet(`/homes/${homeId}/notifications`).catch(() => null),
  ];

  const [shiftData, absenceData, gapData, notificationData] =
    await Promise.all(requests);

  const responses = [shiftData, absenceData, gapData, notificationData];
  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackRotaData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: shiftData || {},
    shiftData: shiftData || { items: [] },
    absenceData: absenceData || { items: [] },
    gapData: gapData || { items: [] },
    notificationData: notificationData || { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">◷</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the rota can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No rota context",
    nextEvent: "No shift loaded",
    lastRecord: "No rota data",
    openActions: "No cover actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading rota…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading rota",
    nextEvent: "Checking next shift",
    lastRecord: "Loading staffing activity",
    openActions: "Loading cover actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load rota</h3>
          <p>${safeText(message || "The rota view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Rota unavailable",
    nextEvent: "No shift loaded",
    lastRecord: "No rota record loaded",
    openActions: "No cover actions loaded",
  });
}

export async function loadRota() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      shiftData,
      absenceData,
      gapData,
      notificationData,
      isFallback,
    } = await fetchRotaDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const shifts = sortSoonestFirst(normaliseShiftItems(shiftData), [
      "shift_date",
      "start_time",
      "updated_at",
      "created_at",
    ]);

    const absences = sortSoonestFirst(normaliseAbsenceItems(absenceData), [
      "shift_date",
      "start_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const gaps = sortSoonestFirst(normaliseGapItems(gapData), [
      "shift_date",
      "start_time",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const notifications = sortNewestFirst(
      normaliseNotificationItems(notificationData),
      ["created_at", "updated_at"]
    ).slice(0, 6);

    const todayKey = new Date().toDateString();
    const todayShifts = shifts.filter((item) => {
      const d = new Date(item.shift_date || item.date || item.start_time || "");
      return !Number.isNaN(d.getTime()) && d.toDateString() === todayKey;
    });

    const unfilled = shifts.filter(
      (item) =>
        ["unfilled", "gap"].includes(
          String(item.status || "").toLowerCase().trim()
        ) || !String(item.staff_member || item.staff_name || "").trim()
    );

    const agency = shifts.filter((item) =>
      ["agency", "bank", "bank_staff"].includes(
        String(item.source || item.status || "").toLowerCase().trim()
      )
    );

    const filled = shifts.filter((item) => !unfilled.includes(item));
    const internalCover = filled.filter(
      (item) =>
        !["agency", "bank", "bank_staff"].includes(
          String(item.source || "").toLowerCase().trim()
        )
    );
    const shiftLeads = shifts.filter((item) => Boolean(item.is_shift_lead));

    const topStats = buildTopStats({
      shifts,
      todayShifts,
      unfilled,
      agency,
      absences,
      shiftLeads,
    });

    const progressCards = buildProgressCards({
      shifts,
      filled,
      unfilled,
      internalCover,
      agency,
    });

    const priorityItems = buildPriorityItems({
      unfilled: gaps.length ? gaps : unfilled,
      absences,
      agency,
      notifications,
    });

    const groupedShifts = groupShiftsByDate(shifts.slice(0, 20));

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} rota`;

    els.viewContent.innerHTML = renderRotaHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      groupedShifts,
      absences,
      unfilled: gaps.length ? gaps : unfilled.slice(0, 6),
      notifications,
      isFallback,
    });

    const nextShift = shifts[0];
    const latestNotification = notifications[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${todayShifts.length} shifts today • preview mode`
        : `${todayShifts.length} shifts today • ${unfilled.length} gaps`,
      nextEvent: nextShift?.shift_date
        ? `${formatShortDate(nextShift.shift_date)} • ${formatShiftTime(
            nextShift.start_time,
            nextShift.end_time
          )}`
        : "No next shift loaded",
      lastRecord: latestNotification?.created_at
        ? `Latest rota alert ${formatDateTime(latestNotification.created_at)}`
        : isFallback
        ? "Preview rota data loaded"
        : "No recent rota alert loaded",
      openActions: `${unfilled.length} gaps • ${agency.length} agency/bank`,
    });
  } catch (error) {
    console.error("[rota] load failed", error);
    renderErrorState(error?.message || "The rota view could not be loaded.");
  }
}