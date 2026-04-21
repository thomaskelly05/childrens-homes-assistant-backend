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

/* -------------------------------- constants -------------------------------- */

const SEARCHABLE_FIELDS = [
  "title",
  "summary",
  "description",
  "details",
  "note",
  "body",
  "outcome",
  "action_taken",
  "location",
  "type",
  "category",
  "status",
  "record_type",
];

const WORKSPACE_RECORD_TYPE_MAP = Object.freeze({
  daily_note: "chronology",
  incident: "chronology",
  support_plan: "plans",
  risk: "plans",
  appointment: "appointments",
  health_record: "health",
  education_record: "education",
  family_contact: "family",
  communication: "chronology",
  document: "chronology",
  task: "chronology",
  safeguarding_record: "chronology",
  missing_episode: "chronology",
  achievement_record: "education",
  keywork: "chronology",
});

/* -------------------------------- helpers -------------------------------- */

const toText = (value, fallback = "") =>
  escapeHtml(String(value ?? fallback ?? ""));

function normaliseText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function makeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(value) {
  if (!value) return false;

  const d = new Date(value);
  const now = new Date();

  if (Number.isNaN(d.getTime())) return false;

  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isFuture(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= Date.now();
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function getPrimaryDate(item = {}) {
  return (
    item.record_date ||
    item.start_datetime ||
    item.event_datetime ||
    item.contact_datetime ||
    item.review_date ||
    item.created_at ||
    item.updated_at ||
    null
  );
}

function getRecordTitle(item = {}) {
  return (
    item.title ||
    item.summary ||
    item.name ||
    item.subject ||
    item.label ||
    "Record"
  );
}

function getRecordSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.note ||
    item.details ||
    item.outcome ||
    ""
  );
}

function getRecordId(item = {}) {
  return item.id || item.source_id || item.record_id || "";
}

function getRecordType(item = {}) {
  return item.record_type || item.type || "record";
}

function getSeverity(item = {}) {
  return String(
    item.severity || item.significance || item.priority || ""
  ).toLowerCase();
}

function getSearchHaystack(item = {}) {
  return SEARCHABLE_FIELDS.map((field) => item?.[field])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function recordMatchesQuery(item = {}, query = "") {
  const safeQuery = normaliseText(query);
  if (!safeQuery) return true;
  return getSearchHaystack(item).includes(safeQuery);
}

function mapRecordTypeFilterToBuckets(recordType = "") {
  const safeType = normaliseText(recordType);
  if (!safeType) return null;
  return WORKSPACE_RECORD_TYPE_MAP[safeType] || null;
}

function recordMatchesRecordType(item = {}, recordType = "") {
  const safeType = normaliseText(recordType);
  if (!safeType) return true;
  return normaliseText(getRecordType(item)) === safeType;
}

function dedupeById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${getRecordType(item)}::${getRecordId(item)}::${getPrimaryDate(item)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* -------------------------------- UI bits -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${toText(title)}</h3>
        <p>${toText(message)}</p>
      </div>
    </div>
  `;
}

function renderRows(items = []) {
  if (!items.length) {
    return renderEmpty("No records", "Nothing to show yet.");
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const id = getRecordId(item);
          const recordType = getRecordType(item);
          const title = getRecordTitle(item);
          const summary = getRecordSummary(item);
          const dateLabel = formatDate(getPrimaryDate(item));

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(id)}"
              data-record-type="${toText(recordType)}"
              data-title="${toText(title)}"
              role="button"
              tabindex="0"
              aria-label="${toText(title)}"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(title)}</div>
                <div class="record-row-summary">${toText(summary)}</div>
                <div class="record-row-meta">
                  ${
                    recordType
                      ? `<span class="row-pill muted">${toText(recordType.replaceAll("_", " "))}</span>`
                      : ""
                  }
                  ${dateLabel ? `<span>${toText(dateLabel)}</span>` : ""}
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace({ today, recent, upcoming, urgent, searchActive = false }) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Workspace</div>
          <h2>Today’s workspace</h2>
          ${
            searchActive
              ? `<p>Showing filtered workspace results.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        <article class="overview-stat-card">
          <span class="overview-stat-label">Urgent</span>
          <strong class="overview-stat-value">${urgent.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Today</span>
          <strong class="overview-stat-value">${today.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Recent</span>
          <strong class="overview-stat-value">${recent.length}</strong>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Upcoming</span>
          <strong class="overview-stat-value">${upcoming.length}</strong>
        </article>
      </div>

      <div class="overview-grid">
        <div class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Today</h3>
            </div>
            ${renderRows(today)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent</h3>
            </div>
            ${renderRows(recent)}
          </section>
        </div>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
            </div>
            ${renderRows(urgent)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Upcoming</h3>
            </div>
            ${renderRows(upcoming)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- data -------------------------------- */

function getId() {
  return state.youngPersonId || state.selectedYoungPerson?.id || null;
}

async function fetchAll(id, search = {}) {
  const safe = (path) => apiGet(path).catch(() => ({ items: [] }));

  const recordTypeBucket = mapRecordTypeFilterToBuckets(search.record_type);

  const shouldFetchPlans = !recordTypeBucket || recordTypeBucket === "plans";
  const shouldFetchAppointments =
    !recordTypeBucket || recordTypeBucket === "appointments";
  const shouldFetchChronology =
    !recordTypeBucket || recordTypeBucket === "chronology";
  const shouldFetchTasks = !recordTypeBucket || recordTypeBucket === "chronology";
  const shouldFetchHealth = !recordTypeBucket || recordTypeBucket === "health";
  const shouldFetchEducation =
    !recordTypeBucket || recordTypeBucket === "education";
  const shouldFetchFamily = !recordTypeBucket || recordTypeBucket === "family";

  const [
    plans,
    appointments,
    chronology,
    tasks,
    health,
    education,
    family,
  ] = await Promise.all([
    shouldFetchPlans ? safe(`/young-people/${id}/plans`) : Promise.resolve({ items: [] }),
    shouldFetchAppointments ? safe(`/young-people/${id}/appointments`) : Promise.resolve({ items: [] }),
    shouldFetchChronology ? safe(`/young-people/${id}/timeline`) : Promise.resolve({ items: [] }),
    shouldFetchTasks ? safe(`/young-people/${id}/tasks`) : Promise.resolve({ items: [] }),
    shouldFetchHealth ? safe(`/young-people/${id}/health`) : Promise.resolve({ items: [] }),
    shouldFetchEducation ? safe(`/young-people/${id}/education`) : Promise.resolve({ items: [] }),
    shouldFetchFamily ? safe(`/young-people/${id}/family`) : Promise.resolve({ items: [] }),
  ]);

  return {
    plans: makeArray(
      plans.items ||
        plans.risks ||
        plans.risk_assessments ||
        plans.support_plans ||
        []
    ).map(mapSupportPlan),

    appointments: makeArray(
      appointments.items || appointments.appointments || []
    ).map(mapAppointment),

    chronology: makeArray(
      chronology.items ||
        chronology.timeline ||
        chronology.chronology_events ||
        []
    ).map(mapChronologyEvent),

    tasks: makeArray(tasks.items || tasks.actions || tasks.records || []).map((item) => ({
      ...item,
      record_type: item.record_type || "task",
      summary: item.summary || item.task || item.description || "",
      event_datetime:
        item.due_date ||
        item.updated_at ||
        item.created_at ||
        item.task_date ||
        null,
      severity:
        String(item.priority || "").toLowerCase() === "critical" ||
        String(item.status || "").toLowerCase() === "overdue"
          ? "critical"
          : item.priority || item.severity || "",
      status: item.status || (item.completed ? "completed" : "open"),
      title: item.title || item.task || "Action",
    })),

    health: makeArray(
      health.items || health.health_records || []
    ).map(mapHealthRecord),

    education: makeArray(
      education.items || education.education_records || []
    ).map(mapEducationRecord),

    family: makeArray(
      family.items || family.family_contact_records || []
    ).map(mapFamilyContactRecord),
  };
}

/* -------------------------------- filtering -------------------------------- */

function filterCollection(items = [], search = {}) {
  const query = normaliseText(search.query);
  const recordType = normaliseText(search.record_type);

  return items.filter((item) => {
    if (!recordMatchesQuery(item, query)) return false;
    if (!recordMatchesRecordType(item, recordType)) return false;
    return true;
  });
}

function applySearch(data, search = {}) {
  return {
    plans: filterCollection(data.plans, search),
    appointments: filterCollection(data.appointments, search),
    chronology: filterCollection(data.chronology, search),
    tasks: filterCollection(data.tasks, search),
    health: filterCollection(data.health, search),
    education: filterCollection(data.education, search),
    family: filterCollection(data.family, search),
  };
}

/* -------------------------------- builders -------------------------------- */

function buildTodayItems(data) {
  return dedupeById([
    ...data.appointments.filter((item) => isToday(item.start_datetime)),
    ...data.tasks.filter((item) =>
      isToday(
        item.due_date ||
          item.event_datetime ||
          item.updated_at ||
          item.created_at
      )
    ),
    ...data.health.filter((item) => isToday(item.event_datetime || item.record_date)),
    ...data.education.filter((item) => isToday(item.record_date)),
    ...data.family.filter((item) => isToday(item.contact_datetime)),
  ]);
}

function buildRecentItems(data) {
  return dedupeById(
    sortNewestFirst(
      [
        ...data.chronology,
        ...data.tasks,
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
    )
  ).slice(0, 10);
}

function buildUpcomingItems(data) {
  return dedupeById(
    [
      ...data.appointments.filter((item) => isFuture(item.start_datetime)),
      ...data.tasks.filter((item) => {
        const status = normaliseText(item.status);
        return (
          !["completed", "closed", "done"].includes(status) &&
          isFuture(item.due_date || item.event_datetime)
        );
      }),
    ].sort((a, b) => {
      const aValue = a.start_datetime || a.due_date || a.event_datetime || "";
      const bValue = b.start_datetime || b.due_date || b.event_datetime || "";
      return new Date(aValue).getTime() - new Date(bValue).getTime();
    })
  ).slice(0, 10);
}

function buildUrgentItems(data) {
  const urgentPlans = data.plans.filter((item) =>
    ["high", "critical"].includes(getSeverity(item))
  );

  const urgentChronology = data.chronology.filter((item) =>
    ["high", "critical"].includes(getSeverity(item))
  );

  const urgentTasks = data.tasks.filter((item) => {
    const status = normaliseText(item.status);
    const severity = getSeverity(item);
    return (
      status === "overdue" ||
      ["high", "critical"].includes(severity)
    );
  });

  return dedupeById([...urgentPlans, ...urgentChronology, ...urgentTasks]).slice(
    0,
    10
  );
}

/* -------------------------------- controller -------------------------------- */

export async function loadCurrentView(options = {}) {
  if (!els.viewContent) return;

  const id = getId();
  const search = {
    query: String(options?.search?.query || "").trim(),
    record_type: String(options?.search?.record_type || "").trim(),
  };
  const searchActive = Boolean(search.query || search.record_type);

  if (!id) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person",
      "Select a young person first."
    );
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading workspace…</p>
      </div>
    </div>
  `;

  try {
    const rawData = await fetchAll(id, search);
    const filteredData = applySearch(rawData, search);

    const today = buildTodayItems(filteredData);
    const recent = buildRecentItems(filteredData);
    const upcoming = buildUpcomingItems(filteredData);
    const urgent = buildUrgentItems(filteredData);

    els.viewContent.innerHTML = renderWorkspace({
      today,
      recent,
      upcoming,
      urgent,
      searchActive,
    });

    updateWorkspaceSummaryStrip({
      today: `${today.length} today`,
      nextEvent: upcoming[0]
        ? formatDate(upcoming[0].start_datetime)
        : "None",
      lastRecord: recent[0]
        ? formatDate(getPrimaryDate(recent[0]))
        : "None",
      openActions: `${urgent.length} urgent`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[workspace] failed loading current view", error);
    els.viewContent.innerHTML = renderEmpty(
      "Error",
      "Failed to load workspace."
    );
  }
}
