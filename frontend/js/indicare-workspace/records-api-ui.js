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
let currentLifeArea = "daily";

const recordViews = {
  daily: { view: "daily", type: "daily", title: "Daily recording", text: "Daily lived experience, child voice and staff response." },
  incidents: { view: "incidents", type: "incident", title: "Incidents", text: "Incident records, debriefs, learning and oversight." },
  safeguarding: { view: "safeguarding", type: "safeguarding", title: "Safeguarding", text: "Concerns, actions, notifications and outcomes." },
  missing: { view: "missing", type: "missing", title: "Missing from care", text: "Missing episodes, return work and risk review." },
};

const lifeForms = {
  identity: { type: "daily", title: "Identity and belonging", prompt: "Record how the child understands themselves, their culture, religion, identity expression, belonging and what matters to them.", fields: [["identity_update", "textarea", "What changed or was expressed about identity/belonging?"], ["what_matters", "textarea", "What matters to the child?"], ["adult_response", "textarea", "How did adults support identity and belonging?"]] },
  safety: { type: "safeguarding", title: "Safety and protection", prompt: "Record safety concerns clearly: immediate action, who was informed, outcome and next steps.", fields: [["description", "textarea", "What is the safety concern?"], ["immediate_action", "textarea", "Immediate safety action"], ["notifications", "textarea", "Who was informed and when?"], ["outcome", "textarea", "Outcome / next steps"]] },
  emotional: { type: "daily", title: "Emotional wellbeing", prompt: "Capture emotional presentation, regulation, triggers, what helped and what adults learned.", fields: [["mood", "select", "Mood / presentation"], ["trigger", "textarea", "Known or possible trigger"], ["regulation", "textarea", "What helped regulate the child?"], ["reflection", "textarea", "Therapeutic reflection"]] },
  relationships: { type: "daily", title: "Relationships", prompt: "Record family time, peer dynamics, trusted adults, risky relationships and emotional impact.", fields: [["relationship", "text", "Who was involved?"], ["contact_impact", "textarea", "Impact on the child"], ["risk_or_strength", "textarea", "Risk, strength or support need"], ["staff_response", "textarea", "Adult response"]] },
  education: { type: "daily", title: "Education and learning", prompt: "Record attendance, engagement, barriers, achievements and support provided.", fields: [["attendance", "select", "Attendance"], ["school_experience", "textarea", "School/learning experience"], ["barriers", "textarea", "Barriers or worries"], ["achievement", "textarea", "Achievement or progress"]] },
  health: { type: "daily", title: "Health and body", prompt: "Record sleep, diet, medication, appointments, CAMHS, physical and emotional health.", fields: [["sleep", "text", "Sleep"], ["food", "text", "Food / appetite"], ["health_observation", "textarea", "Health observation"], ["follow_up", "textarea", "Follow-up needed"]] },
  daily: { type: "daily", title: "Daily lived experience", prompt: "Record the child’s actual day: what happened, how it felt, child voice, adult response and follow-up.", fields: [["mood", "select", "Mood"], ["what_happened", "textarea", "What happened today?"], ["child_voice", "textarea", "Child voice / communication"], ["staff_response", "textarea", "Staff response"], ["reflection", "textarea", "Therapeutic reflection"], ["actions", "textarea", "Follow-up actions"]] },
  behaviour: { type: "incident", title: "Behaviour as communication", prompt: "Record behaviour as communication: antecedent, what happened, child state, adult response, debrief and learning.", fields: [["incident_type", "text", "Behaviour / incident type"], ["trigger", "textarea", "Antecedent / trigger"], ["description", "textarea", "What happened? Facts only."], ["child_voice", "textarea", "Child voice / emotional state"], ["staff_response", "textarea", "Adult response"], ["learning", "textarea", "Debrief / learning / plan update needed"]] },
  independence: { type: "daily", title: "Independence and life skills", prompt: "Record practical life skills, confidence, choices, routines, money, cooking and self-care.", fields: [["skill_area", "text", "Skill area"], ["what_happened", "textarea", "What did the child do?"], ["support_given", "textarea", "Support given"], ["progress", "textarea", "Progress / next step"]] },
  achievements: { type: "daily", title: "Strengths and achievements", prompt: "Record strengths, talents, positive moments, praise, recognition and progress.", fields: [["achievement", "textarea", "Achievement / positive moment"], ["strength", "textarea", "Strength shown"], ["adult_response", "textarea", "How was this recognised?"], ["outcome", "textarea", "Impact on the child"]] },
  plans: { type: "daily", title: "Plans and assessments", prompt: "Record updates needed to placement plan, risk assessment, missing plan, health, education or behaviour support plan.", fields: [["plan_type", "select", "Plan type"], ["reason", "textarea", "Why does the plan need review?"], ["evidence", "textarea", "Evidence from records"], ["action", "textarea", "Required action"]] },
  voice: { type: "daily", title: "Child voice and wishes", prompt: "Record direct quotes, non-verbal communication, wishes, feelings, complaints and choices.", fields: [["child_voice", "textarea", "What did the child say or communicate?"], ["context", "textarea", "Context"], ["adult_response", "textarea", "How did adults respond?"], ["action", "textarea", "What changed because of the child’s voice?"]] },
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

if (recordCreate) recordCreate.addEventListener("click", (event) => { event.preventDefault(); openRecordChooser(); }, true);
if (recordClose) recordClose.addEventListener("click", () => recordModal.classList.add("hidden"));

window.openWorkspaceForm = function(type = "daily", lifeArea = null) {
  const key = lifeArea || type;
  if (lifeForms[key]) return openLifeAreaRecordForm(key);
  openRecordForm(type);
};
window.openLifeAreaRecordForm = openLifeAreaRecordForm;
window.showWorkspaceRecordList = showRecordList;

async function showRecordList(type, heading, text) {
  currentRecordType = type;
  if (recordsTitle) recordsTitle.textContent = heading;
  if (recordsSubtitle) recordsSubtitle.textContent = text;
  if (!recordsMain) return;
  const ctx = context();
  recordsMain.innerHTML = `<section class="hero-card"><div><p class="eyebrow">${escapeHtml(ctx.childName)} record</p><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(text)}</p></div><button type="button" class="primary-action" id="quick-create-record">Create ${escapeHtml(heading)}</button></section><section id="real-record-list" class="record-list"><div class="empty-state">Loading records for ${escapeHtml(ctx.childName)}...</div></section>`;
  document.getElementById("quick-create-record")?.addEventListener("click", () => openRecordForm(type));
  const data = await getJson(`/workspace-records/${encodeURIComponent(type)}?young_person_id=${encodeURIComponent(ctx.childId)}`);
  const list = document.getElementById("real-record-list");
  if (!data || !data.ok) { list.innerHTML = `<div class="warning-banner">${escapeHtml(data?.error || "Could not load records.")}</div>`; return; }
  const records = data.records || [];
  list.innerHTML = records.length ? records.map(cardHtml).join("") : `<div class="empty-state">No records yet for ${escapeHtml(ctx.childName)}. Create the first one.</div>`;
  list.querySelectorAll(".clickable-record").forEach((card) => card.addEventListener("click", () => openRecordDetail(JSON.parse(card.dataset.record || "{}"))));
}

function openRecordChooser() {
  const ctx = context();
  recordModal.classList.remove("hidden");
  if (recordGuidance) recordGuidance.innerHTML = `<div class="guidance-panel"><strong>Child-centred recording</strong><p>You are recording for ${escapeHtml(ctx.childName)} in ${escapeHtml(ctx.homeName)}.</p></div>`;
  recordFields.innerHTML = `<div class="form-row"><label>Choose life area</label><select id="record-type-choice">${Object.entries(lifeForms).map(([key, form]) => `<option value="${key}">${escapeHtml(form.title)}</option>`).join("")}</select></div><button type="button" class="primary-action" id="record-type-next">Continue</button>`;
  document.getElementById("record-type-next")?.addEventListener("click", () => openLifeAreaRecordForm(document.getElementById("record-type-choice").value));
}

function openRecordForm(type) {
  currentLifeArea = type;
  const mapped = Object.entries(lifeForms).find(([, value]) => value.type === type)?.[0] || "daily";
  openLifeAreaRecordForm(mapped);
}

function openLifeAreaRecordForm(key) {
  const config = lifeForms[key] || lifeForms.daily;
  const ctx = context();
  currentLifeArea = key;
  currentRecordType = config.type;
  recordModal.classList.remove("hidden");
  if (recordGuidance) recordGuidance.innerHTML = `<div class="guidance-panel"><strong>${escapeHtml(config.title)}</strong><p>${escapeHtml(config.prompt)}</p></div>`;
  recordFields.innerHTML = formHtml(config, ctx);
}

function formHtml(config, ctx) {
  const common = `<input type="hidden" name="young_person_id" value="${escapeHtml(ctx.childId)}" /><input type="hidden" name="home_id" value="${escapeHtml(ctx.homeId)}" /><input type="hidden" name="life_area" value="${escapeHtml(currentLifeArea)}" /><div class="form-row"><label>Child</label><input value="${escapeHtml(ctx.childName)}" disabled /></div><div class="form-row"><label>Home</label><input value="${escapeHtml(ctx.homeName)}" disabled /></div><div class="form-row"><label>Title</label><input name="title" placeholder="Short title" /></div>`;
  return common + config.fields.map(([name, fieldType, label]) => fieldHtml(name, fieldType, label)).join("");
}

function fieldHtml(name, fieldType, label) {
  if (fieldType === "textarea") return `<div class="form-row"><label>${escapeHtml(label)}</label><textarea name="${escapeHtml(name)}"></textarea></div>`;
  if (fieldType === "select" && name === "mood") return `<div class="form-row"><label>${escapeHtml(label)}</label><select name="${escapeHtml(name)}"><option>Settled</option><option>Happy</option><option>Anxious</option><option>Low</option><option>Angry</option><option>Withdrawn</option><option>Dysregulated</option></select></div>`;
  if (fieldType === "select" && name === "attendance") return `<div class="form-row"><label>${escapeHtml(label)}</label><select name="${escapeHtml(name)}"><option>Attended</option><option>Partial attendance</option><option>Refused</option><option>Excluded</option><option>Not scheduled</option></select></div>`;
  if (fieldType === "select" && name === "plan_type") return `<div class="form-row"><label>${escapeHtml(label)}</label><select name="${escapeHtml(name)}"><option>Placement plan</option><option>Risk assessment</option><option>Behaviour support plan</option><option>Missing plan</option><option>Health plan</option><option>Education plan</option></select></div>`;
  return `<div class="form-row"><label>${escapeHtml(label)}</label><input name="${escapeHtml(name)}" /></div>`;
}

if (recordForm) {
  recordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(recordForm).entries());
    payload.status = "submitted_for_review";
    payload.recorded_from = "child_life_area";
    const data = await postJson(`/workspace-records/${encodeURIComponent(currentRecordType)}`, payload);
    if (!data || !data.ok) { toast(data?.error || "Record could not be saved."); return; }
    recordModal.classList.add("hidden");
    toast(`${humanise(currentLifeArea)} record saved for ${context().childName} and submitted for review.`);
    const view = Object.values(recordViews).find((item) => item.type === currentRecordType);
    showRecordList(currentRecordType, view?.title || humanise(currentRecordType), view?.text || "Records");
  }, true);
}

function cardHtml(record) {
  const data = escapeHtml(JSON.stringify(record));
  const lifeArea = record.content?.life_area || record.record_type || "record";
  return `<article class="record-card clickable-record" data-record="${data}"><div><div class="review-meta"><span class="mini-tag">${escapeHtml(humanise(lifeArea))}</span><span class="mini-tag">${escapeHtml(record.status || "submitted")}</span></div><h4>${escapeHtml(record.title || "Untitled record")}</h4><p>${escapeHtml(record.summary || "Open this record for full detail.")}</p><small>${escapeHtml(record.updated_at || record.created_at || "No date")}</small></div><div class="record-actions"><button type="button">Open</button></div></article>`;
}

function openRecordDetail(record) {
  const content = record.content && typeof record.content === "object" ? record.content : {};
  const overlay = document.createElement("div");
  overlay.className = "record-detail-overlay";
  overlay.innerHTML = `<div class="record-detail-card"><div class="modal-header"><div><p class="eyebrow">${escapeHtml(humanise(content.life_area || record.record_type || "record"))}</p><h3>${escapeHtml(record.title || "Record detail")}</h3></div><button type="button" class="icon-button" data-close-record-detail>x</button></div><div class="detail-grid"><div class="detail-item"><strong>Status</strong><br>${escapeHtml(record.status || "unknown")}</div><div class="detail-item"><strong>Young person</strong><br>#${escapeHtml(record.young_person_id || "?")}</div><div class="detail-item"><strong>Created</strong><br>${escapeHtml(record.created_at || "unknown")}</div><div class="detail-item"><strong>Reviewed</strong><br>${escapeHtml(record.reviewed_at || "Not yet")}</div></div><h4>Summary</h4><p>${escapeHtml(record.summary || "No summary.")}</p><h4>Full content</h4><div class="panel">${Object.entries(content).map(([k,v]) => `<p><strong>${escapeHtml(humanise(k))}:</strong> ${escapeHtml(v)}</p>`).join("") || "No structured content."}</div></div>`;
  overlay.querySelector("[data-close-record-detail]").addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

function context() { return window.IndiCareContext?.get?.() || { homeId: "1", homeName: "Main home", childId: "1", childName: "Child A" }; }
async function getJson(url) { try { const response = await fetch(url, { credentials: "include" }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
async function postJson(url, payload) { try { const response = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); return await response.json(); } catch (error) { return { ok: false, error: error.message }; } }
function toast(message) { if (recordAssistantOutput) recordAssistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`; }
function humanise(value) { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
