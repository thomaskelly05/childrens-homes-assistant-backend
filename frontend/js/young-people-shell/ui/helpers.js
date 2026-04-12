import { escapeHtml, formatDate } from "../core/utils.js";

export function statusBadgeClass(status) {
  const value = String(status || "").trim().toLowerCase();

  if (
    ["approved", "active", "completed", "ok"].includes(value)
  ) {
    return "badge badge-success";
  }

  if (
    ["submitted", "pending_review", "review", "due_soon"].includes(value)
  ) {
    return "badge badge-warning";
  }

  if (
    ["returned", "overdue", "escalated", "critical", "high"].includes(value)
  ) {
    return "badge badge-danger";
  }

  if (
    ["draft", "inactive", "cancelled", "archived"].includes(value)
  ) {
    return "badge badge-muted";
  }

  return "badge badge-default";
}

export function renderBadges(values = []) {
  const badges = values.filter(Boolean);
  if (!badges.length) return "";

  return `
    <div class="badge-row">
      ${badges
        .map(
          (value) => `
            <span class="${escapeHtml(statusBadgeClass(value))}">
              ${escapeHtml(String(value).replaceAll("_", " "))}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderSummaryStat(label, value, hint = "") {
  return `
    <div class="summary-stat">
      <div class="summary-stat-value">${escapeHtml(String(value ?? "0"))}</div>
      <div class="summary-stat-label">${escapeHtml(label || "")}</div>
      ${hint ? `<div class="summary-stat-hint">${escapeHtml(hint)}</div>` : ""}
    </div>
  `;
}

export function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderSection(title, subtitle = "", body = "") {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <h2>${escapeHtml(title || "")}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
      <div class="content-section-body">
        ${body || renderEmptyState()}
      </div>
    </section>
  `;
}

function pickBestDate(item = {}) {
  return (
    item.event_datetime ||
    item.occurred_at ||
    item.contact_datetime ||
    item.start_datetime ||
    item.record_date ||
    item.session_date ||
    item.achievement_date ||
    item.handover_date ||
    item.review_month ||
    item.review_date ||
    item.due_date ||
    item.created_at ||
    null
  );
}

function buildMetaParts(item = {}) {
  const parts = [];

  const dateValue = pickBestDate(item);
  if (dateValue) {
    parts.push(formatDate(dateValue));
  }

  if (item.location) parts.push(item.location);
  if (item.professional_name) parts.push(item.professional_name);
  if (item.contact_person) parts.push(item.contact_person);
  if (item.provision_name) parts.push(item.provision_name);
  if (item.shift_type) parts.push(item.shift_type);
  if (item.appointment_type) parts.push(item.appointment_type);

  return parts.filter(Boolean);
}

export function renderRowList(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const recordId = item.record_id || item.source_id || item.id || "";
          const recordType = item.record_type || "";
          const title = item.title || "Record";
          const summary =
            item.summary ||
            item.description ||
            item.presentation ||
            item.outcome ||
            item.note ||
            "";
          const metaParts = buildMetaParts(item);
          const badgeValues = [
            item.workflow_status,
            item.status,
            item.approval_status,
            item.severity,
            item.significance,
          ].filter(Boolean);

          return `
            <button
              type="button"
              class="record-row"
              data-open-record="true"
              data-record-id="${escapeHtml(String(recordId))}"
              data-record-type="${escapeHtml(String(recordType))}"
              data-title="${escapeHtml(String(title))}"
            >
              <div class="record-row-main">
                <div class="record-row-title">${escapeHtml(title)}</div>
                ${
                  summary
                    ? `<div class="record-row-summary">${escapeHtml(summary)}</div>`
                    : ""
                }
                ${
                  metaParts.length
                    ? `<div class="record-row-meta">${escapeHtml(metaParts.join(" • "))}</div>`
                    : ""
                }
              </div>
              <div class="record-row-side">
                ${renderBadges(badgeValues)}
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderRecordsTable(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="table-wrap">
      <table class="records-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const recordId = item.record_id || item.source_id || item.id || "";
              const recordType = item.record_type || "";
              const title = item.title || "Record";
              const dateValue = pickBestDate(item);
              const status =
                item.workflow_status ||
                item.status ||
                item.approval_status ||
                "";

              return `
                <tr
                  class="records-table-row"
                  data-open-record="true"
                  data-record-id="${escapeHtml(String(recordId))}"
                  data-record-type="${escapeHtml(String(recordType))}"
                  data-title="${escapeHtml(String(title))}"
                >
                  <td>${escapeHtml(title)}</td>
                  <td>${escapeHtml(String(recordType).replaceAll("_", " "))}</td>
                  <td>${escapeHtml(dateValue ? formatDate(dateValue) : "—")}</td>
                  <td>
                    ${
                      status
                        ? `<span class="${escapeHtml(statusBadgeClass(status))}">${escapeHtml(
                            String(status).replaceAll("_", " ")
                          )}</span>`
                        : "—"
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}