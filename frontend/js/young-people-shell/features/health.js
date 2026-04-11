import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapHealthRecord,
  mapMedicationProfile,
  mapMedicationRecord,
  mapAppointment,
} from "../core/adapters.js";

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
    summary: `${item.dose || item.dosage || ""} • ${item.frequency || ""}`,
    start_date: item.start_date,
    end_date: item.end_date,
    status: item.is_active ? "Active" : "Inactive",
  }));
}

function buildMedicationRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_record",
    title: item.medication_name || "Medication",
    summary: `${item.dose || ""} • ${item.status || ""}`,
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
    summary: `${item.location || ""} ${item.professional_name ? "• " + item.professional_name : ""}`,
    start_datetime: item.start_datetime || item.appointment_date,
    end_datetime: item.end_datetime,
    status: item.status || "",
  }));
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

    const activeMeds = medicationProfiles.filter((m) => m.is_active);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Health records", healthRecords.length)}
        ${renderSummaryStat("Active meds", activeMeds.length)}
        ${renderSummaryStat("Medication logs", medicationRecords.length)}
        ${renderSummaryStat("Appointments", appointments.length)}
      </section>

      ${renderSection(
        "Upcoming & recent appointments",
        "Health-related appointments and professional involvement.",
        renderRowList(buildAppointmentRows(appointments), "No appointments found.")
      )}

      ${renderSection(
        "Health records",
        "Health events, outcomes and follow-up actions.",
        renderRowList(buildHealthRows(healthRecords), "No health records found.")
      )}

      ${renderSection(
        "Medication profiles",
        "Prescribed medications and guidance.",
        renderRowList(buildMedicationProfileRows(medicationProfiles), "No medication profiles found.")
      )}

      ${renderSection(
        "Medication administration",
        "Medication logs and administration records.",
        renderRowList(buildMedicationRecordRows(medicationRecords), "No medication records found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load health data.")}</p>
      </div>
    `;
  }
}