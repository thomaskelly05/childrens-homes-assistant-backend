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

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
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
    ["overdue", "escalated", "failed", "urgent", "critical", "unresolved"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["due_soon", "pending", "awaiting_reply", "review_due", "warning"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["completed", "sent", "resolved", "closed", "ok", "active"].includes(
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

function renderEmptyState(message = "No communication records found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✉</div>
        <h3>No communication records</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No communication records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item.contact_person ||
            item.full_name ||
            item.title ||
            "Communication record";

          const summary =
            item.summary ||
            item.notes ||
            item.description ||
            item.message ||
            "Communication record";

          const meta = [
            item.organisation || "",
            item.contact_type || "",
            formatDateTime(item.contact_datetime || item.created_at),
          ]
            .filter(Boolean)
            .join(" • ");

          const status = item.status || item.workflow_status || "";
          const tone = getStatusTone(status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id || item.record_id || item.source_id || "")}"
              data-record-type="${safeText(item.record_type || "communication")}"
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
                <span class="row-pill ${safeText(tone)}">${safeText(status || "Recorded")}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildCommunicationStats(items = []) {
  const recent = items.length;

  const pending = items.filter((item) =>
    ["pending", "awaiting_reply", "review_due"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  ).length;

  const resolved = items.filter((item) =>
    ["resolved", "closed", "completed", "sent"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  ).length;

  const familyLinked = items.filter((item) =>
    /family|parent|mum|mom|dad|carer/i.test(
      String(item.contact_type || item.relationship || item.summary || item.organisation || "")
    )
  ).length;

  return {
    recent,
    pending,
    resolved,
    familyLinked,
  };
}

function buildAttentionItems(items = []) {
  return items.filter((item) =>
    ["pending", "awaiting_reply", "review_due", "overdue", "escalated"].includes(
      String(item.status || item.workflow_status || "").toLowerCase()
    )
  );
}

function renderCommunicationHtml({
  items = [],
  stats = {},
  attentionItems = [],
}) {
  const recentItems = items.slice(0, 8);
  const familyItems = items.filter((item) =>
    /family|parent|mum|mom|dad|carer/i.test(
      String(item.contact_type || item.relationship || item.summary || item.organisation || "")
    )
  );

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Communication</div>
          <h2>Professional communication</h2>
          <p>Recent liaison, partner-agency contact, family communication and follow-up.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Recent records</span>
              <strong class="overview-stat-value">${safeText(stats.recent)}</strong>
              <span class="overview-stat-note">Communication items available</span>
            </article>

            <article class="overview-stat-card ${
              stats.pending > 0 ? "overview-stat-card--warning" : ""
            }">
              <span class="overview-stat-label">Pending follow-up</span>
              <strong class="overview-stat-value">${safeText(stats.pending)}</strong>
              <span class="overview-stat-note">Awaiting reply or review</span>
            </article>

            <article class="overview-stat-card ${
              stats.resolved > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Resolved</span>
              <strong class="overview-stat-value">${safeText(stats.resolved)}</strong>
              <span class="overview-stat-note">Closed or completed communication</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Family-linked</span>
              <strong class="overview-stat-value">${safeText(stats.familyLinked)}</strong>
              <span class="overview-stat-note">Family or carer communication</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>Latest professional and family communication across the home.</p>
            </div>

            ${renderRecordRows(recentItems, "No recent communication records found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Family and carer communication</h3>
              <p>Communication records that appear linked to family or carers.</p>
            </div>

            ${renderRecordRows(familyItems.slice(0, 8), "No family-linked communication records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Communication that may need reply, review or follow-up.</p>
            </div>

            ${renderRecordRows(attentionItems.slice(0, 8), "No communication follow-up is currently showing.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All communication</h3>
              <p>Full communication list in newest-first order.</p>
            </div>

            ${renderRecordRows(items, "No communication records found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadCommunication() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">✉</div>
            <h3>No home context available</h3>
            <p>A home ID is needed before communication can load.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading communication…</p>
        </div>
      </div>
    </section>
  `;

  try {
    const data = await apiGet(`/homes/${homeId}/communications`).catch(() => ({
      items: [],
    }));

    const items = sortNewestFirst(
      data.items || data.communications || data.records || [],
      ["contact_datetime", "updated_at", "created_at"]
    );

    const stats = buildCommunicationStats(items);
    const attentionItems = buildAttentionItems(items);

    els.viewContent.innerHTML = renderCommunicationHtml({
      items,
      stats,
      attentionItems,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">!</div>
            <h3>Failed to load communication</h3>
            <p>${safeText(error?.message || "Communication records could not be loaded.")}</p>
          </div>
        </div>
      </section>
    `;
  }
}