import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";
import {
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapHealthRecord,
  mapEducationRecord,
  mapFamilyContactRecord,
} from "../core/adapters.js";

/* -------------------------------- helpers -------------------------------- */

const toText = (v, f = "") => escapeHtml(String(v ?? f ?? ""));

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isToday = (v) => {
  if (!v) return false;
  const d = new Date(v);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

const isFuture = (v) => {
  if (!v) return false;
  return new Date(v).getTime() >= Date.now();
};

const sortNewestFirst = (items = [], keys = []) => {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
};

/* -------------------------------- UI bits -------------------------------- */

function renderEmpty(title, msg) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${toText(title)}</h3>
        <p>${toText(msg)}</p>
      </div>
    </div>
  `;
}

function renderRows(items = []) {
  if (!items.length) return renderEmpty("No records", "Nothing to show yet.");

  return `
    <div class="record-list">
      ${items
        .map(
          (i) => `
        <article
          class="record-row"
          data-open-record="true"
          data-record-id="${toText(i.id || i.source_id || "")}"
          data-record-type="${toText(i.record_type || "")}"
          data-title="${toText(i.title || i.summary || "Record")}"
          role="button"
          tabindex="0"
        >
          <div class="record-row-main">
            <div class="record-row-title">${toText(
              i.title || i.summary || "Record"
            )}</div>
            <div class="record-row-summary">${toText(
              i.summary || i.description || ""
            )}</div>
            <div class="record-row-meta">
              ${formatDate(
                i.record_date ||
                  i.start_datetime ||
                  i.event_datetime ||
                  i.contact_datetime ||
                  i.review_date ||
                  i.created_at ||
                  i.updated_at
              )}
            </div>
          </div>
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

/* -------------------------------- main render -------------------------------- */

function renderWorkspace({ today, recent, upcoming, urgent }) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Workspace</div>
          <h2>Today’s workspace</h2>
        </div>
      </div>

      <div class="overview-stats-grid">
        <article class="overview-stat-card">
          <span class="overview-stat-label">Urgent</span>
          <strong>${urgent.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Today</span>
          <strong>${today.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Recent</span>
          <strong>${recent.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Upcoming</span>
          <strong>${upcoming.length}</strong>
        </article>
      </div>

      <div class="overview-grid">
        <div>
          <h3>Today</h3>
          ${renderRows(today)}

          <h3>Recent</h3>
          ${renderRows(recent)}
        </div>

        <aside>
          <h3>Needs attention</h3>
          ${renderRows(urgent)}

          <h3>Upcoming</h3>
          ${renderRows(upcoming)}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- data -------------------------------- */

function getId() {
  return state.youngPersonId || state.selectedYoungPerson?.id;
}

async function fetchAll(id) {
  const safe = (p) => apiGet(p).catch(() => ({ items: [] }));

  const [
    plans,
    appointments,
    chronology,
    health,
    education,
    family,
  ] = await Promise.all([
    safe(`/young-people/${id}/plans`),
    safe(`/young-people/${id}/appointments`),
    safe(`/young-people/${id}/timeline`),
    safe(`/young-people/${id}/health`),
    safe(`/young-people/${id}/education`),
    safe(`/young-people/${id}/family`),
  ]);

  return {
    plans:
      (
        plans.items ||
        plans.risks ||
        plans.risk_assessments ||
        plans.support_plans ||
        []
      ).map(mapSupportPlan) || [],
    appointments:
      (appointments.items || appointments.appointments || []).map(mapAppointment) || [],
    chronology:
      (
        chronology.items ||
        chronology.timeline ||
        chronology.chronology_events ||
        []
      ).map(mapChronologyEvent) || [],
    health:
      (health.items || health.health_records || []).map(mapHealthRecord) || [],
    education:
      (education.items || education.education_records || []).map(mapEducationRecord) || [],
    family:
      (family.items || family.family_contact_records || []).map(mapFamilyContactRecord) || [],
  };
}

function buildTodayItems(data) {
  return [
    ...data.appointments.filter((a) => isToday(a.start_datetime)),
    ...data.health.filter((h) => isToday(h.event_datetime || h.record_date)),
    ...data.education.filter((e) => isToday(e.record_date)),
    ...data.family.filter((f) => isToday(f.contact_datetime)),
  ];
}

function buildRecentItems(data) {
  return sortNewestFirst(
    [
      ...data.chronology,
      ...data.health,
      ...data.education,
      ...data.family,
      ...data.plans,
    ],
    [
      "event_datetime",
      "record_date",
      "contact_datetime",
      "review_date",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 10);
}

function buildUpcomingItems(data) {
  return data.appointments
    .filter((a) => isFuture(a.start_datetime))
    .sort(
      (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    )
    .slice(0, 10);
}

function buildUrgentItems(data) {
  const urgentPlans = data.plans.filter((p) =>
    ["high", "critical"].includes(String(p.severity || p.significance || "").toLowerCase())
  );

  const urgentChronology = data.chronology.filter((c) =>
    ["high", "critical"].includes(String(c.severity || c.significance || "").toLowerCase())
  );

  return [...urgentPlans, ...urgentChronology].slice(0, 10);
}

/* -------------------------------- controller -------------------------------- */

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const id = getId();

  if (!id) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person",
      "Select a young person first."
    );
    return;
  }

  els.viewContent.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  try {
    const data = await fetchAll(id);

    const today = buildTodayItems(data);
    const recent = buildRecentItems(data);
    const upcoming = buildUpcomingItems(data);
    const urgent = buildUrgentItems(data);

    els.viewContent.innerHTML = renderWorkspace({
      today,
      recent,
      upcoming,
      urgent,
    });

    updateWorkspaceSummaryStrip({
      today: `${today.length} today`,
      nextEvent: upcoming[0]
        ? formatDate(upcoming[0].start_datetime)
        : "None",
      lastRecord: recent[0]
        ? formatDate(
            recent[0].created_at ||
              recent[0].event_datetime ||
              recent[0].record_date ||
              recent[0].contact_datetime ||
              recent[0].review_date
          )
        : "None",
      openActions: `${urgent.length} urgent`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (e) {
    console.error(e);
    els.viewContent.innerHTML = renderEmpty(
      "Error",
      "Failed to load workspace"
    );
  }
}
