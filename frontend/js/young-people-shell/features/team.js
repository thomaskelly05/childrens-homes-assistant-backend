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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const normalised = String(status || "").toLowerCase();

  if (
    ["absent", "sick", "off", "vacant", "vacancy", "critical", "escalated"].includes(
      normalised
    )
  ) {
    return "danger";
  }

  if (
    ["warning", "agency", "limited", "training_due", "probation", "attention"].includes(
      normalised
    )
  ) {
    return "warning";
  }

  if (
    ["active", "on_shift", "available", "confirmed", "good"].includes(
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

function normaliseTeamItems(data = {}) {
  return toArray(data.items, [data.team, data.staff, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "team",
    title: item.title || item.staff_member || "Team update",
    staff_member: item.staff_member || item.name || "Staff member",
    role: item.role || item.job_title || "",
    shift: item.shift || item.period || "",
    update_type: item.update_type || item.type || "",
    summary:
      item.summary ||
      item.impact ||
      item.actions_required ||
      item.notes ||
      "Team update recorded.",
    impact: item.impact || "",
    actions_required: item.actions_required || "",
    record_date: item.record_date || item.created_at || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    status: item.status || "active",
  }));
}

function buildTeamStats(items = []) {
  const absent = items.filter((item) =>
    ["absent", "sick", "off"].includes(String(item.status || "").toLowerCase())
  ).length;

  const agency = items.filter((item) =>
    ["agency"].includes(String(item.status || "").toLowerCase())
  ).length;

  const vacancies = items.filter((item) =>
    ["vacant", "vacancy"].includes(String(item.status || "").toLowerCase())
  ).length;

  const actions = items.filter((item) => item.actions_required).length;

  const uniqueStaff = new Set(
    items.map((item) => item.staff_member).filter(Boolean)
  ).size;

  return {
    total: items.length,
    absent,
    agency,
    vacancies,
    actions,
    uniqueStaff,
  };
}

function buildPriorityItems(items = []) {
  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    return (
      ["absent", "sick", "off", "vacant", "vacancy", "agency", "critical", "escalated"].includes(
        status
      ) || Boolean(item.actions_required)
    );
  });
}

function buildActiveItems(items = []) {
  return items.filter((item) =>
    ["active", "on_shift", "available", "agency", "absent", "sick", "off"].includes(
      String(item.status || "").toLowerCase()
    )
  );
}

function buildActionItems(items = []) {
  return items.filter((item) => item.actions_required || item.impact);
}

function renderEmptyState(message = "No team data available.") {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">◍</div>
        <h3>No team data</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderRecordRows(items = [], emptyMessage = "No team records found.") {
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
              data-record-type="${safeText(item.record_type || "team")}"
              data-title="${safeText(item.title || "Team update")}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${safeText(
                  item.staff_member || item.title || "Staff"
                )}</div>
                <div class="record-row-summary">${safeText(
                  item.summary || "Team update recorded."
                )}</div>
                <div class="record-row-meta">
                  ${safeText(
                    [
                      item.role || "",
                      item.shift || "",
                      item.update_type || "",
                      formatDate(item.record_date),
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
        <p>No urgent staffing issues are showing right now.</p>
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
              <strong>${safeText(item.staff_member || item.title || "Team item")}</strong>
              <p>${safeText(
                item.actions_required ||
                  item.impact ||
                  item.summary ||
                  "Staffing update needs attention."
              )}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTeamPage({
  stats,
  recentItems,
  activeItems,
  priorityItems,
  actionItems,
  allItems,
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Team</div>
          <h2>Team and staffing</h2>
          <p>Staffing updates, deployment issues, workforce pressures and team follow-up across the home.</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">All updates</span>
              <strong class="overview-stat-value">${safeText(stats.total)}</strong>
              <span class="overview-stat-note">Team and staffing records logged</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Absent staff</span>
              <strong class="overview-stat-value">${safeText(stats.absent)}</strong>
              <span class="overview-stat-note">Off, sick or unavailable staff</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Agency / cover</span>
              <strong class="overview-stat-value">${safeText(stats.agency)}</strong>
              <span class="overview-stat-note">Agency or cover-related staffing items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Vacancies</span>
              <strong class="overview-stat-value">${safeText(stats.vacancies)}</strong>
              <span class="overview-stat-note">Vacancy-related pressure</span>
            </article>
          </div>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent team updates</h3>
              <p>Latest staffing and workforce records.</p>
            </div>

            ${renderRecordRows(
              recentItems,
              "No recent team updates found."
            )}
          </section>

          <section class="overview-section-card">
            <div class="overview-section-head">
              <h3>Current staffing picture</h3>
              <p>Live staffing context including active, absent and agency-related items.</p>
            </div>

            ${renderRecordRows(
              activeItems,
              "No current staffing picture found."
            )}
          </section>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most important staffing issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Actions and impact</h3>
              <p>Operational impact and actions raised through team updates.</p>
            </div>

            ${renderRecordRows(
              actionItems,
              "No staffing actions or impact items found."
            )}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>All team records</h3>
              <p>Full team and staffing record list.</p>
            </div>

            ${renderRecordRows(
              allItems,
              "No team records found."
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
      ${renderEmptyState("A home ID is needed before team records can load.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No team context",
    nextEvent: "No staffing view loaded",
    lastRecord: "No team data",
    openActions: "No staffing actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading team…</p>
        </div>
      </div>
    </section>
  `;
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState(message || "Failed to load team data.")}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Team unavailable",
    nextEvent: "Unable to load",
    lastRecord: "No team data",
    openActions: "Check API routes",
  });
}

export async function loadTeam() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const data = await apiGet(`/homes/${homeId}/team`).catch(() => ({
      items: [],
    }));

    const allItems = sortNewestFirst(normaliseTeamItems(data), [
      "record_date",
      "updated_at",
      "created_at",
    ]);

    const stats = buildTeamStats(allItems);
    const recentItems = allItems.slice(0, 8);
    const activeItems = buildActiveItems(allItems).slice(0, 8);
    const priorityItems = buildPriorityItems(allItems);
    const actionItems = buildActionItems(allItems).slice(0, 8);
    const latest = recentItems[0];

    els.viewContent.innerHTML = renderTeamPage({
      stats,
      recentItems,
      activeItems,
      priorityItems,
      actionItems,
      allItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${stats.uniqueStaff} staff record${stats.uniqueStaff === 1 ? "" : "s"}`,
      nextEvent:
        priorityItems[0]?.record_date
          ? `Staffing issue from ${formatDate(priorityItems[0].record_date)}`
          : "No urgent staffing issue",
      lastRecord:
        latest?.record_date
          ? `Latest team update ${formatDateTime(latest.record_date)}`
          : "No recent team update",
      openActions: `${stats.actions} staffing action${stats.actions === 1 ? "" : "s"}`,
    });
  } catch (error) {
    renderErrorState(error?.message || "Failed to load team data.");
  }
}