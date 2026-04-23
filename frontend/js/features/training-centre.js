import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

const TRAINING_CENTRE_STYLE_ID = "academy-training-centre-styles";
const TRAINING_CENTRE_STYLE_HREF = "/js/features/training-centre.css";

function ensureTrainingCentreStyles() {
  if (document.getElementById(TRAINING_CENTRE_STYLE_ID)) return;

  const link = document.createElement("link");
  link.id = TRAINING_CENTRE_STYLE_ID;
  link.rel = "stylesheet";
  link.href = TRAINING_CENTRE_STYLE_HREF;
  document.head.appendChild(link);
}

function getMount() {
  return (
    els.trainingCentre ||
    document.getElementById("training-centre-root") ||
    document.getElementById("feature-root") ||
    document.getElementById("workspace-content") ||
    document.getElementById("workspacePanel") ||
    document.getElementById("workspace")
  );
}

function getCurrentUserName() {
  const user = state.currentUser || {};
  return (
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.email ||
    "User"
  );
}

function getCurrentUserRole() {
  const user = state.currentUser || {};
  return String(user.role || user.job_title || "staff")
    .trim()
    .toLowerCase();
}

function canSeeReviewQueue(role) {
  return [
    "super_admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "trainer",
    "assessor",
    "iqa",
    "auditor",
  ].includes(role);
}

function canSeeHomeCompliance(role) {
  return [
    "super_admin",
    "provider_admin",
    "responsible_individual",
    "registered_manager",
    "deputy_manager",
    "auditor",
  ].includes(role);
}

function toTitleCase(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function badgeClassForStatus(status = "") {
  const safe = String(status).trim().toLowerCase();

  if (["completed", "accepted", "passed", "competent"].includes(safe)) {
    return "academy-badge academy-badge--success";
  }
  if (["overdue", "needs_amendment", "expired", "refer"].includes(safe)) {
    return "academy-badge academy-badge--danger";
  }
  if (["submitted", "under_review", "in_progress", "draft", "enrolled"].includes(safe)) {
    return "academy-badge academy-badge--warning";
  }
  return "academy-badge academy-badge--neutral";
}

function renderList(items = [], emptyText = "Nothing to show yet.", actionLabel = "Open") {
  if (!Array.isArray(items) || !items.length) {
    return `<div class="academy-empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return items
    .map((item) => {
      const title = escapeHtml(item.title || "Untitled");
      const subtitle = item.subtitle ? escapeHtml(item.subtitle) : "";
      const status = item.status ? escapeHtml(toTitleCase(item.status)) : "";
      const dueDate = item.due_date ? formatDate(item.due_date) : "";
      const link = escapeHtml(item.link || "#");

      return `
        <article class="academy-row-card">
          <div class="academy-row-card__title">${title}</div>
          ${subtitle ? `<div class="academy-row-card__meta">${subtitle}</div>` : ""}
          <div class="academy-row-card__meta" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${status ? `<span class="${badgeClassForStatus(item.status)}">${status}</span>` : ""}
            ${dueDate ? `<span>${escapeHtml(dueDate)}</span>` : ""}
          </div>
          <div style="margin-top:12px;">
            <a class="academy-button academy-button--secondary" href="${link}">${escapeHtml(actionLabel)}</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderStatCard(label, value, meta = "") {
  return `
    <section class="academy-stat-card">
      <div class="academy-stat-card__label">${escapeHtml(label)}</div>
      <div class="academy-stat-card__value">${escapeHtml(String(value ?? 0))}</div>
      <div class="academy-stat-card__meta">${escapeHtml(meta)}</div>
    </section>
  `;
}

function renderDashboard(payload) {
  const role = getCurrentUserRole();
  const showReviewQueue = canSeeReviewQueue(role);
  const showHomeCompliance = canSeeHomeCompliance(role);

  const stats = payload?.stats || {};
  const myLearning = payload?.my_learning || [];
  const myWorkbooks = payload?.my_workbooks || [];
  const myQualifications = payload?.my_qualifications || [];
  const reviewQueue = payload?.review_queue || [];

  return `
    <div class="academy-shell">
      <section class="academy-panel">
        <div class="academy-panel__header">
          <div>
            <h2 class="academy-panel__title">IndiCare Academy</h2>
            <p class="academy-panel__subtitle">
              Training, workbooks, qualifications and evidence for ${escapeHtml(getCurrentUserName())}.
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="academy-badge academy-badge--primary">${escapeHtml(toTitleCase(role))}</span>
            <button class="academy-button academy-button--secondary" id="academyRefreshInlineBtn" type="button">
              Refresh
            </button>
          </div>
        </div>
        <div class="academy-panel__body">
          <div class="academy-grid academy-grid--stats">
            ${renderStatCard("Mandatory due", stats.mandatory_modules_due || 0, "Modules still requiring completion")}
            ${renderStatCard("Overdue", stats.mandatory_modules_overdue || 0, "Past due or needing attention")}
            ${renderStatCard("Workbooks in progress", stats.workbooks_in_progress || 0, "Draft, submitted or under review")}
            ${renderStatCard("Active qualifications", stats.qualifications_active || 0, "Current diploma pathway enrolments")}
          </div>
        </div>
      </section>

      <div class="academy-grid academy-grid--two" style="margin-top:20px;">
        <section class="academy-panel">
          <div class="academy-panel__header">
            <div>
              <h3 class="academy-panel__title">My learning</h3>
              <p class="academy-panel__subtitle">Assigned modules needing attention.</p>
            </div>
          </div>
          <div class="academy-panel__body">
            <div class="academy-stack">
              ${renderList(myLearning, "No learning items to show.", "Open module")}
            </div>
          </div>
        </section>

        <section class="academy-panel">
          <div class="academy-panel__header">
            <div>
              <h3 class="academy-panel__title">My workbooks</h3>
              <p class="academy-panel__subtitle">Workbook evidence, submissions and resubmissions.</p>
            </div>
          </div>
          <div class="academy-panel__body">
            <div class="academy-stack">
              ${renderList(myWorkbooks, "No workbook activity to show.", "Open workbook")}
            </div>
          </div>
        </section>
      </div>

      <div class="academy-grid academy-grid--two" style="margin-top:20px;">
        <section class="academy-panel">
          <div class="academy-panel__header">
            <div>
              <h3 class="academy-panel__title">My qualifications</h3>
              <p class="academy-panel__subtitle">Level 3, Level 5 and future qualification pathways.</p>
            </div>
          </div>
          <div class="academy-panel__body">
            <div class="academy-stack">
              ${renderList(myQualifications, "No active qualifications to show.", "Open qualification")}
            </div>
          </div>
        </section>

        ${
          showReviewQueue
            ? `
          <section class="academy-panel">
            <div class="academy-panel__header">
              <div>
                <h3 class="academy-panel__title">Review queue</h3>
                <p class="academy-panel__subtitle">Assessment and review actions requiring attention.</p>
              </div>
            </div>
            <div class="academy-panel__body">
              <div class="academy-stack">
                ${renderList(reviewQueue, "No review items to show.", "Open review")}
              </div>
            </div>
          </section>
        `
            : `
          <section class="academy-panel">
            <div class="academy-panel__header">
              <div>
                <h3 class="academy-panel__title">What this will hold</h3>
                <p class="academy-panel__subtitle">This area will become the central staff learning and evidence hub.</p>
              </div>
            </div>
            <div class="academy-panel__body">
              <div class="academy-stack">
                <div class="academy-row-card">
                  <div class="academy-row-card__title">Training</div>
                  <div class="academy-row-card__meta">Mandatory, role-based and thematic learning.</div>
                </div>
                <div class="academy-row-card">
                  <div class="academy-row-card__title">Workbooks</div>
                  <div class="academy-row-card__meta">Adult answers, reflections, evidence and assessor review.</div>
                </div>
                <div class="academy-row-card">
                  <div class="academy-row-card__title">Qualifications</div>
                  <div class="academy-row-card__meta">Level 3 Residential Childcare and Level 5 Leadership pathways.</div>
                </div>
              </div>
            </div>
          </section>
        `
        }
      </div>

      ${
        showHomeCompliance
          ? `
        <section class="academy-panel" style="margin-top:20px;">
          <div class="academy-panel__header">
            <div>
              <h3 class="academy-panel__title">Home compliance</h3>
              <p class="academy-panel__subtitle">This will link to the home compliance dashboard view.</p>
            </div>
          </div>
          <div class="academy-panel__body">
            <div class="academy-empty-state">
              Home compliance detail will load here once the next Academy home page is added.
            </div>
          </div>
        </section>
      `
          : ""
      }
    </div>
  `;
}

async function loadDashboardData() {
  const result = await apiGet("/academy/dashboard/me");
  return result?.data || null;
}

function bindEvents(mount) {
  const refreshBtn = mount.querySelector("#academyRefreshInlineBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadTrainingCentre();
    });
  }
}

export async function loadTrainingCentre() {
  ensureTrainingCentreStyles();

  const mount = getMount();
  if (!mount) return;

  mount.innerHTML = `
    <div class="academy-panel">
      <div class="academy-panel__body">
        <div class="academy-empty-state">Loading Academy…</div>
      </div>
    </div>
  `;

  try {
    const payload = await loadDashboardData();
    mount.innerHTML = renderDashboard(payload || {});
    bindEvents(mount);
  } catch (error) {
    console.error("[training-centre] failed to load academy dashboard", error);
    mount.innerHTML = `
      <div class="academy-panel">
        <div class="academy-panel__body">
          <div class="academy-empty-state">
            Failed to load Academy. ${escapeHtml(error?.message || "Unknown error.")}
          </div>
        </div>
      </div>
    `;
  }
}

export default {
  loadTrainingCentre,
};
