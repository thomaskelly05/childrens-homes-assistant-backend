import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapEducationRecord,
  mapEducationProfile,
  mapAchievementRecord,
} from "../core/adapters.js";

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function buildEducationRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "education_record",
    title: item.provision_name || item.title || "Education record",
    summary:
      item.learning_engagement ||
      item.behaviour_summary ||
      item.issue_raised ||
      "Education update",
    record_date: item.record_date || null,
    created_at: item.created_at || null,
    status: item.workflow_status || "",
    significance: item.significance || "",
  }));
}

function buildAchievementRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "achievement_record",
    title: item.title || item.achievement_type || "Achievement",
    summary:
      item.description ||
      item.child_voice ||
      item.significance ||
      "Achievement",
    achievement_date: item.achievement_date || null,
    created_at: item.created_at || null,
    status: item.archived ? "Archived" : "Active",
  }));
}

function renderEducationProfile(profile = {}) {
  const items = [
    { label: "School", value: profile.school_name },
    { label: "Year group", value: profile.year_group },
    { label: "Education status", value: profile.education_status },
    { label: "SEN status", value: profile.sen_status },
    { label: "Designated teacher", value: profile.designated_teacher },
    {
      label: "Attendance baseline",
      value:
        profile.attendance_baseline !== null &&
        profile.attendance_baseline !== undefined &&
        profile.attendance_baseline !== ""
          ? String(profile.attendance_baseline)
          : "",
    },
    { label: "PEP status", value: profile.pep_status },
    { label: "EHCP details", value: profile.ehcp_details },
    { label: "Support summary", value: profile.support_summary },
  ].filter((item) => item.value);

  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No education profile recorded yet.</p>
      </div>
    `;
  }

  return `
    <div class="profile-grid">
      ${items
        .map(
          (item) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(item.label)}</div>
              <div class="profile-card-text">${escapeHtml(item.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function buildHeadlineStats(records = []) {
  const attendanceConcerns = records.filter((item) => {
    const value = String(item.attendance_status || "").toLowerCase();
    return ["absent", "late", "refused", "not_attending"].includes(value);
  }).length;

  const followUps = records.filter((item) => item.follow_up_required).length;

  const issuesRaised = records.filter((item) => item.issue_raised).length;

  return { attendanceConcerns, followUps, issuesRaised };
}

export async function loadEducation() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading education data...</p>
      </div>
    </div>
  `;

  try {
    const [educationData, profileData, achievementsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/education-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/education-profile`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/achievements`).catch(() => ({ items: [] })),
    ]);

    const educationRecords = sortNewestFirst(
      (
        educationData.items ||
        educationData.records ||
        educationData.education_records ||
        []
      ).map(mapEducationRecord),
      ["record_date", "created_at"]
    );

    const educationProfile = mapEducationProfile(
      profileData.education_profile ||
        profileData.young_person_education_profile ||
        profileData.item ||
        profileData
    );

    const achievements = sortNewestFirst(
      (
        achievementsData.items ||
        achievementsData.records ||
        achievementsData.achievement_records ||
        []
      ).map(mapAchievementRecord),
      ["achievement_date", "created_at"]
    );

    const stats = buildHeadlineStats(educationRecords);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Education records", educationRecords.length)}
        ${renderSummaryStat("Attendance concerns", stats.attendanceConcerns)}
        ${renderSummaryStat("Follow-up required", stats.followUps)}
        ${renderSummaryStat("Achievements", achievements.length)}
      </section>

      ${renderSection(
        "Education profile",
        "School, learning context and education support needs.",
        renderEducationProfile(educationProfile)
      )}

      ${renderSection(
        "Education records",
        "Attendance, engagement, issues and actions taken.",
        renderRowList(buildEducationRows(educationRecords), "No education records found.")
      )}

      ${renderSection(
        "Achievements",
        "Progress, success and strengths linked to education and wider development.",
        renderRowList(buildAchievementRows(achievements), "No achievements found.")
      )}

      ${renderSection(
        "Records needing attention",
        "Education records with follow-up, attendance issues or concerns raised.",
        renderRowList(
          buildEducationRows(
            educationRecords.filter(
              (item) =>
                item.follow_up_required ||
                item.issue_raised ||
                ["absent", "late", "refused", "not_attending"].includes(
                  String(item.attendance_status || "").toLowerCase()
                )
            )
          ),
          "No education concerns needing attention."
        )
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load education data.")}</p>
      </div>
    `;
  }
}