import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toBool(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
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

function formatDurationMinutes(value) {
  const mins = toNumber(value, null);
  if (!Number.isFinite(mins) || mins === null || mins < 0) return "Not recorded";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function isOpenStatus(value) {
  return [
    "open",
    "active",
    "pending",
    "in_progress",
    "in progress",
    "awaiting_review",
    "awaiting review",
    "scheduled",
  ].includes(lower(value));
}

function isClosedStatus(value) {
  return [
    "closed",
    "completed",
    "resolved",
    "returned",
    "ended",
    "cancelled",
  ].includes(lower(value));
}

function isOverdue(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function badgeClass(value) {
  const v = lower(value);
  if (
    ["critical", "urgent", "high", "open", "active", "overdue", "missing"].includes(v)
  ) {
    return "badge badge-danger";
  }
  if (["medium", "pending", "under_review", "awaiting_review", "in_progress"].includes(v)) {
    return "badge badge-warning";
  }
  if (["low", "returned", "completed", "resolved", "closed"].includes(v)) {
    return "badge badge-success";
  }
  return "badge";
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

function pickItems(response, candidates = []) {
  for (const key of candidates) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

/* -------------------------------- normalisers -------------------------------- */

function mapMissingEpisode(record = {}) {
  const isOpen = !record.return_datetime && !isClosedStatus(record.workflow_status);

  return {
    id: record.id,
    young_person_id: record.young_person_id ?? null,
    start_datetime: record.start_datetime || null,
    reported_datetime: record.reported_datetime || null,
    return_datetime: record.return_datetime || null,
    police_reference: record.police_reference || "",
    trigger_factors: record.trigger_factors || "",
    push_pull_factors: record.push_pull_factors || "",
    actions_taken: record.actions_taken || "",
    outcome: record.outcome || "",
    review_required: toBool(record.review_required),
    workflow_status: record.workflow_status || "",
    manager_review_status: record.manager_review_status || "",
    child_voice: record.child_voice || "",
    return_interview_completed: toBool(record.return_interview_completed),
    return_interview_date: record.return_interview_date || null,
    return_interview_id: record.return_interview_id || null,
    linked_risk_assessment_id: record.linked_risk_assessment_id || null,
    duration_minutes: toNumber(record.duration_minutes, null),
    contextual_risk_notes: record.contextual_risk_notes || "",
    created_by: record.created_by || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    is_open: isOpen,
    has_returned: Boolean(record.return_datetime),
    title: isOpen ? "Open missing episode" : "Missing episode",
    summary:
      record.outcome ||
      record.actions_taken ||
      record.trigger_factors ||
      "Missing episode recorded.",
    record_type: "missing_episode",
  };
}

function mapReturnInterview(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id ?? null,
    missing_episode_id: record.missing_episode_id || null,
    home_id: record.home_id || null,
    interview_date: record.interview_date || record.created_at || null,
    interviewer_name: record.interviewer_name || "",
    interviewer_role: record.interviewer_role || "",
    independent_person: toBool(record.independent_person),
    child_wishes_and_feelings: record.child_wishes_and_feelings || "",
    reasons_for_missing: record.reasons_for_missing || "",
    experience_while_missing: record.experience_while_missing || "",
    push_factors: record.push_factors || "",
    pull_factors: record.pull_factors || "",
    safeguarding_concerns: record.safeguarding_concerns || "",
    intelligence_shared: record.intelligence_shared || "",
    actions_agreed: record.actions_agreed || "",
    reviewed_by_user_id: record.reviewed_by_user_id || null,
    status: record.status || "",
    created_by: record.created_by || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    title: "Return interview",
    summary:
      record.child_wishes_and_feelings ||
      record.safeguarding_concerns ||
      record.actions_agreed ||
      "Return interview recorded.",
    record_type: "return_interview",
  };
}

/* -------------------------------- render helpers -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderSection(title, content, action = "") {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
        ${action ? `<div class="overview-panel-section-action">${action}</div>` : ""}
      </div>
      ${content}
    </section>
  `;
}

function renderEpisodeCard(item = {}) {
  const statusText = item.is_open
    ? "open"
    : item.return_datetime
      ? "returned"
      : item.workflow_status || item.manager_review_status || "recorded";

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="missing_episode"
      data-title="${safeText(item.title || "Missing episode")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Missing episode")}</div>
          <div class="record-card-meta">
            Started: ${safeText(formatDateTime(item.start_datetime, "Not recorded"))}
          </div>
        </div>
        <span class="${badgeClass(statusText)}">${safeText(statusText)}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          <div class="details-grid-item">
            <div class="details-grid-label">Reported</div>
            <div class="details-grid-value">${safeText(formatDateTime(item.reported_datetime, "Not recorded"))}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Returned</div>
            <div class="details-grid-value">${safeText(formatDateTime(item.return_datetime, item.is_open ? "Still missing" : "Not recorded"))}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Duration</div>
            <div class="details-grid-value">${safeText(formatDurationMinutes(item.duration_minutes))}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Police reference</div>
            <div class="details-grid-value">${safeText(item.police_reference || "Not recorded")}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Return interview</div>
            <div class="details-grid-value">${safeText(
              item.return_interview_completed
                ? formatDate(item.return_interview_date, "Completed")
                : "Outstanding"
            )}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Manager review</div>
            <div class="details-grid-value">${safeText(item.manager_review_status || "Not recorded")}</div>
          </div>
        </div>

        ${
          item.trigger_factors
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Trigger factors</div>
                <div>${safeText(item.trigger_factors)}</div>
              </div>
            `
            : ""
        }

        ${
          item.push_pull_factors
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Push / pull factors</div>
                <div>${safeText(item.push_pull_factors)}</div>
              </div>
            `
            : ""
        }

        ${
          item.actions_taken
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Actions taken</div>
                <div>${safeText(item.actions_taken)}</div>
              </div>
            `
            : ""
        }

        ${
          item.contextual_risk_notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Contextual risk notes</div>
                <div>${safeText(item.contextual_risk_notes)}</div>
              </div>
            `
            : ""
        }

        ${
          item.child_voice
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Child voice</div>
                <div>${safeText(item.child_voice)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderReturnInterviewCard(item = {}) {
  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="return_interview"
      data-title="Return interview"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">Return interview</div>
          <div class="record-card-meta">
            ${safeText(formatDate(item.interview_date, "No date"))}
          </div>
        </div>
        <span class="${badgeClass(item.status || "completed")}">${safeText(item.status || "recorded")}</span>
      </div>

      <div class="record-card-body">
        <div class="details-grid">
          <div class="details-grid-item">
            <div class="details-grid-label">Interviewer</div>
            <div class="details-grid-value">${safeText(item.interviewer_name || "Not recorded")}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Role</div>
            <div class="details-grid-value">${safeText(item.interviewer_role || "Not recorded")}</div>
          </div>
          <div class="details-grid-item">
            <div class="details-grid-label">Independent person</div>
            <div class="details-grid-value">${safeText(item.independent_person ? "Yes" : "No")}</div>
          </div>
        </div>

        ${
          item.child_wishes_and_feelings
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Child wishes and feelings</div>
                <div>${safeText(item.child_wishes_and_feelings)}</div>
              </div>
            `
            : ""
        }

        ${
          item.reasons_for_missing
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Reasons for missing</div>
                <div>${safeText(item.reasons_for_missing)}</div>
              </div>
            `
            : ""
        }

        ${
          item.experience_while_missing
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Experience while missing</div>
                <div>${safeText(item.experience_while_missing)}</div>
              </div>
            `
            : ""
        }

        ${
          item.safeguarding_concerns
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Safeguarding concerns</div>
                <div>${safeText(item.safeguarding_concerns)}</div>
              </div>
            `
            : ""
        }

        ${
          item.actions_agreed
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Actions agreed</div>
                <div>${safeText(item.actions_agreed)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], type = "episode", emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);

  return `
    <div class="record-card-list">
      ${items
        .map((item) =>
          type === "return_interview"
            ? renderReturnInterviewCard(item)
            : renderEpisodeCard(item)
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No missing chronology",
      "No missing-from-care chronology has been recorded yet."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.start_datetime ||
            item.interview_date ||
            item.reported_datetime ||
            item.created_at;

          const statusText =
            item.is_open
              ? "open"
              : item.return_datetime
                ? "returned"
                : item.status || item.workflow_status || "recorded";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  <span class="${badgeClass(statusText)}">${safeText(statusText)}</span>
                </div>
                <div class="timeline-item-summary">${safeText(item.summary || "")}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    openEpisodes,
    recentEpisodes,
    outstandingReturnInterviews,
    returnInterviews,
    timeline,
    longestEpisode,
    lastReturnInterview,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Missing from care</div>
          <h2>Missing episodes and return interviews</h2>
          <p class="overview-panel-subtitle">
            Live oversight of missing episodes, return activity, patterns and follow-up.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open missing", openEpisodes.length)}
        ${renderStatCard("Outstanding interviews", outstandingReturnInterviews.length)}
        ${renderStatCard("Recent episodes", recentEpisodes.length)}
        ${renderStatCard(
          "Longest recorded",
          longestEpisode ? formatDurationMinutes(longestEpisode.duration_minutes) : "None"
        )}
        ${renderStatCard(
          "Last return interview",
          lastReturnInterview ? formatDate(lastReturnInterview.interview_date) : "None"
        )}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Open missing episodes",
            renderCardList(
              openEpisodes,
              "episode",
              "No open episodes",
              "There are no currently open missing-from-care episodes."
            )
          )}

          ${renderSection(
            "Recent missing episodes",
            renderCardList(
              recentEpisodes,
              "episode",
              "No recent episodes",
              "No missing episodes have been recorded yet."
            )
          )}

          ${renderSection("Missing chronology", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Outstanding return interviews",
            renderCardList(
              outstandingReturnInterviews,
              "episode",
              "No outstanding interviews",
              "All returned episodes appear to have return interview follow-up recorded."
            )
          )}

          ${renderSection(
            "Recent return interviews",
            renderCardList(
              returnInterviews,
              "return_interview",
              "No return interviews",
              "No return interviews have been recorded yet."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- data loading -------------------------------- */

async function fetchAll(youngPersonId) {
  const [missingRes, returnInterviewRes] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/missing-episodes`),
    safeGet(`/young-people/${youngPersonId}/return-interviews`),
  ]);

  return {
    missingEpisodes: pickItems(missingRes, [
      "missing_episodes",
      "episodes",
      "items",
    ]).map(mapMissingEpisode),
    returnInterviews: pickItems(returnInterviewRes, [
      "return_interviews",
      "interviews",
      "items",
    ]).map(mapReturnInterview),
  };
}

/* -------------------------------- builders -------------------------------- */

function buildOpenEpisodes(data) {
  return sortNewest(
    data.missingEpisodes.filter((item) => item.is_open),
    ["start_datetime", "reported_datetime", "created_at"]
  );
}

function buildRecentEpisodes(data) {
  return sortNewest(data.missingEpisodes, [
    "start_datetime",
    "reported_datetime",
    "created_at",
  ]).slice(0, 12);
}

function buildOutstandingReturnInterviews(data) {
  return sortNewest(
    data.missingEpisodes.filter(
      (item) =>
        item.has_returned &&
        !item.return_interview_completed
    ),
    ["return_datetime", "start_datetime", "created_at"]
  );
}

function buildReturnInterviews(data) {
  return sortNewest(data.returnInterviews, [
    "interview_date",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
}

function buildTimeline(data) {
  const episodes = data.missingEpisodes.map((item) => ({
    ...item,
    title: item.is_open ? "Missing episode open" : "Missing episode",
    summary: item.summary,
  }));

  const interviews = data.returnInterviews.map((item) => ({
    ...item,
    title: "Return interview",
    summary: item.summary,
  }));

  return sortNewest([...episodes, ...interviews], [
    "start_datetime",
    "interview_date",
    "reported_datetime",
    "created_at",
  ]).slice(0, 20);
}

function buildLongestEpisode(data) {
  return [...data.missingEpisodes]
    .filter((item) => Number.isFinite(item.duration_minutes))
    .sort((a, b) => toNumber(b.duration_minutes, 0) - toNumber(a.duration_minutes, 0))[0] || null;
}

function buildLastReturnInterview(data) {
  return sortNewest(data.returnInterviews, [
    "interview_date",
    "created_at",
  ])[0] || null;
}

/* -------------------------------- public loader -------------------------------- */

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view missing-from-care information."
    );
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const openEpisodes = buildOpenEpisodes(data);
    const recentEpisodes = buildRecentEpisodes(data);
    const outstandingReturnInterviews = buildOutstandingReturnInterviews(data);
    const returnInterviews = buildReturnInterviews(data);
    const timeline = buildTimeline(data);
    const longestEpisode = buildLongestEpisode(data);
    const lastReturnInterview = buildLastReturnInterview(data);

    els.viewContent.innerHTML = renderWorkspace({
      openEpisodes,
      recentEpisodes,
      outstandingReturnInterviews,
      returnInterviews,
      timeline,
      longestEpisode,
      lastReturnInterview,
    });

    updateWorkspaceSummaryStrip({
      today: `${openEpisodes.length} open missing`,
      nextEvent: outstandingReturnInterviews.length
        ? `${outstandingReturnInterviews.length} return interviews outstanding`
        : "No interview backlog",
      lastRecord: lastReturnInterview
        ? formatDate(lastReturnInterview.interview_date)
        : "None",
      openActions: `${outstandingReturnInterviews.filter((item) =>
        item.return_datetime && item.return_interview_date && isOverdue(item.return_interview_date)
      ).length} overdue`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load missing episodes",
      "Something went wrong while loading missing-from-care records."
    );
  }
}
