import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import { bindDynamicOpenRecordButtons } from "./workspace.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function renderEmptyState(message = "No due items found.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function normaliseComplianceRows(items = []) {
  return items.map((item) => ({
    id: item.id ?? item.source_id ?? "",
    record_type: item.record_type || "compliance_item",
    title: item.title || item.name || "Compliance item",
    summary: [
      item.status || "",
      item.severity || "",
      item.owner || item.assigned_role || "",
      item.due_date ? `Due ${formatDate(item.due_date)}` : "",
    ]
      .filter(Boolean)
      .join(" • "),
    due_date: item.due_date || null,
    created_at: item.created_at || null,
    status: item.status || "",
    severity: item.severity || "",
  }));
}

function getRowDate(item = {}) {
  return item.due_date || item.created_at || "";
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const severity = String(item.severity || "").toLowerCase();

  if (
    ["overdue", "escalated", "expired"].includes(status) ||
    ["high", "critical"].includes(severity)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["due_soon", "due soon", "active", "open", "completed"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: status ? status.replaceAll("_", " ") : "Recorded", tone: "muted" };
}

function renderRecordRows(items = [], emptyMessage = "No due items found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(item.id)}"
              data-record-type="${toText(item.record_type)}"
              data-title="${toText(item.title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title)}</div>
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDate(getRowDate(item)))}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderComplianceHtml(items = []) {
  const rows = normaliseComplianceRows(items);

  const overdue = rows.filter((item) =>
    ["overdue", "escalated", "expired"].includes(String(item.status || "").toLowerCase())
  ).length;

  const dueSoon = rows.filter((item) =>
    ["due_soon", "due soon"].includes(String(item.status || "").toLowerCase())
  ).length;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Compliance</div>
          <h2>Checks and due items</h2>
          <p>Keep the record complete, current and ready for review.</p>
        </div>
      </div>

      <div class="overview-stats-grid">
        <article class="overview-stat-card">
          <span class="overview-stat-label">All items</span>
          <strong class="overview-stat-value">${toText(rows.length)}</strong>
          <span class="overview-stat-note">Recorded compliance items</span>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Overdue</span>
          <strong class="overview-stat-value">${toText(overdue)}</strong>
          <span class="overview-stat-note">Items needing urgent action</span>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Due soon</span>
          <strong class="overview-stat-value">${toText(dueSoon)}</strong>
          <span class="overview-stat-note">Approaching deadline</span>
        </article>

        <article class="overview-stat-card">
          <span class="overview-stat-label">Open view</span>
          <strong class="overview-stat-value">${toText(rows.length ? "Ready" : "Empty")}</strong>
          <span class="overview-stat-note">Current page status</span>
        </article>
      </div>

      <section class="overview-section-card">
        <div class="overview-section-head">
          <h3>Checks and due items</h3>
          <p>Compliance items linked to this young person.</p>
        </div>

        ${renderRecordRows(rows, "No due items found.")}
      </section>
    </section>
  `;
}

export async function loadCompliance() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading compliance...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${window.__YP_ID__ || ""}/compliance`).catch(() => ({ items: [] }));
  const items = data.compliance_items || data.items || [];

  els.viewContent.innerHTML = renderComplianceHtml(items);
  bindDynamicOpenRecordButtons();
}
