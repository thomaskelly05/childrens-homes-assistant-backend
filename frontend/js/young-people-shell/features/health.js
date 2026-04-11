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
        <div class="profile-card-title">GP</div>
        <div class="profile-card-text">${escapeHtml(profile.gp_name || "Not recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Allergies</div>
        <div class="profile-card-text">${escapeHtml(profile.allergies || "None recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Diagnoses</div>
        <div class="profile-card-text">${escapeHtml(profile.diagnoses || "Not recorded")}</div>
      </div>

      <div class="profile-card editable-card">
        <div class="profile-card-title">Medication</div>
        <div class="profile-card-text">${escapeHtml(profile.medication_summary || "Not recorded")}</div>
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

export async function loadHealth() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);
  const profile = data.health_profile || {};
  const records = data.health_records || data.items || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Health and wellbeing",
      profile.mental_health_summary ||
        profile.medication_summary ||
        "Health needs, medication and wellbeing information.",
      renderProfileGrid(profile)
    )}

    ${renderSection(
      "Health records",
      "Appointments, updates and health-related entries.",
      renderRowList(records, "No health records found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
  bindEditableCards();
}
