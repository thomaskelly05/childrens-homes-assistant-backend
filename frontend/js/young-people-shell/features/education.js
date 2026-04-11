import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection } from "../ui/records.js";
import { mapBundle, mapEducationRecord } from "../core/adapters.js";

function renderEducationProfileCards(profile = {}) {
  return `
    <div class="profile-grid">
      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-education">
        <div class="profile-card-title">School / provision</div>
        <div class="profile-card-text">${escapeHtml(profile.school_name || "Not recorded")}</div>
        <div class="profile-card-subtext">${escapeHtml(profile.education_status || "No status recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-education">
        <div class="profile-card-title">Learning support</div>
        <div class="profile-card-text">${escapeHtml(profile.support_summary || "Not recorded")}</div>
        <div class="profile-card-subtext">${escapeHtml(profile.sen_status || "No SEN summary recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-education">
        <div class="profile-card-title">EHCP / PEP</div>
        <div class="profile-card-text">${escapeHtml(profile.ehcp_details || "No EHCP details recorded")}</div>
        <div class="profile-card-subtext">${escapeHtml(profile.pep_status || "No PEP status recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-action-router="edit-profile-education">
        <div class="profile-card-title">Attendance baseline</div>
        <div class="profile-card-text">${escapeHtml(
          profile.attendance_baseline != null && profile.attendance_baseline !== ""
            ? String(profile.attendance_baseline)
            : "Not recorded"
        )}</div>
        <div class="profile-card-subtext">${escapeHtml(profile.designated_teacher || "No designated teacher recorded")}</div>
      </button>
    </div>
  `;
}

function buildAchievementRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "achievement_record",
    title: item.title || item.achievement_type || "Achievement",
    summary:
      [
        item.description || null,
        item.child_voice || null,
        item.significance || null,
      ].filter(Boolean).join(" • ") || "Achievement record",
    record_date: item.achievement_date || item.created_at || null,
    status: item.archived ? "archived" : "current",
    source: item.source || "",
    significance: item.significance || "",
  }));
}

export async function loadEducation() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading education and learning...</p>
      </div>
    </div>
  `;

  try {
    const [
      youngPersonData,
      educationData,
      achievementsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/education`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/achievements`).catch(() => ({ items: [] })),
    ]);

    const bundle = mapBundle(youngPersonData.bundle || youngPersonData);
    const educationProfile = bundle.education_profile || {};

    const educationRecords = (
      educationData.education_records ||
      educationData.items ||
      educationData.records ||
      []
    ).map(mapEducationRecord);

    const achievementRows = buildAchievementRows(
      achievementsData.items ||
        achievementsData.records ||
        achievementsData.achievement_records ||
        []
    );

    const attendanceConcerns = educationRecords.filter((item) =>
      ["absent", "late", "refused"].includes(String(item.attendance_status || "").toLowerCase())
    );

    els.viewContent.innerHTML = `
      ${renderSection(
        "Education profile",
        "Core school, learning and support information.",
        renderEducationProfileCards(educationProfile)
      )}

      ${renderSection(
        "Education records",
        "Attendance, behaviour, engagement, issues raised and action taken.",
        renderRowList(educationRecords, "No education records found.")
      )}

      ${renderSection(
        "Attendance concerns",
        "Recent attendance issues that may need follow-up.",
        renderRowList(attendanceConcerns, "No attendance concerns found.")
      )}

      ${renderSection(
        "Achievements",
        "Positive progress, successes and strengths in learning.",
        renderRowList(achievementRows, "No achievement records found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load education and learning.")}</p>
      </div>
    `;
  }
}
