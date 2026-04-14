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
      "absent",
      "sick",
      "off",
      "vacant",
      "vacancy",
      "critical",
      "escalated",
      "overdue",
      "missing",
      "non_compliant",
      "failed",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "warning",
      "agency",
      "limited",
      "training_due",
      "probation",
      "attention",
      "due_soon",
      "in_progress",
      "review_due",
      "induction",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "active",
      "on_shift",
      "available",
      "confirmed",
      "good",
      "compliant",
      "complete",
      "completed",
      "up_to_date",
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
  return data.summary || data.team_summary || data.dashboard || data || {};
}

function normaliseStaffItems(data = {}) {
  return toArray(data.items, [data.staff, data.team, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "staff_profile",
    full_name:
      item.full_name ||
      item.staff_member ||
      item.name ||
      item.title ||
      "Staff member",
    staff_member:
      item.staff_member ||
      item.full_name ||
      item.name ||
      "Staff member",
    role: item.role || item.job_title || "",
    line_manager: item.line_manager || item.manager || "",
    employment_status: item.employment_status || item.status || "active",
    rota_status: item.rota_status || "",
    onboarding_status: item.onboarding_status || "",
    training_status: item.training_status || "",
    supervision_status: item.supervision_status || "",
    document_status: item.document_status || "",
    start_date: item.start_date || null,
    next_shift_start: item.next_shift_start || null,
    summary:
      item.summary ||
      item.profile_summary ||
      item.notes ||
      "Staff profile recorded.",
    updated_at: item.updated_at || null,
    created_at: item.created_at || null,
  }));
}

function normaliseOnboardingItems(data = {}) {
  return toArray(data.items, [data.onboarding, data.records]);
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]);
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]);
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]);
}

function normaliseNotificationItems(data = {}) {
  return toArray(data.items, [data.notifications, data.records]);
}

function buildStats({
  staffItems = [],
  onboardingItems = [],
  trainingItems = [],
  supervisionItems = [],
  documentItems = [],
}) {
  const active = staffItems.filter((item) =>
    ["active", "available", "on_shift"].includes(
      String(item.employment_status || "").toLowerCase()
    )
  ).length;

  const onboarding = onboardingItems.filter((item) =>
    ["pending", "in_progress", "due_soon", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const trainingGaps = trainingItems.filter((item) =>
    ["due_soon", "overdue", "expired", "incomplete"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const supervisionGaps = supervisionItems.filter((item) =>
    ["due", "due_soon", "overdue", "review_due"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const documentGaps = documentItems.filter((item) =>
    ["missing", "review_due", "due_soon", "overdue", "incomplete"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const agency = staffItems.filter((item) =>
    ["agency"].includes(String(item.employment_status || "").toLowerCase())
  ).length;

  return {
    total: staffItems.length,
    active,
    onboarding,
    trainingGaps,
    supervisionGaps,
    documentGaps,
    agency,
  };
}

function buildPriorityItems({
  staffItems = [],
  onboardingItems = [],
  trainingItems = [],
  supervisionItems = [],
  documentItems = [],
  notifications = [],
}) {
  const items = [];

  onboardingItems
    .filter((item) =>
      ["pending", "in_progress", "due_soon", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Onboarding gap",
        summary:
          item.summary ||
          item.next_step ||
          "Onboarding or induction still needs completion.",
      });
    });

  trainingItems
    .filter((item) =>
      ["due_soon", "overdue", "expired", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || item.training_name || "Training gap",
        summary:
          item.summary ||
          (item.expiry_date
            ? `${item.training_name || "Training"} due ${formatDate(item.expiry_date)}`
            : "Mandatory training needs action."),
      });
    });

  supervisionItems
    .filter((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Supervision due",
        summary:
          item.summary ||
          (item.next_due_date
            ? `Supervision due ${formatDate(item.next_due_date)}`
            : "Supervision requires action."),
      });
    });

  documentItems
    .filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || item.document_type || "Document gap",
        summary:
          item.summary ||
          item.notes ||
          "Important workforce documentation is incomplete.",
      });
    });

  notifications
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Notification",
        summary: item.summary || item.message || "Workforce action needs attention.",
      });
    });

  staffItems
    .filter((item) =>
      ["vacant", "vacancy", "sick", "absent", "agency"].includes(
        String(item.employment_status || "").toLowerCase()
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.staff_member || "Staffing pressure",
        summary:
          item.summary ||
          `${item.role || "Post"} is showing workforce pressure.`,
      });
    });

  return items.slice(0, 8);
}

function renderEmptyState(message = "No workforce data available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◍</div>
        <h3>No workforce data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCards(stats) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      <article class="overview-stat-card">
        <span class="overview-stat-label">Staff profiles</span>
        <strong class="overview-stat-value">${safeText(stats.total)}</strong>
        <span class="overview-stat-note">Live workforce profiles</span>
      </article>

      <article class="overview-stat-card ${
        stats.active > 0 ? "overview-stat-card--success" : ""
      }">
        <span class="overview-stat-label">Active staff</span>
        <strong class="overview-stat-value">${safeText(stats.active)}</strong>
        <span class="overview-stat-note">Currently in active employment</span>
      </article>

      <article class="overview-stat-card ${
        stats.onboarding > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Onboarding live</span>
        <strong class="overview-stat-value">${safeText(stats.onboarding)}</strong>
        <span class="overview-stat-note">Induction or probation underway</span>
      </article>

      <article class="overview-stat-card ${
        stats.trainingGaps > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Training gaps</span>
        <strong class="overview-stat-value">${safeText(stats.trainingGaps)}</strong>
        <span class="overview-stat-note">Mandatory learning due</span>
      </article>

      <article class="overview-stat-card ${
        stats.supervisionGaps > 0 ? "overview-stat-card--warning" : ""
      }">
        <span class="overview-stat-label">Supervision due</span>
        <strong class="overview-stat-value">${safeText(stats.supervisionGaps)}</strong>
        <span class="overview-stat-note">Oversight needing action</span>
      </article>

      <article class="overview-stat-card ${
        stats.documentGaps > 0 ? "overview-stat-card--danger" : ""
      }">
        <span class="overview-stat-label">Document gaps</span>
        <strong class="overview-stat-value">${safeText(stats.documentGaps)}</strong>
        <span class="overview-stat-note">File evidence incomplete</span>
      </article>
    </div>
  `;
}

function renderRecordRows(items = [], options = {}) {
  const {
    emptyMessage = "No records found.",
    titleBuilder = null,
    summaryBuilder = null,
    metaBuilder = null,
    statusBuilder = null,
    recordType = "",
  } = options;

  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title = titleBuilder
            ? titleBuilder(item)
            : item.full_name || item.staff_member || item.title || "Record";

          const summary = summaryBuilder
            ? summaryBuilder(item)
            : item.summary || "Record available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : [
                item.role || "",
                item.updated_at ? formatDateTime(item.updated_at) : "",
              ]
                .filter(Boolean)
                .join(" • ");

          const rawStatus = statusBuilder
            ? statusBuilder(item)
            : item.status ||
              item.employment_status ||
              item.onboarding_status ||
              item.training_status ||
              item.supervision_status ||
              item.document_status ||
              "recorded";

          const tone = getStatusTone(rawStatus);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item.record_type || "staff_profile")}"
              data-title="${safeText(title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(rawStatus)}</span>
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
        <p>No urgent workforce issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Workforce item")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTeamPage({
  stats,
  staffItems,
  onboardingItems,
  trainingItems,
  supervisionItems,
  documentItems,
  priorityItems,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--home">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Team and workforce</div>
          <h2>Team and staffing</h2>
          <p>A workforce view across staff profiles, onboarding, training, supervision, documentation and readiness for deployment.</p>
        </div>
      </div>

      ${renderStatCards(stats)}

      <div class="overview-grid">
        <section class="overview-main">
          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Staff profiles</h3>
              <p>Current staff records with role, line manager, employment status and readiness context.</p>
            </div>

            ${renderRecordRows(staffItems, {
              emptyMessage: "No staff profiles found.",
              recordType: "staff_profile",
              titleBuilder: (item) => item.full_name || item.staff_member || "Staff member",
              summaryBuilder: (item) =>
                item.summary || "Staff profile recorded.",
              metaBuilder: (item) =>
                [
                  item.role || "",
                  item.line_manager ? `Manager: ${item.line_manager}` : "",
                  item.start_date ? `Started ${formatDate(item.start_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.employment_status || "active",
            })}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Onboarding and induction</h3>
              <p>Staff still moving through recruitment, induction or probation.</p>
            </div>

            ${renderRecordRows(onboardingItems.slice(0, 8), {
              emptyMessage: "No onboarding items found.",
              recordType: "onboarding",
              titleBuilder: (item) => item.staff_member || "Onboarding item",
              summaryBuilder: (item) =>
                item.summary || item.next_step || "Onboarding in progress.",
              metaBuilder: (item) =>
                [
                  item.stage || "",
                  item.next_review_date ? `Review ${formatDate(item.next_review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.status || "in_progress",
            })}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Training and supervision</h3>
              <p>Practice readiness through mandatory learning and structured oversight.</p>
            </div>

            ${renderRecordRows(
              [...trainingItems.slice(0, 4), ...supervisionItems.slice(0, 4)],
              {
                emptyMessage: "No training or supervision items found.",
                recordType: "workforce_readiness",
                titleBuilder: (item) =>
                  item.staff_member || item.training_name || "Workforce item",
                summaryBuilder: (item) =>
                  item.summary || "Workforce readiness item recorded.",
                metaBuilder: (item) =>
                  [
                    item.training_name || "",
                    item.supervisor || "",
                    item.expiry_date ? `Due ${formatDate(item.expiry_date)}` : "",
                    item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • "),
                statusBuilder: (item) => item.status || "recorded",
              }
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important workforce issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Document readiness</h3>
              <p>Employment file evidence, suitability documents and missing checks.</p>
            </div>

            ${renderRecordRows(documentItems.slice(0, 8), {
              emptyMessage: "No document readiness issues found.",
              recordType: "staff_document",
              titleBuilder: (item) =>
                item.staff_member || item.document_type || "Document item",
              summaryBuilder: (item) =>
                item.summary || item.notes || "Document readiness item recorded.",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
              statusBuilder: (item) => item.status || "recorded",
            })}
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
        title: "Team and staffing",
        home_name:
          state.currentUser?.home_name ||
          state.currentUser?.homeName ||
          `Home ${homeId}`,
      },
    },
    staffData: {
      items: [
        {
          id: "staff-1",
          full_name: "Sarah Ahmed",
          staff_member: "Sarah Ahmed",
          role: "Deputy manager",
          line_manager: "Tom Kelly",
          employment_status: "active",
          start_date: minusDays(340),
          summary: "Leads day-to-day operational oversight and staff support.",
        },
        {
          id: "staff-2",
          full_name: "Ben Carter",
          staff_member: "Ben Carter",
          role: "Senior residential worker",
          line_manager: "Sarah Ahmed",
          employment_status: "probation",
          start_date: minusDays(50),
          summary: "In probation. Final induction sign-off and supervision still needed.",
        },
        {
          id: "staff-3",
          full_name: "Lena Morris",
          staff_member: "Lena Morris",
          role: "Residential worker",
          line_manager: "Sarah Ahmed",
          employment_status: "active",
          start_date: minusDays(180),
          summary: "Keyworker with training refresh due shortly.",
        },
        {
          id: "staff-4",
          full_name: "Agency cover worker",
          staff_member: "Agency cover worker",
          role: "Agency worker",
          line_manager: "Sarah Ahmed",
          employment_status: "agency",
          start_date: minusDays(8),
          summary: "Currently filling rota pressure on waking nights.",
        },
      ],
    },
    onboardingData: {
      items: [
        {
          id: "on-1",
          staff_member: "Ben Carter",
          stage: "Probation",
          next_review_date: plusDays(5),
          summary: "Probation review due this week.",
          status: "due_soon",
        },
      ],
    },
    trainingData: {
      items: [
        {
          id: "tr-1",
          staff_member: "Lena Morris",
          training_name: "Safeguarding refresher",
          expiry_date: plusDays(6),
          summary: "Safeguarding refresher due this week.",
          status: "due_soon",
        },
        {
          id: "tr-2",
          staff_member: "Ben Carter",
          training_name: "PMVA",
          expiry_date: minusDays(1),
          summary: "PMVA expired and requires urgent rebooking.",
          status: "overdue",
        },
      ],
    },
    supervisionData: {
      items: [
        {
          id: "sup-1",
          staff_member: "Ben Carter",
          supervisor: "Sarah Ahmed",
          next_due_date: minusDays(3),
          summary: "Probation supervision overdue.",
          status: "overdue",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          staff_member: "Ben Carter",
          document_type: "Driving licence",
          review_date: plusDays(4),
          summary: "Updated ID copy still needed on file.",
          status: "review_due",
        },
        {
          id: "doc-2",
          staff_member: "Agency cover worker",
          document_type: "Agency file confirmation",
          review_date: plusDays(1),
          summary: "Suitability confirmation from agency required.",
          status: "missing",
        },
      ],
    },
    notificationData: {
      items: [
        {
          id: "note-1",
          title: "Probation review due",
          summary: "Ben Carter probation review is due this week.",
        },
      ],
    },
  };
}

async function fetchDataset(homeId) {
  const requests = [
    apiGet(`/homes/${homeId}/staff`),
    apiGet(`/homes/${homeId}/onboarding`),
    apiGet(`/homes/${homeId}/training`),
    apiGet(`/homes/${homeId}/supervisions`),
    apiGet(`/homes/${homeId}/staff-documents`),
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
    staffData: results[0].status === "fulfilled" ? results[0].value : { items: [] },
    onboardingData: results[1].status === "fulfilled" ? results[1].value : { items: [] },
    trainingData: results[2].status === "fulfilled" ? results[2].value : { items: [] },
    supervisionData: results[3].status === "fulfilled" ? results[3].value : { items: [] },
    documentData: results[4].status === "fulfilled" ? results[4].value : { items: [] },
    notificationData: results[5].status === "fulfilled" ? results[5].value : { items: [] },
    isFallback: false,
  };
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before team records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No team context",
    nextEvent: "No staffing view loaded",
    lastRecord: "No team data",
    openActions: "No staffing actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading team…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading workforce view",
    nextEvent: "Checking reviews",
    lastRecord: "Loading latest workforce record",
    openActions: "Loading actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load team data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Team unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No workforce data",
    openActions: "Check API routes",
  });
}

export async function loadTeam() {
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
      staffData,
      onboardingData,
      trainingData,
      supervisionData,
      documentData,
      notificationData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);
    const staffItems = sortNewestFirst(normaliseStaffItems(staffData), [
      "updated_at",
      "created_at",
      "start_date",
    ]).slice(0, 12);

    const onboardingItems = sortSoonestFirst(normaliseOnboardingItems(onboardingData), [
      "next_review_date",
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

    const notifications = sortNewestFirst(normaliseNotificationItems(notificationData), [
      "created_at",
      "updated_at",
    ]);

    const stats = buildStats({
      staffItems,
      onboardingItems,
      trainingItems,
      supervisionItems,
      documentItems,
    });

    const priorityItems = buildPriorityItems({
      staffItems,
      onboardingItems,
      trainingItems,
      supervisionItems,
      documentItems,
      notifications,
    });

    els.viewContent.innerHTML = renderTeamPage({
      stats,
      staffItems,
      onboardingItems,
      trainingItems,
      supervisionItems,
      documentItems,
      priorityItems,
      isFallback,
      title:
        summary.title ||
        state.currentUser?.home_name ||
        state.currentUser?.homeName ||
        `Home ${homeId} workforce`,
    });

    const nextSupervision = supervisionItems.find((item) =>
      ["due", "due_soon", "overdue", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const latestProfile = staffItems[0];

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${toNumber(stats.total)} staff • preview mode`
        : `${toNumber(stats.total)} staff • ${toNumber(stats.active)} active`,
      nextEvent: nextSupervision?.next_due_date
        ? `Supervision due ${formatDate(nextSupervision.next_due_date)}`
        : "No immediate workforce review",
      lastRecord: latestProfile?.updated_at || latestProfile?.created_at || latestProfile?.start_date
        ? `Latest profile ${formatDateTime(
            latestProfile.updated_at ||
              latestProfile.created_at ||
              latestProfile.start_date
          )}`
        : isFallback
        ? "Preview workforce data loaded"
        : "No recent workforce record",
      openActions: `${toNumber(stats.trainingGaps)} training • ${toNumber(
        stats.documentGaps
      )} file gaps`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load team data.");
  }
}