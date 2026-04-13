import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { mapStatutoryDocument } from "../core/adapters.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function getYoungPersonId() {
  return state.youngPersonId || null;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status = "") {
  const s = String(status || "").toLowerCase();

  if (
    ["overdue", "expired", "missing", "non_compliant", "failed"].includes(s)
  ) {
    return "danger";
  }

  if (
    ["due_soon", "review_due", "warning", "attention", "expiring"].includes(s)
  ) {
    return "warning";
  }

  if (
    ["valid", "active", "current", "reviewed", "compliant"].includes(s)
  ) {
    return "success";
  }

  return "muted";
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

/* =========================
   DEMO DATA (SAFE FALLBACK)
   ========================= */
function getDemoDocuments(scope = "home") {
  if (scope === "child") {
    return [
      {
        id: 101,
        title: "Placement Plan",
        document_type: "Placement",
        summary: "Current placement plan outlining care approach.",
        status: "active",
        review_date: "2026-05-01",
        created_at: "2026-03-01T10:00:00Z",
      },
      {
        id: 102,
        title: "Risk Assessment",
        document_type: "Risk",
        summary: "Assessment of behavioural and environmental risks.",
        status: "review_due",
        review_date: "2026-04-20",
        created_at: "2026-03-18T09:30:00Z",
      },
      {
        id: 103,
        title: "Behaviour Support Plan",
        document_type: "Support Plan",
        summary: "Strategies to support emotional regulation.",
        status: "valid",
        review_date: "2026-06-10",
        created_at: "2026-02-22T14:15:00Z",
      },
      {
        id: 104,
        title: "Health Care Plan",
        document_type: "Health",
        summary: "Details of medical needs and medication routines.",
        status: "expired",
        review_date: "2026-03-15",
        created_at: "2026-01-12T11:45:00Z",
      },
    ];
  }

  return [
    {
      id: 1,
      title: "Statement of Purpose",
      document_type: "Statutory",
      summary: "Current Statement of Purpose for the home.",
      status: "active",
      review_date: "2026-05-01",
      created_at: "2026-03-01T10:00:00Z",
    },
    {
      id: 2,
      title: "Annex A",
      document_type: "Statutory",
      summary: "Manager and staffing information for compliance use.",
      status: "review_due",
      review_date: "2026-04-20",
      created_at: "2026-03-18T09:30:00Z",
    },
    {
      id: 3,
      title: "Missing From Care Procedure",
      document_type: "Policy",
      summary: "Policy covering response and follow-up for missing episodes.",
      status: "valid",
      review_date: "2026-06-10",
      created_at: "2026-02-22T14:15:00Z",
    },
    {
      id: 4,
      title: "Medication Audit File",
      document_type: "Audit",
      summary: "Medication audit pack and supporting records.",
      status: "expired",
      review_date: "2026-03-15",
      created_at: "2026-01-12T11:45:00Z",
    },
  ];
}

function normaliseDocuments(data = {}, scope = "home") {
  const rawItems = toArray(data.items, [
    data.documents,
    data.records,
    data.statutory_documents,
  ]);

  if (!rawItems.length) {
    return getDemoDocuments(scope);
  }

  return rawItems.map((item) => {
    const mapped =
      item?.record_type === "statutory_document" ||
      item?.document_type ||
      item?.file_name
        ? mapStatutoryDocument(item)
        : item;

    return {
      ...mapped,
      id: mapped.id ?? item.id ?? item.source_id ?? null,
      record_type: mapped.record_type || "document",
      title:
        mapped.title ||
        item.title ||
        item.document_type ||
        item.file_name ||
        "Document",
      document_type:
        mapped.document_type ||
        item.document_type ||
        item.category ||
        "Document",
      summary:
        mapped.summary ||
        item.summary ||
        item.description ||
        item.notes ||
        "No description",
      status:
        mapped.status ||
        item.status ||
        "recorded",
      review_date:
        mapped.review_date ||
        item.review_date ||
        null,
      expiry_date:
        mapped.expiry_date ||
        item.expiry_date ||
        null,
      created_at:
        mapped.created_at ||
        item.created_at ||
        null,
      updated_at:
        mapped.updated_at ||
        item.updated_at ||
        null,
      file_name:
        mapped.file_name ||
        item.file_name ||
        "",
      compliance_category:
        mapped.compliance_category ||
        item.compliance_category ||
        "",
    };
  });
}

function buildDocumentStats(items = []) {
  const active = items.filter((doc) =>
    ["valid", "active", "current", "reviewed", "compliant"].includes(
      String(doc.status || "").toLowerCase()
    )
  ).length;

  const reviewDue = items.filter((doc) =>
    ["review_due", "due_soon", "expiring", "warning"].includes(
      String(doc.status || "").toLowerCase()
    )
  ).length;

  const expired = items.filter((doc) =>
    ["overdue", "expired", "missing", "non_compliant", "failed"].includes(
      String(doc.status || "").toLowerCase()
    )
  ).length;

  const withReviewDate = items.filter((doc) => doc.review_date).length;

  return {
    total: items.length,
    active,
    reviewDue,
    expired,
    withReviewDate,
  };
}

function buildPriorityItems(items = []) {
  return sortSoonestFirst(
    items.filter((doc) =>
      ["review_due", "due_soon", "expiring", "overdue", "expired", "missing"].includes(
        String(doc.status || "").toLowerCase()
      )
    ),
    ["review_date", "expiry_date", "updated_at", "created_at"]
  );
}

function buildRecentItems(items = []) {
  return sortNewestFirst(items, ["updated_at", "created_at", "review_date"]).slice(0, 8);
}

function renderEmptyState(message = "No documents found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">▣</div>
        <h3>No documents found</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderDocumentRows(items = [], emptyMessage = "No documents found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((doc) => {
          const tone = getStatusTone(doc.status);
          const rowId = doc.id ?? "";
          const recordType = doc.record_type || "document";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType)}"
              data-title="${safeText(doc.title || doc.document_type || "Document")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">
                  ${safeText(doc.title || doc.document_type || "Document")}
                </div>
                <div class="record-row-summary">
                  ${safeText(doc.summary || "No description")}
                </div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      doc.document_type || "",
                      doc.compliance_category || "",
                      doc.review_date ? `Review ${formatDate(doc.review_date)}` : "",
                      doc.expiry_date ? `Expiry ${formatDate(doc.expiry_date)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">
                  ${safeText(doc.status || "Recorded")}
                </span>
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
        <p>No urgent document issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items.slice(0, 6)
        .map(
          (doc) => `
            <article class="priority-item">
              <strong>${safeText(doc.title || doc.document_type || "Document")}</strong>
              <p>${safeText(
                doc.review_date
                  ? `Review due ${formatDate(doc.review_date)}`
                  : doc.expiry_date
                  ? `Expiry ${formatDate(doc.expiry_date)}`
                  : doc.summary || "Document needs review."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDocumentsPage({
  title = "Documents",
  subtitle = "All uploaded and review-sensitive records.",
  stats,
  priorityItems,
  reviewItems,
  recentItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Documents</div>
          <h2>${safeText(title)}</h2>
          <p>${safeText(subtitle)}</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Total documents</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">All loaded records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Active</span>
              <strong class="overview-stat-value">${safeText(stats.active)}</strong>
              <span class="overview-stat-note">Current and valid</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Review due</span>
              <strong class="overview-stat-value">${safeText(stats.reviewDue)}</strong>
              <span class="overview-stat-note">Need checking soon</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Expired / overdue</span>
              <strong class="overview-stat-value">${safeText(stats.expired)}</strong>
              <span class="overview-stat-note">Need urgent action</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Documents needing review</h3>
              <p>Review-sensitive or expired documents to action first.</p>
            </div>

            ${renderDocumentRows(
              reviewItems,
              "No documents are currently due review."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent documents</h3>
              <p>Most recently updated or added records.</p>
            </div>

            ${renderDocumentRows(
              recentItems,
              "No recent document activity found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent document issues showing right now.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All documents</h3>
              <p>Full loaded list of uploaded and review-sensitive records.</p>
            </div>

            ${renderDocumentRows(allItems, "No documents found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadDocuments() {
  if (!els.viewContent) return;

  const scope = getCurrentScope();
  const homeId = getHomeId();
  const youngPersonId = getYoungPersonId();

  if (scope === "child" && !youngPersonId) {
    els.viewContent.innerHTML = renderEmptyState("No young person selected.");
    updateWorkspaceSummaryStrip({
      today: "No child context",
      nextEvent: "No review dates loaded",
      lastRecord: "No document data",
      openActions: "No actions loaded",
    });
    return;
  }

  if (scope !== "child" && !homeId) {
    els.viewContent.innerHTML = renderEmptyState("No home context available.");
    updateWorkspaceSummaryStrip({
      today: "No home context",
      nextEvent: "No review dates loaded",
      lastRecord: "No document data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading documents…</p>
        </div>
      </div>
    </section>
  `;

  try {
    const endpoint =
      scope === "child"
        ? `/young-people/${youngPersonId}/documents`
        : `/homes/${homeId}/documents`;

    const data = await apiGet(endpoint).catch(() => ({ items: [] }));

    const allItems = normaliseDocuments(data, scope);
    const stats = buildDocumentStats(allItems);
    const priorityItems = buildPriorityItems(allItems);
    const reviewItems = priorityItems.slice(0, 8);
    const recentItems = buildRecentItems(allItems);

    const latest = recentItems[0];
    const nextReview = sortSoonestFirst(
      allItems.filter((doc) => doc.review_date),
      ["review_date"]
    )[0];

    const pageTitle =
      scope === "child" ? "Documents and uploads" : "Service documents";

    const subtitle =
      scope === "child"
        ? "Child documents, uploads and review-sensitive records."
        : "Home-wide uploads, statutory documents and review-sensitive records.";

    els.viewContent.innerHTML = renderDocumentsPage({
      title: pageTitle,
      subtitle,
      stats,
      priorityItems,
      reviewItems,
      recentItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.total} document${stats.total === 1 ? "" : "s"} • ${stats.reviewDue} due review`,
      nextEvent: nextReview?.review_date
        ? `Next review ${formatDate(nextReview.review_date)}`
        : "No review date loaded",
      lastRecord: latest
        ? `Latest doc ${formatDateTime(
            latest.updated_at || latest.created_at || latest.review_date
          )}`
        : "No recent document activity",
      openActions: `${stats.expired} urgent • ${stats.reviewDue} review due`,
    });
  } catch (err) {
    const demoItems = getDemoDocuments(scope);
    const stats = buildDocumentStats(demoItems);
    const priorityItems = buildPriorityItems(demoItems);
    const reviewItems = priorityItems.slice(0, 8);
    const recentItems = buildRecentItems(demoItems);

    els.viewContent.innerHTML = renderDocumentsPage({
      title: scope === "child" ? "Documents and uploads" : "Service documents",
      subtitle: "Showing demo fallback data for now.",
      stats,
      priorityItems,
      reviewItems,
      recentItems,
      allItems: demoItems,
    });

    updateWorkspaceSummaryStrip({
      today: "Demo documents loaded",
      nextEvent: priorityItems[0]?.review_date
        ? `Next review ${formatDate(priorityItems[0].review_date)}`
        : "No review date loaded",
      lastRecord: "Using demo fallback data",
      openActions: `${stats.expired} urgent • ${stats.reviewDue} review due`,
    });
  }
}