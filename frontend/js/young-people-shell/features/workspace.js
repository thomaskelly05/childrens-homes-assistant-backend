import { els } from "../dom.js";
import { state } from "../state.js";
import { escapeHtml } from "../core/utils.js";
import { listRecords } from "../core/api-adapter.js";
import {
  normaliseRecords,
  sortNormalisedRecordsNewestFirst,
  recordSearchText,
} from "../core/record-normaliser.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { openRecordDetail } from "../ui/records.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_VISIBILITY = Object.freeze({
  signals: [],
  highlights: [],
  queues: { urgent: [], due_soon: [], monitor: [] },
  counts: {},
  pressures: {},
});

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
  document: "documents",
  statutory_document: "documents",
  task: "chronology",
  safeguarding_record: "safeguarding",
  missing_episode: "safeguarding",
  achievement_record: "education",
  keywork: "chronology",
  medication_record: "health",
  handover_record: "chronology",
});

const toText = (value, fallback = "") =>
  escapeHtml(String(value ?? fallback ?? ""));

function getViewContent() {
  return document.getElementById("viewContent") || els.viewContent;
}

function isComposerOpen() {
  const composer = document.getElementById("recordComposerPage");
  return Boolean(
    composer &&
      !composer.classList.contains("hidden") &&
      composer.getAttribute("aria-hidden") !== "true"
  );
}

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

function getPrimaryDate(item = {}) {
  return (
    item.date ||
    item.note_date ||
    item.record_date ||
    item.event_datetime ||
    item.incident_datetime ||
    item.start_datetime ||
    item.appointment_date ||
    item.contact_datetime ||
    item.session_date ||
    item.handover_datetime ||
    item.handover_date ||
    item.missing_from ||
    item.returned_at ||
    item.issue_date ||
    item.expiry_date ||
    item.administered_time ||
    item.scheduled_time ||
    item.due_date ||
    item.review_date ||
    item.created_at ||
    item.updated_at ||
    null
  );
}

function getRecordTitle(item = {}) {
  return (
    item.title ||
    item.label ||
    item.subject ||
    item.name ||
    item.heading ||
    item.category ||
    item.incident_type ||
    item.appointment_type ||
    item.medication_name ||
    item.document_type ||
    item.health_area ||
    item.education_area ||
    item.topic ||
    "Record"
  );
}

function getRecordSummary(item = {}) {
  return (
    item.summary ||
    item.summary_text ||
    item.description ||
    item.concern_summary ||
    item.circumstances ||
    item.narrative ||
    item.note ||
    item.details ||
    item.body ||
    item.outcome ||
    item.presentation ||
    item.behaviour_update ||
    item.actions_required ||
    item.actions_taken ||
    item.follow_up_actions ||
    ""
  );
}

function getRecordId(item = {}) {
  return item.id || item.source_id || item.record_id || item.note_id || "";
}

function getRecordType(item = {}) {
  return item.type || item.record_type || item.category || "record";
}

function getSeverity(item = {}) {
  return String(
    item.severity ||
      item.significance ||
      item.priority ||
      item.risk_level ||
      item.summary_risk_level ||
      ""
  ).toLowerCase();
}

function getStatus(item = {}) {
  return String(item.status || item.workflow_status || "").toLowerCase();
}

function recordMatchesQuery(item = {}, query = "") {
  const safeQuery = normaliseText(query);
  if (!safeQuery) return true;

  return recordSearchText(item).includes(safeQuery);
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
    const key = `${getRecordType(item)}::${getRecordId(item)}::${getPrimaryDate(
      item
    )}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function fetchVisibility(id) {
  if (!id) return SAFE_VISIBILITY;

  try {
    const response = await fetch(`/visibility/young-people/${id}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return SAFE_VISIBILITY;

    return (await response.json()) || SAFE_VISIBILITY;
  } catch {
    return SAFE_VISIBILITY;
  }
}

function getSignalTone(signal = {}) {
  const token = String(signal.severity || "").toLowerCase();

  if (["critical", "high"].includes(token)) return "danger";
  if (token === "medium") return "warning";
  if (token === "low") return "success";

  return "muted";
}

function renderVisibilitySignals(signals = []) {
  if (!signals.length) {
    return `
      <div class="empty-state">
        <p>No urgent visibility alerts are active for this child right now.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${signals
        .slice(0, 5)
        .map(
          (signal) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(
                  signal.title || "Visibility signal"
                )}</div>
                <div class="record-row-summary">${toText(
                  signal.description || "Signal requires follow-through."
                )}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(getSignalTone(signal))}">
                  ${toText(signal.count ?? 0)}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInsightStory(story = "") {
  const text = String(story || "").trim();

  if (!text) {
    return `
      <div class="empty-state">
        <p>No insight story is available for this child yet.</p>
      </div>
    `;
  }

  return `
    <article class="insight-story">
      <p>${toText(text)}</p>
    </article>
  `;
}

function renderTrendCards(trends = []) {
  if (!trends.length) {
    return `
      <div class="empty-state">
        <p>No trend movement is available yet.</p>
      </div>
    `;
  }

  return `
    <div class="insight-trend-grid">
      ${trends
        .slice(0, 4)
        .map((trend) => {
          const assessment = String(trend.assessment || "stable").toLowerCase();

          const tone =
            assessment === "declining"
              ? "danger"
              : assessment === "improving"
                ? "success"
                : "muted";

          const delta = Number(trend.delta || 0);
          const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

          return `
            <article class="insight-card">
              <div class="insight-card-head">
                <strong>${toText(trend.label || "Trend")}</strong>
                <span class="row-pill ${toText(tone)}">${toText(
                  assessment
                )}</span>
              </div>
              <div class="insight-card-meta">
                <span>${toText(`Now ${trend.current ?? 0}`)}</span>
                <span>${toText(`Prev ${trend.previous ?? 0}`)}</span>
              </div>
              <div class="insight-card-summary">
                ${toText(
                  `${arrow} ${Math.abs(delta)} (${trend.pct_change ?? 0}%)`
                )}
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPatternCards(patterns = []) {
  if (!patterns.length) {
    return `
      <div class="empty-state">
        <p>No repeating pattern has crossed threshold yet.</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${patterns
        .slice(0, 4)
        .map(
          (pattern) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(
                  pattern.title || "Pattern"
                )}</div>
                <div class="record-row-summary">${toText(
                  pattern.evidence || ""
                )}</div>
                <div class="record-row-meta">
                  <span>${toText(
                    `${pattern.frequency ?? 0} in ${
                      pattern.period_days ?? 0
                    } days`
                  )}</span>
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(getSignalTone(pattern))}">
                  ${toText(pattern.severity || "medium")}
                </span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDecisionSupport(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No decision-support prompts are available yet.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 3)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(item.question || "Decision support")}</strong>
              <p>${toText(item.evidence || "")}</p>
              <p>${toText(item.interpretation || "")}</p>
              <p><strong>Suggested:</strong> ${toText(
                item.suggested_action || ""
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderChildStoryBlocks(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No child story blocks are available yet.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 3)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(item.title || "Child story")}</strong>
              <p>${toText(item.evidence || "")}</p>
              <p>${toText(item.interpretation || "")}</p>
              <p><strong>Suggested:</strong> ${toText(
                item.suggested_action || ""
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMissingItems(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No missing follow-through gaps are currently flagged.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 4)
        .map(
          (item) => `
            <article class="priority-item">
              <p>${toText(item)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

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
                      ? `<span class="row-pill muted">${toText(
                          String(recordType).replaceAll("_", " ")
                        )}</span>`
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

function renderWorkspace({
  today,
  recent,
  upcoming,
  urgent,
  safeguarding,
  documents,
  searchActive = false,
  visibilitySignals = [],
  insightStory = "",
  changing = [],
  patterns = [],
  decisionSupport = [],
  childStoryBlocks = [],
  missingItems = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Workspace</div>
          <h2>Today’s workspace</h2>
          ${
            searchActive
              ? `<p>Showing filtered workspace results.</p>`
              : `<p>Live daily picture, recent records, urgent actions and upcoming events.</p>`
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
        <article class="overview-stat-card">
          <span class="overview-stat-label">Safeguarding</span>
          <strong class="overview-stat-value">${safeguarding.length}</strong>
        </article>
        <article class="overview-stat-card">
          <span class="overview-stat-label">Documents</span>
          <strong class="overview-stat-value">${documents.length}</strong>
        </article>
      </div>

      <div class="overview-grid">
        <div class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head"><h3>Today</h3></div>
            ${renderRows(today)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head"><h3>Recent</h3></div>
            ${renderRows(recent)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head"><h3>Safeguarding and missing episodes</h3></div>
            ${renderRows(safeguarding)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head"><h3>Documents and statutory evidence</h3></div>
            ${renderRows(documents)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head"><h3>What is changing</h3></div>
            ${renderTrendCards(changing)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head"><h3>Patterns</h3></div>
            ${renderPatternCards(patterns)}
          </section>
        </div>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Story right now</h3></div>
            ${renderInsightStory(insightStory)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Visibility alerts</h3></div>
            ${renderVisibilitySignals(visibilitySignals)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Decision support</h3></div>
            ${renderDecisionSupport(decisionSupport)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Child story blocks</h3></div>
            ${renderChildStoryBlocks(childStoryBlocks)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Needs attention</h3></div>
            ${renderRows(urgent)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>What is missing</h3></div>
            ${renderMissingItems(missingItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head"><h3>Upcoming</h3></div>
            ${renderRows(upcoming)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function getId() {
  const app = document.getElementById("app");
  const params = new URLSearchParams(window.location.search);

  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.selectedYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    app?.dataset?.youngPersonId ||
    params.get("id") ||
    document.getElementById("youngPersonSelect")?.value ||
    null
  );
}

async function safeList(recordType, ids = {}) {
  try {
    const result = await listRecords(recordType, ids);

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.records)) return result.records;
    if (Array.isArray(result?.results)) return result.results;

    return [];
  } catch (error) {
    console.warn(`[workspace] optional record load skipped: ${recordType}`, error);
    return [];
  }
}

async function fetchAll(id, search = {}) {
  const recordTypeBucket = mapRecordTypeFilterToBuckets(search.record_type);

  const shouldFetchPlans = !recordTypeBucket || recordTypeBucket === "plans";
  const shouldFetchAppointments =
    !recordTypeBucket || recordTypeBucket === "appointments";
  const shouldFetchChronology =
    !recordTypeBucket || recordTypeBucket === "chronology";
  const shouldFetchTasks = !recordTypeBucket || recordTypeBucket === "chronology";
  const shouldFetchDailyNotes =
    !recordTypeBucket || recordTypeBucket === "chronology";
  const shouldFetchHealth = !recordTypeBucket || recordTypeBucket === "health";
  const shouldFetchEducation =
    !recordTypeBucket || recordTypeBucket === "education";
  const shouldFetchFamily = !recordTypeBucket || recordTypeBucket === "family";
  const shouldFetchSafeguarding =
    !recordTypeBucket || recordTypeBucket === "safeguarding";
  const shouldFetchDocuments =
    !recordTypeBucket || recordTypeBucket === "documents";

  const ids = { youngPersonId: id };

  const [
    supportPlans,
    risks,
    appointments,
    chronology,
    tasks,
    dailyNotes,
    incidents,
    keywork,
    health,
    medication,
    education,
    family,
    handoverRecords,
    safeguardingRecords,
    missingEpisodes,
    documents,
    statutoryDocuments,
  ] = await Promise.all([
    shouldFetchPlans ? safeList("support_plan", ids) : [],
    shouldFetchPlans ? safeList("risk", ids) : [],
    shouldFetchAppointments ? safeList("appointment", ids) : [],
    shouldFetchChronology ? safeList("chronology_event", ids) : [],
    shouldFetchTasks ? safeList("task", ids) : [],
    shouldFetchDailyNotes ? safeList("daily_note", ids) : [],
    shouldFetchChronology ? safeList("incident", ids) : [],
    shouldFetchChronology ? safeList("keywork", ids) : [],
    shouldFetchHealth ? safeList("health_record", ids) : [],
    shouldFetchHealth ? safeList("medication_record", ids) : [],
    shouldFetchEducation ? safeList("education_record", ids) : [],
    shouldFetchFamily ? safeList("family_contact", ids) : [],
    shouldFetchChronology ? safeList("handover_record", ids) : [],
    shouldFetchSafeguarding ? safeList("safeguarding_record", ids) : [],
    shouldFetchSafeguarding ? safeList("missing_episode", ids) : [],
    shouldFetchDocuments ? safeList("document", ids) : [],
    shouldFetchDocuments ? safeList("statutory_document", ids) : [],
  ]);

  return {
    plans: normaliseRecords([...supportPlans, ...risks]),
    appointments: normaliseRecords(appointments),
    chronology: normaliseRecords([
      ...chronology,
      ...incidents,
      ...keywork,
      ...handoverRecords,
    ]),
    tasks: normaliseRecords(tasks),
    daily_notes: normaliseRecords(dailyNotes),
    health: normaliseRecords([...health, ...medication]),
    education: normaliseRecords(education),
    family: normaliseRecords(family),
    safeguarding: normaliseRecords([...safeguardingRecords, ...missingEpisodes]),
    documents: normaliseRecords([...documents, ...statutoryDocuments]),
  };
}

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
    daily_notes: filterCollection(data.daily_notes, search),
    health: filterCollection(data.health, search),
    education: filterCollection(data.education, search),
    family: filterCollection(data.family, search),
    safeguarding: filterCollection(data.safeguarding, search),
    documents: filterCollection(data.documents, search),
  };
}

function buildTodayItems(data) {
  return dedupeById(
    [
      ...data.appointments,
      ...data.tasks,
      ...data.daily_notes,
      ...data.health,
      ...data.education,
      ...data.family,
      ...data.safeguarding,
      ...data.documents,
    ].filter((item) => isToday(getPrimaryDate(item)))
  );
}

function buildRecentItems(data) {
  return dedupeById(
    sortNormalisedRecordsNewestFirst([
      ...data.daily_notes,
      ...data.chronology,
      ...data.tasks,
      ...data.health,
      ...data.education,
      ...data.family,
      ...data.safeguarding,
      ...data.documents,
      ...data.plans,
    ])
  ).slice(0, 10);
}

function buildUpcomingItems(data) {
  return dedupeById(
    [...data.appointments, ...data.tasks, ...data.documents]
      .filter((item) => {
        const status = getStatus(item);

        return (
          !["completed", "closed", "done", "approved", "archived"].includes(status) &&
          isFuture(getPrimaryDate(item))
        );
      })
      .sort((a, b) => {
        return (
          new Date(getPrimaryDate(a)).getTime() -
          new Date(getPrimaryDate(b)).getTime()
        );
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

  const urgentSafeguarding = data.safeguarding.filter((item) =>
    ["high", "critical"].includes(getSeverity(item)) ||
    ["reported_missing", "police_notified", "submitted", "returned"].includes(
      getStatus(item)
    )
  );

  const urgentDocuments = data.documents.filter((item) =>
    ["expired", "amendment_requested", "returned"].includes(getStatus(item))
  );

  const urgentTasks = data.tasks.filter((item) => {
    const status = getStatus(item);
    const severity = getSeverity(item);

    return status === "overdue" || ["high", "critical"].includes(severity);
  });

  return dedupeById([
    ...urgentPlans,
    ...urgentChronology,
    ...urgentSafeguarding,
    ...urgentDocuments,
    ...urgentTasks,
  ]).slice(0, 10);
}

function bindWorkspaceRowEvents(records = []) {
  const host = getViewContent();

  if (!host) return;

  const byKey = new Map();

  records.forEach((record) => {
    byKey.set(`${getRecordType(record)}:${getRecordId(record)}`, record);
  });

  host.querySelectorAll("[data-open-record='true']").forEach((row) => {
    const open = () => {
      const type = row.getAttribute("data-record-type") || "";
      const id = row.getAttribute("data-record-id") || "";
      const record = byKey.get(`${type}:${id}`);

      if (record) openRecordDetail(record);
    };

    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

export async function loadCurrentView(options = {}) {
  const viewContent = getViewContent();

  if (!viewContent) return;

  if (isComposerOpen()) {
    console.log("[workspace] skipped reload because composer is open");
    return;
  }

  const id = getId();

  if (els.pageTitle) els.pageTitle.textContent = "Today at a glance";
  if (els.pageSubtitle) {
    els.pageSubtitle.textContent =
      "Live daily picture, recent records, urgent actions and upcoming events.";
  }

  const search = {
    query: String(options?.search?.query || "").trim(),
    record_type: String(options?.search?.record_type || "").trim(),
  };

  const searchActive = Boolean(search.query || search.record_type);

  if (!id) {
    viewContent.innerHTML = renderEmpty(
      "No young person",
      "Select a young person first."
    );
    return;
  }

  viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading workspace…</p>
      </div>
    </div>
  `;

  try {
    const [rawData, visibility] = await Promise.all([
      fetchAll(id, search),
      fetchVisibility(id),
    ]);

    if (isComposerOpen()) {
      console.log("[workspace] skipped render because composer opened during load");
      return;
    }

    const filteredData = applySearch(rawData, search);

    const today = buildTodayItems(filteredData);
    const recent = buildRecentItems(filteredData);
    const upcoming = buildUpcomingItems(filteredData);
    const urgent = buildUrgentItems(filteredData);
    const safeguarding = sortNormalisedRecordsNewestFirst(
      filteredData.safeguarding || []
    ).slice(0, 8);
    const documents = sortNormalisedRecordsNewestFirst(
      filteredData.documents || []
    ).slice(0, 8);

    const allRenderedRecords = dedupeById([
      ...today,
      ...recent,
      ...upcoming,
      ...urgent,
      ...safeguarding,
      ...documents,
    ]);

    const visibilitySignals = makeArray(visibility?.signals || []);
    const visibilityUrgent = makeArray(visibility?.queues?.urgent || []);
    const visibilityPressure = Number(visibility?.pressures?.total || 0);
    const changing = makeArray(
      visibility?.what_is_changing || visibility?.trends || []
    );
    const patterns = makeArray(visibility?.patterns || []);
    const decisionSupport = makeArray(visibility?.decision_support || []);
    const childStoryBlocks = makeArray(visibility?.child_story_blocks || []);
    const missingItems = makeArray(visibility?.what_is_missing || []);

    viewContent.innerHTML = renderWorkspace({
      today,
      recent,
      upcoming,
      urgent,
      safeguarding,
      documents,
      searchActive,
      visibilitySignals,
      insightStory: visibility?.insight_story || "",
      changing,
      patterns,
      decisionSupport,
      childStoryBlocks,
      missingItems,
    });

    bindWorkspaceRowEvents(allRenderedRecords);

    updateWorkspaceSummaryStrip({
      today: `${today.length} today`,
      nextEvent: upcoming[0] ? formatDate(getPrimaryDate(upcoming[0])) : "None",
      lastRecord: recent[0] ? formatDate(getPrimaryDate(recent[0])) : "None",
      openActions: `${urgent.length} urgent`,
      pressure: visibilityUrgent.length
        ? `${visibilityUrgent.length} child alerts`
        : visibilityPressure
          ? `${visibilityPressure} pressure score`
          : "No active alerts",
    });

    if (!isComposerOpen()) {
      await onAssistantScopeChanged();
      renderAssistantControllerPanels();
    }
  } catch (error) {
    console.error("[workspace] failed loading current view", error);

    if (isComposerOpen()) {
      console.log("[workspace] skipped error render because composer is open");
      return;
    }

    viewContent.innerHTML = renderEmpty(
      "Workspace opened with limited data",
      "Some records could not be loaded. Refresh the workspace or check the API routes."
    );
  }
}
