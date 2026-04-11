import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, getDisplayName, getProfileImage, initialsFromName } from "../core/utils.js";

function renderProfileCard(yp = {}, bundle = {}) {
  const communication = bundle.communication_profile || {};
  const identity = bundle.identity_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const legal = bundle.legal_status || {};

  const name = getDisplayName(yp);
  const image = getProfileImage(yp);

  return `
    <section class="profile-hero-card">
      <div class="profile-hero-top">
        <div class="profile-hero-avatar-wrap">
          ${
            image
              ? `<img class="profile-hero-avatar" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" />`
              : `<div class="profile-hero-avatar avatar-fallback">${escapeHtml(initialsFromName(name))}</div>`
          }
        </div>

        <div class="profile-hero-copy">
          <div class="profile-hero-name">${escapeHtml(name)}</div>
          <div class="profile-hero-meta">
            ${escapeHtml(
              [
                yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
                yp.date_of_birth ? `DOB: ${yp.date_of_birth}` : null,
                yp.home_name || null,
              ]
                .filter(Boolean)
                .join(" • ") || "Young person profile"
            )}
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <button class="profile-card editable-card" type="button" data-open-profile-edit="identity">
          <div class="profile-card-title">About me</div>
          <div class="profile-card-text">${escapeHtml(identity.interests || "No interests recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(identity.strengths_summary || "No strengths summary recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="communication">
          <div class="profile-card-title">How to support me well</div>
          <div class="profile-card-text">${escapeHtml(communication.what_helps || "No support guidance recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(communication.communication_style || "No communication profile recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="education">
          <div class="profile-card-title">Learning</div>
          <div class="profile-card-text">${escapeHtml(education.school_name || "No education setting recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(education.support_summary || education.education_status || "No learning support summary recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="health">
          <div class="profile-card-title">Health and wellbeing</div>
          <div class="profile-card-text">${escapeHtml(health.mental_health_summary || health.medication_summary || "No health summary recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(health.allergies || "No allergies recorded.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="network">
          <div class="profile-card-title">Important adults</div>
          <div class="profile-card-text">${escapeHtml(legal.social_worker_name || "No named social worker recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(legal.local_authority || legal.legal_status || "No network summary recorded yet.")}</div>
        </button>
      </div>
    </section>
  `;
}

function bindProfileActions() {
  els.viewContent?.querySelectorAll("[data-open-profile-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mod = await import("../ui/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

export async function loadProfile() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const bundle = data.bundle || {};
  const yp = bundle.young_person || data.young_person || state.youngPerson || {};

  els.viewContent.innerHTML = renderProfileCard(yp, bundle);
  bindProfileActions();
}
