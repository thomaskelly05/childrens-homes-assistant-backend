import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate, buildImageOrInitials } from "../core/utils.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function renderEmptyState(message = "No information recorded yet.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function renderInfoRows(items = [], emptyMessage = "No information available yet.") {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${visible
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.label)}</div>
                <div class="record-row-summary">${toText(item.value)}</div>
                ${item.subtext ? `<div class="record-row-meta">${toText(item.subtext)}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Profile</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function normaliseContact(contact = {}) {
  const mapped = mapYoungPersonContact(contact) || {};

  return {
    ...mapped,
    full_name: mapped.full_name || contact.full_name || "",
    relationship_to_young_person:
      mapped.relationship_to_young_person ||
      contact.relationship_to_young_person ||
      contact.relationship_to_child ||
      "",
    contact_type: mapped.contact_type || contact.contact_type || "",
    phone: mapped.phone || contact.phone || contact.phone_number || "",
    email: mapped.email || contact.email || "",
    supervision_level: mapped.supervision_level || contact.supervision_level || "",
    is_parental_responsibility_holder:
      typeof mapped.is_parental_responsibility_holder === "boolean"
        ? mapped.is_parental_responsibility_holder
        : !!contact.is_parental_responsibility_holder,
    is_restricted_contact:
      typeof mapped.is_restricted_contact === "boolean"
        ? mapped.is_restricted_contact
        : !!contact.is_restricted_contact,
    notes: mapped.notes || contact.notes || contact.contact_notes || "",
  };
}

function renderContacts(contacts = []) {
  if (!contacts.length) {
    return renderEmptyState("No key contacts recorded yet.");
  }

  return `
    <div class="record-list">
      ${contacts
        .map(
          (contact) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(contact.full_name || "Contact")}</div>
                <div class="record-row-summary">
                  ${toText(
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
                <div class="record-row-meta">
                  ${toText(
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
                    ? `<div class="record-row-meta">${toText(contact.notes)}</div>`
                    : ""
                }
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Contact</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHero(youngPerson = {}) {
  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>About this young person</h3>
        <p>Identity, placement and headline profile information.</p>
      </div>

      <div class="workspace-person-card">
        <div class="person-hero-avatar">
          ${buildImageOrInitials(
            youngPerson,
            "avatar avatar-xl",
            "avatar avatar-xl avatar-fallback"
          )}
        </div>

        <div class="workspace-person-copy">
          <h3>${toText(youngPerson.full_name || "Young person")}</h3>
          <p>
            ${toText(
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
    </section>
  `;
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function buildTopCounts({ contacts = [], legal = {}, education = {}, health = {} }) {
  return {
    contacts: contacts.length,
    currentLegal: legal.is_current ? 1 : 0,
    educationProfile: education.school_name ? 1 : 0,
    healthProfile: health.gp_name || health.allergies || health.diagnoses ? 1 : 0,
  };
}

function renderProfileHtml({
  youngPerson,
  identity,
  communication,
  education,
  health,
  legal,
  formulation,
  contacts,
  counts,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Profile</div>
          <h2>Young person profile</h2>
          <p>Identity, context, communication, health, legal information and what helps.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Contacts</span>
              <strong class="overview-stat-value">${toText(counts.contacts)}</strong>
              <span class="overview-stat-note">Important linked contacts</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Current legal</span>
              <strong class="overview-stat-value">${toText(counts.currentLegal)}</strong>
              <span class="overview-stat-note">Current legal status recorded</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Education profile</span>
              <strong class="overview-stat-value">${toText(counts.educationProfile)}</strong>
              <span class="overview-stat-note">School and learning profile present</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Health profile</span>
              <strong class="overview-stat-value">${toText(counts.healthProfile)}</strong>
              <span class="overview-stat-note">Health information recorded</span>
            </article>
          </div>

          ${renderHero(youngPerson)}

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Core profile details</h3>
              <p>Personal, placement and identifying information.</p>
            </div>

            ${renderInfoRows([
              { label: "Date of birth", value: youngPerson.date_of_birth ? formatDate(youngPerson.date_of_birth) : "" },
              { label: "Gender", value: youngPerson.gender },
              { label: "Ethnicity", value: youngPerson.ethnicity },
              { label: "Admission date", value: youngPerson.admission_date ? formatDate(youngPerson.admission_date) : "" },
              { label: "Discharge date", value: youngPerson.discharge_date ? formatDate(youngPerson.discharge_date) : "" },
              { label: "Home", value: youngPerson.home_name },
              { label: "NHS number", value: youngPerson.nhs_number },
              { label: "Local ID", value: youngPerson.local_id_number },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Identity and what matters</h3>
              <p>Culture, language, strengths, interests and what matters to this young person.</p>
            </div>

            ${renderInfoRows([
              { label: "Religion or faith", value: identity.religion_or_faith },
              { label: "Cultural identity", value: identity.cultural_identity },
              { label: "First language", value: identity.first_language },
              { label: "Dietary needs", value: identity.dietary_needs },
              { label: "Interests", value: identity.interests },
              { label: "Strengths summary", value: identity.strengths_summary },
              { label: "What matters to me", value: identity.what_matters_to_me },
              { label: "Important dates", value: identity.important_dates },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Communication and regulation</h3>
              <p>How this young person communicates, processes and what helps.</p>
            </div>

            ${renderInfoRows([
              { label: "Neurodiversity summary", value: communication.neurodiversity_summary },
              { label: "Communication style", value: communication.communication_style },
              { label: "Sensory profile", value: communication.sensory_profile },
              { label: "Processing needs", value: communication.processing_needs },
              { label: "Signs of distress", value: communication.signs_of_distress },
              { label: "What helps", value: communication.what_helps },
              { label: "What to avoid", value: communication.what_to_avoid },
              { label: "Routines and predictability", value: communication.routines_and_predictability },
              { label: "Visual support needs", value: communication.visual_support_needs },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Formulation</h3>
              <p>Shared understanding of needs, context and what helps.</p>
            </div>

            ${renderInfoRows([
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
            ])}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Education profile</h3>
              <p>School, support and learning context.</p>
            </div>

            ${renderInfoRows([
              { label: "School", value: education.school_name },
              { label: "Year group", value: education.year_group },
              { label: "Education status", value: education.education_status },
              { label: "SEN status", value: education.sen_status },
              { label: "Designated teacher", value: education.designated_teacher },
              { label: "Attendance baseline", value: education.attendance_baseline ? String(education.attendance_baseline) : "" },
              { label: "PEP status", value: education.pep_status },
              { label: "EHCP details", value: education.ehcp_details },
              { label: "Support summary", value: education.support_summary },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Health profile</h3>
              <p>Core health contacts and needs staff should know.</p>
            </div>

            ${renderInfoRows([
              { label: "GP", value: [health.gp_name, health.gp_contact].filter(Boolean).join(" • ") },
              { label: "Dentist", value: [health.dentist_name, health.dentist_contact].filter(Boolean).join(" • ") },
              { label: "Optician", value: [health.optician_name, health.optician_contact].filter(Boolean).join(" • ") },
              { label: "Allergies", value: health.allergies },
              { label: "Diagnoses", value: health.diagnoses },
              { label: "Mental health summary", value: health.mental_health_summary },
              { label: "Medication summary", value: health.medication_summary },
              { label: "Consent notes", value: health.consent_notes },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Legal status</h3>
              <p>Legal context, restrictions and authority.</p>
            </div>

            ${renderInfoRows([
              { label: "Legal status", value: legal.legal_status },
              { label: "Order type", value: legal.order_type },
              { label: "Order details", value: legal.order_details },
              { label: "Delegated authority details", value: legal.delegated_authority_details },
              { label: "Restrictions", value: legal.restrictions_text },
              { label: "Consent arrangements", value: legal.consent_arrangements },
              {
                label: "Effective dates",
                value: [
                  legal.effective_from ? formatDate(legal.effective_from) : "",
                  legal.effective_to ? formatDate(legal.effective_to) : "",
                ]
                  .filter(Boolean)
                  .join(" to "),
              },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Important contacts</h3>
              <p>Family, professionals and approved contacts linked to this young person.</p>
            </div>

            ${renderContacts(contacts)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
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
    const youngPersonId = state.youngPersonId;

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
      apiGet(`/young-people/${youngPersonId}`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/identity-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/communication-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/education-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/health-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/legal-status`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/formulations`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/contacts`).catch(() => ({ items: [] })),
    ]);

    const youngPerson = mapYoungPerson(
      firstObject(
        youngPersonData.young_person,
        youngPersonData.item,
        youngPersonData.data,
        youngPersonData
      )
    );

    const identity = mapIdentityProfile(
      firstObject(
        identityData.identity_profile,
        identityData.young_person_identity_profile,
        identityData.item,
        identityData.data,
        identityData
      )
    );

    const communication = mapCommunicationProfile(
      firstObject(
        communicationData.communication_profile,
        communicationData.young_person_communication_profile,
        communicationData.item,
        communicationData.data,
        communicationData
      )
    );

    const education = mapEducationProfile(
      firstObject(
        educationData.education_profile,
        educationData.young_person_education_profile,
        educationData.item,
        educationData.data,
        educationData
      )
    );

    const health = mapHealthProfile(
      firstObject(
        healthData.health_profile,
        healthData.young_person_health_profile,
        healthData.item,
        healthData.data,
        healthData
      )
    );

    const legal = mapLegalStatus(
      firstObject(
        legalData.legal_status,
        legalData.young_person_legal_status,
        legalData.item,
        legalData.data,
        legalData
      )
    );

    const formulation = mapFormulation(
      firstObject(
        formulationData.formulation,
        formulationData.young_person_formulation,
        formulationData.young_person_formulations,
        formulationData.item,
        formulationData.data,
        formulationData
      )
    );

    const contacts = firstArray(
      contactsData.items,
      contactsData.records,
      contactsData.contacts,
      contactsData.young_person_contacts,
      contactsData.data
    ).map(normaliseContact);

    const counts = buildTopCounts({
      contacts,
      legal,
      education,
      health,
    });

    els.viewContent.innerHTML = renderProfileHtml({
      youngPerson,
      identity,
      communication,
      education,
      health,
      legal,
      formulation,
      contacts,
      counts,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load profile.")}</p>
      </div>
    `;
  }
}import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate, buildImageOrInitials } from "../core/utils.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function renderEmptyState(message = "No information recorded yet.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
}

function renderInfoRows(items = [], emptyMessage = "No information available yet.") {
  const visible = items.filter((item) => item.value);

  if (!visible.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${visible
        .map(
          (item) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.label)}</div>
                <div class="record-row-summary">${toText(item.value)}</div>
                ${item.subtext ? `<div class="record-row-meta">${toText(item.subtext)}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Profile</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function normaliseContact(contact = {}) {
  const mapped = mapYoungPersonContact(contact) || {};

  return {
    ...mapped,
    full_name: mapped.full_name || contact.full_name || "",
    relationship_to_young_person:
      mapped.relationship_to_young_person ||
      contact.relationship_to_young_person ||
      contact.relationship_to_child ||
      "",
    contact_type: mapped.contact_type || contact.contact_type || "",
    phone: mapped.phone || contact.phone || contact.phone_number || "",
    email: mapped.email || contact.email || "",
    supervision_level: mapped.supervision_level || contact.supervision_level || "",
    is_parental_responsibility_holder:
      typeof mapped.is_parental_responsibility_holder === "boolean"
        ? mapped.is_parental_responsibility_holder
        : !!contact.is_parental_responsibility_holder,
    is_restricted_contact:
      typeof mapped.is_restricted_contact === "boolean"
        ? mapped.is_restricted_contact
        : !!contact.is_restricted_contact,
    notes: mapped.notes || contact.notes || contact.contact_notes || "",
  };
}

function renderContacts(contacts = []) {
  if (!contacts.length) {
    return renderEmptyState("No key contacts recorded yet.");
  }

  return `
    <div class="record-list">
      ${contacts
        .map(
          (contact) => `
            <article class="record-row">
              <div class="record-row-main">
                <div class="record-row-title">${toText(contact.full_name || "Contact")}</div>
                <div class="record-row-summary">
                  ${toText(
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
                <div class="record-row-meta">
                  ${toText(
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
                    ? `<div class="record-row-meta">${toText(contact.notes)}</div>`
                    : ""
                }
              </div>
              <div class="record-row-side">
                <span class="row-pill muted">Contact</span>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHero(youngPerson = {}) {
  return `
    <section class="overview-section-card">
      <div class="overview-section-head">
        <h3>About this young person</h3>
        <p>Identity, placement and headline profile information.</p>
      </div>

      <div class="workspace-person-card">
        <div class="person-hero-avatar">
          ${buildImageOrInitials(
            youngPerson,
            "avatar avatar-xl",
            "avatar avatar-xl avatar-fallback"
          )}
        </div>

        <div class="workspace-person-copy">
          <h3>${toText(youngPerson.full_name || "Young person")}</h3>
          <p>
            ${toText(
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
    </section>
  `;
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function buildTopCounts({ contacts = [], legal = {}, education = {}, health = {} }) {
  return {
    contacts: contacts.length,
    currentLegal: legal.is_current ? 1 : 0,
    educationProfile: education.school_name ? 1 : 0,
    healthProfile: health.gp_name || health.allergies || health.diagnoses ? 1 : 0,
  };
}

function renderProfileHtml({
  youngPerson,
  identity,
  communication,
  education,
  health,
  legal,
  formulation,
  contacts,
  counts,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Profile</div>
          <h2>Young person profile</h2>
          <p>Identity, context, communication, health, legal information and what helps.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Contacts</span>
              <strong class="overview-stat-value">${toText(counts.contacts)}</strong>
              <span class="overview-stat-note">Important linked contacts</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Current legal</span>
              <strong class="overview-stat-value">${toText(counts.currentLegal)}</strong>
              <span class="overview-stat-note">Current legal status recorded</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Education profile</span>
              <strong class="overview-stat-value">${toText(counts.educationProfile)}</strong>
              <span class="overview-stat-note">School and learning profile present</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Health profile</span>
              <strong class="overview-stat-value">${toText(counts.healthProfile)}</strong>
              <span class="overview-stat-note">Health information recorded</span>
            </article>
          </div>

          ${renderHero(youngPerson)}

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Core profile details</h3>
              <p>Personal, placement and identifying information.</p>
            </div>

            ${renderInfoRows([
              { label: "Date of birth", value: youngPerson.date_of_birth ? formatDate(youngPerson.date_of_birth) : "" },
              { label: "Gender", value: youngPerson.gender },
              { label: "Ethnicity", value: youngPerson.ethnicity },
              { label: "Admission date", value: youngPerson.admission_date ? formatDate(youngPerson.admission_date) : "" },
              { label: "Discharge date", value: youngPerson.discharge_date ? formatDate(youngPerson.discharge_date) : "" },
              { label: "Home", value: youngPerson.home_name },
              { label: "NHS number", value: youngPerson.nhs_number },
              { label: "Local ID", value: youngPerson.local_id_number },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Identity and what matters</h3>
              <p>Culture, language, strengths, interests and what matters to this young person.</p>
            </div>

            ${renderInfoRows([
              { label: "Religion or faith", value: identity.religion_or_faith },
              { label: "Cultural identity", value: identity.cultural_identity },
              { label: "First language", value: identity.first_language },
              { label: "Dietary needs", value: identity.dietary_needs },
              { label: "Interests", value: identity.interests },
              { label: "Strengths summary", value: identity.strengths_summary },
              { label: "What matters to me", value: identity.what_matters_to_me },
              { label: "Important dates", value: identity.important_dates },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Communication and regulation</h3>
              <p>How this young person communicates, processes and what helps.</p>
            </div>

            ${renderInfoRows([
              { label: "Neurodiversity summary", value: communication.neurodiversity_summary },
              { label: "Communication style", value: communication.communication_style },
              { label: "Sensory profile", value: communication.sensory_profile },
              { label: "Processing needs", value: communication.processing_needs },
              { label: "Signs of distress", value: communication.signs_of_distress },
              { label: "What helps", value: communication.what_helps },
              { label: "What to avoid", value: communication.what_to_avoid },
              { label: "Routines and predictability", value: communication.routines_and_predictability },
              { label: "Visual support needs", value: communication.visual_support_needs },
            ])}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Formulation</h3>
              <p>Shared understanding of needs, context and what helps.</p>
            </div>

            ${renderInfoRows([
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
            ])}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Education profile</h3>
              <p>School, support and learning context.</p>
            </div>

            ${renderInfoRows([
              { label: "School", value: education.school_name },
              { label: "Year group", value: education.year_group },
              { label: "Education status", value: education.education_status },
              { label: "SEN status", value: education.sen_status },
              { label: "Designated teacher", value: education.designated_teacher },
              { label: "Attendance baseline", value: education.attendance_baseline ? String(education.attendance_baseline) : "" },
              { label: "PEP status", value: education.pep_status },
              { label: "EHCP details", value: education.ehcp_details },
              { label: "Support summary", value: education.support_summary },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Health profile</h3>
              <p>Core health contacts and needs staff should know.</p>
            </div>

            ${renderInfoRows([
              { label: "GP", value: [health.gp_name, health.gp_contact].filter(Boolean).join(" • ") },
              { label: "Dentist", value: [health.dentist_name, health.dentist_contact].filter(Boolean).join(" • ") },
              { label: "Optician", value: [health.optician_name, health.optician_contact].filter(Boolean).join(" • ") },
              { label: "Allergies", value: health.allergies },
              { label: "Diagnoses", value: health.diagnoses },
              { label: "Mental health summary", value: health.mental_health_summary },
              { label: "Medication summary", value: health.medication_summary },
              { label: "Consent notes", value: health.consent_notes },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Legal status</h3>
              <p>Legal context, restrictions and authority.</p>
            </div>

            ${renderInfoRows([
              { label: "Legal status", value: legal.legal_status },
              { label: "Order type", value: legal.order_type },
              { label: "Order details", value: legal.order_details },
              { label: "Delegated authority details", value: legal.delegated_authority_details },
              { label: "Restrictions", value: legal.restrictions_text },
              { label: "Consent arrangements", value: legal.consent_arrangements },
              {
                label: "Effective dates",
                value: [
                  legal.effective_from ? formatDate(legal.effective_from) : "",
                  legal.effective_to ? formatDate(legal.effective_to) : "",
                ]
                  .filter(Boolean)
                  .join(" to "),
              },
            ])}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Important contacts</h3>
              <p>Family, professionals and approved contacts linked to this young person.</p>
            </div>

            ${renderContacts(contacts)}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }
  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
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
    const youngPersonId = state.youngPersonId;

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
      apiGet(`/young-people/${youngPersonId}`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/identity-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/communication-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/education-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/health-profile`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/legal-status`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/formulations`).catch(() => ({})),
      apiGet(`/young-people/${youngPersonId}/contacts`).catch(() => ({ items: [] })),
    ]);

    const youngPerson = mapYoungPerson(
      firstObject(
        youngPersonData.young_person,
        youngPersonData.item,
        youngPersonData.data,
        youngPersonData
      )
    );

    const identity = mapIdentityProfile(
      firstObject(
        identityData.identity_profile,
        identityData.young_person_identity_profile,
        identityData.item,
        identityData.data,
        identityData
      )
    );

    const communication = mapCommunicationProfile(
      firstObject(
        communicationData.communication_profile,
        communicationData.young_person_communication_profile,
        communicationData.item,
        communicationData.data,
        communicationData
      )
    );

    const education = mapEducationProfile(
      firstObject(
        educationData.education_profile,
        educationData.young_person_education_profile,
        educationData.item,
        educationData.data,
        educationData
      )
    );

    const health = mapHealthProfile(
      firstObject(
        healthData.health_profile,
        healthData.young_person_health_profile,
        healthData.item,
        healthData.data,
        healthData
      )
    );

    const legal = mapLegalStatus(
      firstObject(
        legalData.legal_status,
        legalData.young_person_legal_status,
        legalData.item,
        legalData.data,
        legalData
      )
    );

    const formulation = mapFormulation(
      firstObject(
        formulationData.formulation,
        formulationData.young_person_formulation,
        formulationData.young_person_formulations,
        formulationData.item,
        formulationData.data,
        formulationData
      )
    );

    const contacts = firstArray(
      contactsData.items,
      contactsData.records,
      contactsData.contacts,
      contactsData.young_person_contacts,
      contactsData.data
    ).map(normaliseContact);

    const counts = buildTopCounts({
      contacts,
      legal,
      education,
      health,
    });

    els.viewContent.innerHTML = renderProfileHtml({
      youngPerson,
      identity,
      communication,
      education,
      health,
      legal,
      formulation,
      contacts,
      counts,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load profile.")}</p>
      </div>
    `;
  }
}
