import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function getYoungPersonId() {
  return state.youngPersonId || null;
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

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status = "") {
  const s = String(status || "").toLowerCase();

  if (
    ["overdue", "escalated", "urgent", "critical", "failed"].includes(s)
  ) {
    return "danger";
  }

  if (
    ["follow_up", "follow_up_required", "due_soon", "warning", "attention"].includes(s)
  ) {
    return "warning";
  }

  if (
    ["completed", "logged", "sent", "resolved", "active"].includes(s)
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

function normaliseCommunicationItems(data = {}) {
  return toArray(data.items, [data.communications, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "communication",
    title:
      item.title ||
      item.contact_person ||
      item.organisation ||
      item.contact_type ||
      "Communication",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      item.decisions ||
      item.actions_required ||
      "Communication logged.",
    contact_datetime:
      item.contact_datetime ||
      item.created_at ||
      item.updated_at ||
      null,
    contact_person: item.contact_person || "",
    organisation: item.organisation || "",
    contact_type: item.contact_type || "",
    role: item.role || "",
    direction: item.direction || "",
    actions_required: item.actions_required || "",
    follow_up_required: Boolean(item.follow_up_required),
    status:
      item.status ||
      (item.follow_up_required ? "follow_up_required" : "logged"),
  }));
}

function buildCommunicationStats(items = []) {
  const followUp = items.filter((item) => item.follow_up_required).length;

  const professional = items.filter((item) =>
    ["professional", "agency", "social_worker", "school", "health"].includes(
      String(item.contact_type || "").toLowerCase()
    )
  ).length;

  const family = items.filter((item) =>
    ["family", "parent", "carer"].includes(
      String(item.contact_type || "").toLowerCase()
    )
  ).length;

  const incoming = items.filter((item) =>
    ["incoming", "inbound", "received"].includes(
      String(item.direction || "").toLowerCase()
    )
  ).length;

  return {
    total: items.length,
    followUp,
    professional,
    family,
    incoming,
  };
}

function buildPriorityItems(items = []) {
  return items.filter(
    (item) =>
      item.follow_up_required ||
      ["urgent", "critical", "escalated"].includes(
        String(item.status || "").toLowerCase()
      )
  );
}

function buildRecentItems(items = []) {
  return sortNewestFirst(items, ["contact_datetime", "updated_at", "created_at"]).slice(0, 8);
}

function buildProfessionalItems(items = []) {
  return items.filter((item) =>
    ["professional", "agency", "social_worker", "school", "health"].includes(
      String(item.contact_type || "").toLowerCase()
    )
  );
}

function buildFamilyItems(items = []) {
  return items.filter((item) =>
    ["family", "parent", "carer"].includes(
      String(item.contact_type || "").toLowerCase()
    )
  );
}

function renderEmptyState(message = "No communication records found.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✉</div>
        <h3>No communication found</h3>
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
          const tone = getStatusTone(item.status);
          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(item.id)}"
              data-record-type="${safeText(item.record_type || "communication")}"
              data-title="${safeText(item.title || "Communication")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(item.contact_person || item.title || "Contact")}</div>
                <div class="record-row-summary">${safeText(item.summary || "")}</div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      item.organisation || "",
                      item.contact_type || "",
                      item.direction || "",
                      formatDateTime(item.contact_datetime),
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(item.status || "logged")}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent communication follow-up is showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items.slice(0, 6)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.contact_person || item.title || "Communication")}</strong>
              <p>${safeText(
                item.actions_required ||
                  item.summary ||
                  "Communication needs follow-up."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCommunicationPage({
  title = "Communication",
  subtitle = "Professional and family communication records.",
  stats,
  priorityItems,
  recentItems,
  professionalItems,
  familyItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Communication</div>
          <h2>${safeText(title)}</h2>
          <p>${safeText(subtitle)}</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All communication</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">All logged communication records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Follow-up required</span>
              <strong class="overview-stat-value">${safeText(stats.followUp)}</strong>
              <span class="overview-stat-note">Need action or response</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Professional</span>
              <strong class="overview-stat-value">${safeText(stats.professional)}</strong>
              <span class="overview-stat-note">Partner agency and professional contact</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Family</span>
              <strong class="overview-stat-value">${safeText(stats.family)}</strong>
              <span class="overview-stat-note">Family and carer communication</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent communication</h3>
              <p>The latest communication records in date order.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent communication records found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Professional communication</h3>
              <p>Contact with schools, health, social care and partner agencies.</p>
            </div>

            ${renderRecordRows(
              professionalItems,
              "No professional communication records found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Communication needing follow-up or action.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Family communication</h3>
              <p>Family, parent and carer communication records.</p>
            </div>

            ${renderRecordRows(
              familyItems,
              "No family communication records found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All communication</h3>
              <p>Full communication record list.</p>
            </div>

            ${renderRecordRows(
              allItems,
              "No communication records found."
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

export async function loadCommunication() {
  if (!els.viewContent) return;

  const scope = getCurrentScope();
  const homeId = getHomeId();
  const youngPersonId = getYoungPersonId();

  if (scope === "child" && !youngPersonId) {
    els.viewContent.innerHTML = renderEmptyState("No young person selected.");
    updateWorkspaceSummaryStrip({
      today: "No child context",
      nextEvent: "No communication loaded",
      lastRecord: "No communication data",
      openActions: "No follow-up loaded",
    });
    return;
  }

  if (scope !== "child" && !homeId) {
    els.viewContent.innerHTML = renderEmptyState("No home context available.");
    updateWorkspaceSummaryStrip({
      today: "No home context",
      nextEvent: "No communication loaded",
      lastRecord: "No communication data",
      openActions: "No follow-up loaded",
    });
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
    const endpoint =
      scope === "child"
        ? `/young-people/${youngPersonId}/communications`
        : `/homes/${homeId}/communications`;

    const data = await apiGet(endpoint).catch(() => ({ items: [] }));
    const allItems = sortNewestFirst(
      normaliseCommunicationItems(data),
      ["contact_datetime", "updated_at", "created_at"]
    );

    const stats = buildCommunicationStats(allItems);
    const priorityItems = buildPriorityItems(allItems);
    const recentItems = buildRecentItems(allItems);
    const professionalItems = buildProfessionalItems(allItems).slice(0, 8);
    const familyItems = buildFamilyItems(allItems).slice(0, 8);

    const latest = recentItems[0];

    els.viewContent.innerHTML = renderCommunicationPage({
      title: scope === "child" ? "Professional communication" : "Communication",
      subtitle:
        scope === "child"
          ? "Communication linked to this young person."
          : "Professional and service-level communication records.",
      stats,
      priorityItems,
      recentItems,
      professionalItems,
      familyItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.total} communication record${stats.total === 1 ? "" : "s"}`,
      nextEvent: priorityItems[0]?.contact_datetime
        ? `Follow-up from ${formatDate(priorityItems[0].contact_datetime)}`
        : "No urgent follow-up",
      lastRecord: latest?.contact_datetime
        ? `Latest comms ${formatDateTime(latest.contact_datetime)}`
        : "No recent communication",
      openActions: `${stats.followUp} follow-up required`,
    });
  } catch (error) {
    els.viewContent.innerHTML = renderEmptyState(
      error?.message || "Failed to load communication."
    );

    updateWorkspaceSummaryStrip({
      today: "Communication unavailable",
      nextEvent: "Unable to load",
      lastRecord: "No communication data",
      openActions: "Check API routes",
    });
  }
}