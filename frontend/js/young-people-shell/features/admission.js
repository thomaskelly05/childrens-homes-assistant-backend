import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

const SAFE_EMPTY = Object.freeze({ items: [] });

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function toBool(value) {
  return Boolean(value);
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase().replaceAll(" ", "_");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
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

function badgeClass(value) {
  const v = lower(value);

  if (["urgent", "high", "overdue", "missing", "blocked", "declined"].includes(v)) {
    return "badge badge-danger";
  }
  if (["pending", "awaiting_documents", "awaiting_approval", "planned", "draft", "in_progress"].includes(v)) {
    return "badge badge-warning";
  }
  if (["completed", "current", "approved", "confirmed", "admitted"].includes(v)) {
    return "badge badge-success";
  }
  return "badge";
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

async function safeGet(path) {
  try {
    return (await apiGet(path)) || SAFE_EMPTY;
  } catch {
    return SAFE_EMPTY;
  }
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    const aTime = aValue ? new Date(aValue).getTime() : Number.POSITIVE_INFINITY;
    const bTime = bValue ? new Date(bValue).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function hasUsableData(data = {}) {
  return Object.values(data).some((v) => Array.isArray(v) && v.length > 0);
}

function mapAdmission(record = {}) {
  return {
    id: record.id,
    young_person_id: record.young_person_id || null,
    title: record.title || "Admission",
    referral_date: record.referral_date || null,
    admission_date: record.admission_date || record.placement_start_date || null,
    status: record.status || "",
    placing_authority: record.placing_authority || "",
    social_worker_name: record.social_worker_name || record.social_worker || "",
    summary:
      record.summary ||
      record.reason_for_placement ||
      record.notes ||
      "Admission record.",
    reason_for_placement: record.reason_for_placement || "",
    risk_summary: record.risk_summary || "",
    matching_considerations: record.matching_considerations || "",
    child_voice: record.child_voice || "",
    record_type: "admission",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapAdmissionChecklist(record = {}) {
  return {
    id: record.id,
    title: record.title || record.check_name || "Admission task",
    status: record.status || "",
    due_date: record.due_date || null,
    owner_name: record.owner_name || "",
    summary:
      record.summary ||
      record.notes ||
      record.description ||
      "Admission checklist item.",
    record_type: "admission_checklist_item",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData() {
  const now = new Date();

  const minusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const plusDays = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  return {
    admissions: [
      mapAdmission({
        id: "adm-1",
        title: "Placement admission",
        referral_date: minusDays(25),
        admission_date: minusDays(20),
        status: "admitted",
        placing_authority: "Local Authority",
        social_worker_name: "R. James",
        summary: "Admission completed with clear routines, matching discussion and initial support planning.",
        reason_for_placement: "Need for stable, therapeutic residential care.",
        risk_summary: "Missing and peer influence identified as key contextual vulnerabilities.",
        child_voice: "Young person wanted clearer explanations and more say about room setup.",
      }),
    ],
    checklistItems: [
      mapAdmissionChecklist({
        id: "ac-1",
        title: "Upload signed placement plan",
        status: "open",
        due_date: plusDays(2),
        owner_name: "Manager",
        summary: "Placement plan needs signed version attaching to file.",
      }),
      mapAdmissionChecklist({
        id: "ac-2",
        title: "Complete admission direct-work session",
        status: "planned",
        due_date: plusDays(5),
        owner_name: "Keyworker",
        summary: "Capture feelings about move, routines and worries.",
      }),
    ],
    isFallback: true,
  };
}

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderCard(item = {}) {
  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "admission")}"
      data-title="${safeText(item.title || "Admission")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Admission")}</div>
          <div class="record-card-meta">${safeText(
            formatDateTime(item.admission_date || item.due_date || item.created_at)
          )}</div>
        </div>
        <span class="${badgeClass(item.status || "recorded")}">${safeText(
          titleCase(item.status || "recorded")
        )}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.referral_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Referral</div>
                  <div class="details-grid-value">${safeText(formatDate(item.referral_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.admission_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Admission</div>
                  <div class="details-grid-value">${safeText(formatDate(item.admission_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value">${safeText(formatDate(item.due_date))}</div>
                </div>
              `
              : ""
          }
          ${
            item.owner_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner_name)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.reason_for_placement
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Reason for placement</div>
                <div>${safeText(item.reason_for_placement)}</div>
              </div>
            `
            : ""
        }

        ${
          item.risk_summary
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Risk summary</div>
                <div>${safeText(item.risk_summary)}</div>
              </div>
            `
            : ""
        }

        ${
          item.child_voice
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Child voice</div>
                <div>${safeText(item.child_voice)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items.map(renderCard).join("")}</div>`;
}

function renderWorkspace(payload) {
  const { admissions, checklistOpen, checklistDue, isFallback } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Admission</div>
          <h2>Admission, matching and early planning</h2>
          <p class="overview-panel-subtitle">
            Admission context, placement rationale and early follow-up tasks.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live admission routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Admissions", admissions.length)}
        ${renderStatCard("Open admission tasks", checklistOpen.length)}
        ${renderStatCard("Due soon", checklistDue.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Admission record",
            renderCardList(
              admissions,
              "No admission record",
              "No admission records are currently available."
            )
          )}
        </div>

        <aside>
          ${renderSection(
            "Open checklist items",
            renderCardList(
              checklistOpen,
              "No open checklist items",
              "There are no open admission checklist items."
            )
          )}

          ${renderSection(
            "Due soon",
            renderCardList(
              checklistDue,
              "Nothing due soon",
              "No admission tasks are due soon."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const [admissionRes, checklistRes] = await Promise.all([
    safeGet(`/young-people/${youngPersonId}/admission`),
    safeGet(`/young-people/${youngPersonId}/admission-checklist`),
  ]);

  const data = {
    admissions: pickItems(admissionRes, ["admissions", "admission", "items"]).map(mapAdmission),
    checklistItems: pickItems(checklistRes, ["admission_checklist", "checklist_items", "items"]).map(mapAdmissionChecklist),
  };

  if (!hasUsableData(data)) return buildFallbackData();
  return { ...data, isFallback: false };
}

function buildChecklistOpen(data) {
  return sortSoonest(
    data.checklistItems.filter((item) => !["completed", "closed", "resolved"].includes(lower(item.status))),
    ["due_date", "created_at"]
  ).slice(0, 8);
}

function buildChecklistDue(data) {
  return sortSoonest(
    data.checklistItems.filter(
      (item) =>
        !["completed", "closed", "resolved"].includes(lower(item.status)) &&
        item.due_date
    ),
    ["due_date", "created_at"]
  ).slice(0, 8);
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view admission information."
    );
    updateWorkspaceSummaryStrip({
      today: "No admission context",
      nextEvent: "No admission task due",
      lastRecord: "No admission data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div><div class="spinner" aria-hidden="true"></div><p>Loading admission...</p></div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const admissions = sortNewest(data.admissions, ["admission_date", "created_at"]).slice(0, 4);
    const checklistOpen = buildChecklistOpen(data);
    const checklistDue = buildChecklistDue(data);

    els.viewContent.innerHTML = renderWorkspace({
      admissions,
      checklistOpen,
      checklistDue,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${admissions.length} admission record • preview mode`
        : `${admissions.length} admission record loaded`,
      nextEvent: checklistDue[0]?.due_date
        ? `Due ${formatDate(checklistDue[0].due_date)}`
        : "No admission task due",
      lastRecord: admissions[0]?.admission_date
        ? `Admitted ${formatDate(admissions[0].admission_date)}`
        : "No admission date",
      openActions: `${checklistOpen.length} open items`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[admission] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load admission",
      error?.message || "Something went wrong while loading admission information."
    );
    updateWorkspaceSummaryStrip({
      today: "Admission unavailable",
      nextEvent: "No admission task due",
      lastRecord: "No admission data",
      openActions: "Check admission routes",
    });
  }
}