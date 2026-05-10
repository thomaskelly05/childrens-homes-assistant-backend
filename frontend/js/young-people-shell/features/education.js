import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
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
      item.action_taken ||
      "Education update",
    record_date: item.record_date || null,
    created_at: item.created_at || null,
    status: item.workflow_status || "",
    significance: item.significance || "",
    follow_up_required: !!item.follow_up_required,
    issue_raised: item.issue_raised || "",
    attendance_status: item.attendance_status || "",
    achievement_note: item.achievement_note || "",
    professional_involved: item.professional_involved || "",
    child_voice: item.child_voice || "",
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
    status: item.archived ? "archived" : "active",
    source: item.source || "",
    significance: item.significance || "",
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
          ? `${profile.attendance_baseline}%`
          : "",
    },
    { label: "PEP status", value: profile.pep_status },
    { label: "EHCP details", value: profile.ehcp_details },
    { label: "Support summary", value: profile.support_summary },
  ].filter((item) => item.value);

  if (!items.length) {
    return renderEmptyState("No education profile recorded yet.");
  }

  return `
    <div class="record-list">
      ${items
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.label)}</div>
                <div class="record-row-summary">${toText(item.value)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Profile</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildHeadlineStats(records = [], achievements = []) {
  const attendanceConcerns = records.filter((item) => {
    const value = String(item.attendance_status || "").toLowerCase();
    return ["absent", "late", "refused", "not_attending"].includes(value);
  }).length;

  const followUps = records.filter((item) => item.follow_up_required).length;
  const issuesRaised = records.filter((item) => item.issue_raised).length;
  const positives = achievements.length + records.filter((item) => item.achievement_note).length;

  return { attendanceConcerns, followUps, issuesRaised, positives };
}

function buildConcernRows(records = []) {
  return records.filter(
    (item) =>
      item.follow_up_required ||
      item.issue_raised ||
      ["absent", "late", "refused", "not_attending"].includes(
        String(item.attendance_status || "").toLowerCase()
      )
  );
}

function buildPositiveRows(records = [], achievements = []) {
  const educationPositives = records
    .filter((item) => item.achievement_note)
    .map((item) => ({
      id: `edu-positive-${item.id}`,
      record_type: "education_record",
      title: item.provision_name || item.title || "Education positive",
      summary: item.achievement_note,
      achievement_date: item.record_date || item.created_at || null,
      created_at: item.created_at || null,
      status: "active",
    }));

  return [...buildAchievementRows(achievements), ...educationPositives].slice(0, 12);
}

function getRowMeta(item = {}) {
  return item.record_date || item.achievement_date || item.created_at || "";
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();
  const attendanceStatus = String(item.attendance_status || "").toLowerCase();

  if (
    ["high", "critical"].includes(significance) ||
    ["absent", "late", "refused", "not_attending"].includes(attendanceStatus) ||
    item.follow_up_required
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (status === "archived") {
    return { label: "archived", tone: "muted" };
  }

  if (status) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: "Recorded", tone: "muted" };
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
                ${getRowMeta(item) ? `<div class="record-row-meta">${toText(formatDateValue(getRowMeta(item)))}</div>` : ""}
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

function renderEducationHtml({
  educationRecords = [],
  educationProfile = {},
  achievements = [],
  stats,
}) {
  const educationRows = buildEducationRows(educationRecords);
  const achievementRows = buildAchievementRows(achievements);
  const concernRows = buildConcernRows(educationRows);
  const positiveRows = buildPositiveRows(educationRows, achievements);

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Education</div>
          <h2>Learning and education</h2>
          <p>School profile, learning records, achievements and education concerns needing attention.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Education records</span>
              <strong class="overview-stat-value">${toText(educationRecords.length)}</strong>
              <span class="overview-stat-note">Recorded education updates</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Attendance concerns</span>
              <strong class="overview-stat-value">${toText(stats.attendanceConcerns)}</strong>
              <span class="overview-stat-note">Absence, lateness or non-attendance</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Follow-up required</span>
              <strong class="overview-stat-value">${toText(stats.followUps)}</strong>
              <span class="overview-stat-note">Records needing action</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Positives</span>
              <strong class="overview-stat-value">${toText(stats.positives)}</strong>
              <span class="overview-stat-note">Achievements and strengths recorded</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Education profile</h3>
              <p>School, learning context and education support needs.</p>
            </div>

            ${renderEducationProfile(educationProfile)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Education records</h3>
              <p>Attendance, engagement, issues and actions taken.</p>
            </div>

            ${renderRecordRows(educationRows, "No education records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Achievements and positives</h3>
              <p>Progress, success and strengths linked to education and wider development.</p>
            </div>

            ${renderRecordRows(positiveRows, "No achievements or positives found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Records needing attention</h3>
              <p>Education records with follow-up, attendance issues or concerns raised.</p>
            </div>

            ${renderRecordRows(concernRows, "No education concerns needing attention.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Achievement records</h3>
              <p>Formal achievements already recorded.</p>
            </div>

            ${renderRecordRows(achievementRows, "No achievements found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
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
        educationData.achievement_records ||
        educationData.education_records ||
        []
      ).map(mapAchievementRecord),
      ["achievement_date", "created_at"]
    );

    const stats = buildHeadlineStats(educationRecords, achievements);

    els.viewContent.innerHTML = renderEducationHtml({
      educationRecords,
      educationProfile,
      achievements,
      stats,
    });

    const latestEducationRecord = educationRecords[0];
    const nextConcern = educationRecords.find(
      (item) =>
        item.follow_up_required ||
        ["absent", "late", "refused", "not_attending"].includes(
          String(item.attendance_status || "").toLowerCase()
        )
    );

    updateWorkspaceSummaryStrip({
      today: `${educationRecords.length} education records • ${achievements.length} achievements`,
      nextEvent: nextConcern
        ? `${nextConcern.provision_name || "Education concern"} • ${formatDateValue(
            nextConcern.record_date || nextConcern.created_at
          )}`
        : "No immediate education concern",
      lastRecord: latestEducationRecord
        ? `Latest education update ${formatDateValue(
            latestEducationRecord.record_date || latestEducationRecord.created_at
          )}`
        : "No recent education record",
      openActions: `${stats.followUps} follow-up item${stats.followUps === 1 ? "" : "s"}`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load education data.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Education unavailable",
      nextEvent: "Unable to load education view",
      lastRecord: "No education data loaded",
      openActions: "Check API responses",
    });
  }
}