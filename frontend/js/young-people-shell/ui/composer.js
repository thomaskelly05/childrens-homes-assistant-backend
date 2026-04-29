import { state } from "../state.js";
import { els } from "../dom.js";
import { createRecord, updateRecord } from "../core/api-adapter.js";
import { normaliseRecordType } from "../core/contracts.js";
import {
  getRecordLabel,
  getRecordPrimaryDateField,
} from "../core/record-contracts.js";
import {
  escapeHtml,
  toDateInputValue,
  toDateTimeLocalValue,
} from "../core/utils.js";

function today() {
  return toDateInputValue(new Date());
}

function now() {
  return toDateTimeLocalValue(new Date());
}

function text(value = "") {
  return escapeHtml(String(value ?? ""));
}

const JOURNEY_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "referral", label: "Referral" },
  { value: "matching", label: "Matching" },
  { value: "admission", label: "Admission" },
  { value: "settling", label: "Settling" },
  { value: "living", label: "Living" },
  { value: "review", label: "Review" },
  { value: "transition", label: "Transition" },
  { value: "leaving", label: "Leaving care" },
  { value: "aftercare", label: "Aftercare" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
];

const SHIFT_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "late", label: "Late" },
  { value: "night", label: "Night" },
  { value: "sleep_in", label: "Sleep-in" },
  { value: "waking_night", label: "Waking night" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const PRIORITY_OPTIONS = SEVERITY_OPTIONS;

const COMMON_SPELLING_HINTS = [
  ["teh", "the"],
  ["recieve", "receive"],
  ["seperate", "separate"],
  ["behavour", "behaviour"],
  ["occured", "occurred"],
  ["definately", "definitely"],
  ["acommodation", "accommodation"],
  ["adress", "address"],
  ["neccessary", "necessary"],
  ["suport", "support"],
];

function getYoungPersonId() {
  const app = document.getElementById("app");
  const params = new URLSearchParams(window.location.search);
  const selector = document.getElementById("youngPersonSelect");

  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.personId ||
    state.currentPersonId ||
    state.selectedYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    state.youngPerson?.id ||
    state.youngPerson?.young_person_id ||
    state.activeYoungPerson?.id ||
    state.activeYoungPerson?.young_person_id ||
    app?.dataset?.youngPersonId ||
    app?.dataset?.personId ||
    params.get("young_person_id") ||
    params.get("youngPersonId") ||
    params.get("person_id") ||
    params.get("id") ||
    selector?.value ||
    null
  );
}

function getHomeId() {
  return (
    state.homeId ||
    state.currentHomeId ||
    state.selectedHomeId ||
    state.readinessSelectedHomeId ||
    state.selectedYoungPerson?.home_id ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function getComposerForm() {
  return (
    els.composerForm ||
    document.getElementById("recordComposerForm") ||
    document.getElementById("composerForm") ||
    document.querySelector("[data-composer-form]") ||
    document.querySelector(".composer-panel form") ||
    document.querySelector(".record-composer form")
  );
}

function getComposerPanel() {
  return (
    els.composerPanel ||
    document.getElementById("recordComposerPanel") ||
    document.getElementById("composerPanel") ||
    document.querySelector(".composer-panel") ||
    document.querySelector(".record-composer")
  );
}

function getComposerFields() {
  return (
    els.composerFields ||
    document.getElementById("recordComposerFields") ||
    document.getElementById("composerFields") ||
    document.querySelector("[data-composer-fields]") ||
    getComposerForm()?.querySelector(".composer-fields")
  );
}

function getRecordId(item = {}) {
  return item.id || item.record_id || item.source_id || "";
}

function getInitialValue(item = {}, fieldName = "", fallback = "") {
  const raw = item.raw && typeof item.raw === "object" ? item.raw : item;
  return raw?.[fieldName] ?? item?.[fieldName] ?? fallback;
}

function field(f, item = {}) {
  const fullClass = f.full ? "full" : "";
  const required = f.required ? "required" : "";
  const value = getInitialValue(item, f.name, f.value || "");

  const description = f.desc
    ? `<div class="description">${text(f.desc)}</div>`
    : "";

  let control = "";

  if (f.type === "textarea") {
    control = `
      <textarea
        name="${text(f.name)}"
        rows="${text(f.rows || 4)}"
        ${required}
        spellcheck="true"
        autocomplete="on"
        autocapitalize="sentences"
        data-writing-aid="true"
      >${text(value)}</textarea>
    `;
  } else if (f.type === "select") {
    control = `
      <select name="${text(f.name)}" ${required}>
        ${(f.options || [])
          .map((o) => {
            const selected = String(o.value) === String(value) ? "selected" : "";
            return `<option value="${text(o.value)}" ${selected}>${text(o.label)}</option>`;
          })
          .join("")}
      </select>
    `;
  } else if (f.type === "checkbox") {
    const checked =
      value === true ||
      value === "true" ||
      value === "on" ||
      value === 1 ||
      value === "1";

    control = `
      <label class="checkbox-field">
        <input type="checkbox" name="${text(f.name)}" value="true" ${
      checked ? "checked" : ""
    } />
        <span>${text(f.checkboxLabel || "Yes")}</span>
      </label>
    `;
  } else {
    control = `
      <input
        type="${text(f.type || "text")}"
        name="${text(f.name)}"
        value="${text(value)}"
        ${required}
        spellcheck="true"
        autocomplete="on"
        autocapitalize="sentences"
        data-writing-aid="true"
      />
    `;
  }

  return `
    <div class="field ${fullClass}">
      <div class="label">${text(f.label)}${f.required ? " *" : ""}</div>
      ${description}
      ${control}
    </div>
  `;
}

function section(title, desc, fields, item = {}) {
  return `
    <section class="section">
      <h3>${text(title)}</h3>
      <p class="section-desc">${text(desc)}</p>
      <div class="composer-field-grid">
        ${fields.map((f) => field(f, item)).join("")}
      </div>
    </section>
  `;
}

function journeySection(item = {}) {
  return section(
    "Journey stage",
    "Link this record to the young person’s care journey.",
    [
      {
        name: "journey_stage",
        label: "Journey stage",
        type: "select",
        options: JOURNEY_OPTIONS,
      },
    ],
    item
  );
}

function meaningSection(item = {}) {
  return section(
    "Meaning and learning",
    "What does this tell us, and what should adults do differently?",
    [
      {
        name: "what_is_child_communicating",
        label: "What is the child communicating?",
        type: "textarea",
        full: true,
      },
      {
        name: "what_helped",
        label: "What helped?",
        type: "textarea",
        full: true,
      },
      {
        name: "what_did_adults_learn",
        label: "What did adults learn?",
        type: "textarea",
        full: true,
      },
      {
        name: "what_needs_to_change",
        label: "What needs to change?",
        type: "textarea",
        full: true,
      },
    ],
    item
  );
}

function dailyRecord(item = {}) {
  return {
    title: "Daily note",
    intro:
      "Record the day clearly, including the young person’s experience, staff response, risk changes and follow-up.",
    required: ["note_date", "shift_type", "young_person_voice", "actions_required"],
    html: `
      ${journeySection(item)}

      ${section("Basic information", "Core shift details for this daily note.", [
        { name: "note_date", label: "Date", type: "date", value: today(), required: true },
        { name: "shift_type", label: "Shift", type: "select", value: "day", required: true, options: SHIFT_OPTIONS },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}

      ${section("What happened", "Give a clear, factual account of the day.", [
        { name: "narrative", label: "Daily summary", type: "textarea", rows: 5, full: true },
        { name: "activities", label: "Activities", type: "textarea", rows: 4, full: true },
        { name: "behaviour_update", label: "Behaviour update", type: "textarea", rows: 4, full: true },
      ], item)}

      ${section("Young person’s experience", "Capture how the day appeared from the young person’s perspective.", [
        { name: "mood", label: "Mood", full: true },
        { name: "presentation", label: "Presentation", type: "textarea", full: true },
        { name: "young_person_voice", label: "Young person’s voice", type: "textarea", required: true, full: true },
        { name: "positives", label: "Positives", type: "textarea", full: true },
      ], item)}

      ${meaningSection(item)}

      ${section("Health, education and family", "Record any relevant daily updates.", [
        { name: "education_update", label: "Education update", type: "textarea", full: true },
        { name: "health_update", label: "Health update", type: "textarea", full: true },
        { name: "family_update", label: "Family update", type: "textarea", full: true },
      ], item)}

      ${section("Follow-up and oversight", "Show what must happen next.", [
        { name: "actions_required", label: "Actions required", type: "textarea", required: true, full: true },
        { name: "significance", label: "Significance", type: "select", options: SEVERITY_OPTIONS },
        { name: "manager_review_comment", label: "Manager review comment", type: "textarea", full: true },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
        { name: "link_to_chronology", label: "Link to chronology", type: "checkbox", value: true },
        { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
        { name: "safeguarding_concern", label: "Safeguarding concern", type: "checkbox" },
        { name: "link_quality_standards", label: "Link quality standards", type: "checkbox", value: true },
      ], item)}
    `,
  };
}

function incidentForm(item = {}) {
  return {
    title: "Incident record",
    intro:
      "Record the incident factually, including context, risk management, child voice, staff response and safeguarding follow-up.",
    required: ["incident_datetime", "incident_type", "description", "actions_taken"],
    html: `
      ${journeySection(item)}

      ${section("Incident details", "Core incident information.", [
        { name: "incident_datetime", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "incident_type", label: "Incident type", required: true },
        { name: "location", label: "Location" },
        { name: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS },
      ], item)}

      ${section("Factual account", "A clear, neutral chronology of what happened.", [
        { name: "description", label: "What happened", type: "textarea", rows: 6, required: true, full: true },
        { name: "antecedent", label: "What happened before", type: "textarea", full: true },
      ], item)}

      ${section("Young person and staff response", "Capture presentation, child voice and adult response.", [
        { name: "presentation", label: "Presentation", type: "textarea", full: true },
        { name: "child_voice", label: "Child voice", type: "textarea", full: true },
        { name: "staff_response", label: "Staff response", type: "textarea", full: true },
      ], item)}

      ${meaningSection(item)}

      ${section("Outcome and safeguarding", "Record the result, notifications and next actions.", [
        { name: "outcome", label: "Outcome", type: "textarea", full: true },
        { name: "actions_taken", label: "Actions taken / required", type: "textarea", required: true, full: true },
        { name: "police_involved", label: "Police involved", type: "checkbox" },
        { name: "ofsted_notified", label: "Ofsted notified", type: "checkbox" },
        { name: "placing_authority_notified", label: "Placing authority notified", type: "checkbox" },
        { name: "manager_oversight", label: "Manager oversight", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function keyworkForm(item = {}) {
  return {
    title: "Key work session",
    intro:
      "Capture the purpose of the session, what was explored, the young person’s voice, reflection and agreed actions.",
    required: ["session_date", "topic", "child_voice"],
    html: `
      ${journeySection(item)}

      ${section("Session information", "Core key work details.", [
        { name: "session_date", label: "Date", type: "date", value: today(), required: true },
        { name: "topic", label: "Topic", required: true },
        { name: "purpose", label: "Purpose", type: "textarea", full: true },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}

      ${section("Session content", "What was discussed or completed.", [
        { name: "summary", label: "Session summary", type: "textarea", rows: 5, full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", required: true, full: true },
        { name: "reflective_analysis", label: "Reflection / analysis", type: "textarea", full: true },
      ], item)}

      ${meaningSection(item)}

      ${section("Outcome", "What changes or actions were agreed.", [
        { name: "actions_agreed", label: "Actions agreed", type: "textarea", full: true },
        { name: "next_session_date", label: "Next session date", type: "date" },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      ], item)}
    `,
  };
}

function riskForm(item = {}) {
  return {
    title: "Risk assessment",
    intro:
      "Record the risk category, concern, triggers, controls, response actions and review date.",
    required: ["category", "title"],
    html: `
      ${journeySection(item)}

      ${section("Risk overview", "Identify the risk and review date.", [
        { name: "category", label: "Category", required: true },
        { name: "title", label: "Risk title", required: true },
        { name: "review_date", label: "Review date", type: "date", value: today() },
        { name: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS, value: "medium" },
        { name: "likelihood", label: "Likelihood", type: "select", options: SEVERITY_OPTIONS, value: "medium" },
        { name: "status", label: "Status", type: "select", options: [
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
          { value: "archived", label: "Archived" },
        ], value: "active" },
      ], item)}

      ${section("Assessment", "Describe the concern and what may increase risk.", [
        { name: "concern_summary", label: "Concern summary", type: "textarea", rows: 5, full: true },
        { name: "known_triggers", label: "Known triggers", type: "textarea", full: true },
        { name: "early_warning_signs", label: "Early warning signs", type: "textarea", full: true },
        { name: "contextual_factors", label: "Contextual factors", type: "textarea", full: true },
      ], item)}

      ${meaningSection(item)}

      ${section("Controls and response", "Set out what adults should do.", [
        { name: "current_controls", label: "Current controls", type: "textarea", full: true },
        { name: "deescalation_strategies", label: "De-escalation strategies", type: "textarea", full: true },
        { name: "response_actions", label: "Response actions", type: "textarea", rows: 5, full: true },
        { name: "child_views", label: "Child views", type: "textarea", full: true },
        { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      ], item)}
    `,
  };
}

function simpleForm(type, item = {}) {
  const label = getRecordLabel(type, "Record");
  const primaryDate = getRecordPrimaryDateField(type) || "created_at";
  const isDateTime = primaryDate.includes("datetime");

  return {
    title: label,
    intro:
      "Complete this record clearly, including context, voice, meaning and follow-up.",
    required: ["title", "summary"],
    html: `
      ${journeySection(item)}
      ${section("Record details", "Core information for this record.", [
        { name: primaryDate, label: "Date", type: isDateTime ? "datetime-local" : "date", value: isDateTime ? now() : today() },
        { name: "title", label: "Title", required: true },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("Summary", "Record the detail clearly.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 6, required: true, full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
      ], item)}
      ${meaningSection(item)}
      ${section("Actions", "Record follow-up and oversight.", [
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
        { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      ], item)}
    `,
  };
}

function getForm(type, item = {}) {
  const safeType = normaliseRecordType(type) || type;

  if (safeType === "daily_note") return dailyRecord(item);
  if (safeType === "incident") return incidentForm(item);
  if (safeType === "keywork") return keyworkForm(item);
  if (safeType === "risk") return riskForm(item);

  return simpleForm(safeType, item);
}

function getComposerIds() {
  return {
    youngPersonId: getYoungPersonId(),
    homeId: getHomeId(),
  };
}

function collectFormData(form) {
  const data = Object.fromEntries(new FormData(form));

  form.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    data[checkbox.name] = checkbox.checked;
  });

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") data[key] = value.trim();
  });

  return data;
}

function validateRequired(data = {}, required = []) {
  return required.filter((key) => {
    const value = data[key];
    return value === null || value === undefined || String(value).trim() === "";
  });
}

function runWritingQualityCheck(data = {}) {
  const issues = [];
  const joined = Object.values(data)
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  COMMON_SPELLING_HINTS.forEach(([wrong, right]) => {
    if (joined.includes(wrong)) {
      issues.push(`Possible spelling: "${wrong}" should be "${right}"`);
    }
  });

  return issues;
}

function strictValidation(type, data = {}) {
  const issues = [];

  if (
    !data.note_date &&
    !data.record_date &&
    !data.incident_datetime &&
    !data.session_date &&
    !data.review_date
  ) {
    issues.push("date or context");
  }

  if (!data.narrative && !data.summary && !data.description && !data.concern_summary) {
    issues.push("summary / factual account");
  }

  if (
    !data.young_person_voice &&
    !data.child_voice &&
    !data.child_views &&
    !data.disclosure_details
  ) {
    issues.push("child voice or reason unavailable");
  }

  if (
    !data.what_is_child_communicating &&
    !data.what_helped &&
    !data.what_did_adults_learn &&
    !data.what_needs_to_change &&
    !data.reflective_analysis &&
    !data.concern_summary
  ) {
    issues.push("meaning / analysis");
  }

  if (
    !data.actions_required &&
    !data.actions_taken &&
    !data.response_actions &&
    !data.follow_up_required &&
    !data.actions_agreed
  ) {
    issues.push("actions or response");
  }

  if (
    ["incident", "risk", "safeguarding_record"].includes(type) &&
    ["high", "critical"].includes(String(data.severity || "").toLowerCase()) &&
    !data.manager_oversight &&
    !data.manager_review_comment &&
    !data.manager_review_needed
  ) {
    issues.push("manager oversight for high-risk record");
  }

  return issues;
}

function qualityCheck(type, data = {}, required = []) {
  const missing = validateRequired(data, required);
  return [...new Set(missing.map((key) => key.replaceAll("_", " ")))];
}

function applySmartDefaults(type, data = {}) {
  const next = { ...data };

  const highRisk =
    ["high", "critical"].includes(String(next.severity || "").toLowerCase()) ||
    next.safeguarding_concern === true ||
    type === "safeguarding_record";

  if (highRisk) {
    next.manager_review_needed = true;
  }

  if (type === "daily_note" && !next.title) {
    next.title = "Daily note";
  }

  if (type === "risk" && !next.approval_status) {
    next.approval_status = "not_required";
  }

  return next;
}

function buildPayload(type, data = {}, mode = "draft") {
  const status = mode === "submit" ? "submitted" : data.status || "draft";
  const smartData = applySmartDefaults(type, data);

  return {
    ...smartData,
    workflow_status: status,
    status: smartData.status || status,
    record_type: type,
    young_person_id: getYoungPersonId(),
    home_id: getHomeId(),
  };
}

async function maybeCreateFollowUpTask(ids, type, data = {}) {
  if (!data.create_follow_up_task) return null;

  const description =
    data.actions_required ||
    data.actions_taken ||
    data.response_actions ||
    data.follow_up_required ||
    data.actions_agreed ||
    "";

  if (!description) return null;

  try {
    return await createRecord("task", ids, {
      title: `Follow-up: ${getRecordLabel(type, type)}`,
      description,
      priority: data.severity || data.significance || "medium",
      status: "draft",
      due_date: data.next_action_date || data.next_session_date || "",
      young_person_id: ids.youngPersonId,
      home_id: ids.homeId,
    });
  } catch (error) {
    console.warn("[composer] follow-up task creation failed", error);
    return null;
  }
}

export function openComposer(type, item = {}) {
  const safeType = normaliseRecordType(type) || type;

  state.composerRecordType = safeType;
  state.composerEditItem = item || null;
  state.composerMode = getRecordId(item) ? "edit" : "create";

  const form = getForm(safeType, item);
  state.composerRequiredFields = form.required || [];

  const titleEl =
    els.composerTitle ||
    document.getElementById("recordComposerTitle") ||
    document.getElementById("composerTitle");

  const guidanceEl =
    els.composerGuidanceText ||
    document.getElementById("recordComposerGuidanceText") ||
    document.getElementById("composerGuidanceText");

  const fieldsEl = getComposerFields();
  const panel = getComposerPanel();

  if (titleEl) titleEl.textContent = form.title;
  if (guidanceEl) {
    guidanceEl.textContent = `${form.intro} Spelling and grammar support is enabled in all writing fields.`;
  }
  if (fieldsEl) fieldsEl.innerHTML = form.html;

  panel?.classList.remove("hidden");
  panel?.setAttribute("aria-hidden", "false");

  const firstInput = fieldsEl?.querySelector("input, textarea, select");
  if (firstInput) window.setTimeout(() => firstInput.focus(), 50);
}

export function openComposerFor(type, mode = "create", item = {}) {
  openComposer(type, item);
  state.composerMode = mode || (getRecordId(item) ? "edit" : "create");
  state.composerEditItem = item || null;
  return state.composerEditItem;
}

export function closeComposer() {
  const panel = getComposerPanel();
  panel?.classList.add("hidden");
  panel?.setAttribute("aria-hidden", "true");
}

export function resetComposer() {
  const form = getComposerForm();
  const fieldsEl = getComposerFields();

  if (form) form.reset();
  if (fieldsEl) fieldsEl.innerHTML = "";

  state.composerRecordType = null;
  state.composerEditItem = null;
  state.composerMode = "create";
  state.composerRequiredFields = [];

  closeComposer();
}

function dispatchComposerSaved(detail = {}) {
  window.dispatchEvent(
    new CustomEvent("indicare:record-saved", {
      detail: {
        ...detail,
        timestamp: new Date().toISOString(),
      },
    })
  );
}

export async function saveComposer(mode = "draft") {
  const form = getComposerForm();

  if (!form) throw new Error("Composer form is not available.");

  const type =
    normaliseRecordType(state.composerRecordType) || state.composerRecordType;

  if (!type) throw new Error("No record type selected.");

  const ids = getComposerIds();

  if (!ids.youngPersonId) {
    throw new Error("Select a child or young person first.");
  }

  const data = collectFormData(form);
  const required = state.composerRequiredFields || getForm(type).required || [];
  const issues = qualityCheck(type, data, required);

  if (issues.length && mode === "submit") {
    throw new Error(`Please complete: ${issues.join(", ")}`);
  }

  if (mode === "submit") {
    const strictIssues = strictValidation(type, data);
    if (strictIssues.length) {
      throw new Error(`Submit requires: ${strictIssues.join(", ")}`);
    }

    const writingIssues = runWritingQualityCheck(data);
    if (writingIssues.length) {
      throw new Error(`Please review writing: ${writingIssues.join("; ")}`);
    }
  }

  const payload = buildPayload(type, data, mode);
  const editItem = state.composerEditItem || {};
  const recordId = getRecordId(editItem);

  let saved;

  if (state.composerMode === "edit" && recordId) {
    saved = await updateRecord(type, ids, recordId, payload);
  } else {
    saved = await createRecord(type, ids, payload);
  }

  const followUpTask = await maybeCreateFollowUpTask(ids, type, payload);

  closeComposer();

  dispatchComposerSaved({
    type,
    mode,
    saved,
    followUpTask,
  });

  return saved;
}

export function bindComposerEvents({ onSaved } = {}) {
  if (state.composerEventsBound) return;
  state.composerEventsBound = true;

  const form = getComposerForm();

  els.closeComposerBtn?.addEventListener("click", closeComposer);

  const cancelBtn =
    els.composerCancelBtn ||
    document.getElementById("recordComposerCancelBtn") ||
    document.getElementById("composerCancelBtn");

  const draftBtn =
    els.composerDraftBtn ||
    document.getElementById("recordComposerDraftBtn") ||
    document.getElementById("composerDraftBtn");

  const submitBtn =
    els.composerSubmitBtn ||
    document.getElementById("recordComposerSubmitBtn") ||
    document.getElementById("composerSubmitBtn");

  cancelBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    closeComposer();
  });

  draftBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const saved = await saveComposer("draft");
      await onSaved?.(saved);
    } catch (error) {
      console.error("[composer] draft save failed", error);
      window.alert(error?.message || "Unable to save draft.");
    }
  });

  submitBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const saved = await saveComposer("submit");
      await onSaved?.(saved);
    } catch (error) {
      console.error("[composer] submit failed", error);
      window.alert(error?.message || "Unable to submit record.");
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const saved = await saveComposer("submit");
      await onSaved?.(saved);
    } catch (error) {
      console.error("[composer] form submit failed", error);
      window.alert(error?.message || "Unable to submit record.");
    }
  });
}