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
      title: item.title || item.name || item.label || "Untitled item",
      body: item.body || item.summary || item.description || item.detail || "",
      priority: item.priority || item.status || "normal",
      owner: item.owner || item.assignee || "",
      due: item.due || item.due_date || item.deadline || "",
      href: item.href || item.url || "",
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

async function fetchJson(path) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json" },
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
  return response.json();
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
  byId("opsPendingApprovals").textContent = data.pending_approvals ?? 0;
  byId("opsActionsDue").textContent = data.actions_due ?? 0;
  byId("opsSafeguardingAlerts").textContent = data.safeguarding_alerts ?? 0;
  byId("opsInspectionGaps").textContent = data.inspection_gaps ?? 0;

  renderList("opsTodayList", data.today);
  renderList("opsLifecycleList", data.lifecycle);
  renderList("opsApprovalsList", data.approvals, "No records are waiting for manager approval.");
  renderList("opsActionsList", data.actions, "No open actions are currently due.");
  renderList("opsSafeguardingList", data.safeguarding, "No safeguarding or Reg 40 alerts are currently open.");
  renderList("opsRegList", data.reg, "No Reg 44 or Reg 45 actions are currently due.");
  renderList("opsEvidenceList", data.evidence, "No SCCIF evidence gaps are currently loaded.");
  renderList("opsVoiceList", data.voice, "No children’s voice or outcome gaps are currently loaded.");
}

function renderList(id, items, emptyText = "Nothing to show.") {
  const el = byId(id);
  if (!el) return;
  const normalised = normaliseItems(items);
  if (!normalised.length) {
    el.innerHTML = `<p class="muted">${escapeHtml(emptyText)}</p>`;
    return;
  }

  el.innerHTML = normalised.map(renderItem).join("");
}

function renderItem(item) {
  const meta = [item.owner ? `Owner: ${item.owner}` : "", item.due ? `Due: ${item.due}` : ""].filter(Boolean).join(" · ");
  const content = `
    <div class="ops-item-main">
      <strong>${escapeHtml(item.title)}</strong>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </div>
    <span class="ops-priority ops-priority-${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span>
  `;

  if (item.href) return `<a class="ops-item" href="${escapeHtml(item.href)}">${content}</a>`;
  return `<div class="ops-item">${content}</div>`;
}

window.IndiCareOperatingDashboard = Object.freeze({ loadDashboard, renderDashboard, dashboardFromRecords });
loadDashboard();
