import { createRecord } from "../young-people-shell/core/api-adapter.js";

const RECORD_TYPES = [
  { id: "daily_note", label: "Daily note", help: "Child-centred daily lived experience record." },
  { id: "incident", label: "Incident", help: "Factual incident record with actions and follow-up." },
  { id: "keywork", label: "Direct work / key work", help: "Key work, wishes and feelings or direct session record." },
  { id: "missing_episode", label: "Missing episode", help: "Missing from care episode and return discussion record." },
  { id: "education_record", label: "Education record", help: "Education, learning, school or attendance record." },
  { id: "health_record", label: "Health record", help: "Health appointment, wellbeing or medical update." },
  { id: "family_contact", label: "Family contact", help: "Family time, communication or contact record." },
  { id: "safeguarding_record", label: "Safeguarding concern", help: "Concern record requiring manager oversight." },
];

let activeDraft = null;
let autosaveTimer = null;

bootRecordEditor();

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
  autosaveTimer = setTimeout(() => saveDraft("draft", true), 1200);
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
        <span class="record-kicker">Phase 4 · Record editor</span>
        <h1>Create a record</h1>
        <p>Choose the type of live operational record you need to write. This uses the existing young-people record API contracts.</p>
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
  activeDraft = {
    id: null,
    record_type: type.id,
    title: type.label,
    status: "draft",
    young_person_id: child ? childKey(child) : "",
    child_name: child ? childName(child) : "",
    home_name: window.IndiCareOperationalSession?.homeName || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fields: {
      summary: "",
      child_voice: "",
      observations: "",
      actions_taken: "",
      safeguarding: "",
      manager_review: "",
    },
  };
  renderEditor();
}

function renderEditor() {
  const main = document.getElementById("sp-main");
  if (!main || !activeDraft) return;
  const context = editorContext();
  const selectedType = RECORD_TYPES.find((item) => item.id === activeDraft.record_type) || RECORD_TYPES[0];
  main.innerHTML = `
    <section class="record-view-hero">
      <div>
        <button class="sp-back" type="button" data-cancel-record-editor>‹ Back</button>
        <span class="record-kicker">Draft record</span>
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
        ${editorField("summary", "What happened / summary", "Write a clear factual summary. Include who was present, where it happened and the relevant timeline.")}
        ${editorField("child_voice", "Child voice, wishes and feelings", "Record the young person's words, presentation and expressed views where known.")}
        ${editorField("observations", "Observations and analysis", "Keep observations factual and separate from professional interpretation.")}
        ${editorField("actions_taken", "Actions taken and next steps", "Record immediate actions, follow-up tasks, notifications and who is responsible.")}
        ${editorField("safeguarding", "Safeguarding consideration", "Record any safeguarding concern, rationale, escalation and management oversight needed.")}
        ${editorField("manager_review", "Manager review notes", "Optional manager comments or review notes.")}
      </article>
      <aside class="record-context-panel">
        <section class="sp-card"><h2>Recording guidance</h2><p>Use factual, child-centred language. Avoid judgemental phrasing. Separate what was seen/heard from opinion or analysis.</p></section>
        <section class="sp-card"><h2>Draft status</h2><div class="record-field-list compact"><p><span>Status</span><strong>${escapeHtml(activeDraft.status)}</strong></p><p><span>Backend save</span><strong data-save-status>Waiting</strong></p><p><span>Updated</span><strong>${escapeHtml(formatDate(activeDraft.updated_at))}</strong></p></div></section>
        <section class="sp-card"><h2>Existing API contract</h2><p>This editor now uses <strong>young-people-shell/core/api-adapter.js</strong> and its configured record routes instead of creating duplicate endpoints.</p></section>
        <section class="sp-card"><h2>Assistant support</h2><p>Use IndiCare AI to improve wording or check whether the record is factual, complete and child-centred before submission.</p></section>
      </aside>
    </section>`;
}

function contextFields(children) {
  return `<div class="record-field-list"><p><span>Young person</span><strong><select data-record-field="young_person_id">${children.length ? children.map((child) => `<option value="${escapeHtml(childKey(child))}" ${childKey(child) === activeDraft.young_person_id ? "selected" : ""}>${escapeHtml(childName(child))}</option>`).join("") : `<option value="">No young people in live context</option>`}</select></strong></p><p><span>Home</span><strong>${escapeHtml(activeDraft.home_name || window.IndiCareOperationalSession?.homeName || "Not set")}</strong></p><p><span>Record type</span><strong>${escapeHtml((RECORD_TYPES.find((item) => item.id === activeDraft.record_type) || {}).label || activeDraft.record_type)}</strong></p></div>`;
}

function editorField(id, label, help) {
  return `<section class="record-section"><h2>${escapeHtml(label)}</h2><p class="record-help">${escapeHtml(help)}</p><textarea class="record-editor-textarea" data-record-field="${escapeHtml(id)}" placeholder="Write here...">${escapeHtml(activeDraft.fields[id] || "")}</textarea></section>`;
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
  setSaveStatus("Using existing young people record API");

  try {
    const saved = await createRecord(activeDraft.record_type, ids, payload);
    activeDraft.id = saved?.id || saved?.record_id || activeDraft.id;
    setEditorState(status === "submitted_for_review" ? "Submitted for review" : "Draft saved", "green");
    setSaveStatus("Saved through existing record API");
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
  } catch (error) {
    setEditorState("Not saved to backend", "amber");
    setSaveStatus(error?.message || "Existing record API rejected the save");
    if (!quiet) alert(`This draft was not saved: ${error?.message || "record API rejected the save"}`);
  }
}

function buildPayload(draft) {
  return {
    title: draft.title,
    record_type: draft.record_type,
    type: draft.record_type,
    status: draft.status,
    young_person_id: draft.young_person_id,
    child_name: draft.child_name,
    home_name: draft.home_name,
    content: draft.fields,
    summary: draft.fields.summary,
    description: draft.fields.summary,
    notes: draft.fields.observations,
    child_voice: draft.fields.child_voice,
    actions_taken: draft.fields.actions_taken,
    safeguarding_notes: draft.fields.safeguarding,
    manager_comments: draft.fields.manager_review,
    safeguarding_flag: Boolean(draft.fields.safeguarding?.trim()),
  };
}

function editorContext() {
  const raw = window.IndiCareLiveContext || {};
  const children = arrayFrom(raw.children || raw.young_people || raw.youngPeople || raw.items);
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  return { children: selected.size ? children.filter((child) => selected.has(childKey(child))) : children };
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
