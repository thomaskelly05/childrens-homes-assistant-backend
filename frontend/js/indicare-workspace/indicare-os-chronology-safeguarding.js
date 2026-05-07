const CHRONOLOGY_STATE = {
  timelineRows: [],
  safeguardingRows: [],
  renderedSignature: "",
};

const SAFEGUARDING_TYPES = new Set([
  "safeguarding",
  "safeguarding_record",
  "missing",
  "missing_episode",
  "incident",
  "risk",
]);

bootChronologySafeguardingIntegration();

function bootChronologySafeguardingIntegration() {
  document.addEventListener("click", handleChronologyClicks, true);
  const observer = new MutationObserver(() => enhanceChronologyAndSafeguardingViews());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceChronologyAndSafeguardingViews();
}

function enhanceChronologyAndSafeguardingViews() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const title = main.querySelector(".sp-page-head h1")?.textContent?.trim();
  if (!["Chronology", "Safeguarding"].includes(title)) return;
  const signature = `${title}:${main.innerHTML.slice(0, 500)}`;
  if (CHRONOLOGY_STATE.renderedSignature === signature) return;
  CHRONOLOGY_STATE.renderedSignature = signature;
  if (title === "Chronology") renderOsChronology(main);
  if (title === "Safeguarding") renderOsSafeguarding(main);
}

function renderOsChronology(main) {
  const context = scopedContext();
  const timelineRows = buildTimelineRows(context);
  CHRONOLOGY_STATE.timelineRows = timelineRows;
  const patterns = patternCounts(timelineRows);
  const buckets = categoryBuckets(timelineRows);
  main.innerHTML = `
    <section class="sp-page-head"><div><h1>Chronology</h1><p>One live timeline across selected young people, records, incidents, safeguarding, missing episodes and linked care events.</p></div><div><button class="sp-secondary" data-refresh-live>Refresh</button><button class="sp-primary" data-open-ai-chronology>AI summary</button></div></section>
    <section class="yp-overview-strip">
      ${metric("Timeline items", timelineRows.length, "Normalised live records")}
      ${metric("Safeguarding-linked", patterns.safeguarding, "Safeguarding, missing, incident or risk", patterns.safeguarding ? "amber" : "green")}
      ${metric("High priority", patterns.highRisk, "High, critical or escalated", patterns.highRisk ? "amber" : "green")}
      ${metric("Child voice", patterns.childVoice, "Records with child voice")}
    </section>
    <section class="chronology-os-layout">
      <section class="chronology-os-main">
        <section class="sp-card"><div class="sp-card-head"><h2>Full chronology</h2><span>${timelineRows.length}</span></div>${timelineList(timelineRows)}</section>
      </section>
      <aside class="chronology-os-side">
        <section class="sp-card"><h2>Important recent events</h2>${timelineMiniList(buildImportantRows(timelineRows).slice(0, 8), "No high-priority events returned.")}</section>
        <section class="sp-card"><h2>Safeguarding and incidents</h2>${timelineMiniList(buckets.safeguarding.slice(0, 8), "No safeguarding or incident-linked items returned.")}</section>
        <section class="sp-card"><h2>Health</h2>${timelineMiniList(buckets.health.slice(0, 6), "No health events returned.")}</section>
        <section class="sp-card"><h2>Education and family</h2>${timelineMiniList([...buckets.education, ...buckets.family].slice(0, 6), "No education or family events returned.")}</section>
      </aside>
    </section>`;
}

function renderOsSafeguarding(main) {
  const context = scopedContext();
  const rows = buildTimelineRows(context).filter(isSafeguardingRow);
  const directSafeguarding = arrayFrom(context.safeguarding).map((item) => normaliseRow(item, "safeguarding_record"));
  const merged = dedupeRows([...rows, ...directSafeguarding]).sort(newestFirst);
  CHRONOLOGY_STATE.safeguardingRows = merged;
  const active = merged.filter((item) => !/[closed|resolved|approved|complete]/i.test(String(item.status || ""))).length;
  const high = merged.filter(isHighPriority).length;
  const missing = merged.filter((item) => /missing/i.test(rowType(item))).length;
  main.innerHTML = `
    <section class="sp-page-head"><div><h1>Safeguarding</h1><p>Live safeguarding case-management view across concerns, incidents, missing episodes, risks and linked records.</p></div><div><button class="sp-secondary" data-refresh-live>Refresh</button><button class="sp-primary" data-open-ai-safeguarding>AI safeguarding review</button></div></section>
    <section class="yp-overview-strip">
      ${metric("Safeguarding items", merged.length, "Live linked items", merged.length ? "amber" : "green")}
      ${metric("Active/open", active, "Not closed or complete", active ? "amber" : "green")}
      ${metric("High priority", high, "High, critical or escalated", high ? "amber" : "green")}
      ${metric("Missing episodes", missing, "Missing-linked items", missing ? "amber" : "green")}
    </section>
    <section class="safeguarding-os-layout">
      <section class="safeguarding-os-main">
        <section class="sp-card"><div class="sp-card-head"><h2>Active safeguarding context</h2><span>${merged.length}</span></div>${safeguardingCaseList(merged)}</section>
      </section>
      <aside class="safeguarding-os-side">
        <section class="sp-card"><h2>Manager oversight</h2>${managerOversight(merged)}</section>
        <section class="sp-card"><h2>Escalation prompts</h2>${escalationPrompts(merged)}</section>
        <section class="sp-card"><h2>Linked chronology</h2>${timelineMiniList(merged.slice(0, 8), "No safeguarding chronology returned.")}</section>
      </aside>
    </section>`;
}

function handleChronologyClicks(event) {
  const row = event.target.closest?.("[data-open-chrono-row]");
  if (row) {
    event.preventDefault();
    const item = CHRONOLOGY_STATE.timelineRows[Number(row.dataset.openChronoRow)] || CHRONOLOGY_STATE.safeguardingRows[Number(row.dataset.openChronoRow)];
    if (item) openTimelineRecord(item);
    return;
  }
  if (event.target.closest?.("[data-open-ai-chronology]")) {
    event.preventDefault();
    openAssistantWithPrompt("Summarise the chronology currently visible in the OS. Identify themes, safeguarding links, missing evidence, and recommended manager actions.");
    return;
  }
  if (event.target.closest?.("[data-open-ai-safeguarding]")) {
    event.preventDefault();
    openAssistantWithPrompt("Review the safeguarding context currently visible in the OS. Separate immediate safety issues, recording gaps, chronology links, and manager oversight actions.");
  }
}

function openTimelineRecord(item) {
  const documents = normalisedContext().documents;
  const id = rowId(item);
  const type = rowType(item);
  const match = documents.find((doc) => rowId(doc) === id || (rowId(doc) && rowId(doc) === String(item.source_id || item.record_id || "")) || (rowType(doc) === type && (doc.title || doc.summary) === item.title));
  if (!match) return;
  window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: match }));
  const openButton = [...document.querySelectorAll("[data-open-live-record]")].find((button) => button.textContent.trim().toLowerCase() === "open");
  if (openButton) openButton.click();
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

function buildTimelineRows(context) {
  return dedupeRows([
    ...arrayFrom(context.chronology).map((item) => normaliseRow(item, "chronology_event")),
    ...arrayFrom(context.documents).map((item) => normaliseRow(item, item.record_type || item.type || "record")),
    ...arrayFrom(context.safeguarding).map((item) => normaliseRow(item, "safeguarding_record")),
  ]).sort(newestFirst);
}

function normaliseRow(item = {}, fallbackType = "record") {
  const type = item.type || item.record_type || item.category || fallbackType;
  const title = item.title || item.label || item.summary || item.name || displayType(type);
  const summary = item.summary || item.narrative || item.description || item.notes || item.detail || "No additional summary recorded.";
  return {
    ...item,
    id: rowId(item),
    type,
    record_type: item.record_type || type,
    title,
    summary,
    date: item.date || item.occurred_at || item.event_datetime || item.updated_at || item.created_at || item.createdAt || item.updatedAt,
    child_name: item.child_name || item.young_person_name || item.childName || item.name || "",
    status: item.status || item.review_status || item.workflow_status || "recorded",
    severity: item.severity || item.risk_level || item.significance || "",
  };
}

function patternCounts(rows) {
  return {
    safeguarding: rows.filter(isSafeguardingRow).length,
    highRisk: rows.filter(isHighPriority).length,
    childVoice: rows.filter((item) => Boolean(item.child_voice || item.young_person_voice || item.voice_of_child || item.child_voice_present || item.raw?.child_voice)).length,
  };
}

function categoryBuckets(rows) {
  return {
    safeguarding: rows.filter(isSafeguardingRow),
    health: rows.filter((item) => /health|medication|appointment|medical/i.test(rowType(item))),
    education: rows.filter((item) => /education|school|learning/i.test(rowType(item))),
    family: rows.filter((item) => /family|contact|parent|relative/i.test(rowType(item))),
  };
}

function buildImportantRows(rows) {
  return rows.filter((item) => isHighPriority(item) || isSafeguardingRow(item));
}

function isSafeguardingRow(item) {
  return SAFEGUARDING_TYPES.has(rowType(item)) || /safeguarding|missing|risk|incident|escalat|concern/i.test(`${rowType(item)} ${item.title || ""} ${item.summary || ""}`);
}

function isHighPriority(item) {
  return /high|critical|red|significant/i.test(String(item.severity || "")) || /overdue|escalated|returned|rejected|open/i.test(String(item.status || ""));
}

function timelineList(rows) {
  if (!rows.length) return emptyState("No chronology or linked records returned from the database for this context.");
  return `<div class="sp-timeline chronology-live-list">${rows.map((item, index) => timelineItem(item, index)).join("")}</div>`;
}

function timelineMiniList(rows, emptyMessage) {
  if (!rows.length) return emptyState(emptyMessage);
  return `<div class="sp-mini-rows">${rows.map((item, index) => `<p data-open-chrono-row="${index}" role="button" tabindex="0"><span>${escapeHtml(formatDate(item.date))}</span><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(displayType(rowType(item)))}</em></p>`).join("")}</div>`;
}

function timelineItem(item, index) {
  const tone = isHighPriority(item) ? "amber" : "blue";
  return `<div class="sp-time-item ${tone}" data-open-chrono-row="${index}" role="button" tabindex="0"><time>${escapeHtml(formatDate(item.date))}</time><span></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.child_name ? `${item.child_name} · ${item.summary}` : item.summary)}</small><em class="sp-status ${statusClass(item.status)}">${escapeHtml(displayType(item.status || "recorded"))}</em></div></div>`;
}

function safeguardingCaseList(rows) {
  if (!rows.length) return emptyState("No safeguarding items returned from the database for this context.");
  return `<div class="safeguarding-case-list">${rows.map((item, index) => `<article class="safeguarding-case-card" data-open-chrono-row="${index}" role="button" tabindex="0"><div><span>${escapeHtml(displayType(rowType(item)))}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p></div><dl><div><dt>Young person</dt><dd>${escapeHtml(item.child_name || "Not linked")}</dd></div><div><dt>Status</dt><dd>${escapeHtml(displayType(item.status || "recorded"))}</dd></div><div><dt>Severity</dt><dd>${escapeHtml(item.severity || "Not set")}</dd></div><div><dt>Date</dt><dd>${escapeHtml(formatDate(item.date))}</dd></div></dl></article>`).join("")}</div>`;
}

function managerOversight(rows) {
  const high = rows.filter(isHighPriority);
  const open = rows.filter((item) => !/[closed|resolved|approved|complete]/i.test(String(item.status || "")));
  const missingChildVoice = rows.filter((item) => !item.child_voice && !item.young_person_voice && !item.voice_of_child);
  return `<div class="record-field-list compact"><p><span>High-priority items</span><strong>${high.length}</strong></p><p><span>Open items</span><strong>${open.length}</strong></p><p><span>Possible child voice gaps</span><strong>${missingChildVoice.length}</strong></p><p><span>Action</span><strong>${open.length ? "Review oversight, actions and chronology links" : "No open safeguarding actions returned"}</strong></p></div>`;
}

function escalationPrompts(rows) {
  if (!rows.length) return emptyState("No safeguarding context available for escalation prompts.");
  return `<div class="yp-action-list"><button type="button" disabled><strong>Immediate safety</strong><span>Check whether risk is current, contained and recorded.</span></button><button type="button" disabled><strong>Notifications</strong><span>Confirm manager, placing authority, social worker or emergency notifications where required.</span></button><button type="button" disabled><strong>Chronology</strong><span>Ensure significant events are linked into the child chronology.</span></button><button type="button" disabled><strong>Review date</strong><span>Confirm next review and management oversight point.</span></button></div>`;
}

function scopedContext() {
  const context = normalisedContext();
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  if (!selected.size) return context;
  const children = context.children.filter((child) => selected.has(childKey(child)));
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => childName(child).toLowerCase()));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || "")) || names.has(String(item.childName || item.child_name || item.young_person_name || item.name || "").toLowerCase());
  return { ...context, children, documents: context.documents.filter(filterByChild), chronology: context.chronology.filter(filterByChild), safeguarding: context.safeguarding.filter(filterByChild) };
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

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((item) => {
    const key = `${rowType(item)}:${rowId(item)}:${item.title}:${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newestFirst(a, b) {
  return Date.parse(b.date || 0) - Date.parse(a.date || 0);
}

function metric(label, value, sub, tone = "blue") { return `<article class="yp-compact-metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(sub)}</small></article>`; }
function rowType(item) { return String(item.type || item.record_type || item.category || "record").toLowerCase(); }
function rowId(item) { return String(item.id || item.record_id || item.document_id || item.uuid || item.source_id || ""); }
function statusClass(value) { return /high|critical|open|overdue|escalated|returned|rejected/i.test(String(value || "")) ? "submitted-for-review" : "approved"; }
function displayType(type) { return String(type || "record").replaceAll("_", " ").replaceAll("-", " "); }
function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function formatDate(value) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
