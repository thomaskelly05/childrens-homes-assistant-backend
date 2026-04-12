import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeValue(value) {
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

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function getRowDate(item = {}) {
  return (
    item.record_date ||
    item.occurred_at ||
    item.start_datetime ||
    item.review_date ||
    item.event_datetime ||
    item.handover_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = String(item.status || item.workflow_status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();

  if (
    ["high", "critical"].includes(severity) ||
    ["high", "critical"].includes(significance) ||
    ["escalated", "overdue"].includes(status) ||
    item.safeguarding_flag
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (status) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: "Recorded", tone: "muted" };
}

function normaliseRows(items = [], recordTypeFallback = "record") {
  return items.map((item) => ({
    ...item,
    id: item.id ?? item.source_id ?? "",
    record_type: item.record_type || recordTypeFallback,
    title:
      item.title ||
      item.appointment_type ||
      item.shift_type ||
      item.provision_name ||
      "Record",
    summary:
      item.summary ||
      item.presentation ||
      item.outcome ||
      item.description ||
      item.note ||
      "Recorded item",
  }));
}

function renderRecordRows(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(item.id)}"
              data-record-type="${toText(item.record_type || "")}"
              data-title="${toText(item.title || "Record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title || "Record")}</div>
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDateTimeValue(getRowDate(item)))}</div>` : ""}
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

  return [
    {
      label: "Latest daily note",
      value: latestNote?.summary || latestNote?.presentation || "No recent daily note.",
      subtext: latestNote?.record_date || latestNote?.workflow_status || "",
    },
    {
      label: "Recent incident",
      value: latestIncident?.summary || latestIncident?.title || "No recent incident.",
      subtext: latestIncident?.severity || latestIncident?.workflow_status || "",
    },
    {
      label: "Next appointment",
      value: nextAppointment?.title || nextAppointment?.appointment_type || "No upcoming appointment.",
      subtext: nextAppointment?.start_datetime || nextAppointment?.status || "",
    },
    {
      label: "Current plan",
      value: currentPlan?.title || currentPlan?.summary || "No active support plan.",
      subtext: currentPlan?.review_date || currentPlan?.status || "",
    },
    {
      label: "Latest chronology",
      value: latestChronology?.summary || latestChronology?.title || "No recent chronology.",
      subtext: latestChronology?.event_datetime || latestChronology?.category || "",
    },
  ];
}

function renderInfoRows(items = [], emptyMessage = "No handover context available yet.") {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${visible
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.label)}</div>
                <div class="record-row-summary">${toText(item.value)}</div>
                ${item.subtext ? `<div class="record-row-meta">${toText(item.subtext)}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Snapshot</span>
              </div>
            </article>
          `
        )
        .join("")}
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

function renderHandoverHtml({
  dailyNotes = [],
  incidents = [],
  appointments = [],
  plans = [],
  chronology = [],
  handoverRecords = [],
}) {
  const snapshot = buildSnapshot({
    dailyNotes,
    incidents,
    appointments,
    plans,
    chronology,
  });

  const priorityRows = normaliseRows(
    buildPriorityRows({
      incidents,
      appointments,
      chronology,
    }),
    "priority_item"
  );

  const dailyNoteRows = normaliseRows(dailyNotes.slice(0, 6), "daily_note");
  const planRows = normaliseRows(plans.slice(0, 6), "support_plan");
  const chronologyRows = normaliseRows(chronology.slice(0, 8), "chronology_event");
  const handoverRows = normaliseRows(handoverRecords.slice(0, 6), "handover_record");

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Handover</div>
          <h2>Shift handover</h2>
          <p>The quickest view of what the next adult needs to know for safe, consistent care.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Daily notes</span>
              <strong class="overview-stat-value">${toText(dailyNotes.length)}</strong>
              <span class="overview-stat-note">Recent care continuity notes</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Incidents</span>
              <strong class="overview-stat-value">${toText(incidents.length)}</strong>
              <span class="overview-stat-note">Recent incidents linked to handover</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Appointments</span>
              <strong class="overview-stat-value">${toText(appointments.length)}</strong>
              <span class="overview-stat-note">Upcoming or active appointments</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Handovers</span>
              <strong class="overview-stat-value">${toText(handoverRecords.length)}</strong>
              <span class="overview-stat-note">Previous handover records</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Shift snapshot</h3>
              <p>The quickest way to understand what the next adult needs to know.</p>
            </div>

            ${renderInfoRows(snapshot)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Priority items</h3>
              <p>High-risk incidents, upcoming appointments and safeguarding-linked chronology.</p>
            </div>

            ${renderRecordRows(priorityRows, "No priority items found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent daily notes</h3>
              <p>The most recent daily notes for care continuity.</p>
            </div>

            ${renderRecordRows(dailyNoteRows, "No recent daily notes found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Current support plans</h3>
              <p>Plans and guidance adults should keep in mind during handover.</p>
            </div>

            ${renderRecordRows(planRows, "No current support plans found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent chronology</h3>
              <p>Chronology items that affect continuity and current understanding.</p>
            </div>

            ${renderRecordRows(chronologyRows, "No chronology found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Previous handover records</h3>
              <p>Earlier handover summaries and continuity notes.</p>
            </div>

            ${renderRecordRows(handoverRows, "No handover records found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
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

    els.viewContent.innerHTML = renderHandoverHtml({
      dailyNotes,
      incidents,
      appointments,
      plans,
      chronology,
      handoverRecords,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load handover.")}</p>
      </div>
    `;
  }
}
