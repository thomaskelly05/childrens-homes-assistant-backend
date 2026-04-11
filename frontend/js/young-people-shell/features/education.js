import { state } from "../state.js";
import { els } from "../dom.js";
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

function renderProfileGrid(profile = {}) {
  return `
    <div class="profile-grid">
      <div class="profile-card editable-card">
        <div class="profile-card-title">Setting</div>
        <div class="profile-card-text">${escapeHtml(profile.school_name || "Not recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Year group</div>
        <div class="profile-card-text">${escapeHtml(profile.year_group || "Not recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Current status</div>
        <div class="profile-card-text">${escapeHtml(profile.education_status || "Not recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Support summary</div>
        <div class="profile-card-text">${escapeHtml(profile.support_summary || "Not recorded")}</div>
      </div>
    </div>
  `;
}

function bindEditableCards() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll(".editable-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const mod = await import("../composer/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

function bindDynamicOpenRecordButtons() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const item = JSON.parse(btn.dataset.openRecord);
        const mod = await import("../ui/records.js");
        mod.openRecordDetail(item);
      } catch {
        // ignore
      }
    });
  });
}

export async function loadEducation() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || {};
  const records = data.education_records || data.items || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Education and learning",
      profile.support_summary || "Learning, attendance, progress and support.",
      renderProfileGrid(profile)
    )}

    ${renderSection(
      "Education records",
      "Attendance, progress and significant learning updates.",
      renderRowList(records, "No education records found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
  bindEditableCards();
}
