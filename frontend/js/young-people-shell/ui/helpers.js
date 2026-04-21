import { escapeHtml, formatDate } from "../core/utils.js";

function buildRecordPayloadAttr(item = {}) {
  try {
    return encodeURIComponent(JSON.stringify(item));
  } catch {
    return "";
  }
}

function normaliseStatus(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function statusBadgeClass(status) {
  const value = normaliseStatus(status);

  if (
    [
      "approved",
      "active",
      "completed",
      "complete",
      "ok",
      "good",
      "current",
      "compliant",
      "up_to_date",
      "passed",
      "resolved",
      "closed",
      "reviewed",
      "available",
      "confirmed",
      "on_shift",
      "booked",
    ].includes(value)
  ) {
    return "row-pill success";
  }

  if (
    [
      "submitted",
      "pending_review",
      "review",
      "due",
      "due_soon",
      "review_due",
      "warning",
      "medium",
      "attention",
      "at_risk",
      "planned",
      "received",
      "sent",
      "open",
      "in_progress",
      "expiring",
      "incomplete",
      "bank_staff",
      "agency",
      "limited",
      "visiting_professional",
    ].includes(value)
  ) {
    return "row-pill warning";
  }

  if (
    [
      "returned",
      "overdue",
      "escalated",
      "critical",
      "high",
      "expired",
      "missing",
      "non_compliant",
      "failed",
      "danger",
      "absent",
      "sick",
      "off_shift",
      "annual_leave",
      "vacant",
      "vacancy",
    ].includes(value)
  ) {
    return "row-pill danger";
  }

  if (
    [
      "draft",
      "inactive",
      "cancelled",
      "canceled",
      "archived",
      "recorded",
      "unknown",
      "",
    ].includes(value)
  ) {
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
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>Nothing to show</h3>
        <p>${escapeHtml(message)}</p>
      </div>
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

export function renderSummaryStat(label, value, hint = "", tone = "") {
  const toneClass =
    tone === "danger"
      ? "overview-stat-card--danger"
      : tone === "warning"
      ? "overview-stat-card--warning"
      : tone === "success"
      ? "overview-stat-card--success"
      : "";

  return `
    <article class="overview-stat-card ${escapeHtml(toneClass)}">
      <span class="overview-stat-label">${escapeHtml(label || "")}</span>
      <strong class="overview-stat-value">${escapeHtml(String(value ?? "0"))}</strong>
      ${
        hint
          ? `<span class="overview-stat-note">${escapeHtml(hint)}</span>`
          : `<span class="overview-stat-note"></span>`
      }
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
    item.next_due_date ||
    item.audit_date ||
    item.concern_datetime ||
    item.incident_datetime ||
    item.created_at ||
    item.updated_at ||
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
  if (item.staff_member) parts.push(item.staff_member);
  if (item.organisation) parts.push(item.organisation);
  if (item.document_type) parts.push(item.document_type);
  if (item.service_name) parts.push(item.service_name);
  if (item.role) parts.push(item.role);

  return [...new Set(parts.filter(Boolean))];
}

function getBestTitle(item = {}) {
  return (
    item.title ||
    item.label ||
    item.name ||
    item.full_name ||
    item.staff_member ||
    item.young_person_name ||
    item.contact_person ||
    item.service_name ||
    item.audit_name ||
    item.safeguarding_category ||
    item.incident_type ||
    item.appointment_type ||
    item.document_type ||
    "Record"
  );
}

function getBestSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.presentation ||
    item.outcome ||
    item.note ||
    item.details ||
    item.task ||
    item.finding ||
    item.concern_details ||
    item.notes ||
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
          const status =
            item.workflow_status || item.status || item.approval_status || "";
          const dateValue = pickBestDate(item);
          const metaParts = buildMetaParts(item);
          const recordPayload = buildRecordPayloadAttr(item);

          const badgeValues = [
            status,
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
              data-record-summary="${escapeHtml(String(summary || ""))}"
              data-record-status="${escapeHtml(String(status || ""))}"
              data-record-date="${escapeHtml(String(dateValue || ""))}"
              data-record-payload="${escapeHtml(String(recordPayload || ""))}"
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
          const recordType = item.record_type || item.type || "";
          const title = getBestTitle(item);
          const dateValue = pickBestDate(item);
          const status =
            item.workflow_status ||
            item.status ||
            item.approval_status ||
            "";
          const summary = [recordType ? String(recordType).replaceAll("_", " ") : "", dateValue ? formatDate(dateValue) : ""]
            .filter(Boolean)
            .join(" • ");
          const recordPayload = buildRecordPayloadAttr(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${escapeHtml(String(recordId))}"
              data-record-type="${escapeHtml(String(recordType))}"
              data-title="${escapeHtml(String(title))}"
              data-record-summary="${escapeHtml(String(summary || ""))}"
              data-record-status="${escapeHtml(String(status || ""))}"
              data-record-date="${escapeHtml(String(dateValue || ""))}"
              data-record-payload="${escapeHtml(String(recordPayload || ""))}"
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