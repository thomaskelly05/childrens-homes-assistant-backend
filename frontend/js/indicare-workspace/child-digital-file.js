const nav = document.getElementById("workspace-nav");
const main = document.getElementById("workspace-main");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");

const CORE_DOCUMENTS = [
  ["Placement Plan", "Care and placement", "Core plan for day-to-day care, needs and routines."],
  ["Care Plan", "Care and placement", "LA plan, legal context, care objectives and expectations."],
  ["Risk Assessment", "Safety", "Missing, exploitation, self-harm, aggression and vulnerability risks."],
  ["Behaviour Support Plan", "Therapeutic support", "Triggers, early signs, de-escalation, repair and learning."],
  ["Missing From Care Plan", "Safety", "Known locations, associates, police process and return-home work."],
  ["Health Care Plan", "Health and education", "GP, CAMHS, appointments, medication and wellbeing needs."],
  ["Personal Education Plan", "Health and education", "Attendance, targets, barriers, support and achievements."],
  ["Communication Profile", "Therapeutic support", "How the child communicates distress, choice, wishes and feelings."],
  ["Sensory Profile", "Therapeutic support", "Sensory triggers, environment, regulation and support."],
  ["Life Story / Identity", "Identity", "Culture, memories, important people, milestones and achievements."]
];

const GROUPS = ["All", "Care and placement", "Safety", "Therapeutic support", "Health and education", "Identity", "Archived"];
const STATUSES = ["All", "draft", "ai_improved", "submitted_for_review", "changes_requested", "approved", "archived"];
let currentGroup = "All";
let currentStatus = "All";
let currentDate = "";
let currentQuery = "";

if (nav) {
  nav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='child-file'], button[data-view='child']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadDigitalChildFile();
  }, true);
}

window.loadDigitalChildFile = loadDigitalChildFile;

async function loadDigitalChildFile() {
  const ctx = context();
  if (title) title.textContent = "Documents OS";
  if (subtitle) subtitle.textContent = `Calendar-first document library for ${ctx.childName || "the selected young person"}.`;
  if (!main) return;
  main.classList.add("documents-os-main");
  main.innerHTML = `<section class="documents-os-loading panel">Loading Documents OS...</section>`;

  const [library, records] = await Promise.all([fetchDocuments(ctx), fetchAllRecords(ctx.childId)]);
  const docs = library.documents || [];
  const calendar = library.calendar || buildCalendar(docs);
  const groups = library.groups || countGroups(docs);
  const filtered = filterDocs(docs);
  const intelligence = buildDocumentIntelligence(docs, records);

  main.innerHTML = `
    <section class="documents-os-shell">
      <aside class="documents-os-rail">
        <div class="documents-os-brand">
          <p class="eyebrow">Documents OS</p>
          <h3>${escapeHtml(ctx.childName || "Selected child")}</h3>
          <p>${escapeHtml(ctx.homeName || "Selected home")}</p>
        </div>

        <div class="documents-os-nav-group">
          <span>Library groups</span>
          ${GROUPS.map((group) => `<button type="button" class="doc-filter ${group === currentGroup ? "active" : ""}" data-doc-group="${escapeHtml(group)}">${escapeHtml(group)} <small>${escapeHtml(group === "All" ? docs.length : group === "Archived" ? docs.filter((doc) => doc.status === "archived").length : groups[group] || 0)}</small></button>`).join("")}
        </div>

        <div class="documents-os-nav-group">
          <span>Workflow</span>
          ${STATUSES.map((status) => `<button type="button" class="doc-filter ${status === currentStatus ? "active" : ""}" data-doc-status="${escapeHtml(status)}">${escapeHtml(humanise(status))}</button>`).join("")}
        </div>
      </aside>

      <main class="documents-os-canvas">
        <section class="documents-os-hero">
          <div>
            <p class="eyebrow">SharePoint-style care library</p>
            <h3>Documents, plans and forms in one live workspace</h3>
            <p>Open any child document in the full-screen IndiCare processor. Filter by group, lifecycle, search or calendar date.</p>
          </div>
          <div class="documents-os-actions">
            <button type="button" class="primary-action" id="new-live-document">New document</button>
            <button type="button" class="secondary-action" id="seed-core-documents">Create core pack</button>
          </div>
        </section>

        <section class="documents-os-toolbar">
          <input id="document-search" placeholder="Search documents, plans, dates, status..." value="${escapeHtml(currentQuery)}" />
          <input id="document-date-filter" type="date" value="${escapeHtml(currentDate)}" />
          <button type="button" class="secondary-action" id="clear-document-filters">Clear filters</button>
        </section>

        <section class="documents-calendar-panel">
          <div class="section-header-row">
            <div><p class="eyebrow">Calendar memory</p><h3>Find documents by date</h3></div>
            <span class="mini-tag">${Object.keys(calendar).length} active date(s)</span>
          </div>
          <div class="documents-calendar-grid">
            ${renderCalendar(calendar)}
          </div>
        </section>

        <section class="documents-library-panel">
          <div class="section-header-row">
            <div><p class="eyebrow">Document library</p><h3>${filtered.length} document(s)</h3></div>
            <span class="mini-tag">${escapeHtml(currentGroup)} • ${escapeHtml(humanise(currentStatus))}</span>
          </div>
          <div class="documents-library-grid">
            ${filtered.length ? filtered.map(renderStoredDocumentCard).join("") : renderEmptyLibrary(ctx)}
          </div>
        </section>

        <section class="documents-template-panel panel">
          <div class="section-header-row"><div><p class="eyebrow">Core templates</p><h3>Open or create required child documents</h3></div></div>
          <div class="document-grid">
            ${CORE_DOCUMENTS.map(renderTemplateCard).join("")}
          </div>
        </section>
      </main>

      <aside class="documents-os-intelligence">
        <section class="docos-ai-card">
          <p class="eyebrow">Operational intelligence</p>
          <h3>Library health</h3>
          ${intelligence.map((item) => `<div class="alert ${escapeHtml(item.level)}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div>`).join("")}
          <button type="button" class="primary-action" id="ask-documents-copilot">Ask Copilot</button>
        </section>
      </aside>
    </section>
  `;

  bindDocumentsOs(ctx, docs);
}

function bindDocumentsOs(ctx, docs) {
  main.querySelectorAll("[data-doc-group]").forEach((button) => button.addEventListener("click", () => { currentGroup = button.dataset.docGroup; loadDigitalChildFile(); }));
  main.querySelectorAll("[data-doc-status]").forEach((button) => button.addEventListener("click", () => { currentStatus = button.dataset.docStatus; loadDigitalChildFile(); }));
  main.querySelectorAll("[data-doc-date]").forEach((button) => button.addEventListener("click", () => { currentDate = button.dataset.docDate; loadDigitalChildFile(); }));
  main.querySelector("#document-search")?.addEventListener("input", debounce((event) => { currentQuery = event.target.value; loadDigitalChildFile(); }, 350));
  main.querySelector("#document-date-filter")?.addEventListener("change", (event) => { currentDate = event.target.value; loadDigitalChildFile(); });
  main.querySelector("#clear-document-filters")?.addEventListener("click", () => { currentGroup = "All"; currentStatus = "All"; currentDate = ""; currentQuery = ""; loadDigitalChildFile(); });
  main.querySelector("#new-live-document")?.addEventListener("click", () => openTemplate(CORE_DOCUMENTS[0]));
  main.querySelector("#seed-core-documents")?.addEventListener("click", () => seedCoreDocuments(ctx));
  main.querySelectorAll("[data-template-doc]").forEach((button) => button.addEventListener("click", () => openTemplate(CORE_DOCUMENTS.find((doc) => doc[0] === button.dataset.templateDoc))));
  main.querySelectorAll("[data-open-doc-id]").forEach((button) => button.addEventListener("click", () => openStoredDocument(docs.find((doc) => String(doc.id) === String(button.dataset.openDocId)))));
  main.querySelector("#ask-documents-copilot")?.addEventListener("click", () => {
    document.getElementById("os-copilot-launcher")?.click();
    setTimeout(() => {
      const input = document.getElementById("os-copilot-input");
      if (input) input.value = `Review ${ctx.childName}'s Documents OS. Identify missing plans, documents awaiting review, weak evidence, outdated plans and Reg 44/45 evidence points.`;
    }, 120);
  });
}

function renderStoredDocumentCard(doc) {
  const title = doc.editable_title || doc.title || doc.auto_title || doc.document_type;
  return `<article class="doc-library-card">
    <div class="doc-card-top"><span class="mini-tag">${escapeHtml(doc.document_group || "General")}</span><span class="mini-tag">${escapeHtml(humanise(doc.status || "draft"))}</span></div>
    <h4>${escapeHtml(title)}</h4>
    <p>${escapeHtml(doc.document_type || "Child document")}</p>
    <div class="doc-card-meta"><span>${escapeHtml(doc.document_date || "No date")}</span><span>${escapeHtml(doc.created_time || "No time")}</span></div>
    <button type="button" class="primary-action" data-open-doc-id="${escapeHtml(doc.id)}">Open full screen</button>
  </article>`;
}

function renderTemplateCard([name, category, help]) {
  return `<article class="life-area-card document-card"><div><span class="mini-tag">${escapeHtml(category)}</span><h4>${escapeHtml(name)}</h4><p>${escapeHtml(help)}</p></div><button type="button" data-template-doc="${escapeHtml(name)}">Open / create</button></article>`;
}

function renderCalendar(calendar) {
  const entries = Object.entries(calendar).sort(([a], [b]) => new Date(b) - new Date(a)).slice(0, 31);
  if (!entries.length) return `<div class="empty-state">No dated documents yet. Create or save a document to build the calendar memory.</div>`;
  return entries.map(([date, count]) => `<button type="button" class="documents-calendar-day ${date === currentDate ? "active" : ""}" data-doc-date="${escapeHtml(date)}"><strong>${escapeHtml(shortDay(date))}</strong><span>${escapeHtml(shortMonth(date))}</span><small>${escapeHtml(count)} doc(s)</small></button>`).join("");
}

function renderEmptyLibrary(ctx) {
  return `<div class="empty-state document-empty-state"><strong>No matching documents found.</strong><p>Create ${escapeHtml(ctx.childName || "this young person")}'s core pack or clear filters.</p></div>`;
}

async function openTemplate(template) {
  if (!template) return;
  const ctx = context();
  const [name, category] = template;
  const existing = await findExistingDocument(ctx, name);
  if (existing) return openStoredDocument(existing);
  const created = await postJson("/child-documents", { young_person_id: ctx.childId, home_id: ctx.homeId, child_name: ctx.childName, document_type: name, document_group: category, document_date: todayIso(), created_time: currentTime(), status: "draft" });
  if (created?.ok) return openStoredDocument(created.document);
  window.IndiCareDocumentProcessor?.open?.({ name, category });
}

async function openStoredDocument(doc) {
  if (!doc) return;
  const latest = await getJson(`/child-documents/${encodeURIComponent(doc.id)}`);
  const document = latest?.document || doc;
  window.IndiCareDocumentProcessor?.open?.({ id: document.id, name: document.document_type, title: document.editable_title || document.title, category: document.document_group, document });
}

async function findExistingDocument(ctx, name) {
  const data = await getJson(`/child-documents?young_person_id=${encodeURIComponent(ctx.childId || "")}&query=${encodeURIComponent(name)}&include_archived=true&limit=25`);
  return (data.documents || []).find((doc) => doc.document_type === name || doc.title?.includes(name));
}

async function seedCoreDocuments(ctx) {
  for (const [name, category] of CORE_DOCUMENTS) {
    const existing = await findExistingDocument(ctx, name);
    if (!existing) await postJson("/child-documents", { young_person_id: ctx.childId, home_id: ctx.homeId, child_name: ctx.childName, document_type: name, document_group: category, document_date: todayIso(), created_time: currentTime(), status: "draft" });
  }
  loadDigitalChildFile();
}

function filterDocs(docs) {
  return docs.filter((doc) => {
    const groupMatch = currentGroup === "All" || (currentGroup === "Archived" ? doc.status === "archived" : doc.document_group === currentGroup);
    const statusMatch = currentStatus === "All" || doc.status === currentStatus;
    const dateMatch = !currentDate || String(doc.document_date) === currentDate;
    const q = currentQuery.trim().toLowerCase();
    const queryMatch = !q || `${doc.title} ${doc.editable_title} ${doc.auto_title} ${doc.document_type} ${doc.document_group} ${doc.status}`.toLowerCase().includes(q);
    return groupMatch && statusMatch && dateMatch && queryMatch;
  });
}

function buildDocumentIntelligence(docs, records) {
  const awaiting = docs.filter((doc) => doc.status === "submitted_for_review" || doc.status === "ai_improved").length;
  const missingCore = CORE_DOCUMENTS.filter(([name]) => !docs.some((doc) => doc.document_type === name)).length;
  const safetyRecords = records.filter((record) => /risk|missing|safeguard|incident|harm/i.test(`${record.title || ""} ${record.summary || ""} ${Object.values(record.content || {}).join(" ")}`)).length;
  return [
    { level: awaiting ? "medium" : "low", title: "Review workflow", text: awaiting ? `${awaiting} document(s) need manager review.` : "No documents are currently waiting for review." },
    { level: missingCore ? "medium" : "low", title: "Core document pack", text: missingCore ? `${missingCore} core document(s) have not been created yet.` : "Core document pack is visible for this child." },
    { level: safetyRecords ? "high" : "low", title: "Safety evidence", text: safetyRecords ? `${safetyRecords} record(s) may need linking to safety documents.` : "No obvious safety document pressure found in recent records." },
  ];
}

async function fetchDocuments(ctx) {
  const query = new URLSearchParams();
  if (ctx.childId) query.set("young_person_id", ctx.childId);
  query.set("include_archived", "true");
  query.set("limit", "250");
  const data = await getJson(`/child-documents?${query.toString()}`);
  return data?.ok ? data : { documents: [], groups: {}, calendar: {} };
}

function countGroups(docs) { return docs.reduce((acc, doc) => { const key = doc.document_group || "General"; acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }
function buildCalendar(docs) { return docs.reduce((acc, doc) => { const key = String(doc.document_date || ""); if (key) acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }
async function fetchAllRecords(childId) { const types = ["daily", "incident", "safeguarding", "missing"]; let all = []; for (const type of types) { try { const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&include_archived=true&limit=100`, { credentials: "include" }); const data = await response.json(); all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} }))); } catch {} } return all; }
function context() { return window.IndiCareContext?.get?.() || { childId: "", childName: "Selected child", homeId: "", homeName: "Selected home" }; }
async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch { return null; } }
async function postJson(url, payload) { try { const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch { return null; } }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function currentTime() { return new Date().toTimeString().slice(0, 5); }
function shortDay(date) { return new Date(date).toLocaleDateString("en-GB", { day: "2-digit" }); }
function shortMonth(date) { return new Date(date).toLocaleDateString("en-GB", { month: "short" }); }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()); }
function debounce(fn, delay) { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), delay); }; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
