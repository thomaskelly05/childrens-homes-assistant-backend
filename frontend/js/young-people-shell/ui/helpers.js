import { escapeHtml, formatDate } from "../core/utils.js";

export function statusBadgeClass(status) {
  const value = String(status || "").trim().toLowerCase();

  if (["approved", "active", "completed", "ok"].includes(value)) {
    return "row-pill muted";
  }

  if (["submitted", "pending_review", "review", "due_soon"].includes(value)) {
    return "row-pill muted";
  }

  if (["returned", "overdue", "escalated", "critical", "high"].includes(value)) {
    return "row-pill warning";
  }

  if (["draft", "inactive", "cancelled", "archived"].includes(value)) {
    return "row-pill muted";
  }

  return "row-pill muted";
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

export function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderSection(title, subtitle = "", body = "", options = {}) {
  const sectionClass = options.sectionClass || "overview-section-card";
  const titleTag = options.titleTag || "h3";

  return `
    <section class="${escapeHtml(sectionClass)}">
      <div class="overview-section-head">
        <${titleTag}>${escapeHtml(title || "")}</${titleTag}>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>
      ${body || renderEmptyState()}
    </section>
  `;
}

export function renderSummaryStat(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${escapeHtml(label || "")}</span>
      <strong class="overview-stat-value">${escapeHtml(String(value ?? "0"))}</strong>
      ${hint ? `<span class="overview-stat-note">${escapeHtml(hint)}</span>` : `<span class="overview-stat-note"></span>`}
    </article>
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

function getBestTitle(item = {}) {
  return item.title || item.label || item.name || item.appointment_type || "Record";
}

function getBestSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.presentation ||
    item.outcome ||
    item.note ||
    item.details ||
    ""
  );
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
          const recordType = item.record_type || item.type || "";
          const title = getBestTitle(item);
          const summary = getBestSummary(item);
          const metaParts = buildMetaParts(item);

          const badgeValues = [
            item.workflow_status,
            item.status,
            item.approval_status,
            item.severity,
            item.significance,
          ].filter(Boolean);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${escapeHtml(String(recordId))}"
              data-record-type="${escapeHtml(String(recordType))}"
              data-title="${escapeHtml(String(title))}"
              role="button"
              tabindex="0"
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
            </article>
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
    <div class="record-list">
      ${items
        .map((item) => {
          const recordId = item.record_id || item.source_id || item.id || "";
          const recordType = item.record_type || "";
          const title = getBestTitle(item);
          const dateValue = pickBestDate(item);
          const status =
            item.workflow_status ||
            item.status ||
            item.approval_status ||
            "";

          const summaryParts = [
            recordType ? String(recordType).replaceAll("_", " ") : "",
            dateValue ? formatDate(dateValue) : "",
          ].filter(Boolean);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${escapeHtml(String(recordId))}"
              data-record-type="${escapeHtml(String(recordType))}"
              data-title="${escapeHtml(String(title))}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${escapeHtml(title)}</div>
                ${
                  summaryParts.length
                    ? `<div class="record-row-summary">${escapeHtml(summaryParts.join(" • "))}</div>`
                    : ""
                }
              </div>
              <div class="record-row-side">
                ${
                  status
                    ? `<span class="${escapeHtml(statusBadgeClass(status))}">${escapeHtml(
                        String(status).replaceAll("_", " ")
                      )}</span>`
                    : `<span class="row-pill muted">Recorded</span>`
                }
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}
