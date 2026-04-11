import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection } from "../ui/records.js";
import { mapFamilyContact } from "../core/adapters.js";

function renderContactCards(contacts = []) {
  if (!contacts.length) {
    return `<div class="empty-state"><p>No contacts recorded.</p></div>`;
  }

  return `
    <div class="profile-grid">
      ${contacts
        .map(
          (c) => `
        <div class="profile-card">
          <div class="profile-card-title">${escapeHtml(c.full_name || "Contact")}</div>
          <div class="profile-card-text">${escapeHtml(
            c.relationship_to_young_person ||
              c.relationship_to_child ||
              c.contact_type ||
              "Relationship not recorded"
          )}</div>
          <div class="profile-card-subtext">
            ${escapeHtml(c.phone || c.phone_number || "")}
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function buildContactRecordRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "family_contact",
    title: item.contact_person || item.full_name || "Family contact",
    summary:
      [
        item.contact_type,
        item.location,
        item.supervision_level,
      ]
        .filter(Boolean)
        .join(" • ") || "Family contact record",
    contact_datetime: item.contact_datetime || null,
    status: item.workflow_status || "",
    child_voice: item.child_voice || "",
    concerns: item.concerns || "",
  }));
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

  try {
    const [contactsData, recordsData] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/contacts`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/family`).catch(() => ({ items: [] })),
    ]);

    const contacts =
      contactsData.items ||
      contactsData.records ||
      contactsData.young_person_contacts ||
      [];

    const familyRecords = (
      recordsData.items ||
      recordsData.records ||
      recordsData.family_contact_records ||
      []
    ).map(mapFamilyContact);

    const concerns = familyRecords.filter((r) =>
      Boolean(r.concerns || "").toLowerCase().includes("concern")
    );

    els.viewContent.innerHTML = `
      ${renderSection(
        "Key contacts",
        "Important people in the young person’s life.",
        renderContactCards(contacts)
      )}

      ${renderSection(
        "Family contact records",
        "Contact sessions, presentation, and follow-up.",
        renderRowList(familyRecords, "No family contact records found.")
      )}

      ${renderSection(
        "Concerns and risks",
        "Contacts where concerns or issues were identified.",
        renderRowList(concerns, "No concerns recorded.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load family and relationships.")}</p>
      </div>
    `;
  }
}
