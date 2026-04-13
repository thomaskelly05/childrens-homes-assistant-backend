import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { mapAppointment } from "../core/adapters.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function getAppointmentStart(item = {}) {
  return item.start_datetime || item.appointment_date || item.created_at || null;
}

function getAppointmentEnd(item = {}) {
  return item.end_datetime || null;
}

function getAppointmentId(item = {}) {
  return item.id ?? item.source_id ?? item.record_id ?? null;
}

function sortByStart(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(getAppointmentStart(a) || 0).getTime();
    const bTime = new Date(getAppointmentStart(b) || 0).getTime();
    return aTime - bTime;
  });
}

function sortNewestFirst(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(getAppointmentStart(a) || 0).getTime();
    const bTime = new Date(getAppointmentStart(b) || 0).getTime();
    return bTime - aTime;
  });
}

function toDayKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayHeading(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isFuture(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function buildCalendarRow(item = {}) {
  const start = getAppointmentStart(item);
  const end = getAppointmentEnd(item);

  const startLabel = formatTime(start) || "Time not set";
  const endLabel = formatTime(end);

  return {
    ...item,
    title: item.title || item.appointment_type || "Appointment",
    summary: [
      endLabel ? `${startLabel}–${endLabel}` : startLabel,
      item.location || "",
      item.professional_name || "",
      item.professional_role || "",
      item.status || "",
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

function groupByDay(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = toDayKey(getAppointmentStart(item));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  return [...grouped.entries()]
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([day, records]) => ({
      day,
      label: formatDayHeading(day),
      records: sortByStart(records),
    }));
}

function renderEmptyState(message = "No appointments found.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();

  if (["cancelled", "missed", "dna", "overdue"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "warning" };
  }

  if (["completed"].includes(status)) {
    return { label: "completed", tone: "muted" };
  }

  if (["booked", "scheduled", "confirmed"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "success" };
  }

  return {
    label: status ? status.replaceAll("_", " ") : "appointment",
    tone: "muted",
  };
}

function renderRecordRows(items = [], emptyMessage = "No appointments found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const row = buildCalendarRow(item);
          const pill = getRowPill(row);
          const start = getAppointmentStart(row);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(getAppointmentId(row) ?? "")}"
              data-record-type="${toText(row.record_type || "appointment")}"
              data-title="${toText(row.title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(row.title)}</div>
                <div class="record-row-summary">${toText(row.summary || "Appointment")}</div>
                <div class="record-row-meta">${toText(formatDateTime(start))}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCalendarGroups(groups = []) {
  if (!groups.length) {
    return renderEmptyState("No upcoming appointments found.");
  }

  return groups
    .map(
      (group) => `
        <div class="calendar-day-group">
          <div class="calendar-day-heading">${toText(group.label)}</div>
          ${renderRecordRows(group.records, "No items")}
        </div>
      `
    )
    .join("");
}

function renderCalendarHtml({
  uniqueAppointments = [],
  todayItems = [],
  upcomingItems = [],
  completedItems = [],
  cancelledItems = [],
  groupedUpcoming = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Appointments</div>
          <h2>Appointments and key dates</h2>
          <p>Today’s appointments, upcoming plans and appointment history.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All appointments</span>
              <strong class="overview-stat-value">${toText(uniqueAppointments.length)}</strong>
              <span class="overview-stat-note">All recorded appointments</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Today</span>
              <strong class="overview-stat-value">${toText(todayItems.length)}</strong>
              <span class="overview-stat-note">Appointments happening today</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Upcoming</span>
              <strong class="overview-stat-value">${toText(upcomingItems.length)}</strong>
              <span class="overview-stat-note">Future appointments scheduled</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Completed</span>
              <strong class="overview-stat-value">${toText(completedItems.length)}</strong>
              <span class="overview-stat-note">Completed appointments</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Today</h3>
              <p>Appointments happening today.</p>
            </div>

            ${renderRecordRows(todayItems, "No appointments today.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>All appointments</h3>
              <p>Full appointment list in date order.</p>
            </div>

            ${renderRecordRows(uniqueAppointments, "No appointments found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Upcoming by date</h3>
              <p>Future appointments grouped by day.</p>
            </div>

            ${renderCalendarGroups(groupedUpcoming)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Completed appointments</h3>
              <p>Appointments marked as completed.</p>
            </div>

            ${renderRecordRows(completedItems, "No completed appointments found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Cancelled appointments</h3>
              <p>Appointments that were cancelled.</p>
            </div>

            ${renderRecordRows(cancelledItems, "No cancelled appointments found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadCalendar() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading calendar...</p>
      </div>
    </div>
  `;

  try {
    const [appointmentsData, youngPersonAppointmentsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/young-person-appointments`).catch(() => ({ items: [] })),
    ]);

    const mergedAppointments = [
      ...(appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        []),
      ...(youngPersonAppointmentsData.items ||
        youngPersonAppointmentsData.records ||
        youngPersonAppointmentsData.young_person_appointments ||
        []),
    ].map(mapAppointment);

    const seen = new Set();
    const uniqueAppointments = sortByStart(
      mergedAppointments.filter((item, index) => {
        const id = getAppointmentId(item);
        const fallbackKey = `${getAppointmentStart(item)}::${item.title || item.appointment_type || ""}::${item.location || ""}`;
        const key = id ?? fallbackKey ?? index;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );

    const todayItems = uniqueAppointments.filter((item) =>
      isToday(getAppointmentStart(item))
    );

    const upcomingItems = uniqueAppointments.filter(
      (item) =>
        isFuture(getAppointmentStart(item)) &&
        !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
    );

    const completedItems = sortNewestFirst(
      uniqueAppointments.filter(
        (item) => String(item.status || "").toLowerCase() === "completed"
      )
    );

    const cancelledItems = sortNewestFirst(
      uniqueAppointments.filter(
        (item) => String(item.status || "").toLowerCase() === "cancelled"
      )
    );

    const groupedUpcoming = groupByDay(upcomingItems);

    els.viewContent.innerHTML = renderCalendarHtml({
      uniqueAppointments,
      todayItems,
      upcomingItems,
      completedItems,
      cancelledItems,
      groupedUpcoming,
    });

    const nextUpcoming = upcomingItems[0] || null;
    const latestCompleted = completedItems[0] || null;

    updateWorkspaceSummaryStrip({
      today: `${todayItems.length} today • ${upcomingItems.length} upcoming`,
      nextEvent: nextUpcoming
        ? `${nextUpcoming.title || nextUpcoming.appointment_type || "Appointment"} • ${formatDateTime(
            getAppointmentStart(nextUpcoming)
          )}`
        : "No upcoming appointments",
      lastRecord: latestCompleted
        ? `Last completed ${formatDateTime(getAppointmentStart(latestCompleted))}`
        : "No completed appointments",
      openActions: `${cancelledItems.length} cancelled • ${completedItems.length} completed`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load calendar.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Calendar unavailable",
      nextEvent: "Unable to load appointments",
      lastRecord: "No calendar data loaded",
      openActions: "Check API responses",
    });
  }
}