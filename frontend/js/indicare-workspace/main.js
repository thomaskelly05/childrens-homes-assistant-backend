const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  main: $("#workspace-main"),
  nav: $("#workspace-nav"),
  title: $("#view-title"),
  subtitle: $("#view-subtitle"),
  status: $("#status-strip"),
  assistantSuggestions: $("#assistant-suggestions"),
  assistantInput: $("#assistant-input"),
  assistantOutput: $("#assistant-output"),
  assistantRun: $("#assistant-run"),
  roleSwitch: $("#role-switch"),
  newRecordButton: $("#new-record-button"),
  modal: $("#record-modal"),
  closeModal: $("#close-modal"),
  form: $("#record-form"),
  formFields: $("#record-form-fields"),
  modalTitle: $("#record-modal-title"),
};

const state = {
  view: "home",
  selectedChildId: 1,
  role: els.roleSwitch?.value || "manager",
  workspace: null,
  activeSchemaKey: "daily_record",
  formConfig: null,
};

const viewText = {
  home: ["Home dashboard", "A calm, child-centred command centre for the day."],
  child: ["Child journey", "A living picture of identity, care, risk, progress and voice."],
  daily: ["Daily recording", "Fast, reflective and therapeutic recording for adults on shift."],
  incidents: ["Incidents", "Separate fact, child voice, judgement, reflection and oversight."],
  safeguarding: ["Safeguarding hub", "Concerns, chronology, decisions, oversight and learning."],
  missing: ["Missing from care", "Episodes, return work, triggers, patterns and follow-through."],
  documents: ["Documents", "Draft, submit, review, comment, approve and evidence every document."],
  staff: ["Staff work life", "Training, supervision, wellbeing, standards and safe staffing."],
  rota: ["Rota and handover", "Connect who is on shift with what children need today."],
  reg45: ["Reg 44 / 45", "Quality assurance, recommendations, actions and impact."],
  ofsted: ["Ofsted readiness", "Always-ready evidence for experience, safeguarding and leadership."],
  assistant: ["AI assistant", "Evidence-led support that improves recording and reflection."],
};

const fallbackForms = {
  daily_record: {
    title: "Daily record",
    description: "Record the child's day clearly and with reflection.",
    fields: [
      { id: "mood", label: "Mood and presentation", type: "textarea", help: "What did adults observe?" },
      { id: "child_voice", label: "Child voice", type: "textarea", help: "Record the child's own words where known." },
      { id: "positive_moments", label: "Positive moments", type: "textarea", help: "Strengths, connection, achievements or progress." },
      { id: "staff_response", label: "Staff response", type: "textarea", help: "What did adults do?" },
      { id: "therapeutic_reflection", label: "Therapeutic reflection", type: "textarea", help: "What does this tell us?" },
      { id: "follow_up", label: "Follow-up actions", type: "textarea", help: "What happens next?" },
    ],
  },
  incident: {
    title: "Incident record",
    description: "Separate fact, child voice, judgement and management review.",
    fields: [
      { id: "incident_type", label: "Incident type", type: "select", options: ["Physical aggression", "Missing from home", "Safeguarding concern", "Medication error", "Allegation", "Staff conduct concern", "Other"] },
      { id: "facts", label: "Facts", type: "textarea", help: "What happened? Avoid assumptions." },
      { id: "child_words", label: "Child words or view", type: "textarea" },
      { id: "antecedents", label: "Antecedents and triggers", type: "textarea" },
      { id: "staff_response", label: "Staff response", type: "textarea" },
      { id: "learning", label: "Learning and follow-up", type: "textarea" },
    ],
  },
};

const mockWorkspace = {
  ok: true,
  home: { name: "IndiCare Children's Home", ofsted_urn: "URN pending" },
  children: [
    { id: 1, first_name: "Child", last_name: "A", placement_status: "In placement" },
    { id: 2, first_name: "Child", last_name: "B", placement_status: "In placement" },
  ],
  child_journey_overview: { counts: { daily_note: 6, incident: 2, safeguarding: 1, keywork: 3 }, recent_events: [] },
  adult_work_life: { actions: [], documents_needing_work: [] },
  manager_oversight: { review_queue: [], open_or_overdue_actions: [] },
  ofsted_ready_at_all_times: { operational_intelligence: { risk_score: 38, risk_band: "review", alerts: [] } },
  evidence_workspace: { documents: [], actions: [], suggested_evidence_questions: ["Where is child voice visible?", "Where is leadership oversight evidenced?", "Which risks have clear follow-through?"] },
  documents: [],
  assistant_context: { suggested_prompts: ["What matters today?", "What would Ofsted ask?", "What needs manager oversight?"] },
};

window.submitDocument = (id) => documentWorkflow("submit", id);
window.approveDocument = (id) => documentWorkflow("approve", id);
window.rejectDocument = (id) => documentWorkflow("reject", id);
window.requestDocumentChanges = (id) => documentWorkflow("request-changes", id);
window.openWorkspaceForm = (schemaKey) => openForm(schemaKey);

boot();

async function boot() {
  state.formConfig = await loadFormConfig();
  bindEvents();
  await loadView("home");
}

function bindEvents() {
  els.nav?.addEventListener("click", (event) => {
    if (!event.target.matches("button")) return;
    $$(".nav-item").forEach((button) => button.classList.remove("active"));
    event.target.classList.add("active");
    loadView(event.target.dataset.view);
  });

  els.roleSwitch?.addEventListener("change", () => {
    state.role = els.roleSwitch.value;
    loadView(state.view);
  });

  els.newRecordButton?.addEventListener("click", () => openForm(state.view === "incidents" ? "incident" : "daily_record"));
  els.closeModal?.addEventListener("click", () => closeForm());
  els.form?.addEventListener("submit", submitRecordForm);
  els.assistantRun?.addEventListener("click", runAssistant);
}

async function loadFormConfig() {
  try {
    const response = await fetch("/content/en-GB/formWording.json", { credentials: "include" });
    if (!response.ok) throw new Error("Form config unavailable");
    return await response.json();
  } catch {
    return fallbackForms;
  }
}

async function loadView(view) {
  state.view = view || "home";
  const copy = viewText[state.view] || viewText.home;
  els.title.textContent = copy[0];
  els.subtitle.textContent = copy[1];
  els.main.innerHTML = skeleton();

  const workspace = await loadWorkspace(state.view);
  state.workspace = workspace;
  renderStatus(workspace);
  renderAssistantPrompts(workspace);

  const renderers = {
    home: renderHome,
    child: renderChild,
    daily: () => renderFormScreen("daily_record"),
    incidents: () => renderFormScreen("incident"),
    safeguarding: () => renderHub("Safeguarding hub", ["Open concerns", "Allegations", "LADO", "Police", "Strategy meetings", "Body maps", "Exploitation", "Online safety"], "Every concern must show immediate safety action, who was informed, oversight, outcome and learning."),
    missing: () => renderHub("Missing from care", ["Last seen", "Mood before missing", "Known locations", "Police reference", "Return home interview", "Debrief", "Risk review", "Pattern insight"], "Look for patterns by time, peer, location, contact, education stress, conflict and weekends."),
    documents: renderDocuments,
    staff: () => renderHub("Staff work life", ["DBS", "Training", "Supervision", "Probation", "Wellbeing", "Conduct", "Policy acknowledgements", "Safe to work"], "Staff compliance should feel supportive but make unsafe gaps impossible to miss."),
    rota: () => renderHub("Rota and handover", ["Staff on duty", "Sleep-in", "On-call", "Shift lead", "Staff ratios", "Agency", "Handover", "Unallocated tasks"], "The rota must connect staffing to children’s current risks, plans and practical tasks."),
    reg45: renderOfsted,
    ofsted: renderOfsted,
    assistant: renderAssistantView,
  };

  (renderers[state.view] || renderHome)(workspace);
}

async function loadWorkspace(view) {
  const path = view === "child" ? `/workspace/child/${state.selectedChildId}` : view === "ofsted" || view === "reg45" ? "/workspace/ofsted/1" : "/workspace/manager";
  try {
    const response = await fetch(path, { credentials: "include" });
    if (!response.ok) throw new Error(`Workspace request failed ${response.status}`);
    const data = await response.json();
    return data?.ok === false ? { ...mockWorkspace, error: data.detail || data.error } : data;
  } catch (error) {
    return { ...mockWorkspace, error: error.message };
  }
}

function renderHome(data) {
  const counts = data.child_journey_overview?.counts || {};
  const riskScore = data.ofsted_ready_at_all_times?.operational_intelligence?.risk_score || data.operational_intelligence?.risk_score || "Review";
  els.main.innerHTML = `
    ${data.error ? warning(data.error) : ""}
    <section class="hero-card"><div><p class="eyebrow">Home overview</p><h3>${esc(data.home?.name || "Children's home")}</h3><p>Live view of children, staff tasks, documents, risk and Ofsted readiness.</p></div><span class="score-pill">Risk ${esc(riskScore)}</span></section>
    <section class="card-grid">${metric("Children", data.children?.length || 0, "Currently visible in placement")}${metric("Daily notes", counts.daily_note || 0, "Recent lived experience evidence")}${metric("Incidents", counts.incident || 0, "Require pattern review")}${metric("Safeguarding", counts.safeguarding || 0, "Must show oversight")}</section>
    <section class="two-column">${panel("Today focus", list(["Children in placement: " + (data.children?.length || 0), "Actions: " + (data.adult_work_life?.actions?.length || 0), "Documents needing work: " + (data.adult_work_life?.documents_needing_work?.length || 0)]))}${panel("Manager oversight", list(["Review queue: " + (data.manager_oversight?.review_queue?.length || 0), "Open actions: " + (data.manager_oversight?.open_or_overdue_actions?.length || 0), "Ofsted readiness visible"]))}</section>`;
}

function renderChild(data) {
  const child = data.child || data.children?.[0] || {};
  const journey = data.journey || data.child_journey_overview || {};
  els.main.innerHTML = `
    ${data.error ? warning(data.error) : ""}
    <section class="hero-card child-first"><div><p class="eyebrow">Identity first</p><h3>${esc(fullName(child) || "Selected child")}</h3><p>Start with safety, strengths, communication, voice and what adults need to understand.</p></div></section>
    <section class="card-grid">${metric("Timeline items", journey.timeline?.length || journey.recent_events?.length || 0, "Journey evidence")}${metric("Actions", data.adult_workspace?.actions?.length || 0, "Adult follow-through")}${metric("Documents", data.documents?.length || 0, "Plans and statutory evidence")}${metric("Review queue", data.manager_oversight?.review_queue?.length || 0, "Manager grip")}</section>
    <section class="two-column">${panel("What helps me", `<div class="identity-grid"><div>What helps me feel safe</div><div>What I want adults to know</div><div>My strengths</div><div>How I communicate distress</div></div>`)}${panel("Recent journey", timeline(journey.timeline || journey.recent_events || []))}</section>`;
}

function renderFormScreen(schemaKey) {
  const schema = getSchema(schemaKey);
  els.main.innerHTML = `<section class="hero-card"><div><p class="eyebrow">Config-driven form</p><h3>${esc(schema.title)}</h3><p>${esc(schema.description)}</p></div><button class="primary-action" onclick="openWorkspaceForm('${schemaKey}')">Open form</button></section><section class="form-preview">${schema.fields.map((f) => `<article class="record-card"><div><h4>${esc(f.label)}</h4><p>${esc(f.help || f.type || "Field")}</p></div><span class="mini-tag">${esc(f.type || "text")}</span></article>`).join("")}</section>`;
}

function renderDocuments(data) {
  const docs = data.documents || data.evidence_workspace?.documents || [];
  els.main.innerHTML = `${data.error ? warning(data.error) : ""}<section class="hero-card"><div><p class="eyebrow">Workflow</p><h3>Documents and approvals</h3><p>Draft, submit, manager comment, approve, request changes or reject.</p></div></section><section class="record-list">${docs.length ? docs.map(documentCard).join("") : empty("No documents loaded. Create or upload a document to begin workflow.")}</section>`;
}

function renderOfsted(data) {
  const evidence = data.evidence_workspace || {};
  els.main.innerHTML = `${data.error ? warning(data.error) : ""}<section class="hero-card"><div><p class="eyebrow">Always ready</p><h3>Ofsted readiness</h3><p>Evidence mapped to experience and progress, help and protection, and leadership.</p></div></section><section class="card-grid">${metric("Evidence strength", "Review", "Check live documents and oversight")}${metric("Actions", evidence.actions?.length || 0, "Improvement follow-through")}${metric("Documents", evidence.documents?.length || 0, "Inspection evidence")}${metric("Questions", evidence.suggested_evidence_questions?.length || 4, "Likely lines of enquiry")}</section>${panel("Inspection evidence questions", list(evidence.suggested_evidence_questions || []))}`;
}

function renderAssistantView() {
  els.main.innerHTML = renderHub("AI assistant", ["Improve wording", "Suggest missing info", "Draft handover", "Build chronology", "Summarise Ofsted evidence", "Highlight patterns", "Manager brief", "Reg 45 support"], "The assistant supports professional judgement. It must not invent facts or make safeguarding decisions.");
}

function renderHub(name, items, note) {
  return `<section class="hero-card"><div><p class="eyebrow">Module</p><h3>${esc(name)}</h3><p>${esc(note)}</p></div></section><section class="card-grid">${items.map((item) => metric(item, "Ready", "Config driven")).join("")}</section>`;
}

function openForm(schemaKey) {
  state.activeSchemaKey = schemaKey;
  const schema = getSchema(schemaKey);
  els.modal.classList.remove("hidden");
  els.modalTitle.textContent = schema.title;
  els.formFields.innerHTML = schema.fields.map(renderField).join("");
}

function closeForm() {
  els.modal.classList.add("hidden");
  els.form.reset();
}

async function submitRecordForm(event) {
  event.preventDefault();
  const formData = new FormData(els.form);
  const fields = Object.fromEntries(formData.entries());
  const recordType = state.activeSchemaKey === "incident" ? "incident" : "daily_record";

  if (recordType === "daily_record") fields.note_date = new Date().toISOString().slice(0, 10);
  if (recordType === "incident") fields.incident_datetime = new Date().toISOString();

  const payload = {
    record_type: recordType,
    young_person_id: state.selectedChildId,
    status: "submitted",
    fields,
  };

  try {
    const response = await fetch("/workspace/records", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.detail || data.error || `Save failed ${response.status}`);
    closeForm();
    toast("Record saved and sent for manager review.");
    await loadView(state.view === "daily" || state.view === "incidents" ? "child" : state.view);
  } catch (error) {
    toast(error.message || "Could not save record.");
  }
}

function renderField(field) {
  const help = field.help ? `<small>${esc(field.help)}</small>` : "";
  if (field.type === "select") return `<label>${esc(field.label)}<select name="${esc(field.id)}">${(field.options || []).map((option) => `<option value="${esc(option)}">${esc(option)}</option>`).join("")}</select>${help}</label>`;
  return `<label>${esc(field.label)}<textarea name="${esc(field.id)}" placeholder="${esc(field.help || "")}"></textarea>${help}</label>`;
}

async function documentWorkflow(action, id) {
  if (!id) return;
  try {
    const notes = action === "approve" ? "Approved from workspace" : action === "request-changes" ? "Changes requested from workspace" : action === "reject" ? "Rejected from workspace" : "Submitted from workspace";
    const response = await fetch(`/workspace/documents/${action}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: Number(id), notes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.detail || data.error || `Document workflow failed ${response.status}`);
    toast(`Document ${action.replace("-", " ")} completed.`);
    await loadView("documents");
  } catch (error) {
    toast(error.message);
  }
}

async function runAssistant() {
  const question = els.assistantInput.value.trim() || "What matters most in this workspace?";
  const payload = { young_person_id: state.selectedChildId, question: `${question}\n\nWorkspace context: ${summarise(state.workspace)}` };
  els.assistantOutput.innerHTML = "<p>Thinking with the workspace evidence...</p>";
  try {
    const response = await fetch("/assistant/os/reason", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Assistant failed ${response.status}`);
    els.assistantOutput.innerHTML = `<strong>Assistant support note</strong><p>${esc(data.answer || "No answer returned.")}</p>`;
  } catch (error) {
    els.assistantOutput.innerHTML = `<strong>Assistant support note</strong><p>${esc(summarise(state.workspace))}</p><small>${esc(error.message)}. Showing local support note instead.</small>`;
  }
}

function getSchema(key) { return state.formConfig?.[key] || fallbackForms[key] || fallbackForms.daily_record; }
function documentCard(doc) { const id = Number(doc.id); return `<article class="record-card"><div><h4>${esc(doc.title || "Untitled document")}</h4><p>${esc(doc.document_type || "document")} · ${esc(doc.approval_status || "not set")}</p></div><div class="record-actions"><button onclick="submitDocument(${id})">Submit</button><button onclick="approveDocument(${id})">Approve</button><button onclick="requestDocumentChanges(${id})">Changes</button><button onclick="rejectDocument(${id})">Reject</button></div></article>`; }
function renderStatus(data) { const risk = data.ofsted_ready_at_all_times?.operational_intelligence?.risk_band || data.operational_intelligence?.risk_band || "review"; els.status.innerHTML = [pill("green", "Stable records", "Workspace loaded"), pill("amber", "Needs attention", risk), pill("blue", "Upcoming", "Documents and actions"), pill("purple", "Therapeutic insight", "Child voice and patterns")].join(""); }
function renderAssistantPrompts(data) { const prompts = data.assistant_context?.suggested_prompts || data.evidence_workspace?.suggested_evidence_questions || mockWorkspace.assistant_context.suggested_prompts; els.assistantSuggestions.innerHTML = prompts.slice(0, 4).map((prompt) => `<button type="button" class="prompt-chip">${esc(prompt)}</button>`).join(""); $$(".prompt-chip").forEach((button) => button.addEventListener("click", () => { els.assistantInput.value = button.textContent; })); }
function metric(label, value, help) { return `<article class="metric-card"><strong>${esc(String(value))}</strong><span>${esc(label)}</span><small>${esc(help)}</small></article>`; }
function panel(name, body) { return `<article class="panel"><h3>${esc(name)}</h3>${body}</article>`; }
function list(items) { return `<ul class="clean-list">${(items || []).slice(0, 10).map((item) => `<li>${esc(typeof item === "string" ? item : item.title || item.summary || item.task || "Record")}</li>`).join("") || "<li>No items loaded.</li>"}</ul>`; }
function timeline(items) { return `<ol class="timeline">${(items || []).slice(0, 12).map((item) => `<li><strong>${esc(item.title || item.record_type || "Record")}</strong><span>${esc(item.summary || "No summary recorded")}</span></li>`).join("") || "<li>No journey events loaded.</li>"}</ol>`; }
function empty(text) { return `<div class="empty-state">${esc(text)}</div>`; }
function pill(type, label, value) { return `<div class="status-pill ${type}"><strong>${esc(label)}</strong><span>${esc(String(value))}</span></div>`; }
function warning(text) { return `<div class="warning-banner">${esc(text)}</div>`; }
function skeleton() { return `<div class="skeleton"><span></span><span></span><span></span></div>`; }
function fullName(person = {}) { return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.name || person.full_name || ""; }
function summarise(data) { return `Workspace: ${state.view}. Visible records: ${data?.child_journey_overview?.recent_events?.length || data?.journey?.timeline?.length || 0}. Actions: ${data?.adult_work_life?.actions?.length || 0}. Documents: ${data?.documents?.length || data?.evidence_workspace?.documents?.length || 0}.`; }
function toast(message) { els.assistantOutput.innerHTML = `<p>${esc(message)}</p>`; }
function esc(value) { return String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
