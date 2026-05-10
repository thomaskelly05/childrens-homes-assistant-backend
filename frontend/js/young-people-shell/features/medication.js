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

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

  if (["overdue", "missed", "refused", "error", "high", "urgent"].includes(v)) {
    return "badge badge-danger";
  }
  if (["due_soon", "pending", "scheduled", "warning", "monitoring"].includes(v)) {
    return "badge badge-warning";
  }
  if (["administered", "current", "completed", "good", "active"].includes(v)) {
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

function mapMedication(record = {}) {
  return {
    id: record.id,
    medication_name: record.medication_name || record.title || "Medication",
    dose: record.dose || "",
    route: record.route || "",
    frequency: record.frequency || "",
    start_date: record.start_date || null,
    end_date: record.end_date || null,
    status: record.status || "current",
    prescribed_by: record.prescribed_by || "",
    purpose: record.purpose || "",
    instructions: record.instructions || "",
    summary:
      record.summary ||
      record.instructions ||
      record.purpose ||
      "Medication record.",
    record_type: "medication_record",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapMedicationAdministration(record = {}) {
  return {
    id: record.id,
    medication_name: record.medication_name || "Medication",
    due_at: record.due_at || record.scheduled_time || null,
    administered_at: record.administered_at || null,
    status: record.status || "",
    dose_given: record.dose_given || "",
    outcome: record.outcome || "",
    administered_by: record.administered_by || "",
    notes: record.notes || "",
    summary:
      record.summary ||
      record.outcome ||
      record.notes ||
      "Medication administration recorded.",
    record_type: "medication_administration",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function buildFallbackData() {
  const now = new Date();

  const minusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };

  const plusHours = (hours) => {
    const d = new Date(now);
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  };

  return {
    medications: [
      mapMedication({
        id: "med-1",
        medication_name: "Melatonin",
        dose: "3mg",
        route: "Oral",
        frequency: "Nightly",
        start_date: minusHours(24 * 20),
        status: "current",
        purpose: "Sleep support",
        instructions: "Administer at bedtime.",
      }),
      mapMedication({
        id: "med-2",
        medication_name: "PRN Paracetamol",
        dose: "500mg",
        route: "Oral",
        frequency: "PRN",
        start_date: minusHours(24 * 40),
        status: "current",
        purpose: "Pain relief",
      }),
    ],
    administrations: [
      mapMedicationAdministration({
        id: "mar-1",
        medication_name: "Melatonin",
        due_at: plusHours(3),
        status: "due_soon",
        summary: "Evening medication due later tonight.",
      }),
      mapMedicationAdministration({
        id: "mar-2",
        medication_name: "Paracetamol",
        due_at: minusHours(10),
        administered_at: minusHours(10),
        status: "administered",
        outcome: "Given as prescribed.",
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
  const status = item.status || item.outcome || "recorded";

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "medication_record")}"
      data-title="${safeText(item.medication_name || item.title || "Medication")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.medication_name || item.title || "Medication")}</div>
          <div class="record-card-meta">${safeText(
            formatDateTime(item.due_at || item.administered_at || item.start_date || item.created_at)
          )}</div>
        </div>
        <span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.dose
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Dose</div>
                  <div class="details-grid-value">${safeText(item.dose)}</div>
                </div>
              `
              : ""
          }
          ${
            item.route
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Route</div>
                  <div class="details-grid-value">${safeText(item.route)}</div>
                </div>
              `
              : ""
          }
          ${
            item.frequency
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Frequency</div>
                  <div class="details-grid-value">${safeText(item.frequency)}</div>
                </div>
              `
              : ""
          }
          ${
            item.dose_given
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Dose given</div>
                  <div class="details-grid-value">${safeText(item.dose_given)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.instructions
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Instructions</div>
                <div>${safeText(item.instructions)}</div>
              </div>
            `
            : ""
        }

        ${
          item.notes
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Notes</div>
                <div>${safeText(item.notes)}</div>
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
  const { currentMedication, dueMedication, recentAdministration, missedMedication, isFallback } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Medication</div>
          <h2>Medication profile and MAR activity</h2>
          <p class="overview-panel-subtitle">
            Medication profile, due administrations and recent outcomes.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live medication routes are available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Current medication", currentMedication.length)}
        ${renderStatCard("Due soon", dueMedication.length)}
        ${renderStatCard("Missed / refused", missedMedication.length)}
        ${renderStatCard("Recent administrations", recentAdministration.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Current medication",
            renderCardList(
              currentMedication,
              "No current medication",
              "No active medication records are currently available."
            )
          )}

          ${renderSection(
            "Due medication",
            renderCardList(
              dueMedication,
              "Nothing due",
              "There are no medication administrations due soon."
            )
          )}
        </div>

        <aside>
          ${renderSection(
            "Missed or refused",
            renderCardList(
              missedMedication,
              "No missed medication",
              "No recent missed or refused administrations are recorded."
            )
          )}

          ${renderSection(
            "Recent administrations",
            renderCardList(
              recentAdministration,
              "No recent administrations",
              "No recent medication administrations are available."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

async function fetchAll(youngPersonId) {
  const healthBundle = await safeGet(`/young-people/${youngPersonId}/health`);

  const data = {
    medications: pickItems(healthBundle, ["medication_profiles", "medications", "items"]).map(mapMedication),
    administrations: pickItems(healthBundle, ["medication_records", "medication_administrations", "administrations", "items"]).map(mapMedicationAdministration),
  };

  if (!hasUsableData(data)) return buildFallbackData();
  return { ...data, isFallback: false };
}

function buildCurrentMedication(data) {
  return sortNewest(
    data.medications.filter((item) => !["stopped", "ended", "discontinued"].includes(lower(item.status))),
    ["updated_at", "start_date", "created_at"]
  ).slice(0, 8);
}

function buildDueMedication(data) {
  return sortSoonest(
    data.administrations.filter((item) => ["due", "due_soon", "scheduled", "pending"].includes(lower(item.status))),
    ["due_at", "created_at"]
  ).slice(0, 8);
}

function buildRecentAdministration(data) {
  return sortNewest(
    data.administrations.filter((item) => item.administered_at || ["administered", "completed"].includes(lower(item.status))),
    ["administered_at", "updated_at", "created_at"]
  ).slice(0, 8);
}

function buildMissedMedication(data) {
  return sortNewest(
    data.administrations.filter((item) => ["missed", "refused", "error"].includes(lower(item.status))),
    ["due_at", "updated_at", "created_at"]
  ).slice(0, 8);
}

export async function loadCurrentView() {
  if (!els.viewContent) return;

  const youngPersonId = getYoungPersonId();

  if (!youngPersonId) {
    els.viewContent.innerHTML = renderEmpty(
      "No young person selected",
      "Select a young person to view medication."
    );
    updateWorkspaceSummaryStrip({
      today: "No medication context",
      nextEvent: "No medication due",
      lastRecord: "No medication data",
      openActions: "No MAR actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div><div class="spinner" aria-hidden="true"></div><p>Loading medication...</p></div>
      </div>
    </section>
  `;

  try {
    const data = await fetchAll(youngPersonId);

    const currentMedication = buildCurrentMedication(data);
    const dueMedication = buildDueMedication(data);
    const recentAdministration = buildRecentAdministration(data);
    const missedMedication = buildMissedMedication(data);

    els.viewContent.innerHTML = renderWorkspace({
      currentMedication,
      dueMedication,
      recentAdministration,
      missedMedication,
      isFallback: Boolean(data.isFallback),
    });

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${currentMedication.length} meds • preview mode`
        : `${currentMedication.length} current medication`,
      nextEvent: dueMedication[0]?.due_at
        ? `Due ${formatDateTime(dueMedication[0].due_at)}`
        : "No medication due",
      lastRecord: recentAdministration[0]?.administered_at
        ? `Last given ${formatDateTime(recentAdministration[0].administered_at)}`
        : "No recent administration",
      openActions: `${missedMedication.length} missed or refused`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[medication] load failed", error);
    els.viewContent.innerHTML = renderEmpty(
      "Unable to load medication",
      error?.message || "Something went wrong while loading medication."
    );
    updateWorkspaceSummaryStrip({
      today: "Medication unavailable",
      nextEvent: "No medication due",
      lastRecord: "No medication data",
      openActions: "Check medication routes",
    });
  }
}