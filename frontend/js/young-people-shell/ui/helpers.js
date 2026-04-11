import { escapeHtml, formatDate, formatShortDate } from "../core/utils.js";

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
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

export function renderSummaryStat(label, value) {
  return `
    <div class="summary-stat">
      <div class="summary-stat-label">${escapeHtml(label)}</div>
      <div class="summary-stat-value">${escapeHtml(String(value ?? "—"))}</div>
    </div>
  `;
}

export function statusBadgeClass(value) {
  const v = String(value || "").toLowerCase();

  if (["approved", "active", "recorded", "completed", "scheduled", "success"].includes(v)) {
    return "success";
  }

  if (["submitted", "pending", "draft", "warning", "medium", "due_soon", "not_required"].includes(v)) {
    return "warning";
  }

  if (["returned", "archived", "cancelled", "high", "critical", "overdue", "danger"].includes(v)) {
    return "danger";
  }

  return "";
}

export function renderBadges(values = []) {
  const list = values.filter(Boolean);

  if (!list.length) return "";

  return `
    <div class="badge-row">
      ${list
        .map(
          (value) => `
            <span class="badge ${statusBadgeClass(value)}">
              ${escapeHtml(String(value).replaceAll("_", " "))}
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

export function getRecordTitle(item = {}) {
  return (
    item.title ||
    item.topic ||
    item.contact_person ||
    item.record_type ||
    item.event_type ||
    item.incident_type ||
    item.appointment_type ||
    "Record"
  );
}

export function getRecordSummary(item = {}) {
  return (
    item.summary ||
    item.narrative ||
    item.description ||
    item.concern_summary ||
    item.outcome ||
    item.presenting_need ||
    item.young_person_voice ||
    item.child_voice ||
    "Open to view details."
  );
}

export function getRecordWhen(item = {}) {
  return (
    item.recorded_at ||
    item.occurred_at ||
    item.event_datetime ||
    item.created_at ||
    item.note_date ||
    item.record_date ||
    item.appointment_date ||
    item.incident_datetime ||
    item.session_date ||
    null
  );
}

export function getRecordBy(item = {}) {
  return (
    item.recorded_by_name ||
    item.author_name ||
    item.created_by_name ||
    item.worker_name ||
    item.owner_name ||
    item.professional_name ||
    ""
  );
}

export function getFriendlyStatus(item = {}) {
  return (
    item.workflow_status ||
    item.status ||
    item.approval_status ||
    item.compliance_status ||
    item.severity ||
    ""
  );
}

export function renderRowItem(item = {}) {
  const title = getRecordTitle(item);
  const summary = getRecordSummary(item);
  const when = getRecordWhen(item);
  const by = getRecordBy(item);
  const status = getFriendlyStatus(item);

  return `
    <button class="record-row" type="button" data-open-record='${escapeHtml(JSON.stringify(item))}'>
      <div class="record-row-main">
        <div class="record-row-title">${escapeHtml(String(title).replaceAll("_", " "))}</div>
        <div class="record-row-subtitle">${escapeHtml(summary)}</div>
      </div>

      <div class="record-row-meta">
        <div class="record-row-date">${escapeHtml(formatDate(when))}</div>
        ${by ? `<div class="record-row-by">${escapeHtml(by)}</div>` : ""}
        ${status ? `<div class="row-pill-wrap">${renderBadges([status])}</div>` : ""}
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
  if (!items.length) {
    return `
      <section class="table-shell">
        <div class="table-toolbar">
          <div>
            <h3>${escapeHtml(title)}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>
        ${renderEmptyState("No items found.")}
      </section>
    `;
  }

  return `
    <section class="table-shell">
      <div class="table-toolbar">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>

      <div class="records-table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>When</th>
              <th>By</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((item) => {
                const status = getFriendlyStatus(item);

                return `
                  <tr data-open-record='${escapeHtml(JSON.stringify(item))}'>
                    <td>
                      <div class="row-title">${escapeHtml(String(getRecordTitle(item)).replaceAll("_", " "))}</div>
                      <div class="row-subtitle">${escapeHtml(getRecordSummary(item))}</div>
                    </td>
                    <td>${escapeHtml(formatShortDate(getRecordWhen(item)))}</td>
                    <td>${escapeHtml(getRecordBy(item) || "—")}</td>
                    <td>${status ? renderBadges([status]) : "—"}</td>
                    <td class="row-actions">
                      <button class="secondary-btn" type="button">Open</button>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="mobile-record-list">
        ${items
          .map((item) => {
            const status = getFriendlyStatus(item);

            return `
              <article class="mobile-record-row" data-open-record='${escapeHtml(JSON.stringify(item))}'>
                <div class="mobile-record-row-top">
                  <div>
                    <div class="mobile-record-row-title">${escapeHtml(
                      String(getRecordTitle(item)).replaceAll("_", " ")
                    )}</div>
                    <div class="mobile-record-row-meta">${escapeHtml(formatDate(getRecordWhen(item)))}</div>
                  </div>
                  ${status ? renderBadges([status]) : ""}
                </div>

                <div class="mobile-record-row-meta">${escapeHtml(getRecordBy(item) || "—")}</div>
                <div class="mobile-record-row-summary">${escapeHtml(getRecordSummary(item))}</div>

                <div class="mobile-record-row-actions">
                  <button class="secondary-btn" type="button">Open</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}
