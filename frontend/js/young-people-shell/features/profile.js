import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, renderAvatar } from "../core/utils.js";

function bindEditableCards() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll(".editable-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const mod = await import("../composer/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

function renderProfileCard(yp = {}, bundle = {}) {
  const communication = bundle.communication_profile || {};
  const identity = bundle.identity_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const legal = bundle.legal_status || {};

  const fullName =
    [yp.first_name, yp.last_name].filter(Boolean).join(" ").trim() ||
    yp.preferred_name ||
    "Young person";

  return `
    <section class="profile-hero-card">
      <div class="profile-hero-top">
        <div class="profile-hero-avatar-wrap">
          ${renderAvatar(yp, "profile-hero-avatar")}
        </div>
        <div class="profile-hero-copy">
          <div class="profile-hero-name">${escapeHtml(fullName)}</div>
          <div class="profile-hero-meta">
            ${escapeHtml(
              [
                yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
                yp.date_of_birth ? `DOB: ${new Date(yp.date_of_birth).toLocaleDateString("en-GB")}` : null,
                yp.home_name || null,
              ]
                .filter(Boolean)
                .join(" • ") || "Young person profile"
            )}
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <div class="profile-card editable-card" data-edit-box="identity">
          <div class="profile-card-title">About me</div>
          <div class="profile-card-text">${escapeHtml(identity.interests || "No interests recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(identity.strengths_summary || "No strengths summary recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="communication">
          <div class="profile-card-title">How to support me well</div>
          <div class="profile-card-text">${escapeHtml(communication.what_helps || "No support guidance recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(communication.communication_style || "No communication profile recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="education">
          <div class="profile-card-title">Learning</div>
          <div class="profile-card-text">${escapeHtml(education.school_name || "No education setting recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(education.support_summary || education.education_status || "No learning support summary recorded yet.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="health">
          <div class="profile-card-title">Health and wellbeing</div>
          <div class="profile-card-text">${escapeHtml(health.mental_health_summary || health.medication_summary || "No health summary recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(health.allergies || "No allergies recorded.")}</div>
        </div>

        <div class="profile-card editable-card" data-edit-box="network">
          <div class="profile-card-title">Important adults</div>
          <div class="profile-card-text">${escapeHtml(legal.social_worker_name || "No named social worker recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(legal.local_authority || legal.legal_status || "No network summary recorded yet.")}</div>
        </div>
      </div>
    </section>
  `;
}

export async function loadProfile() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const bundle = data.bundle || {};
  const yp = bundle.young_person || data.young_person || state.youngPerson || {};

  if (!els.viewContent) return;

  els.viewContent.innerHTML = renderProfileCard(yp, bundle);
  bindEditableCards();
}
