import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  mapHealthRecord,
  mapMedicationProfile,
  mapMedicationRecord,
  mapAppointment,
} from "../core/adapters.js";

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isFuture(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function buildHealthRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "health_record",
    title: item.title || item.record_type || "Health record",
    summary:
      item.summary ||
      item.outcome ||
      item.professional_name ||
      "Health update",
    event_datetime: item.event_datetime,
    created_at: item.created_at,
    status: item.workflow_status || "",
    significance: item.significance || "",
    professional_name: item.professional_name || "",
    next_action_date: item.next_action_date || null,
  }));
}

function buildMedicationProfileRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_profile",
    title: item.medication_name || "Medication",
    summary: [
      item.dosage || item.dose || "",
      item.frequency || "",
      item.route || "",
      item.reason || "",
    ]
      .filter(Boolean)
      .join(" • "),
    start_date: item.start_date,
    end_date: item.end_date,
    status: item.is_active ? "active" : "inactive",
    notes: item.notes || "",
    reason: item.reason || "",
  }));
}

function buildMedicationRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_record",
    title: item.medication_name || "Medication",
    summary: [
      item.dose || "",
      item.route || "",
      item.status || "",
      item.refusal_reason || item.omission_reason || "",
    ]
      .filter(Boolean)
      .join(" • "),
    scheduled_time: item.scheduled_time,
    administered_time: item.administered_time,
    status: item.status || "",
    error_flag: !!item.error_flag,
    error_details: item.error_details || "",
  }));
}

function buildAppointmentRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "appointment",
    title: item.title || item.appointment_type || "Appointment",
    summary: [
      item.location || "",
      item.professional_name || "",
      item.professional_role || "",
      item.status || "",
    ]
      .filter(Boolean)
      .join(" • "),
    start_datetime: item.start_datetime || item.appointment_date,
    end_datetime: item.end_datetime,
    status: item.status || "",
    outcome_notes: item.outcome_notes || "",
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

  if (
    ["overdue", "missed", "refused", "escalated", "error"].includes(status) ||
    ["high", "critical"].includes(significance) ||
    item.error_flag
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["active", "completed", "administered", "booked", "confirmed"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "success" };
  }

  if (["inactive", "cancelled"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return {
    label: status ? status.replaceAll("_", " ") : "Recorded",
    tone: "muted",
  };
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

function renderHealthSummaryCards({
  healthRecords = [],
  medicationProfiles = [],
  medicationRecords = [],
  appointments = [],
}) {
  const activeMeds = medicationProfiles.filter((m) => m.is_active).length;
  const futureAppointments = appointments.filter((a) =>
    isFuture(a.start_datetime || a.appointment_date)
  ).length;
  const medicationIssues = medicationRecords.filter((m) => {
    const status = String(m.status || "").toLowerCase();
    return m.error_flag || ["refused", "missed", "omitted", "error"].includes(status);
  }).length;

  return `
    <div class="overview-stats-grid">
      <article class="overview-stat-card">
        <span class="overview-stat-label">Health records</span>
        <strong class="overview-stat-value">${toText(healthRecords.length)}</strong>
        <span class="overview-stat-note">Recorded health updates</span>
      </article>

      <article class="overview-stat-card">
        <span class="overview-stat-label">Active meds</span>
        <strong class="overview-stat-value">${toText(activeMeds)}</strong>
        <span class="overview-stat-note">Current medication profiles</span>
      </article>

      <article class="overview-stat-card">
        <span class="overview-stat-label">Medication issues</span>
        <strong class="overview-stat-value">${toText(medicationIssues)}</strong>
        <span class="overview-stat-note">Refusals, omissions or errors</span>
      </article>

      <article class="overview-stat-card">
        <span class="overview-stat-label">Upcoming appointments</span>
        <strong class="overview-stat-value">${toText(futureAppointments)}</strong>
        <span class="overview-stat-note">Future health-related appointments</span>
      </article>
    </div>
  `;
}

function renderHealthHtml({
  healthRecords = [],
  medicationProfiles = [],
  medicationRecords = [],
  appointments = [],
}) {
  const activeMedicationProfiles = medicationProfiles.filter((m) => m.is_active);
  const upcomingAppointments = appointments.filter((a) =>
    isFuture(a.start_datetime || a.appointment_date)
  );
  const recentAppointments = appointments.filter(
    (a) => !isFuture(a.start_datetime || a.appointment_date)
  );
  const medicationConcerns = medicationRecords.filter((m) => {
    const status = String(m.status || "").toLowerCase();
    return m.error_flag || ["refused", "missed", "omitted", "error"].includes(status);
  });

  const appointmentRows = buildAppointmentRows(upcomingAppointments);
  const recentAppointmentRows = buildAppointmentRows(recentAppointments);
  const healthRows = buildHealthRows(healthRecords);
  const medicationProfileRows = buildMedicationProfileRows(activeMedicationProfiles);
  const medicationRecordRows = buildMedicationRecordRows(medicationRecords);
  const medicationConcernRows = buildMedicationRecordRows(medicationConcerns);

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
          ${renderHealthSummaryCards({
            healthRecords,
            medicationProfiles,
            medicationRecords,
            appointments,
          })}

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Upcoming appointments</h3>
              <p>Health-related appointments and professional involvement coming up next.</p>
            </div>

            ${renderRecordRows(appointmentRows, "No upcoming appointments found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Health records</h3>
              <p>Health events, outcomes and follow-up actions.</p>
            </div>

            ${renderRecordRows(healthRows, "No health records found.")}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent appointments</h3>
              <p>Recently completed, cancelled or past appointments.</p>
            </div>

            ${renderRecordRows(recentAppointmentRows, "No recent appointments found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Active medication profiles</h3>
              <p>Prescribed medications and current guidance.</p>
            </div>

            ${renderRecordRows(medicationProfileRows, "No active medication profiles found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Medication concerns</h3>
              <p>Refusals, omissions, errors or other medication records needing attention.</p>
            </div>

            ${renderRecordRows(medicationConcernRows, "No medication concerns found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Medication administration</h3>
              <p>Recent medication logs and administration records.</p>
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

    const healthRecords = sortNewestFirst(
      (
        healthData.items ||
        healthData.records ||
        healthData.health_records ||
        []
      ).map(mapHealthRecord),
      ["event_datetime", "created_at"]
    );

    const medicationProfiles = sortNewestFirst(
      (
        medicationProfilesData.items ||
        medicationProfilesData.records ||
        medicationProfilesData.medication_profiles ||
        []
      ).map(mapMedicationProfile),
      ["start_date", "created_at"]
    );

    const medicationRecords = sortNewestFirst(
      (
        medicationRecordsData.items ||
        medicationRecordsData.records ||
        medicationRecordsData.medication_records ||
        []
      ).map(mapMedicationRecord),
      ["administered_time", "scheduled_time", "created_at"]
    );

    const appointments = sortSoonestFirst(
      (
        appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        []
      ).map(mapAppointment),
      ["start_datetime", "appointment_date", "created_at"]
    );

    els.viewContent.innerHTML = renderHealthHtml({
      healthRecords,
      medicationProfiles,
      medicationRecords,
      appointments,
    });

    const nextAppointment = appointments.find((item) =>
      isFuture(item.start_datetime || item.appointment_date)
    );
    const latestHealthRecord = healthRecords[0];
    const activeMeds = medicationProfiles.filter((m) => m.is_active).length;
    const medConcerns = medicationRecords.filter((m) => {
      const status = String(m.status || "").toLowerCase();
      return m.error_flag || ["refused", "missed", "omitted", "error"].includes(status);
    }).length;

    updateWorkspaceSummaryStrip({
      today: `${healthRecords.length} health records • ${activeMeds} active meds`,
      nextEvent: nextAppointment
        ? `${nextAppointment.title || nextAppointment.appointment_type || "Appointment"} • ${formatDateTime(
            nextAppointment.start_datetime || nextAppointment.appointment_date
          )}`
        : "No upcoming health appointment",
      lastRecord: latestHealthRecord
        ? `Latest health update ${formatDateTime(
            latestHealthRecord.event_datetime || latestHealthRecord.created_at
          )}`
        : "No recent health record",
      openActions: `${medConcerns} medication concern${medConcerns === 1 ? "" : "s"}`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load health data.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Health unavailable",
      nextEvent: "Unable to load appointments",
      lastRecord: "No health data loaded",
      openActions: "Check API responses",
    });
  }
}