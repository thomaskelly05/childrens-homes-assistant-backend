const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const els = {
  main: $("#workspace-main"), nav: $("#workspace-nav"), title: $("#view-title"), subtitle: $("#view-subtitle"),
  status: $("#status-strip"), assistantSuggestions: $("#assistant-suggestions"), assistantInput: $("#assistant-input"),
  assistantOutput: $("#assistant-output"), assistantRun: $("#assistant-run"), roleSwitch: $("#role-switch"),
  newRecordButton: $("#new-record-button"), modal: $("#record-modal"), closeModal: $("#close-modal"),
  form: $("#record-form"), formFields: $("#record-form-fields"), modalTitle: $("#record-modal-title"),
};

const state = { view: "home", selectedChildId: 1, workspace: null, formConfig: null, activeSchemaKey: "daily_record" };

const viewText = {
  home: ["Home dashboard", "A calm, child-centred command centre for the day."],
  child: ["Child journey", "A living picture of identity, care, risk, progress and voice."],
  daily: ["Daily recording", "Fast, reflective and therapeutic recording for adults on shift."],
  incidents: ["Incidents", "Separate fact, child voice, judgement, reflection and oversight."],
  safeguarding: ["Safeguarding hub", "Concerns, chronology, decisions, oversight and learning."],
  missing: ["Missing from care", "Episodes, return work, triggers, patterns and follow-through."],
  documents: ["Documents", "Draft, submit, review, comment, approve and evidence every document."],
  review: ["Manager review", "Review, approve and return records with clear oversight."],
  staff: ["Staff work life", "Training, supervision, wellbeing, standards and safe staffing."],
  rota: ["Rota and handover", "Connect who is on shift with what children need today."],
  reg45: ["Reg 44 / 45", "Quality assurance, recommendations, actions and impact."],
  ofsted: ["Ofsted readiness", "Always-ready evidence for experience, safeguarding and leadership."],
  assistant: ["AI assistant", "Evidence-led support that improves recording and reflection."],
};

const fallbackForms = {
  daily_record: { title: "Daily record", description: "Record the child's day clearly and with reflection.", fields: [
    { id: "mood", label: "Mood and presentation", type: "textarea", help: "What did adults observe?" },
    { id: "child_voice", label: "Child voice", type: "textarea", help: "Record the child's own words where known." },
    { id: "positive_moments", label: "Positive moments", type: "textarea", help: "Strengths, connection, achievements or progress." },
    { id: "staff_response", label: "Staff response", type: "textarea", help: "What did adults do?" },
    { id: "therapeutic_reflection", label: "Therapeutic reflection", type: "textarea", help: "What does this tell us?" },
    { id: "follow_up", label: "Follow-up actions", type: "textarea", help: "What happens next?" },
  ]},
  incident: { title: "Incident record", description: "Separate fact, child voice, judgement and management review.", fields: [
    { id: "incident_type", label: "Incident type", type: "select", options: ["Physical aggression", "Missing from home", "Safeguarding concern", "Medication error", "Allegation", "Staff conduct concern", "Other"] },
    { id: "facts", label: "Facts", type: "textarea", help: "What happened? Avoid assumptions." },
    { id: "child_words", label: "Child words or view", type: "textarea" },
    { id: "antecedents", label: "Antecedents and triggers", type: "textarea" },
    { id: "staff_response", label: "Staff response", type: "textarea" },
    { id: "learning", label: "Learning and follow-up", type: "textarea" },
  ]},
};

const mockWorkspace = { ok: true, home: { name: "IndiCare Children's Home" }, children: [{ id: 1, first_name: "Child", last_name: "A" }], child_journey_overview: { counts: {}, recent_events: [] }, adult_work_life: { actions: [], documents_needing_work: [] }, manager_oversight: { review_queue: [], open_or_overdue_actions: [] }, documents: [], evidence_workspace: { documents: [], actions: [], suggested_evidence_questions: ["Where is child voice visible?", "Where is leadership oversight evidenced?", "Which risks have clear follow-through?"] }, assistant_context: { suggested_prompts: ["What matters today?", "What would Ofsted ask?", "What needs manager oversight?"] } };

window.openWorkspaceForm = (schemaKey) => openForm(schemaKey);
window.submitDocument = (id) => documentWorkflow("submit", id);
window.approveDocument = (id) => documentWorkflow("approve", id);
window.rejectDocument = (id) => documentWorkflow("reject", id);
window.requestDocumentChanges = (id) => documentWorkflow("request-changes", id);
window.reviewAction = (id, action) => reviewDecision(id, action);
window.loadView = loadView;

boot();

async function boot() { state.formConfig = await loadFormConfig(); bindEvents(); await loadView("home"); }
function bindEvents() { els.nav?.addEventListener("click", (e) => { if (!e.target.matches("button")) return; $$(".nav-item").forEach((b) => b.classList.remove("active")); e.target.classList.add("active"); loadView(e.target.dataset.view); }); els.newRecordButton?.addEventListener("click", () => openForm(state.view === "incidents" ? "incident" : "daily_record")); els.closeModal?.addEventListener("click", closeForm); els.form?.addEventListener("submit", submitRecordForm); els.assistantRun?.addEventListener("click", runAssistant); }
async function loadFormConfig() { try { const r = await fetch("/content/en-GB/formWording.json", { credentials: "include" }); return r.ok ? await r.json() : fallbackForms; } catch { return fallbackForms; } }

async function loadView(view) {
  state.view = view || "home";
  const copy = viewText[state.view] || viewText.home;
  els.title.textContent = copy[0]; els.subtitle.textContent = copy[1]; els.main.innerHTML = skeleton();
  const workspace = await loadWorkspace(state.view); state.workspace = workspace;
  renderStatus(workspace); renderAssistantPrompts(workspace);
  const renderers = { home: renderHome, child: renderChild, daily: () => renderFormScreen("daily_record"), incidents: () => renderFormScreen("incident"), safeguarding: () => renderHub("Safeguarding hub", ["Open concerns", "Allegations", "LADO", "Police", "Strategy meetings", "Body maps", "Exploitation", "Online safety"], "Every concern must show immediate safety action, who was informed, oversight, outcome and learning."), missing: () => renderHub("Missing from care", ["Last seen", "Mood before missing", "Known locations", "Police reference", "Return home interview", "Debrief", "Risk review", "Pattern insight"], "Look for patterns by time, peer, location, contact, education stress, conflict and weekends."), documents: renderDocuments, review: renderReview, staff: () => renderHub("Staff work life", ["DBS", "Training", "Supervision", "Probation", "Wellbeing", "Conduct", "Policy acknowledgements", "Safe to work"], "Staff compliance should feel supportive but make unsafe gaps impossible to miss."), rota: () => renderHub("Rota and handover", ["Staff on duty", "Sleep-in", "On-call", "Shift lead", "Staff ratios", "Agency", "Handover", "Unallocated tasks"], "The rota must connect staffing to children’s current risks, plans and practical tasks."), reg45: renderOfsted, ofsted: renderOfsted, assistant: renderAssistantView };
  return (renderers[state.view] || renderHome)(workspace);
}

async function loadWorkspace(view) { const path = view === "child" ? `/workspace/child/${state.selectedChildId}` : view === "ofsted" || view === "reg45" ? "/workspace/ofsted/1" : "/workspace/manager"; try { const r = await fetch(path, { credentials: "include" }); if (!r.ok) throw new Error(`Workspace request failed ${r.status}`); const d = await r.json(); return d?.ok === false ? { ...mockWorkspace, error: d.detail || d.error } : d; } catch (e) { return { ...mockWorkspace, error: e.message }; } }

function renderHome(data) { const counts = data.child_journey_overview?.counts || {}; els.main.innerHTML = `${data.error ? warning(data.error) : ""}<section class="hero-card"><div><p class="eyebrow">Home overview</p><h3>${esc(data.home?.name || "Children's home")}</h3><p>Live view of children, staff tasks, documents, risk and Ofsted readiness.</p></div></section><section class="card-grid">${metric("Children", data.children?.length || 0, "Currently visible in placement")}${metric("Daily notes", counts.daily_note || 0, "Recent lived experience evidence")}${metric("Incidents", counts.incident || 0, "Require pattern review")}${metric("Safeguarding", counts.safeguarding || 0, "Must show oversight")}</section><section class="two-column">${panel("Today focus", list(["Children in placement: " + (data.children?.length || 0), "Actions: " + (data.adult_work_life?.actions?.length || 0), "Documents needing work: " + (data.adult_work_life?.documents_needing_work?.length || 0)]))}${panel("Manager oversight", list(["Review queue: " + (data.manager_oversight?.review_queue?.length || 0), "Open actions: " + (data.manager_oversight?.open_or_overdue_actions?.length || 0), "Ofsted readiness visible"]))}</section>`; }

function renderChild(data) {
  const child = data.child || data.children?.[0] || {};
  const journey = data.journey || data.child_journey_overview || {};
  const events = journey.timeline || journey.recent_events || [];
  const counts = journey.counts || data.child_journey_overview?.counts || countEvents(events);
  els.main.innerHTML = `${data.error ? warning(data.error) : ""}
    <section class="hero-card child-first"><div><p class="eyebrow">Identity first</p><h3>${esc(fullName(child) || "Selected child")}</h3><p>Start with safety, strengths, communication, voice and what adults need to understand.</p></div><button class="secondary-action" onclick="openWorkspaceForm('daily_record')">Add daily note</button></section>
    <section class="card-grid">${metric("Timeline items", events.length, "Journey evidence")}${metric("Incidents", counts.incident || counts.incident_record || 0, "Pattern review")}${metric("Safeguarding", counts.safeguarding || 0, "Protection evidence")}${metric("Review queue", data.manager_oversight?.review_queue?.length || 0, "Manager grip")}</section>
    <section class="two-column">${panel("What helps me", `<div class="identity-grid"><div>What helps me feel safe</div><div>What I want adults to know</div><div>My strengths</div><div>How I communicate distress</div></div>`)}${panel("Journey insights", journeyInsightCards(events))}</section>
    <section class="panel"><h3>Child journey timeline</h3>${timeline(events, true)}</section>`;
}

function journeyInsightCards(events) { const counts = countEvents(events); const prompts = []; if ((counts.incident || 0) > 0) prompts.push("Incidents are visible. Check whether plans and risk assessments show follow-through."); if ((counts.safeguarding || 0) > 0) prompts.push("Safeguarding evidence is visible. Check actions, notifications and management oversight."); if ((counts.missing_episode || 0) > 0) prompts.push("Missing episodes are visible. Check return work and pattern analysis."); if (!(counts.keywork || 0)) prompts.push("No keywork evidence is visible in this view. Check child voice and wishes/feelings."); if (!prompts.length) prompts.push("Use this timeline to evidence lived experience, progress, stability and adult response."); return list(prompts); }
function countEvents(events = []) { return events.reduce((acc, item) => { const key = String(item.record_type || item.type || item.source_table || "record"); acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }

function renderFormScreen(schemaKey) { const s = getSchema(schemaKey); els.main.innerHTML = `<section class="hero-card"><div><p class="eyebrow">Config-driven form</p><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></div><button class="primary-action" onclick="openWorkspaceForm('${schemaKey}')">Open form</button></section><section class="form-preview">${s.fields.map((f) => `<article class="record-card"><div><h4>${esc(f.label)}</h4><p>${esc(f.help || f.type || "Field")}</p></div><span class="mini-tag">${esc(f.type || "text")}</span></article>`).join("")}</section>`; }
function renderDocuments(data) { const docs = data.documents || data.evidence_workspace?.documents || []; els.main.innerHTML = `${data.error ? warning(data.error) : ""}<section class="hero-card"><div><p class="eyebrow">Workflow</p><h3>Documents and approvals</h3><p>Draft, submit, manager comment, approve, request changes or reject.</p></div></section><section class="record-list">${docs.length ? docs.map(documentCard).join("") : empty("No documents loaded. Create or upload a document to begin workflow.")}</section>`; }
async function renderReview() { try { const r = await fetch("/workspace/review/queue", { credentials: "include" }); const d = await r.json(); if (!r.ok || d.ok === false) throw new Error(d.detail || d.error || "Review queue unavailable"); const items = prioritiseReviewItems(d.items || []); els.main.innerHTML = `<section class="hero-card"><div><p class="eyebrow">Oversight</p><h3>Manager review queue</h3><p>Submitted records waiting for management oversight, comments and decisions.</p></div><span class="score-pill">${items.length} pending</span></section><section class="record-list">${items.length ? items.map(reviewCard).join("") : empty("No items awaiting review.")}</section>`; } catch (e) { els.main.innerHTML = warning(e.message); } }
function prioritiseReviewItems(items) { return items.map((item) => ({ ...item, _level: reviewLevel(item), _score: reviewScore(item) })).sort((a, b) => b._score - a._score); }
function reviewScore(item) { const level = reviewLevel(item); return level === "high" ? 3 : level === "medium" ? 2 : 1; }
function reviewLevel(item) { const text = `${item.record_type || ""} ${item.source_table || ""} ${item.summary || ""}`.toLowerCase(); if (text.includes("safeguarding") || text.includes("allegation") || text.includes("missing") || text.includes("self-harm")) return "high"; if (text.includes("incident") || text.includes("risk") || text.includes("concern")) return "medium"; return "low"; }
function whyReviewMatters(item) { const level = item._level || reviewLevel(item); if (level === "high") return "This may affect safeguarding evidence, external notifications, risk controls and leadership oversight."; if (level === "medium") return "This needs oversight to evidence proportionate adult response, learning and follow-up."; return "This supports evidence of lived experience, recording quality and management grip."; }

function renderOfsted(data) { const e = data.evidence_workspace || {}; els.main.innerHTML = `${data.error ? warning(data.error) : ""}<section class="hero-card"><div><p class="eyebrow">Always ready</p><h3>Ofsted readiness</h3><p>Evidence mapped to experience and progress, help and protection, and leadership.</p></div></section><section class="card-grid">${metric("Evidence strength", "Review", "Check live documents and oversight")}${metric("Actions", e.actions?.length || 0, "Improvement follow-through")}${metric("Documents", e.documents?.length || 0, "Inspection evidence")}${metric("Questions", e.suggested_evidence_questions?.length || 4, "Likely lines of enquiry")}</section>${panel("Inspection evidence questions", list(e.suggested_evidence_questions || []))}`; }
function renderAssistantView() { els.main.innerHTML = renderHub("AI assistant", ["Improve wording", "Suggest missing info", "Draft handover", "Build chronology", "Summarise Ofsted evidence", "Highlight patterns", "Manager brief", "Reg 45 support"], "The assistant supports professional judgement. It must not invent facts or make safeguarding decisions."); }
function renderHub(name, items, note) { return `<section class="hero-card"><div><p class="eyebrow">Module</p><h3>${esc(name)}</h3><p>${esc(note)}</p></div></section><section class="card-grid">${items.map((i) => metric(i, "Ready", "Config driven")).join("")}</section>`; }

function openForm(schemaKey) { state.activeSchemaKey = schemaKey; const s = getSchema(schemaKey); els.modal.classList.remove("hidden"); els.modalTitle.textContent = s.title; els.formFields.innerHTML = s.fields.map(renderField).join(""); }
function closeForm() { els.modal.classList.add("hidden"); els.form.reset(); }
async function submitRecordForm(e) { e.preventDefault(); const fields = Object.fromEntries(new FormData(els.form).entries()); const recordType = state.activeSchemaKey === "incident" ? "incident" : "daily_record"; if (recordType === "daily_record") fields.note_date = new Date().toISOString().slice(0, 10); if (recordType === "incident") fields.incident_datetime = new Date().toISOString(); try { const r = await fetch("/workspace/records", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record_type: recordType, young_person_id: state.selectedChildId, status: "submitted", fields }) }); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.detail || d.error || `Save failed ${r.status}`); closeForm(); toast("Record saved and sent for manager review."); await loadView("review"); } catch (err) { toast(err.message || "Could not save record."); } }
function renderField(f) { const help = f.help ? `<small>${esc(f.help)}</small>` : ""; if (f.type === "select") return `<label>${esc(f.label)}<select name="${esc(f.id)}">${(f.options || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>${help}</label>`; return `<label>${esc(f.label)}<textarea name="${esc(f.id)}" placeholder="${esc(f.help || "")}"></textarea>${help}</label>`; }
async function reviewDecision(id, action) { const comment = $(`#review-comment-${id}`)?.value || ""; if (action === "return" && !comment.trim()) { toast("Please add a comment before returning a record."); return; } try { const r = await fetch(`/workspace/review/queue/${id}/${action}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) }); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.detail || d.error || `Review failed ${r.status}`); toast(`Review item ${action} completed.`); await loadView("review"); } catch (e) { toast(e.message); } }
async function documentWorkflow(action, id) { try { const notes = action === "approve" ? "Approved from workspace" : action === "reject" ? "Rejected from workspace" : action === "request-changes" ? "Changes requested from workspace" : "Submitted from workspace"; const r = await fetch(`/workspace/documents/${action}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: Number(id), notes }) }); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.detail || d.error || `Document workflow failed ${r.status}`); toast(`Document ${action.replace("-", " ")} completed.`); await loadView("documents"); } catch (e) { toast(e.message); } }
async function runAssistant() { const q = els.assistantInput.value.trim() || "What matters most in this workspace?"; els.assistantOutput.innerHTML = "<p>Thinking with the workspace evidence...</p>"; try { const r = await fetch("/assistant/os/reason", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ young_person_id: state.selectedChildId, question: `${q}\n\nWorkspace context: ${summarise(state.workspace)}` }) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.detail || `Assistant failed ${r.status}`); els.assistantOutput.innerHTML = `<strong>Assistant support note</strong><p>${esc(d.answer || "No answer returned.")}</p>`; } catch (e) { els.assistantOutput.innerHTML = `<strong>Assistant support note</strong><p>${esc(summarise(state.workspace))}</p><small>${esc(e.message)}. Showing local support note instead.</small>`; } }

function getSchema(key) { return state.formConfig?.[key] || fallbackForms[key] || fallbackForms.daily_record; }
function documentCard(doc) { const id = Number(doc.id); return `<article class="record-card"><div><h4>${esc(doc.title || "Untitled document")}</h4><p>${esc(doc.document_type || "document")} · ${esc(doc.approval_status || "not set")}</p></div><div class="record-actions"><button onclick="submitDocument(${id})">Submit</button><button onclick="approveDocument(${id})">Approve</button><button onclick="requestDocumentChanges(${id})">Changes</button><button onclick="rejectDocument(${id})">Reject</button></div></article>`; }
function reviewCard(item) { const id = Number(item.id); const type = item.record_type || item.source_table || "Record"; const level = item._level || reviewLevel(item); return `<article class="record-card review-card ${esc(level)}"><div><div class="review-meta"><span class="mini-tag">${esc(level)} priority</span><span class="mini-tag">${esc(item.source_table || "source unknown")} #${esc(item.source_id || "")}</span></div><h4>${esc(type)}</h4><p>${esc(item.summary || "Record waiting for manager review")}</p><div class="review-why"><strong>Why this matters:</strong> ${esc(whyReviewMatters(item))}</div><textarea class="review-comment" id="review-comment-${id}" placeholder="Manager comment, challenge, rationale or action required..."></textarea></div><div class="record-actions"><button onclick="reviewAction(${id}, 'approve')">Approve</button><button onclick="reviewAction(${id}, 'return')">Return</button><button onclick="reviewAction(${id}, 'acknowledge')">Acknowledge</button></div></article>`; }
function renderStatus(data) { els.status.innerHTML = [pill("green", "Stable records", "Workspace loaded"), pill("amber", "Needs attention", data.error ? "connection fallback" : "review"), pill("blue", "Upcoming", "Documents and actions"), pill("purple", "Therapeutic insight", "Child voice and patterns")].join(""); }
function renderAssistantPrompts(data) { const prompts = data.assistant_context?.suggested_prompts || data.evidence_workspace?.suggested_evidence_questions || mockWorkspace.assistant_context.suggested_prompts; els.assistantSuggestions.innerHTML = prompts.slice(0, 4).map((p) => `<button type="button" class="prompt-chip">${esc(p)}</button>`).join(""); $$(".prompt-chip").forEach((b) => b.addEventListener("click", () => { els.assistantInput.value = b.textContent; })); }
function metric(label, value, help) { return `<article class="metric-card"><strong>${esc(value)}</strong><span>${esc(label)}</span><small>${esc(help)}</small></article>`; }
function panel(name, body) { return `<article class="panel"><h3>${esc(name)}</h3>${body}</article>`; }
function list(items) { return `<ul class="clean-list">${(items || []).slice(0, 10).map((i) => `<li>${esc(typeof i === "string" ? i : i.title || i.summary || i.task || "Record")}</li>`).join("") || "<li>No items loaded.</li>"}</ul>`; }
function timeline(items, detailed = false) { return `<ol class="timeline">${(items || []).slice(0, 30).map((i) => `<li class="timeline-event ${esc(String(i.record_type || i.source_table || "record"))}"><strong>${esc(i.title || i.record_type || "Record")}</strong><span>${esc(i.event_date || i.created_at || "Date not recorded")}</span><p>${esc(i.summary || "No summary recorded")}</p>${detailed ? `<small>${esc(timelineMeaning(i))}</small>` : ""}</li>`).join("") || "<li>No journey events loaded.</li>"}</ol>`; }
function timelineMeaning(item) { const type = String(item.record_type || item.source_table || "").toLowerCase(); if (type.includes("incident")) return "Check response, repair, learning and whether plans changed."; if (type.includes("safeguarding")) return "Check immediate safety action, notifications, outcome and oversight."; if (type.includes("missing")) return "Check return work, trigger, location and pattern analysis."; if (type.includes("keywork")) return "This may evidence child voice, wishes, feelings and relational work."; return "This contributes to the child’s lived experience evidence."; }
function empty(text) { return `<div class="empty-state">${esc(text)}</div>`; }
function pill(type, label, value) { return `<div class="status-pill ${type}"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`; }
function warning(text) { return `<div class="warning-banner">${esc(text)}</div>`; }
function skeleton() { return `<div class="skeleton"><span></span><span></span><span></span></div>`; }
function fullName(p = {}) { return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || p.full_name || ""; }
function summarise(data) { return `Workspace: ${state.view}. Records: ${data?.child_journey_overview?.recent_events?.length || data?.journey?.timeline?.length || 0}. Actions: ${data?.adult_work_life?.actions?.length || 0}. Documents: ${data?.documents?.length || data?.evidence_workspace?.documents?.length || 0}.`; }
function toast(message) { els.assistantOutput.innerHTML = `<p>${esc(message)}</p>`; }
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
