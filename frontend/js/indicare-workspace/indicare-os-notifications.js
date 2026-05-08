import { apiGet } from "../young-people-shell/core/api.js";
import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  recordKey,
  recordType,
  childName,
  displayType,
  formatDate,
  escapeHtml,
} from "./indicare-os-context.js";

const NOTIFICATION_STATE = {
  items: [],
  reviewQueueLoadedAt: 0,
  reviewQueue: [],
  panelOpen: false,
};

bootNotifications();

function bootNotifications() {
  document.addEventListener("click", handleNotificationClicks, true);
  window.addEventListener("indicare:os-context-ready", rebuildNotifications);
  window.addEventListener("indicare:refresh-live-os", () => rebuildNotifications({ forceReviewQueue: true }));
  const observer = new MutationObserver(() => attachBell());
  observer.observe(document.body, { childList: true, subtree: true });
  attachBell();
  rebuildNotifications();
}

function attachBell() {
  const bell = findBell();
  if (!bell || bell.dataset.notificationsReady === "true") return;
  bell.dataset.notificationsReady = "true";
  bell.dataset.openNotifications = "true";
  bell.setAttribute("aria-haspopup", "dialog");
  bell.setAttribute("aria-expanded", "false");
  bell.title = "Operational notifications";
  ensurePanel();
  updateBellBadge();
}

function findBell() {
  return document.querySelector('.sp-icon-btn[aria-label="Notifications"]') || [...document.querySelectorAll(".sp-icon-btn")].find((button) => /🔔|notification/i.test(button.textContent || button.getAttribute("aria-label") || ""));
}

function ensurePanel() {
  if (document.getElementById("ic-os-notifications-panel")) return;
  const panel = document.createElement("section");
  panel.id = "ic-os-notifications-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "IndiCare OS notifications");
  panel.style.cssText = "position:fixed;right:22px;top:76px;width:min(430px,calc(100vw - 32px));max-height:calc(100vh - 110px);overflow:auto;background:#fff;border:1px solid #dbe4f0;border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.22);z-index:9998;display:none;";
  panel.innerHTML = `
    <header style="padding:18px 18px 12px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
      <div><strong style="display:block;font-size:1.08rem;">Operational notifications</strong><span id="ic-notifications-subtitle" style="display:block;color:#64748b;font-size:.86rem;margin-top:4px;">Live OS context</span></div>
      <button type="button" data-close-notifications style="border:0;background:#f1f5f9;border-radius:10px;width:34px;height:34px;cursor:pointer;">×</button>
    </header>
    <div id="ic-notifications-list" style="display:grid;gap:10px;padding:14px;"></div>
    <footer style="padding:12px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:.82rem;line-height:1.5;">Notifications are generated from live records, review queue, safeguarding, chronology and tasks. No demo notifications are created.</footer>`;
  document.body.appendChild(panel);
}

async function rebuildNotifications(options = {}) {
  attachBell();
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const reviewQueue = await getReviewQueue(options);
  const items = [
    ...reviewNotifications(reviewQueue),
    ...safeguardingNotifications(context),
    ...taskNotifications(context),
    ...recordingNotifications(context),
    ...handoverNotifications(context),
  ];
  NOTIFICATION_STATE.items = dedupeNotifications(items).sort(sortNotifications).slice(0, 25);
  updateBellBadge();
  if (NOTIFICATION_STATE.panelOpen) renderPanel();
}

async function getReviewQueue({ forceReviewQueue = false } = {}) {
  const freshEnough = Date.now() - NOTIFICATION_STATE.reviewQueueLoadedAt < 45000;
  if (!forceReviewQueue && freshEnough) return NOTIFICATION_STATE.reviewQueue;
  try {
    const payload = await apiGet("/workspace-records/review/queue", { skipCache: true });
    const records = arrayFrom(payload.records || payload.items || payload.data);
    NOTIFICATION_STATE.reviewQueue = records;
    NOTIFICATION_STATE.reviewQueueLoadedAt = Date.now();
    return records;
  } catch {
    const context = scopeContextToSession(getOsContext(), getOperationalSession());
    const fallback = arrayFrom(context.documents).filter((record) => /review|submitted|pending|draft|changes|returned/i.test(String(record.status || "")));
    NOTIFICATION_STATE.reviewQueue = fallback;
    NOTIFICATION_STATE.reviewQueueLoadedAt = Date.now();
    return fallback;
  }
}

function reviewNotifications(records) {
  return arrayFrom(records).map((record) => notification({
    id: `review:${recordKey(record) || record.title || record.summary}`,
    title: record.status && /changes|returned/i.test(record.status) ? "Changes requested" : "Record awaiting review",
    body: record.title || record.summary || "A record needs staff or manager review.",
    tone: /changes|returned/i.test(String(record.status || "")) ? "amber" : "blue",
    area: "reviews",
    record,
    priority: /submitted|changes|returned/i.test(String(record.status || "")) ? 90 : 60,
    when: record.updated_at || record.created_at,
  }));
}

function safeguardingNotifications(context) {
  return arrayFrom(context.safeguarding)
    .filter((item) => !/closed|resolved|complete|approved/i.test(String(item.status || "")))
    .map((item) => notification({
      id: `safeguarding:${recordKey(item) || item.title || item.summary}`,
      title: isHighRisk(item) ? "High-priority safeguarding" : "Open safeguarding item",
      body: item.title || item.summary || item.description || "Safeguarding context requires oversight.",
      tone: isHighRisk(item) ? "red" : "amber",
      area: "safeguarding",
      record: item,
      priority: isHighRisk(item) ? 100 : 85,
      when: item.updated_at || item.created_at || item.occurred_at,
    }));
}

function taskNotifications(context) {
  return arrayFrom(context.tasks)
    .map(normaliseTask)
    .filter((task) => isOverdue(task) || isDueSoon(task))
    .map((task) => notification({
      id: `task:${task.id}`,
      title: isOverdue(task) ? "Overdue action" : "Action due soon",
      body: task.title,
      tone: isOverdue(task) ? "red" : "amber",
      area: "workforce",
      record: task.raw || task,
      priority: isOverdue(task) ? 95 : 70,
      when: task.due_date,
    }));
}

function recordingNotifications(context) {
  return arrayFrom(context.documents)
    .filter((record) => /draft|submitted|pending|changes|returned|overdue/i.test(String(record.status || "")))
    .map((record) => notification({
      id: `recording:${recordKey(record) || record.title || record.summary}`,
      title: /draft/i.test(String(record.status || "")) ? "Draft record" : "Recording action needed",
      body: record.title || record.summary || "A record needs action.",
      tone: /overdue|returned|changes/i.test(String(record.status || "")) ? "amber" : "blue",
      area: "docs",
      record,
      priority: /overdue|returned|changes/i.test(String(record.status || "")) ? 80 : 55,
      when: record.updated_at || record.created_at,
    }));
}

function handoverNotifications(context) {
  const highChronology = arrayFrom(context.chronology).filter((item) => isHighRisk(item) || /incident|missing|safeguarding/i.test(`${item.type || ""} ${item.category || ""} ${item.title || ""}`));
  return highChronology.slice(0, 6).map((item) => notification({
    id: `handover:${recordKey(item) || item.title || item.summary}`,
    title: "Handover-significant event",
    body: item.title || item.summary || item.narrative || "Chronology item may need handover.",
    tone: isHighRisk(item) ? "red" : "amber",
    area: "chronology",
    record: item,
    priority: isHighRisk(item) ? 90 : 65,
    when: item.occurred_at || item.event_datetime || item.created_at,
  }));
}

function notification({ id, title, body, tone = "blue", area = "dashboard", record = null, priority = 50, when = "" }) {
  return { id, title, body, tone, area, record, priority, when };
}

function renderPanel() {
  ensurePanel();
  const panel = document.getElementById("ic-os-notifications-panel");
  const list = document.getElementById("ic-notifications-list");
  const subtitle = document.getElementById("ic-notifications-subtitle");
  if (!panel || !list) return;
  const session = getOperationalSession();
  if (subtitle) subtitle.textContent = `${session?.homeName || "No home selected"} · ${NOTIFICATION_STATE.items.length} notification${NOTIFICATION_STATE.items.length === 1 ? "" : "s"}`;
  list.innerHTML = NOTIFICATION_STATE.items.length ? NOTIFICATION_STATE.items.map(renderNotification).join("") : `<div style="padding:18px;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc;"><strong style="display:block;">No operational notifications</strong><p style="margin:6px 0 0;color:#64748b;line-height:1.5;">No review, safeguarding, overdue task or handover notifications were generated from the current live context.</p></div>`;
  panel.style.display = "block";
  NOTIFICATION_STATE.panelOpen = true;
  findBell()?.setAttribute("aria-expanded", "true");
}

function renderNotification(item, index) {
  const colour = item.tone === "red" ? "#dc2626" : item.tone === "amber" ? "#d97706" : "#075fd1";
  return `<article data-notification-index="${index}" role="button" tabindex="0" style="display:grid;grid-template-columns:10px minmax(0,1fr);gap:12px;padding:14px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;cursor:pointer;">
    <span style="width:10px;border-radius:999px;background:${colour};"></span>
    <div style="min-width:0;"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><strong style="display:block;color:#0f172a;">${escapeHtml(item.title)}</strong><em style="font-style:normal;color:#64748b;font-size:.78rem;white-space:nowrap;">${escapeHtml(formatDate(item.when, ""))}</em></div><p style="margin:6px 0 8px;color:#475569;line-height:1.45;">${escapeHtml(item.body)}</p><span style="display:inline-flex;height:24px;align-items:center;padding:0 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:.74rem;font-weight:800;">${escapeHtml(displayType(item.area))}</span></div>
  </article>`;
}

function handleNotificationClicks(event) {
  const bell = event.target.closest?.("[data-open-notifications]");
  if (bell) {
    event.preventDefault();
    event.stopImmediatePropagation();
    togglePanel();
    return;
  }
  if (event.target.closest?.("[data-close-notifications]")) {
    event.preventDefault();
    closePanel();
    return;
  }
  const itemNode = event.target.closest?.("[data-notification-index]");
  if (itemNode) {
    event.preventDefault();
    const item = NOTIFICATION_STATE.items[Number(itemNode.dataset.notificationIndex)];
    if (item) openNotification(item);
    return;
  }
  const panel = document.getElementById("ic-os-notifications-panel");
  if (NOTIFICATION_STATE.panelOpen && panel && !panel.contains(event.target) && !event.target.closest?.("[data-open-notifications]")) closePanel();
}

async function togglePanel() {
  if (NOTIFICATION_STATE.panelOpen) return closePanel();
  await rebuildNotifications();
  renderPanel();
}

function closePanel() {
  const panel = document.getElementById("ic-os-notifications-panel");
  if (panel) panel.style.display = "none";
  NOTIFICATION_STATE.panelOpen = false;
  findBell()?.setAttribute("aria-expanded", "false");
}

function openNotification(item) {
  closePanel();
  if (item.record && (recordKey(item.record) || item.record.title || item.record.summary)) {
    window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: item.record }));
    return;
  }
  const nav = document.querySelector(`[data-sp-view="${cssEscape(item.area)}"]`);
  nav?.click();
}

function updateBellBadge() {
  const bell = findBell();
  if (!bell) return;
  const badge = bell.querySelector("b") || document.createElement("b");
  if (!badge.parentElement) bell.appendChild(badge);
  const count = NOTIFICATION_STATE.items.length;
  badge.textContent = String(count > 99 ? "99+" : count);
  badge.style.display = count ? "grid" : "none";
  bell.classList.toggle("has-notifications", Boolean(count));
  bell.setAttribute("aria-label", count ? `Notifications: ${count}` : "Notifications");
}

function normaliseTask(item = {}) {
  return {
    id: recordKey(item) || `${item.title || item.summary || "task"}:${item.due_date || item.review_date || item.updated_at || ""}`,
    title: item.title || item.summary || item.description || "Operational action",
    status: item.status || item.workflow_status || "open",
    due_date: item.due_date || item.review_date || item.next_review_date || item.deadline || "",
    raw: item,
  };
}

function dedupeNotifications(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || `${item.title}:${item.body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortNotifications(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return Date.parse(b.when || 0) - Date.parse(a.when || 0);
}

function isHighRisk(item = {}) {
  return /high|critical|red|significant|escalated|urgent/i.test(`${item.severity || ""} ${item.risk_level || ""} ${item.priority || ""} ${item.status || ""}`);
}

function isOverdue(task) {
  const date = Date.parse(task.due_date || "");
  if (Number.isNaN(date)) return /overdue/i.test(String(task.status || ""));
  return date < Date.now() && !/complete|closed|approved|done/i.test(String(task.status || ""));
}

function isDueSoon(task) {
  const date = Date.parse(task.due_date || "");
  if (Number.isNaN(date)) return false;
  const diff = date - Date.now();
  return diff > 0 && diff < 48 * 60 * 60 * 1000 && !/complete|closed|approved|done/i.test(String(task.status || ""));
}

function cssEscape(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.results)) return value.results;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.records)) return value.records;
  return [];
}

window.IndiCareOSNotifications = {
  rebuild: rebuildNotifications,
  getItems: () => NOTIFICATION_STATE.items,
};
