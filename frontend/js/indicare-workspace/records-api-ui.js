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
const improveWithAiButton = document.getElementById("improve-with-ai");
const saveDraftButton = document.getElementById("save-draft");

let currentRecordType = "daily";
let currentLifeArea = "daily";
let currentEditingRecordId = null;
let currentMode = "create";

const lifecycle = ["draft", "ai_improved", "submitted_for_review", "changes_requested", "approved", "archived"];

const recordViews = {
  daily: { view: "daily", type: "daily", title: "Daily recording", text: "Daily lived experience, child voice, adult response, reflection and outcome." },
  incidents: { view: "incidents", type: "incident", title: "Incidents", text: "Incident records, debriefs, learning, safeguarding relevance and manager oversight." },
  safeguarding: { view: "safeguarding", type: "safeguarding", title: "Safeguarding", text: "Concerns, immediate actions, notifications, child voice, outcomes and follow-up." },
  missing: { view: "missing", type: "missing", title: "Missing from care", text: "Missing episodes, return work, risk review, locations, associates and learning." },
};

const lifeForms = {
  identity: { type: "daily", title: "Identity and belonging", prompt: "Record identity, culture, religion, expression, belonging and what matters to the child.", fields: [["identity_update", "textarea", "What changed or was expressed about identity/belonging?"], ["what_matters", "textarea", "What matters to the child?"], ["adult_response", "textarea", "How did adults support identity and belonging?"], ["outcome", "textarea", "What changed afterwards?"]] },
  safety: { type: "safeguarding", title: "Safety and protection", prompt: "Record safety concerns clearly: immediate action, who was informed, outcome and next steps.", fields: [["description", "textarea", "What is the safety concern?"], ["child_voice", "textarea", "What did the child say/show/communicate?"], ["immediate_action", "textarea", "Immediate safety action"], ["notifications", "textarea", "Who was informed and when?"], ["outcome", "textarea", "Outcome / next steps"]] },
  emotional: { type: "daily", title: "Emotional wellbeing", prompt: "Capture emotional presentation, regulation, triggers, what helped and what adults learned.", fields: [["mood", "select", "Mood / presentation"], ["trigger", "textarea", "Known or possible trigger"], ["child_voice", "textarea", "Child voice / emotional communication"], ["regulation", "textarea", "What helped regulate the child?"], ["reflection", "textarea", "Therapeutic reflection"], ["outcome", "textarea", "Outcome / next action"]] },
  relationships: { type: "daily", title: "Relationships", prompt: "Record family time, peer dynamics, trusted adults, risky relationships and emotional impact.", fields: [["relationship", "text", "Who was involved?"], ["contact_impact", "textarea", "Impact on the child"], ["risk_or_strength", "textarea", "Risk, strength or support need"], ["staff_response", "textarea", "Adult response"], ["outcome", "textarea", "What changed or needs follow-up?"]] },
  education: { type: "daily", title: "Education and learning", prompt: "Record attendance, engagement, barriers, achievements and support provided.", fields: [["attendance", "select", "Attendance"], ["school_experience", "textarea", "School/learning experience"], ["barriers", "textarea", "Barriers or worries"], ["achievement", "textarea", "Achievement or progress"], ["actions", "textarea", "Follow-up actions"]] },
  health: { type: "daily", title: "Health and body", prompt: "Record sleep, diet, medication, appointments, CAMHS, physical and emotional health.", fields: [["sleep", "text", "Sleep"], ["food", "text", "Food / appetite"], ["health_observation", "textarea", "Health observation"], ["child_voice", "textarea", "Child voice / wishes / worries"], ["follow_up", "textarea", "Follow-up needed"]] },
  daily: { type: "daily", title: "Daily lived experience", prompt: "Record the child’s actual day: what happened, how it felt, child voice, adult response and follow-up.", fields: [["mood", "select", "Mood"], ["what_happened", "textarea", "What happened today?"], ["child_voice", "textarea", "Child voice / communication"], ["staff_response", "textarea", "Adult response"], ["reflection", "textarea", "Therapeutic reflection"], ["outcome", "textarea", "What changed?"], ["actions", "textarea", "Follow-up actions"]] },
  behaviour: { type: "incident", title: "Behaviour as communication", prompt: "Record behaviour as communication: antecedent, what happened, child state, adult response, debrief and learning.", fields: [["incident_type", "text", "Behaviour / incident type"], ["trigger", "textarea", "Antecedent / trigger"], ["description", "textarea", "What happened? Facts only."], ["child_voice", "textarea", "Child voice / emotional state"], ["staff_response", "textarea", "Adult response"], ["learning", "textarea", "Debrief / learning / plan update needed"], ["outcome", "textarea", "Outcome / next action"]] },
  independence: { type: "daily", title: "Independence and life skills", prompt: "Record practical life skills, confidence, choices, routines, money, cooking and self-care.", fields: [["skill_area", "text", "Skill area"], ["what_happened", "textarea", "What did the child do?"], ["support_given", "textarea", "Support given"], ["progress", "textarea", "Progress / next step"]] },
  achievements: { type: "daily", title: "Strengths and achievements", prompt: "Record strengths, talents, positive moments, praise, recognition and progress.", fields: [["achievement", "textarea", "Achievement / positive moment"], ["strength", "textarea", "Strength shown"], ["adult_response", "textarea", "How was this recognised?"], ["outcome", "textarea", "Impact on the child"]] },
  plans: { type: "daily", title: "Plans and assessments", prompt: "Record updates needed to placement plan, risk assessment, missing plan, health, education or behaviour support plan.", fields: [["plan_type", "select", "Plan type"], ["reason", "textarea", "Why does the plan need review?"], ["evidence", "textarea", "Evidence from records"], ["action", "textarea", "Required action"]] },
  voice: { type: "daily", title: "Child voice and wishes", prompt: "Record direct quotes, non-verbal communication, wishes, feelings, complaints and choices.", fields: [["child_voice", "textarea", "What did the child say or communicate?"], ["context", "textarea", "Context"], ["adult_response", "textarea", "How did adults respond?"], ["action", "textarea", "What changed because of the child’s voice?"]] },
};

bootRecordsUi();

function bootRecordsUi() {
  bindNav();
  bindCreateButtons();
  bindModalControls();
  updateActiveChildSummary();
  window.addEventListener("indicare:context-change", updateActiveChildSummary);
  window.openWorkspaceForm = function(type = "daily", lifeArea = null) {
    const key = lifeArea || type;
    if (lifeForms[key]) return openLifeAreaRecordForm(key);
    openRecordForm(type);
  };
  window.openLifeAreaRecordForm = openLifeAreaRecordForm;
  window.showWorkspaceRecordList = showRecordList;
}

function bindNav() {
  if (!recordsNav) return;
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

function bindCreateButtons() {
  recordCreate?.addEventListener("click", (event) => {
    event.preventDefault();
    openRecordChooser();
  }, true);
}

function bindModalControls() {
  recordClose?.addEventListener("click", () => recordModal?.classList.add("hidden"));
  saveDraftButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    await saveRecord("draft");
  });
  improveWithAiButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    await improveOpenRecordWithAi();
  });
  recordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveRecord("submitted_for_review");
  }, true);
}

async function showRecordList(type, heading, text, includeArchived = false) {
  currentRecordType = type;
  if (recordsTitle) recordsTitle.textContent = heading;
  if (recordsSubtitle) recordsSubtitle.textContent = text;
  if (!recordsMain) return;
  const ctx = context();
  recordsMain.innerHTML = `
    <section class="hero-card record-workspace-hero">
      <div>
        <p class="eyebrow">Universal record lifecycle</p>
        <h3>${escapeHtml(heading)}</h3>
        <p>${escapeHtml(text)}</p>
        ${lifecycleStrip("draft")}
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" id="quick-create-record">Create record</button>
        <button type="button" class="secondary-action" id="load-review-queue">Manager review queue</button>
        <button type="button" class="secondary-action" id="toggle-archived-records">${includeArchived ? "Hide archived" : "Show archived"}</button>
      </div>
    </section>
    <section id="real-record-list" class="record-list"><div class="empty-state">Loading records for ${escapeHtml(ctx.childName)}...</div></section>
  `;
  document.getElementById("quick-create-record")?.addEventListener("click", () => openRecordForm(type));
  document.getElementById("load-review-queue")?.addEventListener("click", () => showReviewQueue());
  document.getElementById("toggle-archived-records")?.addEventListener("click", () => showRecordList(type, heading, text, !includeArchived));

  const data = await getJson(`/workspace-records/${encodeURIComponent(type)}?young_person_id=${encodeURIComponent(ctx.childId || "")}&include_archived=${includeArchived ? "true" : "false"}&limit=100`);
  const list = document.getElementById("real-record-list");
  if (!data || !data.ok) {
    list.innerHTML = `<div class="warning-banner">${escapeHtml(data?.error || "Could not load records.")}</div>`;
    return;
  }
  const records = data.records || [];
  list.innerHTML = records.length ? records.map(cardHtml).join("") : `<div class="empty-state">No records yet for ${escapeHtml(ctx.childName)}. Create the first one.</div>`;
  list.querySelectorAll(".clickable-record").forEach((card) => card.addEventListener("click", async () => openRecordDetail(JSON.parse(card.dataset.record || "{}"))));
}

async function showReviewQueue() {
  if (recordsTitle) recordsTitle.textContent = "Manager review queue";
  if (recordsSubtitle) recordsSubtitle.textContent = "Submitted, AI-improved and returned records awaiting oversight.";
  if (!recordsMain) return;
  recordsMain.innerHTML = `<section class="hero-card"><div><p class="eyebrow">Governance</p><h3>Manager review queue</h3><p>Review records, add coaching comments, approve, return or archive.</p></div></section><section id="real-record-list"><div class="empty-state">Loading review queue...</div></section>`;
  const data = await getJson(`/workspace-records/review/queue?limit=100`);
  const list = document.getElementById("real-record-list");
  if (!data || !data.ok) {
    list.innerHTML = `<div class="warning-banner">${escapeHtml(data?.error || "Could not load review queue.")}</div>`;
    return;
  }
  const records = data.records || [];
  list.innerHTML = records.length ? records.map(cardHtml).join("") : `<div class="empty-state">Nothing is waiting for review.</div>`;
  list.querySelectorAll(".clickable-record").forEach((card) => card.addEventListener("click", async () => openRecordDetail(JSON.parse(card.dataset.record || "{}"))));
}

function openRecordChooser() {
  currentEditingRecordId = null;
  currentMode = "create";
  const ctx = context();
  recordModal?.classList.remove("hidden");
  updateActiveChildSummary();
  if (recordGuidance) recordGuidance.innerHTML = `<div class="guidance-panel"><strong>Click → write → AI improve → submit</strong><p>You are recording for ${escapeHtml(ctx.childName || "the selected child")} in ${escapeHtml(ctx.homeName || "the selected home")}.</p></div>`;
  recordFields.innerHTML = `<div class="form-row"><label>Choose record area</label><select id="record-type-choice">${Object.entries(lifeForms).map(([key, form]) => `<option value="${key}">${escapeHtml(form.title)}</option>`).join("")}</select></div><button type="button" class="primary-action" id="record-type-next">Continue</button>`;
  document.getElementById("record-type-next")?.addEventListener("click", () => openLifeAreaRecordForm(document.getElementById("record-type-choice").value));
}

function openRecordForm(type) {
  currentLifeArea = type;
  const mapped = Object.entries(lifeForms).find(([, value]) => value.type === type)?.[0] || "daily";
  openLifeAreaRecordForm(mapped);
}

function openLifeAreaRecordForm(key, existingRecord = null) {
  const config = lifeForms[key] || lifeForms.daily;
  const ctx = context();
  currentLifeArea = key;
  currentRecordType = existingRecord?.record_type || config.type;
  currentEditingRecordId = existingRecord?.id || null;
  currentMode = existingRecord?.id ? "edit" : "create";
  recordModal?.classList.remove("hidden");
  updateActiveChildSummary();
  if (recordGuidance) {
    recordGuidance.innerHTML = `<div class="guidance-panel"><strong>${escapeHtml(config.title)}</strong><p>${escapeHtml(config.prompt)}</p>${lifecycleStrip(existingRecord?.status || "draft")}</div>`;
  }
  recordFields.innerHTML = formHtml(config, ctx, existingRecord);
}

function formHtml(config, ctx, record = null) {
  const content = record?.content || {};
  const common = `
    <input type="hidden" name="young_person_id" value="${escapeHtml(record?.young_person_id || ctx.childId || "")}" />
    <input type="hidden" name="home_id" value="${escapeHtml(record?.home_id || ctx.homeId || "")}" />
    <input type="hidden" name="life_area" value="${escapeHtml(content.life_area || currentLifeArea)}" />
    <div class="form-row"><label>Child</label><input value="${escapeHtml(ctx.childName || "Selected child")}" disabled /></div>
    <div class="form-row"><label>Home</label><input value="${escapeHtml(ctx.homeName || "Selected home")}" disabled /></div>
    <div class="form-row"><label>Title</label><input name="title" placeholder="Short title" value="${escapeHtml(record?.title || "")}" /></div>
  `;
  return common + config.fields.map(([name, fieldType, label]) => fieldHtml(name, fieldType, label, content[name])).join("");
}

function fieldHtml(name, fieldType, label, value = "") {
  if (fieldType === "textarea") return `<div class="form-row"><label>${escapeHtml(label)}</label><textarea name="${escapeHtml(name)}">${escapeHtml(value)}</textarea></div>`;
  if (fieldType === "select" && name === "mood") return selectField(name, label, ["Settled", "Happy", "Anxious", "Low", "Angry", "Withdrawn", "Dysregulated"], value);
  if (fieldType === "select" && name === "attendance") return selectField(name, label, ["Attended", "Partial attendance", "Refused", "Excluded", "Not scheduled"], value);
  if (fieldType === "select" && name === "plan_type") return selectField(name, label, ["Placement plan", "Risk assessment", "Behaviour support plan", "Missing plan", "Health plan", "Education plan"], value);
  return `<div class="form-row"><label>${escapeHtml(label)}</label><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" /></div>`;
}

function selectField(name, label, options, selected) {
  return `<div class="form-row"><label>${escapeHtml(label)}</label><select name="${escapeHtml(name)}">${options.map((option) => `<option ${String(option) === String(selected) ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
}

async function saveRecord(status) {
  const payload = Object.fromEntries(new FormData(recordForm).entries());
  payload.status = status;
  payload.recorded_from = "universal_record_engine";
  let data;
  if (currentMode === "edit" && currentEditingRecordId) {
    data = await patchJson(`/workspace-records/${encodeURIComponent(currentRecordType)}/${encodeURIComponent(currentEditingRecordId)}`, payload);
    if (status === "submitted_for_review" && data?.ok) {
      data = await postJson(`/workspace-records/${encodeURIComponent(currentRecordType)}/${encodeURIComponent(currentEditingRecordId)}/submit`, { comment: "Submitted from universal record workspace." });
    }
  } else {
    data = await postJson(`/workspace-records/${encodeURIComponent(currentRecordType)}`, payload);
  }
  if (!data || !data.ok) {
    toast(data?.error || "Record could not be saved.");
    return;
  }
  recordModal?.classList.add("hidden");
  toast(`${humanise(currentLifeArea)} record ${status === "draft" ? "saved as draft" : "submitted for review"}.`);
  const view = Object.values(recordViews).find((item) => item.type === currentRecordType);
  showRecordList(currentRecordType, view?.title || humanise(currentRecordType), view?.text || "Records");
}

async function improveOpenRecordWithAi() {
  if (!currentEditingRecordId) {
    await saveRecord("draft");
    toast("Draft saved. Reopen the record to apply AI improvement.");
    return;
  }
  const data = await postJson(`/workspace-records/${encodeURIComponent(currentRecordType)}/${encodeURIComponent(currentEditingRecordId)}/ai-improve`, { comment: "AI improvement requested from record editor." });
  if (!data || !data.ok) {
    toast(data?.error || "AI improvement could not be applied.");
    return;
  }
  toast("IndiCare AI improved the record. Review and edit before submitting.");
  const refreshed = await getJson(`/workspace-records/${encodeURIComponent(currentRecordType)}/${encodeURIComponent(currentEditingRecordId)}`);
  if (refreshed?.ok) openRecordForEdit(refreshed.record);
}

function cardHtml(record) {
  const data = escapeHtml(JSON.stringify(record));
  const lifeArea = record.content?.life_area || record.record_type || "record";
  return `
    <article class="record-card clickable-record" data-record="${data}">
      <div>
        <div class="review-meta">
          <span class="mini-tag">${escapeHtml(humanise(lifeArea))}</span>
          <span class="mini-tag ${escapeHtml(record.status || "draft")}">${escapeHtml(humanise(record.status || "draft"))}</span>
        </div>
        <h4>${escapeHtml(record.title || "Untitled record")}</h4>
        <p>${escapeHtml(record.summary || "Open this record for full detail, editing, AI improvement and review.")}</p>
        <small>${escapeHtml(record.updated_at || record.created_at || "No date")}</small>
      </div>
      <div class="record-actions"><button type="button">Open</button></div>
    </article>`;
}

async function openRecordDetail(record) {
  const fresh = await getJson(`/workspace-records/${encodeURIComponent(record.record_type || currentRecordType)}/${encodeURIComponent(record.id)}`);
  if (fresh?.ok) record = fresh.record;
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `
    <div class="record-detail-card lifecycle-record-card">
      <div class="modal-header">
        <div>
          <p class="eyebrow">${escapeHtml(humanise(content.life_area || record.record_type || "record"))}</p>
          <h3>${escapeHtml(record.title || "Record detail")}</h3>
          ${lifecycleStrip(record.status || "draft")}
        </div>
        <button type="button" class="icon-button" data-close-record-detail>×</button>
      </div>
      <div class="detail-grid">
        <div class="detail-item"><strong>Status</strong><br>${escapeHtml(humanise(record.status || "draft"))}</div>
        <div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div>
        <div class="detail-item"><strong>Created</strong><br>${escapeHtml(record.created_at || "unknown")}</div>
        <div class="detail-item"><strong>Reviewed</strong><br>${escapeHtml(record.reviewed_at || "Not yet")}</div>
      </div>
      <section class="panel">
        <h4>Record content</h4>
        ${Object.entries(content).map(([k, v]) => `<p><strong>${escapeHtml(humanise(k))}:</strong> ${escapeHtml(typeof v === "object" ? JSON.stringify(v, null, 2) : v)}</p>`).join("") || "No structured content."}
      </section>
      ${record.manager_comment ? `<section class="panel"><h4>Manager comment</h4><p>${escapeHtml(record.manager_comment)}</p></section>` : ""}
      <section class="record-review-actions">
        <button type="button" class="secondary-action" data-record-edit>Edit</button>
        <button type="button" class="secondary-action" data-record-ai>Improve with AI</button>
        <button type="button" class="secondary-action" data-record-submit>Submit</button>
        <button type="button" class="primary-action" data-record-approve>Approve</button>
        <button type="button" class="secondary-action" data-record-changes>Request changes</button>
        <button type="button" class="secondary-action" data-record-archive>Archive</button>
        <button type="button" class="secondary-action" data-record-versions>Versions</button>
      </section>
      <section class="panel manager-comment-box hidden" id="manager-comment-box">
        <div class="form-row"><label>Manager comment / coaching note</label><textarea id="manager-review-comment" placeholder="Add review comment, coaching feedback, requested change or approval note..."></textarea></div>
      </section>
      <section id="record-version-output"></section>
    </div>`;
  overlay.querySelector("[data-close-record-detail]").addEventListener("click", () => overlay.remove());
  overlay.querySelector("[data-record-edit]").addEventListener("click", () => { overlay.remove(); openRecordForEdit(record); });
  overlay.querySelector("[data-record-ai]").addEventListener("click", () => recordAction(record, "ai", overlay));
  overlay.querySelector("[data-record-submit]").addEventListener("click", () => recordAction(record, "submit", overlay));
  overlay.querySelector("[data-record-approve]").addEventListener("click", () => recordReview(record, "approve", overlay));
  overlay.querySelector("[data-record-changes]").addEventListener("click", () => recordReview(record, "request_changes", overlay));
  overlay.querySelector("[data-record-archive]").addEventListener("click", () => recordAction(record, "archive", overlay));
  overlay.querySelector("[data-record-versions]").addEventListener("click", () => loadVersions(record, overlay));
  document.body.appendChild(overlay);
}

function openRecordForEdit(record) {
  const lifeArea = record.content?.life_area || Object.keys(lifeForms).find((key) => lifeForms[key].type === record.record_type) || record.record_type || "daily";
  openLifeAreaRecordForm(lifeArea, record);
}

async function recordAction(record, action, overlay) {
  const type = record.record_type || currentRecordType;
  const endpoints = {
    ai: `/workspace-records/${type}/${record.id}/ai-improve`,
    submit: `/workspace-records/${type}/${record.id}/submit`,
    archive: `/workspace-records/${type}/${record.id}/archive`,
  };
  const data = await postJson(endpoints[action], { comment: `${humanise(action)} from record detail.` });
  if (!data?.ok) return toast(data?.error || "Action failed.");
  toast(`Record ${humanise(data.status || action)}.`);
  overlay.remove();
  const view = Object.values(recordViews).find((item) => item.type === type);
  showRecordList(type, view?.title || humanise(type), view?.text || "Records");
}

async function recordReview(record, action, overlay) {
  const commentBox = overlay.querySelector("#manager-comment-box");
  if (commentBox?.classList.contains("hidden")) {
    commentBox.classList.remove("hidden");
    overlay.querySelector("#manager-review-comment")?.focus();
    return;
  }
  const comment = overlay.querySelector("#manager-review-comment")?.value || "";
  const type = record.record_type || currentRecordType;
  const data = await postJson(`/workspace-records/${type}/${record.id}/review`, { action, comment });
  if (!data?.ok) return toast(data?.error || "Review action failed.");
  toast(`Record ${humanise(data.status)}.`);
  overlay.remove();
  showReviewQueue();
}

async function loadVersions(record, overlay) {
  const type = record.record_type || currentRecordType;
  const output = overlay.querySelector("#record-version-output");
  output.innerHTML = `<div class="panel">Loading version history...</div>`;
  const data = await getJson(`/workspace-records/${type}/${record.id}/versions`);
  if (!data?.ok) {
    output.innerHTML = `<div class="warning-banner">${escapeHtml(data?.error || "Could not load versions.")}</div>`;
    return;
  }
  const versions = data.versions || [];
  output.innerHTML = `<div class="panel"><h4>Version history</h4>${versions.length ? versions.map((version) => `<div class="alert low"><strong>${escapeHtml(version.reason || version.action || version.status || "Version")}</strong><p>${escapeHtml(version.created_at || "No date")}</p></div>`).join("") : `<p>No version history has been recorded yet.</p>`}</div>`;
}

function lifecycleStrip(status) {
  const current = String(status || "draft").toLowerCase();
  return `<div class="record-lifecycle-strip">${lifecycle.map((step) => `<span class="lifecycle-pill ${step === current ? "active" : ""}">${escapeHtml(humanise(step))}</span>`).join("")}</div>`;
}

function updateActiveChildSummary() {
  const summary = document.getElementById("active-child-summary");
  if (!summary) return;
  const ctx = context();
  summary.innerHTML = `<strong>${escapeHtml(ctx.childName || "No child selected")}</strong><span>${escapeHtml(ctx.homeName || "Select a home")} • records link automatically to chronology, safeguarding and plans.</span>`;
}

function context() { return window.IndiCareContext?.get?.() || { homeId: "", homeName: "Selected home", childId: "", childName: "Selected child" }; }
async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
async function postJson(url, payload) { try { const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
async function patchJson(url, payload) { try { const response = await fetch(url, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
function toast(message) {
  const existing = document.getElementById("indicare-toast");
  existing?.remove();
  const toastEl = document.createElement("div");
  toastEl.id = "indicare-toast";
  toastEl.className = "indicare-toast";
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  setTimeout(() => toastEl.remove(), 4200);
}
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
