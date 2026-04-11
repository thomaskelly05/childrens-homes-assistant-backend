import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
import {
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
} from "../core/adapters.js";

function buildHandoverSummary({
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
          latestNote?.workflow_status || latestNote?.record_date || ""
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

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
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
      chronologyData,
      handoverRecordsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/timeline?limit=12`).catch(() => ({ timeline: [] })),
      apiGet(`/young-people/${state.youngPersonId}/handover-records`).catch(() => ({ items: [] })),
    ]);

    const dailyNotes = sortNewestFirst(
      (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote),
      ["record_date", "recorded_at", "created_at"]
    );

    const incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident),
      ["occurred_at", "recorded_at", "created_at"]
    );

    const appointments = sortNewestFirst(
      (
        appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        appointmentsData.young_person_appointments ||
        []
      ).map(mapAppointment),
      ["start_datetime", "created_at"]
    );

    const plans = sortNewestFirst(
      (plansData.items || plansData.records || plansData.support_plans || []).map(mapSupportPlan),
      ["review_date", "updated_at", "created_at"]
    );

    const chronology = sortNewestFirst(
      (chronologyData.timeline || chronologyData.items || []).map(mapChronologyEvent),
      ["event_datetime", "created_at"]
    );

    const handoverRecords = sortNewestFirst(
      (handoverRecordsData.items || handoverRecordsData.records || handoverRecordsData.handover_records || []).map(
        (item) => ({
          id: item.id,
          record_type: "handover_record",
          title: item.title || "Handover",
          summary: item.summary_text || "Handover record",
          handover_date: item.handover_date || null,
          created_at: item.created_at || null,
          updated_at: item.updated_at || null,
          status: item.status || "",
          shift_type: item.shift_type || "",
        })
      ),
      ["handover_date", "created_at"]
    );

    const recentPriorityItems = [
      ...incidents.slice(0, 3),
      ...appointments.slice(0, 3),
      ...chronology.slice(0, 4),
    ].slice(0, 8);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Daily notes", dailyNotes.length)}
        ${renderSummaryStat("Incidents", incidents.length)}
        ${renderSummaryStat("Appointments", appointments.length)}
        ${renderSummaryStat("Plans", plans.length)}
      </section>

      ${renderSection(
        "Shift snapshot",
        "The quickest way to understand what the next adult needs to know.",
        buildHandoverSummary({
          dailyNotes,
          incidents,
          appointments,
          plans,
          chronology,
        })
      )}

      ${renderSection(
        "Priority items",
        "Recent incidents, appointments and chronology that may affect the next shift.",
        renderRowList(recentPriorityItems, "No priority items found.")
      )}

      ${renderSection(
        "Recent daily notes",
        "Day-to-day context from the most recent notes.",
        renderRowList(dailyNotes.slice(0, 6), "No recent daily notes found.")
      )}

      ${renderSection(
        "Current support plans",
        "Plans and guidance that adults should keep in mind.",
        renderRowList(plans.slice(0, 6), "No current support plans found.")
      )}

      ${renderSection(
        "Recent handover records",
        "Previous handover summaries and shift continuity notes.",
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