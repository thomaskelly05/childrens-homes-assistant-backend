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

function renderFamilyCards(profile = {}) {
  return `
    <div class="profile-grid">
      <button class="profile-card editable-card" type="button" data-open-family-edit="important-people">
        <div class="profile-card-title">Important people</div>
        <div class="profile-card-text">${escapeHtml(profile.important_people || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-family-edit="contact-arrangements">
        <div class="profile-card-title">Contact arrangements</div>
        <div class="profile-card-text">${escapeHtml(profile.contact_arrangements || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-family-edit="relationship-summary">
        <div class="profile-card-title">Relationship summary</div>
        <div class="profile-card-text">${escapeHtml(profile.relationship_summary || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-open-family-edit="support-needed">
        <div class="profile-card-title">Support around family time</div>
        <div class="profile-card-text">${escapeHtml(profile.support_needed || "Not recorded")}</div>
      </button>
    </div>
  `;
}

function bindFamilyActions() {
  els.viewContent?.querySelectorAll("[data-open-family-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mod = await import("../ui/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

export async function loadFamily() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading family and relationships...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${state.youngPersonId}/family`).catch(() => ({}));
  const profile = data.family_profile || {};
  const records = data.family_contact_records || data.items || [];

  els.viewContent.innerHTML = `
    ${renderSection(
      "Family and relationships",
      profile.relationship_summary || "Important people, contact and family context.",
      renderFamilyCards(profile)
    )}

    ${renderSection(
      "Family records",
      "Family time, contact updates and relationship entries.",
      renderRowList(records, "No family or relationship records found.")
    )}
  `;

  bindFamilyActions();
}
