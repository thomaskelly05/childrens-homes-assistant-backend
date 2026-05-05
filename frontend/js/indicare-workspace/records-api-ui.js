const recordsMain = document.getElementById("workspace-main");
const recordsNav = document.getElementById("workspace-nav");
const recordsTitle = document.getElementById("view-title");
const recordsSubtitle = document.getElementById("view-subtitle");
const recordModal = document.getElementById("record-modal");
const recordForm = document.getElementById("record-form");
const recordFields = document.getElementById("record-form-fields");
const recordGuidance = document.getElementById("smart-form-guidance");
const recordClose = document.getElementById("close-modal");
const recordCreate = document.getElementById("new-record-button");
const recordAssistantOutput = document.getElementById("assistant-output");

let currentRecordType = "daily";

const recordViews = {
  daily: { view: "daily", type: "daily", title: "Daily recording", text: "Daily lived experience, child voice and staff response." },
  incidents: { view: "incidents", type: "incident", title: "Incidents", text: "Incident records, debriefs, learning and oversight." },
  safeguarding: { view: "safeguarding", type: "safeguarding", title: "Safeguarding", text: "Concerns, actions, notifications and outcomes." },
  missing: { view: "missing", type: "missing", title: "Missing from care", text: "Missing episodes, return work and risk review." },
};

if (recordsNav) {
  recordsNav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    const view = recordViews[button.dataset.view];
    if (!view) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    showRecordList(view.type, view.title, view.text);
  }, true);
}

if (recordCreate) {
  recordCreate.addEventListener("click", (event) => {
    event.preventDefault();
    openRecordChooser();
  }, true);
}

if (recordClose) recordClose.addEventListener("click", () => recordModal.classList.add("hidden"));

window.openWorkspaceForm = function(type = "daily") {
  openRecordForm(type);
};

async function showRecordList(type, heading, text) {
  currentRecordType = type;
  if (recordsTitle) recordsTitle.textContent = heading;
  if (recordsSubtitle) recordsSubtitle.textContent = text;
  if (!recordsMain) return;

  recordsMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Care records</p>
        <h3>${escapeHtml(heading)}</h3>
        <p>${escapeHtml(text)}</p>
      </div>
      <button type="button" class="primary-action" id="quick-create-record">Create ${escapeHtml(heading)}</button>
    </section>
    <section id="real-record-list" class="record-list"><div class="empty-state">Loading records...</div></section>
  `;

  document.getElementById("quick-create-record")?.addEventListener("click", () => openRecordForm(type));
  const data = await getJson(`/workspace-records/${encodeURIComponent(type)}`);
  const list = document.getElementById("real-record-list");
  if (!data || !data.ok) {
    list.innerHTML = `<div class="warning-banner">${escapeHtml(data?.error || "Could not load records.")}</div>`;
    return;
  }
  const records = data.records || [];
  list.innerHTML = records.length ? records.map(cardHtml).join("") : `<div class="empty-state">No records yet. Create the first one.</div>`;
  list.querySelectorAll(".clickable-record").forEach((card) => {
    card.addEventListener("click", () => openRecordDetail(JSON.parse(card.dataset.record || "{}")));
  });
}

function openRecordChooser() {
  recordModal.classList.remove("hidden");
  currentRecordType = "daily";
  if (recordGuidance) recordGuidance.innerHTML = "";
  recordFields.innerHTML = `
    <div class="form-row"><label>Choose record type</label><select id="record-type-choice"><option value="daily">Daily log</option><option value="incident">Incident</option><option value="safeguarding">Safeguarding concern</option><option value="missing">Missing episode</option></select></div>
    <button type="button" class="primary-action" id="record-type-next">Continue</button>
  `;
  document.getElementById("record-type-next")?.addEventListener("click", () => openRecordForm(document.getElementById("record-type-choice").value));
}

function openRecordForm(type) {
  currentRecordType = type;
  recordModal.classList.remove("hidden");
  if (recordGuidance) recordGuidance.innerHTML = `<div class="guidance-panel"><strong>Recording quality</strong><p>Record facts, child voice, adult response and follow-up actions.</p></div>`;
  recordFields.innerHTML = formHtml(type);
}

function formHtml(type) {
  const common = `<div class="form-row"><label>Young person ID</label><input name="young_person_id" value="1" /></div><div class="form-row"><label>Title</label><input name="title" placeholder="Short title" /></div>`;
  if (type === "daily") return common + `<div class="form-row"><label>Mood</label><input name="mood" /></div><div class="form-row"><label>What happened?</label><textarea name="what_happened"></textarea></div><div class="form-row"><label>Child voice</label><textarea name="child_voice"></textarea></div><div class="form-row"><label>Staff response</label><textarea name="staff_response"></textarea></div>`;
  if (type === "incident") return common + `<div class="form-row"><label>Incident type</label><input name="incident_type" /></div><div class="form-row"><label>Trigger</label><textarea name="trigger"></textarea></div><div class="form-row"><label>Description</label><textarea name="description"></textarea></div><div class="form-row"><label>Staff response</label><textarea name="staff_response"></textarea></div>`;
  if (type === "safeguarding") return common + `<div class="form-row"><label>Concern</label><textarea name="description"></textarea></div><div class="form-row"><label>Immediate action</label><textarea name="immediate_action"></textarea></div><div class="form-row"><label>Who was informed?</label><textarea name="notifications"></textarea></div>`;
  return common + `<div class="form-row"><label>Last seen and context</label><textarea name="description"></textarea></div><div class="form-row"><label>Known locations</label><textarea name="known_locations"></textarea></div><div class="form-row"><label>Actions taken</label><textarea name="actions"></textarea></div>`;
}

if (recordForm) {
  recordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(recordForm).entries());
    payload.status = "submitted_for_review";
    const data = await postJson(`/workspace-records/${encodeURIComponent(currentRecordType)}`, payload);
    if (!data || !data.ok) {
      toast(data?.error || "Record could not be saved.");
      return;
    }
    recordModal.classList.add("hidden");
    toast("Record saved and submitted for review.");
    const view = Object.values(recordViews).find((item) => item.type === currentRecordType);
    showRecordList(currentRecordType, view?.title || humanise(currentRecordType), view?.text || "Records");
  }, true);
}

function cardHtml(record) {
  const data = escapeHtml(JSON.stringify(record));
  return `<article class="record-card clickable-record" data-record="${data}"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(record.record_type || "record")}</span><span class="mini-tag">${escapeHtml(record.status || "submitted")}</span></div><h4>${escapeHtml(record.title || "Untitled record")}</h4><p>${escapeHtml(record.summary || "Open this record for full detail.")}</p><small>${escapeHtml(record.updated_at || record.created_at || "No date")}</small></div><div class="record-actions"><button type="button">Open</button></div></article>`;
}

function openRecordDetail(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `<div class="record-detail-card"><div class="modal-header"><div><p class="eyebrow">${escapeHtml(record.record_type || "record")}</p><h3>${escapeHtml(record.title || "Record detail")}</h3></div><button type="button" class="icon-button" data-close-record-detail>x</button></div><div class="detail-grid"><div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div><div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div><div class="detail-item"><strong>Created</strong><br>${escapeHtml(record.created_at || "unknown")}</div><div class="detail-item"><strong>Updated</strong><br>${escapeHtml(record.updated_at || "unknown")}</div></div><h4>Summary</h4><p>${escapeHtml(record.summary || "No summary.")}</p><h4>Full content</h4><div class="panel">${Object.entries(content).map(([k,v]) => `<p><strong>${escapeHtml(humanise(k))}:</strong> ${escapeHtml(v)}</p>`).join("") || "No structured content."}</div></div>`;
  overlay.querySelector("[data-close-record-detail]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
async function postJson(url, payload) { try { const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
function toast(message) { if (recordAssistantOutput) recordAssistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`; }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
