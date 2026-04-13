import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

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
    [
      "overdue",
      "critical",
      "high",
      "expired",
      "missing",
      "non_compliant",
      "failed",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "warning",
      "review_due",
      "amber",
      "attention",
      "incomplete",
      "expiring",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "complete",
      "completed",
      "active",
      "compliant",
      "ok",
      "good",
      "up_to_date",
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

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(aValue).getTime() - new Date(bValue).getTime();
  });
}

function normaliseComplianceSummary(data = {}) {
  return data.summary || data.compliance_summary || data.dashboard || data || {};
}

function normaliseWorkforceItems(data = {}) {
  return toArray(data.items, [data.workforce, data.staff, data.records]);
}

function normaliseTrainingItems(data = {}) {
  return toArray(data.items, [data.training, data.records]);
}

function normaliseSupervisionItems(data = {}) {
  return toArray(data.items, [data.supervisions, data.records]);
}

function normaliseProbationItems(data = {}) {
  return toArray(data.items, [data.probations, data.records]);
}

function normaliseInductionItems(data = {}) {
  return toArray(data.items, [data.inductions, data.records]);
}

function normaliseChildComplianceItems(data = {}) {
  return toArray(data.items, [data.children, data.child_files, data.records]);
}

function normaliseDocumentItems(data = {}) {
  return toArray(data.items, [data.documents, data.records]);
}

function normaliseInspectionItems(data = {}) {
  return toArray(data.items, [data.inspection, data.readiness, data.records]);
}

function buildTopStats({
  summary = {},
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
}) {
  return [
    {
      label: "Compliance score",
      value: `${toNumber(summary.compliance_score ?? summary.score ?? 0)}%`,
      note: "Overall home compliance position",
      tone:
        toNumber(summary.compliance_score ?? summary.score ?? 0) < 70
          ? "danger"
          : toNumber(summary.compliance_score ?? summary.score ?? 0) < 85
          ? "warning"
          : "success",
    },
    {
      label: "Overdue supervisions",
      value: overdueSupervisions.length,
      note: "Staff oversight needing attention",
      tone: overdueSupervisions.length ? "warning" : "success",
    },
    {
      label: "Training expiring",
      value: expiringTraining.length,
      note: "Training due or overdue soon",
      tone: expiringTraining.length ? "warning" : "success",
    },
    {
      label: "Probation / induction gaps",
      value: outstandingProbations.length,
      note: "Staff progression checks incomplete",
      tone: outstandingProbations.length ? "warning" : "success",
    },
    {
      label: "Child file gaps",
      value: overdueChildFiles.length,
      note: "Statutory paperwork due or missing",
      tone: overdueChildFiles.length ? "danger" : "success",
    },
    {
      label: "Home document gaps",
      value: overdueHomeDocs.length,
      note: "Statement of Purpose, Annex A and more",
      tone: overdueHomeDocs.length ? "danger" : "success",
    },
  ];
}

function renderStatCards(cards = []) {
  return `
    <div class="overview-stats-grid overview-stats-grid--six">
      ${cards
        .map(
          (card) => `
            <article class="overview-stat-card ${
              card.tone === "danger"
                ? "overview-stat-card--danger"
                : card.tone === "warning"
                ? "overview-stat-card--warning"
                : card.tone === "success"
                ? "overview-stat-card--success"
                : ""
            }">
              <span class="overview-stat-label">${safeText(card.label)}</span>
              <strong class="overview-stat-value">${safeText(card.value)}</strong>
              <span class="overview-stat-note">${safeText(card.note)}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRows(items = [], options = {}) {
  const {
    emptyMessage = "Nothing to show right now.",
    titleKey = "title",
    summaryKey = "summary",
    metaBuilder = null,
    statusKey = "status",
    recordType = "",
  } = options;

  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">○</div>
          <h3>Nothing to show</h3>
          <p>${safeText(emptyMessage)}</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const title =
            item?.[titleKey] ||
            item?.name ||
            item?.staff_member ||
            item?.young_person_name ||
            item?.document_type ||
            item?.title ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
            item?.requirement ||
            item?.role ||
            "No summary available.";

          const meta = metaBuilder
            ? metaBuilder(item)
            : item?.updated_at || item?.created_at || "";

          const status = item?.[statusKey] || "";
          const tone = getStatusTone(status);
          const rowId = item?.id || item?.record_id || item?.source_id || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${safeText(rowId)}"
              data-record-type="${safeText(recordType || item?.record_type || "")}"
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

function renderPriorityList(items = []) {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>No critical compliance issues are showing right now.</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${safeText(item.title)}</strong>
              <p>${safeText(item.summary)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildPriorityItems({
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
}) {
  const items = [];

  overdueSupervisions.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || "Supervision overdue",
      summary: item.next_due_date
        ? `Supervision overdue since ${formatDate(item.next_due_date)}`
        : "Supervision is overdue.",
    });
  });

  expiringTraining.slice(0, 2).forEach((item) => {
    items.push({
      title: item.training_name || item.title || "Training gap",
      summary: item.expiry_date
        ? `Expires ${formatDate(item.expiry_date)}`
        : "Training review required.",
    });
  });

  outstandingProbations.slice(0, 2).forEach((item) => {
    items.push({
      title: item.staff_member || item.title || "Probation / induction gap",
      summary:
        item.summary ||
        item.notes ||
        "Probation review or induction requirement is incomplete.",
    });
  });

  overdueChildFiles.slice(0, 3).forEach((item) => {
    items.push({
      title:
        item.young_person_name ||
        item.title ||
        item.document_type ||
        "Child file gap",
      summary:
        item.summary ||
        item.notes ||
        (item.review_date
          ? `Review due ${formatDate(item.review_date)}`
          : "Statutory paperwork is missing or overdue."),
    });
  });

  overdueHomeDocs.slice(0, 3).forEach((item) => {
    items.push({
      title: item.title || item.document_type || "Home document gap",
      summary:
        item.summary ||
        item.notes ||
        (item.review_date
          ? `Review due ${formatDate(item.review_date)}`
          : "Home document requires attention."),
    });
  });

  return items.slice(0, 8);
}

function renderComplianceDashboardHtml({
  homeName = "Compliance",
  topStats = [],
  priorityItems = [],
  overdueSupervisions = [],
  expiringTraining = [],
  outstandingProbations = [],
  overdueChildFiles = [],
  overdueHomeDocs = [],
  inspectionReadiness = [],
}) {
  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Compliance</div>
          <h2>${safeText(homeName)}</h2>
          <p>A live compliance view across workforce, children’s files, statutory paperwork and Ofsted readiness.</p>
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Workforce compliance</h3>
              <p>Supervision, training, induction, probation and staffing compliance.</p>
            </div>

            ${renderRows(overdueSupervisions, {
              emptyMessage: "No overdue supervision items found.",
              titleKey: "staff_member",
              summaryKey: "summary",
              recordType: "supervision",
              metaBuilder: (item) =>
                [
                  item.supervisor || "",
                  item.next_due_date ? `Due ${formatDate(item.next_due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Training and probation</h3>
              <p>Mandatory training, induction progress and probation checkpoints.</p>
            </div>

            ${renderRows([...expiringTraining.slice(0, 5), ...outstandingProbations.slice(0, 5)], {
              emptyMessage: "No workforce compliance gaps found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              metaBuilder: (item) =>
                [
                  item.staff_member || "",
                  item.training_name || "",
                  item.expiry_date ? `Expires ${formatDate(item.expiry_date)}` : "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Child statutory paperwork</h3>
              <p>PEP, risk, plans, consents, delegated authority and key statutory file checks.</p>
            </div>

            ${renderRows(overdueChildFiles, {
              emptyMessage: "No child statutory paperwork gaps found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                  item.status || "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs immediate attention</h3>
              <p>The most urgent compliance risks across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Home statutory documents</h3>
              <p>Statement of Purpose, Annex A and other home-wide document checks.</p>
            </div>

            ${renderRows(overdueHomeDocs, {
              emptyMessage: "No overdue home documents found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "document",
              metaBuilder: (item) =>
                [
                  item.document_type || "",
                  item.review_date ? `Review ${formatDate(item.review_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Inspection readiness</h3>
              <p>What an inspector or RI would likely want to see next.</p>
            </div>

            ${renderRows(inspectionReadiness, {
              emptyMessage: "No inspection readiness issues are currently flagged.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "compliance",
              metaBuilder: (item) =>
                [
                  item.category || "",
                  item.review_date ? `Due ${formatDate(item.review_date)}` : "",
                  item.updated_at ? formatDateTime(item.updated_at) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
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
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">✓</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before the compliance dashboard can load.</p>
        </div>
      </div>
    </section>
  `;
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading compliance dashboard…</p>
        </div>
      </div>
    </section>
  `;
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load compliance dashboard</h3>
          <p>${safeText(message || "The compliance dashboard could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;
}

export async function loadCompliance() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const [
      summaryData,
      workforceData,
      trainingData,
      supervisionData,
      probationData,
      inductionData,
      childComplianceData,
      homeDocumentsData,
      inspectionData,
    ] = await Promise.all([
      apiGet(`/homes/${homeId}/compliance`).catch(() => ({})),
      apiGet(`/homes/${homeId}/team`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/training`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/supervisions`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/probations`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/inductions`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/child-compliance`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/documents`).catch(() => ({ items: [] })),
      apiGet(`/homes/${homeId}/inspection-readiness`).catch(() => ({ items: [] })),
    ]);

    const summary = normaliseComplianceSummary(summaryData);

    const workforceItems = sortNewestFirst(normaliseWorkforceItems(workforceData), [
      "updated_at",
      "created_at",
      "record_date",
    ]);

    const trainingItems = sortSoonestFirst(normaliseTrainingItems(trainingData), [
      "expiry_date",
      "review_date",
      "updated_at",
    ]);

    const supervisionItems = sortSoonestFirst(
      normaliseSupervisionItems(supervisionData),
      ["next_due_date", "updated_at", "created_at"]
    );

    const probationItems = sortSoonestFirst(normaliseProbationItems(probationData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const inductionItems = sortSoonestFirst(normaliseInductionItems(inductionData), [
      "review_date",
      "updated_at",
      "created_at",
    ]);

    const childComplianceItems = sortSoonestFirst(
      normaliseChildComplianceItems(childComplianceData),
      ["review_date", "updated_at", "created_at"]
    );

    const homeDocumentItems = sortSoonestFirst(
      normaliseDocumentItems(homeDocumentsData),
      ["review_date", "updated_at", "created_at"]
    );

    const inspectionItems = sortSoonestFirst(
      normaliseInspectionItems(inspectionData),
      ["review_date", "updated_at", "created_at"]
    );

    const overdueSupervisions = supervisionItems.filter((item) =>
      ["overdue", "due", "due_soon", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const expiringTraining = trainingItems.filter((item) =>
      ["due_soon", "overdue", "expired", "expiring"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const outstandingProbations = [...probationItems, ...inductionItems].filter((item) =>
      ["due", "due_soon", "overdue", "incomplete", "review_due"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const overdueChildFiles = childComplianceItems.filter((item) =>
      ["overdue", "missing", "review_due", "due_soon", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const overdueHomeDocs = homeDocumentItems.filter((item) =>
      ["overdue", "missing", "review_due", "due_soon", "incomplete"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const inspectionReadiness = inspectionItems.filter((item) =>
      ["overdue", "missing", "review_due", "due_soon", "warning", "attention"].includes(
        String(item.status || "").toLowerCase()
      )
    );

    const topStats = buildTopStats({
      summary,
      overdueSupervisions,
      expiringTraining,
      outstandingProbations,
      overdueChildFiles,
      overdueHomeDocs,
    });

    const priorityItems = buildPriorityItems({
      overdueSupervisions,
      expiringTraining,
      outstandingProbations,
      overdueChildFiles,
      overdueHomeDocs,
    });

    const homeName =
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      "Compliance dashboard";

    els.viewContent.innerHTML = renderComplianceDashboardHtml({
      homeName,
      topStats,
      priorityItems,
      overdueSupervisions: overdueSupervisions.slice(0, 8),
      expiringTraining: expiringTraining.slice(0, 6),
      outstandingProbations: outstandingProbations.slice(0, 6),
      overdueChildFiles: overdueChildFiles.slice(0, 8),
      overdueHomeDocs: overdueHomeDocs.slice(0, 6),
      inspectionReadiness: inspectionReadiness.slice(0, 6),
      workforceItems,
    });
  } catch (error) {
    renderErrorState(error?.message || "The compliance dashboard could not be loaded.");
  }
}
