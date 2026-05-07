const RECORD_VIEWER_STATE = {
  lastDocuments: [],
  lastRenderedAt: 0,
  activeDocument: null,
};

const WORKSPACE_RECORD_TYPE_MAP = Object.freeze({
  daily_note: "daily",
  daily: "daily",
  incident: "incident",
  safeguarding_record: "safeguarding",
  safeguarding: "safeguarding",
  missing_episode: "missing",
  missing: "missing",
});

bootRecordViewer();

function bootRecordViewer() {
  document.addEventListener("click", handleRecordOpen, true);
  document.addEventListener("click", handleDocumentWorkflow, true);
  const observer = new MutationObserver(() => enhanceRecordTables());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceRecordTables();
}

async function handleRecordOpen(event) {
  const button = event.target.closest?.("[data-open-live-record]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const index = Number(button.dataset.openLiveRecord);
  const record = RECORD_VIEWER_STATE.lastDocuments[index];
  if (!record) return;
  await renderLiveRecord(record);
}

async function handleDocumentWorkflow(event) {
  const button = event.target.closest?.("[data-doc-action]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const action = button.dataset.docAction;
  const recordType = button.dataset.docType;
  const recordId = button.dataset.docId;
  if (!recordType || !recordId) return;
  await runDocumentWorkflowAction({ action, recordType, recordId, button });
}

function enhanceRecordTables() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const tables = [...main.querySelectorAll("table.sp-table")];
  if (!tables.length) return;
  const documents = currentDocumentsForVisiblePage();
  RECORD_VIEWER_STATE.lastDocuments = documents;
  RECORD_VIEWER_STATE.lastRenderedAt = Date.now();
  let globalIndex = 0;
  for (const table of tables) {
    const rows = [...table.querySelectorAll("tbody tr")];
    for (const row of rows) {
      const existing = row.querySelector("[data-open-live-record]");
      if (existing) {
        globalIndex += 1;
        continue;
      }
      const actionCell = row.querySelector("td:last-child");
      const record = documents[globalIndex];
      if (!actionCell || !record) {
        globalIndex += 1;
        continue;
      }
      actionCell.innerHTML = `<button class="sp-open-btn" data-open-live-record="${globalIndex}" type="button">Open</button>`;
      globalIndex += 1;
    }
  }
}

function currentDocumentsForVisiblePage() {
  const context = normalisedContext();
  const sessionChildren = selectedChildren(context.children);
  const profileName = activeProfileName();
  if (profileName) {
    const child = context.children.find((item) => childName(item).toLowerCase() === profileName.toLowerCase());
    if (child) return scopeDocuments([child], context.documents);
  }
  return scopeDocuments(sessionChildren, context.documents);
}

async function renderLiveRecord(record) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  renderRecordLoading(record);
  const hydrated = await hydrateIndiCareDocument(record);
  const documentRecord = hydrated.record || record;
  const context = normalisedContext();
  const child = findRecordChild(documentRecord, context.children) || findRecordChild(record, context.children);
  const relatedChronology = scopeItemsForRecordOrChild(documentRecord, child, context.chronology);
  const relatedSafeguarding = scopeItemsForRecordOrChild(documentRecord, child, context.safeguarding);
  const title = documentRecord.title || documentRecord.summary || documentRecord.name || "Care record";
  const type = documentRecord.type || documentRecord.record_type || record.type || record.record_type || "Record";
  const status = documentRecord.status || "recorded";
  const workspaceType = toWorkspaceRecordType(type);
  const recordId = recordKey(documentRecord) || recordKey(record);
  const versions = workspaceType && recordId ? await loadDocumentVersions(workspaceType, recordId) : [];
  RECORD_VIEWER_STATE.activeDocument = { record: documentRecord, source: hydrated, workspaceType, recordId };

  main.innerHTML = `
    <section class="record-view-hero indicare-doc-hero">
      <div>
        <button class="sp-back" type="button" data-sp-view="${child ? "children" : "docs"}">‹ Back</button>
        <span class="record-kicker">IndiCare Docs · ${escapeHtml(hydrated.sourceLabel)}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(child ? childName(child) : documentRecord.child_name || documentRecord.young_person_name || "Young person not linked")} · ${escapeHtml(displayType(type))} · ${statusBadge(status)}</p>
      </div>
      <div class="record-view-actions">
        ${workspaceType && recordId ? `<button class="sp-secondary" type="button" data-doc-action="submit" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(recordId)}">Submit</button><button class="sp-secondary" type="button" data-doc-action="request_changes" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(recordId)}">Request changes</button><button class="sp-primary" type="button" data-doc-action="approve" data-doc-type="${escapeHtml(workspaceType)}" data-doc-id="${escapeHtml(recordId)}">Approve</button>` : `<button class="sp-secondary" type="button" disabled>Lifecycle unavailable</button>`}
      </div>
    </section>
    <section class="record-view-grid">
      <article class="record-paper indicare-doc-paper">
        <section class="record-section"><h2>Document content</h2>${recordBody(documentRecord)}</section>
        <section class="record-section"><h2>IndiCare document fields</h2>${recordDetails(documentRecord)}</section>
        <section class="record-section"><h2>Review, audit and version position</h2>${reviewState(documentRecord)}</section>
      </article>
      <aside class="record-context-panel">
        <section class="sp-card"><h2>Young person context</h2>${child ? childContext(child) : emptyState("This document is not linked to a young person in the current live context.")}</section>
        <section class="sp-card"><h2>Linked chronology</h2>${chronologyList(relatedChronology)}</section>
        <section class="sp-card"><h2>Safeguarding context</h2>${safeguardingList(relatedSafeguarding)}</section>
        <section class="sp-card"><h2>Version history</h2>${versionHistory(versions)}</section>
        <section class="sp-card"><h2>Source</h2><p>${escapeHtml(hydrated.message)}</p></section>
        <section class="sp-card"><h2>Assistant support</h2><p>Use IndiCare AI for drafting support, quality checks or summaries. The assistant must use live context only and clearly state where data is missing.</p></section>
      </aside>
    </section>`;
}

function renderRecordLoading(record) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  main.innerHTML = `<section class="record-view-hero"><div><button class="sp-back" type="button" data-sp-view="docs">‹ Back</button><span class="record-kicker">IndiCare Docs</span><h1>${escapeHtml(record.title || record.summary || "Opening document")}</h1><p>Loading full document from existing IndiCare document/lifecycle services...</p></div></section><section class="sp-card"><div class="sp-empty-state"><strong>Loading document</strong><p>Opening from live OS context, then trying /workspace-records for full content where available.</p></div></section>`;
}

async function hydrateIndiCareDocument(record) {
  const type = toWorkspaceRecordType(record.record_type || record.type);
  const id = recordKey(record);
  if (!type || !id) {
    return { record, sourceLabel: "live context", message: "This document opened from the live OS context because no workspace-records type/id mapping was available." };
  }
  try {
    const response = await fetch(`/workspace-records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { credentials: "include", headers: { Accept: "application/json" } });
    const data = await safeJson(response);
    if (!response.ok || data?.ok === false) throw new Error(data?.error || data?.detail || `workspace-records failed (${response.status})`);
    const fullRecord = data.record || data.item || data.data || data;
    return { record: { ...record, ...fullRecord, record_type: fullRecord.record_type || record.record_type || type, type: fullRecord.type || fullRecord.record_type || record.type || type }, sourceLabel: "workspace-records", message: "This document was hydrated through the existing workspace-records lifecycle service." };
  } catch (error) {
    return { record, sourceLabel: "live context fallback", message: `Could not hydrate from workspace-records: ${error?.message || "unknown error"}. Showing the document fields returned by /api/os/context.` };
  }
}

async function loadDocumentVersions(recordType, recordId) {
  try {
    const response = await fetch(`/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}/versions`, { credentials: "include", headers: { Accept: "application/json" } });
    const data = await safeJson(response);
    if (!response.ok || data?.ok === false) return [];
    return arrayFrom(data.versions || data.items || data.data);
  } catch {
    return [];
  }
}

async function runDocumentWorkflowAction({ action, recordType, recordId, button }) {
  const oldText = button.textContent;
  const comment = action === "request_changes" ? prompt("What changes are needed?") : "Actioned from IndiCare OS document view.";
  if (action === "request_changes" && comment === null) return;
  button.disabled = true;
  button.textContent = "Working...";
  const url = action === "submit" ? `/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}/submit` : `/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}/review`;
  const body = action === "submit" ? { comment } : { action, comment };
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...csrfHeaders("POST") },
      body: JSON.stringify(body),
    });
    const data = await safeJson(response);
    if (!response.ok || data?.ok === false) throw new Error(data?.error || data?.detail || `Workflow action failed (${response.status})`);
    button.textContent = "Done";
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    if (RECORD_VIEWER_STATE.activeDocument?.record) {
      await renderLiveRecord({ ...RECORD_VIEWER_STATE.activeDocument.record, id: recordId, record_type: recordType, type: recordType });
    }
  } catch (error) {
    button.disabled = false;
    button.textContent = oldText;
    alert(error?.message || "Unable to complete workflow action.");
  }
}

function recordBody(record) {
  const candidates = [record.body, record.content, record.narrative, record.description, record.notes, record.detail, record.details, record.summary];
  const value = candidates.find((item) => typeof item === "string" && item.trim());
  if (value) return `<div class="record-prose">${escapeHtml(value).replace(/\n/g, "<br>")}</div>`;
  const objectContent = candidates.find((item) => item && typeof item === "object" && !Array.isArray(item));
  if (objectContent) {
    return `<div class="record-field-list">${Object.entries(objectContent).map(([key, value]) => `<p><span>${escapeHtml(labelise(key))}</span><strong>${escapeHtml(formatValue(value))}</strong></p>`).join("")}</div>`;
  }
  return emptyState("No document body was returned by the backend for this item.");
}

function recordDetails(record) {
  const rows = [
    ["Type", record.type || record.record_type || record.category],
    ["Status", record.status],
    ["Created", formatDate(record.created_at || record.createdAt)],
    ["Updated", formatDate(record.updated_at || record.updatedAt)],
    ["Author", record.author_name || record.created_by_name || record.staff_name || record.created_by],
    ["Home", record.home_name || record.home || record.home_id],
  ];
  return `<div class="record-field-list">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not set")}</strong></p>`).join("")}</div>`;
}

function reviewState(record) {
  const rows = [
    ["Review status", record.review_status || record.status],
    ["Submitted", formatDate(record.submitted_at || record.submittedAt)],
    ["Reviewed by", record.reviewed_by_name || record.manager_name || record.approved_by_name || record.reviewed_by],
    ["Reviewed", formatDate(record.reviewed_at || record.approved_at || record.approvedAt)],
    ["Manager comments", record.manager_comments || record.manager_comment || record.review_comments || record.comments],
  ];
  return `<div class="record-field-list">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not set")}</strong></p>`).join("")}</div>`;
}

function versionHistory(versions) {
  if (!versions.length) return emptyState("No version history was returned for this document.");
  return `<div class="sp-mini-rows">${versions.slice(0, 8).map((version) => `<p><span>${escapeHtml(formatDate(version.created_at || version.updated_at))}</span><strong>${escapeHtml(version.reason || version.action || version.status || "Version")}</strong><em>${escapeHtml(version.created_by || version.user_id || "")}</em></p>`).join("")}</div>`;
}

function childContext(child) {
  const rows = [
    ["Name", childName(child)],
    ["Home", child.home_name || child.home],
    ["Status", child.status || child.placement_status],
    ["Risk", child.risk || child.summary_risk_level || child.risk_level],
    ["Key worker", child.key_worker || child.keyWorker || child.key_worker_name],
  ];
  return `<div class="record-field-list compact">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Not set")}</strong></p>`).join("")}</div>`;
}

function normalisedContext() {
  const raw = window.IndiCareLiveContext || {};
  return {
    children: arrayFrom(raw.children || raw.items || raw.young_people || raw.youngPeople),
    documents: arrayFrom(raw.documents || raw.records || raw.recordings),
    chronology: arrayFrom(raw.chronology || raw.timeline || raw.events),
    safeguarding: arrayFrom(raw.safeguarding || raw.alerts || raw.risks || raw.concerns),
  };
}

function selectedChildren(children) {
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  if (!selected.size) return children;
  return children.filter((child) => selected.has(childKey(child)));
}

function scopeDocuments(children, documents) {
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => childName(child).toLowerCase()));
  return documents.filter((doc) => !ids.size || ids.has(String(doc.young_person_id || doc.child_id || doc.childId || doc.youngPersonId || doc.child || "")) || names.has(String(doc.childName || doc.child_name || doc.young_person_name || "").toLowerCase()));
}

function scopeItemsForRecordOrChild(record, child, items) {
  const recordId = recordKey(record);
  const childId = child ? childKey(child) : "";
  const name = child ? childName(child).toLowerCase() : String(record.child_name || record.young_person_name || "").toLowerCase();
  return items.filter((item) => {
    const itemRecord = String(item.record_id || item.source_record_id || item.document_id || item.doc_id || "");
    const itemChild = String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || "");
    const itemName = String(item.childName || item.child_name || item.young_person_name || item.name || "").toLowerCase();
    return (recordId && itemRecord === recordId) || (childId && itemChild === childId) || (name && itemName === name);
  });
}

function findRecordChild(record, children) {
  const childId = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || "");
  const name = String(record.childName || record.child_name || record.young_person_name || "").toLowerCase();
  return children.find((child) => childKey(child) === childId || childName(child).toLowerCase() === name) || null;
}

function activeProfileName() {
  const marker = document.querySelector(".yp-profile-identity h1");
  return marker?.textContent?.trim() || "";
}

function chronologyList(entries) {
  if (!entries.length) return emptyState("No chronology entries returned from the database for this document context.");
  return `<div class="sp-timeline">${entries.slice(0, 12).map((entry) => `<div class="sp-time-item ${/high|significant|safeguarding/i.test(String(entry.severity || entry.significance || entry.category || "")) ? "amber" : "blue"}"><time>${escapeHtml(formatDate(entry.occurred_at || entry.event_datetime || entry.created_at || entry.createdAt))}</time><span></span><div><strong>${escapeHtml(entry.title || entry.category || "Chronology entry")}</strong><small>${escapeHtml(entry.summary || entry.narrative || entry.child_name || entry.young_person_name || "Recorded activity")}</small></div></div>`).join("")}</div>`;
}

function safeguardingList(items) {
  if (!items.length) return emptyState("No safeguarding items returned from the database for this document context.");
  return `<div class="sp-mini-rows">${items.slice(0, 12).map((item) => `<p><span>${escapeHtml(item.child_name || item.young_person_name || item.young_person_id || item.type || "Item")}</span><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding record")}</strong><em>${escapeHtml(item.severity || item.status || item.risk_level || "Open")}</em></p>`).join("")}</div>`;
}

function toWorkspaceRecordType(type) {
  return WORKSPACE_RECORD_TYPE_MAP[String(type || "").toLowerCase()] || "";
}
function displayType(type) { return String(type || "record").replaceAll("_", " ").replaceAll("-", " "); }
function statusBadge(value) { const key = String(value || "").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-"); return `<span class="sp-status ${escapeHtml(key)}">${escapeHtml(titleCase(displayType(value || "Recorded")))}</span>`; }
function recordKey(record) { return String(record.id || record.record_id || record.document_id || record.uuid || ""); }
function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function labelise(value) { return String(value || "").replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function titleCase(value) { return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase()); }
function formatDate(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function formatValue(value) { if (value == null || value === "") return "Not set"; if (Array.isArray(value)) return value.map(formatValue).join(", "); if (typeof value === "object") return JSON.stringify(value); return String(value); }
async function safeJson(response) { try { return await response.json(); } catch { return null; } }
function csrfHeaders(method) { const headers = {}; if (!["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) return headers; const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/); if (match) headers["X-CSRF-Token"] = decodeURIComponent(match[1]); return headers; }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
