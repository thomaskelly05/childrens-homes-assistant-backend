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
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "high",
      "critical",
      "rejected",
      "withdrawn",
      "declined",
      "failed",
      "cancelled",
      "blocked",
      "overdue",
      "missing",
      "at_risk",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "pending",
      "under_consideration",
      "in_progress",
      "awaiting_information",
      "awaiting_decision",
      "planned",
      "matching",
      "review_due",
      "due_soon",
      "warning",
      "shortlist",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "accepted",
      "approved",
      "active",
      "placed",
      "admitted",
      "completed",
      "current",
      "good",
      "confirmed",
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
  if (Array.isArray(data.admissions) && data.admissions.length > 0) return true;
  if (Array.isArray(data.referrals) && data.referrals.length > 0) return true;
  if (Array.isArray(data.transitions) && data.transitions.length > 0) return true;
  if (Array.isArray(data.documents) && data.documents.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (Array.isArray(data.placements) && data.placements.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.admissions_summary && typeof data.admissions_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.admissions_summary || data.dashboard || data || {};
}

function normaliseAdmissionItems(data = {}) {
  return toArray(data.items, [data.admissions, data.placements, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "admission",
      title:
        item.title ||
        item.young_person_name ||
        item.child_name ||
        "Admission",
      young_person_name:
        item.young_person_name ||
        item.child_name ||
        item.full_name ||
        "Young person",
      referral_source: item.referral_source || item.local_authority || "",
      status: item.status || "under_consideration",
      placement_type: item.placement_type || "",
      referral_date: item.referral_date || item.created_at || null,
      planned_admission_date:
        item.planned_admission_date || item.admission_date || null,
      admission_date: item.admission_date || null,
      summary:
        item.summary ||
        item.notes ||
        item.reason_for_placement ||
        "Admission record.",
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
}

function normaliseReferralItems(data = {}) {
  return toArray(data.items, [data.referrals, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "referral",
    title:
      item.title ||
      item.young_person_name ||
      item.child_name ||
      "Referral",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.full_name ||
      "Young person",
    local_authority: item.local_authority || item.referral_source || "",
    status: item.status || "pending",
    referral_date: item.referral_date || item.created_at || null,
    decision_due_date: item.decision_due_date || null,
    summary:
      item.summary ||
      item.notes ||
      item.reason ||
      "Referral record.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTransitionItems(data = {}) {
  return toArray(data.items, [data.transitions, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "transition",
    title:
      item.title ||
      item.young_person_name ||
      item.child_name ||
      "Transition",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.full_name ||
      "Young person",
    status: item.status || "planned",
    move_date: item.move_date || item.planned_admission_date || null,
    stage: item.stage || "",
    summary:
      item.summary ||
      item.notes ||
      item.transition_plan ||
      "Transition record.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "document",
    title: item.title || item.document_type || "Admission document",
    document_type: item.document_type || item.type || "",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.full_name ||
      "",
    status: item.status || "active",
    review_date: item.review_date || item.due_date || null,
    summary:
      item.summary ||
      item.notes ||
      "Admission document record.",
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
      "Admission task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  admissionItems = [],
  referralItems = [],
  transitionItems = [],
  documentItems = [],
  openTasks = [],
}) {
  const liveAdmissions = admissionItems.filter((item) =>
    ["accepted", "approved", "active", "placed", "admitted"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const activeReferrals = referralItems.filter((item) =>
    !["accepted", "rejected", "withdrawn", "declined", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const liveTransitions = transitionItems.filter((item) =>
    ["planned", "in_progress", "matching", "due_soon"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const documentGaps = documentItems.filter((item) =>
    ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Active referrals",
      value: activeReferrals,
      note: "Referrals still in progress",
      tone: activeReferrals ? "muted" : "success",
    },
    {
      label: "Admissions live",
      value: liveAdmissions,
      note: "Accepted or admitted placements",
      tone: liveAdmissions ? "success" : "muted",
    },
    {
      label: "Transitions active",
      value: liveTransitions,
      note: "Move-in planning underway",
      tone: liveTransitions ? "warning" : "success",
    },
    {
      label: "Document gaps",
      value: documentGaps,
      note: "Placement paperwork needing action",
      tone: documentGaps ? "danger" : "success",
    },
    {
      label: "Open tasks",
      value: openTasks.length,
      note: "Outstanding admission actions",
      tone: openTasks.length ? "warning" : "success",
    },
    {
      label: "All records",
      value: admissionItems.length + referralItems.length + transitionItems.length,
      note: "Admissions workflow records loaded",
      tone: "muted",
    },
  ];
}

function buildProgressCards({
  referralItems = [],
  admissionItems = [],
  transitionItems = [],
  documentItems = [],
}) {
  const acceptedReferrals = referralItems.filter((item) =>
    ["accepted", "approved", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const referralPercent = referralItems.length
    ? Math.round((acceptedReferrals / referralItems.length) * 100)
    : 0;

  const settledAdmissions = admissionItems.filter((item) =>
    ["admitted", "active", "placed", "completed"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const admissionPercent = admissionItems.length
    ? Math.round((settledAdmissions / admissionItems.length) * 100)
    : 0;

  const onTrackTransitions = transitionItems.filter((item) =>
    ["planned", "completed", "active", "good"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const transitionPercent = transitionItems.length
    ? Math.round((onTrackTransitions / transitionItems.length) * 100)
    : 0;

  const compliantDocs = documentItems.filter((item) =>
    ["active", "valid", "current", "reviewed", "compliant"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const documentPercent = documentItems.length
    ? Math.round((compliantDocs / documentItems.length) * 100)
    : 0;

  return [
    {
      label: "Referral conversion",
      value: `${referralPercent}%`,
      percent: referralPercent,
      tone:
        referralPercent >= 70 ? "success" : referralPercent >= 40 ? "warning" : "danger",
    },
    {
      label: "Admission readiness",
      value: `${admissionPercent}%`,
      percent: admissionPercent,
      tone:
        admissionPercent >= 75 ? "success" : admissionPercent >= 50 ? "warning" : "danger",
    },
    {
      label: "Transition planning",
      value: `${transitionPercent}%`,
      percent: transitionPercent,
      tone:
        transitionPercent >= 80 ? "success" : transitionPercent >= 60 ? "warning" : "danger",
    },
    {
      label: "Document readiness",
      value: `${documentPercent}%`,
      percent: documentPercent,
      tone:
        documentPercent >= 85 ? "success" : documentPercent >= 65 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  referralItems = [],
  admissionItems = [],
  transitionItems = [],
  documentItems = [],
  taskItems = [],
}) {
  const items = [];

  referralItems
    .filter((item) =>
      ["pending", "under_consideration", "awaiting_information", "awaiting_decision"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.young_person_name || "Referral",
        summary: item.summary || "Referral still requires decision or information.",
      });
    });

  transitionItems
    .filter((item) =>
      ["planned", "due_soon", "in_progress", "review_due"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.young_person_name || "Transition",
        summary: item.summary || "Transition planning still needs follow-up.",
      });
    });

  documentItems
    .filter((item) =>
      ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Placement document",
        summary: item.summary || "A document required for admission remains incomplete.",
      });
    });

  taskItems
    .filter((item) => !item.completed)
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || "Admission action",
        summary: item.summary || "Outstanding admission action remains open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major admissions pressure",
      summary: "Admissions and transitions are not currently surfacing urgent issues.",
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
        <p>No urgent admission issues are showing right now.</p>
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

function renderAdmissionsHtml({
  title = "Admissions and transitions",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  referralItems = [],
  admissionItems = [],
  transitionItems = [],
  documentItems = [],
  taskItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--admissions">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Admissions and transitions</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across referrals, placement planning, admissions, transition work and required documents.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live admissions endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Admissions snapshot</h3>
          <p>A quick visual read across referral flow, admission readiness and transition planning.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Referrals</h3>
              <p>Incoming referrals, matching considerations and local authority communication.</p>
            </div>

            ${renderRows(referralItems, {
              emptyMessage: "No referrals found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "referral",
              metaBuilder: (item) =>
                [
                  item.local_authority || item.referral_source || "",
                  item.referral_date ? `Referral ${formatDate(item.referral_date)}` : "",
                  item.decision_due_date ? `Decision ${formatDate(item.decision_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Admissions</h3>
              <p>Placement decisions, admission readiness and active admission records.</p>
            </div>

            ${renderRows(admissionItems, {
              emptyMessage: "No admissions found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "admission",
              metaBuilder: (item) =>
                [
                  item.referral_source || "",
                  item.planned_admission_date
                    ? `Planned ${formatDate(item.planned_admission_date)}`
                    : item.admission_date
                    ? `Admitted ${formatDate(item.admission_date)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Transitions</h3>
              <p>Move planning, staged admission work and transition support.</p>
            </div>

            ${renderRows(transitionItems, {
              emptyMessage: "No transition records found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "transition",
              metaBuilder: (item) =>
                [
                  item.stage || "",
                  item.move_date ? `Move ${formatDate(item.move_date)}` : "",
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
              <p>The most urgent admissions and transition issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Placement documents</h3>
              <p>Admission paperwork, plans and supporting evidence.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No admission document gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.young_person_name || "",
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
              <p>Outstanding admission and transition tasks requiring follow-up.</p>
            </div>

            ${renderRows(taskItems, {
              emptyMessage: "No admission actions found.",
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

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">⌂</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before admissions can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No admissions context",
    nextEvent: "No move date loaded",
    lastRecord: "No admissions data",
    openActions: "No admissions actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading admissions…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading admissions",
    nextEvent: "Checking move dates",
    lastRecord: "Loading latest admission activity",
    openActions: "Loading admission actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load admissions</h3>
          <p>${safeText(message || "The admissions view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Admissions unavailable",
    nextEvent: "No move date loaded",
    lastRecord: "No admissions data",
    openActions: "No admissions actions loaded",
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
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: `${homeName} admissions`,
        home_name: homeName,
      },
    },
    referralData: {
      items: [
        {
          id: "ref-1",
          young_person_name: "Amir Khan",
          local_authority: "Birmingham",
          status: "under_consideration",
          referral_date: minusDays(2),
          decision_due_date: plusDays(2),
          summary: "Referral under consideration with matching discussion underway.",
        },
      ],
    },
    admissionData: {
      items: [
        {
          id: "adm-1",
          young_person_name: "Maya Jones",
          referral_source: "Local authority",
          status: "approved",
          planned_admission_date: plusDays(5),
          summary: "Admission approved and placement planning underway.",
        },
      ],
    },
    transitionData: {
      items: [
        {
          id: "tran-1",
          young_person_name: "Maya Jones",
          stage: "Planning",
          move_date: plusDays(5),
          status: "planned",
          summary: "Bedroom setup, transition visits and intro pack still in progress.",
        },
      ],
    },
    documentData: {
      items: [
        {
          id: "doc-1",
          title: "Placement plan",
          young_person_name: "Maya Jones",
          document_type: "Placement",
          review_date: plusDays(3),
          status: "review_due",
          summary: "Placement plan draft requires final review before admission.",
        },
        {
          id: "doc-2",
          title: "Consent documentation",
          young_person_name: "Maya Jones",
          document_type: "Consent",
          review_date: plusDays(1),
          status: "missing",
          summary: "Final consent documents still outstanding.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Confirm transition visit",
          due_date: plusDays(1),
          completed: false,
          status: "open",
          assigned_role: "Manager",
          summary: "Confirm final transition visit with placing authority and family.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/admissions`),
    safeGet(`/homes/${homeId}/referrals`),
    safeGet(`/homes/${homeId}/transitions`),
    safeGet(`/homes/${homeId}/admission-documents`),
    safeGet(`/homes/${homeId}/admission-tasks`),
  ];

  const [
    admissionData,
    referralData,
    transitionData,
    documentData,
    taskData,
  ] = await Promise.all(requests);

  const responses = [
    admissionData,
    referralData,
    transitionData,
    documentData,
    taskData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: admissionData || {},
    admissionData: admissionData || { items: [] },
    referralData: referralData || { items: [] },
    transitionData: transitionData || { items: [] },
    documentData: documentData || { items: [] },
    taskData: taskData || { items: [] },
    isFallback: false,
  };
}

export async function loadAdmissions() {
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
      admissionData,
      referralData,
      transitionData,
      documentData,
      taskData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const admissionItems = sortSoonestFirst(
      normaliseAdmissionItems(admissionData),
      ["planned_admission_date", "admission_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const referralItems = sortSoonestFirst(
      normaliseReferralItems(referralData),
      ["decision_due_date", "referral_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const transitionItems = sortSoonestFirst(
      normaliseTransitionItems(transitionData),
      ["move_date", "updated_at", "created_at"]
    ).slice(0, 8);

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
      admissionItems,
      referralItems,
      transitionItems,
      documentItems,
      openTasks: taskItems,
    });

    const progressCards = buildProgressCards({
      referralItems,
      admissionItems,
      transitionItems,
      documentItems,
    });

    const priorityItems = buildPriorityItems({
      referralItems,
      admissionItems,
      transitionItems,
      documentItems,
      taskItems,
    });

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} admissions`;

    els.viewContent.innerHTML = renderAdmissionsHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      referralItems,
      admissionItems,
      transitionItems,
      documentItems,
      taskItems,
      isFallback,
    });

    const nextMilestone =
      transitionItems[0]?.move_date ||
      admissionItems[0]?.planned_admission_date ||
      referralItems[0]?.decision_due_date ||
      null;

    const latestRecord =
      referralItems[0]?.updated_at ||
      admissionItems[0]?.updated_at ||
      transitionItems[0]?.updated_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${referralItems.length} referrals • ${admissionItems.length} admissions • preview mode`
        : `${referralItems.length} referrals • ${admissionItems.length} admissions`,
      nextEvent: nextMilestone
        ? `Next milestone ${formatDate(nextMilestone)}`
        : "No admission milestone loaded",
      lastRecord: latestRecord
        ? `Latest admissions update ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview admissions data loaded"
        : "No recent admissions update",
      openActions: `${taskItems.length} open • ${documentItems.filter((item) => ["missing", "review_due", "due_soon", "overdue", "expired", "incomplete"].includes(String(item.status || "").toLowerCase().replaceAll(" ", "_"))).length} document gaps`,
    });
  } catch (error) {
    console.error("[admissions] load failed", error);
    renderErrorState(error?.message || "The admissions view could not be loaded.");
  }
}
