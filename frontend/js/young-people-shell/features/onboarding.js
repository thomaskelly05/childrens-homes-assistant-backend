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
      "non_compliant",
      "rejected",
      "blocked",
      "unsafe",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "pending",
      "review_due",
      "incomplete",
      "awaiting",
      "attention",
      "in_progress",
      "at_risk",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "complete",
      "completed",
      "approved",
      "passed",
      "compliant",
      "active",
      "ok",
      "cleared",
      "signed_off",
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

function normaliseRecruitmentItems(data = {}) {
  return toArray(data.items, [data.recruitment, data.safer_recruitment, data.records]);
}

function normaliseInductionItems(data = {}) {
  return toArray(data.items, [data.inductions, data.induction, data.records]);
}

function normaliseProbationItems(data = {}) {
  return toArray(data.items, [data.probations, data.probation, data.records]);
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

function normaliseNotificationItems(data = {}) {
  return toArray(data.items, [data.notifications, data.records]);
}

function buildTopStats({
  onboardingItems = [],
  recruitmentItems = [],
  inductionItems = [],
  probationItems = [],
  trainingGaps = [],
  supervisionGaps = [],
}) {
  const liveOnboarding = onboardingItems.filter((item) =>
    ["pending", "in_progress", "review_due", "active", "due_soon"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const recruitmentGaps = recruitmentItems.filter((item) =>
    ["missing", "pending", "review_due", "failed", "awaiting"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const inductionGaps = inductionItems.filter((item) =>
    ["missing", "pending", "review_due", "incomplete", "due_soon"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const probationGaps = probationItems.filter((item) =>
    ["pending", "review_due", "overdue", "incomplete"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  return [
    {
      label: "Live onboarding",
      value: liveOnboarding,
      note: "New starters or incomplete starters",
      tone: liveOnboarding ? "warning" : "muted",
    },
    {
      label: "Recruitment gaps",
      value: recruitmentGaps,
      note: "Safer recruitment checks missing or pending",
      tone: recruitmentGaps ? "danger" : "success",
    },
    {
      label: "Induction gaps",
      value: inductionGaps,
      note: "Induction items incomplete",
      tone: inductionGaps ? "warning" : "success",
    },
    {
      label: "Probation due",
      value: probationGaps,
      note: "Probation reviews needing action",
      tone: probationGaps ? "warning" : "success",
    },
    {
      label: "Training gaps",
      value: trainingGaps.length,
      note: "Mandatory training due or overdue",
      tone: trainingGaps.length ? "warning" : "success",
    },
    {
      label: "Supervision start gaps",
      value: supervisionGaps.length,
      note: "Early oversight needing booking",
      tone: supervisionGaps.length ? "warning" : "success",
    },
  ];
}

function buildKpis({
  recruitmentItems = [],
  inductionItems = [],
  probationItems = [],
  trainingItems = [],
  supervisionItems = [],
}) {
  const clearedRecruitment = recruitmentItems.filter((item) =>
    ["approved", "complete", "completed", "passed", "cleared"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const recruitmentPercent =
    recruitmentItems.length > 0
      ? Math.round((clearedRecruitment / recruitmentItems.length) * 100)
      : 0;

  const completedInduction = inductionItems.filter((item) =>
    ["complete", "completed", "signed_off"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const inductionPercent =
    inductionItems.length > 0
      ? Math.round((completedInduction / inductionItems.length) * 100)
      : 0;

  const completedProbation = probationItems.filter((item) =>
    ["complete", "completed", "signed_off"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const probationPercent =
    probationItems.length > 0
      ? Math.round((completedProbation / probationItems.length) * 100)
      : 0;

  const compliantTraining = trainingItems.filter((item) =>
    ["complete", "completed", "passed", "up_to_date"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const trainingPercent =
    trainingItems.length > 0
      ? Math.round((compliantTraining / trainingItems.length) * 100)
      : 0;

  const completedSupervision = supervisionItems.filter((item) =>
    ["complete", "completed", "done", "booked"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const supervisionPercent =
    supervisionItems.length > 0
      ? Math.round((completedSupervision / supervisionItems.length) * 100)
      : 0;

  return [
    {
      label: "Safer recruitment",
      value: `${recruitmentPercent}%`,
      percent: recruitmentPercent,
      tone:
        recruitmentPercent >= 95
          ? "success"
          : recruitmentPercent >= 80
          ? "warning"
          : "danger",
    },
    {
      label: "Induction completion",
      value: `${inductionPercent}%`,
      percent: inductionPercent,
      tone:
        inductionPercent >= 90
          ? "success"
          : inductionPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Probation completion",
      value: `${probationPercent}%`,
      percent: probationPercent,
      tone:
        probationPercent >= 90
          ? "success"
          : probationPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Training readiness",
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
      label: "Supervision start",
      value: `${supervisionPercent}%`,
      percent: supervisionPercent,
      tone:
        supervisionPercent >= 90
          ? "success"
          : supervisionPercent >= 70
          ? "warning"
          : "danger",
    },
  ];
}

function buildPriorityItems({
  recruitmentGaps = [],
  inductionGaps = [],
  probationGaps = [],
  trainingGaps = [],
  supervisionGaps = [],
  tasks = [],
}) {
  const items = [];

  recruitmentGaps.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.candidate_name || "Recruitment gap",
      summary:
        item.summary ||
        item.notes ||
        item.check_name ||
        "Safer recruitment evidence is incomplete.",
    });
  });

  inductionGaps.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Induction gap",
      summary:
        item.summary ||
        item.next_step ||
        "Induction requires completion or sign-off.",
    });
  });

  probationGaps.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Probation review due",
      summary: item.review_date
        ? `Review due ${formatDate(item.review_date)}`
        : "Probation checkpoint requires action.",
    });
  });

  trainingGaps.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || item.training_name || "Training gap",
      summary: item.expiry_date
        ? `Training due ${formatDate(item.expiry_date)}`
        : "Mandatory training requires attention.",
    });
  });

  supervisionGaps.slice(0, 1).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision start gap",
      summary: item.next_due_date
        ? `Supervision due ${formatDate(item.next_due_date)}`
        : "Initial supervision is not yet booked or recorded.",
    });
  });

  tasks.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || "Onboarding action",
      summary:
        item.task ||
        item.summary ||
        "Onboarding or recruitment task requires completion.",
    });
  });

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
            item?.staff_member ||
            item?.candidate_name ||
            item?.check_name ||
            item?.training_name ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.next_step ||
            item?.requirement ||
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
        <p>No urgent onboarding risks are showing right now.</p>
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
  title = "Onboarding and induction",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  recruitmentItems = [],
  inductionItems = [],
  probationItems = [],
  trainingGaps = [],
  supervisionGaps = [],
  taskItems = [],
  notificationItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Onboarding</div>
          <h2>${safeText(title)}</h2>
          <p>A safer recruitment, induction and probation view aligned to workforce suitability, training, supervision and readiness.</p>
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
          <h3>Onboarding readiness</h3>
          <p>A quick visual read across recruitment checks, induction, probation, training and supervision start.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Safer recruitment checks</h3>
              <p>Identity, references, DBS, right to work, health declarations and suitability evidence.</p>
            </div>

            ${renderRows(recruitmentItems, {
              emptyMessage: "No recruitment checks found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "onboarding",
              metaBuilder: (item) =>
                [
                  item.check_name || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                  item.completed_at ? `Completed ${formatDate(item.completed_at)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Induction</h3>
              <p>Core induction steps, policy familiarisation, shadow shifts, safeguarding, medication and practice readiness.</p>
            </div>

            ${renderRows(inductionItems, {
              emptyMessage: "No induction records found.",
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
              <h3>Probation</h3>
              <p>Early review points, supervision checkpoints and confirmation of suitability in post.</p>
            </div>

            ${renderRows(probationItems, {
              emptyMessage: "No probation records found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "onboarding",
              metaBuilder: (item) =>
                [
                  item.stage || "Probation",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                  item.line_manager || "",
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
              <p>The highest priority onboarding and safer recruitment risks.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Training gaps</h3>
              <p>Mandatory learning due, overdue or incomplete.</p>
            </div>

            ${renderRows(trainingGaps, {
              emptyMessage: "No onboarding training gaps found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "training",
              metaBuilder: (item) =>
                [
                  item.training_name || "",
                  item.expiry_date ? `Due ${formatDate(item.expiry_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Supervision start</h3>
              <p>Initial supervision and support arrangements needing action.</p>
            </div>

            ${renderRows(supervisionGaps, {
              emptyMessage: "No supervision start gaps found.",
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

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Tasks and notifications</h3>
              <p>Reminders and actions for managers and staff.</p>
            </div>

            ${renderRows(
              [...taskItems.slice(0, 4), ...notificationItems.slice(0, 4)],
              {
                emptyMessage: "No onboarding actions or reminders found.",
                titleKey: "title",
                summaryKey: "summary",
                recordType: "notification",
                metaBuilder: (item) =>
                  [
                    item.staff_member || item.recipient_name || "",
                    item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                    item.created_at ? formatDateTime(item.created_at) : "",
                  ]
                    .filter(Boolean)
                    .join(" • "),
              }
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function buildFallbackData(homeId) {
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
        title: "Onboarding and induction",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    onboardingData: {
      items: [
        {
          id: "onboarding-1",
          staff_member: "Ben Carter",
          stage: "Onboarding",
          next_step: "Complete medication induction and final shadow shift.",
          next_review_date: plusDays(3),
          summary: "New starter with most recruitment checks complete. Final practice sign-off still needed.",
          status: "in_progress",
        },
        {
          id: "onboarding-2",
          staff_member: "Aimee Khan",
          stage: "Induction",
          next_step: "Upload signed induction checklist and policy read log.",
          next_review_date: plusDays(2),
          summary: "Core induction progressing but evidence upload remains incomplete.",
          status: "due_soon",
        },
      ],
    },
    recruitmentData: {
      items: [
        {
          id: "recruitment-1",
          staff_member: "Ben Carter",
          check_name: "Reference check 2",
          review_date: plusDays(1),
          summary: "Second reference still awaiting upload to safer recruitment file.",
          status: "missing",
        },
        {
          id: "recruitment-2",
          staff_member: "Aimee Khan",
          check_name: "Right to work verification",
          completed_at: minusDays(3),
          summary: "Right to work documents reviewed and verified.",
          status: "cleared",
        },
        {
          id: "recruitment-3",
          staff_member: "Ben Carter",
          check_name: "DBS confirmation",
          completed_at: minusDays(12),
          summary: "Enhanced DBS cleared and recorded.",
          status: "cleared",
        },
      ],
    },
    inductionData: {
      items: [
        {
          id: "induction-1",
          staff_member: "Ben Carter",
          stage: "Practice induction",
          next_step: "Manager sign-off after final shadow shift.",
          next_review_date: plusDays(4),
          summary: "Medication and behaviour support induction still incomplete.",
          status: "review_due",
        },
        {
          id: "induction-2",
          staff_member: "Aimee Khan",
          stage: "Core induction",
          next_step: "Confirm safeguarding and whistleblowing discussion.",
          next_review_date: plusDays(2),
          summary: "Policy familiarisation nearly complete.",
          status: "in_progress",
        },
      ],
    },
    probationData: {
      items: [
        {
          id: "probation-1",
          staff_member: "Ben Carter",
          stage: "8-week review",
          review_date: plusDays(5),
          line_manager: "Sarah Ahmed",
          summary: "Probation review to confirm progress, competence and support needs.",
          status: "due_soon",
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: "training-1",
          staff_member: "Ben Carter",
          training_name: "PMVA",
          expiry_date: minusDays(1),
          summary: "PMVA is overdue and must be booked before lone deployment.",
          status: "overdue",
        },
        {
          id: "training-2",
          staff_member: "Aimee Khan",
          training_name: "Safeguarding",
          expiry_date: plusDays(7),
          summary: "Safeguarding refresher due this week.",
          status: "due_soon",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "supervision-1",
          staff_member: "Ben Carter",
          supervisor: "Sarah Ahmed",
          next_due_date: plusDays(4),
          summary: "Initial supervision still needs booking.",
          status: "due_soon",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Book initial supervision",
          task: "Arrange and record Ben Carter initial supervision.",
          staff_member: "Ben Carter",
          due_date: plusDays(4),
          completed: false,
          status: "due_soon",
        },
        {
          id: "task-2",
          title: "Upload induction evidence",
          task: "Add signed induction checklist and safer recruitment file evidence.",
          staff_member: "Aimee Khan",
          due_date: plusDays(2),
          completed: false,
          status: "warning",
        },
      ],
    },
    notificationData: {
      items: [
        {
          id: "notification-1",
          title: "Probation checkpoint due",
          recipient_name: "Sarah Ahmed",
          summary: "Ben Carter probation review is due this week.",
          created_at: minusDays(1),
          status: "attention",
        },
      ],
    },
  };
}

async function fetchOnboardingDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/onboarding`),
    apiGet(`/homes/${homeId}/safer-recruitment`),
    apiGet(`/homes/${homeId}/inductions`),
    apiGet(`/homes/${homeId}/probations`),
    apiGet(`/homes/${homeId}/training`),
    apiGet(`/homes/${homeId}/supervisions`),
    apiGet(`/homes/${homeId}/staff-tasks`),
    apiGet(`/homes/${homeId}/notifications`),
  ];

  const results = await Promise.allSettled(requests);
  const hasLiveSuccess = results.some((result) => result.status === "fulfilled");

  if (!hasLiveSuccess) {
    return {
      ...buildFallbackData(homeId),
      isFallback: true,
    };
  }

  return {
    summaryData: {},
    onboardingData: results[0].status === "fulfilled" ? results[0].value : { items: [] },
    recruitmentData: results[1].status === "fulfilled" ? results[1].value : { items: [] },
    inductionData: results[2].status === "fulfilled" ? results[2].value : { items: [] },
    probationData: results[3].status === "fulfilled" ? results[3].value : { items: [] },
    trainingData: results[4].status === "fulfilled" ? results[4].value : { items: [] },
    supervisionData: results[5].status === "fulfilled" ? results[5].value : { items: [] },
    taskData: results[6].status === "fulfilled" ? results[6].value : { items: [] },
    notificationData: results[7].status === "fulfilled" ? results[7].value : { items: [] },
    isFallback: false,
  };
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
    nextEvent: "No review loaded",
    lastRecord: "No onboarding record loaded",
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
    today: "Loading onboarding view",
    nextEvent: "Checking next review date",
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
    nextEvent: "No event loaded",
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
      recruitmentData,
      inductionData,
      probationData,
      trainingData,
      supervisionData,
      taskData,
      notificationData,
      isFallback,
    } = await fetchOnboardingDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const onboardingItems = sortSoonestFirst(normaliseOnboardingItems(onboardingData), [
      "next_review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const recruitmentItems = sortSoonestFirst(normaliseRecruitmentItems(recruitmentData), [
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const inductionItems = sortSoonestFirst(normaliseInductionItems(inductionData), [
      "next_review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const probationItems = sortSoonestFirst(normaliseProbationItems(probationData), [
      "review_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

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

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]);

    const notificationItems = sortNewestFirst(normaliseNotificationItems(notificationData), [
      "created_at",
      "updated_at",
    ]).slice(0, 6);

    const recruitmentGaps = recruitmentItems.filter((item) =>
      ["missing", "pending", "review_due", "failed", "awaiting"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const inductionGaps = inductionItems.filter((item) =>
      ["pending", "review_due", "incomplete", "due_soon", "in_progress"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const probationGaps = probationItems.filter((item) =>
      ["pending", "review_due", "overdue", "incomplete", "due_soon"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const trainingGaps = trainingItems.filter((item) =>
      ["due_soon", "overdue", "expired", "expiring", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const supervisionGaps = supervisionItems.filter((item) =>
      ["due", "due_soon", "overdue", "review_due", "pending"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const openTasks = taskItems.filter((item) => !item.completed);

    const topStats = buildTopStats({
      onboardingItems,
      recruitmentItems,
      inductionItems,
      probationItems,
      trainingGaps,
      supervisionGaps,
    });

    const progressCards = buildKpis({
      recruitmentItems,
      inductionItems,
      probationItems,
      trainingItems,
      supervisionItems,
    });

    const priorityItems = buildPriorityItems({
      recruitmentGaps,
      inductionGaps,
      probationGaps,
      trainingGaps,
      supervisionGaps,
      tasks: openTasks,
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
      recruitmentItems,
      inductionItems,
      probationItems,
      trainingGaps: trainingGaps.slice(0, 6),
      supervisionGaps: supervisionGaps.slice(0, 6),
      taskItems: openTasks.slice(0, 6),
      notificationItems,
      isFallback,
    });

    const nextProbation = probationGaps[0];
    const latestNotification = notificationItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${onboardingItems.length} live onboarding • preview mode`
        : `${onboardingItems.length} live onboarding • ${openTasks.length} open actions`,
      nextEvent: nextProbation?.review_date
        ? `Probation due ${formatDate(nextProbation.review_date)}`
        : "No immediate review loaded",
      lastRecord: latestNotification?.created_at
        ? `Latest reminder ${formatDateTime(latestNotification.created_at)}`
        : isFallback
        ? "Preview onboarding data loaded"
        : "No recent onboarding activity loaded",
      openActions: `${openTasks.length} open • ${recruitmentGaps.length} recruitment gaps`,
    });
  } catch (error) {
    renderErrorState(error?.message || "The onboarding view could not be loaded.");
  }
}