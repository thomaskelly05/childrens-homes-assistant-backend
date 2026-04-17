import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
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

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value) {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
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
      "overdue",
      "critical",
      "failed",
      "missing",
      "rejected",
      "withdrawn",
      "expired",
      "danger",
      "not_started",
      "blocked",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "in_progress",
      "pending",
      "pending_checks",
      "awaiting_reference",
      "awaiting_dbs",
      "awaiting_documents",
      "shortlisted",
      "interview",
      "offered",
      "conditional_offer",
      "review_due",
      "attention",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "complete",
      "completed",
      "active",
      "current",
      "cleared",
      "confirmed",
      "good",
      "compliant",
      "on_track",
      "started",
      "hired",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(aValue) - toTime(bValue);
  });
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return toTime(bValue) - toTime(aValue);
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.pipeline) && data.pipeline.length > 0) return true;
  if (Array.isArray(data.candidates) && data.candidates.length > 0) return true;
  if (Array.isArray(data.onboarding) && data.onboarding.length > 0) return true;
  if (Array.isArray(data.inductions) && data.inductions.length > 0) return true;
  if (Array.isArray(data.probations) && data.probations.length > 0) return true;
  if (Array.isArray(data.training) && data.training.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.onboarding_summary && typeof data.onboarding_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.onboarding_summary || data.dashboard || data || {};
}

function normalisePipelineItems(data = {}) {
  return toArray(data.items, [data.pipeline, data.candidates, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "pipeline_candidate",
      full_name: item.full_name || item.candidate_name || item.name || "Candidate",
      title: item.title || item.full_name || item.candidate_name || "Candidate",
      role_applied_for: item.role_applied_for || item.role || item.job_title || "",
      stage: item.stage || item.pipeline_stage || "",
      status: item.status || item.stage || "pending",
      start_target_date: item.start_target_date || item.planned_start_date || null,
      dbs_status: item.dbs_status || item.dbs || "",
      references: item.references || item.reference_status || "",
      right_to_work: item.right_to_work || item.rtw_status || "",
      mandatory_training_status:
        item.mandatory_training_status || item.training_status || "",
      summary:
        item.summary ||
        item.notes ||
        [
          item.stage || "",
          item.role_applied_for || item.role || "",
          item.start_target_date ? `Start ${formatShortDate(item.start_target_date)}` : "",
        ]
          .filter(Boolean)
          .join(" • ") ||
        "Candidate in recruitment pipeline.",
      updated_at: item.updated_at || item.created_at || null,
      created_at: item.created_at || null,
    })
  );
}

function normaliseOnboardingItems(data = {}) {
  return toArray(data.items, [data.onboarding, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "onboarding",
    full_name: item.full_name || item.staff_member || item.name || "Staff member",
    title: item.title || item.full_name || item.staff_member || "Onboarding",
    role: item.role || item.job_title || "",
    stage: item.stage || item.onboarding_stage || "",
    status: item.status || "in_progress",
    start_target_date: item.start_target_date || item.start_date || null,
    checklist_completion: toNumber(item.checklist_completion, 0),
    dbs: item.dbs || item.dbs_status || "",
    references: item.references || item.reference_status || "",
    right_to_work: item.right_to_work || item.rtw_status || "",
    induction: item.induction || item.induction_status || "",
    shadow_shifts: toNumber(item.shadow_shifts, 0),
    mandatory_training: item.mandatory_training || item.training_status || "",
    summary:
      item.summary ||
      item.notes ||
      [
        item.stage || "",
        item.role || "",
        item.start_target_date ? `Start ${formatShortDate(item.start_target_date)}` : "",
      ]
        .filter(Boolean)
        .join(" • ") ||
      "Onboarding record.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseInductionItems(data = {}) {
  return toArray(data.items, [data.inductions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "induction",
    full_name: item.full_name || item.staff_member || item.name || "Staff member",
    title: item.title || item.full_name || "Induction",
    role: item.role || "",
    review_date: item.review_date || item.due_date || null,
    due_date: item.due_date || item.review_date || null,
    status: item.status || "in_progress",
    checklist_completion: toNumber(item.checklist_completion, 0),
    summary:
      item.summary ||
      item.notes ||
      (item.review_date || item.due_date
        ? `Review ${formatShortDate(item.review_date || item.due_date)}`
        : "Induction record."),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseProbationItems(data = {}) {
  return toArray(data.items, [data.probations, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "probation",
    full_name: item.full_name || item.staff_member || item.name || "Staff member",
    title: item.title || item.full_name || "Probation",
    role: item.role || "",
    probation_stage: item.probation_stage || item.stage || "",
    review_date: item.review_date || item.probation_end_date || item.due_date || null,
    due_date: item.due_date || item.review_date || item.probation_end_date || null,
    status: item.status || "active",
    line_manager: item.line_manager || "",
    summary:
      item.summary ||
      item.notes ||
      [
        item.probation_stage || item.stage || "",
        item.review_date || item.probation_end_date
          ? `Review ${formatShortDate(item.review_date || item.probation_end_date)}`
          : "",
      ]
        .filter(Boolean)
        .join(" • ") ||
      "Probation record.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "training_record",
    full_name: item.full_name || item.staff_member || item.name || "Staff member",
    title: item.title || item.training_name || "Training",
    training_name: item.training_name || item.title || "Training",
    role: item.role || "",
    status: item.status || "current",
    next_due_date: item.next_due_date || item.expiry_date || item.review_date || null,
    expiry_date: item.expiry_date || item.next_due_date || null,
    summary:
      item.summary ||
      item.notes ||
      (item.next_due_date || item.expiry_date
        ? `Due ${formatShortDate(item.next_due_date || item.expiry_date)}`
        : "Training record."),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Document",
    document_type: item.document_type || item.type || "",
    staff_member: item.staff_member || item.full_name || item.name || "",
    review_date: item.review_date || item.expiry_date || item.due_date || null,
    status: item.status || "active",
    summary:
      item.summary ||
      item.notes ||
      (item.review_date
        ? `Review ${formatShortDate(item.review_date)}`
        : "Onboarding document."),
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
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
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.notes ||
      item.task ||
      "Onboarding task recorded.",
    updated_at: item.updated_at || item.created_at || null,
    created_at: item.created_at || null,
  }));
}

function buildTopStats({
  pipelineItems = [],
  onboardingItems = [],
  inductionItems = [],
  probationItems = [],
  taskItems = [],
  documentItems = [],
}) {
  const openPipeline = pipelineItems.filter((item) =>
    !["hired", "withdrawn", "rejected", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const onboardingLive = onboardingItems.filter((item) =>
    !["completed", "closed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const inductionDue = inductionItems.filter((item) =>
    ["due", "due_soon", "review_due", "overdue", "in_progress"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const probationDue = probationItems.filter((item) =>
    ["due", "due_soon", "review_due", "overdue", "active"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const openTasks = taskItems.filter((item) => !item.completed).length;

  const docGaps = documentItems.filter((item) =>
    ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Recruitment pipeline",
      value: openPipeline,
      note: "Candidates still in progress",
      tone: openPipeline ? "muted" : "success",
    },
    {
      label: "Live onboarding",
      value: onboardingLive,
      note: "Staff not yet fully settled",
      tone: onboardingLive ? "warning" : "success",
    },
    {
      label: "Induction due",
      value: inductionDue,
      note: "Reviews or induction work pending",
      tone: inductionDue ? "warning" : "success",
    },
    {
      label: "Probation due",
      value: probationDue,
      note: "Probation checkpoints needing review",
      tone: probationDue ? "warning" : "success",
    },
    {
      label: "Open actions",
      value: openTasks,
      note: "Outstanding recruitment or onboarding tasks",
      tone: openTasks ? "warning" : "success",
    },
    {
      label: "Document gaps",
      value: docGaps,
      note: "Checks, references or evidence missing",
      tone: docGaps ? "danger" : "success",
    },
  ];
}

function buildProgressCards({
  pipelineItems = [],
  onboardingItems = [],
  inductionItems = [],
  probationItems = [],
}) {
  const clearedPipeline = pipelineItems.filter((item) =>
    ["offered", "conditional_offer", "hired", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const pipelinePercent = pipelineItems.length
    ? Math.round((clearedPipeline / pipelineItems.length) * 100)
    : 0;

  const onboardingReady = onboardingItems.filter((item) =>
    ["on_track", "completed", "active", "started"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const onboardingPercent = onboardingItems.length
    ? Math.round((onboardingReady / onboardingItems.length) * 100)
    : 0;

  const inductionGood = inductionItems.filter((item) =>
    ["completed", "complete", "on_track", "current"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const inductionPercent = inductionItems.length
    ? Math.round((inductionGood / inductionItems.length) * 100)
    : 0;

  const probationGood = probationItems.filter((item) =>
    ["active", "completed", "current", "good"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const probationPercent = probationItems.length
    ? Math.round((probationGood / probationItems.length) * 100)
    : 0;

  return [
    {
      label: "Recruitment conversion",
      value: `${pipelinePercent}%`,
      percent: pipelinePercent,
      tone:
        pipelinePercent >= 70 ? "success" : pipelinePercent >= 40 ? "warning" : "danger",
    },
    {
      label: "Onboarding progress",
      value: `${onboardingPercent}%`,
      percent: onboardingPercent,
      tone:
        onboardingPercent >= 80 ? "success" : onboardingPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Induction health",
      value: `${inductionPercent}%`,
      percent: inductionPercent,
      tone:
        inductionPercent >= 80 ? "success" : inductionPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Probation health",
      value: `${probationPercent}%`,
      percent: probationPercent,
      tone:
        probationPercent >= 80 ? "success" : probationPercent >= 60 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  pipelineItems = [],
  onboardingItems = [],
  inductionItems = [],
  probationItems = [],
  documentItems = [],
  taskItems = [],
}) {
  const items = [];

  pipelineItems
    .filter((item) =>
      ["awaiting_dbs", "awaiting_reference", "awaiting_documents", "conditional_offer"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.full_name || "Candidate",
        summary: item.summary || "Recruitment checks still outstanding.",
      });
    });

  inductionItems
    .filter((item) =>
      ["overdue", "due_soon", "review_due", "in_progress"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.full_name || "Induction item",
        summary: item.summary || "Induction follow-up is needed.",
      });
    });

  probationItems
    .filter((item) =>
      ["overdue", "due_soon", "review_due"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.full_name || "Probation item",
        summary: item.summary || "Probation review is due.",
      });
    });

  documentItems
    .filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Document gap",
        summary: item.summary || "Required document evidence is missing.",
      });
    });

  taskItems
    .filter((item) => !item.completed)
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Open onboarding action",
        summary: item.summary || "Outstanding onboarding action remains open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major onboarding pressure",
      summary: "Recruitment and onboarding flow is not currently surfacing urgent issues.",
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
            item?.full_name ||
            item?.staff_member ||
            item?.training_name ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.role ||
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
        <p>No urgent onboarding issues are showing right now.</p>
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

function renderOnboardingHtml({
  title = "Recruitment and onboarding",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  pipelineItems = [],
  onboardingItems = [],
  inductionItems = [],
  probationItems = [],
  documentItems = [],
  taskItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Recruitment and onboarding</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across recruitment checks, onboarding progress, induction, probation and safer recruitment readiness.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live onboarding endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Progress snapshot</h3>
          <p>A quick visual read across recruitment, onboarding, induction and probation health.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recruitment pipeline</h3>
              <p>Candidates, stages and safer recruitment checks.</p>
            </div>

            ${renderRows(pipelineItems, {
              emptyMessage: "No pipeline candidates found.",
              titleKey: "full_name",
              summaryKey: "summary",
              recordType: "pipeline_candidate",
              metaBuilder: (item) =>
                [
                  item.role_applied_for || "",
                  item.stage || "",
                  item.start_target_date ? `Start ${formatDate(item.start_target_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Live onboarding</h3>
              <p>Staff progressing through checks, induction and early readiness.</p>
            </div>

            ${renderRows(onboardingItems, {
              emptyMessage: "No onboarding records found.",
              titleKey: "full_name",
              summaryKey: "summary",
              recordType: "onboarding",
              metaBuilder: (item) =>
                [
                  item.role || "",
                  item.stage || "",
                  `${toNumber(item.checklist_completion)}% checklist`,
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Induction and probation</h3>
              <p>Early support, induction review and probation checkpoints.</p>
            </div>

            ${renderRows(
              [...inductionItems.slice(0, 5), ...probationItems.slice(0, 5)],
              {
                emptyMessage: "No induction or probation items found.",
                titleKey: "full_name",
                summaryKey: "summary",
                recordType: "onboarding",
                metaBuilder: (item) =>
                  [
                    item.role || "",
                    item.review_date || item.due_date
                      ? `Review ${formatDate(item.review_date || item.due_date)}`
                      : "",
                    item.probation_stage || "",
                  ]
                    .filter(Boolean)
                    .join(" • "),
              }
            )}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent recruitment and onboarding issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Document readiness</h3>
              <p>References, checks, certificates and onboarding evidence.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No onboarding document gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.staff_member || "",
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open actions</h3>
              <p>Practical follow-up actions linked to safer recruitment and onboarding.</p>
            </div>

            ${renderRows(taskItems, {
              emptyMessage: "No onboarding actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || "",
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

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">☑</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before onboarding can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No onboarding context",
    nextEvent: "No recruitment milestone loaded",
    lastRecord: "No onboarding data",
    openActions: "No onboarding actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading onboarding…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading onboarding",
    nextEvent: "Checking start dates",
    lastRecord: "Loading latest recruitment record",
    openActions: "Loading onboarding actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load onboarding</h3>
          <p>${safeText(message || "The onboarding view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Onboarding unavailable",
    nextEvent: "No milestone loaded",
    lastRecord: "No onboarding record loaded",
    openActions: "No actions loaded",
  });
}

function buildFallbackData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const now = new Date();
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: `${homeName} onboarding`,
        home_name: homeName,
      },
    },
    pipelineData: {
      items: [
        {
          id: "pipe-1",
          full_name: "Amelia Reed",
          role_applied_for: "Residential Worker",
          stage: "Interview",
          status: "interview",
          start_target_date: plusDays(21),
          summary: "Interview booked and references underway.",
        },
        {
          id: "pipe-2",
          full_name: "Daniel Price",
          role_applied_for: "Waking Night",
          stage: "Conditional offer",
          status: "awaiting_dbs",
          start_target_date: plusDays(14),
          summary: "Conditional offer made, DBS still pending.",
        },
      ],
    },
    onboardingData: {
      items: [
        {
          id: "onb-1",
          full_name: "Holly Kent",
          role: "Residential Worker",
          stage: "Induction",
          status: "in_progress",
          checklist_completion: 65,
          start_target_date: plusDays(7),
          summary: "Induction active with shadow shifts underway.",
        },
        {
          id: "onb-2",
          full_name: "Marcus Ali",
          role: "Senior Residential Worker",
          stage: "Pre-start",
          status: "awaiting_documents",
          checklist_completion: 40,
          start_target_date: plusDays(10),
          summary: "Missing final right to work evidence.",
        },
      ],
    },
    inductionData: {
      items: [
        {
          id: "ind-1",
          full_name: "Holly Kent",
          role: "Residential Worker",
          review_date: plusDays(5),
          status: "due_soon",
          checklist_completion: 65,
          summary: "Induction review due this week.",
        },
      ],
    },
    probationData: {
      items: [
        {
          id: "prob-1",
          full_name: "Jake Morton",
          role: "Residential Worker",
          probation_stage: "8-week review",
          review_date: plusDays(9),
          status: "due_soon",
          summary: "Probation review approaching.",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "DBS evidence",
          document_type: "DBS",
          staff_member: "Daniel Price",
          review_date: plusDays(3),
          status: "missing",
          summary: "DBS evidence still outstanding.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Chase second reference",
          task: "Follow up missing reference for candidate.",
          due_date: plusDays(2),
          completed: false,
          status: "open",
          assigned_role: "Manager",
          summary: "Second reference still required before start.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/onboarding`),
    safeGet(`/homes/${homeId}/pipeline`),
    safeGet(`/homes/${homeId}/inductions`),
    safeGet(`/homes/${homeId}/probations`),
    safeGet(`/homes/${homeId}/training`),
    safeGet(`/homes/${homeId}/staff-documents`),
    safeGet(`/homes/${homeId}/tasks`),
  ];

  const [
    onboardingData,
    pipelineData,
    inductionData,
    probationData,
    trainingData,
    documentData,
    taskData,
  ] = await Promise.all(requests);

  const responses = [
    onboardingData,
    pipelineData,
    inductionData,
    probationData,
    trainingData,
    documentData,
    taskData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: onboardingData || {},
    pipelineData: pipelineData || { items: [] },
    onboardingData: onboardingData || { items: [] },
    inductionData: inductionData || { items: [] },
    probationData: probationData || { items: [] },
    trainingData: trainingData || { items: [] },
    documentData: documentData || { items: [] },
    taskData: taskData || { items: [] },
    isFallback: false,
  };
}

export async function loadOnboarding() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      pipelineData,
      onboardingData,
      inductionData,
      probationData,
      trainingData,
      documentData,
      taskData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const pipelineItems = sortSoonestFirst(normalisePipelineItems(pipelineData), [
      "start_target_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const onboardingItems = sortSoonestFirst(
      normaliseOnboardingItems(onboardingData),
      ["start_target_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const inductionItems = sortSoonestFirst(
      normaliseInductionItems(inductionData),
      ["review_date", "due_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const probationItems = sortSoonestFirst(
      normaliseProbationItems(probationData),
      ["review_date", "due_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const trainingItems = sortSoonestFirst(
      normaliseTrainingItems(trainingData),
      ["next_due_date", "expiry_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const documentItems = sortSoonestFirst(
      normaliseDocumentItems(documentData),
      ["review_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]).filter((item) => !item.completed).slice(0, 6);

    const topStats = buildTopStats({
      pipelineItems,
      onboardingItems,
      inductionItems,
      probationItems,
      taskItems,
      documentItems,
    });

    const progressCards = buildProgressCards({
      pipelineItems,
      onboardingItems,
      inductionItems,
      probationItems,
    });

    const priorityItems = buildPriorityItems({
      pipelineItems,
      onboardingItems,
      inductionItems,
      probationItems,
      documentItems,
      taskItems,
    });

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} onboarding`;

    els.viewContent.innerHTML = renderOnboardingHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      pipelineItems,
      onboardingItems,
      inductionItems,
      probationItems: [...probationItems, ...trainingItems].slice(0, 8),
      documentItems,
      taskItems,
      isFallback,
    });

    const nextMilestone =
      pipelineItems[0]?.start_target_date ||
      onboardingItems[0]?.start_target_date ||
      inductionItems[0]?.review_date ||
      probationItems[0]?.review_date ||
      null;

    const latestRecord =
      onboardingItems[0]?.updated_at ||
      pipelineItems[0]?.updated_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${pipelineItems.length} pipeline • ${onboardingItems.length} onboarding • preview mode`
        : `${pipelineItems.length} pipeline • ${onboardingItems.length} onboarding`,
      nextEvent: nextMilestone
        ? `Next milestone ${formatDate(nextMilestone)}`
        : "No onboarding milestone loaded",
      lastRecord: latestRecord
        ? `Latest recruitment update ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview onboarding data loaded"
        : "No recent onboarding update",
      openActions: `${taskItems.length} open • ${documentItems.length} document checks`,
    });
  } catch (error) {
    console.error("[onboarding] load failed", error);
    renderErrorState(error?.message || "The onboarding view could not be loaded.");
  }
}