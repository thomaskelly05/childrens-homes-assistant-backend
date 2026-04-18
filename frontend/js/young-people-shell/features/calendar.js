import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { mapAppointment } from "../core/adapters.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function getYoungPersonId() {
  return state.youngPersonId || state.selectedYoungPerson?.id || null;
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Home")
    );
  }

  const person = state.selectedYoungPerson || state.youngPerson || {};
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

function getAppointmentStart(item = {}) {
  return (
    item.start_datetime ||
    item.appointment_date ||
    item.scheduled_time ||
    item.created_at ||
    null
  );
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

  if (/^\d{2}:\d{2}/.test(String(value))) {
    return String(value).slice(0, 5);
  }

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
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◌</div>
        <h3>No calendar data</h3>
        <p>${toText(message)}</p>
      </div>
    </div>
  `;
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase().replaceAll(" ", "_");

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
  title = "Appointments",
  uniqueAppointments = [],
  todayItems = [],
  upcomingItems = [],
  completedItems = [],
  cancelledItems = [],
  groupedUpcoming = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Appointments</div>
          <h2>${toText(title)}</h2>
          <p>Today’s appointments, upcoming plans and appointment history.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live appointment endpoints are available.</p>`
              : ""
          }
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

function buildFallbackAppointments(scope = "child") {
  const now = new Date();
  const plusDays = (days, hour = 10, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  if (scope === "home") {
    return [
      {
        id: "apt-home-1",
        title: "Fire service visit",
        appointment_type: "Professional visit",
        start_datetime: plusDays(1, 10, 0),
        end_datetime: plusDays(1, 11, 0),
        location: "Home",
        professional_name: "Watch Manager Lewis",
        professional_role: "Fire Service",
        status: "booked",
        record_type: "appointment",
      },
      {
        id: "apt-home-2",
        title: "Therapy consultation",
        appointment_type: "Consultation",
        start_datetime: plusDays(2, 14, 0),
        end_datetime: plusDays(2, 15, 0),
        location: "Meeting room",
        professional_name: "Priya Shah",
        professional_role: "Therapist",
        status: "confirmed",
        record_type: "appointment",
      },
    ];
  }

  return [
    {
      id: "apt-child-1",
      title: "CAMHS appointment",
      appointment_type: "CAMHS",
      start_datetime: plusDays(0, 15, 30),
      end_datetime: plusDays(0, 16, 30),
      location: "Clinic",
      professional_name: "Dr Patel",
      professional_role: "CAMHS clinician",
      status: "booked",
      record_type: "appointment",
    },
    {
      id: "apt-child-2",
      title: "Dental check-up",
      appointment_type: "Dentist",
      start_datetime: plusDays(3, 9, 0),
      end_datetime: plusDays(3, 9, 30),
      location: "Dental practice",
      professional_name: "NHS Dentist",
      professional_role: "Dentist",
      status: "confirmed",
      record_type: "appointment",
    },
    {
      id: "apt-child-3",
      title: "PEP review",
      appointment_type: "Education meeting",
      start_datetime: plusDays(-4, 13, 0),
      end_datetime: plusDays(-4, 14, 0),
      location: "School",
      professional_name: "Virtual School",
      professional_role: "PEP review",
      status: "completed",
      record_type: "appointment",
    },
  ];
}

async function fetchCalendarDataset() {
  const scope = getCurrentScope();
  const youngPersonId = getYoungPersonId();
  const homeId = getHomeId();

  if (scope === "child") {
    if (!youngPersonId) {
      return { items: [], isFallback: false, missingContext: true };
    }

    const [appointmentsData, youngPersonAppointmentsData] = await Promise.all([
      apiGet(`/young-people/${youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${youngPersonId}/young-person-appointments`).catch(() => ({ items: [] })),
    ]);

    const merged = [
      ...(appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        []),
      ...(youngPersonAppointmentsData.items ||
        youngPersonAppointmentsData.records ||
        youngPersonAppointmentsData.young_person_appointments ||
        []),
    ].map(mapAppointment);

    if (!merged.length) {
      return {
        items: buildFallbackAppointments("child").map(mapAppointment),
        isFallback: true,
        missingContext: false,
      };
    }

    return { items: merged, isFallback: false, missingContext: false };
  }

  if (!homeId) {
    return { items: [], isFallback: false, missingContext: true };
  }

  const homeAppointments = await apiGet(`/homes/${homeId}/appointments`).catch(() => ({
    items: [],
  }));

  const merged = (
    homeAppointments.items ||
    homeAppointments.records ||
    homeAppointments.appointments ||
    []
  ).map(mapAppointment);

  if (!merged.length) {
    return {
      items: buildFallbackAppointments("home").map(mapAppointment),
      isFallback: true,
      missingContext: false,
    };
  }

  return { items: merged, isFallback: false, missingContext: false };
}

function renderNoContext() {
  if (!els.viewContent) return;

  const scope = getCurrentScope();
  const message =
    scope === "child"
      ? "No young person selected."
      : "No home selected.";

  els.viewContent.innerHTML = renderEmptyState(message);

  updateWorkspaceSummaryStrip({
    today: "No calendar context",
    nextEvent: "No appointments loaded",
    lastRecord: "No calendar data",
    openActions: "No actions loaded",
  });
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
    const { items, isFallback, missingContext } = await fetchCalendarDataset();

    if (missingContext) {
      renderNoContext();
      return;
    }

    const seen = new Set();
    const uniqueAppointments = sortByStart(
      items.filter((item, index) => {
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
      title: `${getScopeTitle()} appointments`,
      uniqueAppointments,
      todayItems,
      upcomingItems,
      completedItems,
      cancelledItems,
      groupedUpcoming,
      isFallback,
    });

    const nextUpcoming = upcomingItems[0] || null;
    const latestCompleted = completedItems[0] || null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${todayItems.length} today • ${upcomingItems.length} upcoming • preview mode`
        : `${todayItems.length} today • ${upcomingItems.length} upcoming`,
      nextEvent: nextUpcoming
        ? `${nextUpcoming.title || nextUpcoming.appointment_type || "Appointment"} • ${formatDateTime(
            getAppointmentStart(nextUpcoming)
          )}`
        : "No upcoming appointments",
      lastRecord: latestCompleted
        ? `Last completed ${formatDateTime(getAppointmentStart(latestCompleted))}`
        : isFallback
        ? "Preview calendar data loaded"
        : "No completed appointments",
      openActions: `${cancelledItems.length} cancelled • ${completedItems.length} completed`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error?.message || "Failed to load calendar.")}</p>
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