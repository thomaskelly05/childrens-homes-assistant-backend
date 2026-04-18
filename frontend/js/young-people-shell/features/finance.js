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

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "£0.00";

  return amount.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
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
  const normalised = String(status || "")
    .toLowerCase()
    .trim()
    .replaceAll(" ", "_");

  if (
    [
      "overdue",
      "critical",
      "high",
      "failed",
      "unpaid",
      "declined",
      "escalated",
      "blocked",
      "at_risk",
    ].includes(normalised)
  ) {
    return "danger";
  }

  if (
    [
      "due_soon",
      "pending",
      "awaiting_approval",
      "warning",
      "part_paid",
      "review_due",
      "attention",
      "submitted",
      "in_progress",
    ].includes(normalised)
  ) {
    return "warning";
  }

  if (
    [
      "paid",
      "approved",
      "active",
      "completed",
      "resolved",
      "ok",
      "current",
      "good",
      "within_budget",
    ].includes(normalised)
  ) {
    return "success";
  }

  return "muted";
}

function toTime(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(bValue) - toTime(aValue);
  });
}

function sortSoonestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean);
    const bValue = keys.map((key) => b?.[key]).find(Boolean);
    return toTime(aValue) - toTime(bValue);
  });
}

function hasUsableData(data) {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data.items) && data.items.length > 0) return true;
  if (Array.isArray(data.records) && data.records.length > 0) return true;
  if (Array.isArray(data.finance) && data.finance.length > 0) return true;
  if (Array.isArray(data.transactions) && data.transactions.length > 0) return true;
  if (Array.isArray(data.invoices) && data.invoices.length > 0) return true;
  if (Array.isArray(data.allowances) && data.allowances.length > 0) return true;
  if (Array.isArray(data.budgets) && data.budgets.length > 0) return true;
  if (Array.isArray(data.tasks) && data.tasks.length > 0) return true;
  if (data.summary && typeof data.summary === "object") return true;
  if (data.dashboard && typeof data.dashboard === "object") return true;
  if (data.finance_summary && typeof data.finance_summary === "object") return true;
  return false;
}

function normaliseSummary(data = {}) {
  return data.summary || data.finance_summary || data.dashboard || data || {};
}

function normaliseTransactionItems(data = {}) {
  return toArray(data.items, [data.finance, data.transactions, data.records]).map(
    (item) => ({
      ...item,
      id: item.id ?? item.record_id ?? item.source_id ?? null,
      record_type: item.record_type || "finance_item",
      title: item.title || item.category || item.description || "Transaction",
      category: item.category || item.cost_centre || "General",
      amount: toNumber(item.amount, 0),
      period: item.period || item.month || "",
      status: item.status || "recorded",
      supplier: item.supplier || item.payee || "",
      summary:
        item.summary ||
        item.description ||
        item.notes ||
        `${item.category || "Finance item"} recorded.`,
      transaction_date:
        item.transaction_date ||
        item.date ||
        item.invoice_date ||
        item.created_at ||
        null,
      due_date: item.due_date || item.payment_due_date || null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })
  );
}

function normaliseInvoiceItems(data = {}) {
  return toArray(data.items, [data.invoices, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "invoice",
    title: item.title || item.invoice_number || item.supplier || "Invoice",
    supplier: item.supplier || item.provider || "Supplier",
    invoice_number: item.invoice_number || "",
    amount: toNumber(item.amount, 0),
    due_date: item.due_date || item.payment_due_date || null,
    invoice_date: item.invoice_date || item.created_at || null,
    status: item.status || "pending",
    summary:
      item.summary ||
      item.notes ||
      item.description ||
      "Invoice awaiting review or payment.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseAllowanceItems(data = {}) {
  return toArray(data.items, [data.allowances, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "allowance",
    title: item.title || item.young_person_name || "Allowance",
    young_person_name:
      item.young_person_name ||
      item.child_name ||
      item.preferred_name ||
      "Young person",
    amount: toNumber(item.amount, 0),
    allowance_type: item.allowance_type || item.category || "Allowance",
    due_date: item.due_date || item.payment_date || null,
    status: item.status || "pending",
    summary:
      item.summary ||
      item.notes ||
      `${item.allowance_type || "Allowance"} recorded.`,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseBudgetItems(data = {}) {
  return toArray(data.items, [data.budgets, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "budget",
    title: item.title || item.category || "Budget",
    category: item.category || item.cost_centre || "Budget line",
    allocated: toNumber(item.allocated, 0),
    spent: toNumber(item.spent, 0),
    remaining:
      Number.isFinite(Number(item.remaining))
        ? Number(item.remaining)
        : toNumber(item.allocated, 0) - toNumber(item.spent, 0),
    period: item.period || item.month || "",
    status:
      item.status ||
      (toNumber(item.spent, 0) > toNumber(item.allocated, 0)
        ? "at_risk"
        : "within_budget"),
    summary:
      item.summary ||
      item.notes ||
      `${item.category || "Budget"} position recorded.`,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function normaliseTaskItems(data = {}) {
  return toArray(data.items, [data.tasks, data.records]).map((item) => ({
    ...item,
    id: item.id ?? item.record_id ?? item.source_id ?? null,
    record_type: item.record_type || "task",
    title: item.title || item.task || "Task",
    task: item.task || item.title || "Task",
    assigned_role: item.assigned_role || "",
    due_date: item.due_date || null,
    completed: Boolean(item.completed),
    status: item.status || (item.completed ? "completed" : "open"),
    summary:
      item.summary ||
      item.notes ||
      item.task ||
      "Finance task recorded.",
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  }));
}

function buildTopStats({
  transactionItems = [],
  invoiceItems = [],
  allowanceItems = [],
  budgetItems = [],
  openTasks = [],
}) {
  const totalSpend = transactionItems.reduce(
    (sum, item) => sum + toNumber(item.amount, 0),
    0
  );

  const outstandingInvoices = invoiceItems.filter((item) =>
    ["pending", "part_paid", "due_soon", "overdue", "unpaid"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const overdueInvoices = invoiceItems.filter((item) =>
    ["overdue", "unpaid"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const allowanceDue = allowanceItems.filter((item) =>
    ["pending", "due_soon", "overdue"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  const budgetRisks = budgetItems.filter((item) =>
    ["at_risk", "overdue", "high", "critical"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;

  return [
    {
      label: "Recorded spend",
      value: formatCurrency(totalSpend),
      note: "Current loaded spend",
      tone: "muted",
    },
    {
      label: "Outstanding invoices",
      value: outstandingInvoices,
      note: "Pending payment or review",
      tone: outstandingInvoices ? "warning" : "success",
    },
    {
      label: "Overdue invoices",
      value: overdueInvoices,
      note: "Urgent payment attention",
      tone: overdueInvoices ? "danger" : "success",
    },
    {
      label: "Allowance due",
      value: allowanceDue,
      note: "Young person allowance items",
      tone: allowanceDue ? "warning" : "success",
    },
    {
      label: "Budget pressure",
      value: budgetRisks,
      note: "Budget lines over or at risk",
      tone: budgetRisks ? "warning" : "success",
    },
    {
      label: "Open finance tasks",
      value: openTasks.length,
      note: "Outstanding follow-up work",
      tone: openTasks.length ? "warning" : "success",
    },
  ];
}

function buildFinanceKpis({
  invoiceItems = [],
  budgetItems = [],
  allowanceItems = [],
  taskItems = [],
}) {
  const paidInvoices = invoiceItems.filter((item) =>
    ["paid", "completed", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const invoicePercent = invoiceItems.length
    ? Math.round((paidInvoices / invoiceItems.length) * 100)
    : 0;

  const healthyBudgets = budgetItems.filter((item) =>
    ["within_budget", "active", "good", "ok"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const budgetPercent = budgetItems.length
    ? Math.round((healthyBudgets / budgetItems.length) * 100)
    : 0;

  const completedAllowances = allowanceItems.filter((item) =>
    ["paid", "completed", "resolved"].includes(
      String(item.status || "").toLowerCase().replaceAll(" ", "_")
    )
  ).length;
  const allowancePercent = allowanceItems.length
    ? Math.round((completedAllowances / allowanceItems.length) * 100)
    : 0;

  const completedTasks = taskItems.filter((item) => item.completed).length;
  const taskPercent = taskItems.length
    ? Math.round((completedTasks / taskItems.length) * 100)
    : 0;

  return [
    {
      label: "Invoice completion",
      value: `${invoicePercent}%`,
      percent: invoicePercent,
      tone:
        invoicePercent >= 85 ? "success" : invoicePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Budget health",
      value: `${budgetPercent}%`,
      percent: budgetPercent,
      tone:
        budgetPercent >= 85 ? "success" : budgetPercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Allowance completion",
      value: `${allowancePercent}%`,
      percent: allowancePercent,
      tone:
        allowancePercent >= 85 ? "success" : allowancePercent >= 65 ? "warning" : "danger",
    },
    {
      label: "Task completion",
      value: `${taskPercent}%`,
      percent: taskPercent,
      tone:
        taskPercent >= 85 ? "success" : taskPercent >= 65 ? "warning" : "danger",
    },
  ];
}

function buildPriorityItems({
  invoiceItems = [],
  budgetItems = [],
  allowanceItems = [],
  taskItems = [],
}) {
  const items = [];

  invoiceItems
    .filter((item) =>
      ["overdue", "unpaid", "part_paid", "due_soon"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 3)
    .forEach((item) => {
      items.push({
        title: item.title || item.invoice_number || "Invoice",
        summary:
          item.summary ||
          (item.due_date
            ? `Due ${formatDate(item.due_date)}`
            : "Invoice requires payment or review."),
      });
    });

  budgetItems
    .filter((item) =>
      ["at_risk", "high", "critical", "overdue"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.title || item.category || "Budget pressure",
        summary:
          item.summary ||
          `${formatCurrency(item.spent)} spent of ${formatCurrency(item.allocated)}.`,
      });
    });

  allowanceItems
    .filter((item) =>
      ["pending", "due_soon", "overdue"].includes(
        String(item.status || "").toLowerCase().replaceAll(" ", "_")
      )
    )
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        title: item.young_person_name || "Allowance due",
        summary:
          item.summary ||
          `${item.allowance_type || "Allowance"} ${formatCurrency(item.amount)}.`,
      });
    });

  taskItems
    .filter((item) => !item.completed)
    .slice(0, 1)
    .forEach((item) => {
      items.push({
        title: item.title || "Open finance action",
        summary: item.summary || "Outstanding finance action remains open.",
      });
    });

  if (!items.length) {
    items.push({
      title: "No major finance pressure",
      summary: "Finance is not currently surfacing urgent issues.",
    });
  }

  return items.slice(0, 8);
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

function renderProgressCards(cards = []) {
  return `
    <div class="analytics-progress-grid">
      ${cards
        .map(
          (card) => `
            <article class="analytics-progress-card">
              <div class="analytics-progress-head">
                <span class="analytics-progress-label">${safeText(card.label)}</span>
                <strong class="analytics-progress-value">${safeText(card.value)}</strong>
              </div>
              <div class="analytics-progress-track">
                <span
                  class="analytics-progress-bar analytics-progress-bar--${safeText(card.tone || "muted")}"
                  style="width: ${safeText(card.percent || 0)}%;"
                ></span>
              </div>
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
            item?.supplier ||
            item?.young_person_name ||
            item?.category ||
            "Record";

          const summary =
            item?.[summaryKey] ||
            item?.notes ||
            item?.description ||
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
        <p>No urgent finance issues are showing right now.</p>
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

function renderFinanceHtml({
  title = "Finance and spend",
  topStats = [],
  progressCards = [],
  priorityItems = [],
  transactionItems = [],
  invoiceItems = [],
  allowanceItems = [],
  budgetItems = [],
  taskItems = [],
  isFallback = false,
}) {
  return `
    <section class="overview-panel manager-dashboard manager-dashboard--finance">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Finance</div>
          <h2>${safeText(title)}</h2>
          <p>A live view across spending, invoices, allowances, budgets and finance-related actions.</p>
          ${
            isFallback
              ? `<p class="overview-helper-text">Showing seeded preview data until live finance endpoints are available.</p>`
              : ""
          }
        </div>
      </div>

      ${renderStatCards(topStats)}

      <div class="overview-section-card">
        <div class="overview-section-head">
          <h3>Finance snapshot</h3>
          <p>A quick visual read across invoice completion, budget health and finance actions.</p>
        </div>
        ${renderProgressCards(progressCards)}
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Recent spend</h3>
              <p>Recorded transactions and recent financial activity.</p>
            </div>

            ${renderRows(transactionItems, {
              emptyMessage: "No finance transactions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "finance_item",
              metaBuilder: (item) =>
                [
                  item.category || "",
                  formatCurrency(item.amount),
                  item.transaction_date ? formatDate(item.transaction_date) : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Invoices and payments</h3>
              <p>Outstanding invoices, payment due dates and supplier activity.</p>
            </div>

            ${renderRows(invoiceItems, {
              emptyMessage: "No invoices found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "invoice",
              metaBuilder: (item) =>
                [
                  item.supplier || "",
                  formatCurrency(item.amount),
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Allowances and child spend</h3>
              <p>Allowance or child-related payment activity.</p>
            </div>

            ${renderRows(allowanceItems, {
              emptyMessage: "No allowance records found.",
              titleKey: "young_person_name",
              summaryKey: "summary",
              recordType: "allowance",
              metaBuilder: (item) =>
                [
                  item.allowance_type || "",
                  formatCurrency(item.amount),
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Needs attention</h3>
              <p>The most urgent financial issues across the home.</p>
            </div>

            ${renderPriorityList(priorityItems)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Budget position</h3>
              <p>Budget lines, spend and budget pressure.</p>
            </div>

            ${renderRows(budgetItems, {
              emptyMessage: "No budget lines found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "budget",
              metaBuilder: (item) =>
                [
                  item.period || "",
                  `Spent ${formatCurrency(item.spent)}`,
                  `Remaining ${formatCurrency(item.remaining)}`,
                ]
                  .filter(Boolean)
                  .join(" • "),
            })}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Open finance actions</h3>
              <p>Follow-up tasks linked to spend, invoices or budget management.</p>
            </div>

            ${renderRows(taskItems, {
              emptyMessage: "No finance actions found.",
              titleKey: "title",
              summaryKey: "summary",
              recordType: "task",
              metaBuilder: (item) =>
                [
                  item.assigned_role || "",
                  item.due_date ? `Due ${formatDate(item.due_date)}` : "",
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
          <div class="empty-state-icon" aria-hidden="true">£</div>
          <h3>No home context available</h3>
          <p>A home ID is needed before finance can load.</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "No finance context",
    nextEvent: "No finance due date loaded",
    lastRecord: "No finance data",
    openActions: "No finance actions loaded",
  });
}

function renderLoadingState() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading finance…</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Loading finance",
    nextEvent: "Checking due payments",
    lastRecord: "Loading latest finance record",
    openActions: "Loading finance actions",
  });
}

function renderErrorState(message) {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="overview-panel">
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-state-icon" aria-hidden="true">!</div>
          <h3>Failed to load finance</h3>
          <p>${safeText(message || "The finance view could not be loaded.")}</p>
        </div>
      </div>
    </section>
  `;

  updateWorkspaceSummaryStrip({
    today: "Finance unavailable",
    nextEvent: "No payment due loaded",
    lastRecord: "No finance data",
    openActions: "No finance actions loaded",
  });
}

function buildFallbackData(homeId) {
  const homeName =
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    `Home ${homeId}`;

  const now = new Date();
  const plusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const minusDays = (days, hour = 9, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return {
    summaryData: {
      summary: {
        title: `${homeName} finance`,
        home_name: homeName,
      },
    },
    transactionData: {
      items: [
        {
          id: "fin-1",
          category: "Food shop",
          amount: 186.42,
          transaction_date: minusDays(2),
          supplier: "Tesco",
          status: "recorded",
          summary: "Weekly food and household shop.",
        },
        {
          id: "fin-2",
          category: "Transport",
          amount: 48.0,
          transaction_date: minusDays(1),
          supplier: "Taxi account",
          status: "recorded",
          summary: "Transport for appointment attendance.",
        },
      ],
    },
    invoiceData: {
      items: [
        {
          id: "inv-1",
          supplier: "Therapy provider",
          invoice_number: "TH-2041",
          amount: 420.0,
          due_date: plusDays(3),
          status: "due_soon",
          summary: "Monthly therapeutic input invoice due this week.",
        },
        {
          id: "inv-2",
          supplier: "Maintenance contractor",
          invoice_number: "MT-1882",
          amount: 265.0,
          due_date: minusDays(4),
          status: "overdue",
          summary: "Repair invoice overdue for payment.",
        },
      ],
    },
    allowanceData: {
      items: [
        {
          id: "all-1",
          young_person_name: "Jay Smith",
          allowance_type: "Pocket money",
          amount: 15.0,
          due_date: plusDays(1),
          status: "pending",
          summary: "Weekly pocket money due tomorrow.",
        },
      ],
    },
    budgetData: {
      items: [
        {
          id: "bud-1",
          category: "Activities",
          allocated: 500,
          spent: 460,
          remaining: 40,
          period: "Apr 2026",
          status: "at_risk",
          summary: "Activity budget nearly fully used.",
        },
        {
          id: "bud-2",
          category: "Food",
          allocated: 1200,
          spent: 820,
          remaining: 380,
          period: "Apr 2026",
          status: "within_budget",
          summary: "Food budget currently within range.",
        },
      ],
    },
    taskData: {
      items: [
        {
          id: "task-1",
          title: "Approve therapy invoice",
          due_date: plusDays(2),
          completed: false,
          status: "open",
          assigned_role: "Manager",
          summary: "Review and approve monthly therapy invoice.",
        },
      ],
    },
    isFallback: true,
  };
}

async function fetchDataset(homeId) {
  const safeGet = (url) => apiGet(url).catch(() => null);

  const requests = [
    safeGet(`/homes/${homeId}/finance`),
    safeGet(`/homes/${homeId}/finance-invoices`),
    safeGet(`/homes/${homeId}/allowances`),
    safeGet(`/homes/${homeId}/budgets`),
    safeGet(`/homes/${homeId}/finance-tasks`),
  ];

  const [
    transactionData,
    invoiceData,
    allowanceData,
    budgetData,
    taskData,
  ] = await Promise.all(requests);

  const responses = [
    transactionData,
    invoiceData,
    allowanceData,
    budgetData,
    taskData,
  ];

  const hasLiveSuccess = responses.some(hasUsableData);

  if (!hasLiveSuccess) {
    return buildFallbackData(homeId);
  }

  return {
    summaryData: transactionData || {},
    transactionData: transactionData || { items: [] },
    invoiceData: invoiceData || { items: [] },
    allowanceData: allowanceData || { items: [] },
    budgetData: budgetData || { items: [] },
    taskData: taskData || { items: [] },
    isFallback: false,
  };
}

export async function loadFinance() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  if (!homeId) {
    renderNoHomeContext();
    return;
  }

  renderLoadingState();

  try {
    const {
      summaryData,
      transactionData,
      invoiceData,
      allowanceData,
      budgetData,
      taskData,
      isFallback,
    } = await fetchDataset(homeId);

    const summary = normaliseSummary(summaryData);

    const transactionItems = sortNewestFirst(
      normaliseTransactionItems(transactionData),
      ["transaction_date", "updated_at", "created_at"]
    ).slice(0, 8);

    const invoiceItems = sortSoonestFirst(normaliseInvoiceItems(invoiceData), [
      "due_date",
      "invoice_date",
      "updated_at",
      "created_at",
    ]).slice(0, 8);

    const allowanceItems = sortSoonestFirst(
      normaliseAllowanceItems(allowanceData),
      ["due_date", "updated_at", "created_at"]
    ).slice(0, 6);

    const budgetItems = sortNewestFirst(normaliseBudgetItems(budgetData), [
      "updated_at",
      "created_at",
    ]).slice(0, 6);

    const taskItems = sortSoonestFirst(normaliseTaskItems(taskData), [
      "due_date",
      "updated_at",
      "created_at",
    ]).filter((item) => !item.completed).slice(0, 6);

    const topStats = buildTopStats({
      transactionItems,
      invoiceItems,
      allowanceItems,
      budgetItems,
      openTasks: taskItems,
    });

    const progressCards = buildFinanceKpis({
      invoiceItems,
      budgetItems,
      allowanceItems,
      taskItems,
    });

    const priorityItems = buildPriorityItems({
      invoiceItems,
      budgetItems,
      allowanceItems,
      taskItems,
    });

    const title =
      summary.title ||
      summary.home_name ||
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      `Home ${homeId} finance`;

    els.viewContent.innerHTML = renderFinanceHtml({
      title,
      topStats,
      progressCards,
      priorityItems,
      transactionItems,
      invoiceItems,
      allowanceItems,
      budgetItems,
      taskItems,
      isFallback,
    });

    const nextDue =
      invoiceItems[0]?.due_date ||
      allowanceItems[0]?.due_date ||
      taskItems[0]?.due_date ||
      null;

    const latestRecord =
      transactionItems[0]?.transaction_date ||
      invoiceItems[0]?.invoice_date ||
      transactionItems[0]?.created_at ||
      null;

    updateWorkspaceSummaryStrip({
      today: isFallback
        ? `${transactionItems.length} finance items • preview mode`
        : `${transactionItems.length} finance items • ${taskItems.length} open actions`,
      nextEvent: nextDue
        ? `Next due ${formatDate(nextDue)}`
        : "No payment due loaded",
      lastRecord: latestRecord
        ? `Latest finance activity ${formatDateTime(latestRecord)}`
        : isFallback
        ? "Preview finance data loaded"
        : "No recent finance activity loaded",
      openActions: `${invoiceItems.filter((i) => ["due_soon", "overdue", "unpaid", "pending", "part_paid"].includes(String(i.status || "").toLowerCase().replaceAll(" ", "_"))).length} invoices • ${taskItems.length} actions`,
    });
  } catch (error) {
    console.error("[finance] load failed", error);
    renderErrorState(error?.message || "The finance view could not be loaded.");
  }
}