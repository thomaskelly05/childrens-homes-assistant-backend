import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  childKey,
  childName,
  recordKey,
  recordType,
  displayType,
  formatDate,
  escapeHtml,
  isHighPriority,
} from "./indicare-os-context.js";

const ACTIVITY_STATE = {
  renderedSignature: "",
  openableItems: [],
  recentItems: [],
};

bootActivityIntelligence();

function bootActivityIntelligence() {
  document.addEventListener("click", handleActivityClicks, true);
  window.addEventListener("indicare:os-context-ready", () => enhanceDashboardActivity({ force: true }));
  window.addEventListener("indicare:refresh-live-os", () => enhanceDashboardActivity({ force: true }));
  const observer = new MutationObserver(() => enhanceDashboardActivity());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceDashboardActivity();
}

function enhanceDashboardActivity({ force = false } = {}) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const title = main.querySelector(".sp-page-head h1")?.textContent?.trim();
  if (title !== "Dashboard") return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const signature = `${context.children.length}:${context.documents.length}:${context.chronology.length}:${context.safeguarding.length}:${context.tasks.length}:${context.reports.length}`;
  if (!force && ACTIVITY_STATE.renderedSignature === signature && main.querySelector("[data-os-activity-intelligence]")) return;
  ACTIVITY_STATE.renderedSignature = signature;
  renderActivityIntelligence(main, context);
}

function renderActivityIntelligence(main, context) {
  ACTIVITY_STATE.openableItems = [];
  const activities = buildActivityItems(context);
  ACTIVITY_STATE.recentItems = activities;
  const attention = buildNeedsAttention(context, activities);
  const pinned = buildPinnedChildren(context);
  const review = buildReviewInbox(context);
  const existing = main.querySelector("[data-os-activity-intelligence]");
  const html = `
    <section class="sp-card os-intelligence-card" data-os-activity-intelligence>
      <div class="sp-card-head">
        <div><h2>Operational intelligence</h2><p>Live activity, priorities and manager oversight generated from the current OS context.</p></div>
        <button type="button" data-open-ai-operational-summary>AI shift summary →</button>
      </div>
      <section class="os-activity-grid">
        <div>
          <div class="sp-card-head compact"><h2>Live activity feed</h2><span>${activities.length}</span></div>
          ${activityFeed(activities)}
        </div>
        <aside class="os-intelligence-side">
          <section class="os-side-block"><h3>Needs attention</h3>${attentionList(attention)}</section>
          <section class="os-side-block"><h3>Manager review inbox</h3>${reviewInbox(review)}</section>
          <section class="os-side-block"><h3>Pinned young people</h3>${pinnedChildren(pinned)}</section>
        </aside>
      </section>
    </section>`;
  if (existing) existing.outerHTML = html;
  else {
    const dashboardGrid = main.querySelector(".sp-dashboard-grid");
    if (dashboardGrid) dashboardGrid.insertAdjacentHTML("beforebegin", html);
    else main.insertAdjacentHTML("beforeend", html);
  }
}

function buildActivityItems(context) {
  const items = [
    ...context.documents.map((record) => activityFromRecord(record, "record")),
    ...context.chronology.map((record) => activityFromRecord(record, "chronology")),
    ...context.safeguarding.map((record) => activityFromRecord(record, "safeguarding")),
    ...context.tasks.map((record) => activityFromRecord(record, "task")),
    ...context.reports.map((record) => activityFromRecord(record, "report")),
  ];
  return dedupe(items).sort(newestFirst).slice(0, 12);
}

function activityFromRecord(record, kind) {
  const type = recordType(record);
  const title = record.title || record.summary || record.name || displayType(type);
  const child = record.child_name || record.young_person_name || record.childName || "";
  const status = record.status || record.workflow_status || record.manager_review_status || record.review_status || "recorded";
  const when = record.updated_at || record.created_at || record.occurred_at || record.event_datetime || record.session_date || record.handover_date || record.meeting_date;
  const tone = highPriorityRecord(record, status, kind) ? (/critical|red|high|missing|safeguarding/i.test(`${record.severity || ""} ${type} ${title}`) ? "red" : "amber") : "blue";
  const icon = kind === "safeguarding" ? "🛡" : kind === "chronology" ? "◷" : kind === "task" ? "✓" : kind === "report" ? "▣" : "📄";
  return { kind, record, type, title, child, status, when, tone, icon, summary: record.summary || record.description || record.narrative || record.notes || "Live operational item." };
}

function buildNeedsAttention(context, activities) {
  const overdue = [...context.tasks, ...context.documents].filter((item) => /overdue|changes_requested|returned|submitted_for_review|pending/i.test(String(item.status || item.workflow_status || item.manager_review_status || "")));
  const safeguarding = context.safeguarding.filter((item) => !/closed|resolved|approved|complete/i.test(String(item.status || item.workflow_status || "")));
  const high = activities.filter((item) => item.tone === "red" || item.tone === "amber");
  return dedupe([
    ...overdue.map((record) => ({ label: "Recording action", body: record.title || record.summary || "Record needs action", record, tone: "amber" })),
    ...safeguarding.map((record) => ({ label: "Safeguarding oversight", body: record.title || record.summary || "Open safeguarding item", record, tone: highPriorityRecord(record) ? "red" : "amber" })),
    ...high.map((item) => ({ label: displayType(item.kind), body: item.title, record: item.record, tone: item.tone })),
  ]).slice(0, 8);
}

function buildReviewInbox(context) {
  return [...context.documents, ...context.tasks, ...context.safeguarding]
    .filter((item) => /submitted_for_review|changes_requested|pending|draft|review/i.test(String(item.status || item.workflow_status || item.manager_review_status || item.approval_status || "")))
    .sort((a, b) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0))
    .slice(0, 6);
}

function buildPinnedChildren(context) {
  const byChild = new Map();
  context.children.forEach((child) => {
    byChild.set(childKey(child), { child, score: 0, reasons: [] });
  });
  const childFor = (record) => {
    const id = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || record.child || "");
    const name = String(record.child_name || record.young_person_name || record.childName || "").toLowerCase();
    return [...byChild.values()].find((entry) => childKey(entry.child) === id || childName(entry.child).toLowerCase() === name);
  };
  [...context.safeguarding, ...context.chronology, ...context.documents, ...context.tasks].forEach((record) => {
    const entry = childFor(record);
    if (!entry) return;
    if (highPriorityRecord(record)) { entry.score += 4; entry.reasons.push("priority"); }
    if (/safeguarding|missing|incident|risk/i.test(recordType(record))) { entry.score += 3; entry.reasons.push(displayType(recordType(record))); }
    if (/submitted|pending|changes|overdue/i.test(String(record.status || record.workflow_status || ""))) { entry.score += 2; entry.reasons.push("review/action"); }
    entry.score += 1;
  });
  return [...byChild.values()].filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
}

function activityFeed(items) {
  if (!items.length) return emptyState("No recent operational activity was returned for this session.");
  return `<div class="os-activity-feed">${items.map((item) => { const index = registerOpenable(item.record); return `<article class="os-activity-item ${escapeHtml(item.tone)}" data-open-activity-item="${index}" role="button" tabindex="0"><span class="os-activity-icon">${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.child ? `${item.child} · ${item.summary}` : item.summary)}</span><small>${escapeHtml(displayType(item.type))} · ${escapeHtml(displayType(item.status))}</small></div><time class="os-activity-time">${escapeHtml(formatDate(item.when, ""))}</time></article>`; }).join("")}</div>`;
}

function attentionList(items) {
  if (!items.length) return emptyState("No urgent items were generated from the current context.");
  return `<div class="sp-mini-rows">${items.map((item) => { const index = registerOpenable(item.record); return `<p data-open-activity-item="${index}" role="button" tabindex="0"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.body)}</strong><em>${escapeHtml(item.tone === "red" ? "Urgent" : "Review")}</em></p>`; }).join("")}</div>`;
}

function reviewInbox(items) {
  if (!items.length) return emptyState("No review items were found in the current context.");
  return `<div class="sp-mini-rows">${items.map((record) => { const index = registerOpenable(record); return `<p data-open-activity-item="${index}" role="button" tabindex="0"><span>${escapeHtml(displayType(recordType(record)))}</span><strong>${escapeHtml(record.title || record.summary || "Review item")}</strong><em>${escapeHtml(displayType(record.status || record.workflow_status || record.manager_review_status || "review"))}</em></p>`; }).join("")}</div>`;
}

function pinnedChildren(items) {
  if (!items.length) return emptyState("No pinned young people were generated from the current activity context.");
  return `<div class="os-pinned-grid">${items.map((entry) => `<article class="os-pinned-child"><span class="sp-child-avatar">${escapeHtml(initials(childName(entry.child)))}</span><div><strong>${escapeHtml(childName(entry.child))}</strong><small>${escapeHtml([...new Set(entry.reasons)].slice(0, 3).join(" · ") || "Recent activity")}</small></div><button class="sp-open-btn" data-open-pinned-child="${escapeHtml(childKey(entry.child))}" type="button">Open</button></article>`).join("")}</div>`;
}

function handleActivityClicks(event) {
  const activity = event.target.closest?.("[data-open-activity-item]");
  if (activity) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const record = ACTIVITY_STATE.openableItems[Number(activity.dataset.openActivityItem)];
    if (record) window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: record }));
    return;
  }
  const child = event.target.closest?.("[data-open-pinned-child]");
  if (child) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const existing = document.querySelector(`[data-open-child="${cssEscape(child.dataset.openPinnedChild)}"]`);
    if (existing) existing.click();
    else window.dispatchEvent(new CustomEvent("indicare:open-child", { detail: { id: child.dataset.openPinnedChild } }));
    return;
  }
  if (event.target.closest?.("[data-open-ai-operational-summary]")) {
    event.preventDefault();
    openAssistantWithPrompt("Create a concise operational shift summary from the current dashboard. Include needs attention, safeguarding, review queue, recent activity, young people to prioritise, and actions for the next shift. Use live OS context only.");
  }
}

function registerOpenable(item) {
  const index = ACTIVITY_STATE.openableItems.length;
  ACTIVITY_STATE.openableItems.push(item);
  return index;
}

function openAssistantWithPrompt(prompt) {
  document.querySelector(".sp-ai-bubble")?.click();
  setTimeout(() => {
    const input = document.getElementById("ic-assistant-input");
    if (input) {
      input.value = prompt;
      document.getElementById("ic-send-assistant")?.click();
    }
  }, 120);
}

function highPriorityRecord(record, status = "", kind = "") {
  return isHighPriority(record) || /high|critical|red|urgent|overdue|changes_requested|returned|submitted_for_review|pending/i.test(`${status} ${kind} ${record.severity || ""} ${record.risk_level || ""} ${record.priority || ""}`);
}

function newestFirst(a, b) {
  return Date.parse(b.when || 0) - Date.parse(a.when || 0);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const record = item.record || item;
    const key = `${recordType(record)}:${recordKey(record)}:${item.title || item.body || record.title || record.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function initials(value) {
  return String(value || "YP").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YP";
}

function cssEscape(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function emptyState(message) {
  return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`;
}

window.IndiCareOSActivityIntelligence = {
  refresh: () => enhanceDashboardActivity({ force: true }),
  getRecent: () => ACTIVITY_STATE.recentItems,
};
