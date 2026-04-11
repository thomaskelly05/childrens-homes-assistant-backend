import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList } from "../ui/records.js";

function renderSection(title, subtitle, body) {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

function renderEducationCards(profile = {}) {
  return `
    <div class="profile-grid">
      <button class="profile-card editable-card" type="button" data-open-education-edit="school">
        <div class="profile-card-title">School / provision</div>
        <div class="profile-card-text">${escapeHtml(profile.school_name || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-education-edit="attendance">
        <div class="profile-card-title">Attendance</div>
        <div class="profile-card-text">${escapeHtml(profile.attendance || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-education-edit="needs">
        <div class="profile-card-title">Learning needs</div>
        <div class="profile-card-text">${escapeHtml(profile.learning_needs || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-education-edit="progress">
        <div class="profile-card-title">Progress</div>
        <div class="profile-card-text">${escapeHtml(profile.progress_summary || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-education-edit="targets">
        <div class="profile-card-title">Targets</div>
        <div class="profile-card-text">${escapeHtml(profile.targets || "Not recorded")}</div>
      </button>
    </div>
  `;
}

function bindEducationActions() {
  els.viewContent?.querySelectorAll("[data-open-education-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mod = await import("../ui/composer.js");
      mod.openComposerFor("education_record", "create");
    });
  });
}

export async function loadEducation() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading education...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || {};
  const records = data.education_records || [];

  els.viewContent.innerHTML = `
    ${renderSection(
      "Education overview",
      profile.school_name || "Current education information.",
      renderEducationCards(profile)
    )}

    ${renderSection(
      "Education records",
      "Attendance, progress and education-related entries.",
      renderRowList(records, "No education records found.")
    )}
  `;

  bindEducationActions();
}
