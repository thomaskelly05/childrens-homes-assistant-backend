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
  const normalised = String(status || "").toLowerCase();

  if (
    [
      "overdue",
      "critical",
      "high",
      "failed",
      "missing",
      "blocked",
      "non_compliant",
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
      "passed",
      "active",
      "signed_off",
      "ok",
      "good",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

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

function normaliseSummary(data = {}) {
  return data.summary || data.onboarding_summary || data.dashboard || data || {};
}

function normaliseOnboardingItems(data = {}) {
  return toArray(data.items, [data.onboarding, data.checklist, data.records]);
}

function normaliseChecklistItems(data = {}) {
  return toArray(data.items, [data.checklist_items, data.records]);
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]);
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]);
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]);
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]);
}

function buildTopStats({
  onboardingItems = [],
  saferRecruitmentGaps = [],
  inductionGaps = [],
  probationReviewsDue = [],
  supervisionGaps = [],
  openTasks = [],
}) {
  const liveOnboarding = onboardingItems.filter((item) =>
    ["pending", "in_progress", "due_soon", "warning"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  return [
    {
      label: "Live onboarding",
      value: liveOnboarding,
      note: "Staff still moving through onboarding",
      tone: liveOnboarding ? "warning" : "success",
    },
    {
      label: "Safer recruitment gaps",
      value: saferRecruitmentGaps.length,
      note: "Checks or evidence still missing",
      tone: saferRecruitmentGaps.length ? "danger" : "success",
    },
    {
      label: "Induction incomplete",
      value: inductionGaps.length,
      note: "Core induction not yet signed off",
      tone: inductionGaps.length ? "warning" : "success",
    },
    {
      label: "Probation reviews due",
      value: probationReviewsDue.length,
      note: "Permanent appointments requiring review",
      tone: probationReviewsDue.length ? "warning" : "success",
    },
    {
      label: "Supervision gaps",
      value: supervisionGaps.length,
      note: "Practice oversight not yet in place",
      tone: supervisionGaps.length ? "warning" : "success",
    },
    {
      label: "Open onboarding actions",
      value: openTasks.length,
      note: "Actions for staff or managers",
      tone: openTasks.length ? "warning" : "success",
    },
  ];
}

function buildProgressCards({
  checklistItems = [],
  trainingItems = [],
  supervisionItems = [],
  onboardingItems = [],
}) {
  const completedChecklist = checklistItems.filter((item) =>
    ["complete", "completed", "passed", "signed_off"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const checklistPercent =
    checklistItems.length > 0
      ? Math.round((completedChecklist / checklistItems.length) * 100)
      : 0;

  const completeTraining = trainingItems.filter((item) =>
    ["complete", "completed", "passed", "booked"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const trainingPercent =
    trainingItems.length > 0
      ? Math.round((completeTraining / trainingItems.length) * 100)
      : 0;

  const completeSupervision = supervisionItems.filter((item) =>
    ["complete", "completed", "booked"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const supervisionPercent =
    supervisionItems.length > 0
      ? Math.round((completeSupervision / supervisionItems.length) * 100)
      : 0;

  const signedOff = onboardingItems.filter((item) =>
    ["signed_off", "completed", "complete"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const onboardingPercent =
    onboardingItems.length > 0
      ? Math.round((signedOff / onboardingItems.length) * 100)
      : 0;

  return [
    {
      label: "Checklist completion",
      value: `${checklistPercent}%`,
      percent: checklistPercent,
      tone:
        checklistPercent >= 90
          ? "success"
          : checklistPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Core training",
      value: `${trainingPercent}%`,
      percent: trainingPercent,
      tone:
        trainingPercent >= 90
          ? "success"
          : trainingPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Supervision setup",
      value: `${supervisionPercent}%`,
      percent: supervisionPercent,
      tone:
        supervisionPercent >= 90
          ? "success"
          : supervisionPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Onboarding sign-off",
      value: `${onboardingPercent}%`,
      percent: onboardingPercent,
      tone:
        onboardingPercent >= 90
          ? "success"
          : onboardingPercent >= 70
          ? "warning"
          : "danger",
    },
  ];
}

function buildPriorityItems({
  saferRecruitmentGaps = [],
  inductionGaps = [],
  probationReviewsDue = [],
  supervisionGaps = [],
  openTasks = [],
}) {
  const items = [];

  saferRecruitmentGaps.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Safer recruitment gap",
      summary:
        item.summary ||
        item.notes ||
        "Employment checks or documentary evidence are incomplete.",
    });
  });

  inductionGaps.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Induction incomplete",
      summary:
        item.summary ||
        item.next_step ||
        "Induction still requires completion and sign-off.",
    });
  });

  probationReviewsDue.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Probation review due",
      summary: item.review_date
        ? `Review due ${formatDate(item.review_date)}`
        : "Probation review should be arranged.",
    });
  });

  supervisionGaps.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision gap",
      summary:
        item.summary ||
        (item.next_due_date
          ? `Supervision due ${formatDate(item.next_due_date)}`
          : "Supervision arrangement still missing."),
    });
  });

  openTasks.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || "Onboarding action",
      summary:
        item.task || item.summary || "Outstanding onboarding action needs completion.",
    });
  });

  return items.slice(0, 6);
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
            item?.staff_member ||
            item?.full_name ||
            item?.check_name ||
            item?.training_name ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.next_step ||
            item?.stage ||
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
  title = "Staff onboarding",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  onboardingItems = [],
  saferRecruitmentGaps = [],
  inductionGaps = [],
  probationReviewsDue = [],
  supervisionGaps = [],
  openTasks = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Onboarding and induction</div>
          <h2>${safeText(title)}</h2>
          <p>A live onboarding view across safer recruitment, induction, probation, supervision, training and sign-off.</p>
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
          <h3>Onboarding snapshot</h3>
          <p>A quick visual read across core checks, training, supervision and sign-off.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Live onboarding records</h3>
              <p>Where each adult is in the onboarding, induction or probation journey.</p>
            </div>

            ${renderRows(onboardingItems, {
              emptyMessage: "No onboarding records found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "onboarding",
              metaBuilder: (item) =>
                [
                  item.stage || "",
                  item.next_review_date ? `Review ${formatDate(item.next_review_date)}` : "",
                  item.next_step || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Safer recruitment and employment checks</h3>
              <p>Checks such as references, DBS, right to work and identity evidence.</p>
            </div>

            ${renderRows(saferRecruitmentGaps, {
              emptyMessage: "No safer recruitment gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "recruitment_check",
              metaBuilder: (item) =>
                [
                  item.check_name || item.document_type || "",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Open onboarding actions</h3>
              <p>Tasks for staff, line managers or leadership to complete next.</p>
            </div>

            ${renderRows(openTasks, {
              emptyMessage: "No onboarding actions found.",
              titleKey: "title",
              summaryKey: "task",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.staff_member || item.assigned_role || "",
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
              <p>The most urgent onboarding and induction issues.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Induction gaps</h3>
              <p>Core induction areas not yet complete or signed off.</p>
            </div>

            ${renderRows(inductionGaps, {
              emptyMessage: "No induction gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "induction",
              metaBuilder: (item) =>
                [
                  item.stage || "Induction",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Probation reviews</h3>
              <p>Permanent appointments that need probation review or sign-off.</p>
            </div>

            ${renderRows(probationReviewsDue, {
              emptyMessage: "No probation reviews due.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "probation",
              metaBuilder: (item) =>
                [
                  item.line_manager || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision and support</h3>
              <p>Practice oversight that should be in place during onboarding.</p>
            </div>

            ${renderRows(supervisionGaps, {
              emptyMessage: "No supervision gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [
                  item.supervisor || "",
                  item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
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

function buildFallbackOnboardingData(homeId) {
  const now = new Date();
  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };
  const minusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: "Staff onboarding",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    onboardingData: {
      items: [
        {
          id: "on-1",
          staff_member: "Ben Carter",
          stage: "Probation",
          next_step: "Book 8-week probation supervision and review.",
          next_review_date: plusDays(4),
          summary: "Induction mostly complete. Probation review and PMVA refresh outstanding.",
          status: "in_progress",
        },
        {
          id: "on-2",
          staff_member: "Aimee Khan",
          stage: "Induction",
          next_step: "Complete final shadow shift and upload induction evidence.",
          next_review_date: plusDays(2),
          summary: "Safer recruitment complete. Final induction sign-off still needed.",
          status: "due_soon",
        },
      ],
    },
    checklistData: {
      items: [
        {
          id: "check-1",
          staff_member: "Ben Carter",
          check_name: "DBS",
          summary: "DBS completed and recorded.",
          status: "completed",
        },
        {
          id: "check-2",
          staff_member: "Ben Carter",
          check_name: "PMVA refresher",
          summary: "PMVA refresher still needs booking.",
          status: "pending",
        },
        {
          id: "check-3",
          staff_member: "Aimee Khan",
          check_name: "Shadow shifts",
          summary: "Final shadow shift still to be completed.",
          status: "in_progress",
        },
        {
          id: "check-4",
          staff_member: "Aimee Khan",
          check_name: "Policy sign-off",
          summary: "Policy read-and-sign checklist still incomplete.",
          status: "pending",
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: "train-1",
          staff_member: "Ben Carter",
          training_name: "PMVA",
          expiry_date: minusDays(2),
          summary: "PMVA expired and requires urgent rebooking.",
          status: "overdue",
        },
        {
          id: "train-2",
          staff_member: "Aimee Khan",
          training_name: "Safeguarding induction",
          expiry_date: plusDays(5),
          summary: "Safeguarding induction booked and awaiting attendance.",
          status: "booked",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "sup-1",
          staff_member: "Ben Carter",
          supervisor: "Sarah Ahmed",
          next_due_date: minusDays(5),
          summary: "Probation supervision overdue.",
          status: "overdue",
        },
        {
          id: "sup-2",
          staff_member: "Aimee Khan",
          supervisor: "Sarah Ahmed",
          next_due_date: plusDays(3),
          summary: "Initial induction supervision due this week.",
          status: "due_soon",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          staff_member: "Aimee Khan",
          check_name: "Reference 2",
          document_type: "Reference",
          review_date: plusDays(1),
          summary: "Second reference still awaiting upload.",
          status: "missing",
        },
        {
          id: "doc-2",
          staff_member: "Ben Carter",
          check_name: "Driving licence copy",
          document_type: "ID",
          review_date: plusDays(5),
          summary: "Updated ID copy required for completed file.",
          status: "review_due",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Book probation review",
          task: "Arrange and record Ben Carter probation review.",
          staff_member: "Ben Carter",
          due_date: plusDays(4),
          completed: false,
          status: "due_soon",
        },
        {
          id: "task-2",
          title: "Upload induction evidence",
          task: "Add signed induction checklist and certificates.",
          staff_member: "Aimee Khan",
          due_date: plusDays(2),
          completed: false,
          status: "warning",
        },
      ],
    },
  };
}

async function fetchOnboardingDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/onboarding`),
    apiGet(`/homes/${homeId}/onboarding-checklist`),
    apiGet(`/homes/${homeId}/training`),
    apiGet(`/homes/${homeId}/supervisions`),
    apiGet(`/homes/${homeId}/staff-documents`),
    apiGet(`/homes/${homeId}/staff-tasks`),
  ];

  const results = await Promise.allSettled(requests);
  const hasLiveSuccess = results.some((result) => result.status === "fulfilled");

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackOnboardingData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: {},
    onboardingData: results[0].status === "fulfilled" ? results[0].value : { items: [] },
    checklistData: results[1].status === "fulfilled" ? results[1].value : { items: [] },
    trainingData: results[2].status === "fulfilled" ? results[2].value : { items: [] },
    supervisionData: results[3].status === "fulfilled" ? results[3].value : { items: [] },
    documentData: results[4].status === "fulfilled" ? results[4].value : { items: [] },
    taskData: results[5].status === "fulfilled" ? results[5].value : { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">⬢</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before onboarding can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No onboarding context",
    nextEvent: "No review loaded",
    lastRecord: "No onboarding data",
    openActions: "No actions loaded",
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
    today: "Loading onboarding view",
    nextEvent: "Checking next review",
    lastRecord: "Loading latest onboarding activity",
    openActions: "Loading actions",
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
    nextEvent: "No review loaded",
    lastRecord: "No onboarding record loaded",
    openActions: "No actions loaded",
  });
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
      onboardingData,
      checklistData,
      trainingData,
      supervisionData,
      documentData,
      taskData,
      isFallback,
    } = await fetchOnboardingDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const onboardingItems = sortSoonestFirst(normaliseOnboardingItems(onboardingData), [
      "next_review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const checklistItems = sortNewestFirst(normaliseChecklistItems(checklistData), [
      "updated_at",
      "created_at",
    ]);

    const trainingItems = sortSoonestFirst(normaliseTrainingItems(trainingData), [
      "expiry_date",
      "updated_at",
      "created_at",
    ]);

    const supervisionItems = sortSoonestFirst(normaliseSupervisionItems(supervisionData), [
      "next_due_date",
      "updated_at",
      "created_at",
    ]);

    const documentItems = sortSoonestFirst(normaliseDocumentItems(documentData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const saferRecruitmentGaps = documentItems.filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const inductionGaps = onboardingItems.filter((item) =>
      ["pending", "in_progress", "due_soon", "warning"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const probationReviewsDue = onboardingItems.filter((item) =>
      /probation/i.test(String(item.stage || "")) &&
      ["pending", "in_progress", "due_soon", "warning"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const supervisionGaps = supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const openTasks = taskItems.filter((item) => !item.completed);

    const topStats = buildTopStats({
      onboardingItems,
      saferRecruitmentGaps,
      inductionGaps,
      probationReviewsDue,
      supervisionGaps,
      openTasks,
    });

    const progressCards = buildProgressCards({
      checklistItems,
      trainingItems,
      supervisionItems,
      onboardingItems,
    });

    const priorityItems = buildPriorityItems({
      saferRecruitmentGaps,
      inductionGaps,
      probationReviewsDue,
      supervisionGaps,
      openTasks,
    });

    const title =
      summary.title ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} onboarding`;

    els.viewContent.innerHTML = renderOnboardingHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      onboardingItems,
      saferRecruitmentGaps: saferRecruitmentGaps.slice(0, 6),
      inductionGaps: inductionGaps.slice(0, 6),
      probationReviewsDue: probationReviewsDue.slice(0, 6),
      supervisionGaps: supervisionGaps.slice(0, 6),
      openTasks: openTasks.slice(0, 8),
      isFallback,
    });

    const nextProbation = probationReviewsDue[0];
    const liveCount = onboardingItems.filter((item) =>
      ["pending", "in_progress", "due_soon", "warning"].includes(
        String(item.status || "").toLowerCase()
      )
    ).length;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${liveCount} live onboarding • preview mode`
        : `${liveCount} live onboarding • ${openTasks.length} open actions`,
      nextEvent: nextProbation?.next_review_date
        ? `Probation review ${formatDate(nextProbation.next_review_date)}`
        : "No immediate probation review loaded",
      lastRecord: onboardingItems[0]?.updated_at
        ? `Latest update ${formatDateTime(onboardingItems[0].updated_at)}`
        : isFallback
        ? "Preview onboarding data loaded"
        : "No recent onboarding update loaded",
      openActions: `${openTasks.length} open • ${saferRecruitmentGaps.length} recruitment gaps`,
    });
  } catch (error) {
    renderErrorState(error?.message || "The onboarding view could not be loaded.");
  }
}