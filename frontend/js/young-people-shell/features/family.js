import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderSection, renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapFamilyContactRecord,
  mapYoungPersonContact,
} from "../core/adapters.js";

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function buildFamilyRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "family_contact",
    title: item.contact_person || item.contact_type || "Family contact",
    summary:
      item.post_contact_presentation ||
      item.concerns ||
      item.child_voice ||
      "Family contact record",
    contact_datetime: item.contact_datetime || null,
    created_at: item.created_at || null,
    status: item.workflow_status || "",
    significance: item.significance || "",
  }));
}

function buildContactRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "contact",
    title: item.full_name || "Contact",
    summary: [
      item.relationship_to_young_person,
      item.contact_type,
      item.phone,
      item.email,
    ]
      .filter(Boolean)
      .join(" • "),
    created_at: item.created_at || null,
    status: item.is_restricted_contact
      ? "Restricted"
      : item.is_approved_contact
      ? "Approved"
      : "",
  }));
}

function renderContactsGrid(contacts = []) {
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
                    contact.is_approved_contact ? "Approved" : "",
                    contact.is_restricted_contact ? "Restricted" : "",
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

function buildHeadlineStats(records = [], contacts = []) {
  const followUps = records.filter((item) => item.follow_up_required).length;
  const concerns = records.filter((item) => item.concerns).length;
  const approved = contacts.filter((item) => item.is_approved_contact).length;
  const restricted = contacts.filter((item) => item.is_restricted_contact).length;

  return { followUps, concerns, approved, restricted };
}

export async function loadFamily() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading family data...</p>
      </div>
    </div>
  `;

  try {
    const [familyData, contactsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/family-contact-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/contacts`).catch(() => ({ items: [] })),
    ]);

    const familyRecords = sortNewestFirst(
      (
        familyData.items ||
        familyData.records ||
        familyData.family_contact_records ||
        []
      ).map(mapFamilyContactRecord),
      ["contact_datetime", "created_at"]
    );

    const contacts = sortNewestFirst(
      (
        contactsData.items ||
        contactsData.records ||
        contactsData.contacts ||
        contactsData.young_person_contacts ||
        []
      ).map(mapYoungPersonContact),
      ["created_at", "updated_at"]
    );

    const stats = buildHeadlineStats(familyRecords, contacts);

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("Contact records", familyRecords.length)}
        ${renderSummaryStat("Follow-up required", stats.followUps)}
        ${renderSummaryStat("Approved contacts", stats.approved)}
        ${renderSummaryStat("Restricted contacts", stats.restricted)}
      </section>

      ${renderSection(
        "Important contacts",
        "Family members, professionals and approved or restricted contacts.",
        renderContactsGrid(contacts)
      )}

      ${renderSection(
        "Family contact records",
        "Recorded contact, presentation, concerns and follow-up.",
        renderRowList(buildFamilyRecordRows(familyRecords), "No family contact records found.")
      )}

      ${renderSection(
        "Records needing attention",
        "Family contact records where concerns or follow-up have been recorded.",
        renderRowList(
          buildFamilyRecordRows(
            familyRecords.filter((item) => item.follow_up_required || item.concerns)
          ),
          "No family contact concerns needing attention."
        )
      )}

      ${renderSection(
        "Approved and restricted contacts",
        "Quick view of contact permissions and restrictions.",
        renderRowList(
          buildContactRows(
            contacts.filter(
              (item) => item.is_approved_contact || item.is_restricted_contact
            )
          ),
          "No approved or restricted contact flags found."
        )
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load family data.")}</p>
      </div>
    `;
  }
}