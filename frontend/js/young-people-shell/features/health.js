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

function renderHealthCards(profile = {}) {
  return `
    <div class="profile-grid">
      <button class="profile-card editable-card" type="button" data-open-health-edit="gp">
        <div class="profile-card-title">GP</div>
        <div class="profile-card-text">${escapeHtml(profile.gp_name || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-health-edit="allergies">
        <div class="profile-card-title">Allergies</div>
        <div class="profile-card-text">${escapeHtml(profile.allergies || "None recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-health-edit="diagnoses">
        <div class="profile-card-title">Diagnoses</div>
        <div class="profile-card-text">${escapeHtml(profile.diagnoses || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-health-edit="medication">
        <div class="profile-card-title">Medication</div>
        <div class="profile-card-text">${escapeHtml(profile.medication_summary || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-health-edit="wellbeing">
        <div class="profile-card-title">Emotional wellbeing</div>
        <div class="profile-card-text">${escapeHtml(profile.mental_health_summary || "Not recorded")}</div>
      </button>
    </div>
  `;
}

function bindHealthActions() {
  els.viewContent?.querySelectorAll("[data-open-health-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mod = await import("../ui/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

export async function loadHealth() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading health...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);
  const profile = data.health_profile || {};
  const records = data.health_records || [];

  els.viewContent.innerHTML = `
    ${renderSection(
      "Health and wellbeing",
      profile.medication_summary || profile.mental_health_summary || "Current wellbeing information.",
      renderHealthCards(profile)
    )}

    ${renderSection(
      "Health records",
      "Appointments, updates and health-related entries.",
      renderRowList(records, "No health records found.")
    )}
  `;

  bindHealthActions();
}
