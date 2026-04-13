import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
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
      item.pre_contact_presentation ||
      "Family contact record",
    contact_datetime: item.contact_datetime || null,
    created_at: item.created_at || null,
    status: item.workflow_status || "",
    significance: item.significance || "",
    follow_up_required: !!item.follow_up_required,
    concerns: item.concerns || "",
    location: item.location || "",
    supervision_level: item.supervision_level || "",
    pre_contact_presentation: item.pre_contact_presentation || "",
    post_contact_presentation: item.post_contact_presentation || "",
    child_voice: item.child_voice || "",
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
    relationship_to_young_person: item.relationship_to_young_person || "",
    contact_type: item.contact_type || "",
    full_name: item.full_name || "",
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
  const parentalResponsibility = contacts.filter(
    (item) => item.is_parental_responsibility_holder
  ).length;

  return { followUps, concerns, approved, restricted, parentalResponsibility };
}

function buildAttentionRows(records = []) {
  return records.filter(
    (item) =>
      item.follow_up_required ||
      item.concerns ||
      ["high", "critical"].includes(String(item.significance || "").toLowerCase())
  );
}

function buildPositiveRows(records = []) {
  return records.filter(
    (item) => item.child_voice || item.post_contact_presentation
  );
}

function buildRecentThemes(records = []) {
  const latest = records.slice(0, 4);

  if (!latest.length) return [];

  return latest.map((item) => ({
    title: item.title || "Family contact",
    summary:
      item.post_contact_presentation ||
      item.child_voice ||
      item.pre_contact_presentation ||
      item.concerns ||
      "Recent family contact theme.",
  }));
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

function renderThemeCards(items = []) {
  if (!items.length) {
    return renderEmptyState("No recent family themes are showing yet.");
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(item.title)}</strong>
              <p>${toText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFamilyHtml({ familyRecords = [], contacts = [], stats }) {
  const familyRows = buildFamilyRecordRows(familyRecords);
  const contactRows = buildContactRows(contacts);
  const permissionRows = contactRows.filter(
    (item) => item.is_approved_contact || item.is_restricted_contact
  );
  const attentionRows = buildAttentionRows(familyRows);
  const positiveRows = buildPositiveRows(familyRows);
  const recentThemes = buildRecentThemes(familyRows);

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Family</div>
          <h2>Family and important relationships</h2>
          <p>Key contacts, family contact records, restrictions, concerns and follow-up.</p>
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
              <span class="overview-stat-label">Concerns logged</span>
              <strong class="overview-stat-value">${toText(stats.concerns)}</strong>
              <span class="overview-stat-note">Contacts where concerns were recorded</span>
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

            <article class="overview-stat-card">
              <span class="overview-stat-label">Parental responsibility</span>
              <strong class="overview-stat-value">${toText(stats.parentalResponsibility)}</strong>
              <span class="overview-stat-note">Contacts holding parental responsibility</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Important contacts</h3>
              <p>Family members and other key people linked to the young person.</p>
            </div>

            ${renderContactsRows(contactRows)}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Family contact records</h3>
              <p>Recorded contact, presentation, concerns, child voice and follow-up.</p>
            </div>

            ${renderRecordRows(familyRows, "No family contact records found.")}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Family contact records where concerns, high significance or follow-up are present.</p>
            </div>

            ${renderRecordRows(attentionRows, "No family contact concerns needing attention.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Approved and restricted contacts</h3>
              <p>Quick view of permissions and restrictions.</p>
            </div>

            ${renderRecordRows(permissionRows, "No approved or restricted contact flags found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Positive or reflective themes</h3>
              <p>Recent child voice, post-contact presentation and useful family patterns.</p>
            </div>

            ${renderRecordRows(positiveRows, "No positive or reflective themes recorded yet.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent family themes</h3>
              <p>The latest patterns adults may want to keep in mind.</p>
            </div>

            ${renderThemeCards(recentThemes)}
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

    const latestRecord = familyRecords[0];
    const nextConcern = familyRecords.find(
      (item) => item.follow_up_required || item.concerns
    );

    updateWorkspaceSummaryStrip({
      today: `${familyRecords.length} family contact record${familyRecords.length === 1 ? "" : "s"} • ${contacts.length} contacts`,
      nextEvent: nextConcern
        ? `${nextConcern.contact_person || nextConcern.contact_type || "Family contact"} needs follow-up`
        : "No immediate family concern",
      lastRecord: latestRecord
        ? `Latest family contact ${formatDate(
            latestRecord.contact_datetime || latestRecord.created_at
          )}`
        : "No recent family contact",
      openActions: `${stats.followUps} follow-up item${stats.followUps === 1 ? "" : "s"} • ${stats.restricted} restricted`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load family data.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Family unavailable",
      nextEvent: "Unable to load family view",
      lastRecord: "No family data loaded",
      openActions: "Check API responses",
    });
  }
}