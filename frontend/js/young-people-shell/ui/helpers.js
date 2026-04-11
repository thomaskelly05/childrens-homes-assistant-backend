import { escapeHtml, formatDate } from "../core/utils.js";

export function renderEmptyState(message = "No items found.") {
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
        <div>
          <h3>${escapeHtml(title || "")}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body || ""}
    </section>
  `;
}

export function renderSummaryStat(label, value) {
  return `
    <div class="summary-stat">
      <div class="summary-stat-label">${escapeHtml(label || "")}</div>
      <div class="summary-stat-value">${escapeHtml(String(value ?? "—"))}</div>
    </div>
  `;
}

export function statusBadgeClass(value) {
  const text = String(value || "").toLowerCase();

  if (
    [
      "approved",
      "complete",
      "completed",
      "active",
      "current",
      "ok",
      "done",
      "closed",
      "resolved",
    ].includes(text)
  ) {
    return "success";
  }

  if (
    [
      "pending",
      "submitted",
      "review_due",
      "due_soon",
      "draft",
      "in_progress",
      "open",
      "warning",
      "medium",
    ].includes(text)
  ) {
    return "warning";
  }

  if (
    [
      "overdue",
      "high",
      "critical",
      "inactive",
      "cancelled",
      "canceled",
      "returned",
      "error",
      "failed",
      "danger",
    ].includes(text)
  ) {
    return "danger";
  }

  return "";
}

export function renderBadges(values = []) {
  const items = Array.isArray(values) ? values.filter(Boolean) : [];

  if (!items.length) return "";

  return `
    <div class="badge-row">
      ${items
        .map((value) => {
          const text = String(value || "");
          const klass = statusBadgeClass(text);
          return `<span class="badge ${klass}">${escapeHtml(text)}</span>`;
        })
        .join("")}
    </div>
  `;
}

export function getRecordTitle(item = {}) {
  return (
    item.title ||
    item.name ||
    item.incident_type ||
    item.contact_person ||
    item.provision_name ||
    item.topic ||
    item.appointment_type ||
    item.record_type ||
    item.category ||
    "Record"
  );
}

export function getRecordSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.outcome ||
    item.presentation ||
    item.concern_summary ||
    item.learning_engagement ||
    item.post_contact_presentation ||
    item.reflective_analysis ||
    item.purpose ||
    item.notes ||
    "Open to view more detail."
  );
}

export function getRecordWhen(item = {}) {
  return (
    item.event_datetime ||
    item.start_datetime ||
    item.contact_datetime ||
    item.session_date ||
    item.record_date ||
    item.recorded_at ||
    item.occurred_at ||
    item.created_at ||
    item.review_date ||
    item.note_date ||
    item.incident_datetime ||
    item.appointment_date ||
    null
  );
}

export function getRecordBy(item = {}) {
  return (
    item.recorded_by_name ||
    item.created_by_name ||
    item.professional_name ||
    item.contact_person ||
    item.author_name ||
    item.worker_name ||
    item.created_by ||
    ""
  );
}

export function getFriendlyStatus(item = {}) {
  return (
    item.workflow_status ||
    item.approval_status ||
    item.status ||
    item.severity ||
    item.significance ||
    ""
  );
}

export function renderRowItem(item = {}) {
  const title = getRecordTitle(item);
  const summary = getRecordSummary(item);
  const when = getRecordWhen(item);
  const by = getRecordBy(item);
  const status = getFriendlyStatus(item);

  const badges = [
    item.record_type ? String(item.record_type).replaceAll("_", " ") : "",
    status,
    item.location || "",
  ].filter(Boolean);

  return `
    <button
      class="record-row"
      type="button"
      data-open-record='${escapeHtml(JSON.stringify(item))}'
    >
      <div class="record-row-main">
        <div class="record-row-title">${escapeHtml(title)}</div>
        <div class="record-row-subtitle">${escapeHtml(summary)}</div>
        ${renderBadges(badges)}
      </div>

      <div class="record-row-meta">
        ${when ? `<div>${escapeHtml(formatDate(when))}</div>` : ""}
        ${by ? `<div>${escapeHtml(String(by))}</div>` : ""}
      </div>
    </button>
  `;
}

export function renderRowList(items = [], emptyText = "No items found.") {
  if (!Array.isArray(items) || !items.length) {
    return renderEmptyState(emptyText);
  }

  return `
    <div class="record-rows">
      ${items.map((item) => renderRowItem(item)).join("")}
    </div>
  `;
}

export function renderRecordsTable(title, subtitle, items = []) {
  if (!Array.isArray(items) || !items.length) {
    return renderSection(title, subtitle, renderEmptyState("No records found."));
  }

  return renderSection(
    title,
    subtitle,
    `
      <div class="records-table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>When</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((item) => {
                const titleText = getRecordTitle(item);
                const subtitleText = getRecordSummary(item);
                const when = getRecordWhen(item);
                const status = getFriendlyStatus(item);

                return `
                  <tr>
                    <td>
                      <div class="row-title">${escapeHtml(titleText)}</div>
                      <div class="row-subtitle">${escapeHtml(subtitleText)}</div>
                    </td>
                    <td>${escapeHtml(when ? formatDate(when) : "—")}</td>
                    <td>${status ? `<span class="badge ${statusBadgeClass(status)}">${escapeHtml(status)}</span>` : "—"}</td>
                    <td class="row-actions">
                      <button
                        class="secondary-btn"
                        type="button"
                        data-open-record='${escapeHtml(JSON.stringify(item))}'
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="mobile-record-list">
        ${items.map((item) => renderMobileRecordItem(item)).join("")}
      </div>
    `
  );
}

export function renderMobileRecordItem(item = {}) {
  const title = getRecordTitle(item);
  const summary = getRecordSummary(item);
  const when = getRecordWhen(item);
  const status = getFriendlyStatus(item);

  return `
    <button
      class="mobile-record-row"
      type="button"
      data-open-record='${escapeHtml(JSON.stringify(item))}'
    >
      <div class="mobile-record-row-title">${escapeHtml(title)}</div>
      <div class="mobile-record-row-summary">${escapeHtml(summary)}</div>
      <div class="mobile-record-row-meta">
        ${when ? escapeHtml(formatDate(when)) : "—"}
        ${status ? ` • ${escapeHtml(status)}` : ""}
      </div>
    </button>
  `;
}
