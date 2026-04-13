import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

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
    ["overdue", "high", "critical", "escalated", "failed", "danger"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due_soon", "warning", "medium", "review_due", "attention"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["completed", "good", "active", "booked", "compliant", "ok", "passed"].includes(
      normalised
    )
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
  return data.summary || data.quality_summary || data.dashboard || data || {};
}

function normaliseAuditItems(data = {}) {
  return toArray(data.items, [data.audits, data.records]);
}

function normaliseComplianceItems(data = {}) {
  return toArray(data.items, [data.compliance, data.records]);
}

function normaliseManagerReviewItems(data = {}) {
  return toArray(data.items, [data.reviews, data.manager_reviews, data.records]);
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]);
}

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]);
}

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.records]);
}

function normaliseIncidentItems(data = {}) {
  return toArray(data.items, [data.incidents, data.records]);
}

function buildTopStats({
  summary = {},
  overdueCompliance = [],
  failedAudits = [],
  overdueReviews = [],
  urgentIncidents = [],
  expiringDocuments = [],
}) {
  return [
    {
      label: "Compliance score",
      value: `${toNumber(summary.compliance_percent ?? summary.compliance_rate, 0)}%`,
      note: "Current service compliance",
      tone:
        toNumber(summary.compliance_percent ?? summary.compliance_rate, 0) >= 90
          ? "success"
          : toNumber(summary.compliance_percent ?? summary.compliance_rate, 0) >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Overdue compliance",
      value: overdueCompliance.length,
      note: "Actions or checks needing attention",
      tone: overdueCompliance.length ? "danger" : "success",
    },
    {
      label: "Audit concerns",
      value: failedAudits.length,
      note: "Audits not passed or requiring action",
      tone: failedAudits.length ? "warning" : "success",
    },
    {
      label: "Manager reviews due",
      value: overdueReviews.length,
      note: "Review oversight requiring completion",
      tone: overdueReviews.length ? "warning" : "muted",
    },
    {
      label: "Urgent incidents",
      value: urgentIncidents.length,
      note: "High or critical issues",
      tone: urgentIncidents.length ? "danger" : "muted",
    },
  ];
}

function buildProgressCards({
  summary = {},
  complianceItems = [],
  audits = [],
  reviews = [],
  documents = [],
}) {
  const compliancePercent = toNumber(
    summary.compliance_percent ?? summary.compliance_rate,
    0
  );

  const passedAudits = audits.filter((item) =>
    ["passed", "complete", "good"].includes(String(item.status || "").toLowerCase())
  ).length;
  const auditPercent = audits.length
    ? Math.round((passedAudits / audits.length) * 100)
    : 0;

  const completedReviews = reviews.filter((item) =>
    ["completed", "done", "reviewed"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const reviewPercent = reviews.length
    ? Math.round((completedReviews / reviews.length) * 100)
    : 0;

  const compliantDocs = documents.filter((item) =>
    ["current", "reviewed", "compliant"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const documentPercent = documents.length
    ? Math.round((compliantDocs / documents.length) * 100)
    : 0;

  const resolvedCompliance = complianceItems.filter((item) =>
    ["complete", "completed", "reviewed", "compliant"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;
  const complianceItemsPercent = complianceItems.length
    ? Math.round((resolvedCompliance / complianceItems.length) * 100)
    : 0;

  return [
    {
      label: "Overall compliance",
      value: `${compliancePercent}%`,
      percent: compliancePercent,
      tone:
        compliancePercent >= 90
          ? "success"
          : compliancePercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Audit pass rate",
      value: `${auditPercent}%`,
      percent: auditPercent,
      tone:
        auditPercent >= 90 ? "success" : auditPercent >= 70 ? "warning" : "danger",
    },
    {
      label: "Review completion",
      value: `${reviewPercent}%`,
      percent: reviewPercent,
      tone:
        reviewPercent >= 90
          ? "success"
          : reviewPercent >= 70
          ? "warning"
          : "danger",
    },
    {
      label: "Document readiness",
      value: `${documentPercent}%`,
      percent: documentPercent,
      tone:
        documentPercent >= 90
          ? "success"
          : documentPercent >= 75
          ? "warning"
          : "danger",
    },
    {
      label: "Action closure",
      value: `${complianceItemsPercent}%`,
      percent: complianceItemsPercent,
      tone:
        complianceItemsPercent >= 90
          ? "success"
          : complianceItemsPercent >= 75
          ? "warning"
          : "danger",
    },
  ];
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--five">
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
            item?.name ||
            item?.staff_member ||
            item?.document_type ||
            item?.audit_type ||
            item?.service_name ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.detail ||
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
        <p>No urgent quality issues are showing right now.</p>
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

function renderMiniChart(title, items = [], key = "value") {
  const max = Math.max(...items.map((item) => toNumber(item?.[key], 0)), 1);

  return `
    <section class="overview-side-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
        <p>Quick visual comparison.</p>
      </div>

      <div class="mini-chart">
        ${items
          .map((item) => {
            const value = toNumber(item?.[key], 0);
            const width = Math.max(8, Math.round((value / max) * 100));
            return `
              <div class="mini-chart-row">
                <span class="mini-chart-label">${safeText(item.label)}</span>
                <div class="mini-chart-bar-wrap">
                  <span class="mini-chart-bar" style="width: ${safeText(width)}%;"></span>
                </div>
                <strong class="mini-chart-value">${safeText(value)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function buildPriorityItems({
  overdueCompliance = [],
  failedAudits = [],
  overdueReviews = [],
  expiringDocuments = [],
  urgentIncidents = [],
}) {
  const items = [];

  overdueCompliance.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || item.check_name || "Overdue compliance item",
      summary:
        item.summary ||
        item.notes ||
        (item.due_date ? `Due ${formatDate(item.due_date)}` : "Needs attention."),
    });
  });

  failedAudits.slice(0, 2).forEach((item) => {
    items.push({
      title: item.title || item.audit_type || "Audit concern",
      summary:
        item.summary ||
        item.notes ||
        "Audit needs follow-up or action.",
    });
  });

  overdueReviews.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || item.staff_member || "Manager review overdue",
      summary:
        item.review_date
          ? `Review due ${formatDate(item.review_date)}`
          : "Manager review needs completion.",
    });
  });

  expiringDocuments.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || item.document_type || "Document review due",
      summary:
        item.review_date
          ? `Review due ${formatDate(item.review_date)}`
          : "Document review is due.",
    });
  });

  urgentIncidents.slice(0, 1).forEach((item) => {
    items.push({
      title: item.title || item.incident_type || "Urgent incident",
      summary:
        item.summary ||
        item.description ||
        "Critical or high concern requiring oversight.",
    });
  });

  return items.slice(0, 6);
}

function buildMiniMetrics({
  overdueCompliance = [],
  failedAudits = [],
  overdueReviews = [],
  expiringDocuments = [],
  urgentIncidents = [],
}) {
  return [
    { label: "Compliance", value: overdueCompliance.length },
    { label: "Audits", value: failedAudits.length },
    { label: "Reviews", value: overdueReviews.length },
    { label: "Documents", value: expiringDocuments.length },
    { label: "Incidents", value: urgentIncidents.length },
  ];
}

function renderQualityDashboardHtml({
  serviceName = "Quality dashboard",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  complianceItems = [],
  auditItems = [],
  reviewItems = [],
  documentItems = [],
  communicationItems = [],
  therapyItems = [],
  miniMetrics = [],
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--quality">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Quality and RI</div>
          <h2>${safeText(serviceName)}</h2>
          <p>A regulator-facing and quality assurance view across compliance, audits, reviews, records and service standards.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Quality performance snapshot</h3>
          <p>A visual view of audit pass rate, compliance, reviews and document readiness.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Compliance actions</h3>
              <p>Open, due and overdue compliance actions requiring quality oversight.</p>
            </div>

            ${renderRows(complianceItems, {
              emptyMessage: "No compliance items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "quality_compliance",
              metaBuilder: (item) =>
                [
                  item.category || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Audits and findings</h3>
              <p>Recent audits, findings and review outcomes.</p>
            </div>

            ${renderRows(auditItems, {
              emptyMessage: "No audit records found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "audit",
              metaBuilder: (item) =>
                [
                  item.audit_type || "",
                  item.audit_date ? formatDate(item.audit_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Manager reviews</h3>
              <p>Oversight, review and sign-off activity.</p>
            </div>

            ${renderRows(reviewItems, {
              emptyMessage: "No manager review records found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "manager_review",
              metaBuilder: (item) =>
                [
                  item.staff_member || "",
                  item.review_date ? formatDate(item.review_date) : "",
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
              <p>Top quality, compliance and RI issues needing focus.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          ${renderMiniChart("Quality pressure points", miniMetrics, "value")}

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Documents and evidence</h3>
              <p>Recent documents and evidence items linked to readiness.</p>
            </div>

            ${renderRows(documentItems, {
              emptyMessage: "No document items found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Communication trail</h3>
              <p>Recent professional liaison relevant to quality and oversight.</p>
            </div>

            ${renderRows(communicationItems, {
              emptyMessage: "No communication items found.",
              titleKey: "contact_person",
              summaryKey: "summary",
              recordType: "communication",
              metaBuilder: (item) =>
                [
                  item.organisation || "",
                  item.contact_type || "",
                  formatDateTime(item.contact_datetime || item.created_at),
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Therapeutic oversight</h3>
              <p>Therapeutic input and recommendations relevant to service quality.</p>
            </div>

            ${renderRows(therapyItems, {
              emptyMessage: "No therapeutic oversight records found.",
              titleKey: "service_name",
              summaryKey: "summary",
              recordType: "therapy",
              metaBuilder: (item) =>
                [
                  item.professional_name || "",
                  item.session_date ? formatDate(item.session_date) : "",
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

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">▦</div>
          <h3>No quality context available</h3>
          <p>A home or service context is needed before the quality dashboard can load.</p>
        </div>
      </div>
    </section>
  `;
}

function renderLoading() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading quality dashboard…</p>
        </div>
      </div>
    </section>
  `;
}

function renderError(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load quality dashboard</h3>
          <p>${safeText(message || "The quality dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;
}

export async function loadQualityDashboard() {
  if (!els.viewContent) return;

  const homeId = getHomeId();
  if (!homeId) {
    renderNoContext();
    return;
  }

  renderLoading();

  try {
    const [
      summaryData,
      auditsData,
      complianceData,
      reviewsData,
      documentsData,
      communicationsData,
      therapyData,
      incidentsData,
    ] = await Promise.all([
      apiGet(`/homes/${homeId}/quality-dashboard`).catch(() => ({})),
      apiGet(`/homes/${homeId}/audits`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/compliance`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/manager-reviews`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/documents`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/communications`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/therapy`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/incidents`).catch(() => ({ items: [] })),
    ]);

    const summary = normaliseSummary(summaryData);

    const auditItems = sortNewestFirst(normaliseAuditItems(auditsData), [
      "audit_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const complianceItems = sortSoonestFirst(
      normaliseComplianceItems(complianceData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const reviewItems = sortSoonestFirst(
      normaliseManagerReviewItems(reviewsData),
      ["review_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const documentItems = sortSoonestFirst(
      normaliseDocumentItems(documentsData),
      ["review_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const communicationItems = sortNewestFirst(
      normaliseCommunicationItems(communicationsData),
      ["contact_datetime", "updated_at", "created_at"]
    ).slice(0, 6);

    const therapyItems = sortNewestFirst(normaliseTherapyItems(therapyData), [
      "session_date",
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const incidentItems = sortNewestFirst(
      normaliseIncidentItems(incidentsData),
      ["occurred_at", "updated_at", "created_at"]
    );

    const overdueCompliance = complianceItems.filter((item) =>
      ["overdue", "escalated"].includes(String(item.status || "").toLowerCase())
    );

    const failedAudits = auditItems.filter((item) =>
      ["failed", "action_required", "warning", "concern"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const overdueReviews = reviewItems.filter((item) =>
      ["overdue", "due_soon", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const expiringDocuments = documentItems.filter((item) =>
      ["review_due", "due_soon", "overdue"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const urgentIncidents = incidentItems.filter((item) =>
      ["high", "critical"].includes(String(item.severity || "").toLowerCase())
    );

    const topStats = buildTopStats({
      summary,
      overdueCompliance,
      failedAudits,
      overdueReviews,
      urgentIncidents,
      expiringDocuments,
    });

    const progressCards = buildProgressCards({
      summary,
      complianceItems,
      audits: auditItems,
      reviews: reviewItems,
      documents: documentItems,
    });

    const priorityItems = buildPriorityItems({
      overdueCompliance,
      failedAudits,
      overdueReviews,
      expiringDocuments,
      urgentIncidents,
    });

    const miniMetrics = buildMiniMetrics({
      overdueCompliance,
      failedAudits,
      overdueReviews,
      expiringDocuments,
      urgentIncidents,
    });

    const serviceName =
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      "Quality dashboard";

    els.viewContent.innerHTML = renderQualityDashboardHtml({
      serviceName,
      topStats,
      progressCards,
      priorityItems,
      complianceItems,
      auditItems,
      reviewItems,
      documentItems,
      communicationItems,
      therapyItems,
      miniMetrics,
    });
  } catch (error) {
    renderError(error?.message || "The quality dashboard could not be loaded.");
  }
}

export { loadQualityDashboard as loadQuality };