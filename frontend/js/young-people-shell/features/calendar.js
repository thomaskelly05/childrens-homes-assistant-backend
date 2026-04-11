import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import { mapAppointment } from "../core/adapters.js";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfCalendarGrid(date = new Date()) {
  const first = startOfMonth(date);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);
  return start;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getEventDate(item) {
  return toDate(
    item.start_datetime ||
      item.appointment_date ||
      item.event_datetime ||
      item.recorded_at ||
      item.created_at
  );
}

function buildCalendarDays(viewDate, appointments) {
  const start = startOfCalendarGrid(viewDate);
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const dayAppointments = appointments.filter((item) => {
      const eventDate = getEventDate(item);
      return eventDate && sameDay(eventDate, date);
    });

    days.push({
      date,
      inMonth: date.getMonth() === viewDate.getMonth(),
      isToday: sameDay(date, new Date()),
      appointments: dayAppointments,
    });
  }

  return days;
}

function renderCalendarHeader(viewDate) {
  return `
    <div class="calendar-head">
      <div>
        <h3>${escapeHtml(
          viewDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })
        )}</h3>
        <p>Appointments and important dates for this young person.</p>
      </div>

      <div class="calendar-legend">
        <span class="calendar-legend-dot"></span>
        <span>Appointments</span>
      </div>
    </div>
  `;
}

function renderCalendarGrid(viewDate, appointments) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = buildCalendarDays(viewDate, appointments);

  return `
    <div class="calendar-shell">
      ${renderCalendarHeader(viewDate)}

      <div class="calendar-weekdays">
        ${weekdays.map((day) => `<div class="calendar-weekday">${escapeHtml(day)}</div>`).join("")}
      </div>

      <div class="calendar-grid">
        ${days
          .map((day) => `
            <button
              type="button"
              class="calendar-day ${day.inMonth ? "" : "calendar-day--muted"} ${day.isToday ? "calendar-day--today" : ""}"
              data-calendar-date="${day.date.toISOString()}"
            >
              <div class="calendar-day-number">${day.date.getDate()}</div>

              <div class="calendar-day-events">
                ${day.appointments
                  .slice(0, 3)
                  .map(
                    (item) => `
                      <div class="calendar-event-pill">
                        ${escapeHtml(item.title || item.appointment_type || "Appointment")}
                      </div>
                    `
                  )
                  .join("")}

                ${
                  day.appointments.length > 3
                    ? `<div class="calendar-more">+${day.appointments.length - 3} more</div>`
                    : ""
                }
              </div>
            </button>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function renderAppointmentRows(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No appointments found for this date.</p>
      </div>
    `;
  }

  return `
    <div class="record-rows">
      ${items
        .map(
          (item) => `
            <button
              class="record-row"
              type="button"
              data-open-record='${escapeHtml(JSON.stringify(item))}'
            >
              <div class="record-row-main">
                <div class="record-row-title">${escapeHtml(item.title || item.appointment_type || "Appointment")}</div>
                <div class="record-row-subtitle">${escapeHtml(
                  item.summary ||
                    item.purpose ||
                    item.location ||
                    item.professional_name ||
                    "Open to view details."
                )}</div>
              </div>

              <div class="record-row-meta">
                <div>${escapeHtml(formatDate(item.start_datetime || item.appointment_date))}</div>
                ${item.status ? `<div>${escapeHtml(item.status)}</div>` : ""}
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function bindCalendarDayClicks(appointments) {
  els.viewContent?.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const iso = button.dataset.calendarDate;
      if (!iso) return;

      const selected = appointments.filter((item) => {
        const date = getEventDate(item);
        return date && sameDay(date, new Date(iso));
      });

      const host = document.getElementById("calendarDayResults");
      if (!host) return;

      host.innerHTML = renderAppointmentRows(selected);
    });
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
    const [appointmentsData, altAppointmentsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/young-person-appointments`).catch(() => ({ items: [] })),
    ]);

    const rawAppointments = [
      ...(appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        []),
      ...(altAppointmentsData.items ||
        altAppointmentsData.records ||
        altAppointmentsData.young_person_appointments ||
        []),
    ];

    const appointments = rawAppointments.map(mapAppointment);
    const now = new Date();

    els.viewContent.innerHTML = `
      <section class="content-section">
        <div class="content-section-head">
          <div>
            <h3>Calendar</h3>
            <p>A proper month view of appointments and important dates.</p>
          </div>
        </div>

        ${renderCalendarGrid(now, appointments)}
      </section>

      <section class="content-section">
        <div class="content-section-head">
          <div>
            <h3>Selected day</h3>
            <p>Click a day in the calendar to view appointments for that date.</p>
          </div>
        </div>

        <div id="calendarDayResults">
          ${renderAppointmentRows(appointments)}
        </div>
      </section>
    `;

    bindCalendarDayClicks(appointments);
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load calendar.")}</p>
      </div>
    `;
  }
}
