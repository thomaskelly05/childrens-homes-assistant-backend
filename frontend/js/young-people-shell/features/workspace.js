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
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
  mapChronologyEvent,
  mapComplianceItem,
  mapTask,
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
        <article class="record-row">
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
    notes,
    incidents,
    plans,
    appointments,
    chronology,
    tasks,
  ] = await Promise.all([
    safe(`/young-people/${id}/daily-notes`),
    safe(`/young-people/${id}/incidents`),
    safe(`/young-people/${id}/support-plans`),
    safe(`/young-people/${id}/appointments`),
    safe(`/young-people/${id}/chronology`),
    safe(`/young-people/${id}/tasks`),
  ]);

  return {
    notes: notes.items?.map(mapDailyNote) || [],
    incidents: incidents.items?.map(mapIncident) || [],
    plans: plans.items?.map(mapSupportPlan) || [],
    appointments: appointments.items?.map(mapAppointment) || [],
    chronology: chronology.items?.map(mapChronologyEvent) || [],
    tasks: tasks.items?.map(mapTask) || [],
  };
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

    const today = [
      ...data.appointments.filter((a) => isToday(a.start_datetime)),
      ...data.notes.filter((n) => isToday(n.record_date)),
    ];

    const recent = [...data.notes, ...data.incidents].slice(0, 10);

    const upcoming = data.appointments.filter((a) =>
      isFuture(a.start_datetime)
    );

    const urgent = data.incidents.filter((i) =>
      ["high", "critical"].includes(i.severity)
    );

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
        ? formatDate(recent[0].created_at)
        : "None",
      openActions: `${data.tasks.length} tasks`,
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
