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

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toBool(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function isOpenStatus(value) {
  return [
    "open",
    "active",
    "pending",
    "in_progress",
    "in progress",
    "under_review",
    "under review",
    "awaiting_review",
    "awaiting review",
    "scheduled",
  ].includes(lower(value));
}

function isClosedStatus(value) {
  return [
    "closed",
    "resolved",
    "completed",
    "cancelled",
    "inactive",
    "ended",
  ].includes(lower(value));
}

function isHighRisk(value) {
  return ["high", "critical", "urgent"].includes(lower(value));
}

function isToday(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
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

function badgeClass(value) {
  const v = lower(value);
  if (["critical", "urgent", "high", "open", "active", "overdue"].includes(v)) {
    return "badge badge-danger";
  }
  if (["medium", "pending", "under_review", "under review", "in_progress"].includes(v)) {
    return "badge badge-warning";
  }
  if (["low", "completed", "resolved", "closed", "pass"].includes(v)) {
    return "badge badge-success";
  }
  return "badge";
}

/* -------------------------------- normalisers -------------------------------- */

function mapSafeguardingRecord(record = {}) {
  return {
    id: record.id,
    provider_id: record.provider_id ?? null,
    young_person_id: record.young_person_id ?? null,
    incident_id: record.incident_id ?? null,
    safeguarding_category:
      record.safeguarding_category || record.category || "Concern",
    concern_datetime:
      record.concern_datetime || record.created_at || record.updated_at || null,
    disclosure_details: record.disclosure_details || "",
    concern_details: record.concern_details || record.summary || "",
    immediate_action_taken: record.immediate_action_taken || "",
    referral_made: toBool(record.referral_made),
    referral_details: record.referral_details || "",
    outcome: record.outcome || "",
    manager_review_status:
      record.manager_review_status || record.status || "open",
    closed_at: record.closed_at || null,
    created_by: record.created_by || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    is_open: !record.closed_at && !isClosedStatus(record.manager_review_status),
    severity:
      record.severity ||
      (toBool(record.referral_made) ? "high" : "medium"),
    title:
      record.safeguarding_category ||
      record.category ||
      "Safeguarding concern",
    summary:
      record.concern_details ||
      record.disclosure_details ||
      record.outcome ||
      "No summary recorded.",
    record_type: "safeguarding_record",
  };
}

function mapIncident(record = {}) {
  return {
    id: record.id,
    incident_datetime:
      record.incident_datetime || record.created_at || record.updated_at || null,
    incident_type: record.incident_type || "Incident",
    title: record.incident_type || "Incident",
    summary: record.description || record.outcome || "No summary recorded.",
    location: record.location || "",
    safeguarding_flag: toBool(record.safeguarding_flag),
    severity: record.severity || "low",
    manager_review_status: record.manager_review_status || "",
    requires_notification: toBool(record.requires_notification),
    police_notified: toBool(record.police_notified || record.police_involved),
    lado_notified: toBool(record.lado_notified),
    ofsted_notified: toBool(record.ofsted_notified),
    workflow_status: record.workflow_status || "",
    record_type: "incident",
  };
}

function mapMissingEpisode(record = {}) {
  const start = record.start_datetime || record.reported_datetime || null;
  const end = record.return_datetime || null;
  return {
    id: record.id,
    start_datetime: start,
    reported_datetime: record.reported_datetime || null,
    return_datetime: end,
    police_reference: record.police_reference || "",
    trigger_factors: record.trigger_factors || "",
    push_pull_factors: record.push_pull_factors || "",
    actions_taken: record.actions_taken || "",
    outcome: record.outcome || "",
    manager_review_status: record.manager_review_status || "",
    workflow_status: record.workflow_status || "",
    child_voice: record.child_voice || "",
    return_interview_completed: toBool(record.return_interview_completed),
    return_interview_date: record.return_interview_date || null,
    contextual_risk_notes: record.contextual_risk_notes || "",
    duration_minutes: toNumber(record.duration_minutes, null),
    title: "Missing episode",
    summary:
      record.outcome ||
      record.trigger_factors ||
      record.push_pull_factors ||
      "Missing episode recorded.",
    record_type: "missing_episode",
    is_open: !record.return_datetime,
  };
}

function mapReturnInterview(record = {}) {
  return {
    id: record.id,
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
    status: record.status || "",
    missing_episode_id: record.missing_episode_id || null,
    title: "Return interview",
    summary:
      record.child_wishes_and_feelings ||
      record.safeguarding_concerns ||
      record.actions_agreed ||
      "Return interview completed.",
    record_type: "return_interview",
  };
}

function mapAlert(record = {}) {
  return {
    id: record.id,
    alert_type: record.alert_type || "Alert",
    title: record.title || record.alert_type || "Alert",
    description: record.description || "",
    severity: record.severity || "medium",
    is_active: record.is_active !== false,
    show_globally: toBool(record.show_globally),
    review_date: record.review_date || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    record_type: "young_person_alert",
  };
}

function mapSafetyPlan(record = {}) {
  return {
    id: record.id,
    plan_type: record.plan_type || "Safety plan",
    title: record.title || record.plan_type || "Safety plan",
    warning_signs: record.warning_signs || "",
    triggers: record.triggers || "",
    coping_strategies: record.coping_strategies || "",
    people_to_contact: record.people_to_contact || "",
    professional_support: record.professional_support || "",
    environmental_safety_steps: record.environmental_safety_steps || "",
    child_voice: record.child_voice || "",
    review_date: record.review_date || null,
    status: record.status || "active",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    summary:
      record.coping_strategies ||
      record.warning_signs ||
      record.environmental_safety_steps ||
      "Safety plan in place.",
    record_type: "safety_plan",
  };
}

function mapContextualProfile(record = {}) {
  return {
    id: record.id,
    peer_group_risks: record.peer_group_risks || "",
    exploitation_risks: record.exploitation_risks || "",
    online_risks: record.online_risks || "",
    community_locations_of_concern:
      record.community_locations_of_concern || "",
    transport_risks: record.transport_risks || "",
    protective_relationships: record.protective_relationships || "",
    disruption_actions: record.disruption_actions || "",
    reviewed_on: record.reviewed_on || null,
    status: record.status || "active",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
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

function renderMiniList(items = [], emptyTitle = "No items", emptyText = "Nothing to show.") {
  if (!items.length) return renderEmpty(emptyTitle, emptyText);

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const when =
            item.concern_datetime ||
            item.incident_datetime ||
            item.start_datetime ||
            item.interview_date ||
            item.review_date ||
            item.created_at ||
            item.updated_at;

          const statusValue =
            item.manager_review_status ||
            item.status ||
            item.severity ||
            item.alert_type ||
            "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id || "")}"
              data-record-type="${safeText(item.record_type || "")}"
              data-title="${safeText(item.title || "Record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <div class="record-row-title">${safeText(item.title || "Record")}</div>
                  ${
                    statusValue
                      ? `<span class="${badgeClass(statusValue)}">${safeText(statusValue)}</span>`
                      : ""
                  }
                </div>
                <div class="record-row-summary">${safeText(item.summary || item.description || "")}</div>
                <div class="record-row-meta">${safeText(formatDateTime(when, "No date"))}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderRiskBlock(profile) {
  if (!profile) {
    return renderEmpty(
      "No contextual safeguarding profile",
      "No contextual safeguarding profile has been recorded yet."
    );
  }

  const items = [
    ["Peer group risks", profile.peer_group_risks],
    ["Exploitation risks", profile.exploitation_risks],
    ["Online risks", profile.online_risks],
    ["Locations of concern", profile.community_locations_of_concern],
    ["Transport risks", profile.transport_risks],
    ["Protective relationships", profile.protective_relationships],
    ["Disruption actions", profile.disruption_actions],
  ].filter(([, value]) => String(value ?? "").trim());

  if (!items.length) {
    return renderEmpty(
      "Profile started",
      "A contextual safeguarding profile exists but detailed fields have not been completed yet."
    );
  }

  return `
    <div class="details-card">
      <div class="details-grid">
        ${items
          .map(
            ([label, value]) => `
              <div class="details-grid-item">
                <div class="details-grid-label">${safeText(label)}</div>
                <div class="details-grid-value">${safeText(value)}</div>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="details-card-footer">
        Last reviewed: ${safeText(formatDate(profile.reviewed_on, "Not recorded"))}
      </div>
    </div>
  `;
}

function renderSafetyPlan(plan) {
  if (!plan) {
    return renderEmpty(
      "No safety plan",
      "No active safety plan has been found for this young person."
    );
  }

  const fields = [
    ["Warning signs", plan.warning_signs],
    ["Triggers", plan.triggers],
    ["Coping strategies", plan.coping_strategies],
    ["People to contact", plan.people_to_contact],
    ["Professional support", plan.professional_support],
    ["Environmental safety steps", plan.environmental_safety_steps],
    ["Child voice", plan.child_voice],
  ].filter(([, value]) => String(value ?? "").trim());

  return `
    <div class="details-card">
      <div class="details-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
        <div>
          <div class="eyebrow">${safeText(plan.plan_type || "Safety plan")}</div>
          <h4 style="margin:0;">${safeText(plan.title || "Safety plan")}</h4>
        </div>
        <span class="${badgeClass(plan.status)}">${safeText(plan.status || "active")}</span>
      </div>

      <div class="details-grid">
        ${fields
          .map(
            ([label, value]) => `
              <div class="details-grid-item">
                <div class="details-grid-label">${safeText(label)}</div>
                <div class="details-grid-value">${safeText(value)}</div>
              </div>
            `
          )
          .join("")}
      </div>

      <div class="details-card-footer">
        Review date: ${safeText(formatDate(plan.review_date, "Not set"))}
      </div>
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty("No chronology", "No safeguarding-related chronology has been found yet.");
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.concern_datetime ||
            item.incident_datetime ||
            item.start_datetime ||
            item.interview_date ||
            item.created_at;

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${
                    item.severity || item.status || item.manager_review_status
                      ? `<span class="${badgeClass(
                          item.severity || item.status || item.manager_review_status
                        )}">${safeText(
                          item.severity || item.status || item.manager_review_status
                        )}</span>`
                      : ""
                  }
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
    openConcerns,
    activeAlerts,
    openMissing,
    openIncidents,
    overdueActions,
    latestSafetyPlan,
    contextualProfile,
    urgentItems,
    timeline,
    returnInterviews,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Safeguarding</div>
          <h2>Safeguarding and protection</h2>
          <p class="overview-panel-subtitle">
            Current concerns, contextual risks, missing episodes, return interviews and safety planning.
          </p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Open concerns", openConcerns.length)}
        ${renderStatCard("Active alerts", activeAlerts.length)}
        ${renderStatCard("Open missing", openMissing.length)}
        ${renderStatCard("Incidents flagged", openIncidents.length)}
        ${renderStatCard("Overdue actions", overdueActions.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Needs urgent attention",
            renderMiniList(
              urgentItems,
              "No urgent items",
              "There are no high-priority safeguarding items showing right now."
            )
          )}

          ${renderSection(
            "Open safeguarding concerns",
            renderMiniList(
              openConcerns,
              "No open concerns",
              "No open safeguarding records are currently listed."
            )
          )}

          ${renderSection(
            "Missing episodes",
            renderMiniList(
              openMissing,
              "No open missing episodes",
              "No current missing-from-care episodes are open."
            )
          )}

          ${renderSection(
            "Recent return interviews",
            renderMiniList(
              returnInterviews,
              "No return interviews",
              "No return interviews have been recorded yet."
            )
          )}

          ${renderSection("Recent chronology", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Active alerts",
            renderMiniList(
              activeAlerts,
              "No active alerts",
              "No active safeguarding alerts are recorded."
            )
          )}

          ${renderSection("Current safety plan", renderSafetyPlan(latestSafetyPlan))}

          ${renderSection(
            "Contextual safeguarding profile",
            renderRiskBlock(contextualProfile)
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- data -------------------------------- */

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, candidates = []) {
  for (const key of candidates) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

async function fetchAll(youngPersonId) {
  const [
    safeguardingRes,
    incidentsRes,
    missingRes,
    returnInterviewRes,
    alertsRes,
    safetyPlansRes,
    contextualRes,
  ] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/safeguarding`),
    safeGet(`/young-people/${youngPersonId}/incidents`),
    safeGet(`/young-people/${youngPersonId}/missing-episodes`),
    safeGet(`/young-people/${youngPersonId}/return-interviews`),
    safeGet(`/young-people/${youngPersonId}/alerts`),
    safeGet(`/young-people/${youngPersonId}/safety-plans`),
    safeGet(`/young-people/${youngPersonId}/contextual-safeguarding`),
  ]);

  return {
    safeguarding: pickItems(safeguardingRes, [
      "safeguarding_records",
      "records",
      "items",
    ]).map(mapSafeguardingRecord),

    incidents: pickItems(incidentsRes, [
      "incidents",
      "items",
    ]).map(mapIncident),

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

    alerts: pickItems(alertsRes, [
      "young_person_alerts",
      "alerts",
      "items",
    ]).map(mapAlert),

    safetyPlans: pickItems(safetyPlansRes, [
      "safety_plans",
      "plans",
      "items",
    ]).map(mapSafetyPlan),

    contextualProfiles: pickItems(contextualRes, [
      "contextual_safeguarding_profiles",
      "profiles",
      "items",
    ]).map(mapContextualProfile),
  };
}

/* -------------------------------- builders -------------------------------- */

function buildOpenConcerns(data) {
  return sortNewest(
    data.safeguarding.filter((item) => item.is_open),
    ["concern_datetime", "created_at", "updated_at"]
  );
}

function buildOpenMissing(data) {
  return sortNewest(
    data.missingEpisodes.filter((item) => item.is_open),
    ["start_datetime", "reported_datetime", "created_at"]
  );
}

function buildFlaggedIncidents(data) {
  return sortNewest(
    data.incidents.filter(
      (item) =>
        item.safeguarding_flag ||
        item.requires_notification ||
        isHighRisk(item.severity) ||
        isOpenStatus(item.manager_review_status)
    ),
    ["incident_datetime", "created_at", "updated_at"]
  );
}

function buildActiveAlerts(data) {
  return sortNewest(
    data.alerts.filter((item) => item.is_active),
    ["created_at", "updated_at", "review_date"]
  );
}

function buildLatestSafetyPlan(data) {
  return sortNewest(
    data.safetyPlans.filter((item) => !isClosedStatus(item.status)),
    ["updated_at", "created_at", "review_date"]
  )[0] || null;
}

function buildContextualProfile(data) {
  return sortNewest(
    data.contextualProfiles.filter((item) => !isClosedStatus(item.status)),
    ["reviewed_on", "updated_at", "created_at"]
  )[0] || null;
}

function buildReturnInterviews(data) {
  return sortNewest(data.returnInterviews, [
    "interview_date",
    "created_at",
    "updated_at",
  ]).slice(0, 8);
}

function buildOverdueActions(data) {
  const fromAlerts = data.alerts.filter(
    (item) => item.is_active && item.review_date && isOverdue(item.review_date)
  );

  const fromSafetyPlans = data.safetyPlans.filter(
    (item) => !isClosedStatus(item.status) && item.review_date && isOverdue(item.review_date)
  );

  const fromMissing = data.missingEpisodes.filter(
    (item) => !item.return_interview_completed && item.return_datetime
  );

  return [...fromAlerts, ...fromSafetyPlans, ...fromMissing];
}

function buildUrgentItems(data) {
  const urgentSafeguarding = data.safeguarding.filter(
    (item) => item.is_open && (isHighRisk(item.severity) || toBool(item.referral_made))
  );

  const urgentIncidents = data.incidents.filter(
    (item) =>
      item.safeguarding_flag &&
      (isHighRisk(item.severity) ||
        item.police_notified ||
        item.lado_notified ||
        item.ofsted_notified)
  );

  const urgentMissing = data.missingEpisodes.filter((item) => item.is_open);

  const urgentAlerts = data.alerts.filter(
    (item) => item.is_active && isHighRisk(item.severity)
  );

  return sortNewest(
    [...urgentSafeguarding, ...urgentIncidents, ...urgentMissing, ...urgentAlerts],
    [
      "concern_datetime",
      "incident_datetime",
      "start_datetime",
      "created_at",
      "updated_at",
    ]
  ).slice(0, 10);
}

function buildTimeline(data) {
  const safeguardingItems = data.safeguarding.map((item) => ({
    ...item,
    title: item.title || "Safeguarding concern",
  }));

  const incidentItems = data.incidents
    .filter((item) => item.safeguarding_flag)
    .map((item) => ({
      ...item,
      title: item.title || "Safeguarding incident",
      summary: item.summary,
    }));

  const missingItems = data.missingEpisodes.map((item) => ({
    ...item,
    title: item.return_datetime ? "Missing episode returned" : "Missing episode open",
    summary: item.summary,
  }));

  const interviewItems = data.returnInterviews.map((item) => ({
    ...item,
    title: "Return interview",
    summary: item.summary,
  }));

  return sortNewest(
    [...safeguardingItems, ...incidentItems, ...missingItems, ...interviewItems],
    [
      "concern_datetime",
      "incident_datetime",
      "start_datetime",
      "interview_date",
      "created_at",
    ]
  ).slice(0, 20);
}

/* -------------------------------- controller -------------------------------- */

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view safeguarding information."
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

    const openConcerns = buildOpenConcerns(data);
    const openMissing = buildOpenMissing(data);
    const openIncidents = buildFlaggedIncidents(data);
    const activeAlerts = buildActiveAlerts(data);
    const latestSafetyPlan = buildLatestSafetyPlan(data);
    const contextualProfile = buildContextualProfile(data);
    const returnInterviews = buildReturnInterviews(data);
    const overdueActions = buildOverdueActions(data);
    const urgentItems = buildUrgentItems(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      openConcerns,
      activeAlerts,
      openMissing,
      openIncidents,
      overdueActions,
      latestSafetyPlan,
      contextualProfile,
      urgentItems,
      timeline,
      returnInterviews,
    });

    updateWorkspaceSummaryStrip({
      today: `${urgentItems.filter((item) => isToday(
        item.concern_datetime ||
          item.incident_datetime ||
          item.start_datetime ||
          item.created_at
      )).length} urgent today`,
      nextEvent: openMissing[0]
        ? `Missing since ${formatDateTime(
            openMissing[0].start_datetime,
            "Unknown"
          )}`
        : "No open missing",
      lastRecord: timeline[0]
        ? formatDateTime(
            timeline[0].concern_datetime ||
              timeline[0].incident_datetime ||
              timeline[0].start_datetime ||
              timeline[0].interview_date ||
              timeline[0].created_at,
            "None"
          )
        : "None",
      openActions: `${overdueActions.length} overdue`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load safeguarding",
      "Something went wrong while loading safeguarding information."
    );
  }
}
