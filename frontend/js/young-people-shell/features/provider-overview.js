import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";
import {
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "../ui/assistant-controller.js";

/* -------------------------------- helpers -------------------------------- */

const SAFE_EMPTY = Object.freeze({ items: [] });

function toArray(value, fallbacks = []) {
  if (Array.isArray(value)) return value;

  for (const fallback of fallbacks) {
    if (Array.isArray(fallback)) return fallback;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function safeText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function formatDate(value, fallback = "No date") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value, fallback = "No date") {
  if (!value) return fallback;
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

function badgeClass(value) {
  const v = lower(value).replaceAll(" ", "_");

  if (
    [
      "critical",
      "high",
      "urgent",
      "overdue",
      "failed",
      "error",
      "inadequate",
      "red",
      "stale",
      "missing",
      "draft",
      "held",
      "problem",
      "escalated",
      "non_compliant",
    ].includes(v)
  ) {
    return "badge badge-danger";
  }

  if (
    [
      "queued",
      "processing",
      "scheduled",
      "submitted",
      "warning",
      "amber",
      "medium",
      "in_progress",
      "held_for_review",
      "partial",
      "review_due",
      "awaiting_approval",
      "open",
      "due_soon",
    ].includes(v)
  ) {
    return "badge badge-warning";
  }

  if (
    [
      "good",
      "completed",
      "delivered",
      "sent",
      "approved",
      "generated",
      "success",
      "closed",
      "green",
      "outstanding",
      "published",
      "ready",
      "up_to_date",
      "current",
      "compliant",
    ].includes(v)
  ) {
    return "badge badge-success";
  }

  return "badge";
}

function safeGet(path) {
  return apiGet(path).catch(() => SAFE_EMPTY);
}

function pickItems(response, keys = []) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
}

function sortNewest(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return new Date(bValue || 0).getTime() - new Date(aValue || 0).getTime();
  });
}

function sortSoonest(items = [], key) {
  return [...items].sort((a, b) => {
    const aTime = a?.[key] ? new Date(a[key]).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b?.[key] ? new Date(b[key]).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

function dedupeBy(items = [], buildKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = buildKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getProviderLabel() {
  return (
    state.currentUser?.provider_name ||
    state.currentUser?.providerName ||
    "Provider"
  );
}

function getAccessibleHomeIds() {
  const ids = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (ids.length) {
    return [...new Set(ids)];
  }

  const currentHomeId = Number(
    state.homeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      0
  );

  return Number.isFinite(currentHomeId) && currentHomeId > 0
    ? [currentHomeId]
    : [];
}

/* ------------------------------ demo fallback ----------------------------- */

function buildFallbackData(homeIds = []) {
  const ids = homeIds.length ? homeIds : [1, 2, 3];
  const now = new Date();

  const minusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const plusDays = (days, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return {
    homeCards: ids.map((homeId, index) =>
      mapProviderHomeCard({
        home_id: homeId,
        home_name: `Home ${homeId}`,
        overall_band: index === 0 ? "Good" : index === 1 ? "Requires improvement" : "Good",
        overall_score: index === 0 ? 84 : index === 1 ? 68 : 79,
        confidence_score: index === 0 ? 82 : index === 1 ? 61 : 74,
        open_actions: index === 0 ? 4 : index === 1 ? 9 : 5,
        overdue_actions: index === 0 ? 1 : index === 1 ? 4 : 2,
        children_count: index === 0 ? 3 : index === 1 ? 2 : 4,
        staffing_pressure: index === 0 ? "medium" : index === 1 ? "high" : "medium",
        updated_at: minusDays(index + 1),
      })
    ),

    complianceItems: [
      mapComplianceItem({
        id: "pc-1",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        title: "Regulation 44 visit overdue",
        status: "overdue",
        severity: "high",
        due_date: minusDays(5),
        created_at: minusDays(7),
      }),
      mapComplianceItem({
        id: "pc-2",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        title: "Statement of Purpose review due",
        status: "review_due",
        severity: "medium",
        due_date: plusDays(3),
        created_at: minusDays(2),
      }),
    ],

    inspectionActions: [
      mapInspectionAction({
        id: "pia-1",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        action_title: "Evidence leadership oversight",
        action_description: "Complete linked management review evidence.",
        priority: "high",
        status: "open",
        due_date: plusDays(2),
        owner_user_name: "Sarah Jones",
        created_at: minusDays(1),
      }),
      mapInspectionAction({
        id: "pia-2",
        home_id: ids[2] || ids[0],
        home_name: `Home ${ids[2] || ids[0]}`,
        action_title: "Update safeguarding audit trail",
        action_description: "Tighten chronology and oversight links.",
        priority: "medium",
        status: "open",
        due_date: plusDays(4),
        owner_user_name: "Tom Patel",
        created_at: minusDays(2),
      }),
    ],

    reports: [
      mapReport({
        id: "pr-1",
        home_id: ids[0],
        home_name: `Home ${ids[0]}`,
        title: "Monthly quality summary",
        status: "completed",
        review_month: minusDays(15),
        summary: "Quality summary generated for provider review.",
        created_at: minusDays(3),
      }),
      mapReport({
        id: "pr-2",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        title: "Inspection evidence preparation pack",
        status: "draft",
        review_month: minusDays(8),
        summary: "Inspection pack draft awaiting final review.",
        created_at: minusDays(1),
      }),
    ],

    teamRows: [
      mapTeamSignal({
        id: "pt-1",
        home_id: ids[1] || ids[0],
        home_name: `Home ${ids[1] || ids[0]}`,
        title: "Vacancy pressure",
        role: "Staffing",
        status: "vacancy",
        summary: "Two rota gaps this week and agency use increasing.",
        created_at: minusDays(2),
      }),
      mapTeamSignal({
        id: "pt-2",
        home_id: ids[2] || ids[0],
        home_name: `Home ${ids[2] || ids[0]}`,
        title: "Supervision gap",
        role: "Supervision",
        status: "review_due",
        summary: "Three staff supervisions due within seven days.",
        created_at: minusDays(1),
      }),
    ],

    isFallback: true,
  };
}

/* -------------------------------- mappers -------------------------------- */

function mapProviderHomeCard(record = {}) {
  return {
    id: record.id || record.home_id || null,
    home_id: record.home_id || record.id || null,
    home_name: record.home_name || record.title || "Home",
    overall_band: record.overall_band || record.status || "",
    overall_score: record.overall_score ?? null,
    confidence_score: record.confidence_score ?? null,
    open_actions: record.open_actions ?? 0,
    overdue_actions: record.overdue_actions ?? 0,
    children_count: record.children_count ?? record.occupancy ?? 0,
    staffing_pressure: record.staffing_pressure || "",
    updated_at: record.updated_at || record.created_at || null,
    title: record.home_name || "Home",
    summary:
      record.summary ||
      `${titleCase(record.overall_band || "Unknown")} • ${record.open_actions ?? 0} open actions`,
    record_type: "provider_home_card",
  };
}

function mapComplianceItem(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    title: record.title || "Compliance item",
    status: record.status || "",
    severity: record.severity || "",
    due_date: record.due_date || null,
    summary:
      record.summary ||
      `${record.home_name || "Home"} • ${record.title || "Compliance item"}`,
    record_type: "compliance_item",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapInspectionAction(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    title: record.action_title || record.title || "Inspection action",
    action_description: record.action_description || "",
    priority: record.priority || "",
    status: record.status || "",
    due_date: record.due_date || null,
    owner_user_name:
      record.owner_user_name ||
      record.owner_staff_name ||
      record.owner_name ||
      "",
    summary:
      record.summary ||
      record.action_description ||
      "Inspection action recorded.",
    record_type: "inspection_action",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapReport(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    title: record.title || record.review_title || "Report",
    status: record.status || "",
    review_month: record.review_month || null,
    summary:
      record.summary ||
      record.summary_of_month ||
      record.report_text ||
      "Report recorded.",
    record_type: "provider_report",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

function mapTeamSignal(record = {}) {
  return {
    id: record.id,
    home_id: record.home_id || null,
    home_name: record.home_name || "",
    title: record.title || record.full_name || "Team signal",
    role: record.role || "",
    status: record.status || "",
    summary:
      record.summary ||
      record.notes ||
      "Team signal recorded.",
    record_type: "provider_team_signal",
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
  };
}

/* -------------------------------- render -------------------------------- */

function renderEmpty(title, message) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon">○</div>
        <h3>${safeText(title)}</h3>
        <p>${safeText(message)}</p>
      </div>
    </div>
  `;
}

function renderSection(title, content) {
  return `
    <section class="overview-panel-section">
      <div class="overview-panel-section-head">
        <h3>${safeText(title)}</h3>
      </div>
      ${content}
    </section>
  `;
}

function renderStatCard(label, value, hint = "") {
  return `
    <article class="overview-stat-card">
      <span class="overview-stat-label">${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
      ${hint ? `<div class="overview-stat-subtle">${safeText(hint)}</div>` : ""}
    </article>
  `;
}

function renderRecordCard(item = {}, options = {}) {
  const {
    statusKey = "status",
    primaryDate =
      item.due_date ||
      item.review_month ||
      item.updated_at ||
      item.created_at,
  } = options;

  const status = item?.[statusKey] || item.priority || item.overall_band || "";

  return `
    <article
      class="record-card"
      data-open-record="true"
      data-record-id="${safeText(item.id || "")}"
      data-record-type="${safeText(item.record_type || "record")}"
      data-title="${safeText(item.title || "Record")}"
      role="button"
      tabindex="0"
    >
      <div class="record-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div class="record-card-title">${safeText(item.title || "Record")}</div>
          <div class="record-card-meta">${safeText(formatDateTime(primaryDate, "No date"))}</div>
        </div>
        ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
      </div>

      <div class="record-card-body">
        <div class="record-card-summary">${safeText(item.summary || "")}</div>

        <div class="details-grid" style="margin-top:12px;">
          ${
            item.home_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Home</div>
                  <div class="details-grid-value">${safeText(item.home_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.due_date
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Due</div>
                  <div class="details-grid-value">${safeText(formatDate(item.due_date))}</div>
                </div>
              `
              : ""
          }

          ${
            item.owner_user_name
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Owner</div>
                  <div class="details-grid-value">${safeText(item.owner_user_name)}</div>
                </div>
              `
              : ""
          }

          ${
            item.overall_score !== null && item.overall_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Score</div>
                  <div class="details-grid-value">${safeText(toNumber(item.overall_score).toFixed(1))}</div>
                </div>
              `
              : ""
          }

          ${
            item.confidence_score !== null && item.confidence_score !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Confidence</div>
                  <div class="details-grid-value">${safeText(toNumber(item.confidence_score).toFixed(1))}</div>
                </div>
              `
              : ""
          }

          ${
            item.open_actions !== null && item.open_actions !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Open actions</div>
                  <div class="details-grid-value">${safeText(item.open_actions)}</div>
                </div>
              `
              : ""
          }

          ${
            item.overdue_actions !== null && item.overdue_actions !== undefined
              ? `
                <div class="details-grid-item">
                  <div class="details-grid-label">Overdue</div>
                  <div class="details-grid-value">${safeText(item.overdue_actions)}</div>
                </div>
              `
              : ""
          }
        </div>

        ${
          item.action_description
            ? `
              <div class="record-card-block">
                <div class="record-card-block-label">Action detail</div>
                <div>${safeText(item.action_description)}</div>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderCardList(items = [], emptyTitle, emptyMessage, options = {}) {
  if (!items.length) return renderEmpty(emptyTitle, emptyMessage);
  return `<div class="record-card-list">${items
    .map((item) => renderRecordCard(item, options))
    .join("")}</div>`;
}

function renderHomeGrid(cards = []) {
  if (!cards.length) {
    return renderEmpty(
      "No homes returned",
      "No provider home cards are available right now."
    );
  }

  return `
    <div class="record-card-list">
      ${cards
        .map((item) =>
          renderRecordCard(item, {
            statusKey: "overall_band",
            primaryDate: item.updated_at || item.created_at,
          })
        )
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No urgent provider-level issues are surfacing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 8)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title || "Priority issue")}</strong>
              <p>${safeText(item.summary || "Needs attention.")}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return renderEmpty(
      "No provider activity yet",
      "There is no recent provider-level activity to display."
    );
  }

  return `
    <div class="timeline-list">
      ${items
        .map((item) => {
          const dateValue =
            item.due_date ||
            item.review_month ||
            item.updated_at ||
            item.created_at;

          const status =
            item.status ||
            item.priority ||
            item.overall_band ||
            "";

          return `
            <article class="timeline-item">
              <div class="timeline-item-date">${safeText(formatDateTime(dateValue, "No date"))}</div>
              <div class="timeline-item-body">
                <div class="timeline-item-title-row" style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                  <strong>${safeText(item.title || "Record")}</strong>
                  ${status ? `<span class="${badgeClass(status)}">${safeText(titleCase(status))}</span>` : ""}
                </div>
                <div class="timeline-item-summary">${safeText(
                  [item.home_name, item.summary].filter(Boolean).join(" • ")
                )}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWorkspace(payload) {
  const {
    providerLabel,
    providerHomeCards,
    urgentHomes,
    overdueCompliance,
    urgentInspectionActions,
    workforcePressure,
    recentReports,
    timeline,
    isFallback,
  } = payload;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Provider overview</div>
          <h2>${safeText(providerLabel)} • cross-home oversight</h2>
          <p class="overview-panel-subtitle">
            One provider-wide view across homes, readiness, compliance pressure, reports and leadership attention.
          </p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live provider-wide data is available.</p>`
              : ""
          }
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderStatCard("Homes in view", providerHomeCards.length)}
        ${renderStatCard("Homes needing attention", urgentHomes.length)}
        ${renderStatCard("Overdue compliance", overdueCompliance.length)}
        ${renderStatCard("Urgent inspection actions", urgentInspectionActions.length)}
        ${renderStatCard("Workforce pressure signals", workforcePressure.length)}
      </div>

      <div class="overview-grid">
        <div>
          ${renderSection(
            "Homes at a glance",
            renderHomeGrid(providerHomeCards)
          )}

          ${renderSection(
            "Urgent inspection actions",
            renderCardList(
              urgentInspectionActions,
              "No urgent inspection actions",
              "No urgent inspection actions are currently open.",
              { statusKey: "priority" }
            )
          )}

          ${renderSection(
            "Recent provider reporting",
            renderCardList(
              recentReports,
              "No reports available",
              "No recent provider-level or home-level reports were returned."
            )
          )}

          ${renderSection("Provider activity timeline", renderTimeline(timeline))}
        </div>

        <aside>
          ${renderSection(
            "Homes needing attention",
            renderPriorityList(urgentHomes)
          )}

          ${renderSection(
            "Overdue compliance",
            renderCardList(
              overdueCompliance,
              "No overdue compliance",
              "There are no overdue compliance items across visible homes."
            )
          )}

          ${renderSection(
            "Workforce pressure",
            renderCardList(
              workforcePressure,
              "No workforce pressure signals",
              "No workforce pressure items are currently surfacing."
            )
          )}
        </aside>
      </div>
    </section>
  `;
}

/* -------------------------------- fetch -------------------------------- */

async function fetchProviderDataset(homeIds = []) {
  const homeCardsRes = await safeGet("/inspection/ui/home-cards");
  const homeCardItems = pickItems(homeCardsRes, ["inspection_home_cards", "items"])
    .map(mapProviderHomeCard)
    .filter((item) =>
      !homeIds.length ? true : homeIds.includes(Number(item.home_id || item.id))
    );

  const perHomeData = await Promise.all(
    homeIds.map(async (homeId) => {
      const [complianceRes, inspectionActionsRes, reportsRes, teamRes] =
        await Promise.all([
          safeGet(`/homes/${homeId}/compliance`),
          safeGet(`/inspection/ui/homes/${homeId}/actions`),
          safeGet(`/homes/${homeId}/reports`),
          safeGet(`/homes/${homeId}/team`),
        ]);

      return {
        compliance: pickItems(complianceRes, ["compliance_items", "items"]).map((item) =>
          mapComplianceItem({
            ...item,
            home_id: item.home_id || homeId,
            home_name:
              item.home_name ||
              homeCardItems.find((card) => Number(card.home_id) === Number(homeId))?.home_name ||
              `Home ${homeId}`,
          })
        ),

        inspectionActions: pickItems(
          inspectionActionsRes,
          ["inspection_actions", "inspection_improvement_actions", "items"]
        ).map((item) =>
          mapInspectionAction({
            ...item,
            home_id: item.home_id || homeId,
            home_name:
              item.home_name ||
              homeCardItems.find((card) => Number(card.home_id) === Number(homeId))?.home_name ||
              `Home ${homeId}`,
          })
        ),

        reports: pickItems(reportsRes, ["reports", "monthly_reviews", "items"]).map((item) =>
          mapReport({
            ...item,
            home_id: item.home_id || homeId,
            home_name:
              item.home_name ||
              homeCardItems.find((card) => Number(card.home_id) === Number(homeId))?.home_name ||
              `Home ${homeId}`,
          })
        ),

        teamRows: pickItems(teamRes, ["team", "staff", "items"]).map((item) =>
          mapTeamSignal({
            ...item,
            home_id: item.home_id || homeId,
            home_name:
              item.home_name ||
              homeCardItems.find((card) => Number(card.home_id) === Number(homeId))?.home_name ||
              `Home ${homeId}`,
            title:
              item.full_name ||
              item.staff_member ||
              item.name ||
              item.title ||
              "Staffing signal",
            role: item.role || item.job_title || "",
            status: item.status || item.employment_status || "",
            summary:
              item.summary ||
              item.notes ||
              `${item.role || "Staff"} • ${item.status || "Status recorded"}`,
          })
        ),
      };
    })
  );

  const complianceItems = perHomeData.flatMap((item) => item.compliance);
  const inspectionActions = perHomeData.flatMap((item) => item.inspectionActions);
  const reports = perHomeData.flatMap((item) => item.reports);
  const teamRows = perHomeData.flatMap((item) => item.teamRows);

  const hasLiveData =
    homeCardItems.length ||
    complianceItems.length ||
    inspectionActions.length ||
    reports.length ||
    teamRows.length;

  if (!hasLiveData) {
    return buildFallbackData(homeIds);
  }

  return {
    homeCards: homeCardItems,
    complianceItems,
    inspectionActions,
    reports,
    teamRows,
    isFallback: false,
  };
}

/* ------------------------------- selectors ------------------------------- */

function buildUrgentHomes(data) {
  const homeCards = sortNewest(data.homeCards, ["updated_at"]);

  return homeCards
    .filter((item) => {
      const band = lower(item.overall_band);
      return (
        ["requires_improvement", "inadequate", "amber", "red"].includes(band) ||
        toNumber(item.overdue_actions) > 0 ||
        toNumber(item.open_actions) >= 8 ||
        toNumber(item.confidence_score) > 0 && toNumber(item.confidence_score) < 70
      );
    })
    .map((item) => ({
      title: item.home_name || "Home",
      summary: [
        item.overall_band ? `Band ${titleCase(item.overall_band)}` : "",
        item.overdue_actions ? `${item.overdue_actions} overdue` : "",
        item.open_actions ? `${item.open_actions} open actions` : "",
        item.confidence_score ? `confidence ${item.confidence_score}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    }))
    .slice(0, 8);
}

function buildOverdueCompliance(data) {
  return sortSoonest(
    data.complianceItems.filter((item) => {
      const status = lower(item.status).replaceAll(" ", "_");
      return ["overdue", "escalated", "review_due", "missing"].includes(status);
    }),
    "due_date"
  ).slice(0, 10);
}

function buildUrgentInspectionActions(data) {
  return sortSoonest(
    data.inspectionActions.filter((item) => {
      const priority = lower(item.priority).replaceAll(" ", "_");
      const status = lower(item.status).replaceAll(" ", "_");
      return (
        !["completed", "closed", "cancelled"].includes(status) &&
        ["critical", "high", "urgent"].includes(priority)
      );
    }),
    "due_date"
  ).slice(0, 10);
}

function buildWorkforcePressure(data) {
  return sortNewest(
    data.teamRows.filter((item) => {
      const status = lower(item.status).replaceAll(" ", "_");
      return [
        "vacancy",
        "vacant",
        "absent",
        "sick",
        "review_due",
        "overdue",
        "agency",
        "bank_staff",
      ].includes(status);
    }),
    ["updated_at", "created_at"]
  ).slice(0, 10);
}

function buildRecentReports(data) {
  return sortNewest(data.reports, ["review_month", "updated_at", "created_at"]).slice(0, 10);
}

function buildTimeline(data) {
  return sortNewest(
    dedupeBy(
      [
        ...data.complianceItems,
        ...data.inspectionActions,
        ...data.reports,
        ...data.teamRows,
      ],
      (item) => `${item.record_type}:${item.id}:${item.home_id || ""}`
    ),
    ["due_date", "review_month", "updated_at", "created_at"]
  ).slice(0, 25);
}

/* -------------------------------- public -------------------------------- */

export async function loadProviderOverview() {
  if (!els.viewContent) return;

  const homeIds = getAccessibleHomeIds();

  if (!homeIds.length) {
    els.viewContent.innerHTML = renderEmpty(
      "No homes available",
      "There are no accessible homes available for provider overview."
    );

    updateWorkspaceSummaryStrip({
      today: "No provider context",
      nextEvent: "No homes in scope",
      lastRecord: "No provider data",
      openActions: "No actions loaded",
    });
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading provider overview...</p>
    </div>
  `;

  try {
    const data = await fetchProviderDataset(homeIds);

    const providerHomeCards = sortNewest(data.homeCards, ["updated_at"]).slice(0, 12);
    const urgentHomes = buildUrgentHomes(data);
    const overdueCompliance = buildOverdueCompliance(data);
    const urgentInspectionActions = buildUrgentInspectionActions(data);
    const workforcePressure = buildWorkforcePressure(data);
    const recentReports = buildRecentReports(data);
    const timeline = buildTimeline(data);

    els.viewContent.innerHTML = renderWorkspace({
      providerLabel: getProviderLabel(),
      providerHomeCards,
      urgentHomes,
      overdueCompliance,
      urgentInspectionActions,
      workforcePressure,
      recentReports,
      timeline,
      isFallback: data.isFallback,
    });

    const nextPriority =
      urgentInspectionActions[0] ||
      overdueCompliance[0] ||
      workforcePressure[0] ||
      null;

    updateWorkspaceSummaryStrip({
      today: data.isFallback
        ? `${providerHomeCards.length} homes • preview mode`
        : `${providerHomeCards.length} homes • ${urgentHomes.length} need attention`,
      nextEvent: nextPriority?.due_date
        ? `Due ${formatDate(nextPriority.due_date)}`
        : "No immediate provider action due",
      lastRecord: recentReports[0]
        ? `Latest report ${formatDate(
            recentReports[0].review_month ||
              recentReports[0].updated_at ||
              recentReports[0].created_at
          )}`
        : data.isFallback
        ? "Preview provider data loaded"
        : "No recent provider report",
      openActions: `${urgentInspectionActions.length} urgent inspection • ${overdueCompliance.length} overdue compliance`,
    });

    await onAssistantScopeChanged();
    renderAssistantControllerPanels();
  } catch (error) {
    console.error("[provider-overview] load failed", error);

    els.viewContent.innerHTML = renderEmpty(
      "Unable to load provider overview",
      error?.message || "Something went wrong while loading provider oversight."
    );

    updateWorkspaceSummaryStrip({
      today: "Provider overview unavailable",
      nextEvent: "No immediate provider action due",
      lastRecord: "No provider data",
      openActions: "Check provider routes",
    });
  }
}