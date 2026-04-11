import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection } from "../ui/records.js";
import { mapBundle, mapHealthRecord, mapAppointment } from "../core/adapters.js";

function renderProfileCards(health = {}) {
  return `
    <div class="profile-grid">
      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-health">
        <div class="profile-card-title">Mental health</div>
        <div class="profile-card-text">${escapeHtml(health.mental_health_summary || "Not recorded")}</div>
        <div class="profile-card-subtext">Current wellbeing overview</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-health">
        <div class="profile-card-title">Medication</div>
        <div class="profile-card-text">${escapeHtml(health.medication_summary || "Not recorded")}</div>
        <div class="profile-card-subtext">Medication and current support</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-health">
        <div class="profile-card-title">Allergies and diagnoses</div>
        <div class="profile-card-text">${escapeHtml(health.allergies || "No allergies recorded")}</div>
        <div class="profile-card-subtext">${escapeHtml(health.diagnoses || "No diagnoses recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-health">
        <div class="profile-card-title">Professionals</div>
        <div class="profile-card-text">${escapeHtml(health.gp_name || "GP not recorded")}</div>
        <div class="profile-card-subtext">${escapeHtml(
          [health.dentist_name, health.optician_name].filter(Boolean).join(" • ") || "Other professionals not recorded"
        )}</div>
      </button>
    </div>
  `;
}

function buildMedicationRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_profile",
    title: item.medication_name || "Medication",
    summary: [
      item.dosage || item.dose || null,
      item.frequency || null,
      item.reason || null,
    ]
      .filter(Boolean)
      .join(" • ") || "Medication profile",
    start_date: item.start_date || null,
    review_date: item.end_date || null,
    status: item.is_active ? "active" : "inactive",
    notes: item.notes || "",
    professional_name: item.prescribed_by || "",
  }));
}

function buildMedicationAdminRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "medication_record",
    title: item.medication_name || "Medication administration",
    summary: [
      item.dose || null,
      item.route || null,
      item.status || null,
    ]
      .filter(Boolean)
      .join(" • ") || "Medication record",
    start_datetime: item.administered_time || item.scheduled_time || null,
    status: item.status || "",
    outcome: item.error_details || item.refusal_reason || item.omission_reason || "",
  }));
}

export async function loadHealth() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading health and wellbeing...</p>
      </div>
    </div>
  `;

  try {
    const [
      youngPersonData,
      healthData,
      appointmentsData,
      medicationProfilesData,
      medicationRecordsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/health`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/medication-profiles`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/medication-records`).catch(() => ({ items: [] })),
    ]);

    const bundle = mapBundle(youngPersonData.bundle || youngPersonData);
    const healthProfile =
      bundle.health_profile ||
      bundle.young_person_health_profile ||
      {};

    const healthRecords = (
      healthData.health_records ||
      healthData.items ||
      healthData.records ||
      []
    ).map(mapHealthRecord);

    const appointments = (
      appointmentsData.items ||
      appointmentsData.records ||
      appointmentsData.appointments ||
      appointmentsData.young_person_appointments ||
      []
    )
      .map(mapAppointment)
      .filter((item) => {
        const type = String(item.appointment_type || "").toLowerCase();
        const title = String(item.title || "").toLowerCase();
        return (
          type.includes("health") ||
          type.includes("medical") ||
          type.includes("camhs") ||
          type.includes("gp") ||
          type.includes("dent") ||
          type.includes("opt") ||
          title.includes("health") ||
          title.includes("medical") ||
          title.includes("gp") ||
          title.includes("dentist") ||
          title.includes("optician")
        );
      });

    const medicationProfiles = buildMedicationRows(
      medicationProfilesData.items ||
        medicationProfilesData.records ||
        medicationProfilesData.medication_profiles ||
        []
    );

    const medicationRecords = buildMedicationAdminRows(
      medicationRecordsData.items ||
        medicationRecordsData.records ||
        medicationRecordsData.medication_records ||
        []
    );

    els.viewContent.innerHTML = `
      ${renderSection(
        "Health profile",
        "Core health information adults should keep in mind.",
        renderProfileCards(healthProfile)
      )}

      ${renderSection(
        "Health records",
        "Appointments, outcomes, follow-up and notable health events.",
        renderRowList(healthRecords, "No health records found.")
      )}

      ${renderSection(
        "Upcoming health appointments",
        "Appointments that may need preparation or follow-up.",
        renderRowList(appointments, "No upcoming health appointments found.")
      )}

      ${renderSection(
        "Medication profiles",
        "Current medication guidance and prescribing information.",
        renderRowList(medicationProfiles, "No medication profiles found.")
      )}

      ${renderSection(
        "Medication records",
        "Recent medication administration activity.",
        renderRowList(medicationRecords, "No medication records found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load health and wellbeing.")}</p>
      </div>
    `;
  }
}
