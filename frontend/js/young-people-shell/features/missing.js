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
const RETURN_INTERVIEW_DUE_DAYS = 3;

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toBool(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
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

function addDays(value, days) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? new Date(aValue).getTime() : Number.POSITIVE_INFINITY;
    const bTime = bValue ? new Date(bValue).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function badgeClass(value) {
  const v = lower(value);
  if (
    [
      "critical",
      "urgent",
      "high",
      "open",
      "active",
      "overdue",
      "missing",
      "escalated",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }
  if (
    [
      "medium",
      "pending",
      "under_review",
      "awaiting_review",
      "in_progress",
      "due_soon",
      "scheduled",
      "warning",
      "monitoring",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }
  if (
    [
      "low",
      "returned",
      "completed",
      "resolved",
      "closed",
      "recorded",
    ].includes(v)
  ) {
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

function getYoungPersonName() {
  return (
    state.selectedYoungPerson?.full_name ||
    state.selectedYoungPerson?.name ||
    state.youngPerson?.full_name ||
    state.youngPerson?.name ||
    "Young person"
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

function hasUsableData(data = {}) {
  return Object.values(data).some((value) => Array.isArray(value) && value.length > 0);
}

/* ------------------------------- normalisers ------------------------------ */

function mapMissingEpisode(record = {}) {
  const workflowStatus = record.workflow_status || record.status || "";
  const hasReturned = Boolean(record.return_datetime);
  const isOpen = !hasReturned && !isClosedStatus(workflowStatus);

  const interviewDueDate =
    record.return_interview_due_date ||
    (!record.return_interview_completed && hasReturned
      ? addDays(record.return_datetime, RETURN_INTERVIEW_DUE_DAYS)
      : null);

  return {
    id: record.id ?? null,
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
    workflow_status: workflowStatus,
    manager_review_status: record.manager_review_status || "",
    child_voice: record.child_voice || "",
    return_interview_completed: toBool(record.return_interview_completed),
    return_interview_date: record.return_interview_date || null,
    return_interview_due_date: interviewDueDate,
    return_interview_id: record.return_interview_id || null,
    linked_risk_assessment_id: record.linked_risk_assessment_id || null,
    duration_minutes:
      record.duration_minutes === null || record.duration_minutes === undefined
        ? null
        : toNumber(record.duration_minutes, null),
    contextual_risk_notes: record.contextual_risk_notes || "",
    created_by: record.created_by || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    is_open: isOpen,
    has_returned: hasReturned,
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
    id: record.id ?? null,
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
    status: record.status || "recorded",
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

/* -------------------------------- fallback -------------------------------- */

function buildFallbackData(youngPersonId) {
  const now = new Date();

  const minusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const plusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    missingEpisodes: [
      mapMissingEpisode({
        id: "me-1",
        young_person_id: youngPersonId,
        start_datetime: minusDays(1, 18),
        reported_datetime: minusDays(1, 18),
        police_reference: "POL-44281",
        trigger_factors: "Argument after community boundary discussion.",
        push_pull_factors: "Pull from peers and reluctance to return to agreed routine.",
        actions_taken: "Staff welfare calls, police notification and local area checks completed.",
        workflow_status: "open",
        manager_review_status: "awaiting_review",
        contextual_risk_notes: "Known peer group concern in town centre.",
      }),
      mapMissingEpisode({
        id: "me-2",
        young_person_id: youngPersonId,
        start_datetime: minusDays(8, 19),
        reported_datetime: minusDays(8, 19),
        return_datetime: minusDays(8, 23),
        duration_minutes: 240,
        police_reference: "POL-44172",
        trigger_factors: "Low mood following family contact.",
        actions_taken: "Police informed and return home coordinated.",
        outcome: "Returned safely to home.",
        workflow_status: "returned",
        manager_review_status: "review_due",
        return_interview_completed: false,
      }),
      mapMissingEpisode({
        id: "me-3",
        young_person_id: youngPersonId,
        start_datetime: minusDays(20, 17),
        reported_datetime: minusDays(20, 17),
        return_datetime: minusDays(20, 19),
        duration_minutes: 120,
        police_reference: "POL-43803",
        actions_taken: "Located with known associate and returned.",
        outcome: "Returned safely.",
        workflow_status: "closed",
        manager_review_status: "completed",
        return_interview_completed: true,
        return_interview_date: minusDays(18, 14),
        child_voice: "Young person said they needed space and did not plan to stay out overnight.",
      }),
    ],

    returnInterviews: [
      mapReturnInterview({
        id: "ri-1",
        young_person_id: youngPersonId,
        missing_episode_id: "me-3",
        interview_date: minusDays(18, 14),
        interviewer_name: "Independent Advocate",
        interviewer_role: "Advocate",
        independent_person: true,
        child_wishes_and_feelings:
          "Young person felt overwhelmed and did not want the situation to escalate.",
        reasons_for_missing:
          "Wanted time away after feeling upset and misunderstood.",
        safeguarding_concerns:
          "No immediate new exploitation concerns disclosed during interview.",
        actions_agreed:
          "Review calming plans and offer earlier keyworker time after family contact.",
        status: "completed",
      }),
    ],

    isFallback: true,
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
    : item.has_returned
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
        <span class="${badgeClass(statusText)}">${safeText(titleCase(statusText))}</span>
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
            <div class="details-grid-value">
              ${safeText(formatDateTime(item.return_datetime, item.is_open ? "Still missing" : "Not recorded"))}
            </div>
          </div>

          <div class="details-grid-item">
            <div class="details-grid-label">Duration</div>
            <div class="details-grid-value">${safeText(formatDurationMinutes(item.duration_minutes))}</div>
          </div>

          <div class="details-grid-item">
            <div class="details-grid-label">Police ref</div>
            <div class="details-grid-value">${safeText(item.police_reference || "Not recorded")}</div>
          </div>

          <div class="details-grid-item">
            <div class="details-grid-label">Interview</div>
            <div class="details-grid-value">
              ${safeText(
                item.return_interview_completed
                  ? formatDate(item.return_interview_date, "Completed")
                  : item.has_returned
                  ? "Outstanding"
                  : "Not due"
              )}
            </div>
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
          <div class="record-card-meta">${safeText(formatDate(item.interview_date, "No date"))}</div>
        </div>
        <span class="${badgeClass(item.status || "completed")}">${safeText(titleCase(item.status || "recorded"))}</span>
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
            <div class="details-grid-label">Independent</div>
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
                  <span class="${badgeClass(statusText)}">${safeText(titleCase(statusText))}</span>
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
    youngPersonName,
    openEpisodes,
    recentEpisodes,
    outstandingReturnInterviews,
    overdueReturnInterviews,
    returnInterviews,
    timeline,
    longestEpisode,
    lastReturnInterview,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Missing from care</div>
          <h2>${safeText(youngPersonName)} • missing episodes and return interviews</h2>
          <p class="overview-panel-subtitle">
            Live oversight of missing episodes, return activity, patterns and follow-up.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live missing-from-care routes are fully available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open missing", openEpisodes.length)}
        ${renderStatCard("Outstanding interviews", outstandingReturnInterviews.length)}
        ${renderStatCard("Overdue interviews", overdueReturnInterviews.length)}
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

  const data = {
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

  if (!hasUsableData(data)) {
    return buildFallbackData(youngPersonId);
  }

  return {
    ...data,
    isFallback: false,
  };
}

/* -------------------------------- builders -------------------------------- */

function buildOpenEpisodes(data) {
  return sortNewest(
    data.missingEpisodes.filter((item) => item.is_open),
    ["start_datetime", "reported_datetime", "created_at"]
  ).slice(0, 8);
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
      (item) => item.has_returned && !item.return_interview_completed
    ),
    ["return_interview_due_date", "return_datetime", "start_datetime", "created_at"]
  ).slice(0, 8);
}

function buildOverdueReturnInterviews(data) {
  return sortSoonest(
    data.missingEpisodes.filter(
      (item) =>
        item.has_returned &&
        !item.return_interview_completed &&
        isOverdue(item.return_interview_due_date)
    ),
    ["return_interview_due_date", "return_datetime", "created_at"]
  ).slice(0, 8);
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
  }));

  const interviews = data.returnInterviews.map((item) => ({
    ...item,
    title: "Return interview",
  }));

  return sortNewest([...episodes, ...interviews], [
    "start_datetime",
    "interview_date",
    "reported_datetime",
    "created_at",
  ]).slice(0, 20);
}

function buildLongestEpisode(data) {
  return (
    [...data.missingEpisodes]
      .filter((item) => Number.isFinite(item.duration_minutes))
      .sort(
        (a, b) => toNumber(b.duration_minutes, 0) - toNumber(a.duration_minutes, 0)
      )[0] || null
  );
}

function buildLastReturnInterview(data) {
  return (
    sortNewest(data.returnInterviews, ["interview_date", "created_at"])[0] || null
  );
}

/* -------------------------------- public loader -------------------------------- */

export async function loadMissing() {
  return loadCurrentView();
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view missing-from-care information."
    );

    updateWorkspaceSummaryStrip({
      today: "No missing context",
      nextEvent: "No action due",
      lastRecord: "No missing data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading missing episodes...</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const openEpisodes = buildOpenEpisodes(data);
    const recentEpisodes = buildRecentEpisodes(data);
    const outstandingReturnInterviews = buildOutstandingReturnInterviews(data);
    const overdueReturnInterviews = buildOverdueReturnInterviews(data);
    const returnInterviews = buildReturnInterviews(data);
    const timeline = buildTimeline(data);
    const longestEpisode = buildLongestEpisode(data);
    const lastReturnInterview = buildLastReturnInterview(data);

    els.viewContent.innerHTML = renderWorkspace({
      youngPersonName: getYoungPersonName(),
      openEpisodes,
      recentEpisodes,
      outstandingReturnInterviews,
      overdueReturnInterviews,
      returnInterviews,
      timeline,
      longestEpisode,
      lastReturnInterview,
      isFallback: Boolean(data.isFallback),
    });

    const nextInterviewDue = outstandingReturnInterviews
      .map((item) => item.return_interview_due_date)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${openEpisodes.length} open missing • preview mode`
        : `${openEpisodes.length} open missing`,
      nextEvent: nextInterviewDue
        ? `Interview due ${formatDate(nextInterviewDue)}`
        : "No interview backlog",
      lastRecord: lastReturnInterview
        ? formatDate(lastReturnInterview.interview_date)
        : recentEpisodes[0]?.start_datetime
        ? formatDate(recentEpisodes[0].start_datetime)
        : "None",
      openActions: `${overdueReturnInterviews.length} overdue • ${outstandingReturnInterviews.length} outstanding`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[missing] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load missing episodes",
      error?.message || "Something went wrong while loading missing-from-care records."
    );

    updateWorkspaceSummaryStrip({
      today: "Missing view unavailable",
      nextEvent: "No action due",
      lastRecord: "No missing data",
      openActions: "Check missing routes",
    });
  }
}