import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

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
      <button class="profile-card editable-card" type="button" data-edit="identity">
        <div class="profile-card-title">Identity</div>
        <div class="profile-card-text">${escapeHtml(profile.identity || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-edit="communication">
        <div class="profile-card-title">Communication</div>
        <div class="profile-card-text">${escapeHtml(profile.communication || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-edit="health">
        <div class="profile-card-title">Health</div>
        <div class="profile-card-text">${escapeHtml(profile.health || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-edit="risk">
        <div class="profile-card-title">Risk / safety</div>
        <div class="profile-card-text">${escapeHtml(profile.risk_summary || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-edit="strengths">
        <div class="profile-card-title">Strengths</div>
        <div class="profile-card-text">${escapeHtml(profile.strengths || "Not recorded")}</div>
      </button>

      <button class="profile-card editable-card" type="button" data-edit="needs">
        <div class="profile-card-title">Needs</div>
        <div class="profile-card-text">${escapeHtml(profile.needs || "Not recorded")}</div>
      </button>
    </div>
  `;
}

function bindProfileActions() {
  els.viewContent?.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
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

  const data = await apiGet(`/young-people/${state.youngPersonId}/profile`).catch(() => ({}));
  const profile = data.profile || data.young_person || {};

  els.viewContent.innerHTML = `
    ${renderSection(
      "Profile",
      "A clear, child-centred understanding of who this young person is.",
      renderProfileGrid(profile)
    )}
  `;

  bindProfileActions();
}
