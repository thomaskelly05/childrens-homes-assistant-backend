import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate, buildImageOrInitials } from "../core/utils.js";
import { renderSection, renderSummaryStat } from "../ui/records.js";
import {
  mapYoungPerson,
  mapIdentityProfile,
  mapCommunicationProfile,
  mapEducationProfile,
  mapHealthProfile,
  mapLegalStatus,
  mapFormulation,
  mapYoungPersonContact,
} from "../core/adapters.js";

function renderProfileGrid(items = []) {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return `
      <div class="empty-state">
        <p>No profile information available yet.</p>
      </div>
    `;
  }

  return `
    <div class="profile-grid">
      ${visible
        .map(
          (item) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(item.label)}</div>
              <div class="profile-card-text">${escapeHtml(item.value)}</div>
              ${item.subtext ? `<div class="profile-card-subtext">${escapeHtml(item.subtext)}</div>` : ""}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLongTextBlocks(items = []) {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return `
      <div class="empty-state">
        <p>No information recorded yet.</p>
      </div>
    `;
  }

  return `
    <div class="profile-stack">
      ${visible
        .map(
          (item) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(item.label)}</div>
              <div class="profile-card-text">${escapeHtml(item.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderContacts(contacts = []) {
  if (!contacts.length) {
    return `
      <div class="empty-state">
        <p>No key contacts recorded yet.</p>
      </div>
    `;
  }

  return `
    <div class="profile-stack">
      ${contacts
        .map(
          (contact) => `
            <div class="profile-card">
              <div class="profile-card-title">${escapeHtml(contact.full_name || "Contact")}</div>
              <div class="profile-card-text">
                ${escapeHtml(
                  [
                    contact.relationship_to_young_person,
                    contact.contact_type,
                    contact.phone,
                    contact.email,
                  ]
                    .filter(Boolean)
                    .join(" • ")
                )}
              </div>
              <div class="profile-card-subtext">
                ${escapeHtml(
                  [
                    contact.supervision_level,
                    contact.is_parental_responsibility_holder ? "Parental responsibility" : "",
                    contact.is_restricted_contact ? "Restricted contact" : "",
                  ]
                    .filter(Boolean)
                    .join(" • ")
                )}
              </div>
              ${
                contact.notes
                  ? `<div class="profile-card-text">${escapeHtml(contact.notes)}</div>`
                  : ""
              }
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHero(youngPerson = {}) {
  return `
    <div class="person-hero">
      <div class="person-hero-avatar">
        ${buildImageOrInitials(youngPerson, "avatar avatar-xl", "avatar avatar-xl avatar-fallback")}
      </div>

      <div class="person-hero-main">
        <h2>${escapeHtml(youngPerson.full_name || "Young person")}</h2>
        <p>
          ${escapeHtml(
            [
              youngPerson.preferred_name ? `Preferred: ${youngPerson.preferred_name}` : "",
              youngPerson.placement_status,
              youngPerson.summary_risk_level ? `Risk: ${youngPerson.summary_risk_level}` : "",
            ]
              .filter(Boolean)
              .join(" • ")
          )}
        </p>
      </div>
    </div>
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
    const [
      youngPersonData,
      identityData,
      communicationData,
      educationData,
      healthData,
      legalData,
      formulationData,
      contactsData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/identity-profile`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/communication-profile`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/education-profile`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/health-profile`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/legal-status`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/formulation`).catch(() => ({})),
      apiGet(`/young-people/${state.youngPersonId}/contacts`).catch(() => ({ items: [] })),
    ]);

    const youngPerson = mapYoungPerson(
      youngPersonData.young_person || youngPersonData.item || youngPersonData
    );

    const identity = mapIdentityProfile(
      identityData.identity_profile ||
        identityData.young_person_identity_profile ||
        identityData.item ||
        identityData
    );

    const communication = mapCommunicationProfile(
      communicationData.communication_profile ||
        communicationData.young_person_communication_profile ||
        communicationData.item ||
        communicationData
    );

    const education = mapEducationProfile(
      educationData.education_profile ||
        educationData.young_person_education_profile ||
        educationData.item ||
        educationData
    );

    const health = mapHealthProfile(
      healthData.health_profile ||
        healthData.young_person_health_profile ||
        healthData.item ||
        healthData
    );

    const legal = mapLegalStatus(
      legalData.legal_status ||
        legalData.young_person_legal_status ||
        legalData.item ||
        legalData
    );

    const formulation = mapFormulation(
      formulationData.formulation ||
        formulationData.young_person_formulation ||
        formulationData.item ||
        formulationData
    );

    const contacts = (
      contactsData.items ||
      contactsData.records ||
      contactsData.contacts ||
      contactsData.young_person_contacts ||
      []
    ).map(mapYoungPersonContact);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Contacts", contacts.length)}
        ${renderSummaryStat("Current legal", legal.is_current ? 1 : 0)}
        ${renderSummaryStat("Education profile", education.school_name ? 1 : 0)}
        ${renderSummaryStat("Health profile", health.gp_name || health.allergies || health.diagnoses ? 1 : 0)}
      </section>

      ${renderSection(
        "About this young person",
        "Identity, placement and headline profile information.",
        `
          ${renderHero(youngPerson)}
          ${renderProfileGrid([
            { label: "Date of birth", value: youngPerson.date_of_birth ? formatDate(youngPerson.date_of_birth) : "" },
            { label: "Gender", value: youngPerson.gender },
            { label: "Ethnicity", value: youngPerson.ethnicity },
            { label: "Admission date", value: youngPerson.admission_date ? formatDate(youngPerson.admission_date) : "" },
            { label: "Discharge date", value: youngPerson.discharge_date ? formatDate(youngPerson.discharge_date) : "" },
            { label: "Home", value: youngPerson.home_name },
            { label: "NHS number", value: youngPerson.nhs_number },
            { label: "Local ID", value: youngPerson.local_id_number },
          ])}
        `
      )}

      ${renderSection(
        "Identity and what matters",
        "Culture, language, strengths, interests and what matters to this young person.",
        renderLongTextBlocks([
          { label: "Religion or faith", value: identity.religion_or_faith },
          { label: "Cultural identity", value: identity.cultural_identity },
          { label: "First language", value: identity.first_language },
          { label: "Dietary needs", value: identity.dietary_needs },
          { label: "Interests", value: identity.interests },
          { label: "Strengths summary", value: identity.strengths_summary },
          { label: "What matters to me", value: identity.what_matters_to_me },
          { label: "Important dates", value: identity.important_dates },
        ])
      )}

      ${renderSection(
        "Communication and regulation",
        "How this young person communicates, processes and what helps.",
        renderLongTextBlocks([
          { label: "Neurodiversity summary", value: communication.neurodiversity_summary },
          { label: "Communication style", value: communication.communication_style },
          { label: "Sensory profile", value: communication.sensory_profile },
          { label: "Processing needs", value: communication.processing_needs },
          { label: "Signs of distress", value: communication.signs_of_distress },
          { label: "What helps", value: communication.what_helps },
          { label: "What to avoid", value: communication.what_to_avoid },
          { label: "Routines and predictability", value: communication.routines_and_predictability },
          { label: "Visual support needs", value: communication.visual_support_needs },
        ])
      )}

      ${renderSection(
        "Education profile",
        "School, support and learning context.",
        renderProfileGrid([
          { label: "School", value: education.school_name },
          { label: "Year group", value: education.year_group },
          { label: "Education status", value: education.education_status },
          { label: "SEN status", value: education.sen_status },
          { label: "Designated teacher", value: education.designated_teacher },
          { label: "Attendance baseline", value: education.attendance_baseline ? String(education.attendance_baseline) : "" },
          { label: "PEP status", value: education.pep_status },
          { label: "EHCP details", value: education.ehcp_details },
          { label: "Support summary", value: education.support_summary },
        ])
      )}

      ${renderSection(
        "Health profile",
        "Core health contacts and needs staff should know.",
        renderLongTextBlocks([
          { label: "GP", value: [health.gp_name, health.gp_contact].filter(Boolean).join(" • ") },
          { label: "Dentist", value: [health.dentist_name, health.dentist_contact].filter(Boolean).join(" • ") },
          { label: "Optician", value: [health.optician_name, health.optician_contact].filter(Boolean).join(" • ") },
          { label: "Allergies", value: health.allergies },
          { label: "Diagnoses", value: health.diagnoses },
          { label: "Mental health summary", value: health.mental_health_summary },
          { label: "Medication summary", value: health.medication_summary },
          { label: "Consent notes", value: health.consent_notes },
        ])
      )}

      ${renderSection(
        "Legal status",
        "Legal context, restrictions and authority.",
        renderLongTextBlocks([
          { label: "Legal status", value: legal.legal_status },
          { label: "Order type", value: legal.order_type },
          { label: "Order details", value: legal.order_details },
          { label: "Delegated authority details", value: legal.delegated_authority_details },
          { label: "Restrictions", value: legal.restrictions_text },
          { label: "Consent arrangements", value: legal.consent_arrangements },
          {
            label: "Effective dates",
            value: [legal.effective_from ? formatDate(legal.effective_from) : "", legal.effective_to ? formatDate(legal.effective_to) : ""]
              .filter(Boolean)
              .join(" to "),
          },
        ])
      )}

      ${renderSection(
        "Formulation",
        "Shared understanding of needs, context and what helps.",
        renderLongTextBlocks([
          { label: "Presenting needs", value: formulation.presenting_needs },
          { label: "Developmental context", value: formulation.developmental_context },
          { label: "Trauma context", value: formulation.trauma_context },
          { label: "Neurodevelopmental context", value: formulation.neurodevelopmental_context },
          { label: "Relational context", value: formulation.relational_context },
          { label: "Meaning of behaviour", value: formulation.meaning_of_behaviour },
          { label: "Known triggers", value: formulation.known_triggers },
          { label: "Early signs of distress", value: formulation.early_signs_of_distress },
          { label: "Protective factors", value: formulation.protective_factors },
          { label: "What helps", value: formulation.what_helps },
          { label: "What adults should avoid", value: formulation.what_adults_should_avoid },
          { label: "Regulation strategies", value: formulation.regulation_strategies },
          { label: "Child voice summary", value: formulation.child_voice_summary },
        ])
      )}

      ${renderSection(
        "Important contacts",
        "Family, professionals and approved contacts linked to this young person.",
        renderContacts(contacts)
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