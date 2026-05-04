import { dashboardFromRecords } from "./workflow-engine.js";

const EMPTY_DASHBOARD = Object.freeze({
  pending_approvals: 0,
  actions_due: 0,
  safeguarding_alerts: 0,
  inspection_gaps: 0,
  today: [
    {
      title: "No urgent items loaded",
      body: "Connect /workflow/dashboard or /workflow/records to show overdue records, approvals, actions and safeguarding alerts.",
      priority: "info",
    },
  ],
  lifecycle: [
    { title: "Draft", body: "Staff create a record and save it safely." },
    { title: "Submitted", body: "Staff submit the record for management oversight." },
    { title: "Manager review", body: "Manager reviews quality, safeguarding and follow-up needs." },
    { title: "Action generated", body: "Any concern or required next step becomes an owned action." },
    { title: "Follow-up", body: "The action is monitored until complete." },
    { title: "Quality sign-off", body: "The record is signed off and locked into evidence." },
    { title: "Evidence bank", body: "The record maps to SCCIF, Quality Standards and inspection evidence." },
  ],
  approvals: [],
  actions: [],
  safeguarding: [],
  reg: [],
  evidence: [],
  voice: [],
});

let currentDashboard = EMPTY_DASHBOARD;

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[char]);
}

function normaliseItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") return { title: item, body: "", priority: "normal" };
    return {
      id: item.id || item.sourceRecordId || item.title || item.name || item.label || "",
      title: item.title || item.name || item.label || "Untitled item",
      body: item.body || item.summary || item.description || item.detail || "",
      priority: item.priority || item.status || "normal",
      owner: item.owner || item.assignee || "",
      due: item.due || item.due_date || item.deadline || "",
      href: item.href || item.url || "",
      status: item.status || "open",
      sourceRecordId: item.sourceRecordId || item.record_id || "",
      sourceRecordType: item.sourceRecordType || item.record_type || "",
    };
  });
}

function mergeDashboard(data = {}) {
  return {
    ...EMPTY_DASHBOARD,
    ...data,
    today: data.today ?? EMPTY_DASHBOARD.today,
    lifecycle: data.lifecycle ?? EMPTY_DASHBOARD.lifecycle,
    approvals: data.approvals ?? EMPTY_DASHBOARD.approvals,
    actions: data.actions ?? EMPTY_DASHBOARD.actions,
    safeguarding: data.safeguarding ?? EMPTY_DASHBOARD.safeguarding,
    reg: data.reg ?? EMPTY_DASHBOARD.reg,
    evidence: data.evidence ?? EMPTY_DASHBOARD.evidence,
    voice: data.voice ?? EMPTY_DASHBOARD.voice,
  };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 404) return null;
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }
  if (response.status === 403) {
    window.location.replace(`/access-denied?blocked=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }

  if (!response.ok) throw new Error(`${path} failed with ${response.status}`);
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : {};
}

async function postWorkflow(path, payload = {}) {
  return fetchJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function fetchDashboard() {
  const dashboard = await fetchJson("/workflow/dashboard");
  if (dashboard) return dashboard;

  const recordsPayload = await fetchJson("/workflow/records");
  const records = Array.isArray(recordsPayload) ? recordsPayload : recordsPayload?.records || recordsPayload?.items || [];
  if (records.length) return dashboardFromRecords(records);

  return EMPTY_DASHBOARD;
}

async function loadDashboard() {
  const status = byId("opsStatus");
  if (status) status.textContent = "Loading operating dashboard...";

  try {
    const raw = await fetchDashboard();
    const data = mergeDashboard(raw);
    renderDashboard(data);
    if (status) status.textContent = raw === EMPTY_DASHBOARD ? "Dashboard ready for workflow data." : "Dashboard loaded.";
  } catch (error) {
    console.error("[operating-dashboard] load failed", error);
    renderDashboard(EMPTY_DASHBOARD);
    if (status) status.textContent = "Dashboard loaded with empty fallback data.";
  }
}

function renderDashboard(data) {
  currentDashboard = data;
  byId("opsPendingApprovals").textContent = data.pending_approvals ?? 0;
  byId("opsActionsDue").textContent = data.actions_due ?? 0;
  byId("opsSafeguardingAlerts").textContent = data.safeguarding_alerts ?? 0;
  byId("opsInspectionGaps").textContent = data.inspection_gaps ?? 0;

  renderList("opsTodayList", data.today, "Nothing urgent to show.", "today");
  renderList("opsLifecycleList", data.lifecycle, "No lifecycle items loaded.", "lifecycle");
  renderList("opsApprovalsList", data.approvals, "No records are waiting for manager approval.", "approval");
  renderList("opsActionsList", data.actions, "No open actions are currently due.", "action");
  renderList("opsSafeguardingList", data.safeguarding, "No safeguarding or Reg 40 alerts are currently open.", "action");
  renderList("opsRegList", data.reg, "No Reg 44 or Reg 45 actions are currently due.", "action");
  renderList("opsEvidenceList", data.evidence, "No SCCIF evidence gaps are currently loaded.", "evidence");
  renderList("opsVoiceList", data.voice, "No children’s voice or outcome gaps are currently loaded.", "action");
  bindWorkflowControls();
}

function renderList(id, items, emptyText = "Nothing to show.", mode = "item") {
  const el = byId(id);
  if (!el) return;
  const normalised = normaliseItems(items);
  if (!normalised.length) {
    el.innerHTML = `<p class="muted">${escapeHtml(emptyText)}</p>`;
    return;
  }

  el.innerHTML = normalised.map((item) => renderItem(item, mode)).join("");
}

function renderWorkflowControls(item, mode) {
  if (mode === "approval") {
    return `
      <div class="ops-item-controls">
        <button type="button" class="yp-button yp-button-primary" data-workflow-action="approve" data-item-id="${escapeHtml(item.id)}">Approve</button>
        <button type="button" class="yp-button" data-workflow-action="request_changes" data-item-id="${escapeHtml(item.id)}">Request changes</button>
      </div>
    `;
  }

  if (mode === "action") {
    return `
      <div class="ops-item-controls">
        <button type="button" class="yp-button yp-button-primary" data-workflow-action="complete_action" data-item-id="${escapeHtml(item.id)}">Complete</button>
        <button type="button" class="yp-button" data-workflow-action="start_action" data-item-id="${escapeHtml(item.id)}">In progress</button>
      </div>
    `;
  }

  return "";
}

function renderItem(item, mode = "item") {
  const meta = [item.owner ? `Owner: ${item.owner}` : "", item.due ? `Due: ${item.due}` : ""].filter(Boolean).join(" · ");
  const content = `
    <div class="ops-item-main">
      <strong>${escapeHtml(item.title)}</strong>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </div>
    <span class="ops-priority ops-priority-${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span>
  `;

  const controls = renderWorkflowControls(item, mode);
  const inner = `${content}${controls}`;
  if (item.href && !controls) return `<a class="ops-item" href="${escapeHtml(item.href)}">${inner}</a>`;
  return `<div class="ops-item" data-mode="${escapeHtml(mode)}" data-item-id="${escapeHtml(item.id)}">${inner}</div>`;
}

function findWorkflowItem(id) {
  const sections = ["approvals", "actions", "safeguarding", "reg", "voice"];
  for (const section of sections) {
    const found = normaliseItems(currentDashboard[section]).find((item) => String(item.id) === String(id));
    if (found) return found;
  }
  return null;
}

async function handleWorkflowAction(action, itemId) {
  const status = byId("opsStatus");
  const item = findWorkflowItem(itemId);
  if (!item) return;

  if (status) status.textContent = "Updating workflow...";

  try {
    await postWorkflow(`/workflow/${action}`, { item_id: itemId, item });
    await loadDashboard();
  } catch (error) {
    console.warn("[operating-dashboard] workflow action fallback", error);
    applyLocalWorkflowUpdate(action, itemId);
    if (status) status.textContent = "Updated locally. Backend workflow endpoint not yet available.";
  }
}

function applyLocalWorkflowUpdate(action, itemId) {
  const removeFrom = (items = []) => normaliseItems(items).filter((item) => String(item.id) !== String(itemId));
  const updateStatus = (items = [], status) => normaliseItems(items).map((item) => String(item.id) === String(itemId) ? { ...item, status, priority: status } : item);

  if (["approve", "request_changes"].includes(action)) {
    currentDashboard = {
      ...currentDashboard,
      approvals: removeFrom(currentDashboard.approvals),
      pending_approvals: Math.max(0, Number(currentDashboard.pending_approvals || 0) - 1),
    };
  }

  if (action === "complete_action") {
    currentDashboard = {
      ...currentDashboard,
      actions: removeFrom(currentDashboard.actions),
      safeguarding: removeFrom(currentDashboard.safeguarding),
      reg: removeFrom(currentDashboard.reg),
      voice: removeFrom(currentDashboard.voice),
      actions_due: Math.max(0, Number(currentDashboard.actions_due || 0) - 1),
    };
  }

  if (action === "start_action") {
    currentDashboard = {
      ...currentDashboard,
      actions: updateStatus(currentDashboard.actions, "in_progress"),
      safeguarding: updateStatus(currentDashboard.safeguarding, "in_progress"),
      reg: updateStatus(currentDashboard.reg, "in_progress"),
      voice: updateStatus(currentDashboard.voice, "in_progress"),
    };
  }

  renderDashboard(currentDashboard);
}

function bindWorkflowControls() {
  document.querySelectorAll("[data-workflow-action]").forEach((button) => {
    button.addEventListener("click", () => handleWorkflowAction(button.dataset.workflowAction, button.dataset.itemId));
  });
}

window.IndiCareOperatingDashboard = Object.freeze({ loadDashboard, renderDashboard, dashboardFromRecords });
loadDashboard();
