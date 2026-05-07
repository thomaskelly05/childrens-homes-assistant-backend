document.addEventListener("click", handleYoungPeopleRecordsNavigation, true);

function handleYoungPeopleRecordsNavigation(event) {
  const docsNav = event.target.closest?.("[data-sp-view='docs']");
  if (docsNav) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderYoungPeopleRecordsWorkspace();
    return;
  }
  const childRecords = event.target.closest?.("[data-open-child-records]");
  if (childRecords) {
    event.preventDefault();
    renderYoungPeopleRecordsWorkspace(childRecords.dataset.openChildRecords);
    return;
  }
  const openRecord = event.target.closest?.("[data-open-live-record]");
  if (openRecord) {
    event.preventDefault();
    openLiveRecord(openRecord.dataset.recordType, openRecord.dataset.recordId);
    return;
  }
  const back = event.target.closest?.("[data-back-records]");
  if (back) {
    event.preventDefault();
    renderYoungPeopleRecordsWorkspace(back.dataset.backRecords || "");
  }
}

function liveContext() {
  const ctx = window.IndiCareLiveContext || {};
  const session = window.IndiCareOperationalSession || {};
  const selected = new Set((session.selectedChildren || []).map(String));
  const children = Array.isArray(ctx.children) ? ctx.children : [];
  const activeChildren = selected.size ? children.filter((child) => selected.has(String(child.id || child.young_person_id || child.name))) : children;
  const ids = new Set(activeChildren.map((child) => String(child.id || child.young_person_id || child.name)));
  const inSession = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childName || item.child_name || ""));
  return {
    session,
    children: activeChildren,
    documents: (ctx.documents || []).filter(inSession),
    chronology: (ctx.chronology || []).filter(inSession),
    safeguarding: (ctx.safeguarding || []).filter(inSession),
  };
}

function renderYoungPeopleRecordsWorkspace(activeChildId = "") {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const ctx = liveContext();
  const activeChild = resolveChild(ctx.children, activeChildId);
  const records = recordsForChild(ctx.documents, activeChild);
  const chronology = recordsForChild(ctx.chronology, activeChild);
  const safeguarding = recordsForChild(ctx.safeguarding, activeChild);
  main.innerHTML = `
    <section class="yp-records-hero">
      <div>
        <button class="sp-back" data-sp-view="dashboard">Back to dashboard</button>
        <div class="yp-kicker">Young people records</div>
        <h1>${escapeHtml(activeChild ? childName(activeChild) : "Living care records")}</h1>
        <p>${activeChild ? "A child-centred operational record view using live records, chronology and safeguarding context." : "Select a young person to view their live records, chronology and safeguarding context."}</p>
      </div>
      <aside>
        <strong>${escapeHtml(ctx.session?.homeName || "Operational session")}</strong>
        <span>${ctx.children.length} young ${ctx.children.length === 1 ? "person" : "people"} in focus</span>
        <button class="sp-secondary" data-sp-view="dashboard">Change session context</button>
      </aside>
    </section>
    <section class="yp-records-layout">
      <aside class="yp-child-rail">
        <div class="yp-rail-head"><h2>Young people</h2><p>Live database records only.</p></div>
        ${childRail(ctx.children, activeChild)}
      </aside>
      <main class="yp-records-main">
        ${activeChild ? childRecordSurface(activeChild, records, chronology, safeguarding) : noChildSelected(ctx.children)}
      </main>
    </section>
  `;
}

function childRail(children, activeChild) {
  if (!children.length) return `<div class="sp-empty-state"><strong>No young people loaded</strong><p>No young people were returned from the database for this operational session.</p></div>`;
  return `<div class="yp-child-list">${children.map((child) => {
    const id = String(child.id || child.young_person_id || child.name);
    const active = activeChild && String(activeChild.id || activeChild.young_person_id || activeChild.name) === id;
    return `<button class="yp-child-tab ${active ? "active" : ""}" data-open-child-records="${escapeHtml(id)}"><span>${initials(childName(child))}</span><div><strong>${escapeHtml(childName(child))}</strong><small>${escapeHtml(child.placement_status || child.status || "Active placement")}</small></div></button>`;
  }).join("")}</div>`;
}

function noChildSelected(children) {
  if (!children.length) return `<section class="yp-empty-large"><h2>No young people are available for records yet.</h2><p>The records workspace will not show demo children. Assign real young people to this login/home and they will appear here.</p></section>`;
  return `<section class="yp-empty-large"><h2>Choose a young person to open their records.</h2><p>Each workspace brings together live records, chronology and safeguarding context for that child.</p></section>`;
}

function childRecordSurface(child, records, chronology, safeguarding) {
  return `
    <section class="yp-child-summary">
      <div class="yp-avatar-xl">${initials(childName(child))}</div>
      <div><h2>${escapeHtml(childName(child))}</h2><p>${escapeHtml(child.placement_status || child.status || "Active placement")} · ${escapeHtml(child.risk || child.summary_risk_level || "Risk not set")}</p></div>
      <div class="yp-summary-metrics"><span><strong>${records.length}</strong> records</span><span><strong>${chronology.length}</strong> chronology</span><span><strong>${safeguarding.length}</strong> safeguarding</span></div>
    </section>
    <section class="yp-record-actions">
      <button class="sp-primary" data-new-live-record="daily" disabled>New daily record</button>
      <button class="sp-secondary" data-new-live-record="incident" disabled>New incident</button>
      <button class="sp-secondary" data-new-live-record="safeguarding" disabled>Safeguarding concern</button>
      <p>Creation buttons are intentionally disabled until the backend create-record flow is connected to this screen.</p>
    </section>
    <section class="yp-record-grid">
      <article class="yp-record-panel yp-record-panel-main"><div class="yp-panel-head"><div><h2>Live care records</h2><p>Records returned from the database for this young person.</p></div></div>${recordList(records)}</article>
      <aside class="yp-record-side"><article class="yp-record-panel"><div class="yp-panel-head"><div><h2>Safeguarding context</h2><p>Alerts and risk items in scope.</p></div></div>${safeguardingList(safeguarding)}</article><article class="yp-record-panel"><div class="yp-panel-head"><div><h2>Recent chronology</h2><p>Live activity timeline.</p></div></div>${chronologyList(chronology)}</article></aside>
    </section>`;
}

function recordList(records) {
  if (!records.length) return empty("No live records were returned for this young person.");
  return `<div class="yp-record-list">${records.map((record) => {
    const id = record.id || record.record_id || "";
    const type = record.record_type || record.type || "record";
    return `<article class="yp-record-row"><div><strong>${escapeHtml(record.title || record.summary || "Care record")}</strong><p>${escapeHtml(record.summary || record.body || record.notes || "No summary provided")}</p><small>${escapeHtml(type)} · ${escapeHtml(record.status || "recorded")} · ${escapeHtml(formatDate(record.updated_at || record.created_at))}</small></div><button class="sp-open-btn" data-open-live-record="${escapeHtml(id)}" data-record-type="${escapeHtml(type)}" ${id ? "" : "disabled"}>Open</button></article>`;
  }).join("")}</div>`;
}

function safeguardingList(items) {
  if (!items.length) return empty("No safeguarding items returned for this young person.");
  return `<div class="yp-compact-list">${items.slice(0, 8).map((item) => `<section><b>${escapeHtml(item.severity || item.risk_level || item.status || "Open")}</b><strong>${escapeHtml(item.title || item.summary || item.description || "Safeguarding item")}</strong><small>${escapeHtml(formatDate(item.updated_at || item.created_at || item.occurred_at))}</small></section>`).join("")}</div>`;
}

function chronologyList(items) {
  if (!items.length) return empty("No chronology entries returned for this young person.");
  return `<div class="yp-chronology-mini">${items.slice(0, 8).map((item) => `<section><time>${escapeHtml(formatDate(item.occurred_at || item.event_datetime || item.created_at))}</time><div><strong>${escapeHtml(item.title || item.category || "Chronology entry")}</strong><small>${escapeHtml(item.summary || item.narrative || "Recorded activity")}</small></div></section>`).join("")}</div>`;
}

async function openLiveRecord(recordType, recordId) {
  const main = document.getElementById("sp-main");
  if (!main || !recordId) return;
  main.innerHTML = `<section class="yp-record-reader"><button class="sp-back" data-back-records>Back to records</button><div class="sp-empty-state"><strong>Loading record...</strong><p>Retrieving live record from the backend.</p></div></section>`;
  try {
    const response = await fetch(`/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`, { credentials: "include", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Record load failed: ${response.status}`);
    const payload = await response.json();
    renderRecordReader(recordType, payload.record || payload.item || payload);
  } catch (error) {
    main.innerHTML = `<section class="yp-record-reader"><button class="sp-back" data-back-records>Back to records</button><div class="sp-empty-state"><strong>Record could not be opened</strong><p>The record exists in the live list, but the backend detail endpoint did not return it.</p></div></section>`;
  }
}

function renderRecordReader(recordType, record) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const content = typeof record.content === "object" && record.content ? record.content : {};
  main.innerHTML = `<section class="yp-record-reader"><header class="yp-record-reader-head"><div><button class="sp-back" data-back-records>Back to records</button><h1>${escapeHtml(record.title || record.summary || "Care record")}</h1><p>${escapeHtml(recordType)} · ${escapeHtml(record.status || "recorded")} · ${escapeHtml(formatDate(record.updated_at || record.created_at))}</p></div><div class="yp-reader-actions"><button class="sp-secondary" disabled>Request amendment</button><button class="sp-primary" disabled>Submit / approve</button></div></header><section class="yp-reader-grid"><article class="yp-reader-paper">${record.summary ? `<section><h2>Summary</h2><p>${escapeHtml(record.summary)}</p></section>` : ""}${record.body ? `<section><h2>Body</h2><p>${escapeHtml(record.body)}</p></section>` : ""}${record.notes ? `<section><h2>Notes</h2><p>${escapeHtml(record.notes)}</p></section>` : ""}${Object.keys(content).length ? Object.entries(content).map(([key, value]) => `<section><h2>${escapeHtml(label(key))}</h2><p>${escapeHtml(typeof value === "object" ? JSON.stringify(value, null, 2) : value)}</p></section>`).join("") : `<section><h2>Record content</h2><p>No structured content returned for this record.</p></section>`}</article><aside class="yp-reader-context"><article><h2>Review state</h2><p>${escapeHtml(record.status || "recorded")}</p></article><article><h2>Created</h2><p>${escapeHtml(formatDate(record.created_at))}</p></article><article><h2>Updated</h2><p>${escapeHtml(formatDate(record.updated_at))}</p></article><article><h2>Young person ID</h2><p>${escapeHtml(record.young_person_id || "Not linked")}</p></article></aside></section></section>`;
}

function resolveChild(children, id) { if (!children.length) return null; if (!id) return children[0] || null; return children.find((child) => String(child.id || child.young_person_id || child.name) === String(id)) || children[0] || null; }
function recordsForChild(items, child) { if (!child) return []; const ids = new Set([child.id, child.young_person_id, child.name, childName(child)].filter(Boolean).map(String)); return (items || []).filter((item) => ids.has(String(item.young_person_id || item.child_id || item.childName || item.child_name || item.name || ""))); }
function childName(child) { return child.name || child.full_name || child.preferred_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; }
function empty(message) { return `<div class="sp-empty-state"><strong>No live data in this section</strong><p>${escapeHtml(message)}</p></div>`; }
function initials(name) { return String(name || "YP").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YP"; }
function label(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value) { if (!value) return "Not dated"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
