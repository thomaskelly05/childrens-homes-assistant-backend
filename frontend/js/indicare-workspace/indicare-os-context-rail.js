import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  findChildForRecord,
  linkedItemsForRecord,
  childKey,
  childName,
  recordKey,
  recordType,
  displayType,
  formatDate,
  escapeHtml,
  isHighPriority,
} from "./indicare-os-context.js";

const RAIL_STATE = {
  lastSignature: "",
  activeRecord: null,
  openableRows: [],
  renderQueued: false,
};

bootContextRail();

function bootContextRail() {
  ensureRail();
  document.addEventListener("click", handleRailClicks, true);
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-sp-view], [data-launch-session], [data-reset-session], [data-open-child]")) {
      scheduleRail({ force: true });
    }
  }, true);
  window.addEventListener("indicare:os-context-ready", () => scheduleRail({ force: true }));
  window.addEventListener("indicare:refresh-live-os", () => scheduleRail({ force: true }));
  window.addEventListener("indicare:open-record", (event) => {
    if (event.detail) {
      RAIL_STATE.activeRecord = event.detail;
      scheduleRail({ force: true });
    }
  });
  scheduleRail({ force: true });
}

function scheduleRail(options = {}) {
  if (RAIL_STATE.renderQueued) return;
  RAIL_STATE.renderQueued = true;
  window.requestAnimationFrame(() => {
    RAIL_STATE.renderQueued = false;
    renderRail(options);
  });
}

function ensureRail() {
  if (document.getElementById("ic-os-context-rail")) return;
  const rail = document.createElement("aside");
  rail.id = "ic-os-context-rail";
  rail.className = "os-context-rail collapsed";
  rail.setAttribute("aria-label", "Operational context rail");
  rail.innerHTML = `<button class="os-rail-toggle" type="button" data-toggle-context-rail>Context</button><div class="os-rail-body" id="ic-os-context-rail-body"></div>`;
  document.body.appendChild(rail);
}

function renderRail({ force = false } = {}) {
  ensureRail();
  const body = document.getElementById("ic-os-context-rail-body");
  if (!body) return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const active = window.IndiCareActiveDocument || RAIL_STATE.activeRecord;
  const mainTitle = document.querySelector("#sp-main .sp-page-head h1, #sp-main .record-view-hero h1")?.textContent?.trim() || "Dashboard";
  const signature = `${mainTitle}:${recordKey(active || {})}:${context.children.length}:${context.documents.length}:${context.safeguarding.length}:${context.chronology.length}:${context.tasks.length}`;
  if (!force && RAIL_STATE.lastSignature === signature) return;
  RAIL_STATE.lastSignature = signature;
  RAIL_STATE.openableRows = [];

  const child = active ? findChildForRecord(active, context.children) : highestPriorityChild(context);
  const linkedChronology = active ? linkedItemsForRecord(active, child, context.chronology) : context.chronology.slice(0, 6);
  const linkedSafeguarding = active ? linkedItemsForRecord(active, child, context.safeguarding) : context.safeguarding.slice(0, 6);
  const reviewItems = buildReviewItems(context, child, active);
  const actions = buildActions(context, child, active);

  body.innerHTML = `
    <header class="os-rail-head">
      <span>Operational context</span>
      <strong>${escapeHtml(mainTitle)}</strong>
      <small>${escapeHtml(getOperationalSession()?.homeName || "No home selected")}</small>
    </header>
    <section class="os-rail-section">
      <h3>Focus child</h3>
      ${child ? childCard(child) : emptyMini("No child context is currently selected or linked.")}
    </section>
    <section class="os-rail-section">
      <h3>Safeguarding context</h3>
      ${miniRows(linkedSafeguarding, "No safeguarding context linked to this focus.")}
    </section>
    <section class="os-rail-section">
      <h3>Chronology highlights</h3>
      ${miniRows(linkedChronology, "No chronology highlights linked to this focus.")}
    </section>
    <section class="os-rail-section">
      <h3>Review state</h3>
      ${miniRows(reviewItems, "No review actions detected for this focus.")}
    </section>
    <section class="os-rail-section">
      <h3>Next actions</h3>
      ${actionList(actions)}
    </section>`;
}

function highestPriorityChild(context) {
  const scores = new Map(context.children.map((child) => [childKey(child), { child, score: 0 }]));
  const scoreChild = (record, amount) => {
    const id = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || "");
    const name = String(record.child_name || record.young_person_name || record.childName || "").toLowerCase();
    for (const entry of scores.values()) {
      if (childKey(entry.child) === id || childName(entry.child).toLowerCase() === name) entry.score += amount;
    }
  };
  context.safeguarding.forEach((record) => scoreChild(record, isHighPriority(record) ? 8 : 4));
  context.chronology.forEach((record) => scoreChild(record, /incident|missing|safeguarding|risk/i.test(recordType(record)) ? 4 : 1));
  context.documents.forEach((record) => scoreChild(record, /submitted|pending|changes|overdue/i.test(String(record.status || record.workflow_status || "")) ? 3 : 1));
  return [...scores.values()].sort((a, b) => b.score - a.score)[0]?.child || context.children[0] || null;
}

function buildReviewItems(context, child, active) {
  const records = active ? [active] : [...context.documents, ...context.tasks, ...context.safeguarding];
  const linked = child ? records.filter((record) => linkedToChild(record, child)) : records;
  return linked.filter((record) => /review|submitted|pending|changes|returned|draft|overdue/i.test(`${record.status || ""} ${record.workflow_status || ""} ${record.manager_review_status || ""}`)).slice(0, 6);
}

function buildActions(context, child, active) {
  const records = [...(active ? [active] : []), ...context.tasks, ...context.safeguarding, ...context.documents].filter((record) => !child || linkedToChild(record, child));
  const actions = [];
  if (records.some((record) => /submitted_for_review|submitted|pending/i.test(`${record.status || ""} ${record.workflow_status || ""}`))) actions.push(["Manager review", "Review submitted records and approve or request changes.", "reviews"]);
  if (records.some((record) => /changes_requested|returned|rejected/i.test(`${record.status || ""} ${record.workflow_status || ""}`))) actions.push(["Amend returned record", "Update the record and resubmit for manager review.", "docs"]);
  if (records.some((record) => /safeguarding|missing|incident|risk/i.test(`${recordType(record)} ${record.title || ""}`))) actions.push(["Check safeguarding chronology", "Confirm significant events are linked and oversight is recorded.", "safeguarding"]);
  if (records.some((record) => /draft|incomplete|overdue/i.test(`${record.status || ""} ${record.workflow_status || ""}`))) actions.push(["Complete recording", "Finish drafts and overdue records before handover.", "workforce"]);
  if (!actions.length) actions.push(["Keep context reviewed", "No urgent action generated from current context.", "dashboard"]);
  return actions;
}

function childCard(child) {
  return `<article class="os-rail-child"><span class="sp-child-avatar">${escapeHtml(initials(childName(child)))}</span><div><strong>${escapeHtml(childName(child))}</strong><small>${escapeHtml(child.status || child.placement_status || "Active placement")}</small></div><button type="button" class="sp-open-btn" data-rail-open-child="${escapeHtml(childKey(child))}">Open</button></article>`;
}

function miniRows(items, emptyMessage) {
  if (!items.length) return emptyMini(emptyMessage);
  return `<div class="os-rail-mini">${items.slice(0, 6).map((item) => { const index = registerOpenable(item); return `<button type="button" data-rail-open-row="${index}"><strong>${escapeHtml(item.title || item.summary || displayType(recordType(item)))}</strong><span>${escapeHtml(displayType(recordType(item)))} · ${escapeHtml(formatDate(item.updated_at || item.created_at || item.occurred_at || item.event_datetime, "Not dated"))}</span></button>`; }).join("")}</div>`;
}

function actionList(actions) {
  return `<div class="os-rail-actions">${actions.map(([title, body, view]) => `<button type="button" data-sp-view="${escapeHtml(view)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></button>`).join("")}</div>`;
}

function handleRailClicks(event) {
  const toggle = event.target.closest?.("[data-toggle-context-rail]");
  if (toggle) {
    event.preventDefault();
    document.getElementById("ic-os-context-rail")?.classList.toggle("collapsed");
    return;
  }
  const row = event.target.closest?.("[data-rail-open-row]");
  if (row) {
    event.preventDefault();
    const record = RAIL_STATE.openableRows[Number(row.dataset.railOpenRow)];
    if (record) window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: record }));
    return;
  }
  const child = event.target.closest?.("[data-rail-open-child]");
  if (child) {
    event.preventDefault();
    const existing = document.querySelector(`[data-open-child="${cssEscape(child.dataset.railOpenChild)}"]`);
    if (existing) existing.click();
  }
}

function registerOpenable(record) { const index = RAIL_STATE.openableRows.length; RAIL_STATE.openableRows.push(record); return index; }
function linkedToChild(record, child) { const id = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || ""); const name = String(record.child_name || record.young_person_name || record.childName || "").toLowerCase(); return childKey(child) === id || childName(child).toLowerCase() === name; }
function initials(value) { return String(value || "YP").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YP"; }
function cssEscape(value) { return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }
function emptyMini(message) { return `<div class="os-rail-empty">${escapeHtml(message)}</div>`; }

window.IndiCareOSContextRail = { refresh: () => renderRail({ force: true }) };
