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
  { value: "settling", label: "Settling in" },
  { value: "living", label: "Living in the home" },
  { value: "review", label: "Review" },
  { value: "transition", label: "Transition" },
  { value: "leaving", label: "Leaving placement" },
  { value: "aftercare", label: "Aftercare" },
];

const STAFF_JOURNEY_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "recruitment", label: "Recruitment" },
  { value: "onboarding", label: "Onboarding" },
  { value: "induction", label: "Induction" },
  { value: "probation", label: "Probation" },
  { value: "practice_development", label: "Practice development" },
  { value: "supervision", label: "Supervision" },
  { value: "training", label: "Training" },
  { value: "wellbeing", label: "Wellbeing" },
  { value: "performance", label: "Performance" },
  { value: "exit", label: "Leaving / exit" },
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

const APPROVAL_OPTIONS = [
  { value: "not_required", label: "Not required" },
  { value: "manager_review", label: "Manager review required" },
  { value: "submitted", label: "Submitted for approval" },
  { value: "approved", label: "Approved" },
  { value: "returned", label: "Returned for changes" },
];

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
  ["non compliant", "non-compliant"],
];

const CHILD_SCOPED_TYPES = new Set([
  "daily_note",
  "incident",
  "keywork",
  "risk",
  "safeguarding_record",
  "health_record",
  "education_record",
  "family_contact",
  "appointment",
  "medication_record",
  "handover_record",
  "document",
  "statutory_document",
  "support_plan",
  "missing_episode",
]);

let composerSaveInProgress = false;

function cleanId(value) {
  if (value === null || value === undefined || value === "") return null;
  const textValue = String(value).trim();
  if (!textValue || textValue === "null" || textValue === "undefined") return null;
  return textValue;
}

function firstId(...values) {
  for (const value of values) {
    const parsed = cleanId(value);
    if (parsed) return parsed;
  }
  return null;
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getDomYoungPersonId() {
  const selectors = [
    "[data-young-person-id]",
    "[data-child-id]",
    "[data-person-id]",
    "[data-selected-young-person-id]",
    "[data-current-young-person-id]",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const value = firstId(
      el?.dataset?.youngPersonId,
      el?.dataset?.childId,
      el?.dataset?.personId,
      el?.dataset?.selectedYoungPersonId,
      el?.dataset?.currentYoungPersonId,
      el?.value
    );
    if (value) return value;
  }

  return null;
}

function getYoungPersonIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = firstId(
    params.get("young_person_id"),
    params.get("youngPersonId"),
    params.get("child_id"),
    params.get("childId"),
    params.get("person_id"),
    params.get("personId"),
    params.get("id")
  );

  if (queryValue) return queryValue;

  const pathMatch = window.location.pathname.match(
    /(?:young-people|children|child|person)[\/-](\d+)/i
  );

  return pathMatch?.[1] || null;
}

function getYoungPersonId() {
  const app = document.getElementById("app");
  const selector = document.getElementById("youngPersonSelect");

  return firstId(
    state.youngPersonId,
    state.currentYoungPersonId,
    state.personId,
    state.currentPersonId,
    state.selectedYoungPersonId,
    state.selectedYoungPerson?.id,
    state.selectedYoungPerson?.young_person_id,
    state.youngPerson?.id,
    state.youngPerson?.young_person_id,
    state.activeYoungPerson?.id,
    state.activeYoungPerson?.young_person_id,
    state.currentYoungPerson?.id,
    state.currentYoungPerson?.young_person_id,
    state.context?.young_person_id,
    state.context?.youngPersonId,
    state.assistantContext?.young_person_id,
    state.assistantContext?.youngPersonId,
    app?.dataset?.youngPersonId,
    app?.dataset?.childId,
    app?.dataset?.personId,
    document.body?.dataset?.youngPersonId,
    document.body?.dataset?.childId,
    document.body?.dataset?.personId,
    selector?.value,
    getDomYoungPersonId(),
    getYoungPersonIdFromUrl(),
    window.__INDICARE_CONTEXT__?.young_person_id,
    window.__INDICARE_CONTEXT__?.youngPersonId,
    window.__INDICARE_STATE__?.youngPersonId,
    window.__INDICARE_STATE__?.selectedYoungPersonId
  );
}

function getHomeId() {
  return firstId(
    state.homeId,
    state.currentHomeId,
    state.selectedHomeId,
    state.readinessSelectedHomeId,
    state.selectedYoungPerson?.home_id,
    state.currentYoungPerson?.home_id,
    state.youngPerson?.home_id,
    state.currentUser?.home_id,
    state.currentUser?.homeId,
    state.context?.home_id,
    state.context?.homeId,
    document.getElementById("app")?.dataset?.homeId,
    document.body?.dataset?.homeId,
    window.__INDICARE_CONTEXT__?.home_id,
    window.__INDICARE_CONTEXT__?.homeId,
    window.__INDICARE_STATE__?.homeId
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
    els.recordComposerPage ||
    document.getElementById("recordComposerPage") ||
    document.getElementById("recordComposerPanel") ||
    document.getElementById("composerPanel") ||
    document.querySelector(".composer-panel") ||
    document.querySelector(".record-composer")
  );
}

function getRecordComposerPage() {
  return document.getElementById("recordComposerPage") || getComposerPanel();
}

function getComposerFields() {
  return (
    document.getElementById("recordComposerFields") ||
    els.composerFields ||
    document.getElementById("composerFields") ||
    document.querySelector("[data-composer-fields]") ||
    getComposerForm()?.querySelector(".composer-fields")
  );
}

function getRecordId(item = {}) {
  return item.id || item.record_id || item.source_id || item.note_id || "";
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
    "Young person journey",
    "Link this record to where the young person is in their placement journey.",
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

function staffJourneySection(item = {}) {
  return section(
    "Adult journey",
    "Link this record to where the adult is in their employment and practice journey.",
    [
      {
        name: "staff_journey_stage",
        label: "Adult journey stage",
        type: "select",
        options: STAFF_JOURNEY_OPTIONS,
      },
    ],
    item
  );
}

function meaningSection(item = {}) {
  return section(
    "Meaning and learning",
    "Move beyond description. Capture what the young person may be communicating and what adults have learnt.",
    [
      {
        name: "what_is_child_communicating",
        label: "What may the young person be communicating?",
        desc: "Consider feelings, needs, stress, trauma responses, sensory needs, relationships, safety and belonging.",
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

function oversightSection(item = {}) {
  return section(
    "Follow-up and oversight",
    "Record next steps, management oversight and whether this should link to quality evidence.",
    [
      { name: "actions_required", label: "Actions required", type: "textarea", full: true },
      { name: "manager_review_comment", label: "Manager review comment", type: "textarea", full: true },
      { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
      { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      { name: "link_to_chronology", label: "Link to chronology", type: "checkbox", value: true },
      { name: "link_quality_standards", label: "Link quality standards", type: "checkbox", value: true },
    ],
    item
  );
}

function dailyRecord(item = {}) {
  return {
    title: "Daily life note",
    intro:
      "Record the day clearly, kindly and professionally. Include the young person’s experience, what adults noticed, what helped, any risk changes and follow-up.",
    required: ["note_date", "shift_type", "young_person_voice", "actions_required"],
    html: `
      ${journeySection(item)}
      ${section("Basic information", "Core shift details for this daily note.", [
        { name: "note_date", label: "Date", type: "date", value: today(), required: true },
        { name: "shift_type", label: "Shift", type: "select", value: "day", required: true, options: SHIFT_OPTIONS },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("What happened", "Give a factual and balanced account of the day.", [
        { name: "narrative", label: "Daily summary", type: "textarea", rows: 5, full: true },
        { name: "activities", label: "Activities, routines and relationships", type: "textarea", rows: 4, full: true },
        { name: "behaviour_update", label: "Presentation / behaviour as communication", type: "textarea", rows: 4, full: true },
      ], item)}
      ${section("Young person’s experience", "Capture how the day appeared from the young person’s perspective.", [
        { name: "mood", label: "Mood / emotional presentation", full: true },
        { name: "presentation", label: "Presentation", type: "textarea", full: true },
        { name: "young_person_voice", label: "Young person’s voice", type: "textarea", required: true, full: true },
        { name: "positives", label: "Strengths, positives and progress", type: "textarea", full: true },
      ], item)}
      ${meaningSection(item)}
      ${section("Health, education and family", "Record any relevant daily updates.", [
        { name: "education_update", label: "Education update", type: "textarea", full: true },
        { name: "health_update", label: "Health update", type: "textarea", full: true },
        { name: "family_update", label: "Family / relationships update", type: "textarea", full: true },
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
      "Record the incident factually and calmly. Include context, de-escalation, child voice, adult response, outcome, notifications and learning.",
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
        { name: "antecedent", label: "What happened before?", type: "textarea", full: true },
        { name: "deescalation_attempted", label: "De-escalation attempted", type: "textarea", full: true },
      ], item)}
      ${section("Young person and staff response", "Capture presentation, voice and adult response.", [
        { name: "presentation", label: "Young person’s presentation", type: "textarea", full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
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
      "Capture the purpose of the session, what was explored, the young person’s voice, reflection, outcomes and agreed actions.",
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
      "Record the risk category, concern, triggers, controls, protective factors, response actions and review date.",
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
        { name: "protective_factors", label: "Protective factors", type: "textarea", full: true },
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

function safeguardingForm(item = {}) {
  return {
    title: "Safeguarding record",
    intro:
      "Record the concern, disclosure or information received, immediate safety action, notifications, referrals and management oversight.",
    required: ["concern_type", "concern_summary", "immediate_action_taken"],
    html: `
      ${journeySection(item)}
      ${section("Concern details", "Describe the safeguarding concern.", [
        { name: "concern_type", label: "Concern type", required: true },
        { name: "concern_datetime", label: "Date and time", type: "datetime-local", value: now() },
        { name: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS, value: "high" },
      ], item)}
      ${section("Concern and voice", "Record facts, disclosure and the young person’s voice.", [
        { name: "concern_summary", label: "Concern summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "disclosure_details", label: "Disclosure / young person’s voice", type: "textarea", full: true },
        { name: "presentation", label: "Presentation", type: "textarea", full: true },
      ], item)}
      ${section("Immediate action and referrals", "Record safeguarding action taken.", [
        { name: "immediate_action_taken", label: "Immediate action taken", type: "textarea", required: true, full: true },
        { name: "referral_details", label: "Referral / notification details", type: "textarea", full: true },
        { name: "placing_authority_notified", label: "Placing authority notified", type: "checkbox" },
        { name: "ofsted_notified", label: "Ofsted notified", type: "checkbox" },
        { name: "police_notified", label: "Police notified", type: "checkbox" },
        { name: "manager_oversight", label: "Manager oversight", type: "textarea", full: true },
      ], item)}
      ${oversightSection(item)}
    `,
  };
}

function healthForm(item = {}) {
  return {
    title: "Health record",
    intro:
      "Record health needs, appointments, advice, treatment, medication impact, young person voice and follow-up.",
    required: ["record_date", "health_area", "summary"],
    html: `
      ${journeySection(item)}
      ${section("Health information", "Core health record details.", [
        { name: "record_date", label: "Date", type: "date", value: today(), required: true },
        { name: "health_area", label: "Health area", required: true },
        { name: "professional_name", label: "Professional / service" },
      ], item)}
      ${section("Health update", "Describe the issue, advice or outcome.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
        { name: "outcome", label: "Outcome", type: "textarea", full: true },
      ], item)}
      ${section("Follow-up", "Record actions and next steps.", [
        { name: "next_action_date", label: "Next action date", type: "date" },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
        { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
      ], item)}
    `,
  };
}

function educationForm(item = {}) {
  return {
    title: "Education record",
    intro:
      "Record attendance, engagement, learning experience, achievements, barriers, voice and follow-up.",
    required: ["record_date", "education_area", "summary"],
    html: `
      ${journeySection(item)}
      ${section("Education information", "Core education details.", [
        { name: "record_date", label: "Date", type: "date", value: today(), required: true },
        { name: "education_area", label: "Education area", required: true },
        { name: "school_or_provider", label: "School / provider" },
      ], item)}
      ${section("Learning and experience", "Capture what happened and how the young person experienced it.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "learning_engagement", label: "Learning engagement", type: "textarea", full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
        { name: "achievement_note", label: "Achievement / progress", type: "textarea", full: true },
      ], item)}
      ${section("Actions", "Record follow-up.", [
        { name: "issue_raised", label: "Issue raised", type: "textarea", full: true },
        { name: "action_taken", label: "Action taken / required", type: "textarea", full: true },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      ], item)}
    `,
  };
}

function familyContactForm(item = {}) {
  return {
    title: "Family contact",
    intro:
      "Record contact arrangements, presentation before and after, young person voice, impact, concerns and follow-up.",
    required: ["contact_datetime", "contact_type", "summary"],
    html: `
      ${journeySection(item)}
      ${section("Contact details", "Core family contact information.", [
        { name: "contact_datetime", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "contact_type", label: "Contact type", required: true },
        { name: "contact_person", label: "Person contacted" },
      ], item)}
      ${section("Experience", "Capture the young person’s experience.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "pre_contact_presentation", label: "Before contact", type: "textarea", full: true },
        { name: "post_contact_presentation", label: "After contact", type: "textarea", full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
      ], item)}
      ${section("Concerns and follow-up", "Record any impact, concern or next step.", [
        { name: "concerns", label: "Concerns", type: "textarea", full: true },
        { name: "follow_up_required", label: "Follow-up required", type: "textarea", full: true },
        { name: "create_follow_up_task", label: "Create follow-up task", type: "checkbox" },
      ], item)}
    `,
  };
}

function appointmentForm(item = {}) {
  return {
    title: "Appointment",
    intro:
      "Record appointment purpose, time, preparation, attendance, outcome and follow-up.",
    required: ["appointment_date", "appointment_type"],
    html: `
      ${journeySection(item)}
      ${section("Appointment details", "Core appointment information.", [
        { name: "appointment_date", label: "Appointment date", type: "datetime-local", value: now(), required: true },
        { name: "appointment_type", label: "Appointment type", required: true },
        { name: "location", label: "Location" },
        { name: "professional_name", label: "Professional / service" },
      ], item)}
      ${section("Purpose and preparation", "What is this appointment for?", [
        { name: "purpose", label: "Purpose", type: "textarea", full: true },
        { name: "preparation_needed", label: "Preparation needed", type: "textarea", full: true },
      ], item)}
      ${section("Outcome", "Complete after the appointment where relevant.", [
        { name: "outcome", label: "Outcome", type: "textarea", full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function taskForm(item = {}) {
  return {
    title: "Action / task",
    intro:
      "Create a clear task with ownership, priority, due date and closure expectation.",
    required: ["title", "description"],
    html: `
      ${section("Task details", "What needs to happen?", [
        { name: "title", label: "Task title", required: true },
        { name: "due_date", label: "Due date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("Description", "Give enough detail for someone else to complete it safely.", [
        { name: "description", label: "Task description", type: "textarea", rows: 5, required: true, full: true },
        { name: "owner_name", label: "Owner" },
        { name: "completion_notes", label: "Completion notes", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function medicationRecordForm(item = {}) {
  return {
    title: "Medication record",
    intro:
      "Record medication administration, omission, refusal, error or concern clearly and safely.",
    required: ["administered_at", "medication_name", "status"],
    html: `
      ${journeySection(item)}
      ${section("Medication details", "Core medication information.", [
        { name: "administered_at", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "medication_name", label: "Medication name", required: true },
        { name: "dose", label: "Dose" },
        { name: "route", label: "Route" },
        { name: "status", label: "Status", type: "select", required: true, options: [
          { value: "administered", label: "Administered" },
          { value: "refused", label: "Refused" },
          { value: "omitted", label: "Omitted" },
          { value: "error", label: "Medication error" },
        ] },
      ], item)}
      ${section("Details", "Record what happened and any action taken.", [
        { name: "notes", label: "Notes", type: "textarea", full: true },
        { name: "child_voice", label: "Young person’s voice", type: "textarea", full: true },
        { name: "refusal_reason", label: "Refusal reason", type: "textarea", full: true },
        { name: "omission_reason", label: "Omission reason", type: "textarea", full: true },
        { name: "error_details", label: "Error details", type: "textarea", full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
        { name: "manager_review_needed", label: "Manager review needed", type: "checkbox" },
      ], item)}
    `,
  };
}

function handoverForm(item = {}) {
  return {
    title: "Handover record",
    intro:
      "Record key information needed for the next shift to provide safe, consistent and thoughtful care.",
    required: ["handover_datetime", "shift", "summary"],
    html: `
      ${section("Handover details", "Core shift handover information.", [
        { name: "handover_datetime", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "shift", label: "Shift", type: "select", options: SHIFT_OPTIONS, required: true },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("Key handover", "What must the next adults know?", [
        { name: "summary", label: "Handover summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "risks_to_monitor", label: "Risks to monitor", type: "textarea", full: true },
        { name: "positive_updates", label: "Positive updates", type: "textarea", full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function documentForm(item = {}) {
  return {
    title: "Document record",
    intro:
      "Record document details, review dates, ownership and any actions needed.",
    required: ["title"],
    html: `
      ${section("Document details", "Describe the document being recorded.", [
        { name: "title", label: "Document title", required: true },
        { name: "document_type", label: "Document type" },
        { name: "review_date", label: "Review date", type: "date" },
        { name: "expiry_date", label: "Expiry date", type: "date" },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("Summary and actions", "Why this document matters and what needs doing.", [
        { name: "description", label: "Description", type: "textarea", full: true },
        { name: "summary", label: "Summary", type: "textarea", full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function staffRecordForm(type, item = {}) {
  const label = getRecordLabel(type, "Staff record");

  return {
    title: label,
    intro:
      "Record the adult’s journey clearly, including onboarding, supervision, learning, wellbeing, performance and follow-up.",
    required: ["title", "summary"],
    html: `
      ${staffJourneySection(item)}
      ${section("Record details", "Core information for this adult journey record.", [
        { name: "record_date", label: "Date", type: "date", value: today() },
        { name: "title", label: "Title", required: true },
        { name: "staff_member_name", label: "Staff member" },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}
      ${section("Summary", "Record the detail clearly and professionally.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 6, required: true, full: true },
        { name: "strengths", label: "Strengths / positive practice", type: "textarea", full: true },
        { name: "development_needs", label: "Development needs", type: "textarea", full: true },
      ], item)}
      ${section("Follow-up", "Record support, actions and oversight.", [
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
        { name: "next_review_date", label: "Next review date", type: "date" },
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
        { name: "approval_status", label: "Approval status", type: "select", options: APPROVAL_OPTIONS },
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
  if (safeType === "safeguarding_record") return safeguardingForm(item);
  if (safeType === "health_record") return healthForm(item);
  if (safeType === "education_record") return educationForm(item);
  if (safeType === "family_contact") return familyContactForm(item);
  if (safeType === "appointment") return appointmentForm(item);
  if (safeType === "task") return taskForm(item);
  if (safeType === "medication_record") return medicationRecordForm(item);
  if (safeType === "handover_record") return handoverForm(item);
  if (safeType === "document" || safeType === "statutory_document") {
    return documentForm(item);
  }

  if (
    [
      "staff_profile",
      "supervision",
      "training",
      "onboarding",
      "probation",
      "staff_wellbeing",
      "performance",
      "exit_interview",
    ].includes(safeType)
  ) {
    return staffRecordForm(safeType, item);
  }

  return simpleForm(safeType, item);
}

function getComposerIds() {
  const youngPersonId = getYoungPersonId();
  const homeId = getHomeId();

  return {
    youngPersonId: youngPersonId ? String(youngPersonId) : null,
    homeId: homeId ? String(homeId) : null,
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
    !data.review_date &&
    !data.appointment_date &&
    !data.handover_datetime &&
    !data.administered_at
  ) {
    issues.push("date or context");
  }

  if (!data.narrative && !data.summary && !data.description && !data.concern_summary && !data.title) {
    issues.push("summary / factual account");
  }

  if (
    ["daily_note", "incident", "keywork", "risk", "safeguarding_record"].includes(type) &&
    !data.young_person_voice &&
    !data.child_voice &&
    !data.child_views &&
    !data.disclosure_details
  ) {
    issues.push("child voice or reason unavailable");
  }

  if (
    ["daily_note", "incident", "keywork", "risk"].includes(type) &&
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
    !data.actions_agreed &&
    !data.description
  ) {
    issues.push("actions or response");
  }

  if (
    ["incident", "risk", "safeguarding_record", "medication_record"].includes(type) &&
    ["high", "critical"].includes(String(data.severity || "").toLowerCase()) &&
    !data.manager_oversight &&
    !data.manager_review_comment &&
    !data.manager_review_needed
  ) {
    issues.push("manager oversight for high-risk record");
  }

  return [...new Set(issues)];
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
    type === "safeguarding_record" ||
    type === "medication_record";

  if (highRisk) {
    next.manager_review_needed = true;
    next.approval_status = next.approval_status || "manager_review";
  }

  if (type === "daily_note" && !next.title) next.title = "Daily life note";
  if (type === "incident" && !next.title) next.title = next.incident_type || "Incident";
  if (type === "risk" && !next.approval_status) next.approval_status = "manager_review";

  return next;
}

function buildPayload(type, data = {}, mode = "draft", ids = getComposerIds()) {
  const status = mode === "submit" ? "submitted" : data.status || "draft";
  const smartData = applySmartDefaults(type, data);

  return {
    ...smartData,
    workflow_status: status,
    status: smartData.status || status,
    record_type: type,
    young_person_id: ids.youngPersonId ? toNumberOrNull(ids.youngPersonId) : null,
    home_id: ids.homeId ? toNumberOrNull(ids.homeId) : null,
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
      due_date: data.next_action_date || data.next_session_date || data.next_review_date || "",
      young_person_id: ids.youngPersonId ? toNumberOrNull(ids.youngPersonId) : null,
      home_id: ids.homeId ? toNumberOrNull(ids.homeId) : null,
    });
  } catch (error) {
    console.warn("[composer] follow-up task creation failed", error);
    return null;
  }
}

function setComposerFeedback(message = "") {
  const feedback =
    els.composerAiFeedback || document.getElementById("composerAiFeedback");

  if (!feedback) return;
  feedback.textContent = message || "No review has been run yet.";
}

function updateQualityStrip(data = {}) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set(
    "qualityFactsStatus",
    data.narrative || data.summary || data.description || data.concern_summary
      ? "Present"
      : "Needs detail"
  );

  set(
    "qualityChildVoiceStatus",
    data.young_person_voice || data.child_voice || data.child_views || data.disclosure_details
      ? "Present"
      : "Add voice"
  );

  set(
    "qualityActionsStatus",
    data.actions_required || data.actions_taken || data.response_actions || data.actions_agreed
      ? "Present"
      : "Add actions"
  );

  set(
    "qualityOversightStatus",
    data.manager_oversight || data.manager_review_comment || data.manager_review_needed
      ? "Present"
      : "As needed"
  );
}

function runComposerReview() {
  const form = getComposerForm();
  if (!form) return;

  const type =
    normaliseRecordType(state.composerRecordType) || state.composerRecordType || "";

  const data = collectFormData(form);
  updateQualityStrip(data);

  const required = state.composerRequiredFields || getForm(type).required || [];
  const requiredIssues = qualityCheck(type, data, required);
  const strictIssues = strictValidation(type, data);
  const writingIssues = runWritingQualityCheck(data);

  const issues = [...requiredIssues, ...strictIssues, ...writingIssues];

  if (!issues.length) {
    setComposerFeedback(
      "This record has the key ingredients: factual detail, voice, analysis, actions and oversight where needed."
    );
    return;
  }

  setComposerFeedback(`Review before submitting: ${issues.join("; ")}.`);
}

function bindComposerReviewButtons() {
  const bindings = [
    "composerCheckBtn",
    "composerGrammarBtn",
    "composerClarityBtn",
    "composerSafeguardingBtn",
    "composerChildVoiceBtn",
    "composerLanguageBtn",
  ];

  bindings.forEach((id) => {
    const button = document.getElementById(id);
    if (!button || button.dataset.reviewBound === "true") return;

    button.dataset.reviewBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      runComposerReview();
    });
  });

  const form = getComposerForm();
  if (form && form.dataset.qualityBound !== "true") {
    form.dataset.qualityBound = "true";

    let qualityStripRaf = null;
    form.addEventListener("input", () => {
      if (qualityStripRaf) return;
      qualityStripRaf = window.requestAnimationFrame(() => {
        qualityStripRaf = null;
        updateQualityStrip(collectFormData(form));
      });
    });
  }
}

function forceComposerVisible(panel) {
  if (!panel) return;

  document.getElementById("assistantModal")?.classList.add("hidden");
  document.getElementById("assistantBackdrop")?.classList.add("hidden");
  document.getElementById("assistantModal")?.setAttribute("aria-hidden", "true");
  document.getElementById("assistantBackdrop")?.setAttribute("aria-hidden", "true");

  panel.classList.remove("hidden");
  panel.classList.add("composer-panel");
  panel.setAttribute("aria-hidden", "false");

  Object.assign(panel.style, {
    display: "grid",
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    placeItems: "center",
    pointerEvents: "auto",
    background: "rgba(15, 23, 42, 0.42)",
  });

  const shell = panel.querySelector(".composer-shell");

  if (shell) {
    Object.assign(shell.style, {
      display: "grid",
      position: "relative",
      zIndex: "2147483647",
      width: "min(1440px, 96vw)",
      maxHeight: "92vh",
      overflow: "hidden",
      pointerEvents: "auto",
      opacity: "1",
      visibility: "visible",
      background: "var(--surface, #fff)",
    });
  }

  document.body.classList.add("composer-open");
  document.body.style.overflow = "hidden";
}

function clearComposerForcedVisibility(panel) {
  if (!panel) return;

  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
  panel.removeAttribute("style");

  const shell = panel.querySelector(".composer-shell");
  shell?.removeAttribute("style");

  document.body.classList.remove("composer-open");
  document.body.style.overflow = "";
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

  const subtitleEl =
    els.composerSubtitle ||
    document.getElementById("composerSubtitle");

  const guidanceEl =
    els.composerGuidanceText ||
    document.getElementById("recordComposerGuidanceText") ||
    document.getElementById("composerGuidanceText");

  const fieldsEl = getComposerFields();
  const panel = getRecordComposerPage();

  if (titleEl) titleEl.textContent = form.title;
  if (subtitleEl) subtitleEl.textContent = form.intro;

  if (guidanceEl) {
    guidanceEl.textContent =
      `${form.intro} Use factual language, include the young person’s experience, and make next steps clear.`;
  }

  if (fieldsEl) fieldsEl.innerHTML = form.html;

  setComposerFeedback("No review has been run yet.");

  forceComposerVisible(panel);

  window.requestAnimationFrame(() => {
    updateQualityStrip({});
    bindComposerReviewButtons();
  });

  console.log("[composer] openComposer rendered", {
    safeType,
    titleFound: !!titleEl,
    subtitleFound: !!subtitleEl,
    fieldsFound: !!fieldsEl,
    panelFound: !!panel,
    fieldsLength: fieldsEl?.innerHTML?.length,
    panelClass: panel?.className,
    ariaHidden: panel?.getAttribute("aria-hidden"),
  });

}

export function openComposerFor(type, mode = "create", item = {}) {
  const safeType = normaliseRecordType(type) || type;

  state.composerRecordType = safeType;
  state.composerMode = mode || (getRecordId(item) ? "edit" : "create");
  state.composerEditItem = item || null;

  openComposer(safeType, item);

  state.composerMode = mode || (getRecordId(item) ? "edit" : "create");
  state.composerEditItem = item || null;

  console.log("[composer] openComposerFor complete", {
    type,
    safeType,
    mode: state.composerMode,
    item,
    panel: document.getElementById("recordComposerPage")?.className,
    fieldsLength: document.getElementById("recordComposerFields")?.innerHTML?.length,
  });

  return state.composerEditItem;
}

export function closeComposer() {
  state.composerMode = "closed";
  const panel = getRecordComposerPage();
  clearComposerForcedVisibility(panel);
}

export function resetComposer() {
  const form = getComposerForm();
  const fieldsEl = getComposerFields();

  if (form) form.reset();
  if (fieldsEl) fieldsEl.innerHTML = "";

  state.composerRecordType = null;
  state.composerEditItem = null;
  state.composerMode = "closed";
  state.composerRequiredFields = [];

  setComposerFeedback("No review has been run yet.");
  updateQualityStrip({});
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

function setSavingState(isSaving, label = "Saving...") {
  const buttons = [
    els.composerDraftBtn,
    els.composerSaveDraftBtn,
    els.composerSubmitBtn,
    document.getElementById("recordComposerDraftBtn"),
    document.getElementById("composerDraftBtn"),
    document.getElementById("composerSaveDraftBtn"),
    document.getElementById("recordComposerSubmitBtn"),
    document.getElementById("composerSubmitBtn"),
  ].filter(Boolean);

  buttons.forEach((button) => {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent || "";
    }

    button.disabled = isSaving;

    if (isSaving) {
      button.textContent = label;
    } else {
      button.textContent = button.dataset.originalText || button.textContent;
    }
  });
}

function buildDailyNotePayload(data, ids, status) {
  return {
    note_date: data.note_date || today(),
    shift_type: data.shift_type || "day",
    presentation: data.presentation || null,
    behaviour_update: data.behaviour_update || null,
    positives: data.positives || null,
    actions_required: data.actions_required || null,
    young_person_voice: data.young_person_voice || null,
    workflow_status: status,
    status,
    young_person_id: toNumberOrNull(ids.youngPersonId),
    home_id: toNumberOrNull(ids.homeId || data.home_id || 1),
  };
}

export async function saveComposer(mode = "draft") {
  if (composerSaveInProgress) {
    console.warn("[composer] duplicate save blocked");
    return null;
  }

  composerSaveInProgress = true;
  setSavingState(true, mode === "submit" ? "Submitting..." : "Saving...");

  console.log("[composer] save started", {
    mode,
    composerMode: state.composerMode,
    composerRecordType: state.composerRecordType,
    composerEditItem: state.composerEditItem,
  });

  try {
    const form = getComposerForm();
    if (!form) throw new Error("Composer form is not available.");

    const type =
      normaliseRecordType(state.composerRecordType) || state.composerRecordType;

    if (!type) throw new Error("No record type selected.");

    const ids = getComposerIds();

    console.log("[composer] ids resolved", ids);

    if (CHILD_SCOPED_TYPES.has(type) && !ids.youngPersonId) {
      throw new Error("Select a child or young person first.");
    }

    const data = collectFormData(form);

    console.log("[composer] form data collected", data);

    const required = state.composerRequiredFields || getForm(type).required || [];
    const missing = validateRequired(data, required);

    if (missing.length) {
      throw new Error(`Please complete: ${missing.map((key) => key.replaceAll("_", " ")).join(", ")}.`);
    }

    const status = mode === "submit" ? "submitted" : data.status || "draft";

    const payload =
      type === "daily_note"
        ? buildDailyNotePayload(data, ids, status)
        : buildPayload(type, data, mode, ids);

    console.log("[composer] payload ready", {
      type,
      mode,
      ids,
      payload,
    });

    const editItem = state.composerEditItem || {};
    const existingId = getRecordId(editItem);
    const isEdit = state.composerMode === "edit" && existingId;

    let saved;

    if (isEdit) {
      console.log("[composer] updateRecord starting", {
        type,
        existingId,
        ids,
        payload,
      });

      saved = await updateRecord(type, existingId, ids, payload);

      console.log("[composer] updateRecord complete", saved);
    } else {
      console.log("[composer] createRecord starting", {
        type,
        ids,
        payload,
      });

      saved = await createRecord(type, ids, payload);

      console.log("[composer] createRecord complete", saved);
    }

    const followUp = await maybeCreateFollowUpTask(ids, type, data);

    if (followUp) {
      console.log("[composer] follow-up task created", followUp);
    }

    dispatchComposerSaved({
      type,
      mode,
      ids,
      payload,
      saved,
      followUp,
      action: isEdit ? "update" : "create",
    });

    closeComposer();

    console.log("[composer] save finished", saved);

    return saved;
  } catch (error) {
    console.error("[composer] save failed", error);
    throw error;
  } finally {
    composerSaveInProgress = false;
    setSavingState(false);
  }
}

async function runSaveAndRefresh(mode, onSaved) {
  try {
    const saved = await saveComposer(mode);

    console.log("[composer] saveComposer returned", saved);

    if (!saved) return saved;

    try {
      console.log("[composer] onSaved starting");
      await onSaved?.(saved);
      console.log("[composer] onSaved complete");
    } catch (error) {
      console.error("[composer] onSaved failed after save", error);
      window.alert(
        "The record saved, but the screen refresh failed. Refresh the page if you cannot see the new record."
      );
    }

    return saved;
  } catch (error) {
    console.error(`[composer] ${mode} failed`, error);
    window.alert(error?.message || "Unable to save record.");
    return null;
  }
}

export function bindComposerEvents({ onSaved } = {}) {
  if (state.composerEventsBound) return;
  state.composerEventsBound = true;

  const closeBtn =
    els.closeComposerBtn ||
    document.getElementById("closeComposerBtn");

  closeBtn?.addEventListener("click", closeComposer);

  const cancelBtn =
    els.composerCancelBtn ||
    document.getElementById("recordComposerCancelBtn") ||
    document.getElementById("composerCancelBtn");

  const draftBtn =
    els.composerDraftBtn ||
    els.composerSaveDraftBtn ||
    document.getElementById("recordComposerDraftBtn") ||
    document.getElementById("composerDraftBtn") ||
    document.getElementById("composerSaveDraftBtn");

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
    await runSaveAndRefresh("draft", onSaved);
  });

  submitBtn?.addEventListener("click", async (event) => {
    event.preventDefault();
    await runSaveAndRefresh("submit", onSaved);
  });

  document.addEventListener("submit", async (event) => {
    const form = getComposerForm();
    if (!form || event.target !== form) return;

    event.preventDefault();
    event.stopPropagation();

    await runSaveAndRefresh("submit", onSaved);
  });

  bindComposerReviewButtons();
}
