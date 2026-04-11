import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatShortDate, getDisplayName, getProfileImage, initialsFromName } from "../core/utils.js";
import { renderSection } from "../ui/helpers.js";
import { mapBundle } from "../core/adapters.js";

function renderKeyValue(label, value) {
  return `
    <div class="kv-row">
      <div class="kv-key">${escapeHtml(label)}</div>
      <div class="kv-value">${escapeHtml(value || "—")}</div>
    </div>
  `;
}

function renderProfileHeader(bundle) {
  const yp = bundle.young_person || {};
  const name = getDisplayName(yp);
  const image = getProfileImage(yp);

  return `
    <section class="profile-header">
      <div class="profile-header-inner">
        ${
          image
            ? `<img class="profile-avatar" src="${escapeHtml(image)}" />`
            : `<div class="profile-avatar avatar-fallback">${escapeHtml(initialsFromName(name))}</div>`
        }

        <div>
          <h2>${escapeHtml(name)}</h2>
          <p>
            ${escapeHtml(
              [
                yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
                yp.date_of_birth ? `DOB: ${formatShortDate(yp.date_of_birth)}` : null,
                yp.placement_status,
              ].filter(Boolean).join(" • ")
            )}
          </p>
        </div>
      </div>
    </section>
  `;
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

  try {
    const data = await apiGet(`/young-people/${state.youngPersonId}`);
    const bundle = mapBundle(data.bundle || data);

    const yp = bundle.young_person;
    const identity = bundle.identity_profile;
    const comms = bundle.communication_profile;
    const edu = bundle.education_profile;
    const health = bundle.health_profile;
    const legal = bundle.legal_status;
    const formulation = bundle.formulation;

    els.viewContent.innerHTML = `
      ${renderProfileHeader(bundle)}

      ${renderSection(
        "Basic information",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("First name", yp.first_name)}
            ${renderKeyValue("Last name", yp.last_name)}
            ${renderKeyValue("Preferred name", yp.preferred_name)}
            ${renderKeyValue("Date of birth", formatShortDate(yp.date_of_birth))}
            ${renderKeyValue("Gender", yp.gender)}
            ${renderKeyValue("Ethnicity", yp.ethnicity)}
          </div>
        `
      )}

      ${renderSection(
        "Identity and what matters",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("Religion / faith", identity.religion_or_faith)}
            ${renderKeyValue("Cultural identity", identity.cultural_identity)}
            ${renderKeyValue("First language", identity.first_language)}
            ${renderKeyValue("Dietary needs", identity.dietary_needs)}
            ${renderKeyValue("Interests", identity.interests)}
            ${renderKeyValue("Strengths", identity.strengths_summary)}
            ${renderKeyValue("What matters to me", identity.what_matters_to_me)}
          </div>
        `
      )}

      ${renderSection(
        "Communication and support needs",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("Communication style", comms.communication_style)}
            ${renderKeyValue("Sensory profile", comms.sensory_profile)}
            ${renderKeyValue("Processing needs", comms.processing_needs)}
            ${renderKeyValue("Signs of distress", comms.signs_of_distress)}
            ${renderKeyValue("What helps", comms.what_helps)}
            ${renderKeyValue("What to avoid", comms.what_to_avoid)}
          </div>
        `
      )}

      ${renderSection(
        "Education",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("School", edu.school_name)}
            ${renderKeyValue("Year group", edu.year_group)}
            ${renderKeyValue("Status", edu.education_status)}
            ${renderKeyValue("SEN", edu.sen_status)}
            ${renderKeyValue("EHCP", edu.ehcp_details)}
            ${renderKeyValue("Support summary", edu.support_summary)}
          </div>
        `
      )}

      ${renderSection(
        "Health",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("GP", health.gp_name)}
            ${renderKeyValue("Allergies", health.allergies)}
            ${renderKeyValue("Diagnoses", health.diagnoses)}
            ${renderKeyValue("Mental health", health.mental_health_summary)}
            ${renderKeyValue("Medication", health.medication_summary)}
          </div>
        `
      )}

      ${renderSection(
        "Legal status",
        "",
        `
          <div class="kv-grid">
            ${renderKeyValue("Legal status", legal.legal_status)}
            ${renderKeyValue("Order type", legal.order_type)}
            ${renderKeyValue("Details", legal.order_details)}
            ${renderKeyValue("Restrictions", legal.restrictions_text)}
            ${renderKeyValue("Consent", legal.consent_arrangements)}
          </div>
        `
      )}

      ${renderSection(
        "Formulation",
        "How we understand and respond",
        `
          <div class="kv-grid">
            ${renderKeyValue("Presenting needs", formulation.presenting_needs)}
            ${renderKeyValue("Triggers", formulation.known_triggers)}
            ${renderKeyValue("Early signs", formulation.early_signs_of_distress)}
            ${renderKeyValue("Protective factors", formulation.protective_factors)}
            ${renderKeyValue("What helps", formulation.what_helps)}
            ${renderKeyValue("What to avoid", formulation.what_adults_should_avoid)}
          </div>
        `
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load profile.")}</p>
      </div>
    `;
  }
}
