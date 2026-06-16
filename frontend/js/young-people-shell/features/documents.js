import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  normaliseRecords,
  sortNormalisedRecordsNewestFirst,
} from "../core/record-normaliser.js";
import { openRecordDetail } from "../ui/records.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import { buildInspectionUiEndpoints } from "../core/config.js";
import { mapStatutoryDocument } from "../core/adapters.js";
import {
  mapInspectionHeader,
  mapInspectionSectionPanel,
  mapInspectionReason,
  mapInspectionAction,
  mapInspectionTask,
  mapInspectionBriefing,
  mapInspectionPrep72Hour,
} from "../core/adapters.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentRole() {
  return String(state.userRole || "staff").trim().toLowerCase();
}

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedHomeId ||
    state.currentHomeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    state.youngPerson?.home_id ||
    null
  );
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    state.youngPerson?.id ||
    null
  );
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "child") {
    const person = state.selectedYoungPerson || state.youngPerson || {};
    return (
      person.full_name ||
      person.name ||
      [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
      person.preferred_name ||
      "Young person"
    );
  }

  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (getHomeId() ? `Home ${getHomeId()}` : "Home")
  );
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
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

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortNewestFirst(items = [], keys = []) {
  return sortNormalisedRecordsNewestFirst(
    normaliseRecords(items)
  ).sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || a.date;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || b.date;
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return normaliseRecords(items).sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? toTime(aValue) : Number.POSITIVE_INFINITY;
    const bTime = bValue ? toTime(bValue) : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getStatusTone(status = "") {
  const token = normaliseToken(status);

  if (
    [
      "overdue",
      "expired",
      "missing",
      "non_compliant",
      "failed",
      "inadequate",
      "critical",
      "high",
      "escalated",
      "danger",
      "at_risk",
    ].includes(token)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "review_due",
      "warning",
      "attention",
      "expiring",
      "draft",
      "open",
      "in_progress",
      "requires_improvement",
      "medium",
    ].includes(token)
  ) {
    return "warning";
  }

  if (
    [
      "valid",
      "active",
      "current",
      "reviewed",
      "compliant",
      "approved",
      "good",
      "outstanding",
      "complete",
      "completed",
      "closed",
      "resolved",
    ].includes(token)
  ) {
    return "success";
  }

  return "muted";
}

function getScopeBadgeLabel(scope = getCurrentScope()) {
  if (scope === "child") return "Child lens";
  if (scope === "home") return "Home lens";
  if (scope === "quality") return "Quality lens";
  if (scope === "ofsted") return "Ofsted lens";
  return "Scope lens";
}

function getRoleLensNote(scope = getCurrentScope(), role = getCurrentRole()) {
  const managerRoles = new Set([
    "manager",
    "registered_manager",
    "deputy_manager",
    "ri",
    "responsible_individual",
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
  ]);
  const managerView = managerRoles.has(role);

  if (scope === "child") {
    return managerView
      ? "Child journey with oversight on progress themes, risk and open follow-up."
      : "Child-centred practical lens focused on daily care, chronology, risk and next actions.";
  }

  if (scope === "home") {
    return managerView
      ? "Home-wide management lens on pressures, patterns, staffing and overdue action."
      : "Operational lens for safe day-to-day running, handover and practical follow-up.";
  }

  if (scope === "quality") {
    return "RI and quality assurance lens focused on audit themes, drift, escalation and governance action.";
  }

  if (scope === "ofsted") {
    return "Inspection lens that grades only from available evidence and clearly surfaces missing proof.";
  }

  return "Operational scope lens.";
}

function renderEmptyState(message = "No records found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">▣</div>
        <h3>No records found</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderScopeBanner({
  scope = getCurrentScope(),
  title = getScopeTitle(),
  subtitle = "",
  role = getCurrentRole(),
  isDemo = false,
}) {
  return `
    <div class="scope-lens-banner">
      <div class="scope-lens-banner-main">
        <div class="eyebrow">Scope and purpose</div>
        <h2>${safeText(title)}</h2>
        <p>${safeText(subtitle)}</p>
        ${isDemo ? '<p class="scope-lens-note">Showing fallback preview data.</p>' : ""}
      </div>
      <div class="scope-lens-badges">
        <span class="scope-lens-badge">${safeText(getScopeBadgeLabel(scope))}</span>
        <span class="scope-lens-badge">${safeText(`Role: ${role}`)}</span>
      </div>
    </div>
  `;
}

function renderStats(stats = []) {
  return `
    <div class="overview-stats-grid">
      ${stats
        .map((stat) => {
          const toneClass =
            stat.tone && ["warning", "danger", "success"].includes(stat.tone)
              ? `overview-stat-card--${stat.tone}`
              : "";
          return `
            <article class="overview-stat-card ${toneClass}">
              <span class="overview-stat-label">${safeText(stat.label || "")}</span>
              <strong class="overview-stat-value">${safeText(stat.value ?? "0")}</strong>
              <span class="overview-stat-note">${safeText(stat.note || "")}</span>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSection(title = "", subtitle = "", body = "") {
  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>${safeText(title)}</h3>
        <p>${safeText(subtitle)}</p>
      </div>
      ${body}
    </section>
  `;
}

function getRecordId(item = {}) {
  return item.id ?? item.record_id ?? item.source_id ?? "";
}

function getRecordType(item = {}) {
  return item.type || item.record_type || "record";
}

function renderRecordRows(items = [], emptyMessage = "No records found.", limit = 8) {
  const normalised = normaliseRecords(items);

  if (!normalised.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${normalised
        .slice(0, limit)
        .map((item) => {
          const tone = getStatusTone(item.status || item.tone || "");
          const meta = toArray(item.meta, [item.meta ? [item.meta] : []])
            .flat()
            .filter(Boolean)
            .join(" • ");
          const rowId = getRecordId(item);
          const recordType = getRecordType(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType)}"
              data-title="${safeText(item.title || item.label || "Record")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(item.title || item.label || "Record")}</div>
                <div class="record-row-summary">${safeText(item.summary || "No summary available.")}</div>
                ${meta ? `<div class="record-row-meta">${safeText(meta)}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(item.status || "Recorded")}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityRows(items = [], emptyMessage = "No priority issues found.") {
  return renderRecordRows(items, emptyMessage, 6);
}

function renderOfstedGradePanel({
  homeName = "Home",
  band = "insufficient_evidence",
  score = null,
  confidence = "",
  evidenceNote = "",
}) {
  const token = normaliseToken(band);
  const tone =
    token === "outstanding"
      ? "success"
      : token === "good"
      ? "success"
      : token === "requires_improvement"
      ? "warning"
      : token === "inadequate"
      ? "danger"
      : "muted";

  return `
    <section class="overview-section-card inspection-grade-card">
      <div class="overview-section-head">
        <h3>Inspection judgement position</h3>
        <p>Current grading view based on evidence available for this home.</p>
      </div>
      <div class="inspection-grade-grid">
        <div class="inspection-grade-band inspection-grade-band--${safeText(tone)}">
          <span class="inspection-grade-band-label">Current band</span>
          <strong>${safeText(String(band || "Insufficient evidence").replaceAll("_", " "))}</strong>
          <small>${safeText(homeName)}</small>
        </div>
        <div class="inspection-grade-metrics">
          <article>
            <span>Score</span>
            <strong>${safeText(score ?? "N/A")}</strong>
          </article>
          <article>
            <span>Evidence confidence</span>
            <strong>${safeText(confidence || "Not enough evidence")}</strong>
          </article>
        </div>
      </div>
      <p class="inspection-confidence-note">${safeText(evidenceNote)}</p>
    </section>
  `;
}

function renderDocumentsPage({
  scope = getCurrentScope(),
  title = "Documents",
  subtitle = "",
  role = getCurrentRole(),
  stats = [],
  mainSections = [],
  sideSections = [],
  ofstedGradePanel = "",
  isDemo = false,
}) {
  return `
    <section class="overview-panel">
      ${renderScopeBanner({ scope, title, subtitle, role, isDemo })}
      <p class="scope-lens-note">${safeText(getRoleLensNote(scope, role))}</p>
      ${renderStats(stats)}
      <div class="overview-grid">
        <section class="overview-main">
          ${ofstedGradePanel || ""}
          ${mainSections
            .map((section) =>
              renderSection(section.title, section.subtitle, section.body || "")
            )
            .join("")}
        </section>
        <aside class="overview-side">
          ${sideSections
            .map((section) =>
              renderSection(section.title, section.subtitle, section.body || "")
            )
            .join("")}
        </aside>
      </div>
    </section>
  `;
}

function normaliseRecordType(item = {}) {
  const raw = String(
    item.record_type ||
      item.type ||
      item.source_table ||
      item.document_type ||
      ""
  )
    .toLowerCase()
    .trim();

  if (
    [
      "statutory_document",
      "statutory_documents",
      "young_person_essential_documents",
    ].includes(raw)
  ) {
    return "statutory_document";
  }

  if (["policy_register", "policy", "policies"].includes(raw)) {
    return "document";
  }

  if (["home_documents", "documents", "document"].includes(raw)) {
    return "document";
  }

  return raw || "document";
}

function shouldUseStatutoryMapper(item = {}) {
  const recordType = normaliseRecordType(item);

  return (
    recordType === "statutory_document" ||
    item.compliance_category ||
    item.linked_standard_code ||
    item.file_document_id ||
    item.statutory_document_id
  );
}

function pickRawDocumentItems(data = {}, scope = "home") {
  if (scope === "child") {
    return toArray(data.items, [
      data.documents,
      data.records,
      data.statutory_documents,
      data.young_person_essential_documents,
      data.child_documents,
    ]);
  }

  return toArray(data.items, [
    data.documents,
    data.records,
    data.home_documents,
    data.statutory_documents,
    data.policy_register,
    data.policies,
  ]);
}

function normaliseDocuments(data = {}, scope = "home") {
  const rawItems = pickRawDocumentItems(data, scope);

  return normaliseRecords(
    rawItems.map((item) => {
      const mapped = shouldUseStatutoryMapper(item)
        ? mapStatutoryDocument(item)
        : item;

      const recordType = normaliseRecordType({
        ...item,
        ...mapped,
      });

      const reviewDate =
        mapped.review_date || item.review_date || item.next_review_date || null;
      const expiryDate = mapped.expiry_date || item.expiry_date || null;
      const updatedAt =
        mapped.updated_at || item.updated_at || item.created_at || null;

      return {
        ...mapped,
        id:
          mapped.id ??
          item.id ??
          item.document_id ??
          item.source_id ??
          item.file_document_id ??
          item.statutory_document_id ??
          null,
        record_id:
          mapped.record_id ??
          mapped.id ??
          item.id ??
          item.document_id ??
          item.source_id ??
          item.file_document_id ??
          item.statutory_document_id ??
          null,
        type: recordType,
        record_type: recordType,
        title:
          mapped.title ||
          item.title ||
          item.document_title ||
          item.policy_name ||
          item.file_name ||
          item.document_type ||
          "Document",
        summary:
          mapped.summary ||
          item.summary ||
          item.description ||
          item.notes ||
          item.content ||
          "No description",
        status:
          mapped.status ||
          item.status ||
          item.approval_status ||
          item.compliance_status ||
          "recorded",
        review_date: reviewDate,
        expiry_date: expiryDate,
        updated_at: updatedAt,
        date: updatedAt || reviewDate || expiryDate,
        meta: [
          mapped.document_type ||
            item.document_type ||
            item.category ||
            item.compliance_category ||
            "Document",
          reviewDate ? `Review ${formatDate(reviewDate)}` : "",
          expiryDate ? `Expiry ${formatDate(expiryDate)}` : "",
        ].filter(Boolean),
        raw: item,
      };
    })
  );
}

function normaliseTimelineRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.timeline, data.records, data.chronology_events]).map(
      (item) => ({
        ...item,
        id: item.id ?? item.record_id ?? item.source_id ?? null,
        record_id: item.record_id ?? item.id ?? item.source_id ?? null,
        type: item.type || item.record_type || "chronology_event",
        record_type: item.record_type || item.type || "chronology_event",
        title: item.title || item.event_title || item.event_type || "Journey event",
        summary:
          item.summary ||
          item.description ||
          item.notes ||
          "Journey event recorded.",
        status: item.status || "recorded",
        updated_at:
          item.event_date ||
          item.event_datetime ||
          item.created_at ||
          item.updated_at ||
          null,
        date:
          item.event_date ||
          item.event_datetime ||
          item.created_at ||
          item.updated_at ||
          null,
        meta: [
          item.event_type || item.category || "Timeline",
          item.event_date
            ? formatDate(item.event_date)
            : item.event_datetime
            ? formatDateTime(item.event_datetime)
            : "",
        ].filter(Boolean),
        raw: item,
      })
    )
  );
}

function normaliseTaskRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.tasks, data.records]).map((item) => ({
      ...item,
      id: item.id ?? item.task_id ?? item.record_id ?? null,
      record_id: item.record_id ?? item.id ?? item.task_id ?? null,
      type: item.type || item.record_type || "task",
      record_type: item.record_type || item.type || "task",
      title: item.title || item.task_title || item.task || "Task",
      summary:
        item.summary ||
        item.description ||
        item.task ||
        item.action_description ||
        "Task recorded.",
      status: item.status || (item.completed ? "completed" : "open"),
      due_date: item.due_date || item.task_due_date || item.action_due_date || null,
      updated_at: item.updated_at || item.created_at || null,
      date: item.due_date || item.task_due_date || item.action_due_date || item.updated_at || item.created_at || null,
      meta: [
        item.priority || "",
        item.owner_user_name || item.assigned_to || "",
        item.due_date || item.task_due_date
          ? `Due ${formatDate(item.due_date || item.task_due_date)}`
          : "",
      ].filter(Boolean),
      raw: item,
    }))
  );
}

function normaliseIncidentRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.incidents, data.records]).map((item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_id: item.record_id ?? item.id ?? item.source_id ?? null,
      type: item.type || item.record_type || "incident",
      record_type: item.record_type || item.type || "incident",
      title: item.title || item.incident_type || "Incident",
      summary:
        item.summary ||
        item.description ||
        item.outcome ||
        item.notes ||
        "Incident recorded.",
      status: item.status || item.risk_level || "recorded",
      updated_at: item.event_datetime || item.created_at || item.updated_at || null,
      date: item.event_datetime || item.created_at || item.updated_at || null,
      meta: [
        item.incident_type || "",
        item.safeguarding_flag ? "Safeguarding linked" : "",
        item.event_datetime ? formatDateTime(item.event_datetime) : "",
      ].filter(Boolean),
      raw: item,
    }))
  );
}

function normaliseComplianceRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.compliance_items, data.records]).map((item) => {
      const dueDate = item.due_date || item.review_date || item.expiry_date || null;
      const status = item.compliance_status || item.status || "recorded";

      return {
        ...item,
        id: item.id ?? item.record_id ?? item.source_id ?? null,
        record_id: item.record_id ?? item.id ?? item.source_id ?? null,
        type: item.type || item.record_type || "compliance_item",
        record_type: item.record_type || item.type || "compliance_item",
        title: item.title || item.compliance_type || "Compliance item",
        summary:
          item.summary ||
          item.description ||
          item.notes ||
          (dueDate ? `Due ${formatDate(dueDate)}` : "Compliance item recorded."),
        status,
        due_date: dueDate,
        updated_at: item.updated_at || item.created_at || null,
        date: dueDate || item.updated_at || item.created_at || null,
        meta: [
          item.compliance_type || "",
          dueDate ? `Due ${formatDate(dueDate)}` : "",
          item.approval_status || "",
        ].filter(Boolean),
        raw: item,
      };
    })
  );
}

function normaliseReportRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.reports, data.records]).map((item) => ({
      ...item,
      id: item.id ?? item.report_id ?? item.source_id ?? null,
      record_id: item.record_id ?? item.id ?? item.report_id ?? item.source_id ?? null,
      type: item.type || item.record_type || "report",
      record_type: item.record_type || item.type || "report",
      title: item.title || item.report_type || "Report",
      summary:
        item.summary ||
        item.description ||
        item.report_text ||
        item.notes ||
        "Report output available.",
      status: item.status || item.workflow_status || "completed",
      updated_at: item.updated_at || item.generated_at || item.created_at || null,
      date: item.updated_at || item.generated_at || item.created_at || null,
      meta: [
        item.report_type || "",
        item.review_month ? formatDate(item.review_month) : "",
        item.generated_at ? `Generated ${formatDateTime(item.generated_at)}` : "",
      ].filter(Boolean),
      raw: item,
    }))
  );
}

function normaliseQualityAuditRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.quality_audits, data.audits, data.records]).map(
      (item) => ({
        ...item,
        id: item.id ?? item.audit_id ?? item.record_id ?? null,
        record_id: item.record_id ?? item.id ?? item.audit_id ?? null,
        type: item.type || item.record_type || "quality_audit",
        record_type: item.record_type || item.type || "quality_audit",
        title: item.title || item.audit_title || item.audit_name || item.audit_type || "Quality audit",
        summary:
          item.summary ||
          item.finding ||
          item.concerns ||
          item.notes ||
          "Quality audit record available.",
        status: item.status || item.overall_outcome || "recorded",
        updated_at: item.updated_at || item.audit_date || item.created_at || null,
        date: item.audit_date || item.updated_at || item.created_at || null,
        meta: [
          item.audit_type || "",
          item.audit_date ? formatDate(item.audit_date) : "",
          item.overall_outcome ? `Outcome ${item.overall_outcome}` : "",
        ].filter(Boolean),
        raw: item,
      })
    )
  );
}

function normaliseQualityActionRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [data.quality_audit_actions, data.actions, data.records]).map(
      (item) => ({
        ...item,
        id: item.id ?? item.action_id ?? item.record_id ?? null,
        record_id: item.record_id ?? item.id ?? item.action_id ?? null,
        type: item.type || item.record_type || "quality_action",
        record_type: item.record_type || item.type || "quality_action",
        title: item.title || item.action_title || "Quality action",
        summary:
          item.summary ||
          item.action_description ||
          item.description ||
          "Quality action recorded.",
        status: item.status || "open",
        due_date: item.due_date || null,
        updated_at: item.updated_at || item.created_at || null,
        date: item.due_date || item.updated_at || item.created_at || null,
        meta: [
          item.priority || "",
          item.owner_user_name || "",
          item.due_date ? `Due ${formatDate(item.due_date)}` : "",
        ].filter(Boolean),
        raw: item,
      })
    )
  );
}

function normaliseQualityFindingRows(data = {}) {
  return normaliseRecords(
    toArray(data.items, [
      data.quality_audit_findings,
      data.findings,
      data.records,
    ]).map((item) => ({
      ...item,
      id: item.id ?? item.finding_id ?? item.record_id ?? null,
      record_id: item.record_id ?? item.id ?? item.finding_id ?? null,
      type: item.type || item.record_type || "quality_finding",
      record_type: item.record_type || item.type || "quality_finding",
      title: item.title || item.finding_type || "Quality finding",
      summary:
        item.summary || item.details || item.description || "Finding recorded.",
      status: item.priority || item.status || "recorded",
      updated_at: item.updated_at || item.created_at || null,
      date: item.updated_at || item.created_at || null,
      meta: [
        item.finding_type || "",
        item.priority || "",
        item.action_required ? "Action required" : "",
      ].filter(Boolean),
      raw: item,
    }))
  );
}

function getInspectionConfidenceText({ header, sections = [], reasons = [] }) {
  if (!header && !sections.length) {
    return "Low confidence: inspection scoring data is missing for this home.";
  }

  const populatedSections = sections.filter(
    (item) => item.summary_text || item.strengths_text || item.concerns_text || item.summary
  ).length;
  const concernCount = reasons.filter((item) =>
    ["concern", "risk", "gap", "weakness"].includes(normaliseToken(item.reason_type || item.status))
  ).length;

  if (populatedSections < 2) {
    return "Partial confidence: only limited section evidence is currently available.";
  }

  if (concernCount >= 4) {
    return "Medium confidence: evidence exists, but there are multiple concern-level reasons still open.";
  }

  return "Higher confidence: evidence coverage is broad, with clear strengths and traceable concerns.";
}

function confidenceLabel(text = "") {
  if (text.startsWith("Higher")) return "Higher";
  if (text.startsWith("Medium")) return "Medium";
  return "Low";
}

async function safeGet(path) {
  if (!path) return { __error: false, items: [] };

  try {
    return (await apiGet(path, { skipCache: true })) || {};
  } catch {
    return { __error: true, items: [] };
  }
}

function assertDataAvailability(results = [], subject = "records") {
  const hardFailures = results.filter((item) => item?.__error).length;
  if (hardFailures === results.length) {
    throw new Error(`Unable to load ${subject}.`);
  }
}

async function fetchChildLensData(youngPersonId) {
  const [documentsRes, complianceRes, reportsRes, timelineRes, tasksRes] =
    await Promise.all([
      safeGet(`/young-people/${youngPersonId}/documents`),
      safeGet(`/young-people/${youngPersonId}/compliance`),
      safeGet(`/young-people/${youngPersonId}/reports`),
      safeGet(`/young-people/${youngPersonId}/timeline?limit=80`),
      safeGet(`/young-people/${youngPersonId}/tasks`),
    ]);

  assertDataAvailability(
    [documentsRes, complianceRes, reportsRes, timelineRes, tasksRes],
    "child scope records"
  );

  return {
    documents: normaliseDocuments(documentsRes, "child"),
    compliance: normaliseComplianceRows(complianceRes),
    reports: normaliseReportRows(reportsRes),
    timeline: normaliseTimelineRows(timelineRes),
    tasks: normaliseTaskRows(tasksRes),
  };
}

async function fetchHomeLensData(homeId) {
  const [documentsRes, incidentsRes, tasksRes, complianceRes, reportsRes] =
    await Promise.all([
      safeGet(`/homes/${homeId}/documents`),
      safeGet(`/homes/${homeId}/incidents`),
      safeGet(`/homes/${homeId}/tasks`),
      safeGet(`/homes/${homeId}/compliance`),
      safeGet(`/homes/${homeId}/reports`),
    ]);

  assertDataAvailability(
    [documentsRes, incidentsRes, tasksRes, complianceRes, reportsRes],
    "home scope records"
  );

  return {
    documents: normaliseDocuments(documentsRes, "home"),
    incidents: normaliseIncidentRows(incidentsRes),
    tasks: normaliseTaskRows(tasksRes),
    compliance: normaliseComplianceRows(complianceRes),
    reports: normaliseReportRows(reportsRes),
  };
}

async function fetchQualityLensData(homeId) {
  const [
    documentsRes,
    qualityRes,
    auditsRes,
    findingsRes,
    actionsRes,
    complianceRes,
    reportsRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/documents`),
    safeGet(`/homes/${homeId}/quality`),
    safeGet(`/homes/${homeId}/quality-audits`),
    safeGet(`/homes/${homeId}/quality-audit-findings`),
    safeGet(`/homes/${homeId}/quality-audit-actions`),
    safeGet(`/homes/${homeId}/compliance`),
    safeGet(`/homes/${homeId}/reports`),
  ]);

  assertDataAvailability(
    [
      documentsRes,
      qualityRes,
      auditsRes,
      findingsRes,
      actionsRes,
      complianceRes,
      reportsRes,
    ],
    "quality scope records"
  );

  const summary = qualityRes.summary || qualityRes.dashboard || {};

  return {
    documents: normaliseDocuments(documentsRes, "home"),
    summary,
    audits: normaliseQualityAuditRows(auditsRes),
    findings: normaliseQualityFindingRows(findingsRes),
    actions: normaliseQualityActionRows(actionsRes),
    compliance: normaliseComplianceRows(complianceRes),
    reports: normaliseReportRows(reportsRes),
  };
}

function normaliseInspectionRows(rows = [], fallbackType = "inspection_record") {
  return normaliseRecords(
    rows.map((row) => ({
      ...row,
      id: row.id ?? row.record_id ?? row.source_id ?? null,
      record_id: row.record_id ?? row.id ?? row.source_id ?? null,
      type: row.type || row.record_type || fallbackType,
      record_type: row.record_type || row.type || fallbackType,
      title:
        row.title ||
        row.section_name ||
        row.line_of_enquiry ||
        row.action_title ||
        row.task_title ||
        row.reason_title ||
        fallbackType.replaceAll("_", " "),
      summary:
        row.summary ||
        row.description ||
        row.rationale ||
        row.action_description ||
        row.task_description ||
        row.summary_text ||
        row.concerns_text ||
        row.headline_summary ||
        "Inspection record available.",
      status:
        row.status ||
        row.score_band ||
        row.reason_type ||
        row.priority ||
        "recorded",
      date:
        row.due_date ||
        row.task_due_date ||
        row.action_due_date ||
        row.updated_at ||
        row.created_at ||
        null,
      raw: row,
    }))
  );
}

async function fetchOfstedLensData(homeId) {
  const inspectionEndpoints = buildInspectionUiEndpoints(homeId);
  const prefix = `/inspection/ui/homes/${inspectionEndpoints.homeId}`;

  const [
    documentsRes,
    reportsRes,
    headerRes,
    sectionsRes,
    reasonsRes,
    actionsRes,
    tasksRes,
    briefingRes,
    prepRes,
  ] = await Promise.all([
    safeGet(`/homes/${homeId}/documents`),
    safeGet(`/homes/${homeId}/reports`),
    safeGet(`${prefix}/header`),
    safeGet(`${prefix}/sections`),
    safeGet(`${prefix}/reasons`),
    safeGet(`${prefix}/actions`),
    safeGet(`${prefix}/tasks`),
    safeGet(`${prefix}/briefing`),
    safeGet(`${prefix}/prep-72h`),
  ]);

  assertDataAvailability(
    [
      documentsRes,
      reportsRes,
      headerRes,
      sectionsRes,
      reasonsRes,
      actionsRes,
      tasksRes,
      briefingRes,
      prepRes,
    ],
    "Inspection evidence preparation records"
  );

  const headerRows = toArray(headerRes.items, [headerRes.inspection_headers]).map(
    mapInspectionHeader
  );
  const sectionRows = normaliseInspectionRows(
    toArray(sectionsRes.items, [sectionsRes.inspection_sections]).map(
      mapInspectionSectionPanel
    ),
    "inspection_section_panel"
  );
  const reasonRows = normaliseInspectionRows(
    toArray(reasonsRes.items, [reasonsRes.inspection_reasons]).map(
      mapInspectionReason
    ),
    "inspection_reason"
  );
  const actionRows = normaliseInspectionRows(
    toArray(actionsRes.items, [actionsRes.inspection_actions]).map(
      mapInspectionAction
    ),
    "inspection_action"
  );
  const taskRows = normaliseInspectionRows(
    toArray(tasksRes.items, [tasksRes.inspection_tasks]).map(mapInspectionTask),
    "inspection_task"
  );
  const briefingRows = normaliseInspectionRows(
    toArray(briefingRes.items, [briefingRes.inspection_briefings]).map(
      mapInspectionBriefing
    ),
    "inspection_briefing"
  );
  const prepRows = normaliseInspectionRows(
    toArray(prepRes.items, [prepRes.inspection_prep_72_hour]).map(
      mapInspectionPrep72Hour
    ),
    "inspection_prep_72_hour"
  );

  return {
    documents: normaliseDocuments(documentsRes, "home"),
    reports: normaliseReportRows(reportsRes),
    header: headerRows[0] || null,
    sections: sectionRows,
    reasons: reasonRows,
    actions: actionRows.map((row) => ({
      ...row,
      meta: [
        row.section_name || row.section_code || "",
        row.priority || "",
        row.due_date ? `Due ${formatDate(row.due_date)}` : "",
      ].filter(Boolean),
    })),
    tasks: taskRows.map((row) => ({
      ...row,
      due_date: row.task_due_date || row.action_due_date || row.due_date || null,
      meta: [
        row.assigned_user_name || "",
        row.task_due_date || row.due_date
          ? `Due ${formatDate(row.task_due_date || row.due_date)}`
          : "",
      ].filter(Boolean),
    })),
    briefing: briefingRows[0] || null,
    prep72h: prepRows[0] || null,
  };
}

function buildChildViewModel(data = {}) {
  const documents = sortNewestFirst(data.documents || [], ["updated_at", "review_date", "date"]);
  const timeline = sortNewestFirst(data.timeline || [], ["updated_at", "date"]);
  const reports = sortNewestFirst(data.reports || [], ["updated_at", "date"]);
  const tasks = sortSoonestFirst(data.tasks || [], ["due_date", "updated_at", "date"]);
  const compliance = sortSoonestFirst(data.compliance || [], [
    "due_date",
    "updated_at",
    "date",
  ]);

  const priority = sortSoonestFirst(
    [...tasks, ...compliance].filter((item) =>
      ["overdue", "review_due", "due_soon", "open", "in_progress", "warning"].includes(
        normaliseToken(item.status)
      )
    ),
    ["due_date", "updated_at", "date"]
  );

  const openActions = [...tasks, ...compliance].filter(
    (item) =>
      !["completed", "closed", "resolved", "approved", "ok", "active"].includes(
        normaliseToken(item.status)
      )
  ).length;

  return {
    title: getScopeTitle(),
    subtitle:
      "Child journey records from admission through progress, review and preparation for transition.",
    stats: [
      {
        label: "Journey records",
        value: timeline.length,
        note: "Chronological child events and milestones",
      },
      {
        label: "Child documents",
        value: documents.length,
        note: "Plans, statutory documents and uploads",
      },
      {
        label: "Open follow-up",
        value: openActions,
        note: "Tasks and review items still active",
        tone: openActions ? "warning" : "success",
      },
      {
        label: "Child outputs",
        value: reports.length,
        note: "Reviews and generated child summaries",
      },
    ],
    mainSections: [
      {
        title: "Journey chronology",
        subtitle:
          "A child-centred timeline from admission, significant events, progress and review moments.",
        body: renderRecordRows(
          timeline,
          "No journey chronology has been recorded for this child yet.",
          10
        ),
      },
      {
        title: "Child documents and plans",
        subtitle:
          "Records specifically linked to this young person, including plans, statutory paperwork and review-sensitive files.",
        body: renderRecordRows(documents, "No child-specific documents found.", 10),
      },
      {
        title: "Child reports and summaries",
        subtitle:
          "Review outputs and generated summaries to support understanding of progress, risk and outcomes.",
        body: renderRecordRows(reports, "No child reports or summaries found.", 8),
      },
    ],
    sideSections: [
      {
        title: "Priority follow-up",
        subtitle: "Open or due items requiring action for this child.",
        body: renderPriorityRows(priority, "No urgent child actions are currently showing."),
      },
      {
        title: "Recent updates",
        subtitle: "Latest updates across chronology and key documents.",
        body: renderRecordRows(
          sortNewestFirst([...timeline, ...documents], ["updated_at", "date"]).slice(0, 8),
          "No recent child activity found.",
          8
        ),
      },
    ],
    summaryStrip: {
      today: `${documents.length} child docs • ${timeline.length} journey events`,
      nextEvent: priority[0]?.due_date
        ? `Next due ${formatDate(priority[0].due_date)}`
        : "No immediate child deadline",
      lastRecord: timeline[0]?.title || documents[0]?.title || "No recent child update",
      openActions: `${openActions} open follow-up`,
    },
  };
}

function buildHomeViewModel(data = {}) {
  const documents = sortNewestFirst(data.documents || [], ["updated_at", "review_date", "date"]);
  const incidents = sortNewestFirst(data.incidents || [], ["updated_at", "date"]);
  const tasks = sortSoonestFirst(data.tasks || [], ["due_date", "updated_at", "date"]);
  const compliance = sortSoonestFirst(data.compliance || [], [
    "due_date",
    "updated_at",
    "date",
  ]);
  const reports = sortNewestFirst(data.reports || [], ["updated_at", "date"]);

  const operationalPressure = sortSoonestFirst(
    [...tasks, ...compliance].filter((item) =>
      ["overdue", "review_due", "due_soon", "open", "warning", "high"].includes(
        normaliseToken(item.status)
      )
    ),
    ["due_date", "updated_at", "date"]
  );

  const safeguardingIncidents = incidents.filter((item) =>
    normaliseToken(item.summary).includes("safeguard")
  ).length;

  return {
    title: getScopeTitle(),
    subtitle:
      "Home-level operational lens across incidents, staffing pressure signals, compliance and active follow-up.",
    stats: [
      {
        label: "Home documents",
        value: documents.length,
        note: "Service-level records and uploads",
      },
      {
        label: "Incidents",
        value: incidents.length,
        note: "Recent home incidents and concerns",
        tone: incidents.length > 10 ? "warning" : "muted",
      },
      {
        label: "Operational pressure",
        value: operationalPressure.length,
        note: "Overdue or due-soon home actions",
        tone: operationalPressure.length ? "warning" : "success",
      },
      {
        label: "Home outputs",
        value: reports.length,
        note: "Home summaries and generated reports",
      },
    ],
    mainSections: [
      {
        title: "Home documents",
        subtitle:
          "Documents relevant to this home, including statutory, policy and operational records.",
        body: renderRecordRows(documents, "No home documents found for this scope.", 10),
      },
      {
        title: "Home incidents and concerns",
        subtitle:
          "Events and incidents across the home to support management visibility and pattern spotting.",
        body: renderRecordRows(incidents, "No home incidents have been returned.", 10),
      },
      {
        title: "Home reports and summaries",
        subtitle:
          "Generated home-level outputs, weekly/monthly overviews and structured management summaries.",
        body: renderRecordRows(reports, "No home report outputs available.", 8),
      },
    ],
    sideSections: [
      {
        title: "Management action tracker",
        subtitle: "Open and due items requiring management follow-through.",
        body: renderPriorityRows(
          operationalPressure,
          "No urgent home actions are currently showing."
        ),
      },
      {
        title: "Safeguarding watch",
        subtitle: "Current safeguarding-linked signals within home events.",
        body: renderRecordRows(
          incidents.filter((item) =>
            ["safeguarding", "missing", "risk"].some((token) =>
              normaliseToken(item.title).includes(token)
            )
          ),
          "No safeguarding-linked incidents identified from current data.",
          6
        ),
      },
    ],
    summaryStrip: {
      today: `${documents.length} docs • ${incidents.length} incidents`,
      nextEvent: operationalPressure[0]?.due_date
        ? `Next due ${formatDate(operationalPressure[0].due_date)}`
        : "No immediate management deadline",
      lastRecord: reports[0]?.title || incidents[0]?.title || "No recent home update",
      openActions: `${operationalPressure.length} pressure items • ${safeguardingIncidents} safeguarding signals`,
    },
  };
}

function buildQualitySummaryRows(summary = {}) {
  const pairs = [
    ["overall_score", "Overall quality score"],
    ["readiness_score", "Readiness score"],
    ["evidence_score", "Evidence score"],
    ["open_actions", "Open actions"],
    ["overdue_actions", "Overdue actions"],
    ["critical_actions", "Critical actions"],
  ];

  return normaliseRecords(
    pairs
      .filter(
        ([key]) =>
          summary[key] !== null &&
          summary[key] !== undefined &&
          summary[key] !== ""
      )
      .map(([key, label]) => ({
        id: `quality-summary-${key}`,
        record_id: `quality-summary-${key}`,
        type: "quality_summary_metric",
        record_type: "quality_summary_metric",
        title: label,
        summary: `Current value: ${summary[key]}`,
        status: Number(summary[key]) > 0 ? "recorded" : "not_recorded",
        meta: ["Quality summary"],
      }))
  );
}

function buildQualityViewModel(data = {}) {
  const documents = sortNewestFirst(data.documents || [], ["updated_at", "review_date", "date"]);
  const audits = sortNewestFirst(data.audits || [], ["updated_at", "date"]);
  const findings = sortNewestFirst(data.findings || [], ["updated_at", "date"]);
  const actions = sortSoonestFirst(data.actions || [], ["due_date", "updated_at", "date"]);
  const compliance = sortSoonestFirst(data.compliance || [], [
    "due_date",
    "updated_at",
    "date",
  ]);
  const reports = sortNewestFirst(data.reports || [], ["updated_at", "date"]);
  const summaryRows = buildQualitySummaryRows(data.summary || {});

  const concernFindings = findings.filter((item) =>
    ["concern", "high", "critical", "warning"].includes(normaliseToken(item.status))
  );
  const openActions = actions.filter(
    (item) => !["completed", "closed", "resolved"].includes(normaliseToken(item.status))
  );
  const compliancePressure = compliance.filter((item) =>
    ["overdue", "due_soon", "review_due", "warning"].includes(normaliseToken(item.status))
  );

  return {
    title: getScopeTitle(),
    subtitle:
      "RI and quality assurance lens for this home: audits, drift, standards, actions and escalation risk.",
    stats: [
      {
        label: "Audit records",
        value: audits.length,
        note: "Quality audits and review outputs",
      },
      {
        label: "Quality concerns",
        value: concernFindings.length,
        note: "Findings likely to need challenge or follow-up",
        tone: concernFindings.length ? "warning" : "success",
      },
      {
        label: "Open quality actions",
        value: openActions.length,
        note: "Improvement actions still active",
        tone: openActions.length ? "warning" : "success",
      },
      {
        label: "Compliance pressure",
        value: compliancePressure.length,
        note: "Overdue or review-sensitive compliance items",
        tone: compliancePressure.length ? "danger" : "success",
      },
    ],
    mainSections: [
      {
        title: "Quality summary and assurance picture",
        subtitle:
          "Live quality indicators for this home from audits, quality and compliance feeds.",
        body: renderRecordRows(
          [...summaryRows, ...audits].slice(0, 10),
          "No quality summary data found for this home.",
          10
        ),
      },
      {
        title: "Findings and drift indicators",
        subtitle:
          "Quality findings that show strengths, drift, weak recording or emerging governance risk.",
        body: renderRecordRows(findings, "No quality findings returned for this home.", 10),
      },
      {
        title: "Quality reports and evidence outputs",
        subtitle:
          "Monthly and governance outputs relevant to RI assurance and management oversight.",
        body: renderRecordRows(
          [...reports, ...documents],
          "No quality-linked reports or evidence outputs found.",
          10
        ),
      },
    ],
    sideSections: [
      {
        title: "Improvement action tracker",
        subtitle: "Actions that remain open or due soon across quality and assurance work.",
        body: renderPriorityRows(openActions, "No open quality actions currently showing."),
      },
      {
        title: "Compliance gap pressure",
        subtitle: "Compliance items indicating possible drift or escalation risk.",
        body: renderPriorityRows(
          compliancePressure,
          "No compliance pressure items identified right now."
        ),
      },
    ],
    summaryStrip: {
      today: `${audits.length} audits • ${concernFindings.length} concern findings`,
      nextEvent: openActions[0]?.due_date
        ? `Next action due ${formatDate(openActions[0].due_date)}`
        : "No immediate quality deadline",
      lastRecord: reports[0]?.title || findings[0]?.title || "No recent quality update",
      openActions: `${openActions.length} open quality actions • ${compliancePressure.length} compliance pressure`,
    },
  };
}

function buildOfstedOutputsRows({ reports = [], briefing = null, prep72h = null }) {
  const outputRows = [...reports];

  if (briefing) {
    outputRows.unshift({
      ...briefing,
      id: briefing.id || "inspection-briefing",
      record_id: briefing.id || "inspection-briefing",
      type: briefing.type || briefing.record_type || "inspection_briefing",
      record_type: briefing.record_type || briefing.type || "inspection_briefing",
      title: "Inspection briefing",
      summary:
        briefing.headline_summary ||
        briefing.overall_position_statement ||
        briefing.summary ||
        "Inspection briefing available.",
      status: "ready",
      updated_at: briefing.updated_at || briefing.created_at || null,
      date: briefing.updated_at || briefing.created_at || null,
      meta: [
        "Manager briefing",
        briefing.updated_at ? formatDate(briefing.updated_at) : "",
      ].filter(Boolean),
    });
  }

  if (prep72h) {
    outputRows.unshift({
      ...prep72h,
      id: prep72h.id || "inspection-prep-72h",
      record_id: prep72h.id || "inspection-prep-72h",
      type: prep72h.type || prep72h.record_type || "inspection_prep_72_hour",
      record_type:
        prep72h.record_type || prep72h.type || "inspection_prep_72_hour",
      title: "72-hour inspection prep",
      summary:
        prep72h.urgent_actions ||
        prep72h.primary_focus_area ||
        prep72h.summary ||
        "72-hour preparation view available.",
      status: prep72h.inspection_pressure_level || "recorded",
      updated_at: prep72h.updated_at || prep72h.created_at || null,
      date: prep72h.updated_at || prep72h.created_at || null,
      meta: [
        prep72h.primary_focus_area || "",
        prep72h.inspection_pressure_level
          ? `Pressure ${prep72h.inspection_pressure_level}`
          : "",
      ].filter(Boolean),
    });
  }

  return sortNewestFirst(outputRows, ["updated_at", "date"]);
}

function buildOfstedViewModel(data = {}) {
  const documents = sortNewestFirst(data.documents || [], ["updated_at", "review_date", "date"]);
  const sections = sortNewestFirst(data.sections || [], ["updated_at", "date"]);
  const reasons = sortNewestFirst(data.reasons || [], ["created_at", "updated_at", "date"]);
  const actions = sortSoonestFirst(data.actions || [], ["due_date", "updated_at", "date"]);
  const tasks = sortSoonestFirst(data.tasks || [], ["due_date", "updated_at", "date"]);
  const outputs = buildOfstedOutputsRows({
    reports: sortNewestFirst(data.reports || [], ["updated_at", "date"]),
    briefing: data.briefing,
    prep72h: data.prep72h,
  });
  const header = data.header || null;

  const concernReasons = reasons.filter((item) =>
    ["concern", "risk", "gap", "weakness"].includes(
      normaliseToken(item.reason_type || item.status)
    )
  );
  const strengthReasons = reasons.filter((item) =>
    ["strength", "positive", "impact"].includes(
      normaliseToken(item.reason_type || item.status)
    )
  );
  const openActions = [...actions, ...tasks].filter(
    (item) => !["completed", "closed", "resolved"].includes(normaliseToken(item.status))
  );
  const confidenceText = getInspectionConfidenceText({
    header,
    sections,
    reasons,
  });
  const confidence = confidenceLabel(confidenceText);

  const score =
    header?.overall_score !== null && header?.overall_score !== undefined
      ? Number(header.overall_score).toFixed(1)
      : "N/A";
  const band = header?.overall_band || "insufficient_evidence";

  return {
    title: getScopeTitle(),
    subtitle:
      "Inspection preparation lens for this home, testing current evidence, risk signals and readiness outputs.",
    stats: [
      {
        label: "Current band",
        value: String(band).replaceAll("_", " "),
        note: "Derived from current inspection scoring data",
        tone:
          normaliseToken(band) === "inadequate"
            ? "danger"
            : normaliseToken(band) === "requires_improvement"
            ? "warning"
            : "success",
      },
      {
        label: "Evidence gaps",
        value: concernReasons.length,
        note: "Concern-level reasons needing stronger evidence",
        tone: concernReasons.length ? "warning" : "success",
      },
      {
        label: "Open actions",
        value: openActions.length,
        note: "Inspection actions and tasks still live",
        tone: openActions.length ? "warning" : "success",
      },
      {
        label: "Inspection outputs",
        value: outputs.length,
        note: "Briefings and generated inspection-facing outputs",
      },
    ],
    ofstedGradePanel: renderOfstedGradePanel({
      homeName: getScopeTitle(),
      band,
      score,
      confidence,
      evidenceNote: confidenceText,
    }),
    mainSections: [
      {
        title: "Inspection section evidence",
        subtitle:
          "Current section-level evidence across experiences, help/protection, and leadership themes.",
        body: renderRecordRows(
          sections.map((section) => ({
            ...section,
            status: section.score_band || section.status || "recorded",
            meta: [
              section.section_name || section.section_code || "",
              section.score_value ? `Score ${section.score_value}` : "",
            ].filter(Boolean),
          })),
          "No section evidence has been returned for this home.",
          12
        ),
      },
      {
        title: "Inspector focus and evidence gaps",
        subtitle:
          "Likely lines of enquiry based on current concerns, missing evidence and weak assurance.",
        body: renderRecordRows(
          reasons.map((reason) => ({
            ...reason,
            status: reason.reason_type || reason.status || "recorded",
            meta: [
              reason.section_name || reason.section_code || "",
              reason.line_of_enquiry_name || "",
            ].filter(Boolean),
          })),
          "No lines of enquiry or reasons currently recorded.",
          10
        ),
      },
      {
        title: "Inspection outputs and preparation reports",
        subtitle:
          "Briefings, 72-hour prep and generated reports to support inspection preparation.",
        body: renderRecordRows(outputs, "No inspection preparation outputs found.", 10),
      },
    ],
    sideSections: [
      {
        title: "Inspection action tracker",
        subtitle: "Open inspection actions and linked tasks requiring follow-through.",
        body: renderPriorityRows(
          openActions,
          "No open inspection actions are currently showing."
        ),
      },
      {
        title: "Supporting evidence documents",
        subtitle: "Home evidence and documents that can be used during inspection preparation.",
        body: renderRecordRows(documents, "No supporting documents found for this home.", 8),
      },
      {
        title: "Evidence balance",
        subtitle: "Strengths versus concern-level reasons from current inspection data.",
        body: renderRecordRows(
          [
            {
              id: "ofsted-strength-count",
              record_id: "ofsted-strength-count",
              type: "inspection_metric",
              record_type: "inspection_metric",
              title: "Strength-linked reasons",
              summary: `${strengthReasons.length} reasons currently tagged as strengths or positive evidence.`,
              status: strengthReasons.length ? "good" : "requires_improvement",
              meta: ["Inspection reasons"],
            },
            {
              id: "ofsted-concern-count",
              record_id: "ofsted-concern-count",
              type: "inspection_metric",
              record_type: "inspection_metric",
              title: "Concern-linked reasons",
              summary: `${concernReasons.length} reasons currently indicate concerns, risk or evidence gaps.`,
              status: concernReasons.length ? "warning" : "good",
              meta: ["Inspection reasons"],
            },
          ],
          "No evidence balance metrics available.",
          4
        ),
      },
    ],
    summaryStrip: {
      today: `${String(band).replaceAll("_", " ")} • ${sections.length} section evidence rows`,
      nextEvent: openActions[0]?.due_date
        ? `Next action due ${formatDate(openActions[0].due_date)}`
        : "No immediate inspection action deadline",
      lastRecord:
        outputs[0]?.title ||
        reasons[0]?.title ||
        "No recent inspection preparation output",
      openActions: `${openActions.length} open actions • ${concernReasons.length} concern reasons`,
    },
  };
}

function getDemoItemsForScope(scope = getCurrentScope()) {
  if (scope === "child") {
    return {
      documents: normaliseRecords([
        {
          id: "demo-child-doc-1",
          record_type: "document",
          type: "document",
          title: "Placement plan",
          summary: "Current placement plan and therapeutic approach.",
          status: "active",
          updated_at: "2026-04-10T09:00:00Z",
          date: "2026-04-10T09:00:00Z",
          review_date: "2026-05-11",
          meta: ["Placement", "Review 11 May 2026"],
        },
      ]),
      timeline: normaliseRecords([
        {
          id: "demo-child-tl-1",
          record_type: "chronology_event",
          type: "chronology_event",
          title: "Admission review completed",
          summary: "Initial review confirms placement stability and priority support themes.",
          status: "recorded",
          updated_at: "2026-04-08T13:00:00Z",
          date: "2026-04-08T13:00:00Z",
          meta: ["Review", "8 Apr 2026"],
        },
      ]),
      reports: normaliseRecords([
        {
          id: "demo-child-report-1",
          record_type: "report",
          type: "report",
          title: "Child journey summary",
          summary: "Summary output of progress, risk and next steps.",
          status: "completed",
          updated_at: "2026-04-12T11:30:00Z",
          date: "2026-04-12T11:30:00Z",
          meta: ["Journey report"],
        },
      ]),
      tasks: normaliseRecords([
        {
          id: "demo-child-task-1",
          record_type: "task",
          type: "task",
          title: "Complete keywork follow-up",
          summary: "Record follow-up on agreed direct-work action.",
          status: "due_soon",
          due_date: "2026-04-22",
          date: "2026-04-22",
          meta: ["Due 22 Apr 2026"],
        },
      ]),
      compliance: [],
    };
  }

  if (scope === "home") {
    return {
      documents: normaliseRecords([
        {
          id: "demo-home-doc-1",
          record_type: "document",
          type: "document",
          title: "Statement of Purpose",
          summary: "Latest home statement of purpose and operational details.",
          status: "review_due",
          updated_at: "2026-04-11T12:00:00Z",
          date: "2026-04-11T12:00:00Z",
          review_date: "2026-04-28",
          meta: ["Statutory", "Review 28 Apr 2026"],
        },
      ]),
      incidents: normaliseRecords([
        {
          id: "demo-home-incident-1",
          record_type: "incident",
          type: "incident",
          title: "Missing from care episode",
          summary: "One episode requiring return interview follow-up.",
          status: "warning",
          updated_at: "2026-04-14T21:00:00Z",
          date: "2026-04-14T21:00:00Z",
          meta: ["Safeguarding linked"],
        },
      ]),
      tasks: normaliseRecords([
        {
          id: "demo-home-task-1",
          record_type: "task",
          type: "task",
          title: "Close overdue medication audit action",
          summary: "Manager review and close linked action.",
          status: "overdue",
          due_date: "2026-04-18",
          date: "2026-04-18",
          meta: ["High priority"],
        },
      ]),
      compliance: [],
      reports: normaliseRecords([
        {
          id: "demo-home-report-1",
          record_type: "report",
          type: "report",
          title: "Weekly home overview",
          summary: "Operational summary of incidents, staffing and actions.",
          status: "completed",
          updated_at: "2026-04-13T10:00:00Z",
          date: "2026-04-13T10:00:00Z",
          meta: ["Weekly output"],
        },
      ]),
    };
  }

  if (scope === "quality") {
    return {
      documents: normaliseRecords([
        {
          id: "demo-quality-doc-1",
          record_type: "document",
          type: "document",
          title: "RI quality assurance notes",
          summary: "Oversight notes and evidence links from recent review.",
          status: "active",
          updated_at: "2026-04-12T09:45:00Z",
          date: "2026-04-12T09:45:00Z",
          meta: ["Quality evidence"],
        },
      ]),
      summary: {
        overall_score: 72,
        readiness_score: 69,
        open_actions: 5,
        overdue_actions: 2,
      },
      audits: normaliseRecords([
        {
          id: "demo-quality-audit-1",
          record_type: "quality_audit",
          type: "quality_audit",
          title: "Monthly quality audit",
          summary: "Audit identified strengths in care consistency and gaps in closure pace.",
          status: "requires_improvement",
          updated_at: "2026-04-09T15:00:00Z",
          date: "2026-04-09T15:00:00Z",
          meta: ["Monthly audit"],
        },
      ]),
      findings: normaliseRecords([
        {
          id: "demo-quality-finding-1",
          record_type: "quality_finding",
          type: "quality_finding",
          title: "Follow-up closure delay",
          summary: "Repeated delays in closing quality actions after escalation.",
          status: "warning",
          updated_at: "2026-04-10T10:00:00Z",
          date: "2026-04-10T10:00:00Z",
          meta: ["Action required"],
        },
      ]),
      actions: normaliseRecords([
        {
          id: "demo-quality-action-1",
          record_type: "quality_action",
          type: "quality_action",
          title: "Strengthen action closure discipline",
          summary: "Implement weekly closure review with escalation log.",
          status: "open",
          due_date: "2026-04-25",
          date: "2026-04-25",
          meta: ["High", "Due 25 Apr 2026"],
        },
      ]),
      compliance: [],
      reports: [],
    };
  }

  return {
    documents: normaliseRecords([
      {
        id: "demo-ofsted-doc-1",
        record_type: "document",
        type: "document",
        title: "Inspection evidence pack",
        summary: "Current evidence pack grouped for likely inspection focus.",
        status: "active",
        updated_at: "2026-04-15T09:00:00Z",
        date: "2026-04-15T09:00:00Z",
        meta: ["Inspection evidence"],
      },
    ]),
    reports: normaliseRecords([
      {
        id: "demo-ofsted-report-1",
        record_type: "report",
        type: "report",
        title: "Inspection preparation summary",
        summary: "Generated preparation summary with strengths, gaps and actions.",
        status: "completed",
        updated_at: "2026-04-15T12:00:00Z",
        date: "2026-04-15T12:00:00Z",
        meta: ["Inspection output"],
      },
    ]),
    header: {
      id: "demo-ofsted-header-1",
      home_name: getScopeTitle(),
      overall_band: "requires_improvement",
      overall_score: 68.4,
    },
    sections: normaliseRecords([
      {
        id: "demo-ofsted-sec-1",
        record_type: "inspection_section_panel",
        type: "inspection_section_panel",
        section_name: "Help and protection",
        title: "Help and protection",
        score_band: "requires_improvement",
        score_value: 66.2,
        summary:
          "Safeguarding response is mostly sound but follow-up consistency needs improvement.",
        status: "requires_improvement",
      },
    ]),
    reasons: normaliseRecords([
      {
        id: "demo-ofsted-reason-1",
        record_type: "inspection_reason",
        type: "inspection_reason",
        title: "Return interview evidence is inconsistent",
        summary: "Some return interviews are not yet evidenced quickly enough.",
        reason_type: "concern",
        status: "concern",
      },
    ]),
    actions: normaliseRecords([
      {
        id: "demo-ofsted-action-1",
        record_type: "inspection_action",
        type: "inspection_action",
        title: "Close return interview evidence gap",
        summary: "Strengthen and evidence timely return interview closure.",
        status: "open",
        due_date: "2026-04-24",
        date: "2026-04-24",
        meta: ["Due 24 Apr 2026"],
      },
    ]),
    tasks: [],
    briefing: {
      id: "demo-ofsted-briefing-1",
      record_type: "inspection_briefing",
      type: "inspection_briefing",
      headline_summary:
        "Home shows steady care quality with clear pressure in action closure and safeguarding follow-up evidence.",
      updated_at: "2026-04-15T08:00:00Z",
      date: "2026-04-15T08:00:00Z",
    },
    prep72h: null,
  };
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading scope records and documents…</p>
        </div>
      </div>
    </section>
  `;
}

function renderNoContextState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = renderEmptyState(message);
  updateWorkspaceSummaryStrip({
    today: "No scope context",
    nextEvent: "No timeline",
    lastRecord: "No records loaded",
    openActions: "No actions loaded",
  });
}

function updateSummaryStrip(model = {}) {
  updateWorkspaceSummaryStrip(
    model.summaryStrip || {
      today: "No records",
      nextEvent: "No deadline",
      lastRecord: "No latest record",
      openActions: "No actions",
    }
  );
}

function buildViewModelForScope(scope, payload) {
  if (scope === "child") return buildChildViewModel(payload);
  if (scope === "home") return buildHomeViewModel(payload);
  if (scope === "quality") return buildQualityViewModel(payload);
  return buildOfstedViewModel(payload);
}

async function fetchScopePayload(scope, { youngPersonId, homeId }) {
  if (scope === "child") return fetchChildLensData(youngPersonId);
  if (scope === "home") return fetchHomeLensData(homeId);
  if (scope === "quality") return fetchQualityLensData(homeId);
  return fetchOfstedLensData(homeId);
}

function getPayloadRecords(payload = {}) {
  return [
    ...toArray(payload.documents),
    ...toArray(payload.compliance),
    ...toArray(payload.reports),
    ...toArray(payload.timeline),
    ...toArray(payload.tasks),
    ...toArray(payload.incidents),
    ...toArray(payload.audits),
    ...toArray(payload.findings),
    ...toArray(payload.actions),
    ...toArray(payload.sections),
    ...toArray(payload.reasons),
    ...toArray(payload.outputs),
  ];
}

function bindDocumentRecordEvents(records = []) {
  if (!els.viewContent) return;

  const normalised = normaliseRecords(records);
  const byKey = new Map();

  normalised.forEach((record) => {
    byKey.set(`${record.type || record.record_type}:${record.id}`, record);
  });

  els.viewContent.querySelectorAll("[data-open-record='true']").forEach((row) => {
    const open = () => {
      const type = row.getAttribute("data-record-type") || "";
      const id = row.getAttribute("data-record-id") || "";
      const record = byKey.get(`${type}:${id}`);

      if (record) {
        openRecordDetail(record);
      }
    };

    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

export async function loadDocuments() {
  if (!els.viewContent) return;

  const scope = getCurrentScope();
  const role = getCurrentRole();
  const youngPersonId = getYoungPersonId();
  const homeId = getHomeId();

  if (scope === "child" && !youngPersonId) {
    renderNoContextState("Select a young person to view child-scoped records and documents.");
    return;
  }

  if (scope !== "child" && !homeId) {
    renderNoContextState("A home must be selected to view this scope.");
    return;
  }

  renderLoadingState();

  try {
    const payload = await fetchScopePayload(scope, {
      youngPersonId,
      homeId,
    });

    const model = buildViewModelForScope(scope, payload);

    els.viewContent.innerHTML = renderDocumentsPage({
      scope,
      title: model.title,
      subtitle: model.subtitle,
      role,
      stats: model.stats,
      mainSections: model.mainSections,
      sideSections: model.sideSections,
      ofstedGradePanel: model.ofstedGradePanel || "",
      isDemo: false,
    });

    bindDocumentRecordEvents(getPayloadRecords(payload));
    updateSummaryStrip(model);
  } catch {
    const fallbackPayload = getDemoItemsForScope(scope);
    const model = buildViewModelForScope(scope, fallbackPayload);

    els.viewContent.innerHTML = renderDocumentsPage({
      scope,
      title: model.title,
      subtitle: model.subtitle,
      role,
      stats: model.stats,
      mainSections: model.mainSections,
      sideSections: model.sideSections,
      ofstedGradePanel: model.ofstedGradePanel || "",
      isDemo: true,
    });

    bindDocumentRecordEvents(getPayloadRecords(fallbackPayload));

    updateSummaryStrip({
      ...model,
      summaryStrip: {
        ...model.summaryStrip,
        lastRecord: "Using fallback preview data",
      },
    });
  }
}

export const loadCurrentView = loadDocuments;