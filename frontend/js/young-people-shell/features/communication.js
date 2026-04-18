import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function formatDateTime(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status = "") {
  const normalised = String(status || "").trim().toLowerCase();

  if (
    [
      "overdue",
      "escalated",
      "failed",
      "urgent",
      "critical",
      "unresolved",
      "high",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "pending",
      "awaiting_reply",
      "awaiting response",
      "review_due",
      "warning",
      "open",
      "in_progress",
      "in progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "completed",
      "sent",
      "resolved",
      "closed",
      "ok",
      "active",
      "done",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function normaliseCommunicationRecord(item = {}) {
  return {
    id: item.id || item.record_id || item.source_id || null,
    record_type:
      item.record_type ||
      item.communication_type ||
      item.channel ||
      "communication",
    title:
      item.subject ||
      item.title ||
      item.contact_person ||
      item.full_name ||
      item.contact_name ||
      item.organisation_name ||
      "Communication record",
    summary:
      item.summary ||
      item.full_note ||
      item.notes ||
      item.description ||
      item.message ||
      item.purpose_of_visit ||
      "",
    organisation:
      item.organisation ||
      item.organisation_name ||
      item.audience_type ||
      "",
    contact_type:
      item.contact_type ||
      item.communication_type ||
      item.channel ||
      item.direction ||
      "",
    relationship:
      item.relationship ||
      item.relationship_to_child ||
      item.relationship_to_young_person ||
      "",
    status: item.status || item.workflow_status || "",
    contact_datetime:
      item.contact_datetime ||
      item.communication_datetime ||
      item.created_at ||
      item.updated_at ||
      null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    raw: item,
  };
}

function renderEmptyState(message = "No communication records found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✉</div>
        <h3>No communication records</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No communication records found.") {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title = item.title || "Communication record";
          const summary = item.summary || "Communication record";

          const meta = [
            item.organisation || "",
            item.contact_type || "",
            formatDateTime(item.contact_datetime || item.created_at),
          ]
            .filter(Boolean)
            .join(" • ");

          const status = item.status || "";
          const tone = getStatusTone(status);

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id || "")}"
              data-record-type="${safeText(item.record_type || "communication")}"
              data-title="${safeText(title)}"
              tabindex="0"
              role="button"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(title)}</div>
                <div class="record-row-summary">${safeText(summary)}</div>
                <div class="record-row-meta">${safeText(meta)}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
                  status || "Recorded"
                )}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function isFamilyLinked(item = {}) {
  const haystack = [
    item.contact_type,
    item.relationship,
    item.summary,
    item.organisation,
    item.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /family|parent|mum|mom|dad|carer|grandparent|sibling|contact/i.test(
    haystack
  );
}

function buildCommunicationStats(items = []) {
  const recent = items.length;

  const pending = items.filter((item) =>
    ["pending", "awaiting_reply", "awaiting response", "review_due", "open"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const resolved = items.filter((item) =>
    ["resolved", "closed", "completed", "sent", "done"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const familyLinked = items.filter((item) => isFamilyLinked(item)).length;

  return {
    recent,
    pending,
    resolved,
    familyLinked,
  };
}

function buildAttentionItems(items = []) {
  return items.filter((item) =>
    ["pending", "awaiting_reply", "awaiting response", "review_due", "overdue", "escalated", "open"].includes(
      String(item.status || "").toLowerCase()
    )
  );
}

function renderCommunicationHtml({
  items = [],
  stats = {},
  attentionItems = [],
}) {
  const recentItems = items.slice(0, 8);
  const familyItems = items.filter((item) => isFamilyLinked(item));

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Communication</div>
          <h2>Professional communication</h2>
          <p>Recent liaison, partner-agency contact, family communication and follow-up.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Recent records</span>
              <strong class="overview-stat-value">${safeText(stats.recent)}</strong>
              <span class="overview-stat-note">Communication items available</span>
            </article>

            <article class="overview-stat-card ${
              stats.pending > 0 ? "overview-stat-card--warning" : ""
            }">
              <span class="overview-stat-label">Pending follow-up</span>
              <strong class="overview-stat-value">${safeText(stats.pending)}</strong>
              <span class="overview-stat-note">Awaiting reply or review</span>
            </article>

            <article class="overview-stat-card ${
              stats.resolved > 0 ? "overview-stat-card--success" : ""
            }">
              <span class="overview-stat-label">Resolved</span>
              <strong class="overview-stat-value">${safeText(stats.resolved)}</strong>
              <span class="overview-stat-note">Closed or completed communication</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Family-linked</span>
              <strong class="overview-stat-value">${safeText(stats.familyLinked)}</strong>
              <span class="overview-stat-note">Family or carer communication</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>Latest professional and family communication across the home.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent communication records found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Family and carer communication</h3>
              <p>Communication records that appear linked to family or carers.</p>
            </div>

            ${renderRecordRows(
              familyItems.slice(0, 8),
              "No family-linked communication records found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Communication that may need reply, review or follow-up.</p>
            </div>

            ${renderRecordRows(
              attentionItems.slice(0, 8),
              "No communication follow-up is currently showing."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All communication</h3>
              <p>Full communication list in newest-first order.</p>
            </div>

            ${renderRecordRows(items, "No communication records found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

async function fetchCommunication(homeId) {
  const safe = async (path) => {
    try {
      return await apiGet(path);
    } catch {
      return null;
    }
  };

  const [homeComms, notifications, directoryContacts] = await Promise.all([
    safe(`/homes/${homeId}/communications`),
    safe(`/homes/${homeId}/notifications`),
    safe(`/homes/${homeId}/directory-contacts`),
  ]);

  const communicationItems = toArray(
    homeComms?.items,
    [
      homeComms?.communications,
      homeComms?.records,
      homeComms?.data,
    ]
  ).map(normaliseCommunicationRecord);

  const notificationItems = toArray(
    notifications?.items,
    [
      notifications?.notifications,
      notifications?.records,
    ]
  ).map((item) =>
    normaliseCommunicationRecord({
      ...item,
      record_type: "notification",
      title: item.title || item.notification_type || "Notification",
      summary: item.message || item.summary || "",
      communication_type: item.notification_type || "notification",
      communication_datetime: item.created_at || item.updated_at,
      status: item.status || "active",
      organisation_name: "Home notification",
    })
  );

  const contactItems = toArray(
    directoryContacts?.items,
    [
      directoryContacts?.contacts,
      directoryContacts?.records,
    ]
  ).map((item) =>
    normaliseCommunicationRecord({
      ...item,
      record_type: "directory_contact",
      title: item.contact_name || item.full_name || "Directory contact",
      summary:
        item.notes ||
        item.contact_role ||
        item.organisation_name ||
        "Directory contact",
      communication_type: item.contact_role || "directory_contact",
      communication_datetime: item.updated_at || item.created_at,
      status: item.active === false ? "inactive" : "active",
      organisation_name: item.organisation_name || "",
    })
  );

  return sortNewestFirst(
    [...communicationItems, ...notificationItems, ...contactItems],
    ["contact_datetime", "updated_at", "created_at"]
  );
}

export async function loadCommunication() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">✉</div>
            <h3>No home context available</h3>
            <p>A home ID is needed before communication can load.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading communication…</p>
        </div>
      </div>
    </section>
  `;

  try {
    const items = await fetchCommunication(homeId);
    const stats = buildCommunicationStats(items);
    const attentionItems = buildAttentionItems(items);

    els.viewContent.innerHTML = renderCommunicationHtml({
      items,
      stats,
      attentionItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.recent} records`,
      nextEvent: attentionItems[0]
        ? attentionItems[0].title || "Follow-up due"
        : "No follow-up",
      lastRecord: items[0]
        ? formatDateTime(items[0].contact_datetime || items[0].created_at)
        : "None",
      openActions: `${stats.pending} pending`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error(error);

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <div class="empty-state">
          <div class="empty-state-inner">
            <div class="empty-state-icon" aria-hidden="true">!</div>
            <h3>Failed to load communication</h3>
            <p>${safeText(
              error?.message || "Communication records could not be loaded."
            )}</p>
          </div>
        </div>
      </section>
    `;
  }
}