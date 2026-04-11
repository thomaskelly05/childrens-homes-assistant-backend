import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList } from "../ui/records.js";
import {
  mapChronologyEvent,
  mapDailyNote,
  mapIncident,
  mapHealthRecord,
  mapEducationRecord,
  mapFamilyContactRecord,
  mapKeyworkSession,
  mapAppointment,
  mapSupportPlan,
  mapRiskAssessment,
} from "../core/adapters.js";

function renderSection(title, subtitle, body) {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

function sortTimelineRows(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(
      a.event_datetime ||
      a.start_datetime ||
      a.contact_datetime ||
      a.session_date ||
      a.record_date ||
      a.review_date ||
      a.occurred_at ||
      a.recorded_at ||
      a.created_at ||
      0
    ).getTime();

    const bTime = new Date(
      b.event_datetime ||
      b.start_datetime ||
      b.contact_datetime ||
      b.session_date ||
      b.record_date ||
      b.review_date ||
      b.occurred_at ||
      b.recorded_at ||
      b.created_at ||
      0
    ).getTime();

    return bTime - aTime;
  });
}

function dedupeTimelineRows(rows = []) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = [
      row.record_type || "record",
      row.source_table || "",
      row.source_id || row.id || "",
      row.event_datetime || row.start_datetime || row.recorded_at || row.occurred_at || row.record_date || "",
      row.title || "",
    ].join("::");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrichChronologyRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    title:
      row.title ||
      row.category ||
      row.record_type ||
      "Timeline event",
    summary:
      row.summary ||
      row.outcome ||
      row.concern_summary ||
      row.description ||
      "Open to view more detail.",
  }));
}

export async function loadTimeline() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading timeline...</p>
      </div>
    </div>
  `;

  try {
    const [
      chronologyData,
      dailyNotesData,
      incidentsData,
      healthData,
      educationData,
      familyData,
      keyworkData,
      appointmentsData,
      plansData,
      risksData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/timeline?limit=100`).catch(() => ({ timeline: [] })),
      apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/health`).catch(() => ({ health_records: [] })),
      apiGet(`/young-people/${state.youngPersonId}/education`).catch(() => ({ education_records: [] })),
      apiGet(`/young-people/${state.youngPersonId}/family`).catch(() => ({ family_contact_records: [] })),
      apiGet(`/young-people/${state.youngPersonId}/keywork`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/risks`).catch(() => ({ items: [] })),
    ]);

    const chronologyRows = enrichChronologyRows(
      (chronologyData.timeline || chronologyData.items || []).map(mapChronologyEvent)
    );

    const dailyRows = (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote);
    const incidentRows = (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident);
    const healthRows = (healthData.health_records || healthData.items || []).map(mapHealthRecord);
    const educationRows = (educationData.education_records || educationData.items || []).map(mapEducationRecord);
    const familyRows = (familyData.family_contact_records || familyData.items || []).map(mapFamilyContactRecord);
    const keyworkRows = (keyworkData.items || keyworkData.records || keyworkData.keywork_sessions || []).map(mapKeyworkSession);
    const appointmentRows = (
      appointmentsData.items ||
      appointmentsData.records ||
      appointmentsData.appointments ||
      appointmentsData.young_person_appointments ||
      []
    ).map(mapAppointment);
    const planRows = (plansData.items || plansData.records || plansData.support_plans || []).map(mapSupportPlan);
    const riskRows = (risksData.items || risksData.records || risksData.risk_assessments || []).map(mapRiskAssessment);

    const allRows = dedupeTimelineRows(
      sortTimelineRows([
        ...chronologyRows,
        ...dailyRows,
        ...incidentRows,
        ...healthRows,
        ...educationRows,
        ...familyRows,
        ...keyworkRows,
        ...appointmentRows,
        ...planRows,
        ...riskRows,
      ])
    );

    els.viewContent.innerHTML = `
      ${renderSection(
        "Timeline",
        "A single chronology across daily life, important events, health, learning, family time, appointments and planning.",
        renderRowList(allRows, "No timeline items found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load timeline.")}</p>
      </div>
    `;
  }
}
