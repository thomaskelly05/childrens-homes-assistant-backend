import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  renderRowList,
  renderSection,
  renderSummaryStat,
  renderEmptyState,
} from "../ui/helpers.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    state.selectedYoungPerson?.home_id ||
    null
  );
}

function getScopeEntityId() {
  return getCurrentScope() === "child" ? getYoungPersonId() : getHomeId();
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "child") {
    const person = state.selectedYoungPerson || state.youngPerson || {};
    return (
      person.full_name ||
      person.name ||
      [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
      person.preferred_name ||
      "Young person"
    );
  }

  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (getHomeId() ? `Home ${getHomeId()}` : "Home")
  );
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function buildReportRows(items = []) {
  return items.map((item) => ({
    ...item,
    id: item.id ?? item.report_id ?? item.source_id ?? null,
    record_type: item.record_type || "report",
    title: item.title || item.report_type || item.name || "Report",
    summary:
      item.summary ||
      item.description ||
      item.report_text ||
      item.notes ||
      "Report available.",
    status: item.status || item.workflow_status || "completed",
    created_at: item.created_at || item.generated_at || item.updated_at || null,
    report_type: item.report_type || "",
  }));
}

function getReportEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) return null;

  if (scope === "child") {
    return {
      reports: `/young-people/${id}/reports`,
      reviews: `/young-people/${id}/monthly-reviews`,
      inspection: null,
    };
  }

  return {
    reports: `/homes/${id}/reports`,
    reviews: `/homes/${id}/reports`,
    inspection: `/homes/${id}/inspection-readiness`,
  };
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading reports…</p>
        </div>
      </div>
    </section>
  `;
}

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening reports."
      : "A home context is needed before reports can load.";

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      ${renderEmptyState("No report context", message)}
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No reports context",
    nextEvent: "No schedule loaded",
    lastRecord: "No report data",
    openActions: "No actions loaded",
  });
}

function renderReportsHtml({
  reports = [],
  reviewItems = [],
  inspectionItems = [],
}) {
  const completedCount = reports.filter((item) =>
    ["completed", "approved", "published", "active"].includes(
      normaliseToken(item.status)
    )
  ).length;

  const pendingCount = reports.filter((item) =>
    ["draft", "submitted", "pending_review", "in_progress"].includes(
      normaliseToken(item.status)
    )
  ).length;

  const latestReport = reports[0] || null;

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Reports</div>
          <h2>${escapeHtml(getScopeTitle())}</h2>
          <p>Structured reports, reviews and generated outputs for this ${
            getCurrentScope() === "child" ? "young person" : "home"
          }.</p>
        </div>
      </div>

      <div class="overview-stats-grid">
        ${renderSummaryStat("Reports", reports.length, "Total available")}
        ${renderSummaryStat("Completed", completedCount, "Ready to review")}
        ${renderSummaryStat("In progress", pendingCount, "Draft or pending")}
        ${renderSummaryStat(
          "Review items",
          reviewItems.length,
          "Linked review outputs"
        )}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          ${renderSection(
            "Latest reports",
            renderRowList(reports.slice(0, 10), "No reports found."),
            "Recent generated or saved reports."
          )}

          ${renderSection(
            "Reviews and outputs",
            renderRowList(reviewItems.slice(0, 10), "No review outputs found."),
            "Monthly reviews, summaries and structured outputs."
          )}
        </section>

        <aside class="overview-side">
          ${renderSection(
            "Inspection-linked outputs",
            renderRowList(
              inspectionItems.slice(0, 8),
              "No inspection-linked outputs found."
            ),
            "Readiness or inspection-related evidence and outputs."
          )}

          ${renderSection(
            "Latest activity",
            latestReport
              ? `
                <div class="record-list">
                  <article class="record-row">
                    <div class="record-row-main">
                      <div class="record-row-title">${escapeHtml(
                        latestReport.title || "Latest report"
                      )}</div>
                      <div class="record-row-summary">${escapeHtml(
                        latestReport.summary || "Report available."
                      )}</div>
                      <div class="record-row-meta">${escapeHtml(
                        latestReport.created_at
                          ? formatDate(latestReport.created_at)
                          : "No date"
                      )}</div>
                    </div>
                  </article>
                </div>
              `
              : renderEmptyState("No recent report", "No report activity found."),
            "The most recent report activity."
          )}
        </aside>
      </div>
    </section>
  `;
}

export async function loadReports() {
  if (!els.viewContent) return;

  const endpoints = getReportEndpoints();

  if (!endpoints) {
    renderNoContext();
    return;
  }

  renderLoadingState();

  try {
    const [reportsData, reviewsData, inspectionData] = await Promise.all([
      apiGet(endpoints.reports).catch(() => ({ items: [] })),
      apiGet(endpoints.reviews).catch(() => ({ items: [] })),
      endpoints.inspection
        ? apiGet(endpoints.inspection).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
    ]);

    const reports = sortNewestFirst(
      buildReportRows(
        safeArray(reportsData.items || reportsData.records || reportsData.reports)
      ),
      ["created_at", "updated_at"]
    );

    const reviewItems = sortNewestFirst(
      buildReportRows(
        safeArray(reviewsData.items || reviewsData.records || reviewsData.reports)
      ),
      ["created_at", "updated_at"]
    );

    const inspectionItems = sortNewestFirst(
      buildReportRows(
        safeArray(
          inspectionData.items ||
            inspectionData.records ||
            inspectionData.reports ||
            inspectionData.readiness
        )
      ),
      ["created_at", "updated_at", "review_date"]
    );

    els.viewContent.innerHTML = renderReportsHtml({
      reports,
      reviewItems,
      inspectionItems,
    });

    updateWorkspaceSummaryStrip({
      today: `${reports.length} report${reports.length === 1 ? "" : "s"} available`,
      nextEvent:
        reviewItems[0]?.created_at
          ? `Latest review ${formatDate(reviewItems[0].created_at)}`
          : "No review schedule loaded",
      lastRecord:
        reports[0]?.title || reviewItems[0]?.title || "No recent report loaded",
      openActions: `${reports.filter((item) =>
        ["draft", "submitted", "pending_review", "in_progress"].includes(
          normaliseToken(item.status)
        )
      ).length} in progress`,
    });
  } catch (error) {
    console.error("[reports] load failed", error);

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        ${renderEmptyState(
          "Failed to load reports",
          error?.message || "The reports section could not be loaded."
        )}
      </section>
    `;

    updateWorkspaceSummaryStrip({
      today: "Reports unavailable",
      nextEvent: "Unable to load",
      lastRecord: "No report data",
      openActions: "Check API routes",
    });
  }
}
