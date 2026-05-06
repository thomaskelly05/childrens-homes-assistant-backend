import {
  childWorkspaceMenu,
  loadCareHubChildren,
  selectedChild,
  selectedChildId,
  setSelectedChildId,
} from "./care-hub-child-context.js";
import { CARE_HUB_NAVIGATION, findCareHubSection } from "./care-hub-navigation.js";
import { listCareHubActions, safeguardingActions, updateCareHubAction } from "./care-hub-actions.js";
import { renderChildWorkspaceSection } from "./child-workspace-renderer.js";
import { dashboardFromRecords } from "./workflow-engine.js";

const EMPTY_DASHBOARD = Object.freeze({
  pending_approvals: 0,
  actions_due: 0,
  safeguarding_alerts: 0,
  inspection_gaps: 0,
  today: [{ title: "No urgent items loaded", body: "Connect /workflow/dashboard or /workflow/records to show overdue records, approvals, actions and safeguarding alerts.", priority: "info" }],
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

function byId(id) { return document.getElementById(id); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" })[char]); }
function activeSectionId() { const hash = window.location.hash.replace("#", ""); return findCareHubSection(hash) ? hash : "today"; }

function ensureCareHubScreenShell() {
  const shell = document.querySelector(".ops-shell");
  if (!shell) return;
  let header = document.querySelector(".ops-header");
  if (!header) {
    header = document.createElement("header");
    header.className = "ops-header";
    shell.prepend(header);
  }
  if (!byId("opsScreenTitle")) {
    header.innerHTML = `<div><p class="ops-eyebrow">IndiCare OS</p><h1 id="opsScreenTitle">Today</h1><p id="opsScreenIntro">How things feel today, what needs attention, and what we are doing next.</p></div>`;
  }
  if (!byId("opsGlobalAlert")) {
    const alert = document.createElement("section");
    alert.id = "opsGlobalAlert";
    alert.className = "ops-global-alert hidden";
    header.after(alert);
  }
  if (!byId("opsDynamicScreen")) {
    const dynamic = document.createElement("section");
    dynamic.id = "opsDynamicScreen";
    dynamic.className = "ops-dynamic-screen";
    byId("opsStatus")?.after(dynamic);
  }
  const requiredIds = ["opsPendingApprovals", "opsActionsDue", "opsSafeguardingAlerts", "opsInspectionGaps", "opsRegList", "opsEvidenceList", "opsVoiceList"];
  if (requiredIds.every((id) => byId(id))) return;
  const wrapper = document.createElement("section");
  wrapper.id = "opsDashboardWidgets";
  wrapper.className = "ops-dashboard-widgets";
  wrapper.innerHTML = `
    <section class="ops-priority-strip" aria-label="Priority overview">
      <article><span>Pending approvals</span><strong id="opsPendingApprovals">-</strong></article>
      <article><span>Actions due</span><strong id="opsActionsDue">-</strong></article>
      <article><span>Safeguarding alerts</span><strong id="opsSafeguardingAlerts">-</strong></article>
      <article><span>Inspection gaps</span><strong id="opsInspectionGaps">-</strong></article>
    </section>
    <section class="ops-grid ops-grid-main">
      <article class="ops-card"><header><h2>Today’s command centre</h2></header><div id="opsTodayList" class="ops-list"></div></article>
      <article class="ops-card"><header><h2>Record lifecycle</h2></header><div id="opsLifecycleList" class="ops-list"></div></article>
    </section>
    <section class="ops-grid ops-grid-three">
      <article class="ops-card"><header><h2>Manager approvals</h2></header><div id="opsApprovalsList" class="ops-list"></div></article>
      <article class="ops-card"><header><h2>Open actions</h2></header><div id="opsActionsList" class="ops-list"></div></article>
      <article class="ops-card"><header><h2>Safeguarding & Reg 40</h2></header><div id="opsSafeguardingList" class="ops-list"></div></article>
    </section>
    <section class="ops-grid ops-grid-three">
      <article class="ops-card"><header><h2>Reg 44 / Reg 45</h2></header><div id="opsRegList" class="ops-list"></div></article>
      <article class="ops-card"><header><h2>SCCIF evidence map</h2></header><div id="opsEvidenceList" class="ops-list"></div></article>
      <article class="ops-card"><header><h2>Children’s voice & outcomes</h2></header><div id="opsVoiceList" class="ops-list"></div></article>
    </section>`;
  shell.appendChild(wrapper);
}

function localOpenActions() { return listCareHubActions().filter((action) => !["completed", "cancelled", "closed"].includes(action.status)); }
function localSafeguardingOpenActions() { return safeguardingActions().filter((action) => !["completed", "cancelled", "closed"].includes(action.status)); }
function actionToDashboardItem(action = {}) {
  return {
    id: action.id,
    title: action.title || "Follow-up action",
    body: [action.child_name, action.section_id, action.body].filter(Boolean).join(" · "),
    priority: action.priority || "medium",
    owner: action.owner || "Manager",
    due: action.due || "",
    status: action.status || "open",
    sourceRecordId: action.id,
    sourceRecordType: "care_hub_action",
  };
}
function mergeLocalActionsIntoDashboard(data) {
  const actions = localOpenActions().map(actionToDashboardItem);
  const safeguarding = localSafeguardingOpenActions().map(actionToDashboardItem);
  return {
    ...data,
    actions: [...actions, ...(data.actions || [])],
    safeguarding: [...safeguarding, ...(data.safeguarding || [])],
    actions_due: Number(data.actions_due || 0) + actions.length,
    safeguarding_alerts: Number(data.safeguarding_alerts || 0) + safeguarding.length,
    today: [...safeguarding.slice(0, 3), ...actions.slice(0, 3), ...(data.today || [])].slice(0, 8),
  };
}
function renderGlobalAlert() {
  const alert = byId("opsGlobalAlert");
  if (!alert) return;
  const safeguarding = localSafeguardingOpenActions();
  if (!safeguarding.length) {
    alert.classList.add("hidden");
    alert.innerHTML = "";
    return;
  }
  alert.classList.remove("hidden");
  alert.innerHTML = `<strong>Safeguarding attention required</strong><span>${safeguarding.length} high-priority action${safeguarding.length === 1 ? "" : "s"} open.</span><a href="#what-were-doing-next">View actions</a>`;
}

function renderActionBoard(screen, section) {
  const actions = localOpenActions();
  const high = actions.filter((a) => a.priority === "high");
  const overdue = actions.filter((a) => a.due && a.due < new Date().toISOString().slice(0, 10));
  byId("opsDashboardWidgets")?.classList.add("hidden");
  screen.innerHTML = `
    <section class="ops-screen-card ops-action-board">
      <header><p class="ops-eyebrow">Care Hub OS</p><h2>${escapeHtml(section.label)}</h2><p>${escapeHtml(section.description || "")}</p></header>
      <div class="ops-alert-strip">
        <article><span>Open</span><strong>${actions.length}</strong></article>
        <article><span>High priority</span><strong>${high.length}</strong></article>
        <article><span>Overdue</span><strong>${overdue.length}</strong></article>
      </div>
      <div class="ops-board-columns">
        ${renderActionColumn("High priority", high)}
        ${renderActionColumn("Due / open", actions.filter((a) => a.priority !== "high"))}
        ${renderActionColumn("Overdue", overdue)}
      </div>
    </section>`;
  bindActionBoardControls();
}
function renderActionColumn(title, actions) {
  return `<section class="ops-board-column"><h3>${escapeHtml(title)}</h3>${actions.length ? actions.map(renderActionCard).join("") : `<p class="muted">Nothing here.</p>`}</section>`;
}
function renderActionCard(action) {
  return `<article class="ops-action-card ops-action-${escapeHtml(action.priority || "normal")}"><strong>${escapeHtml(action.title)}</strong><p>${escapeHtml([action.child_name, action.section_id].filter(Boolean).join(" · ") || action.body || "")}</p><small>Owner: ${escapeHtml(action.owner || "Manager")}${action.due ? ` · Due: ${escapeHtml(action.due)}` : ""}</small><div class="ops-item-controls"><button type="button" class="yp-button yp-button-primary" data-care-action-complete="${escapeHtml(action.id)}">Complete</button><button type="button" class="yp-button" data-care-action-progress="${escapeHtml(action.id)}">In progress</button></div></article>`;
}
function bindActionBoardControls() {
  document.querySelectorAll("[data-care-action-complete]").forEach((button) => button.addEventListener("click", async () => { await updateCareHubAction(button.dataset.careActionComplete, { status: "completed" }); loadDashboard(); }));
  document.querySelectorAll("[data-care-action-progress]").forEach((button) => button.addEventListener("click", async () => { await updateCareHubAction(button.dataset.careActionProgress, { status: "in_progress" }); loadDashboard(); }));
}

function renderChildWorkspaceScreen(screen, section) {
  screen.innerHTML = `<section class="ops-screen-card ops-child-context-card"><header><p class="ops-eyebrow">Children</p><h2>${escapeHtml(section.label)}</h2><p>${escapeHtml(section.description || "")}</p></header><div id="opsChildSelectorMount" class="ops-child-selector-card"><p class="muted">Loading children...</p></div><div id="opsChildSectionMount" class="ops-child-section-mount"></div></section>`;
  loadCareHubChildren().then((children) => {
    const mount = byId("opsChildSelectorMount");
    const sectionMount = byId("opsChildSectionMount");
    if (!mount || !sectionMount) return;
    const chosen = selectedChild(children) || children[0] || null;
    if (chosen && !selectedChildId()) setSelectedChildId(chosen.id);
    if (!children.length) { mount.innerHTML = `<div class="ops-empty-state"><h3>No children loaded yet</h3><p>Add or connect young people records to begin child-centred work.</p><a class="yp-button yp-button-primary" href="/young-people/new">Add New Child</a></div>`; sectionMount.innerHTML = ""; return; }
    const current = chosen || selectedChild(children);
    const selectedSectionId = byId("opsChildWorkspaceTabs")?.dataset?.selectedSection || "about";
    mount.innerHTML = `<label class="ops-field"><span>Choose child</span><select id="opsSelectedChild">${children.map((child) => `<option value="${escapeHtml(child.id)}" ${String(child.id) === String(current?.id) ? "selected" : ""}>${escapeHtml(child.name)}</option>`).join("")}</select></label><div class="ops-child-summary"><h3>${escapeHtml(current?.name || "selected child")}</h3><p>Choose an area below. It opens here inside Care Hub OS.</p></div><div id="opsChildWorkspaceTabs" class="ops-menu-grid ops-child-menu-grid" data-selected-section="${escapeHtml(selectedSectionId)}">${childWorkspaceMenu().map((item) => `<button type="button" class="ops-menu-card ${item.id === selectedSectionId ? "active" : ""}" data-child-section="${escapeHtml(item.id)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml((item.sections || []).slice(0, 4).join(" · "))}</span></button>`).join("")}</div>`;
    function openSection(sectionId = "about") { const tabs = byId("opsChildWorkspaceTabs"); if (tabs) tabs.dataset.selectedSection = sectionId; document.querySelectorAll("[data-child-section]").forEach((button) => button.classList.toggle("active", button.dataset.childSection === sectionId)); renderChildWorkspaceSection({ target: sectionMount, child: selectedChild(children) || current, sectionId }); }
    byId("opsSelectedChild")?.addEventListener("change", (event) => { setSelectedChildId(event.target.value); renderChildWorkspaceScreen(screen, section); });
    document.querySelectorAll("[data-child-section]").forEach((button) => button.addEventListener("click", () => openSection(button.dataset.childSection)));
    openSection(selectedSectionId);
  }).catch((error) => { console.error("[operating-dashboard] child context failed", error); const mount = byId("opsChildSelectorMount"); if (mount) mount.innerHTML = `<p class="muted">Could not load children right now.</p>`; });
}

function renderActiveScreen() {
  const section = findCareHubSection(activeSectionId()) || CARE_HUB_NAVIGATION[0];
  const title = byId("opsScreenTitle");
  const intro = byId("opsScreenIntro");
  const screen = byId("opsDynamicScreen");
  if (title) title.textContent = section.label;
  if (intro) intro.textContent = section.description || "Care Hub OS workspace.";
  if (!screen) return;
  if (section.id === "today") { screen.innerHTML = `<section class="ops-flow-panel"><h2>Today in the Care Hub</h2><p>Start with what needs attention, then move into the child, home, team or quality area that needs action.</p></section>`; byId("opsDashboardWidgets")?.classList.remove("hidden"); return; }
  if (section.id === "what-were-doing-next") return renderActionBoard(screen, section);
  byId("opsDashboardWidgets")?.classList.add("hidden");
  if (section.id === "children") return renderChildWorkspaceScreen(screen, section);
  screen.innerHTML = `<section class="ops-screen-card"><header><p class="ops-eyebrow">Care Hub OS</p><h2>${escapeHtml(section.label)}</h2><p>${escapeHtml(section.description || "")}</p></header><div class="ops-menu-grid">${(section.children || []).map((child) => `<a class="ops-menu-card" href="${escapeHtml(child.href || `#${child.id}`)}"><strong>${escapeHtml(child.label)}</strong>${child.sections?.length ? `<span>${escapeHtml(child.sections.slice(0, 4).join(" · "))}</span>` : ""}</a>`).join("")}</div></section>`;
}

function normaliseItems(items = []) { if (!Array.isArray(items)) return []; return items.map((item) => typeof item === "string" ? { title: item, body: "", priority: "normal" } : { id: item.id || item.sourceRecordId || item.title || item.name || item.label || "", title: item.title || item.name || item.label || "Untitled item", body: item.body || item.summary || item.description || item.detail || "", priority: item.priority || item.status || "normal", owner: item.owner || item.assignee || "", due: item.due || item.due_date || item.deadline || "", href: item.href || item.url || "", status: item.status || "open", sourceRecordId: item.sourceRecordId || item.record_id || "", sourceRecordType: item.sourceRecordType || item.record_type || "" }); }
function mergeDashboard(data = {}) { return mergeLocalActionsIntoDashboard({ ...EMPTY_DASHBOARD, ...data, today: data.today ?? EMPTY_DASHBOARD.today, lifecycle: data.lifecycle ?? EMPTY_DASHBOARD.lifecycle, approvals: data.approvals ?? [], actions: data.actions ?? [], safeguarding: data.safeguarding ?? [], reg: data.reg ?? [], evidence: data.evidence ?? [], voice: data.voice ?? [] }); }
async function fetchJson(path, options = {}) { const response = await fetch(path, { credentials: "include", headers: { Accept: "application/json", ...(options.headers || {}) }, ...options }); if (response.status === 404) return null; if (response.status === 401) { window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); return null; } if (response.status === 403) { window.location.replace(`/access-denied?blocked=${encodeURIComponent(window.location.pathname)}`); return null; } if (!response.ok) throw new Error(`${path} failed with ${response.status}`); return response.headers.get("content-type")?.includes("application/json") ? response.json() : {}; }
async function postWorkflow(path, payload = {}) { return fetchJson(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
async function fetchDashboard() { const dashboard = await fetchJson("/workflow/dashboard"); if (dashboard) return dashboard; const recordsPayload = await fetchJson("/workflow/records"); const records = Array.isArray(recordsPayload) ? recordsPayload : recordsPayload?.records || recordsPayload?.items || []; return records.length ? dashboardFromRecords(records) : EMPTY_DASHBOARD; }
async function loadDashboard() { ensureCareHubScreenShell(); renderGlobalAlert(); renderActiveScreen(); const status = byId("opsStatus"); if (status) status.textContent = "Loading Care Hub OS..."; try { const raw = await fetchDashboard(); renderDashboard(mergeDashboard(raw)); if (status) status.textContent = raw === EMPTY_DASHBOARD ? "Care Hub OS ready for workflow data." : "Care Hub OS loaded."; } catch (error) { console.error("[operating-dashboard] load failed", error); renderDashboard(mergeDashboard(EMPTY_DASHBOARD)); if (status) status.textContent = "Care Hub OS loaded with empty fallback data."; } }
function renderDashboard(data) { currentDashboard = data; ensureCareHubScreenShell(); renderGlobalAlert(); byId("opsPendingApprovals").textContent = data.pending_approvals ?? 0; byId("opsActionsDue").textContent = data.actions_due ?? 0; byId("opsSafeguardingAlerts").textContent = data.safeguarding_alerts ?? 0; byId("opsInspectionGaps").textContent = data.inspection_gaps ?? 0; renderList("opsTodayList", data.today, "Nothing urgent to show.", "today"); renderList("opsLifecycleList", data.lifecycle, "No lifecycle items loaded.", "lifecycle"); renderList("opsApprovalsList", data.approvals, "No records are waiting for manager approval.", "approval"); renderList("opsActionsList", data.actions, "No open actions are currently due.", "action"); renderList("opsSafeguardingList", data.safeguarding, "No safeguarding or Reg 40 alerts are currently open.", "action"); renderList("opsRegList", data.reg, "No Reg 44 or Reg 45 actions are currently due.", "action"); renderList("opsEvidenceList", data.evidence, "No SCCIF evidence gaps are currently loaded.", "evidence"); renderList("opsVoiceList", data.voice, "No children’s voice or outcome gaps are currently loaded.", "action"); bindWorkflowControls(); }
function renderList(id, items, emptyText = "Nothing to show.", mode = "item") { const el = byId(id); if (!el) return; const normalised = normaliseItems(items); el.innerHTML = normalised.length ? normalised.map((item) => renderItem(item, mode)).join("") : `<p class="muted">${escapeHtml(emptyText)}</p>`; }
function renderWorkflowControls(item, mode) { if (mode === "approval") return `<div class="ops-item-controls"><button type="button" class="yp-button yp-button-primary" data-workflow-action="approve" data-item-id="${escapeHtml(item.id)}">Approve</button><button type="button" class="yp-button" data-workflow-action="request_changes" data-item-id="${escapeHtml(item.id)}">Request changes</button></div>`; if (mode === "action") return `<div class="ops-item-controls"><button type="button" class="yp-button yp-button-primary" data-workflow-action="complete_action" data-item-id="${escapeHtml(item.id)}">Complete</button><button type="button" class="yp-button" data-workflow-action="start_action" data-item-id="${escapeHtml(item.id)}">In progress</button></div>`; return ""; }
function renderItem(item, mode = "item") { const meta = [item.owner ? `Owner: ${item.owner}` : "", item.due ? `Due: ${item.due}` : ""].filter(Boolean).join(" · "); const content = `<div class="ops-item-main"><strong>${escapeHtml(item.title)}</strong>${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</div><span class="ops-priority ops-priority-${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span>`; const controls = renderWorkflowControls(item, mode); return item.href && !controls ? `<a class="ops-item" href="${escapeHtml(item.href)}">${content}</a>` : `<div class="ops-item" data-mode="${escapeHtml(mode)}" data-item-id="${escapeHtml(item.id)}">${content}${controls}</div>`; }
function findWorkflowItem(id) { for (const section of ["approvals", "actions", "safeguarding", "reg", "voice"]) { const found = normaliseItems(currentDashboard[section]).find((item) => String(item.id) === String(id)); if (found) return found; } return null; }
async function handleWorkflowAction(action, itemId) { const status = byId("opsStatus"); const item = findWorkflowItem(itemId); if (!item) return; if (status) status.textContent = "Updating workflow..."; try { await postWorkflow(`/workflow/${action}`, { item_id: itemId, item }); await loadDashboard(); } catch (error) { console.warn("[operating-dashboard] workflow action fallback", error); if (action === "complete_action") await updateCareHubAction(itemId, { status: "completed" }); if (action === "start_action") await updateCareHubAction(itemId, { status: "in_progress" }); applyLocalWorkflowUpdate(action, itemId); if (status) status.textContent = "Updated locally. Backend workflow endpoint not yet available."; } }
function applyLocalWorkflowUpdate(action, itemId) { const removeFrom = (items = []) => normaliseItems(items).filter((item) => String(item.id) !== String(itemId)); const updateStatus = (items = [], status) => normaliseItems(items).map((item) => String(item.id) === String(itemId) ? { ...item, status, priority: status } : item); if (["approve", "request_changes"].includes(action)) currentDashboard = { ...currentDashboard, approvals: removeFrom(currentDashboard.approvals), pending_approvals: Math.max(0, Number(currentDashboard.pending_approvals || 0) - 1) }; if (action === "complete_action") currentDashboard = { ...currentDashboard, actions: removeFrom(currentDashboard.actions), safeguarding: removeFrom(currentDashboard.safeguarding), reg: removeFrom(currentDashboard.reg), voice: removeFrom(currentDashboard.voice), actions_due: Math.max(0, Number(currentDashboard.actions_due || 0) - 1) }; if (action === "start_action") currentDashboard = { ...currentDashboard, actions: updateStatus(currentDashboard.actions, "in_progress"), safeguarding: updateStatus(currentDashboard.safeguarding, "in_progress"), reg: updateStatus(currentDashboard.reg, "in_progress"), voice: updateStatus(currentDashboard.voice, "in_progress") }; renderDashboard(currentDashboard); }
function bindWorkflowControls() { document.querySelectorAll("[data-workflow-action]").forEach((button) => button.addEventListener("click", () => handleWorkflowAction(button.dataset.workflowAction, button.dataset.itemId))); }

window.addEventListener("hashchange", renderActiveScreen);
window.addEventListener("indicare:refresh-dashboard", () => loadDashboard());
window.addEventListener("indicare:care-hub-action-created", () => loadDashboard());
window.addEventListener("indicare:care-hub-action-updated", () => loadDashboard());
window.IndiCareOperatingDashboard = Object.freeze({ loadDashboard, renderDashboard, dashboardFromRecords, renderActiveScreen });
loadDashboard();
