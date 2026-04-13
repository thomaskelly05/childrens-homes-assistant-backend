import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

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
  const normalised = String(status || "").toLowerCase();

  if (
    ["overdue", "urgent", "critical", "escalated", "failed"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["follow_up_required", "warning", "due_soon", "review_due", "attention"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["active", "booked", "completed", "resolved", "current"].includes(
      normalised
    )
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

function normaliseTherapyItems(data = {}) {
  return toArray(data.items, [data.therapy, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "therapy",
    title:
      item.title ||
      item.service_name ||
      item.intervention_type ||
      "Therapeutic service",
    summary:
      item.summary ||
      item.recommendations ||
      item.staff_guidance ||
      item.next_steps ||
      "Therapeutic input recorded.",
    service_name: item.service_name || "",
    professional_name: item.professional_name || "",
    intervention_type: item.intervention_type || "",
    session_date:
      item.session_date ||
      item.record_date ||
      item.created_at ||
      null,
    recommendations: item.recommendations || "",
    staff_guidance: item.staff_guidance || "",
    next_steps: item.next_steps || "",
    follow_up_required:
      Boolean(item.follow_up_required) || Boolean(item.next_steps),
    status:
      item.status ||
      (item.follow_up_required || item.next_steps
        ? "follow_up_required"
        : "active"),
  }));
}

function buildTherapyStats(items = []) {
  const active = items.filter((item) =>
    ["active", "booked", "current"].includes(
      String(item.status || "").toLowerCase()
    )
  ).length;

  const followUp = items.filter((item) => item.follow_up_required).length;

  const withGuidance = items.filter(
    (item) => item.staff_guidance || item.recommendations
  ).length;

  const uniqueProfessionals = new Set(
    items.map((item) => item.professional_name).filter(Boolean)
  ).size;

  return {
    total: items.length,
    active,
    followUp,
    withGuidance,
    uniqueProfessionals,
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

function buildActiveItems(items = []) {
  return items.filter((item) =>
    ["active", "booked", "current", "follow_up_required"].includes(
      String(item.status || "").toLowerCase()
    )
  );
}

function buildGuidanceItems(items = []) {
  return items.filter((item) => item.staff_guidance || item.recommendations);
}

function renderEmptyState(message = "No therapy records.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">✦</div>
        <h3>No therapy records</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No therapy records found.") {
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
              data-record-type="${safeText(item.record_type || "therapy")}"
              data-title="${safeText(item.title || "Therapy")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  item.service_name || item.title || "Therapy"
                )}</div>
                <div class="record-row-summary">${safeText(
                  item.summary || "Therapeutic input recorded."
                )}</div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      item.professional_name || "",
                      item.intervention_type || "",
                      formatDate(item.session_date),
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  )}
                </div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${safeText(tone)}">${safeText(
            item.status || "recorded"
          )}</span>
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
        <p>No urgent therapy follow-up is showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 6)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(
                item.service_name || item.title || "Therapy"
              )}</strong>
              <p>${safeText(
                item.next_steps ||
                  item.staff_guidance ||
                  item.recommendations ||
                  item.summary ||
                  "Therapeutic follow-up needed."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTherapyPage({
  stats,
  recentItems,
  activeItems,
  priorityItems,
  guidanceItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Therapy</div>
          <h2>Therapeutic services</h2>
          <p>Therapeutic input, recommendations, staff guidance and follow-up across the home.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All records</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">Therapy records logged</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Active input</span>
              <strong class="overview-stat-value">${safeText(stats.active)}</strong>
              <span class="overview-stat-note">Current or active therapy involvement</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Follow-up needed</span>
              <strong class="overview-stat-value">${safeText(stats.followUp)}</strong>
              <span class="overview-stat-note">Recommendations or actions to complete</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Professionals</span>
              <strong class="overview-stat-value">${safeText(
                stats.uniqueProfessionals
              )}</strong>
              <span class="overview-stat-note">Distinct therapeutic professionals</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent therapy input</h3>
              <p>Latest therapeutic records and summaries.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent therapy records found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Active therapeutic input</h3>
              <p>Current services, active work and therapy input still in play.</p>
            </div>

            ${renderRecordRows(
              activeItems,
              "No active therapy input found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>Therapeutic follow-up and recommendations needing action.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Guidance for staff</h3>
              <p>Recommendations and guidance from therapeutic input.</p>
            </div>

            ${renderRecordRows(
              guidanceItems,
              "No therapy guidance records found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All therapy records</h3>
              <p>Full therapy record list.</p>
            </div>

            ${renderRecordRows(
              allItems,
              "No therapy records found."
            )}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function renderNoHomeContext() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("A home ID is needed before therapy records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No therapy context",
    nextEvent: "No therapy loaded",
    lastRecord: "No therapy data",
    openActions: "No follow-up loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading therapy…</p>
        </div>
      </div>
    </section>
  `;
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load therapy.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Therapy unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No therapy data",
    openActions: "Check API routes",
  });
}

export async function loadTherapy() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const data = await apiGet(`/homes/${homeId}/therapy`).catch(() => ({
      items: [],
    }));

    const allItems = sortNewestFirst(normaliseTherapyItems(data), [
      "session_date",
      "updated_at",
      "created_at",
    ]);

    const stats = buildTherapyStats(allItems);
    const recentItems = allItems.slice(0, 8);
    const activeItems = buildActiveItems(allItems).slice(0, 8);
    const priorityItems = buildPriorityItems(allItems);
    const guidanceItems = buildGuidanceItems(allItems).slice(0, 8);
    const latest = recentItems[0];

    els.viewContent.innerHTML = renderTherapyPage({
      stats,
      recentItems,
      activeItems,
      priorityItems,
      guidanceItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.total} therapy record${stats.total === 1 ? "" : "s"}`,
      nextEvent: priorityItems[0]?.session_date
        ? `Follow-up from ${formatDate(priorityItems[0].session_date)}`
        : "No urgent therapy follow-up",
      lastRecord: latest?.session_date
        ? `Latest therapy ${formatDateTime(latest.session_date)}`
        : "No recent therapy record",
      openActions: `${stats.followUp} therapy follow-up item${stats.followUp === 1 ? "" : "s"}`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load therapy.");
  }
}