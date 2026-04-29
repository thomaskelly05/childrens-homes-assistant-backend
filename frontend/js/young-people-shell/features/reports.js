import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatDate } from "../core/utils.js";
import {
  normaliseRecords,
  sortNormalisedRecordsNewestFirst,
} from "../core/record-normaliser.js";
import { openRecordDetail } from "../ui/records.js";
import {
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
    state.currentYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.youngPerson?.id ||
    null
  );
}

function getHomeId() {
  return (
    state.readinessSelectedHomeId ||
    state.homeId ||
    state.selectedHomeId ||
    state.currentHomeId ||
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

function getPrimaryDate(item = {}) {
  return item.date || item.created_at || item.updated_at || null;
}

function getRecordId(item = {}) {
  return item.id || item.record_id || item.source_id || "";
}

function getRecordType(item = {}) {
  return item.type || item.record_type || "report";
}

function getRecordTitle(item = {}) {
  return item.title || item.label || "Report";
}

function getRecordSummary(item = {}) {
  return item.summary || "Report available.";
}

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function buildReportRows(items = [], fallbackType = "report") {
  return normaliseRecords(
    items.map((item) => ({
      ...item,
      id: item.id ?? item.report_id ?? item.source_id ?? null,
      record_id: item.record_id ?? item.id ?? item.report_id ?? item.source_id ?? null,
      record_type: item.record_type || item.type || fallbackType,
      type: item.type || item.record_type || fallbackType,
      title: item.title || item.report_type || item.name || "Report",
      summary:
        item.summary ||
        item.description ||
        item.report_text ||
        item.notes ||
        "Report available.",
      status: item.status || item.workflow_status || "completed",
      created_at: item.created_at || item.generated_at || item.updated_at || null,
      date: item.date || item.created_at || item.generated_at || item.updated_at || null,
      report_type: item.report_type || "",
    }))
  );
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
    inspection: `/homes/${id}/inspection-improvement-actions`,
  };
}

function unwrapRows(data = {}) {
  if (Array.isArray(data)) return data;

  return safeArray(
    data.items ||
      data.records ||
      data.results ||
      data.data ||
      data.reports ||
      data.readiness ||
      data.monthly_reviews ||
      data.inspection_actions ||
      data.inspection_improvement_actions ||
      []
  );
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

function renderReportRows(items = [], emptyMessage = "No reports found.") {
  if (!items.length) {
    return renderEmptyState("No reports", emptyMessage);
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const id = getRecordId(item);
          const type = getRecordType(item);
          const title = getRecordTitle(item);
          const summary = getRecordSummary(item);
          const date = getPrimaryDate(item);
          const status = item.status || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(id)}"
              data-record-type="${toText(type)}"
              role="button"
              tabindex="0"
              aria-label="${toText(title)}"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(title)}</div>
                <div class="record-row-summary">${toText(summary)}</div>
                <div class="record-row-meta">
                  <span class="row-pill muted">${toText(String(type).replaceAll("_", " "))}</span>
                  ${status ? `<span class="row-pill muted">${toText(String(status).replaceAll("_", " "))}</span>` : ""}
                  ${date ? `<span>${toText(formatDate(date))}</span>` : ""}
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLatestActivity(latestReport) {
  if (!latestReport) {
    return renderEmptyState("No recent report", "No report activity found.");
  }

  return `
    <div class="record-list">
      <article
        class="record-row"
        data-open-record="true"
        data-record-id="${toText(getRecordId(latestReport))}"
        data-record-type="${toText(getRecordType(latestReport))}"
        role="button"
        tabindex="0"
        aria-label="${toText(getRecordTitle(latestReport))}"
      >
        <div class="record-row-main">
          <div class="record-row-title">${toText(getRecordTitle(latestReport))}</div>
          <div class="record-row-summary">${toText(getRecordSummary(latestReport))}</div>
          <div class="record-row-meta">
            ${getPrimaryDate(latestReport) ? toText(formatDate(getPrimaryDate(latestReport))) : "No date"}
          </div>
        </div>
      </article>
    </div>
  `;
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

  const latestReport = reports[0] || reviewItems[0] || inspectionItems[0] || null;

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
            renderReportRows(reports.slice(0, 10), "No reports found."),
            "Recent generated or saved reports."
          )}

          ${renderSection(
            "Reviews and outputs",
            renderReportRows(reviewItems.slice(0, 10), "No review outputs found."),
            "Monthly reviews, summaries and structured outputs."
          )}
        </section>

        <aside class="overview-side">
          ${renderSection(
            "Inspection-linked outputs",
            renderReportRows(
              inspectionItems.slice(0, 8),
              "No inspection-linked outputs found."
            ),
            "Readiness or inspection-related evidence and outputs."
          )}

          ${renderSection(
            "Latest activity",
            renderLatestActivity(latestReport),
            "The most recent report activity."
          )}
        </aside>
      </div>
    </section>
  `;
}

function bindReportRowEvents(records = []) {
  if (!els.viewContent) return;

  const byKey = new Map();

  records.forEach((record) => {
    byKey.set(`${getRecordType(record)}:${getRecordId(record)}`, record);
  });

  els.viewContent.querySelectorAll("[data-open-record='true']").forEach((row) => {
    const open = () => {
      const type = row.getAttribute("data-record-type") || "";
      const id = row.getAttribute("data-record-id") || "";
      const record = byKey.get(`${type}:${id}`);

      if (record) {
        openRecordDetail(record);
      }
    };

    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
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
      apiGet(endpoints.reports, { skipCache: true }).catch(() => ({ items: [] })),
      apiGet(endpoints.reviews, { skipCache: true }).catch(() => ({ items: [] })),
      endpoints.inspection
        ? apiGet(endpoints.inspection, { skipCache: true }).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] }),
    ]);

    const reports = sortNormalisedRecordsNewestFirst(
      buildReportRows(unwrapRows(reportsData), "report")
    );

    const reviewItems = sortNormalisedRecordsNewestFirst(
      buildReportRows(unwrapRows(reviewsData), "monthly_review")
    );

    const inspectionItems = sortNormalisedRecordsNewestFirst(
      buildReportRows(unwrapRows(inspectionData), "inspection_improvement_action")
    );

    const allRecords = [...reports, ...reviewItems, ...inspectionItems];

    els.viewContent.innerHTML = renderReportsHtml({
      reports,
      reviewItems,
      inspectionItems,
    });

    bindReportRowEvents(allRecords);

    updateWorkspaceSummaryStrip({
      today: `${reports.length} report${reports.length === 1 ? "" : "s"} available`,
      nextEvent:
        reviewItems[0]?.date
          ? `Latest review ${formatDate(reviewItems[0].date)}`
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

export const loadCurrentView = loadReports;
