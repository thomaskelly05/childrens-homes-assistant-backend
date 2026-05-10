import { createRecord } from "../young-people-shell/core/api-adapter.js";
import { apiSend } from "../young-people-shell/core/api.js";

const RECORD_TYPES = [
  { id: "daily_note", workspace: "daily", label: "Daily note", help: "Child-centred daily lived experience record." },
  { id: "incident", workspace: "incident", label: "Incident", help: "Factual incident record with actions and follow-up." },
  { id: "keywork", workspace: "keywork", label: "Keywork session", help: "Planned keywork session with reflection and actions." },
  { id: "direct_work", workspace: "direct_work", label: "Direct work", help: "Direct work session linked to goals or support plans." },
  { id: "missing_episode", workspace: "missing", label: "Missing episode", help: "Missing from care episode and return discussion record." },
  { id: "education_record", workspace: "education", label: "Education record", help: "Education, attendance, PEP or learning update." },
  { id: "health_record", workspace: "health", label: "Health record", help: "Health appointment, medication, wellbeing or medical update." },
  { id: "family_contact", workspace: "family_contact", label: "Family contact", help: "Family time, communication or contact record." },
  { id: "safeguarding_record", workspace: "safeguarding", label: "Safeguarding concern", help: "Concern record requiring manager oversight." },
];

const WORKSPACE_RECORD_TYPE_MAP = Object.freeze(Object.fromEntries(RECORD_TYPES.map((type) => [type.id, type.workspace])));

const FIELD_SCHEMAS = Object.freeze({
  daily_note: [
    field("summary", "Daily summary", "What has the young person’s day looked like? Include key events and routines."),
    field("presentation", "Presentation", "Mood, appearance, emotional wellbeing, sleep, appetite or presentation."),
    field("activities", "Activities and engagement", "Activities, interests, independence, hobbies or community involvement."),
    field("education_update", "Education update", "School, college, attendance, learning or education engagement."),
    field("health_update", "Health update", "Health, medication, appointments, wellbeing or physical presentation."),
    field("family_update", "Family / relationships update", "Family time, calls, contact, peer relationships or important relationship updates."),
    field("behaviour_update", "Behaviour / support update", "Behaviour as communication, triggers, support offered and response."),
    field("young_person_voice", "Young person voice", "Words, wishes, feelings, choices or non-verbal communication."),
    field("positives", "Positive progress", "Strengths, achievements, moments of connection or progress."),
    field("actions_required", "Actions required", "Follow-up, tasks, review points or handover needs."),
  ],
  incident: [
    field("summary", "Incident summary", "Concise factual overview of what happened."),
    field("incident_type", "Incident type", "Type/category of incident."),
    field("antecedent", "What happened before?", "Known triggers, context and lead-up."),
    field("description", "Detailed account", "Factual account: who, what, where, when, sequence of events."),
    field("staff_response", "Staff response", "What adults did, why, de-escalation, support and immediate safety actions."),
    field("child_response", "Young person response", "How the young person responded during and after support."),
    field("child_voice", "Young person voice", "Words, wishes, feelings or non-verbal communication."),
    field("restorative_follow_up", "Restorative follow-up", "Repair, reflection, apology, restorative work or planned follow-up."),
    field("trauma_informed_formulation", "Trauma-informed formulation", "Professional analysis separated from facts."),
    field("actions_taken", "Actions taken / required", "Notifications, medical checks, safeguarding, management review and next steps."),
    field("severity", "Severity / significance", "Low, medium, high, critical or significant."),
  ],
  keywork: [
    field("topic", "Topic", "Main topic of the keywork session."),
    field("purpose", "Purpose", "Why this session took place and what it aimed to support."),
    field("summary", "Session summary", "What was discussed or completed."),
    field("young_person_voice", "Young person voice", "Young person’s views, choices, feelings and participation."),
    field("reflective_analysis", "Reflective analysis", "What this tells us about needs, progress or support."),
    field("actions_agreed", "Actions agreed", "Agreed actions, who is responsible and timescales."),
    field("session_rating", "Session rating", "Optional rating or engagement level."),
    field("participation_level", "Participation level", "How engaged the young person was."),
  ],
  direct_work: [
    field("topic", "Direct work topic", "Main focus of direct work."),
    field("purpose", "Purpose / goal", "Linked care-plan goal or support need."),
    field("summary", "What was completed", "Activity, discussion, tool or work completed."),
    field("young_person_voice", "Young person voice", "Young person’s views, wishes and feelings."),
    field("reflective_analysis", "Reflection / analysis", "Impact, progress and what this means for support."),
    field("actions_agreed", "Next steps", "Actions, review dates or follow-up work."),
  ],
  missing_episode: [
    field("summary", "Episode summary", "Concise summary of missing episode."),
    field("start_datetime", "Start date/time", "When the young person was identified as missing."),
    field("return_datetime", "Return date/time", "When the young person returned or was found."),
    field("description", "Circumstances", "Where they were last seen, known associates, risks and context."),
    field("actions_taken", "Actions taken", "Search actions, notifications, police/social worker/manager actions."),
    field("return_discussion", "Return discussion", "Return conversation, wishes/feelings, push/pull factors and learning."),
    field("safeguarding_notes", "Safeguarding analysis", "Risks, exploitation concerns, immediate safety and next actions."),
  ],
  education_record: [
    field("summary", "Education summary", "Attendance, engagement, learning or school update."),
    field("education_update", "Education update", "Detailed education update, PEP, attendance or behaviour in education."),
    field("young_person_voice", "Young person voice", "Views about school/college/learning."),
    field("actions_required", "Actions required", "School contact, PEP actions, attendance support or follow-up."),
  ],
  health_record: [
    field("summary", "Health summary", "Health, wellbeing, medication or appointment summary."),
    field("health_update", "Health update", "Detailed health or wellbeing update."),
    field("medication_update", "Medication update", "Medication, side effects, refusals, PRN or MAR-related update."),
    field("young_person_voice", "Young person voice", "Views, worries, consent or health wishes/feelings."),
    field("actions_required", "Actions required", "Appointments, GP, CAMHS, nurse, medication review or follow-up."),
  ],
  family_contact: [
    field("summary", "Contact summary", "Family time, calls, messages or relationship update."),
    field("description", "What happened", "Who was involved, what happened, tone and response."),
    field("young_person_voice", "Young person voice", "Young person’s views before, during or after contact."),
    field("family_update", "Family / network update", "Family relationships, arrangements or important updates."),
    field("actions_required", "Actions required", "Social worker, contact plan, review or family follow-up."),
  ],
  safeguarding_record: [
    field("summary", "Concern summary", "Concise safeguarding concern summary."),
    field("description", "Concern details", "What is known, who is involved, when and where."),
    field("risk_level", "Risk level", "Low, medium, high, critical or unknown."),
    field("actions_taken", "Immediate actions", "What staff did to make the young person safe."),
    field("notifications", "Notifications", "Manager, social worker, police, LADO, placing authority or others notified."),
    field("young_person_voice", "Young person voice", "Words, wishes, feelings or presentation."),
    field("manager_comment", "Manager oversight", "Manager comments, oversight, decision-making or review requirement."),
  ],
});

let activeDraft = null;
let autosaveTimer = null;

bootRecordEditor();

function field(id, label, help) { return { id, label, help }; }

function bootRecordEditor() {
  document.addEventListener("click", handleEditorClicks, true);
  document.addEventListener("input", handleEditorInput, true);
}

function handleEditorClicks(event) {
  const newRecord = event.target.closest?.("[data-new-live-record]");
  if (newRecord) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderRecordTypePicker();
    return;
  }

  const typeButton = event.target.closest?.("[data-create-record-type]");
  if (typeButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    createDraft(typeButton.dataset.createRecordType);
    return;
  }

  const saveButton = event.target.closest?.("[data-save-record-draft]");
  if (saveButton) {
    event.preventDefault();
    saveDraft("draft");
    return;
  }

  const submitButton = event.target.closest?.("[data-submit-record-review]");
  if (submitButton) {
    event.preventDefault();
    saveDraft("submitted_for_review");
    return;
  }

  const cancelButton = event.target.closest?.("[data-cancel-record-editor]");
  if (cancelButton) {
    event.preventDefault();
    document.querySelector('[data-sp-view="children"]')?.click();
  }
}

function handleEditorInput(event) {
  const field = event.target.closest?.("[data-record-field]");
  if (!field || !activeDraft) return;
  if (field.dataset.recordField === "young_person_id") {
    activeDraft.young_person_id = field.value;
    const child = editorContext().children.find((item) => childKey(item) === field.value);
    activeDraft.child_name = child ? childName(child) : "";
  } else {
    activeDraft.fields[field.dataset.recordField] = field.value;
  }
  activeDraft.updated_at = new Date().toISOString();
  setEditorState("Unsaved changes", "amber");
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveDraft("draft", true), 1400);
}

function renderRecordTypePicker() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const context = editorContext();
  const children = context.children;
  main.innerHTML = `
    <section class="record-view-hero">
      <div>
        <button class="sp-back" type="button" data-sp-view="children">‹ Back to Young People</button>
        <span class="record-kicker">Schema-aligned recording</span>
        <h1>Create a record</h1>
        <p>Choose the type of live operational record. These forms now align to the uploaded IndiCare schema and save through the workspace lifecycle where the table exists.</p>
      </div>
    </section>
    <section class="record-type-grid">
      ${RECORD_TYPES.map((type) => `<button class="record-type-card" data-create-record-type="${escapeHtml(type.id)}" type="button"><strong>${escapeHtml(type.label)}</strong><span>${escapeHtml(type.help)}</span></button>`).join("")}
    </section>
    <section class="sp-card record-editor-note"><h2>Current context</h2>${children.length ? `<p>This record will be linked to the selected operational session. You can choose the specific young person in the editor.</p>` : emptyState("No young people are currently available in the live context. Start Shift must select real young people before recording is useful.")}</section>`;
}

function createDraft(typeId) {
  const context = editorContext();
  const type = RECORD_TYPES.find((item) => item.id === typeId) || RECORD_TYPES[0];
  const child = context.children[0] || null;
  const fields = {};
  (FIELD_SCHEMAS[type.id] || FIELD_SCHEMAS.daily_note).forEach((item) => { fields[item.id] = ""; });
  activeDraft = {
    id: null,
    record_type: type.id,
    workspace_type: type.workspace,
    title: type.label,
    status: "draft",
    young_person_id: child ? childKey(child) : "",
    child_name: child ? childName(child) : "",
    home_id: window.IndiCareOperationalSession?.homeId || "",
    home_name: window.IndiCareOperationalSession?.homeName || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fields,
  };
  renderEditor();
}

function renderEditor() {
  const main = document.getElementById("sp-main");
  if (!main || !activeDraft) return;
  const context = editorContext();
  const selectedType = RECORD_TYPES.find((item) => item.id === activeDraft.record_type) || RECORD_TYPES[0];
  const schema = FIELD_SCHEMAS[activeDraft.record_type] || FIELD_SCHEMAS.daily_note;
  main.innerHTML = `
    <section class="record-view-hero">
      <div>
        <button class="sp-back" type="button" data-cancel-record-editor>‹ Back</button>
        <span class="record-kicker">Schema-aligned draft · ${escapeHtml(selectedType.workspace)}</span>
        <h1>${escapeHtml(selectedType.label)}</h1>
        <p>${escapeHtml(activeDraft.child_name || "No young person selected")} · <span data-editor-state>Not saved yet</span></p>
      </div>
      <div class="record-view-actions">
        <button class="sp-secondary" type="button" data-save-record-draft>Save draft</button>
        <button class="sp-primary" type="button" data-submit-record-review>Submit for review</button>
      </div>
    </section>
    <section class="record-view-grid">
      <article class="record-paper record-editor-paper">
        <section class="record-section"><h2>Record context</h2>${contextFields(context.children)}</section>
        ${schema.map((item) => editorField(item.id, item.label, item.help)).join("")}
      </article>
      <aside class="record-context-panel">
        <section class="sp-card"><h2>Recording guidance</h2><p>Use factual, child-centred language. Separate what was seen or heard from analysis. Include child voice and follow-up actions wherever possible.</p></section>
        <section class="sp-card"><h2>Draft status</h2><div class="record-field-list compact"><p><span>Status</span><strong>${escapeHtml(activeDraft.status)}</strong></p><p><span>Workspace type</span><strong>${escapeHtml(activeDraft.workspace_type)}</strong></p><p><span>Backend save</span><strong data-save-status>Waiting</strong></p><p><span>Updated</span><strong>${escapeHtml(formatDate(activeDraft.updated_at))}</strong></p></div></section>
        <section class="sp-card"><h2>Schema alignment</h2><p>This form maps to the real IndiCare schema fields where available, then stores the full payload in <strong>content</strong> for audit/review safety.</p></section>
        <section class="sp-card"><h2>Assistant support</h2><p>Use IndiCare AI to improve wording or check whether the record is factual, complete and child-centred before submission.</p></section>
      </aside>
    </section>`;
}

function contextFields(children) {
  return `<div class="record-field-list"><p><span>Young person</span><strong><select data-record-field="young_person_id">${children.length ? children.map((child) => `<option value="${escapeHtml(childKey(child))}" ${childKey(child) === activeDraft.young_person_id ? "selected" : ""}>${escapeHtml(childName(child))}</option>`).join("") : `<option value="">No young people in live context</option>`}</select></strong></p><p><span>Home</span><strong>${escapeHtml(activeDraft.home_name || window.IndiCareOperationalSession?.homeName || "Not set")}</strong></p><p><span>Record type</span><strong>${escapeHtml((RECORD_TYPES.find((item) => item.id === activeDraft.record_type) || {}).label || activeDraft.record_type)}</strong></p></div>`;
}

function editorField(id, label, help) {
  const smallFields = new Set(["incident_type", "severity", "risk_level", "session_rating", "participation_level", "start_datetime", "return_datetime"]);
  const value = activeDraft.fields[id] || "";
  if (smallFields.has(id)) {
    return `<section class="record-section compact-field"><h2>${escapeHtml(label)}</h2><p class="record-help">${escapeHtml(help)}</p><input class="record-editor-input" data-record-field="${escapeHtml(id)}" value="${escapeHtml(value)}" placeholder="Write here..." /></section>`;
  }
  return `<section class="record-section"><h2>${escapeHtml(label)}</h2><p class="record-help">${escapeHtml(help)}</p><textarea class="record-editor-textarea" data-record-field="${escapeHtml(id)}" placeholder="Write here...">${escapeHtml(value)}</textarea></section>`;
}

async function saveDraft(status, quiet = false) {
  if (!activeDraft) return;
  activeDraft.status = status;
  activeDraft.updated_at = new Date().toISOString();
  const selected = document.querySelector('[data-record-field="young_person_id"]')?.value || activeDraft.young_person_id;
  activeDraft.young_person_id = selected;
  const child = editorContext().children.find((item) => childKey(item) === selected);
  activeDraft.child_name = child ? childName(child) : activeDraft.child_name;
  const payload = buildPayload(activeDraft);
  const ids = { youngPersonId: activeDraft.young_person_id, homeId: window.IndiCareOperationalSession?.homeId || "" };

  if (!ids.youngPersonId) {
    setEditorState("Cannot save without young person", "amber");
    setSaveStatus("Select a young person first");
    return;
  }

  setEditorState(status === "submitted_for_review" ? "Submitting..." : "Saving draft...", "blue");
  setSaveStatus("Saving through workspace-records lifecycle");

  try {
    const saved = await saveViaExistingYoungPeopleApi(activeDraft.record_type, ids, payload);
    activeDraft.id = saved?.id || saved?.record_id || activeDraft.id;
    setEditorState(status === "submitted_for_review" ? "Submitted for review" : "Draft saved", "green");
    setSaveStatus(saved?._saved_via === "workspace-records" ? "Saved through workspace-records lifecycle" : "Saved through young-people record API");
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    if (saved?.id) window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: { ...payload, id: saved.id, record_type: activeDraft.workspace_type, type: activeDraft.workspace_type } }));
  } catch (error) {
    setEditorState("Not saved to backend", "amber");
    setSaveStatus(error?.message || "Existing record APIs rejected the save");
    if (!quiet) alert(`This draft was not saved: ${error?.message || "record APIs rejected the save"}`);
  }
}

async function saveViaExistingYoungPeopleApi(recordType, ids, payload) {
  try {
    return await createRecord(recordType, ids, payload);
  } catch (primaryError) {
    const fallbackType = WORKSPACE_RECORD_TYPE_MAP[recordType];
    if (!fallbackType) throw primaryError;
    const fallback = await createWorkspaceRecord(fallbackType, payload);
    if (!fallback?.ok) throw new Error(fallback?.error || primaryError?.message || "workspace-records rejected the save");
    return { ...fallback, id: fallback.id, record_id: fallback.id, _saved_via: "workspace-records" };
  }
}

async function createWorkspaceRecord(recordType, payload) {
  return apiSend(`/workspace-records/${encodeURIComponent(recordType)}`, "POST", payload, { invalidatePrefixes: ["/workspace-records", "/api/os/context"] });
}

function buildPayload(draft) {
  const fields = draft.fields || {};
  const summary = fields.summary || fields.description || fields.purpose || fields.topic || draft.title;
  return {
    ...fields,
    title: fields.topic || draft.title,
    record_type: draft.workspace_type,
    type: draft.workspace_type,
    status: draft.status,
    workflow_status: draft.status,
    manager_review_status: draft.status,
    young_person_id: draft.young_person_id,
    child_name: draft.child_name,
    home_id: draft.home_id,
    home_name: draft.home_name,
    content: fields,
    summary,
    summary_text: summary,
    what_happened: fields.description || fields.summary,
    description: fields.description || fields.summary,
    notes: fields.notes || fields.reflective_analysis || fields.actions_required || fields.actions_taken,
    child_voice: fields.child_voice || fields.young_person_voice,
    young_person_voice: fields.young_person_voice || fields.child_voice,
    staff_response: fields.staff_response,
    actions_taken: fields.actions_taken || fields.actions_required || fields.actions_agreed,
    actions_required: fields.actions_required || fields.actions_taken || fields.actions_agreed,
    manager_comment: fields.manager_comment,
    manager_review_comment: fields.manager_comment,
    safeguarding_notes: fields.safeguarding_notes,
    safeguarding_flag: Boolean((fields.safeguarding_notes || fields.risk_level || fields.notifications || "").trim?.()),
  };
}

function editorContext() {
  const raw = window.IndiCareScopedOSContext || window.IndiCareLiveContext || {};
  const children = arrayFrom(raw.children || raw.young_people || raw.youngPeople || raw.items);
  return { children };
}

function setEditorState(text, tone) {
  const target = document.querySelector("[data-editor-state]");
  if (!target) return;
  target.textContent = text;
  target.dataset.tone = tone || "blue";
}

function setSaveStatus(text) {
  const target = document.querySelector("[data-save-status]");
  if (target) target.textContent = text;
}

function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(" ") || "Young person"; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function formatDate(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function emptyState(message) { return `<div class="sp-empty-state"><strong>No live data yet</strong><p>${escapeHtml(message)}</p></div>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
