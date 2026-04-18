import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function getYoungPersonId() {
  return state.youngPersonId || state.selectedYoungPerson?.id || null;
}

function getScopeId() {
  return getCurrentScope() === "child" ? getYoungPersonId() : getHomeId();
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

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

function getStatusTone(status = "") {
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "critical",
      "high",
      "overdue",
      "cancelled",
      "failed",
      "non_engagement",
      "risk",
      "escalated",
      "blocked",
      "ended_unplanned",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "due_soon",
      "planned",
      "pending",
      "awaiting",
      "in_progress",
      "review_due",
      "attention",
      "referred",
      "open",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "booked",
      "completed",
      "resolved",
      "current",
      "confirmed",
      "closed",
      "good",
      "engaged",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.therapy) && data.therapy.length > 0) return true;
  if (Array.isArray(data.therapy_records) && data.therapy_records.length > 0) return true;
  if (Array.isArray(data.referrals) && data.referrals.length > 0) return true;
  if (Array.isArray(data.sessions) && data.sessions.length > 0) return true;
  if (Array.isArray(data.recommendations) && data.recommendations.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.therapy_summary && typeof data.therapy_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.therapy_summary || data.dashboard || data || {};
}

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.therapy_records, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "therapy",
      title:
        item.title ||
        item.service_name ||
        item.therapy_type ||
        "Therapeutic input",
      service_name:
        item.service_name ||
        item.therapy_type ||
        item.title ||
        "Therapeutic input",
      professional_name:
        item.professional_name ||
        item.therapist_name ||
        item.clinician ||
        "",
      young_person_name:
        item.young_person_name ||
        item.child_name ||
        item.full_name ||
        "",
      status: item.status || "active",
      session_date:
        item.session_date ||
        item.event_datetime ||
        item.created_at ||
        null,
      next_session_date:
        item.next_session_date ||
        item.review_date ||
        null,
      summary:
        item.summary ||
        item.notes ||
        item.outcome ||
        "Therapeutic record available.",
      recommendations:
        item.recommendations ||
        item.actions_agreed ||
        "",
      outcome: item.outcome || "",
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
}

function normaliseReferralItems(data = {}) {
  return toArray(data.items, [data.referrals, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "therapy_referral",
    title:
      item.title ||
      item.young_person_name ||
      item.child_name ||
      "Therapy referral",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.full_name ||
      "Young person",
    referral_type:
      item.referral_type ||
      item.service_name ||
      item.therapy_type ||
      "",
    professional_name:
      item.professional_name ||
      item.therapist_name ||
      "",
    status: item.status || "referred",
    referral_date:
      item.referral_date ||
      item.created_at ||
      null,
    review_date:
      item.review_date ||
      item.next_step_date ||
      null,
    summary:
      item.summary ||
      item.reason ||
      item.notes ||
      "Therapy referral available.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseRecommendationItems(data = {}) {
  return toArray(data.items, [data.recommendations, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "therapy_recommendation",
    title:
      item.title ||
      item.young_person_name ||
      item.child_name ||
      "Therapeutic recommendation",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.full_name ||
      "",
    status: item.status || "open",
    due_date:
      item.due_date ||
      item.review_date ||
      null,
    owner:
      item.owner ||
      item.assigned_to ||
      item.professional_name ||
      "",
    summary:
      item.summary ||
      item.recommendation ||
      item.notes ||
      "Therapeutic recommendation recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    assigned_role: item.assigned_role || "",
    staff_member: item.staff_member || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.notes ||
      item.task ||
      "Therapy task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  therapyItems = [],
  referralItems = [],
  recommendationItems = [],
  openTasks = [],
}) {
  const activeTherapy = therapyItems.filter((item) =>
    ["active", "booked", "current", "engaged"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const openReferrals = referralItems.filter((item) =>
    !["closed", "completed", "resolved", "rejected"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const openRecommendations = recommendationItems.filter((item) =>
    !["closed", "completed", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const overdueRecommendations = recommendationItems.filter((item) =>
    ["overdue", "due_soon", "review_due", "open", "warning"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Active therapy",
      value: activeTherapy,
      note: "Current therapeutic input",
      tone: activeTherapy ? "success" : "muted",
    },
    {
      label: "Open referrals",
      value: openReferrals,
      note: "Referrals still progressing",
      tone: openReferrals ? "warning" : "success",
    },
    {
      label: "Recommendations live",
      value: openRecommendations,
      note: "Actions from therapeutic advice",
      tone: openRecommendations ? "warning" : "success",
    },
    {
      label: "Follow-up due",
      value: overdueRecommendations,
      note: "Recommendations needing action",
      tone: overdueRecommendations ? "warning" : "success",
    },
    {
      label: "Open actions",
      value: openTasks.length,
      note: "Therapy-linked tasks still open",
      tone: openTasks.length ? "warning" : "success",
    },
    {
      label: "All records",
      value: therapyItems.length + referralItems.length,
      note: "Therapy workflow records loaded",
      tone: "muted",
    },
  ];
}

function buildProgressCards({
  therapyItems = [],
  referralItems = [],
  recommendationItems = [],
}) {
  const engagedTherapy = therapyItems.filter((item) =>
    ["active", "completed", "engaged", "current"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const therapyPercent = therapyItems.length
    ? Math.round((engagedTherapy / therapyItems.length) * 100)
    : 0;

  const progressedReferrals = referralItems.filter((item) =>
    ["active", "booked", "accepted", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const referralPercent = referralItems.length
    ? Math.round((progressedReferrals / referralItems.length) * 100)
    : 0;

  const resolvedRecommendations = recommendationItems.filter((item) =>
    ["resolved", "completed", "closed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const recommendationPercent = recommendationItems.length
    ? Math.round((resolvedRecommendations / recommendationItems.length) * 100)
    : 0;

  return [
    {
      label: "Therapy engagement",
      value: `${therapyPercent}%`,
      percent: therapyPercent,
      tone:
        therapyPercent >= 80 ? "success" : therapyPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Referral progression",
      value: `${referralPercent}%`,
      percent: referralPercent,
      tone:
        referralPercent >= 70 ? "success" : referralPercent >= 45 ? "warning" : "danger",
    },
    {
      label: "Recommendation closure",
      value: `${recommendationPercent}%`,
      percent: recommendationPercent,
      tone:
        recommendationPercent >= 75
          ? "success"
          : recommendationPercent >= 50
          ? "warning"
          : "danger",
    },
  ];
}

function buildPriorityItems({
  therapyItems = [],
  referralItems = [],
  recommendationItems = [],
  taskItems = [],
}) {
  const items = [];

  therapyItems
    .filter((item) =>
      ["risk", "non_engagement", "cancelled", "overdue", "attention"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.young_person_name || item.service_name || "Therapeutic input",
        summary: item.summary || "Therapeutic work needs review or re-engagement.",
      });
    });

  referralItems
    .filter((item) =>
      ["referred", "pending", "awaiting", "review_due"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.young_person_name || "Therapy referral",
        summary: item.summary || "Therapy referral still needs progression.",
      });
    });

  recommendationItems
    .filter((item) =>
      ["open", "overdue", "due_soon", "review_due", "warning"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Recommendation",
        summary: item.summary || "Recommendation still needs action.",
      });
    });

  taskItems
    .filter((item) => !item.completed)
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Therapy action",
        summary: item.summary || "Open therapy-linked action remains outstanding.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major therapy pressure",
      summary: "Therapeutic input is not currently surfacing urgent issues.",
    });
  }

  return items.slice(0, 8);
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(card.tone || "muted")}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.young_person_name ||
            item?.service_name ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
              data-title="${safeText(title)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent therapeutic issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTherapyHtml({
  title = "Therapy and clinical input",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  therapyItems = [],
  referralItems = [],
  recommendationItems = [],
  taskItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--therapy">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Therapy and clinical input</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across therapy referrals, sessions, recommendations and therapeutic follow-up.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live therapy endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Therapy snapshot</h3>
          <p>A quick visual read across engagement, referrals and follow-up completion.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Therapeutic input</h3>
              <p>Sessions, consultations and therapeutic records linked to the current scope.</p>
            </div>

            ${renderRows(therapyItems, {
              emptyMessage: "No therapeutic records found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "therapy",
              metaBuilder: (item) =>
                [
                  item.service_name || "",
                  item.professional_name || "",
                  item.session_date ? formatDate(item.session_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Therapy referrals</h3>
              <p>Referrals, waiting activity and progression into therapeutic work.</p>
            </div>

            ${renderRows(referralItems, {
              emptyMessage: "No therapy referrals found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "therapy_referral",
              metaBuilder: (item) =>
                [
                  item.referral_type || "",
                  item.professional_name || "",
                  item.referral_date ? `Referred ${formatDate(item.referral_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recommendations and actions</h3>
              <p>Therapeutic guidance, agreed actions and practice recommendations.</p>
            </div>

            ${renderRows(recommendationItems, {
              emptyMessage: "No therapeutic recommendations found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "therapy_recommendation",
              metaBuilder: (item) =>
                [
                  item.young_person_name || "",
                  item.owner || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent therapy and clinical issues across the current scope.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open follow-up tasks</h3>
              <p>Tasks linked to therapeutic work, recommendations and coordination.</p>
            </div>

            ${renderRows(taskItems, {
              emptyMessage: "No therapy-linked tasks found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || item.staff_member || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening therapy."
      : "A home ID is needed before therapy can load.";

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">◌</div>
          <h3>No therapy context available</h3>
          <p>${safeText(message)}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No therapy context",
    nextEvent: "No clinical review loaded",
    lastRecord: "No therapeutic data",
    openActions: "No therapy actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading therapy…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading therapy view",
    nextEvent: "Checking next session",
    lastRecord: "Loading latest therapy activity",
    openActions: "Loading therapy actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load therapy</h3>
          <p>${safeText(message || "The therapy view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Therapy unavailable",
    nextEvent: "No session loaded",
    lastRecord: "No therapeutic data",
    openActions: "No therapy actions loaded",
  });
}

function buildFallbackData() {
  const now = new Date();
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: "Therapy and clinical input",
      },
    },
    therapyData: {
      items: [
        {
          id: "therapy-1",
          young_person_name: "Amira Khan",
          service_name: "Clinical consultation",
          professional_name: "Priya Shah",
          status: "active",
          session_date: minusDays(5),
          next_session_date: plusDays(7),
          summary: "Clinical consultation completed with practical strategies shared for regulation support.",
          recommendations: "Use visual preparation, slower pacing and low-arousal debrief after incidents.",
        },
        {
          id: "therapy-2",
          young_person_name: "Jay Smith",
          service_name: "Play therapy",
          professional_name: "Alex Reed",
          status: "booked",
          session_date: plusDays(3),
          next_session_date: plusDays(3),
          summary: "Next play therapy session booked for next week.",
        },
      ],
    },
    referralData: {
      items: [
        {
          id: "ref-1",
          young_person_name: "Luca Brown",
          referral_type: "CAMHS consultation",
          professional_name: "CAMHS",
          status: "referred",
          referral_date: minusDays(8),
          review_date: plusDays(6),
          summary: "Referral sent and awaiting triage outcome.",
        },
      ],
    },
    recommendationData: {
      items: [
        {
          id: "rec-1",
          title: "Update sensory support plan",
          young_person_name: "Amira Khan",
          owner: "Keyworker",
          due_date: plusDays(4),
          status: "open",
          summary: "Therapeutic recommendation to update sensory support strategies in the plan.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Share clinical recommendations with staff team",
          due_date: plusDays(2),
          completed: false,
          status: "open",
          assigned_role: "Manager",
          summary: "Ensure latest therapeutic guidance is reflected in handover and support planning.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(scopeId) {
  const scope = getCurrentScope();
  const base =
    scope === "child" ? `/young-people/${scopeId}` : `/homes/${scopeId}`;

  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`${base}/therapy`),
    safeGet(`${base}/therapy-referrals`),
    safeGet(`${base}/therapy-recommendations`),
    safeGet(`${base}/tasks`),
  ];

  const [
    therapyData,
    referralData,
    recommendationData,
    taskData,
  ] = await Promise.all(requests);

  const responses = [
    therapyData,
    referralData,
    recommendationData,
    taskData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData();
  }

  return {
    summaryData: therapyData || {},
    therapyData: therapyData || { items: [] },
    referralData: referralData || { items: [] },
    recommendationData: recommendationData || { items: [] },
    taskData: taskData || { items: [] },
    isFallback: false,
  };
}

export async function loadTherapy() {
  if (!els.viewContent) return;

  const scopeId = getScopeId();

  if (!scopeId) {
    renderNoContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      therapyData,
      referralData,
      recommendationData,
      taskData,
      isFallback,
    } = await fetchDataset(scopeId);

    const summary = normaliseSummary(summaryData);

    const therapyItems = sortNewestFirst(normaliseTherapyItems(therapyData), [
      "session_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const referralItems = sortSoonestFirst(normaliseReferralItems(referralData), [
      "review_date",
      "referral_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const recommendationItems = sortSoonestFirst(
      normaliseRecommendationItems(recommendationData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ])
      .filter((item) => !item.completed)
      .slice(0, 6);

    const topStats = buildTopStats({
      therapyItems,
      referralItems,
      recommendationItems,
      openTasks: taskItems,
    });

    const progressCards = buildProgressCards({
      therapyItems,
      referralItems,
      recommendationItems,
    });

    const priorityItems = buildPriorityItems({
      therapyItems,
      referralItems,
      recommendationItems,
      taskItems,
    });

    const scopeTitle =
      summary.title ||
      (getCurrentScope() === "child"
        ? (
            state.selectedYoungPerson?.full_name ||
            state.selectedYoungPerson?.preferred_name ||
            "Young person therapy"
          )
        : (
            state.currentUser?.home_name ||
            state.currentUser?.homeName ||
            `Home ${getHomeId()} therapy`
          ));

    els.viewContent.innerHTML = renderTherapyHtml({
      title: scopeTitle,
      topStats,
      progressCards,
      priorityItems,
      therapyItems,
      referralItems,
      recommendationItems,
      taskItems,
      isFallback,
    });

    const nextSession =
      therapyItems.find((item) => item.next_session_date)?.next_session_date ||
      therapyItems.find((item) => item.session_date)?.session_date ||
      referralItems[0]?.review_date ||
      null;

    const latestRecord =
      therapyItems[0]?.updated_at ||
      therapyItems[0]?.session_date ||
      referralItems[0]?.updated_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${therapyItems.length} therapy records • preview mode`
        : `${therapyItems.length} therapy records • ${recommendationItems.length} recommendations`,
      nextEvent: nextSession
        ? `Next therapy date ${formatDate(nextSession)}`
        : "No therapy date loaded",
      lastRecord: latestRecord
        ? `Latest therapy update ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview therapy data loaded"
        : "No recent therapy update",
      openActions: `${taskItems.length} open • ${recommendationItems.filter((item) => !["resolved", "completed", "closed"].includes(String(item.status || "").toLowerCase().replaceAll(" ", "_"))).length} live recommendations`,
    });
  } catch (error) {
    console.error("[therapy] load failed", error);
    renderErrorState(error?.message || "The therapy view could not be loaded.");
  }
}
