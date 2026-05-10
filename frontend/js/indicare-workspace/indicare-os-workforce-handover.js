const WORKFORCE_STATE = {
  renderedSignature: "",
  tasks: [],
  handoverItems: [],
  openableRows: [],
};

bootWorkforceHandoverIntegration();

function bootWorkforceHandoverIntegration() {
  document.addEventListener("click", handleWorkforceClicks, true);
  const observer = new MutationObserver(() => enhanceWorkforceView());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceWorkforceView();
}

function enhanceWorkforceView() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const title = main.querySelector(".sp-page-head h1")?.textContent?.trim();
  if (title !== "Workforce") return;
  const signature = main.innerHTML.slice(0, 500);
  if (WORKFORCE_STATE.renderedSignature === signature) return;
  WORKFORCE_STATE.renderedSignature = signature;
  WORKFORCE_STATE.openableRows = [];
  renderWorkforceOperationalView(main);
}

function renderWorkforceOperationalView(main) {
  const context = scopedContext();
  const tasks = buildTaskRows(context);
  const handoverItems = buildHandoverRows(context);
  const staff = arrayFrom(context.workforce);
  const overdue = tasks.filter(isOverdue).length;
  const dueSoon = tasks.filter(isDueSoon).length;
  const reviewRecords = arrayFrom(context.documents).filter((item) => /review|submitted|pending|changes|draft/i.test(String(item.status || "")));
  WORKFORCE_STATE.tasks = tasks;
  WORKFORCE_STATE.handoverItems = handoverItems;

  main.innerHTML = `
    <section class="sp-page-head"><div><h1>Workforce</h1><p>Daily running of ${escapeHtml(window.IndiCareOperationalSession?.homeName || "the selected home")}: handover, tasks, overdue records, workload and reminders.</p></div><div><button class="sp-secondary" data-refresh-live>Refresh</button><button class="sp-primary" data-open-ai-handover>AI handover</button></div></section>
    <section class="yp-overview-strip">
      ${metric("Staff", staff.length, "Loaded from workforce context")}
      ${metric("Tasks", tasks.length, "Actions and reminders")}
      ${metric("Overdue", overdue, "Past due or urgent", overdue ? "amber" : "green")}
      ${metric("Reviews", reviewRecords.length, "Records needing action", reviewRecords.length ? "amber" : "green")}
    </section>
    <section class="workforce-os-layout">
      <section class="workforce-os-main">
        <section class="sp-card"><div class="sp-card-head"><h2>Shift handover</h2><button data-open-ai-handover>Draft with AI →</button></div>${handoverList(handoverItems)}</section>
        <section class="sp-card"><div class="sp-card-head"><h2>Tasks and reminders</h2><span>${tasks.length}</span></div>${taskTable(tasks)}</section>
      </section>
      <aside class="workforce-os-side">
        <section class="sp-card"><h2>Staff workload</h2>${staffWorkload(staff, tasks)}</section>
        <section class="sp-card"><h2>Overdue recording</h2>${overdueRecording(reviewRecords, tasks)}</section>
        <section class="sp-card"><h2>Notifications</h2>${notificationList({ overdue, dueSoon, reviews: reviewRecords.length, safeguarding: context.safeguarding.length })}</section>
      </aside>
    </section>`;
}

function buildTaskRows(context) {
  const rawTasks = [
    ...arrayFrom(context.tasks),
    ...arrayFrom(context.documents).filter((item) => /task|todo|action|review|submitted|pending|changes|draft/i.test(`${item.type || ""} ${item.record_type || ""} ${item.status || ""} ${item.title || ""}`)),
    ...arrayFrom(context.safeguarding).filter((item) => !/closed|complete|resolved|approved/i.test(String(item.status || ""))),
  ];
  return dedupeRows(rawTasks.map(normaliseTask)).sort(taskSort);
}

function buildHandoverRows(context) {
  const importantRecords = [
    ...arrayFrom(context.chronology),
    ...arrayFrom(context.documents),
    ...arrayFrom(context.safeguarding),
  ].map(normaliseHandoverItem).filter((item) => isImportantForHandover(item)).sort(newestFirst);
  return dedupeRows(importantRecords).slice(0, 20);
}

function normaliseTask(item = {}) {
  const title = item.title || item.summary || item.description || item.name || "Operational action";
  const status = item.status || item.review_status || item.workflow_status || "open";
  return {
    ...item,
    id: rowId(item) || `${title}:${item.due_date || item.updated_at || item.created_at || ""}`,
    title,
    status,
    due_date: item.due_date || item.review_date || item.next_review_date || item.deadline || item.updated_at || item.created_at,
    owner: item.owner_name || item.assigned_to_name || item.staff_name || item.created_by_name || item.manager_name || "Unassigned",
    child_name: item.child_name || item.young_person_name || item.childName || "",
    priority: item.priority || item.severity || item.risk_level || "normal",
    type: item.type || item.record_type || item.category || "task",
    raw: item,
  };
}

function normaliseHandoverItem(item = {}) {
  const type = item.type || item.record_type || item.category || "record";
  const title = item.title || item.summary || item.name || displayType(type);
  return {
    ...item,
    id: rowId(item) || `${type}:${title}:${item.created_at || item.updated_at || ""}`,
    type,
    title,
    summary: item.summary || item.narrative || item.description || item.notes || "No additional summary recorded.",
    date: item.occurred_at || item.event_datetime || item.date || item.updated_at || item.created_at,
    status: item.status || item.review_status || "recorded",
    severity: item.severity || item.risk_level || item.significance || "",
    child_name: item.child_name || item.young_person_name || item.childName || "",
    raw: item,
  };
}

function isImportantForHandover(item) {
  return /high|critical|red|significant/i.test(String(item.severity || "")) || /open|overdue|submitted|pending|changes|escalated|returned/i.test(String(item.status || "")) || /incident|missing|safeguarding|risk|health|medication|handover/i.test(String(item.type || ""));
}

function handoverList(items) {
  if (!items.length) return emptyState("No handover-significant records returned from the current live context.");
  return `<div class="handover-list">${items.map((item) => { const index = registerOpenable(item.raw || item); return `<article class="handover-item" data-open-workforce-row="${index}" role="button" tabindex="0"><span>${escapeHtml(formatDate(item.date))}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.child_name ? `${item.child_name} · ${item.summary}` : item.summary)}</p><em class="sp-status ${statusClass(item.status)}">${escapeHtml(displayType(item.status || item.type))}</em></article>`; }).join("")}</div>`;
}

function taskTable(tasks) {
  if (!tasks.length) return emptyState("No live tasks, actions or review reminders were returned for this operational context.");
  return `<table class="sp-table"><thead><tr><th>Task</th><th>Young person</th><th>Owner</th><th>Status</th><th>Due</th><th>Action</th></tr></thead><tbody>${tasks.map((task) => { const index = registerOpenable(task.raw || task); return `<tr data-open-workforce-row="${index}"><td>${escapeHtml(task.title)}</td><td>${escapeHtml(task.child_name || "—")}</td><td>${escapeHtml(task.owner)}</td><td>${statusBadge(task.status)}</td><td>${escapeHtml(formatDate(task.due_date))}</td><td><button class="sp-open-btn" data-open-workforce-row="${index}" type="button">Open</button></td></tr>`; }).join("")}</tbody></table>`;
}

function staffWorkload(staff, tasks) {
  if (!staff.length) return emptyState("No workforce records returned yet. Staff workload will show once workforce data is available.");
  const rows = staff.map((person) => {
    const name = person.name || person.full_name || [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email || "Staff member";
    const count = tasks.filter((task) => String(task.owner || "").toLowerCase() === String(name).toLowerCase()).length;
    return `<p><span>${escapeHtml(person.role || person.job_title || "Staff")}</span><strong>${escapeHtml(name)}</strong><em>${count} task${count === 1 ? "" : "s"}</em></p>`;
  });
  return `<div class="sp-mini-rows">${rows.join("")}</div>`;
}

function overdueRecording(records, tasks) {
  const rows = [
    ...records.map((item) => ({ ...item, title: item.title || item.summary || "Record review", status: item.status || "review", date: item.updated_at || item.created_at, raw: item })),
    ...tasks.filter(isOverdue).map((item) => ({ ...item, title: item.title, status: item.status, date: item.due_date, raw: item.raw || item })),
  ];
  if (!rows.length) return emptyState("No overdue or review records returned in this context.");
  return `<div class="sp-mini-rows">${rows.slice(0, 10).map((row) => { const index = registerOpenable(row.raw || row); return `<p data-open-workforce-row="${index}" role="button" tabindex="0"><span>${escapeHtml(formatDate(row.date))}</span><strong>${escapeHtml(row.title)}</strong><em>${escapeHtml(displayType(row.status))}</em></p>`; }).join("")}</div>`;
}

function notificationList({ overdue, dueSoon, reviews, safeguarding }) {
  const notes = [];
  if (overdue) notes.push(["Overdue actions", `${overdue} task/action item${overdue === 1 ? "" : "s"} appear overdue.`]);
  if (dueSoon) notes.push(["Due soon", `${dueSoon} task/action item${dueSoon === 1 ? "" : "s"} are due soon.`]);
  if (reviews) notes.push(["Review queue", `${reviews} record${reviews === 1 ? "" : "s"} may need manager or staff action.`]);
  if (safeguarding) notes.push(["Safeguarding", `${safeguarding} safeguarding/context item${safeguarding === 1 ? "" : "s"} loaded.`]);
  if (!notes.length) return emptyState("No urgent notifications were generated from the current live context.");
  return `<div class="sp-mini-rows">${notes.map(([title, summary]) => `<p><span>Live OS</span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(summary)}</em></p>`).join("")}</div>`;
}

function handleWorkforceClicks(event) {
  const openRow = event.target.closest?.("[data-open-workforce-row]");
  if (openRow) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = WORKFORCE_STATE.openableRows[Number(openRow.dataset.openWorkforceRow)];
    if (item) window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: item }));
    return;
  }
  if (event.target.closest?.("[data-open-ai-handover]")) {
    event.preventDefault();
    openAssistantWithPrompt("Draft a shift handover from the current Workforce page. Include young people, safeguarding, incidents, overdue records, tasks, staff actions and what the next shift must know. Use only the live OS context.");
  }
}

function registerOpenable(item) {
  const index = WORKFORCE_STATE.openableRows.length;
  WORKFORCE_STATE.openableRows.push(item);
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

function scopedContext() {
  const raw = window.IndiCareScopedOSContext || window.IndiCareLiveContext || {};
  return {
    children: arrayFrom(raw.children || raw.items || raw.young_people || raw.youngPeople),
    documents: arrayFrom(raw.documents || raw.records || raw.recordings),
    chronology: arrayFrom(raw.chronology || raw.timeline || raw.events),
    safeguarding: arrayFrom(raw.safeguarding || raw.alerts || raw.risks || raw.concerns),
    workforce: arrayFrom(raw.workforce || raw.staff || raw.users),
    tasks: arrayFrom(raw.tasks || raw.actions || raw.reminders),
  };
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
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

function dedupeRows(rows) { const seen = new Set(); return rows.filter((item) => { const key = `${item.id}:${item.title}:${item.type}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function taskSort(a, b) { if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1; return Date.parse(a.due_date || 0) - Date.parse(b.due_date || 0); }
function newestFirst(a, b) { return Date.parse(b.date || 0) - Date.parse(a.date || 0); }
function metric(label, value, sub, tone = "blue") { return `<article class="yp-compact-metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(sub)}</small></article>`; }
function rowId(item) { return String(item.id || item.record_id || item.document_id || item.uuid || item.source_id || ""); }
function statusClass(value) { return /high|critical|open|overdue|escalated|returned|rejected|submitted|pending/i.test(String(value || "")) ? "submitted-for-review" : "approved"; }
function statusBadge(value) { return `<span class="sp-status ${statusClass(value)}">${escapeHtml(displayType(value || "open"))}</span>`; }
function displayType(type) { return String(type || "record").replaceAll("_", " ").replaceAll("-", " "); }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function formatDate(value) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
