import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapHandoverRecord,
} from "../core/adapters.js";

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function buildSnapshot({
  dailyNotes = [],
  incidents = [],
  appointments = [],
  plans = [],
  chronology = [],
}) {
  const latestNote = dailyNotes[0] || null;
  const latestIncident = incidents[0] || null;
  const nextAppointment = appointments[0] || null;
  const currentPlan = plans[0] || null;
  const latestChronology = chronology[0] || null;

  return `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-card-title">Latest daily note</div>
        <div class="profile-card-text">${escapeHtml(
          latestNote?.summary || latestNote?.presentation || "No recent daily note."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          latestNote?.record_date || latestNote?.workflow_status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Recent incident</div>
        <div class="profile-card-text">${escapeHtml(
          latestIncident?.summary || latestIncident?.title || "No recent incident."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          latestIncident?.severity || latestIncident?.workflow_status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Next appointment</div>
        <div class="profile-card-text">${escapeHtml(
          nextAppointment?.title || nextAppointment?.appointment_type || "No upcoming appointment."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          nextAppointment?.start_datetime || nextAppointment?.status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Current plan</div>
        <div class="profile-card-text">${escapeHtml(
          currentPlan?.title || currentPlan?.summary || "No active support plan."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          currentPlan?.review_date || currentPlan?.status || ""
        )}</div>
      </div>

      <div class="profile-card">
        <div class="profile-card-title">Latest chronology</div>
        <div class="profile-card-text">${escapeHtml(
          latestChronology?.summary || latestChronology?.title || "No recent chronology."
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(
          latestChronology?.event_datetime || latestChronology?.category || ""
        )}</div>
      </div>
    </div>
  `;
}

function buildPriorityRows({
  incidents = [],
  appointments = [],
  chronology = [],
}) {
  const recentHighIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  );

  const urgentAppointments = appointments.filter((item) =>
    !["cancelled", "completed"].includes(String(item.status || "").toLowerCase())
  );

  const safeguardingChronology = chronology.filter((item) => item.safeguarding_flag);

  return [...recentHighIncidents, ...urgentAppointments, ...safeguardingChronology].slice(0, 10);
}

export async function loadHandover() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading handover...</p>
      </div>
    </div>
  `;

  try {
    const [
      dailyNotesData,
      incidentsData,
      appointmentsData,
      plansData,
      timelineData,
      handoverRecordsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/timeline`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/handover-records`).catch(() => ({ items: [] })),
    ]);

    const dailyNotes = sortNewestFirst(
      (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote),
      ["record_date", "created_at"]
    );

    const incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident),
      ["occurred_at", "created_at"]
    );

    const appointments = sortSoonestFirst(
      (
        appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        appointmentsData.young_person_appointments ||
        []
      ).map(mapAppointment),
      ["start_datetime", "created_at"]
    );

    const plans = sortSoonestFirst(
      (plansData.items || plansData.records || plansData.support_plans || []).map(mapSupportPlan),
      ["review_date", "updated_at", "created_at"]
    );

    const chronology = sortNewestFirst(
      (
        timelineData.timeline ||
        timelineData.items ||
        timelineData.records ||
        timelineData.chronology_events ||
        []
      ).map(mapChronologyEvent),
      ["event_datetime", "created_at"]
    );

    const handoverRecords = sortNewestFirst(
      (
        handoverRecordsData.items ||
        handoverRecordsData.records ||
        handoverRecordsData.handover_records ||
        []
      ).map(mapHandoverRecord),
      ["handover_date", "created_at"]
    );

    const priorityRows = buildPriorityRows({
      incidents,
      appointments,
      chronology,
    });

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Daily notes", dailyNotes.length)}
        ${renderSummaryStat("Incidents", incidents.length)}
        ${renderSummaryStat("Appointments", appointments.length)}
        ${renderSummaryStat("Handovers", handoverRecords.length)}
      </section>

      ${renderSection(
        "Shift snapshot",
        "The quickest way to understand what the next adult needs to know.",
        buildSnapshot({
          dailyNotes,
          incidents,
          appointments,
          plans,
          chronology,
        })
      )}

      ${renderSection(
        "Priority items",
        "High-risk incidents, upcoming appointments and safeguarding-linked chronology.",
        renderRowList(priorityRows, "No priority items found.")
      )}

      ${renderSection(
        "Recent daily notes",
        "The most recent daily notes for care continuity.",
        renderRowList(dailyNotes.slice(0, 6), "No recent daily notes found.")
      )}

      ${renderSection(
        "Current support plans",
        "Plans and guidance that adults should keep in mind during handover.",
        renderRowList(plans.slice(0, 6), "No current support plans found.")
      )}

      ${renderSection(
        "Recent chronology",
        "Recent chronology items that affect continuity and current understanding.",
        renderRowList(chronology.slice(0, 8), "No chronology found.")
      )}

      ${renderSection(
        "Previous handover records",
        "Earlier handover summaries and continuity notes.",
        renderRowList(handoverRecords.slice(0, 6), "No handover records found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load handover.")}</p>
      </div>
    `;
  }
}