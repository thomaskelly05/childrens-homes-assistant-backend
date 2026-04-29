import { state } from "../state.js";
import { els } from "../dom.js";
import {
  createRecord,
  updateRecord,
} from "../core/api-adapter.js";
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

function safeValue(value = "") {
  return value ?? "";
}

function getYoungPersonId() {
  return (
    state.youngPersonId ||
    state.currentYoungPersonId ||
    state.selectedYoungPerson?.id ||
    state.selectedYoungPerson?.young_person_id ||
    document.getElementById("app")?.dataset?.youngPersonId ||
    null
  );
}

function getRecordId(item = {}) {
  return item.id || item.record_id || item.source_id || "";
}

function text(value = "") {
  return escapeHtml(String(value ?? ""));
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
        <input type="checkbox" name="${text(f.name)}" value="true" ${checked ? "checked" : ""} />
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

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function dailyRecord(item = {}) {
  return {
    title: "Daily note",
    intro:
      "Record the day clearly, including the young person’s experience, staff response, risk changes and follow-up.",
    required: ["note_date", "summary", "young_person_voice", "actions_required"],
    html: `
      ${section("Basic information", "Core shift details for this daily note.", [
        { name: "note_date", label: "Date", type: "date", value: today(), required: true, desc: "The date this daily note relates to." },
        { name: "shift", label: "Shift", desc: "For example: day, late, waking night or sleep-in." },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}

      ${section("What happened", "Give a clear, factual account of the day.", [
        { name: "summary", label: "Daily summary", type: "textarea", rows: 5, required: true, full: true, desc: "Summarise the key events, routines, presentation and meaningful moments." },
        { name: "chronology", label: "Chronology", type: "textarea", rows: 5, full: true, desc: "Set out important events in order. Keep this factual and neutral." },
      ], item)}

      ${section("Young person’s experience", "Capture how the day appeared from the young person’s perspective.", [
        { name: "presentation", label: "Presentation", type: "textarea", full: true, desc: "Mood, regulation, behaviour, engagement, sleep, appetite and emotional presentation." },
        { name: "young_person_voice", label: "Young person’s voice", type: "textarea", required: true, full: true, desc: "Use exact words where possible, or describe communication, behaviour or non-verbal expression." },
        { name: "analysis", label: "What this may mean", type: "textarea", full: true, desc: "Brief reflective analysis. What might the behaviour, presentation or communication be telling us?" },
      ], item)}

      ${section("Staff response and follow-up", "Show what adults did, why, and what must happen next.", [
        { name: "staff_response", label: "Staff response", type: "textarea", full: true, desc: "What staff did, how they supported the young person, and why." },
        { name: "risk_update", label: "Risk update", type: "textarea", full: true, desc: "Any change in risk, protective factors or monitoring needed." },
        { name: "actions_required", label: "Actions required", type: "textarea", required: true, full: true, desc: "Clear follow-up with owner, timescale or escalation where known." },
        { name: "manager_oversight", label: "Manager oversight", type: "textarea", full: true, desc: "Any decision, review, escalation or management sign-off needed." },
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
      ${section("Incident details", "Core incident information.", [
        { name: "incident_datetime", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "incident_type", label: "Incident type", required: true, desc: "For example: aggression, missing episode, self-harm concern, damage, allegation, restraint, medication error." },
        { name: "location", label: "Location" },
        { name: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS },
      ], item)}

      ${section("Factual account", "A clear, neutral chronology of what happened.", [
        { name: "description", label: "What happened", type: "textarea", rows: 6, required: true, full: true, desc: "Describe what happened. Avoid judgemental language. Include who was present and what was observed." },
        { name: "antecedent", label: "What happened before", type: "textarea", full: true, desc: "Known triggers, context, changes, interactions or events leading up to the incident." },
      ], item)}

      ${section("Young person and staff response", "Capture presentation, child voice and adult response.", [
        { name: "presentation", label: "Presentation", type: "textarea", full: true, desc: "Emotional state, behaviour, regulation, communication and signs of distress." },
        { name: "child_voice", label: "Child voice", type: "textarea", full: true, desc: "Exact words where possible, or describe non-verbal communication." },
        { name: "staff_response", label: "Staff response", type: "textarea", full: true, desc: "What staff did to reduce risk, support regulation and maintain safety." },
      ], item)}

      ${section("Outcome and safeguarding", "Record the result, notifications and next actions.", [
        { name: "outcome", label: "Outcome", type: "textarea", full: true, desc: "How the incident ended and how the young person was afterwards." },
        { name: "actions_taken", label: "Actions taken / required", type: "textarea", required: true, full: true, desc: "Immediate actions and any follow-up required." },
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
    required: ["session_date", "topic", "summary", "young_person_voice"],
    html: `
      ${section("Session information", "Core key work details.", [
        { name: "session_date", label: "Date", type: "date", value: today(), required: true },
        { name: "topic", label: "Topic", required: true },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}

      ${section("Session content", "What was discussed or completed.", [
        { name: "summary", label: "Session summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "young_person_voice", label: "Young person’s voice", type: "textarea", required: true, full: true },
        { name: "reflection", label: "Reflection / analysis", type: "textarea", full: true, desc: "What did the session suggest about needs, wishes, risk, progress or relationships?" },
      ], item)}

      ${section("Outcome", "What changes or actions were agreed.", [
        { name: "actions_agreed", label: "Actions agreed", type: "textarea", full: true },
        { name: "follow_up_required", label: "Follow-up required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function riskForm(item = {}) {
  return {
    title: "Risk assessment",
    intro:
      "Record the risk area, current level, triggers, protective factors and practical response guidance.",
    required: ["review_date", "risk_area", "summary", "response_plan"],
    html: `
      ${section("Risk overview", "Identify the risk and review date.", [
        { name: "review_date", label: "Review date", type: "date", value: today(), required: true },
        { name: "risk_area", label: "Risk area", required: true },
        { name: "severity", label: "Current risk level", type: "select", options: SEVERITY_OPTIONS, required: true },
      ], item)}

      ${section("Assessment", "Describe the risk clearly.", [
        { name: "summary", label: "Risk summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "triggers", label: "Known triggers / early signs", type: "textarea", full: true },
        { name: "protective_factors", label: "Protective factors", type: "textarea", full: true },
      ], item)}

      ${section("Response plan", "Set out what adults should do.", [
        { name: "response_plan", label: "Response guidance", type: "textarea", rows: 5, required: true, full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
        { name: "manager_oversight", label: "Manager oversight", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function safeguardingForm(item = {}) {
  return {
    title: "Safeguarding record",
    intro:
      "Record the concern, immediate action, notifications, referrals and oversight clearly and safely.",
    required: ["concern_type", "concern_summary", "immediate_action_taken"],
    html: `
      ${section("Concern details", "Describe the safeguarding concern.", [
        { name: "concern_type", label: "Concern type", required: true },
        { name: "concern_datetime", label: "Date and time", type: "datetime-local", value: now() },
        { name: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS },
      ], item)}

      ${section("Concern and disclosure", "Record facts and child voice.", [
        { name: "concern_summary", label: "Concern summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "disclosure_details", label: "Disclosure / child voice", type: "textarea", full: true },
      ], item)}

      ${section("Immediate action and referrals", "Record safeguarding action taken.", [
        { name: "immediate_action_taken", label: "Immediate action taken", type: "textarea", required: true, full: true },
        { name: "referral_details", label: "Referral / notification details", type: "textarea", full: true },
        { name: "placing_authority_notified", label: "Placing authority notified", type: "checkbox" },
        { name: "ofsted_notified", label: "Ofsted notified", type: "checkbox" },
        { name: "police_notified", label: "Police notified", type: "checkbox" },
        { name: "manager_oversight", label: "Manager oversight", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function missingEpisodeForm(item = {}) {
  return {
    title: "Missing episode",
    intro:
      "Record the missing episode, actions taken, return, child voice, risks and follow-up.",
    required: ["missing_from", "summary", "actions_taken"],
    html: `
      ${section("Episode details", "Core missing episode information.", [
        { name: "missing_from", label: "Missing from", type: "datetime-local", value: now(), required: true },
        { name: "returned_at", label: "Returned at", type: "datetime-local" },
        { name: "location_last_seen", label: "Location last seen" },
        { name: "severity", label: "Risk level", type: "select", options: SEVERITY_OPTIONS },
      ], item)}

      ${section("Account", "What happened and what may have contributed.", [
        { name: "summary", label: "Episode summary", type: "textarea", rows: 5, required: true, full: true },
        { name: "trigger_factors", label: "Trigger factors", type: "textarea", full: true },
        { name: "push_pull_factors", label: "Push / pull factors", type: "textarea", full: true },
      ], item)}

      ${section("Response and return", "Record actions and return conversation.", [
        { name: "actions_taken", label: "Actions taken", type: "textarea", required: true, full: true },
        { name: "child_voice", label: "Child voice on return", type: "textarea", full: true },
        { name: "return_interview_required", label: "Return interview required", type: "checkbox" },
        { name: "follow_up_required", label: "Follow-up required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function healthForm(item = {}) {
  return {
    title: "Health record",
    intro:
      "Record health needs, appointments, outcomes, professional advice and follow-up.",
    required: ["record_date", "health_area", "summary"],
    html: `
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
      ], item)}
    `,
  };
}

function educationForm(item = {}) {
  return {
    title: "Education record",
    intro:
      "Record attendance, engagement, learning experience, issues, achievements and follow-up.",
    required: ["record_date", "education_area", "summary"],
    html: `
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
      ], item)}
    `,
  };
}

function familyContactForm(item = {}) {
  return {
    title: "Family contact",
    intro:
      "Record family contact, presentation before and after, child voice, concerns and follow-up.",
    required: ["contact_datetime", "contact_type", "summary"],
    html: `
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
      ], item)}
    `,
  };
}

function appointmentForm(item = {}) {
  return {
    title: "Appointment",
    intro:
      "Record appointment purpose, time, preparation, outcome and follow-up.",
    required: ["appointment_date", "appointment_type"],
    html: `
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
        { name: "owner_name", label: "Owner", desc: "Name or role responsible for completion." },
        { name: "completion_notes", label: "Completion notes", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function medicationRecordForm(item = {}) {
  return {
    title: "Medication record",
    intro:
      "Record medication administration, omission, refusal or concern clearly and safely.",
    required: ["administered_at", "medication_name", "status"],
    html: `
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
        { name: "refusal_reason", label: "Refusal reason", type: "textarea", full: true },
        { name: "omission_reason", label: "Omission reason", type: "textarea", full: true },
        { name: "error_details", label: "Error details", type: "textarea", full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
      ], item)}
    `,
  };
}

function handoverForm(item = {}) {
  return {
    title: "Handover record",
    intro:
      "Record key information needed for the next shift to provide safe, consistent care.",
    required: ["handover_datetime", "shift", "summary"],
    html: `
      ${section("Handover details", "Core shift handover information.", [
        { name: "handover_datetime", label: "Date and time", type: "datetime-local", value: now(), required: true },
        { name: "shift", label: "Shift", required: true },
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
      "Record document details, review dates and any actions needed. File upload can remain handled separately if required.",
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

function fallbackForm(type, item = {}) {
  const label = getRecordLabel(type, "Record");
  const primaryDate = getRecordPrimaryDateField(type) || "created_at";

  return {
    title: label,
    intro:
      "Complete this general record form. Add enough detail for safe review and follow-up.",
    required: ["title", "summary"],
    html: `
      ${section("Record details", "Core information for this record.", [
        { name: primaryDate, label: "Date", type: primaryDate.includes("datetime") ? "datetime-local" : "date", value: primaryDate.includes("datetime") ? now() : today() },
        { name: "title", label: "Title", required: true },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, value: "draft" },
      ], item)}

      ${section("Summary", "Record the detail clearly.", [
        { name: "summary", label: "Summary", type: "textarea", rows: 6, required: true, full: true },
        { name: "actions_required", label: "Actions required", type: "textarea", full: true },
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
  if (safeType === "missing_episode") return missingEpisodeForm(item);
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

  return fallbackForm(safeType, item);
}

function getComposerIds() {
  return {
    youngPersonId: getYoungPersonId(),
    homeId:
      state.homeId ||
      state.currentHomeId ||
      state.selectedHomeId ||
      state.selectedYoungPerson?.home_id ||
      state.currentUser?.home_id ||
      null,
  };
}

function collectFormData(form) {
  const data = Object.fromEntries(new FormData(form));

  form.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    data[checkbox.name] = checkbox.checked;
  });

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") {
      data[key] = value.trim();
    }
  });

  return data;
}

function validateRequired(data = {}, required = []) {
  return required.filter((key) => {
    const value = data[key];
    return value === null || value === undefined || String(value).trim() === "";
  });
}

function qualityCheck(type, data = {}, required = []) {
  const missing = validateRequired(data, required);
  const issues = missing.map((key) => key.replaceAll("_", " "));

  if (
    ["daily_note", "incident", "keywork", "safeguarding_record"].includes(type) &&
    !data.young_person_voice &&
    !data.child_voice &&
    !data.voice &&
    !data.disclosure_details
  ) {
    issues.push("young person voice");
  }

  if (
    ["daily_note", "incident", "risk", "safeguarding_record"].includes(type) &&
    !data.actions_required &&
    !data.actions_taken &&
    !data.immediate_action_taken &&
    !data.response_plan
  ) {
    issues.push("actions / response plan");
  }

  return [...new Set(issues)];
}

function buildPayload(type, data = {}, mode = "draft") {
  const status = mode === "submit" ? "submitted" : data.status || "draft";

  return {
    ...data,
    workflow_status: status,
    status: data.status || status,
    record_type: type,
    young_person_id: getYoungPersonId(),
  };
}

export function openComposer(type, item = {}) {
  const safeType = normaliseRecordType(type) || type;

  state.composerRecordType = safeType;
  state.composerEditItem = item || null;
  state.composerMode = getRecordId(item) ? "edit" : "create";

  const form = getForm(safeType, item);

  state.composerRequiredFields = form.required || [];

  if (els.composerTitle) els.composerTitle.textContent = form.title;
  if (els.composerGuidanceText) els.composerGuidanceText.textContent = form.intro;
  if (els.composerFields) els.composerFields.innerHTML = form.html;

  els.composerPanel?.classList.remove("hidden");
  els.composerPanel?.setAttribute("aria-hidden", "false");

  const firstInput = els.composerFields?.querySelector("input, textarea, select");
  if (firstInput) {
    window.setTimeout(() => firstInput.focus(), 50);
  }
}

export function openComposerFor(type, mode = "create", item = {}) {
  openComposer(type, item);

  state.composerMode = mode || (getRecordId(item) ? "edit" : "create");
  state.composerEditItem = item || null;

  return state.composerEditItem;
}

export function closeComposer() {
  els.composerPanel?.classList.add("hidden");
  els.composerPanel?.setAttribute("aria-hidden", "true");
}

export function resetComposer() {
  if (els.composerForm) els.composerForm.reset();
  if (els.composerFields) els.composerFields.innerHTML = "";

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
  const form = els.composerForm;

  if (!form) {
    throw new Error("Composer form is not available.");
  }

  const type = normaliseRecordType(state.composerRecordType) || state.composerRecordType;

  if (!type) {
    throw new Error("No record type selected.");
  }

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

  const payload = buildPayload(type, data, mode);
  const editItem = state.composerEditItem || {};
  const recordId = getRecordId(editItem);

  let saved;

  if (state.composerMode === "edit" && recordId) {
    saved = await updateRecord(type, ids, recordId, payload);
  } else {
    saved = await createRecord(type, ids, payload);
  }

  closeComposer();

  dispatchComposerSaved({
    type,
    mode,
    saved,
  });

  return saved;
}

export function bindComposerEvents({ onSaved } = {}) {
  if (state.composerEventsBound) return;
  state.composerEventsBound = true;

  els.closeComposerBtn?.addEventListener("click", closeComposer);

  els.composerCancelBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    closeComposer();
  });

  els.composerDraftBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const saved = await saveComposer("draft");
      await onSaved?.(saved);
    } catch (error) {
      console.error("[composer] draft save failed", error);
      window.alert(error?.message || "Unable to save draft.");
    }
  });

  els.composerSubmitBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const saved = await saveComposer("submit");
      await onSaved?.(saved);
    } catch (error) {
      console.error("[composer] submit failed", error);
      window.alert(error?.message || "Unable to submit record.");
    }
  });
}