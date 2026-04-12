import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  mapHealthRecord,
  mapMedicationProfile,
  mapMedicationRecord,
  mapAppointment,
} from "../core/adapters.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDateTime(value) {
  if (!value) return "";
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

function buildHealthRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "health_record",
    title: item.title || item.record_type || "Health record",
    summary: item.summary || item.outcome || "Health update",
    event_datetime: item.event_datetime,
    created_at: item.created_at,
    status: item.workflow_status || "",
    significance: item.significance || "",
  }));
}

function buildMedicationProfileRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_profile",
    title: item.medication_name || "Medication",
    summary: [item.dose || item.dosage || "", item.frequency || ""].filter(Boolean).join(" • "),
    start_date: item.start_date,
    end_date: item.end_date,
    status: item.is_active ? "active" : "inactive",
  }));
}

function buildMedicationRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_record",
    title: item.medication_name || "Medication",
    summary: [item.dose || "", item.status || ""].filter(Boolean).join(" • "),
    scheduled_time: item.scheduled_time,
    administered_time: item.administered_time,
    status: item.status || "",
  }));
}

function buildAppointmentRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "appointment",
    title: item.title || item.appointment_type || "Appointment",
    summary: [item.location || "", item.professional_name || ""].filter(Boolean).join(" • "),
    start_datetime: item.start_datetime || item.appointment_date,
    end_datetime: item.end_datetime,
    status: item.status || "",
  }));
}

function getRowMeta(item = {}) {
  return (
    item.start_datetime ||
    item.event_datetime ||
    item.administered_time ||
    item.scheduled_time ||
    item.start_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();

  if (["overdue", "missed", "refused", "escalated"].includes(status) || ["high", "critical"].includes(significance)) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["active", "completed", "administered"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: status ? status.replaceAll("_", " ") : "Recorded", tone: "muted" };
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No records found.") {
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
                ${getRowMeta(item) ? `<div class="record-row-meta">${toText(formatDateTime(getRowMeta(item)))}</div>` : ""}
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

function renderHealthHtml({
  healthRecords = [],
  medicationProfiles = [],
  medicationRecords = [],
  appointments = [],
}) {
  const activeMeds = medicationProfiles.filter((m) => m.is_active);

  const appointmentRows = buildAppointmentRows(appointments);
  const healthRows = buildHealthRows(healthRecords);
  const medicationProfileRows = buildMedicationProfileRows(medicationProfiles);
  const medicationRecordRows = buildMedicationRecordRows(medicationRecords);

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Health</div>
          <h2>Health and wellbeing</h2>
          <p>Appointments, health updates, medication information and administration records.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Health records</span>
              <strong class="overview-stat-value">${toText(healthRecords.length)}</strong>
              <span class="overview-stat-note">Recorded health updates</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Active meds</span>
              <strong class="overview-stat-value">${toText(activeMeds.length)}</strong>
              <span class="overview-stat-note">Current medication profiles</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Medication logs</span>
              <strong class="overview-stat-value">${toText(medicationRecords.length)}</strong>
              <span class="overview-stat-note">Administration records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Appointments</span>
              <strong class="overview-stat-value">${toText(appointments.length)}</strong>
              <span class="overview-stat-note">Health-related appointments</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Upcoming and recent appointments</h3>
              <p>Health-related appointments and professional involvement.</p>
            </div>

            ${renderRecordRows(appointmentRows, "No appointments found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Health records</h3>
              <p>Health events, outcomes and follow-up actions.</p>
            </div>

            ${renderRecordRows(healthRows, "No health records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Medication profiles</h3>
              <p>Prescribed medications and guidance.</p>
            </div>

            ${renderRecordRows(medicationProfileRows, "No medication profiles found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Medication administration</h3>
              <p>Medication logs and administration records.</p>
            </div>

            ${renderRecordRows(medicationRecordRows, "No medication records found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadHealth() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading health data...</p>
      </div>
    </div>
  `;

  try {
    const [
      healthData,
      medicationProfilesData,
      medicationRecordsData,
      appointmentsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/health-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/medication-profiles`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/medication-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
    ]);

    const healthRecords = (
      healthData.items ||
      healthData.records ||
      healthData.health_records ||
      []
    ).map(mapHealthRecord);

    const medicationProfiles = (
      medicationProfilesData.items ||
      medicationProfilesData.records ||
      medicationProfilesData.medication_profiles ||
      []
    ).map(mapMedicationProfile);

    const medicationRecords = (
      medicationRecordsData.items ||
      medicationRecordsData.records ||
      medicationRecordsData.medication_records ||
      []
    ).map(mapMedicationRecord);

    const appointments = (
      appointmentsData.items ||
      appointmentsData.records ||
      appointmentsData.appointments ||
      []
    ).map(mapAppointment);

    els.viewContent.innerHTML = renderHealthHtml({
      healthRecords,
      medicationProfiles,
      medicationRecords,
      appointments,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load health data.")}</p>
      </div>
    `;
  }
}
