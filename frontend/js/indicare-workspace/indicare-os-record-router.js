import { apiGet, apiSend } from "../young-people-shell/core/api.js";
import {
  getOsContext,
  scopeContextToSession,
  getOperationalSession,
  findChildForRecord,
  linkedItemsForRecord,
  recordKey,
  recordType,
  childName,
  displayType,
  formatDate,
  escapeHtml,
  statusClass,
} from "./indicare-os-context.js";

const WORKSPACE_RECORD_TYPE_MAP = Object.freeze({
  daily_note: "daily",
  daily: "daily",
  daily_record: "daily",
  incident: "incident",
  incidents: "incident",
  safeguarding_record: "safeguarding",
  safeguarding: "safeguarding",
  missing_episode: "missing",
  missing: "missing",
  keywork: "keywork",
  direct_work: "keywork",
});

const ROUTER_STATE = {
  activeRecord: null,
  activeWorkspaceType: "",
  activeRecordId: "",
};

bootRecordRouter();

function bootRecordRouter() {
  document.addEventListener("indicare:open-record", (event) => {
    if (event.detail) openRecord(event.detail);
  });
  window.addEventListener("indicare:open-record", (event) => {
    if (event.detail) openRecord(event.detail);
  });
  document.addEventListener("click", handleRouterClicks, true);
  window.IndiCareOSRecordRouter = { openRecord, resolveRecord, hydrateRecord };
}

async function handleRouterClicks(event) {
  const routed = event.target.closest?.("[data-open-os-record]");
  if (routed) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const record = resolveRecord({
      id: routed.dataset.recordId,
      type: routed.dataset.recordType,
      title: routed.dataset.recordTitle,
    });
    if (record) await openRecord(record);
    return;
  }

  const action = event.target.closest?.("[data-router-doc-action]");
  if (action) {
    event.preventDefault();
    event.stopImmediatePropagation();
    await runWorkflowAction(action);
  }
}

function resolveRecord({ id = "", type = "", title = "" } = {}) {
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const items = [
    ...context.documents,
    ...context.chronology,
    ...context.safeguarding,
    ...context.tasks,
    ...context.reports,
  ];
  const idString = String(id || "");
  const typeString = String(type || "").toLowerCase();
  const titleString = String(title || "").toLowerCase();
  return items.find((item) => {
    const itemId = recordKey(item);
    const itemType = recordType(item);
    const itemTitle = String(item.title || item.summary || item.name || "").toLowerCase();
    return (idString && itemId === idString) || (idString && String(item.record_id || item.source_id || item.document_id || "") === idString) || (titleString && itemTitle === titleString && (!typeString || itemType === typeString));
  }) || null;
}

async function openRecord(record) {
  const main = document.getElementById("sp-main");
  if (!main || !record) return;
  renderLoading(record);
  const hydrated = await hydrateRecord(record);
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const fullRecord = hydrated.record || record;
  const child = findChildForRecord(fullRecord, context.children) || findChildForRecord(record, context.children);
  const chronology = linkedItemsForRecord(fullRecord, child, context.chronology);
  const safeguarding = linkedItemsForRecord(fullRecord, child, context.safeguarding);
  const workspaceType = toWorkspaceType(fullRecord.record_type || fullRecord.type || record.record_type || record.type);
  const id = recordKey(fullRecord) || recordKey(record);
  const versions = workspaceType && id ? await loadVersions(workspaceType, id) : [];
  ROUTER_STATE.activeRecord = fullRecord;
  ROUTER_STATE.activeWorkspaceType = workspaceType;
  ROUTER_STATE.activeRecordId = id;
  window.IndiCareActiveDocument = buildAssistantDocument(fullRecord, hydrated, child);

  const title = fullRecord.title || fullRecord.summary || fullRecord.name || "IndiCare document";
  const type = fullRecord.record_type || fullRecord.type || record.record_type || record.type || "record";
  const status = fullRecord.status || fullRecord.review_status || "recorded";

  main.innerHTML = `
    <section class="record-view-hero indicare-doc-hero">
      <div>
        <button class="sp-back" type="button" data-sp-view="children">‹ Back</button>
        <span class="record-kicker">IndiCare Docs · ${escapeHtml(hydrated.sourceLabel)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(child ? childName(child) : fullRecord.child_name || fullRecord.young_person_name || "Young person not linked")} · ${escapeHtml(displayType(type))} · ${statusBadge(status)}</p>
      </div>
      <div class="record-view-actions">
        ${workspaceType && id ? `<button class="sp-secondary" data-router-doc-action="submit" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(id)}" type="button">Submit</button><button class="sp-secondary" data-router-doc-action="request_changes" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(id)}" type="button">Request changes</button><button class="sp-primary" data-router-doc-action="approve" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(id)}" type="button">Approve</button>` : `<button class="sp-secondary" disabled type="button">Lifecycle unavailable</button>`}
      </div>
    </section>
    <section class="record-view-grid">
      <article class="record-paper indicare-doc-paper">
        <section class="record-section"><h2>Document content</h2>${recordBody(fullRecord)}</section>
        <section class="record-section"><h2>Document details</h2>${recordDetails(fullRecord)}</section>
        <section class="record-section"><h2>Review, audit and version position</h2>${reviewState(fullRecord)}</section>
      </article>
      <aside class="record-context-panel">
        <section class="sp-card"><h2>Young person context</h2>${child ? childContext(child) : emptyState("This document is not linked to a young person in the current context.")}</section>
        <section class="sp-card"><h2>Linked chronology</h2>${timelineList(chronology, "No linked chronology entries returned.")}</section>
        <section class="sp-card"><h2>Safeguarding context</h2>${miniRows(safeguarding, "No linked safeguarding context returned.")}</section>
        <section class="sp-card"><h2>Version history</h2>${versionHistory(versions)}</section>
        <section class="sp-card"><h2>Source</h2><p>${escapeHtml(hydrated.message)}</p></section>
        <section class="sp-card"><h2>Assistant support</h2><p>Open IndiCare AI to check factual quality, child voice, safeguarding considerations, evidence gaps and manager oversight.</p></section>
      </aside>
    </section>`;
}

function renderLoading(record) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  main.innerHTML = `<section class="record-view-hero"><div><button class="sp-back" type="button" data-sp-view="children">‹ Back</button><span class="record-kicker">IndiCare Docs</span><h1>${escapeHtml(record.title || record.summary || "Opening document")}</h1><p>Routing through the unified IndiCare Docs pipeline...</p></div></section><section class="sp-card"><div class="sp-empty-state"><strong>Opening document</strong><p>Loading linked document, chronology, safeguarding and lifecycle metadata.</p></div></section>`;
}

async function hydrateRecord(record) {
  const workspaceType = toWorkspaceType(record.record_type || record.type);
  const id = recordKey(record);
  if (!workspaceType || !id) {
    return { record, sourceLabel: "live context", message: "Opened from live OS context because no workspace-records type/id mapping was available." };
  }
  try {
    const data = await apiGet(`/workspace-records/${encodeURIComponent(workspaceType)}/${encodeURIComponent(id)}`, { skipCache: true });
    if (data?.ok === false) throw new Error(data?.error || data?.detail || "workspace-records rejected the document load");
    const fullRecord = data.record || data.item || data.data || data;
    return {
      record: { ...record, ...fullRecord, record_type: fullRecord.record_type || record.record_type || workspaceType, type: fullRecord.type || fullRecord.record_type || record.type || workspaceType },
      sourceLabel: "workspace-records",
      message: "Document hydrated through the existing workspace-records lifecycle service.",
    };
  } catch (error) {
    return { record, sourceLabel: "live context fallback", message: `Could not hydrate through workspace-records: ${error?.message || "unknown error"}. Showing live OS context fields instead.` };
  }
}

async function loadVersions(type, id) {
  try {
    const data = await apiGet(`/workspace-records/${encodeURIComponent(type)}/${encodeURIComponent(id)}/versions`, { skipCache: true });
    if (data?.ok === false) return [];
    return arrayFrom(data.versions || data.items || data.data);
  } catch {
    return [];
  }
}

async function runWorkflowAction(button) {
  const action = button.dataset.routerDocAction;
  const type = button.dataset.docType;
  const id = button.dataset.docId;
  const comment = action === "request_changes" ? prompt("What changes are needed?") : "Actioned from IndiCare OS.";
  if (action === "request_changes" && comment === null) return;
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "Working...";
  try {
    const url = action === "submit" ? `/workspace-records/${encodeURIComponent(type)}/${encodeURIComponent(id)}/submit` : `/workspace-records/${encodeURIComponent(type)}/${encodeURIComponent(id)}/review`;
    const body = action === "submit" ? { comment } : { action, comment };
    const response = await apiSend(url, "POST", body, { invalidatePrefixes: ["/workspace-records", "/api/os/context"] });
    if (response?.ok === false) throw new Error(response?.error || response?.detail || "Workflow action failed");
    button.textContent = "Done";
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    if (ROUTER_STATE.activeRecord) await openRecord({ ...ROUTER_STATE.activeRecord, id, record_type: type, type });
  } catch (error) {
    button.disabled = false;
    button.textContent = oldText;
    alert(error?.message || "Unable to complete workflow action.");
  }
}

function buildAssistantDocument(record, source, child) {
  return {
    title: record.title || record.summary || record.name || "IndiCare document",
    type: record.record_type || record.type || "record",
    status: record.status || record.review_status || "recorded",
    child_name: child ? childName(child) : record.child_name || record.young_person_name || "",
    source: source.sourceLabel,
    visible_content: `${recordBodyText(record)}\n\n${JSON.stringify(record.content || record.details || {}, null, 2)}`.slice(0, 10000),
  };
}

function recordBody(record) {
  const text = recordBodyText(record);
  if (text) return `<div class="record-prose">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
  const objectContent = [record.content, record.details, record.detail].find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (objectContent) return `<div class="record-field-list">${Object.entries(objectContent).map(([key, value]) => `<p><span>${escapeHtml(labelise(key))}</span><strong>${escapeHtml(formatValue(value))}</strong></p>`).join("")}</div>`;
  return emptyState("No document body was returned for this item.");
}

function recordBodyText(record) {
  return [record.body, record.content, record.narrative, record.description, record.notes, record.summary].find((item) => typeof item === "string" && item.trim()) || "";
}

function recordDetails(record) {
  const rows = [["Type", record.record_type || record.type], ["Status", record.status || record.review_status], ["Created", formatDate(record.created_at)], ["Updated", formatDate(record.updated_at)], ["Author", record.author_name || record.created_by_name || record.staff_name || record.created_by], ["Home", record.home_name || record.home || record.home_id]];
  return fieldList(rows);
}

function reviewState(record) {
  const rows = [["Review status", record.review_status || record.status], ["Submitted", formatDate(record.submitted_at)], ["Reviewed by", record.reviewed_by_name || record.manager_name || record.approved_by_name], ["Reviewed", formatDate(record.reviewed_at || record.approved_at)], ["Manager comments", record.manager_comments || record.manager_comment || record.review_comments || record.comments]];
  return fieldList(rows);
}

function childContext(child) {
  return fieldList([["Name", childName(child)], ["Home", child.home_name || child.home], ["Status", child.status || child.placement_status], ["Risk", child.risk || child.summary_risk_level || child.risk_level], ["Key worker", child.key_worker || child.keyWorker || child.key_worker_name]]);
}

function fieldList(rows) {
  return `<div class="record-field-list">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not set")}</strong></p>`).join("")}</div>`;
}

function timelineList(items, emptyMessage) {
  if (!items.length) return emptyState(emptyMessage);
  return `<div class="sp-timeline">${items.slice(0, 12).map((item) => `<div class="sp-time-item ${isHighPriorityLike(item) ? "amber" : "blue"}"><time>${escapeHtml(formatDate(item.occurred_at || item.event_datetime || item.created_at || item.updated_at))}</time><span></span><div><strong>${escapeHtml(item.title || item.category || "Chronology entry")}</strong><small>${escapeHtml(item.summary || item.narrative || item.child_name || item.young_person_name || "Recorded activity")}</small></div></div>`).join("")}</div>`;
}

function miniRows(items, emptyMessage) {
  if (!items.length) return emptyState(emptyMessage);
  return `<div class="sp-mini-rows">${items.slice(0, 12).map((item) => `<p><span>${escapeHtml(item.child_name || item.young_person_name || item.type || "Item")}</span><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding record")}</strong><em>${escapeHtml(item.severity || item.status || item.risk_level || "Open")}</em></p>`).join("")}</div>`;
}

function versionHistory(versions) {
  if (!versions.length) return emptyState("No version history was returned for this document.");
  return `<div class="sp-mini-rows">${versions.slice(0, 8).map((version) => `<p><span>${escapeHtml(formatDate(version.created_at || version.updated_at))}</span><strong>${escapeHtml(version.reason || version.action || version.status || "Version")}</strong><em>${escapeHtml(version.created_by || version.user_id || "")}</em></p>`).join("")}</div>`;
}

function statusBadge(value) {
  return `<span class="sp-status ${escapeHtml(statusClass(value))}">${escapeHtml(displayType(value || "recorded"))}</span>`;
}

function toWorkspaceType(type) { return WORKSPACE_RECORD_TYPE_MAP[String(type || "").toLowerCase()] || ""; }
function isHighPriorityLike(item) { return /high|critical|red|significant|safeguarding/i.test(`${item.severity || ""} ${item.risk_level || ""} ${item.category || ""}`); }
function labelise(value) { return String(value || "").replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function formatValue(value) { if (value == null || value === "") return "Not set"; if (Array.isArray(value)) return value.map(formatValue).join(", "); if (typeof value === "object") return JSON.stringify(value); return String(value); }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
