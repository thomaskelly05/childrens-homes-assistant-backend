import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
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

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function renderEmptyState(message = "No information available.") {
  return `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;
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
    follow_up_required: !!item.follow_up_required,
    concerns: item.concerns || "",
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
      ? "restricted"
      : item.is_approved_contact
      ? "approved"
      : "",
    supervision_level: item.supervision_level || "",
    is_parental_responsibility_holder: !!item.is_parental_responsibility_holder,
    is_approved_contact: !!item.is_approved_contact,
    is_restricted_contact: !!item.is_restricted_contact,
    notes: item.notes || "",
  }));
}

function renderContactsRows(contacts = []) {
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
                      contact.is_approved_contact ? "Approved" : "",
                      contact.is_restricted_contact ? "Restricted" : "",
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
                ${contact.notes ? `<div class="record-row-meta">${toText(contact.notes)}</div>` : ""}
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

function buildHeadlineStats(records = [], contacts = []) {
  const followUps = records.filter((item) => item.follow_up_required).length;
  const concerns = records.filter((item) => item.concerns).length;
  const approved = contacts.filter((item) => item.is_approved_contact).length;
  const restricted = contacts.filter((item) => item.is_restricted_contact).length;

  return { followUps, concerns, approved, restricted };
}

function getRowDate(item = {}) {
  return item.contact_datetime || item.created_at || "";
}

function getRowPill(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();

  if (
    ["restricted", "overdue", "escalated"].includes(status) ||
    ["high", "critical"].includes(significance) ||
    item.follow_up_required
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  if (["approved", "active", "completed"].includes(status)) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  if (status) {
    return { label: status.replaceAll("_", " "), tone: "muted" };
  }

  return { label: "Recorded", tone: "muted" };
}

function renderRecordRows(items = [], emptyMessage = "No records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(item.id)}"
              data-record-type="${toText(item.record_type)}"
              data-title="${toText(item.title)}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(item.title)}</div>
                ${item.summary ? `<div class="record-row-summary">${toText(item.summary)}</div>` : ""}
                ${getRowDate(item) ? `<div class="record-row-meta">${toText(formatDate(getRowDate(item)))}</div>` : ""}
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFamilyHtml({ familyRecords = [], contacts = [], stats }) {
  const familyRows = buildFamilyRecordRows(familyRecords);
  const permissionRows = buildContactRows(
    contacts.filter((item) => item.is_approved_contact || item.is_restricted_contact)
  );

  const attentionRows = buildFamilyRecordRows(
    familyRecords.filter((item) => item.follow_up_required || item.concerns)
  );

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Family</div>
          <h2>Family and important relationships</h2>
          <p>Key contacts, recorded family contact, concerns and follow-up.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Contact records</span>
              <strong class="overview-stat-value">${toText(familyRecords.length)}</strong>
              <span class="overview-stat-note">Recorded family contact entries</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Follow-up required</span>
              <strong class="overview-stat-value">${toText(stats.followUps)}</strong>
              <span class="overview-stat-note">Records needing action</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Approved contacts</span>
              <strong class="overview-stat-value">${toText(stats.approved)}</strong>
              <span class="overview-stat-note">Contacts marked approved</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Restricted contacts</span>
              <strong class="overview-stat-value">${toText(stats.restricted)}</strong>
              <span class="overview-stat-note">Contacts with restrictions</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Important contacts</h3>
              <p>Family members, professionals and approved or restricted contacts.</p>
            </div>

            ${renderContactsRows(contacts)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Family contact records</h3>
              <p>Recorded contact, presentation, concerns and follow-up.</p>
            </div>

            ${renderRecordRows(familyRows, "No family contact records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Records needing attention</h3>
              <p>Family contact records where concerns or follow-up have been recorded.</p>
            </div>

            ${renderRecordRows(attentionRows, "No family contact concerns needing attention.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Approved and restricted contacts</h3>
              <p>Quick view of contact permissions and restrictions.</p>
            </div>

            ${renderRecordRows(permissionRows, "No approved or restricted contact flags found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
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

    els.viewContent.innerHTML = renderFamilyHtml({
      familyRecords,
      contacts,
      stats,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load family data.")}</p>
      </div>
    `;
  }
}
