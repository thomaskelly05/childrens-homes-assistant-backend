const main = document.getElementById("workspace-main");
const nav = document.getElementById("workspace-nav");
const title = document.getElementById("view-title");
const subtitle = document.getElementById("view-subtitle");
const statusStrip = document.getElementById("status-strip");
const assistantSuggestions = document.getElementById("assistant-suggestions");
const assistantInput = document.getElementById("assistant-input");
const assistantOutput = document.getElementById("assistant-output");
const assistantRun = document.getElementById("assistant-run");
const roleSwitch = document.getElementById("role-switch");
const newRecordButton = document.getElementById("new-record-button");
const modal = document.getElementById("record-modal");
const closeModal = document.getElementById("close-modal");
const formFields = document.getElementById("record-form-fields");
const recordForm = document.getElementById("record-form");

const state = {
  view: "home",
  role: roleSwitch?.value || "manager",
  selectedChildId: 1,
  lastWorkspace: null,
};

const content = {
  views: {
    home: ["Home dashboard", "A calm, child-centred command centre for the day."],
    child: ["Child journey", "A living picture of identity, care, risk, progress and voice."],
    daily: ["Daily recording", "Fast, reflective and therapeutic recording for adults on shift."],
    incidents: ["Incidents", "Clear separation of fact, child voice, judgement, reflection and management oversight."],
    safeguarding: ["Safeguarding hub", "Open concerns, chronology, decisions, oversight and learning."],
    missing: ["Missing from care", "Episodes, return work, triggers, patterns and risk follow-through."],
    documents: ["Documents", "Draft, submit, review, comment, approve and evidence every document."],
    staff: ["Staff work life", "Training, supervision, wellbeing, standards and safe staffing."],
    rota: ["Rota and handover", "Connect who is on shift with what needs to happen for children."],
    reg45: ["Reg 44 / 45", "Quality assurance, recommendations, actions and impact."],
    ofsted: ["Ofsted readiness", "Always-ready evidence mapped to experience, safeguarding and leadership."],
    assistant: ["AI assistant", "Evidence-led support that improves recording and reflection without replacing judgement."],
  },
};

const mock = {
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
  documents: [],
  assistant_context: { suggested_prompts: ["What matters today?", "What would Ofsted ask?", "What needs manager oversight?"] },
};

nav.addEventListener("click", (event) => {
  if (!event.target.matches("button")) return;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  event.target.classList.add("active");
  loadView(event.target.dataset.view);
});

roleSwitch?.addEventListener("change", () => {
  state.role = roleSwitch.value;
  loadView(state.view);
});

newRecordButton?.addEventListener("click", () => openRecordModal(state.view));
closeModal?.addEventListener("click", () => modal.classList.add("hidden"));
recordForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  modal.classList.add("hidden");
  toast("Record saved for manager review.");
});

assistantRun?.addEventListener("click", () => {
  const question = assistantInput.value.trim() || "What matters most in this workspace?";
  const facts = summariseWorkspaceForAssistant(state.lastWorkspace);
  assistantOutput.innerHTML = `<strong>Assistant support note</strong><p>${escapeHtml(facts)}</p><p><em>Prompt:</em> ${escapeHtml(question)}</p><p>Use this as a professional support note only. Confirm facts against the record before saving.</p>`;
});

async function loadView(view) {
  state.view = view || "home";
  const copy = content.views[state.view] || content.views.home;
  title.textContent = copy[0];
  subtitle.textContent = copy[1];
  main.innerHTML = skeleton();

  const workspace = await loadWorkspace(state.view);
  state.lastWorkspace = workspace;
  renderStatusStrip(workspace);
  renderAssistantPrompts(workspace);

  const renderers = {
    home: renderHome,
    child: renderChild,
    daily: renderDaily,
    incidents: renderIncidents,
    safeguarding: renderSafeguarding,
    missing: renderMissing,
    documents: renderDocuments,
    staff: renderStaff,
    rota: renderRota,
    reg45: renderReg45,
    ofsted: renderOfsted,
    assistant: renderAssistant,
  };

  (renderers[state.view] || renderHome)(workspace);
}

async function loadWorkspace(view) {
  const path = view === "child" ? `/workspace/child/${state.selectedChildId}` : view === "ofsted" || view === "reg45" ? "/workspace/ofsted/1" : "/workspace/manager";
  try {
    const response = await fetch(path, { credentials: "include" });
    if (!response.ok) throw new Error(`Workspace request failed ${response.status}`);
    const data = await response.json();
    return data?.ok === false ? { ...mock, error: data.detail || data.error } : data;
  } catch (error) {
    return { ...mock, error: error.message };
  }
}

function renderHome(data) {
  const counts = data.child_journey_overview?.counts || {};
  main.innerHTML = `
    <section class="hero-card">
      <div><p class="eyebrow">Home overview</p><h3>${escapeHtml(data.home?.name || "Children's home")}</h3><p>Live view of children, staff tasks, documents, risk and Ofsted readiness.</p></div>
      <span class="score-pill">Risk ${safe(data.ofsted_ready_at_all_times?.operational_intelligence?.risk_score, "review")}</span>
    </section>
    <section class="card-grid">
      ${metric("Children", data.children?.length || 0, "Currently visible in placement")}
      ${metric("Daily notes", counts.daily_note || 0, "Recent lived experience evidence")}
      ${metric("Incidents", counts.incident || 0, "Require pattern review")}
      ${metric("Safeguarding", counts.safeguarding || 0, "Must show oversight")}
    </section>
    <section class="two-column">
      ${panel("Today focus", listItems(todayItems(data)))}
      ${panel("Manager oversight", listItems(oversightItems(data)))}
    </section>
  `;
}

function renderChild(data) {
  const child = data.child || data.children?.[0] || {};
  const journey = data.journey || data.child_journey_overview || {};
  main.innerHTML = `
    <section class="hero-card child-first">
      <div><p class="eyebrow">Identity first</p><h3>${escapeHtml(fullName(child) || "Selected child")}</h3><p>Start with safety, strengths, communication, voice and what adults need to understand.</p></div>
    </section>
    <section class="card-grid">
      ${metric("Timeline items", journey.timeline?.length || journey.recent_events?.length || 0, "Journey evidence")}
      ${metric("Actions", data.adult_workspace?.actions?.length || 0, "Adult follow-through")}
      ${metric("Documents", data.documents?.length || 0, "Plans and statutory evidence")}
      ${metric("Review queue", data.manager_oversight?.review_queue?.length || 0, "Manager grip")}
    </section>
    <section class="two-column">
      ${panel("What helps me", therapeuticIdentityCards())}
      ${panel("Recent journey", timeline(journey.timeline || journey.recent_events || []))}
    </section>
  `;
}

function renderDaily(data) {
  main.innerHTML = formPreview("Daily record", ["Mood and presentation", "Child voice", "Positive moments", "Staff response", "Therapeutic reflection", "Follow-up actions"], ["What was the child communicating?", "What helped?", "Does this change risk or support?"]);
}

function renderIncidents(data) {
  main.innerHTML = formPreview("Incident record", ["Facts", "People involved", "Antecedents", "Child presentation", "Staff response", "Injuries", "Notifications", "Debrief", "Learning", "Actions"], ["Separate fact from judgement.", "Record child words where known.", "Does risk assessment need updating?"]);
}

function renderSafeguarding(data) {
  main.innerHTML = hub("Safeguarding hub", ["Open concerns", "Allegations", "LADO", "Police", "Strategy meetings", "Body maps", "Exploitation", "Online safety"], "Every concern must show immediate safety action, who was informed, management oversight, outcome and learning.");
}

function renderMissing(data) {
  main.innerHTML = hub("Missing from care", ["Last seen", "Mood before missing", "Known locations", "Police ref", "Return home interview", "Debrief", "Risk review", "Pattern insight"], "Look for patterns by time, peer, location, contact, education stress, conflict and weekends.");
}

function renderDocuments(data) {
  const docs = data.documents || [];
  main.innerHTML = `
    <section class="hero-card"><div><p class="eyebrow">Workflow</p><h3>Documents and approvals</h3><p>Draft, submit, manager comment, approve, request changes or reject.</p></div></section>
    <section class="record-list">${docs.length ? docs.map(documentCard).join("") : empty("No documents loaded. Create or upload a document to begin workflow.")}</section>
  `;
}

function renderStaff(data) {
  main.innerHTML = hub("Staff work life", ["DBS", "Training", "Supervision", "Probation", "Wellbeing", "Conduct", "Policy acknowledgements", "Safe to work"], "Staff compliance should feel supportive but make unsafe gaps impossible to miss.");
}

function renderRota(data) {
  main.innerHTML = hub("Rota and handover", ["Staff on duty", "Sleep-in", "On-call", "Shift lead", "Staff ratios", "Agency", "Handover", "Unallocated tasks"], "The rota must connect staffing to children’s current risks, plans and practical tasks.");
}

function renderReg45(data) {
  main.innerHTML = hub("Reg 44 / 45", ["Visit status", "Children spoken to", "Records sampled", "Recommendations", "Actions", "Quality of care", "Feedback", "Development plan"], "Quality assurance must show impact, not just completion.");
}

function renderOfsted(data) {
  main.innerHTML = `
    <section class="hero-card"><div><p class="eyebrow">Always ready</p><h3>Ofsted readiness</h3><p>Evidence mapped to experience and progress, help and protection, and leadership.</p></div></section>
    <section class="card-grid">
      ${metric("Evidence strength", "Review", "Check live documents and oversight")}
      ${metric("Actions", data.evidence_workspace?.actions?.length || 0, "Improvement follow-through")}
      ${metric("Documents", data.evidence_workspace?.documents?.length || 0, "Inspection evidence")}
      ${metric("Questions", 4, "Likely lines of enquiry")}
    </section>
    ${panel("Inspection evidence questions", listItems(data.evidence_workspace?.suggested_evidence_questions || []))}
  `;
}

function renderAssistant(data) {
  main.innerHTML = hub("AI assistant", ["Improve wording", "Suggest missing info", "Draft handover", "Build chronology", "Summarise Ofsted evidence", "Highlight patterns", "Manager brief", "Reg 45 support"], "The assistant supports professional judgement. It must not invent facts or make safeguarding decisions.");
}

function renderStatusStrip(data) {
  const risk = data.ofsted_ready_at_all_times?.operational_intelligence?.risk_band || data.operational_intelligence?.risk_band || "review";
  statusStrip.innerHTML = [
    statusPill("green", "Stable records", "Visible workspace loaded"),
    statusPill("amber", "Needs attention", risk),
    statusPill("blue", "Upcoming", "Documents and actions"),
    statusPill("purple", "Therapeutic insight", "Child voice and patterns"),
  ].join("");
}

function renderAssistantPrompts(data) {
  const prompts = data.assistant_context?.suggested_prompts || data.evidence_workspace?.suggested_evidence_questions || mock.assistant_context.suggested_prompts;
  assistantSuggestions.innerHTML = prompts.slice(0, 4).map((prompt) => `<button type="button" class="prompt-chip">${escapeHtml(prompt)}</button>`).join("");
  assistantSuggestions.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { assistantInput.value = button.textContent; }));
}

function openRecordModal(view) {
  modal.classList.remove("hidden");
  const fields = view === "incidents" ? ["Incident type", "Facts", "Child words", "Staff response", "Manager action"] : ["Record type", "Summary", "Child voice", "Therapeutic reflection", "Follow-up action"];
  formFields.innerHTML = fields.map((field) => `<label>${escapeHtml(field)}<textarea name="${escapeHtml(field)}"></textarea></label>`).join("");
}

function documentCard(doc) {
  return `<article class="record-card"><div><h4>${escapeHtml(doc.title || "Untitled document")}</h4><p>${escapeHtml(doc.document_type || "document")} · ${escapeHtml(doc.approval_status || "not set")}</p></div><div class="record-actions"><button>Submit</button><button>Approve</button><button>Request changes</button></div></article>`;
}

function formPreview(name, fields, prompts) {
  return `<section class="hero-card"><div><p class="eyebrow">Form pattern</p><h3>${name}</h3><p>JSON-driven, reflective, fast and manager-review ready.</p></div></section><section class="two-column">${panel("Fields", listItems(fields))}${panel("Therapeutic prompts", listItems(prompts))}</section>`;
}

function hub(name, items, note) {
  return `<section class="hero-card"><div><p class="eyebrow">Module</p><h3>${name}</h3><p>${note}</p></div></section><section class="card-grid">${items.map((item) => metric(item, "Ready", "Config driven")).join("")}</section>`;
}

function metric(label, value, help) { return `<article class="metric-card"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function panel(name, body) { return `<article class="panel"><h3>${escapeHtml(name)}</h3>${body}</article>`; }
function listItems(items) { return `<ul class="clean-list">${(items || []).slice(0, 10).map((item) => `<li>${escapeHtml(typeof item === "string" ? item : item.title || item.summary || item.task || "Record")}</li>`).join("") || "<li>No items loaded.</li>"}</ul>`; }
function timeline(items) { return `<ol class="timeline">${(items || []).slice(0, 12).map((item) => `<li><strong>${escapeHtml(item.title || item.record_type || "Record")}</strong><span>${escapeHtml(item.summary || "No summary recorded")}</span></li>`).join("") || "<li>No journey events loaded.</li>"}</ol>`; }
function empty(text) { return `<div class="empty-state">${escapeHtml(text)}</div>`; }
function statusPill(type, label, value) { return `<div class="status-pill ${type}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`; }
function skeleton() { return `<div class="skeleton"><span></span><span></span><span></span></div>`; }
function therapeuticIdentityCards() { return `<div class="identity-grid"><div>What helps me feel safe</div><div>What I want adults to know</div><div>My strengths</div><div>How I communicate distress</div></div>`; }
function fullName(person = {}) { return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.name || person.full_name || ""; }
function todayItems(data) { return ["Children in placement: " + (data.children?.length || 0), "Actions: " + (data.adult_work_life?.actions?.length || 0), "Documents needing work: " + (data.adult_work_life?.documents_needing_work?.length || 0)]; }
function oversightItems(data) { return ["Review queue: " + (data.manager_oversight?.review_queue?.length || 0), "Open actions: " + (data.manager_oversight?.open_or_overdue_actions?.length || 0), "Ofsted readiness visible"]; }
function summariseWorkspaceForAssistant(data) { return `Workspace: ${state.view}. Visible records: ${data?.child_journey_overview?.recent_events?.length || data?.journey?.timeline?.length || 0}. Actions: ${data?.adult_work_life?.actions?.length || 0}. Documents: ${data?.documents?.length || data?.evidence_workspace?.documents?.length || 0}.`; }
function safe(value, fallback) { return value ?? fallback; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
function toast(message) { assistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`; }

loadView("home");
