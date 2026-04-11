import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderSummaryStat, renderRowList } from "../ui/records.js";
import { mapAppointment } from "../core/adapters.js";

function sortByStart(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.start_datetime || a?.appointment_date || 0).getTime();
    const bTime = new Date(b?.start_datetime || b?.appointment_date || 0).getTime();
    return aTime - bTime;
  });
}

function sortNewestFirst(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.start_datetime || a?.created_at || 0).getTime();
    const bTime = new Date(b?.start_datetime || b?.created_at || 0).getTime();
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
  const start = item.start_datetime || item.appointment_date || item.created_at || null;
  const end = item.end_datetime || null;

  const startLabel = start
    ? new Date(start).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Time not set";

  const endLabel =
    end && !Number.isNaN(new Date(end).getTime())
      ? new Date(end).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return {
    ...item,
    title: item.title || item.appointment_type || "Appointment",
    summary: [
      endLabel ? `${startLabel}–${endLabel}` : startLabel,
      item.location || "",
      item.professional_name || "",
      item.status || "",
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

function groupByDay(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = toDayKey(item.start_datetime || item.appointment_date || item.created_at);
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

function renderCalendarGroups(groups = []) {
  if (!groups.length) {
    return `
      <div class="empty-state">
        <p>No appointments found.</p>
      </div>
    `;
  }

  return groups
    .map(
      (group) => `
        <section class="calendar-day-group">
          <div class="calendar-day-heading">${escapeHtml(group.label)}</div>
          ${renderRowList(group.records.map(buildCalendarRow), "No items")}
        </section>
      `
    )
    .join("");
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

    const appointments = sortByStart(
      [
        ...(appointmentsData.items ||
          appointmentsData.records ||
          appointmentsData.appointments ||
          []),
        ...(youngPersonAppointmentsData.items ||
          youngPersonAppointmentsData.records ||
          youngPersonAppointmentsData.young_person_appointments ||
          []),
      ].map(mapAppointment)
    );

    const uniqueAppointments = appointments.filter((item, index, arr) => {
      const id = item.id ?? item.source_id;
      return index === arr.findIndex((x) => (x.id ?? x.source_id) === id);
    });

    const todayItems = uniqueAppointments.filter((item) => isToday(item.start_datetime));
    const upcomingItems = uniqueAppointments.filter(
      (item) =>
        isFuture(item.start_datetime) &&
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

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("All appointments", uniqueAppointments.length)}
        ${renderSummaryStat("Today", todayItems.length)}
        ${renderSummaryStat("Upcoming", upcomingItems.length)}
        ${renderSummaryStat("Completed", completedItems.length)}
      </section>

      ${renderSection(
        "Today",
        "Appointments happening today.",
        renderRowList(todayItems.map(buildCalendarRow), "No appointments today.")
      )}

      ${renderSection(
        "Upcoming by date",
        "Future appointments grouped by day.",
        renderCalendarGroups(groupedUpcoming)
      )}

      ${renderSection(
        "Completed appointments",
        "Appointments marked as completed.",
        renderRowList(completedItems.map(buildCalendarRow), "No completed appointments found.")
      )}

      ${renderSection(
        "Cancelled appointments",
        "Appointments that were cancelled.",
        renderRowList(cancelledItems.map(buildCalendarRow), "No cancelled appointments found.")
      )}

      ${renderSection(
        "All appointments",
        "Full appointment list in date order.",
        renderRowList(uniqueAppointments.map(buildCalendarRow), "No appointments found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load calendar.")}</p>
      </div>
    `;
  }
}