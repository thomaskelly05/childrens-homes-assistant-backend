import { state, resetComposerState } from "../state.js";
import { els } from "../dom.js";
import { apiSend, unwrapCreateResponse } from "../core/api.js";
import {
  escapeHtml,
  toDateInputValue,
  toDateTimeLocalValue,
} from "../core/utils.js";
import * as rulesClient from "../core/rules-client.js";
import * as suggestionsUi from "./suggestions.js";

function cleanText(value) {
  return String(value || "").trim();
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentHomeId() {
  return (
    state.homeId ||
    state.currentUser?.home_id ||
    state.currentUser?.homeId ||
    null
  );
}

function getScopeEntityId() {
  if (getCurrentScope() === "child") {
    return state.youngPersonId || null;
  }
  return getCurrentHomeId();
}

function requiresEntityId(recordType) {
  const scope = getCurrentScope();

  if (scope === "child") return true;

  const homeScopedTypes = [
    "task",
    "risk",
    "document",
    "communication",
    "therapy",
    "team",
    "supervision",
    "manager_action",
    "appointment",
  ];

  return homeScopedTypes.includes(recordType);
}

function buildScopePath(basePath = "") {
  const scope = getCurrentScope();
  const entityId = getScopeEntityId();

  if (scope === "child") {
    return basePath
      .replace("{scope}", "young-people")
      .replace("{id}", String(entityId || ""));
  }

  return basePath
    .replace("{scope}", "homes")
    .replace("{id}", String(entityId || ""));
}

const COMPOSER_CONFIG = {
  daily_note: {
    label: "Daily note",
    createUrl: () => buildScopePath("/{scope}/{id}/daily-notes"),
    updateUrl: (id) => `/young-people/daily-notes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
    scopes: ["child"],
  },

  incident: {
    label: "Important event",
    createUrl: () => buildScopePath("/{scope}/{id}/incidents"),
    updateUrl: (id) => `/young-people/incidents/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
    scopes: ["child"],
  },

  support_plan: {
    label: "Support plan",
    createUrl: () => buildScopePath("/{scope}/{id}/plans"),
    updateUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
    scopes: ["child"],
  },

  risk: {
    label: "Risk assessment",
    createUrl: () => buildScopePath("/{scope}/{id}/risks"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/risks/${id}`
        : `/homes/risks/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/risks/${id}/submit`
        : `/homes/risks/${id}/submit`,
    scopes: ["child", "home", "quality"],
  },

  health_record: {
    label: "Health record",
    createUrl: () => buildScopePath("/{scope}/{id}/health-records"),
    updateUrl: (id) => `/young-people/health-records/${id}`,
    updateMethod: "PATCH",
    scopes: ["child"],
  },

  education_record: {
    label: "Education record",
    createUrl: () => buildScopePath("/{scope}/{id}/education-records"),
    updateUrl: (id) => `/young-people/education-records/${id}`,
    updateMethod: "PATCH",
    scopes: ["child"],
  },

  family_contact: {
    label: "Family contact",
    createUrl: () => buildScopePath("/{scope}/{id}/family-contact-records"),
    updateUrl: (id) => `/young-people/family-contact-records/${id}`,
    updateMethod: "PATCH",
    scopes: ["child"],
  },

  keywork: {
    label: "Keywork session",
    createUrl: () => buildScopePath("/{scope}/{id}/keywork"),
    updateUrl: (id) => `/young-people/keywork/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/keywork/${id}/submit`,
    scopes: ["child"],
  },

  appointment: {
    label: "Appointment",
    createUrl: () => buildScopePath("/{scope}/{id}/appointments"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/appointments/${id}`
        : `/homes/appointments/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  achievement_record: {
    label: "Achievement",
    createUrl: () => buildScopePath("/{scope}/{id}/achievements"),
    updateUrl: (id) => `/young-people/achievements/${id}`,
    updateMethod: "PATCH",
    scopes: ["child"],
  },

  safeguarding_record: {
    label: "Safeguarding record",
    createUrl: () => buildScopePath("/{scope}/{id}/safeguarding-records"),
    updateUrl: (id) => `/young-people/safeguarding-records/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/safeguarding-records/${id}/submit`,
    scopes: ["child"],
  },

  missing_episode: {
    label: "Missing episode",
    createUrl: () => buildScopePath("/{scope}/{id}/missing-episodes"),
    updateUrl: (id) => `/young-people/missing-episodes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/missing-episodes/${id}/submit`,
    scopes: ["child"],
  },

  task: {
    label: "Task",
    createUrl: () => buildScopePath("/{scope}/{id}/tasks"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/tasks/${id}`
        : `/homes/tasks/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  manager_action: {
    label: "Manager action",
    createUrl: () => buildScopePath("/{scope}/{id}/manager-actions"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/manager-actions/${id}`
        : `/homes/manager-actions/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  document: {
    label: "Document",
    createUrl: () => buildScopePath("/{scope}/{id}/documents"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/documents/${id}`
        : `/homes/documents/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  communication: {
    label: "Professional communication",
    createUrl: () => buildScopePath("/{scope}/{id}/communications"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/communications/${id}`
        : `/homes/communications/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  therapy: {
    label: "Therapeutic services",
    createUrl: () => buildScopePath("/{scope}/{id}/therapy"),
    updateUrl: (id) => `/homes/therapy/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  team: {
    label: "Team and staffing",
    createUrl: () => buildScopePath("/{scope}/{id}/team"),
    updateUrl: (id) => `/homes/team/${id}`,
    updateMethod: "PATCH",
    scopes: ["home", "quality"],
  },

  supervision: {
    label: "Supervision and development",
    createUrl: () => buildScopePath("/{scope}/{id}/supervisions"),
    updateUrl: (id) => `/homes/supervisions/${id}`,
    updateMethod: "PATCH",
    scopes: ["home", "quality"],
  },

  profile_identity: {
    label: "Identity profile",
    createUrl: () => buildScopePath("/{scope}/{id}/identity-profile"),
    updateUrl: () => buildScopePath("/{scope}/{id}/identity-profile"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },

  profile_communication: {
    label: "Communication profile",
    createUrl: () => buildScopePath("/{scope}/{id}/communication-profile"),
    updateUrl: () => buildScopePath("/{scope}/{id}/communication-profile"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },

  profile_education: {
    label: "Education profile",
    createUrl: () => buildScopePath("/{scope}/{id}/education-profile"),
    updateUrl: () => buildScopePath("/{scope}/{id}/education-profile"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },

  profile_health: {
    label: "Health profile",
    createUrl: () => buildScopePath("/{scope}/{id}/health-profile"),
    updateUrl: () => buildScopePath("/{scope}/{id}/health-profile"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },

  profile_legal: {
    label: "Legal status",
    createUrl: () => buildScopePath("/{scope}/{id}/legal-status"),
    updateUrl: () => buildScopePath("/{scope}/{id}/legal-status"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },

  profile_formulation: {
    label: "Formulation",
    createUrl: () => buildScopePath("/{scope}/{id}/formulations"),
    updateUrl: () => buildScopePath("/{scope}/{id}/formulations"),
    createMethod: "PUT",
    updateMethod: "PUT",
    singleton: true,
    scopes: ["child"],
  },
};

function isRecordAllowedInScope(recordType) {
  const config = COMPOSER_CONFIG[recordType];
  if (!config) return false;

  return (config.scopes || ["child"]).includes(getCurrentScope());
}

function getComposerForm() {
  return els.recordComposerForm || els.composerForm || null;
}

function getComposerFieldsHost() {
  return els.recordComposerFields || els.composerFields || null;
}

function showComposerStatus(message) {
  if (els.composerAutosaveStatus) {
    els.composerAutosaveStatus.textContent = message || "Ready";
  }
}

function getComposerMeta() {
  if (!state.composerMeta || typeof state.composerMeta !== "object") {
    state.composerMeta = {};
  }
  return state.composerMeta;
}

function resetComposerMeta() {
  state.composerMeta = {};
}

function setComposerMetaFromItem(item = {}) {
  state.composerMeta = {
    source_record_type: item.source_record_type || "",
    source_record_id: item.source_record_id || null,
    suggestion_id: item.suggestion_id || null,
    suggestion_priority: item.suggestion_priority || "",
    suggestion_reason: item.suggestion_reason || "",
    suggestion_record_type: item.suggestion_record_type || "",
    suggestion_action_type: item.suggestion_action_type || "",
    suggestion_metadata: item.suggestion_metadata || item.metadata || {},
    improvement_prompt: item.improvement_prompt || "",
    review_prompt: item.review_prompt || "",
  };
}

function getToday() {
  return toDateInputValue(new Date());
}

function getNowLocal() {
  return toDateTimeLocalValue(new Date());
}

function isSingletonComposerRecord(recordType) {
  return Boolean(COMPOSER_CONFIG[recordType]?.singleton);
}

export function openComposer() {
  state.composerOpen = true;
  els.composerPanel?.classList.remove("hidden");
  els.composerPanel?.setAttribute("aria-hidden", "false");
}

export function closeComposer(reset = true) {
  els.composerPanel?.classList.add("hidden");
  els.composerPanel?.setAttribute("aria-hidden", "true");

  if (!reset) return;

  const fieldsHost = getComposerFieldsHost();

  if (fieldsHost) {
    fieldsHost.innerHTML = "";
  }

  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = "No AI review run yet.";
  }

  if (els.composerPrompts) {
    els.composerPrompts.innerHTML = "";
  }

  showComposerStatus("Autosave ready");
  autosaveBoundForKey = "";
  resetComposerMeta();
  resetComposerState();
}

function buildField(field) {
  const label = field.label
    ? `<label class="form-label" for="${escapeHtml(field.name)}">${escapeHtml(field.label)}</label>`
    : "";

  if (field.type === "textarea") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        ${label}
        <textarea
          id="${escapeHtml(field.name)}"
          name="${escapeHtml(field.name)}"
          class="textarea-input"
          rows="${field.rows || 5}"
        >${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        ${label}
        <select id="${escapeHtml(field.name)}" name="${escapeHtml(field.name)}" class="select-input">
          ${(field.options || [])
            .map(
              (option) => `
                <option value="${escapeHtml(option.value)}" ${
                  String(option.value) === String(field.value || "")
                    ? "selected"
                    : ""
                }>
                  ${escapeHtml(option.label)}
                </option>
              `
            )
            .join("")}
        </select>
      </div>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        <label class="checkbox-row" for="${escapeHtml(field.name)}">
          <input
            id="${escapeHtml(field.name)}"
            name="${escapeHtml(field.name)}"
            type="checkbox"
            ${field.value ? "checked" : ""}
          />
          <span>${escapeHtml(field.label || field.name)}</span>
        </label>
      </div>
    `;
  }

  return `
    <div class="composer-field ${field.full ? "full" : ""}">
      ${label}
      <input
        id="${escapeHtml(field.name)}"
        name="${escapeHtml(field.name)}"
        type="${escapeHtml(field.type || "text")}"
        class="text-input"
        value="${escapeHtml(field.value || "")}"
      />
    </div>
  `;
}

function renderSections(sections = []) {
  return sections
    .map(
      (section) => `
        <section class="composer-section">
          <h3>${escapeHtml(section.title || "")}</h3>
          ${section.subtitle ? `<p>${escapeHtml(section.subtitle)}</p>` : ""}
          <div class="composer-grid">
            ${(section.fields || []).map(buildField).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function buildSection(title, fields, subtitle = "") {
  return { title, subtitle, fields };
}

function fieldText(name, label, value = "", full = false) {
  return { name, label, type: "text", value, full };
}

function fieldDate(name, label, value = "") {
  return { name, label, type: "date", value };
}

function fieldDateTime(name, label, value = "") {
  return { name, label, type: "datetime-local", value };
}

function fieldTextArea(name, label, value = "", full = true, rows = 5) {
  return { name, label, type: "textarea", value, full, rows };
}

function fieldCheckbox(name, label, value = false) {
  return { name, label, type: "checkbox", value };
}

function fieldSelect(name, label, value = "", options = [], full = false) {
  return { name, label, type: "select", value, options, full };
}

function severityOptions() {
  return [
    { value: "", label: "Select..." },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];
}

function workflowOptions() {
  return [
    { value: "", label: "Select..." },
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "submitted", label: "Submitted" },
    { value: "pending_review", label: "Pending review" },
    { value: "approved", label: "Approved" },
    { value: "returned", label: "Returned" },
    { value: "completed", label: "Completed" },
  ];
}

function getSuggestionBannerHtml() {
  const meta = getComposerMeta();
  const bits = [];

  if (meta.suggestion_action_type) {
    bits.push(
      `Action: ${String(meta.suggestion_action_type).replaceAll("_", " ")}`
    );
  }

  if (meta.source_record_type) {
    bits.push(
      `Linked from ${String(meta.source_record_type).replaceAll("_", " ")}${
        meta.source_record_id ? ` #${meta.source_record_id}` : ""
      }`
    );
  }

  const prompt =
    meta.improvement_prompt ||
    meta.review_prompt ||
    meta.suggestion_reason ||
    "";

  if (!bits.length && !prompt) return "";

  return `
    <section class="composer-section">
      <h3>Assistant context</h3>
      ${bits.length ? `<p>${escapeHtml(bits.join(" • "))}</p>` : ""}
      ${prompt ? `<div class="composer-prompt">${escapeHtml(prompt)}</div>` : ""}
    </section>
  `;
}

function buildDailyNoteContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit daily note" : "New daily note",
    subtitle: "Capture the day clearly, warmly and accurately.",
    guidance:
      "Write factually and child-centred. Separate what happened, how the young person presented, and what needs to happen next.",
    prompts: [
      "How did the young person present today?",
      "What happened during the shift?",
      "What positives stood out?",
      "What needs follow-up?",
    ],
    sections: [
      buildSection("Shift details", [
        fieldDate("note_date", "Date", item.note_date || item.record_date || today),
        fieldText("shift_type", "Shift type", item.shift_type || ""),
        fieldSelect(
          "workflow_status",
          "Workflow status",
          item.workflow_status || "draft",
          workflowOptions()
        ),
        fieldSelect(
          "significance",
          "Significance",
          item.significance || "",
          severityOptions()
        ),
      ]),
      buildSection("Daily record", [
        fieldTextArea("presentation", "Presentation", item.presentation || ""),
        fieldTextArea("activities", "Activities", item.activities || ""),
        fieldTextArea("education_update", "Education update", item.education_update || ""),
        fieldTextArea("health_update", "Health update", item.health_update || ""),
        fieldTextArea("family_update", "Family update", item.family_update || ""),
        fieldTextArea("behaviour_update", "Behaviour update", item.behaviour_update || ""),
      ]),
      buildSection("Voice and follow-up", [
        fieldTextArea(
          "young_person_voice",
          "Young person voice",
          item.young_person_voice || item.child_voice || ""
        ),
        fieldTextArea("positives", "Positives", item.positives || ""),
        fieldTextArea("actions_required", "Actions required", item.actions_required || ""),
        fieldTextArea(
          "manager_review_comment",
          "Manager review comment",
          item.manager_review_comment || ""
        ),
      ]),
    ],
  };
}

function buildIncidentContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit important event" : "New important event",
    subtitle: "Record a significant event clearly, safely and factually.",
    guidance:
      "Be factual, specific and clear. Include antecedent, response, outcome and follow-up. Avoid vague language.",
    prompts: [
      "What happened?",
      "What led up to it?",
      "How did staff respond?",
      "What happened next and what follow-up is needed?",
    ],
    sections: [
      buildSection("Incident details", [
        fieldDateTime(
          "incident_datetime",
          "Incident date and time",
          toDateTimeLocalValue(item.incident_datetime) || now
        ),
        fieldText("incident_type", "Incident type", item.incident_type || ""),
        fieldText("location", "Location", item.location || ""),
        fieldSelect("severity", "Severity", item.severity || "", severityOptions()),
        fieldSelect(
          "workflow_status",
          "Workflow status",
          item.workflow_status || item.manager_review_status || "draft",
          workflowOptions()
        ),
      ]),
      buildSection("Event narrative", [
        fieldTextArea("description", "Description", item.description || ""),
        fieldTextArea("antecedent", "Antecedent", item.antecedent || ""),
        fieldTextArea("staff_response", "Staff response", item.staff_response || ""),
        fieldTextArea("child_response", "Child response", item.child_response || ""),
        fieldTextArea("outcome", "Outcome", item.outcome || ""),
      ]),
      buildSection("Analysis and follow-up", [
        fieldTextArea("presentation", "Presentation", item.presentation || ""),
        fieldTextArea(
          "trauma_informed_formulation",
          "Trauma-informed formulation",
          item.trauma_informed_formulation || ""
        ),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldTextArea(
          "restorative_follow_up",
          "Restorative follow-up",
          item.restorative_follow_up || ""
        ),
        fieldTextArea("actions_taken", "Actions taken", item.actions_taken || ""),
        fieldCheckbox("injury_flag", "Injury", Boolean(item.injury_flag)),
        fieldCheckbox(
          "property_damage_flag",
          "Property damage",
          Boolean(item.property_damage_flag)
        ),
        fieldCheckbox("police_involved", "Police involved", Boolean(item.police_involved)),
        fieldCheckbox("safeguarding_flag", "Safeguarding flag", Boolean(item.safeguarding_flag)),
        fieldCheckbox("follow_up_required", "Follow-up required", Boolean(item.follow_up_required)),
        fieldCheckbox("ofsted_notified", "Ofsted notified", Boolean(item.ofsted_notified)),
        fieldCheckbox("requires_reg40", "Requires Reg 40", Boolean(item.requires_reg40)),
      ]),
    ],
  };
}

function buildSupportPlanContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit support plan" : "New support plan",
    subtitle: "Create practical guidance to support consistent care.",
    guidance:
      "Focus on what adults need to understand and do. Keep the plan practical, clear and strengths-based.",
    prompts: [
      "What is the presenting need?",
      "What helps?",
      "What are the triggers?",
      "What should adults do consistently?",
    ],
    sections: [
      buildSection("Plan details", [
        fieldText("title", "Title", item.title || ""),
        fieldText("plan_type", "Plan type", item.plan_type || ""),
        fieldDate("start_date", "Start date", item.start_date || today),
        fieldDate("review_date", "Review date", item.review_date || ""),
        fieldText("status", "Status", item.status || "active"),
        fieldText("approval_status", "Approval status", item.approval_status || ""),
      ]),
      buildSection("Plan content", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("presenting_need", "Presenting need", item.presenting_need || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldTextArea(
          "proactive_strategies",
          "Proactive strategies",
          item.proactive_strategies || ""
        ),
        fieldTextArea("pace_guidance", "Pace guidance", item.pace_guidance || ""),
        fieldTextArea("triggers", "Triggers", item.triggers || ""),
        fieldTextArea("protective_factors", "Protective factors", item.protective_factors || ""),
        fieldTextArea("review_comment", "Review comment", item.review_comment || ""),
      ]),
    ],
  };
}

function buildRiskContent(item = {}) {
  const today = getToday();
  const scope = getCurrentScope();

  return {
    title: item?.id ? "Edit risk assessment" : "New risk assessment",
    subtitle:
      scope === "child"
        ? "Record risks, early signs, protective factors and clear response actions."
        : "Record service or oversight risks, controls and clear response actions.",
    guidance:
      "Describe the concern factually. Make sure triggers, warning signs, controls and response actions are usable by adults in practice.",
    prompts: [
      "What is the concern?",
      "What are the triggers or warning signs?",
      "What helps reduce risk?",
      "What should adults do if risk rises?",
    ],
    sections: [
      buildSection("Risk details", [
        fieldText("title", "Title", item.title || ""),
        fieldText("category", "Category", item.category || ""),
        fieldSelect("severity", "Severity", item.severity || "", severityOptions()),
        fieldText("likelihood", "Likelihood", item.likelihood || ""),
        fieldText("status", "Status", item.status || "active"),
        fieldText("approval_status", "Approval status", item.approval_status || ""),
        fieldDate("review_date", "Review date", item.review_date || today),
      ]),
      buildSection("Risk analysis", [
        fieldTextArea("concern_summary", "Concern summary", item.concern_summary || ""),
        fieldTextArea("known_triggers", "Known triggers", item.known_triggers || ""),
        fieldTextArea(
          "early_warning_signs",
          "Early warning signs",
          item.early_warning_signs || ""
        ),
        fieldTextArea("contextual_factors", "Contextual factors", item.contextual_factors || ""),
        fieldTextArea("current_controls", "Current controls", item.current_controls || ""),
        fieldTextArea(
          "deescalation_strategies",
          "De-escalation strategies",
          item.deescalation_strategies || ""
        ),
        fieldTextArea("response_actions", "Response actions", item.response_actions || ""),
        fieldTextArea("child_views", "Child views", item.child_views || ""),
        fieldTextArea("review_comment", "Review comment", item.review_comment || ""),
      ]),
    ],
  };
}

function buildHealthRecordContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit health record" : "New health record",
    subtitle: "Record health events, professionals, outcomes and follow-up.",
    guidance:
      "Make the health event easy to understand later. Include professional involvement, outcome and next action.",
    prompts: [
      "What happened?",
      "Who was involved?",
      "What was the outcome?",
      "Is follow-up needed?",
    ],
    sections: [
      buildSection("Health event", [
        fieldText("title", "Title", item.title || ""),
        fieldText("record_type", "Record type", item.record_type || ""),
        fieldDateTime(
          "event_datetime",
          "Date and time",
          toDateTimeLocalValue(item.event_datetime) || now
        ),
        fieldText("professional_name", "Professional name", item.professional_name || ""),
        fieldSelect("significance", "Significance", item.significance || "", severityOptions()),
        fieldSelect(
          "workflow_status",
          "Workflow status",
          item.workflow_status || "draft",
          workflowOptions()
        ),
      ]),
      buildSection("Health summary", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("outcome", "Outcome", item.outcome || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldCheckbox("follow_up_required", "Follow-up required", Boolean(item.follow_up_required)),
        fieldDate("next_action_date", "Next action date", item.next_action_date || ""),
      ]),
    ],
  };
}

function buildEducationRecordContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit education record" : "New education record",
    subtitle: "Record attendance, engagement, support and concerns.",
    guidance:
      "Keep the record practical. Show what happened, how the young person engaged, and what needs to happen next.",
    prompts: [
      "How did the young person engage?",
      "Were there concerns or positives?",
      "What action was taken?",
      "Is further follow-up needed?",
    ],
    sections: [
      buildSection("Education record", [
        fieldDate("record_date", "Date", item.record_date || today),
        fieldText("provision_name", "Provision name", item.provision_name || ""),
        fieldText("attendance_status", "Attendance status", item.attendance_status || ""),
        fieldSelect("significance", "Significance", item.significance || "", severityOptions()),
        fieldSelect(
          "workflow_status",
          "Workflow status",
          item.workflow_status || "draft",
          workflowOptions()
        ),
      ]),
      buildSection("Education summary", [
        fieldTextArea("learning_engagement", "Learning engagement", item.learning_engagement || ""),
        fieldTextArea("behaviour_summary", "Behaviour summary", item.behaviour_summary || ""),
        fieldTextArea("issue_raised", "Issue raised", item.issue_raised || ""),
        fieldTextArea("action_taken", "Action taken", item.action_taken || ""),
        fieldTextArea("professional_involved", "Professional involved", item.professional_involved || ""),
        fieldTextArea("achievement_note", "Achievement note", item.achievement_note || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldCheckbox("follow_up_required", "Follow-up required", Boolean(item.follow_up_required)),
      ]),
    ],
  };
}

function buildFamilyContactContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit family contact" : "New family contact",
    subtitle: "Record family contact, presentation, concerns and next steps.",
    guidance:
      "Make the impact of contact clear. Include how the young person presented before and after, and what adults need to hold in mind.",
    prompts: [
      "Who was involved?",
      "How did the young person present before and after?",
      "Were there concerns?",
      "What follow-up is needed?",
    ],
    sections: [
      buildSection("Contact details", [
        fieldDateTime(
          "contact_datetime",
          "Date and time",
          toDateTimeLocalValue(item.contact_datetime) || now
        ),
        fieldText("contact_type", "Contact type", item.contact_type || ""),
        fieldText("contact_person", "Contact person", item.contact_person || ""),
        fieldText("supervision_level", "Supervision level", item.supervision_level || ""),
        fieldText("location", "Location", item.location || ""),
        fieldSelect("significance", "Significance", item.significance || "", severityOptions()),
        fieldSelect(
          "workflow_status",
          "Workflow status",
          item.workflow_status || "draft",
          workflowOptions()
        ),
      ]),
      buildSection("Contact summary", [
        fieldTextArea(
          "pre_contact_presentation",
          "Pre-contact presentation",
          item.pre_contact_presentation || ""
        ),
        fieldTextArea(
          "post_contact_presentation",
          "Post-contact presentation",
          item.post_contact_presentation || ""
        ),
        fieldTextArea("concerns", "Concerns", item.concerns || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldCheckbox("follow_up_required", "Follow-up required", Boolean(item.follow_up_required)),
      ]),
    ],
  };
}

function buildKeyworkContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit keywork session" : "New keywork session",
    subtitle: "Record direct work, reflection and agreed next steps.",
    guidance:
      "Show the topic, purpose, the young person’s contribution, your reflection, and what was agreed.",
    prompts: [
      "What was the topic?",
      "What was discussed?",
      "What did the young person say or show?",
      "What was agreed next?",
    ],
    sections: [
      buildSection("Keywork details", [
        fieldDate("session_date", "Session date", item.session_date || today),
        fieldText("topic", "Topic", item.topic || ""),
        fieldTextArea("purpose", "Purpose", item.purpose || ""),
        fieldText("status", "Status", item.status || ""),
        fieldText("workflow_status", "Workflow status", item.workflow_status || item.status || "draft"),
      ]),
      buildSection("Session content", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldTextArea(
          "reflective_analysis",
          "Reflective analysis",
          item.reflective_analysis || ""
        ),
        fieldTextArea("actions_agreed", "Actions agreed", item.actions_agreed || ""),
        fieldDate("next_session_date", "Next session date", item.next_session_date || ""),
        fieldTextArea(
          "manager_review_comment",
          "Manager review comment",
          item.manager_review_comment || ""
        ),
      ]),
    ],
  };
}

function buildAppointmentContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit appointment" : "New appointment",
    subtitle: "Record appointments, purpose, preparation and follow-up.",
    guidance:
      "Make sure the appointment is easy to plan for and easy to review afterwards.",
    prompts: [
      "What is the appointment for?",
      "Who is involved?",
      "What preparation is needed?",
      "What follow-up should happen?",
    ],
    sections: [
      buildSection("Appointment details", [
        fieldText("title", "Title", item.title || ""),
        fieldText("appointment_type", "Appointment type", item.appointment_type || ""),
        fieldDateTime("start_datetime", "Start", toDateTimeLocalValue(item.start_datetime) || now),
        fieldDateTime("end_datetime", "End", toDateTimeLocalValue(item.end_datetime) || ""),
        fieldText("location", "Location", item.location || ""),
        fieldText("professional_name", "Professional name", item.professional_name || ""),
        fieldText("professional_role", "Professional role", item.professional_role || ""),
        fieldText("status", "Status", item.status || "planned"),
      ]),
      buildSection("Preparation and outcome", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("description", "Description", item.description || ""),
        fieldTextArea("purpose", "Purpose", item.purpose || ""),
        fieldTextArea("preparation_notes", "Preparation notes", item.preparation_notes || ""),
        fieldTextArea("outcome_notes", "Outcome notes", item.outcome_notes || item.outcome || ""),
        fieldTextArea("follow_up_actions", "Follow-up actions", item.follow_up_actions || ""),
        fieldText("reminder_minutes_before", "Reminder minutes before", item.reminder_minutes_before || ""),
      ]),
    ],
  };
}

function buildAchievementContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit achievement" : "New achievement",
    subtitle: "Capture progress, strengths and success.",
    guidance:
      "Record what was achieved, why it mattered, and what it tells adults about progress or strengths.",
    prompts: [
      "What was achieved?",
      "Why did it matter?",
      "What did it show about the young person?",
    ],
    sections: [
      buildSection("Achievement details", [
        fieldDate("achievement_date", "Date", item.achievement_date || today),
        fieldText("title", "Title", item.title || ""),
        fieldText("achievement_type", "Achievement type", item.achievement_type || ""),
        fieldText("source", "Source", item.source || ""),
        fieldSelect("significance", "Significance", item.significance || "", severityOptions()),
      ]),
      buildSection("Achievement summary", [
        fieldTextArea("description", "Description", item.description || item.summary || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
      ]),
    ],
  };
}

function buildSafeguardingContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit safeguarding record" : "New safeguarding record",
    subtitle: "Record safeguarding concern, immediate action and outcome.",
    guidance:
      "Be clear, factual and precise. Record the concern, action taken, referrals, and current outcome.",
    prompts: [
      "What is the concern?",
      "What immediate action was taken?",
      "Was a referral made?",
      "What is the current outcome?",
    ],
    sections: [
      buildSection("Safeguarding details", [
        fieldDateTime(
          "concern_datetime",
          "Concern date and time",
          toDateTimeLocalValue(item.concern_datetime) || now
        ),
        fieldText("safeguarding_category", "Safeguarding category", item.safeguarding_category || ""),
        fieldText("manager_review_status", "Manager review status", item.manager_review_status || ""),
        fieldText("incident_id", "Linked incident ID", item.incident_id || ""),
        fieldDate("closed_at", "Closed date", toDateInputValue(item.closed_at) || ""),
      ]),
      buildSection("Concern and response", [
        fieldTextArea("concern_details", "Concern details", item.concern_details || ""),
        fieldTextArea("disclosure_details", "Disclosure details", item.disclosure_details || ""),
        fieldTextArea(
          "immediate_action_taken",
          "Immediate action taken",
          item.immediate_action_taken || ""
        ),
        fieldCheckbox("referral_made", "Referral made", Boolean(item.referral_made)),
        fieldTextArea("referral_details", "Referral details", item.referral_details || ""),
        fieldTextArea("outcome", "Outcome", item.outcome || ""),
      ]),
    ],
  };
}

function buildMissingEpisodeContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit missing episode" : "New missing episode",
    subtitle: "Record missing episode, return and follow-up.",
    guidance:
      "Capture the times, immediate response, return information and required review clearly.",
    prompts: [
      "When did the episode begin and end?",
      "What action was taken?",
      "What were the trigger or push/pull factors?",
      "What needs to happen next?",
    ],
    sections: [
      buildSection("Episode details", [
        fieldDateTime("start_datetime", "Start", toDateTimeLocalValue(item.start_datetime) || now),
        fieldDateTime("reported_datetime", "Reported", toDateTimeLocalValue(item.reported_datetime) || ""),
        fieldDateTime("return_datetime", "Return", toDateTimeLocalValue(item.return_datetime) || ""),
        fieldText("police_reference", "Police reference", item.police_reference || ""),
        fieldText("manager_review_status", "Manager review status", item.manager_review_status || ""),
        fieldText(
          "linked_risk_assessment_id",
          "Linked risk assessment ID",
          item.linked_risk_assessment_id || ""
        ),
      ]),
      buildSection("Episode summary", [
        fieldTextArea("trigger_factors", "Trigger factors", item.trigger_factors || ""),
        fieldTextArea("push_pull_factors", "Push / pull factors", item.push_pull_factors || ""),
        fieldTextArea("actions_taken", "Actions taken", item.actions_taken || ""),
        fieldTextArea("outcome", "Outcome", item.outcome || ""),
        fieldTextArea("child_voice", "Child voice", item.child_voice || ""),
        fieldCheckbox(
          "return_interview_completed",
          "Return interview completed",
          Boolean(item.return_interview_completed)
        ),
        fieldDate("return_interview_date", "Return interview date", item.return_interview_date || ""),
        fieldCheckbox("review_required", "Review required", Boolean(item.review_required)),
      ]),
    ],
  };
}

function buildTaskContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit task" : "New task",
    subtitle: "Create a clear action with ownership and follow-up.",
    guidance: "Make the task specific, practical and easy to complete.",
    prompts: [
      "What needs to happen?",
      "Who should do it?",
      "When is it due?",
      "Why does it matter?",
    ],
    sections: [
      buildSection("Task details", [
        fieldText("title", "Title", item.title || ""),
        fieldTextArea("task", "Task", item.task || item.summary || ""),
        fieldText("task_type", "Task type", item.task_type || ""),
        fieldText("assigned_role", "Assigned role", item.assigned_role || ""),
        fieldText("assigned_to_user_id", "Assigned to user ID", item.assigned_to_user_id || ""),
        fieldDate("task_date", "Task date", item.task_date || today),
        fieldDate("due_date", "Due date", item.due_date || ""),
        fieldCheckbox("completed", "Completed", Boolean(item.completed)),
        fieldCheckbox("compliance_generated", "Compliance generated", Boolean(item.compliance_generated)),
      ]),
    ],
  };
}

function buildProfileIdentityContent(item = {}) {
  return {
    title: "Identity profile",
    subtitle: "Capture culture, identity, interests and what matters.",
    guidance:
      "Keep this child-centred and practical for adults supporting day-to-day care.",
    prompts: [
      "What matters most to this young person?",
      "What strengths and interests should adults hold in mind?",
    ],
    sections: [
      buildSection("Identity and what matters", [
        fieldText("religion_or_faith", "Religion or faith", item.religion_or_faith || ""),
        fieldText("cultural_identity", "Cultural identity", item.cultural_identity || ""),
        fieldText("first_language", "First language", item.first_language || ""),
        fieldText("dietary_needs", "Dietary needs", item.dietary_needs || ""),
        fieldTextArea("interests", "Interests", item.interests || ""),
        fieldTextArea("strengths_summary", "Strengths summary", item.strengths_summary || ""),
        fieldTextArea("what_matters_to_me", "What matters to me", item.what_matters_to_me || ""),
        fieldTextArea("important_dates", "Important dates", item.important_dates || ""),
      ]),
    ],
  };
}

function buildProfileCommunicationContent(item = {}) {
  return {
    title: "Communication profile",
    subtitle: "Capture communication, processing and regulation needs.",
    guidance:
      "Make the information practical for adults supporting communication and co-regulation.",
    prompts: [
      "How does this young person communicate?",
      "What helps them regulate and understand information?",
    ],
    sections: [
      buildSection("Communication and regulation", [
        fieldTextArea("neurodiversity_summary", "Neurodiversity summary", item.neurodiversity_summary || ""),
        fieldTextArea("communication_style", "Communication style", item.communication_style || ""),
        fieldTextArea("sensory_profile", "Sensory profile", item.sensory_profile || ""),
        fieldTextArea("processing_needs", "Processing needs", item.processing_needs || ""),
        fieldTextArea("signs_of_distress", "Signs of distress", item.signs_of_distress || ""),
        fieldTextArea("what_helps", "What helps", item.what_helps || ""),
        fieldTextArea("what_to_avoid", "What to avoid", item.what_to_avoid || ""),
        fieldTextArea(
          "routines_and_predictability",
          "Routines and predictability",
          item.routines_and_predictability || ""
        ),
        fieldTextArea("visual_support_needs", "Visual support needs", item.visual_support_needs || ""),
      ]),
    ],
  };
}

function buildProfileEducationContent(item = {}) {
  return {
    title: "Education profile",
    subtitle: "Capture school context, support and access to learning.",
    guidance:
      "Keep this practical and up to date so staff understand the learning context quickly.",
    prompts: [
      "What is the current educational context?",
      "What support helps learning and attendance?",
    ],
    sections: [
      buildSection("Education profile", [
        fieldText("school_name", "School name", item.school_name || ""),
        fieldText("year_group", "Year group", item.year_group || ""),
        fieldText("education_status", "Education status", item.education_status || ""),
        fieldText("sen_status", "SEN status", item.sen_status || ""),
        fieldTextArea("ehcp_details", "EHCP details", item.ehcp_details || ""),
        fieldText("designated_teacher", "Designated teacher", item.designated_teacher || ""),
        fieldText("attendance_baseline", "Attendance baseline", item.attendance_baseline || ""),
        fieldText("pep_status", "PEP status", item.pep_status || ""),
        fieldTextArea("support_summary", "Support summary", item.support_summary || ""),
      ]),
    ],
  };
}

function buildProfileHealthContent(item = {}) {
  return {
    title: "Health profile",
    subtitle: "Capture health contacts, diagnoses, allergies and wellbeing context.",
    guidance:
      "Keep this factual and current so adults can respond safely and consistently.",
    prompts: [
      "What health information do adults need to hold in mind?",
      "Who are the key professionals and what support is in place?",
    ],
    sections: [
      buildSection("Health profile", [
        fieldText("gp_name", "GP name", item.gp_name || ""),
        fieldText("gp_contact", "GP contact", item.gp_contact || ""),
        fieldText("dentist_name", "Dentist name", item.dentist_name || ""),
        fieldText("dentist_contact", "Dentist contact", item.dentist_contact || ""),
        fieldText("optician_name", "Optician name", item.optician_name || ""),
        fieldText("optician_contact", "Optician contact", item.optician_contact || ""),
        fieldTextArea("allergies", "Allergies", item.allergies || ""),
        fieldTextArea("diagnoses", "Diagnoses", item.diagnoses || ""),
        fieldTextArea("mental_health_summary", "Mental health summary", item.mental_health_summary || ""),
        fieldTextArea("medication_summary", "Medication summary", item.medication_summary || ""),
        fieldTextArea("consent_notes", "Consent notes", item.consent_notes || ""),
      ]),
    ],
  };
}

function buildProfileLegalContent(item = {}) {
  return {
    title: "Legal status",
    subtitle: "Capture legal context, authority and delegated arrangements.",
    guidance:
      "Keep this clear and accurate. Adults should be able to understand the legal position quickly.",
    prompts: [
      "What is the current legal status?",
      "What delegated authority and restrictions apply?",
    ],
    sections: [
      buildSection("Legal status", [
        fieldText("legal_status", "Legal status", item.legal_status || ""),
        fieldText("order_type", "Order type", item.order_type || ""),
        fieldTextArea("order_details", "Order details", item.order_details || ""),
        fieldTextArea(
          "delegated_authority_details",
          "Delegated authority details",
          item.delegated_authority_details || ""
        ),
        fieldTextArea("restrictions_text", "Restrictions", item.restrictions_text || ""),
        fieldTextArea("consent_arrangements", "Consent arrangements", item.consent_arrangements || ""),
        fieldDate("effective_from", "Effective from", item.effective_from || ""),
        fieldDate("effective_to", "Effective to", item.effective_to || ""),
        fieldCheckbox("is_current", "Current", item.is_current !== false),
      ]),
    ],
  };
}

function buildProfileFormulationContent(item = {}) {
  return {
    title: "Formulation",
    subtitle: "Capture a shared understanding of needs, behaviour and what helps.",
    guidance:
      "Use professional reflective thinking, but keep the output practical and useful to staff.",
    prompts: [
      "What is the shared understanding of this young person’s needs?",
      "What patterns, triggers and protective factors matter most?",
    ],
    sections: [
      buildSection("Shared formulation", [
        fieldTextArea("presenting_needs", "Presenting needs", item.presenting_needs || ""),
        fieldTextArea("developmental_context", "Developmental context", item.developmental_context || ""),
        fieldTextArea("trauma_context", "Trauma context", item.trauma_context || ""),
        fieldTextArea(
          "neurodevelopmental_context",
          "Neurodevelopmental context",
          item.neurodevelopmental_context || ""
        ),
        fieldTextArea("relational_context", "Relational context", item.relational_context || ""),
        fieldTextArea("meaning_of_behaviour", "Meaning of behaviour", item.meaning_of_behaviour || ""),
        fieldTextArea("known_triggers", "Known triggers", item.known_triggers || ""),
        fieldTextArea(
          "early_signs_of_distress",
          "Early signs of distress",
          item.early_signs_of_distress || ""
        ),
        fieldTextArea("protective_factors", "Protective factors", item.protective_factors || ""),
        fieldTextArea("what_helps", "What helps", item.what_helps || ""),
        fieldTextArea(
          "what_adults_should_avoid",
          "What adults should avoid",
          item.what_adults_should_avoid || ""
        ),
        fieldTextArea("regulation_strategies", "Regulation strategies", item.regulation_strategies || ""),
        fieldTextArea("child_voice_summary", "Child voice summary", item.child_voice_summary || ""),
        fieldDate("review_date", "Review date", item.review_date || ""),
        fieldCheckbox("is_current", "Current", item.is_current !== false),
      ]),
    ],
  };
}

function buildDocumentContent(item = {}) {
  return {
    title: item?.id ? "Edit document record" : "Upload document",
    subtitle:
      getCurrentScope() === "child"
        ? "Add a statutory or supporting document to this young person."
        : "Add a statutory or service-level document.",
    guidance:
      "Use a clear title, document type, review date and summary so documents are easy to find and audit.",
    prompts: [
      "What type of document is this?",
      "Who does it relate to?",
      "When does it need review?",
      "What should staff know about it?",
    ],
    sections: [
      buildSection("Document details", [
        fieldText("title", "Title", item.title || ""),
        fieldText("document_type", "Document type", item.document_type || ""),
        fieldText("category", "Category", item.category || ""),
        fieldDate("review_date", "Review date", item.review_date || ""),
        fieldText("status", "Status", item.status || "active"),
        fieldText("file_name", "File name / reference", item.file_name || ""),
      ]),
      buildSection("Document notes", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("notes", "Notes", item.notes || ""),
        fieldTextArea("important_actions", "Important actions", item.important_actions || ""),
      ]),
    ],
  };
}

function buildCommunicationContent(item = {}) {
  const now = getNowLocal();

  return {
    title: item?.id ? "Edit communication log" : "Log communication",
    subtitle:
      "Record professional liaison, family communication or key partner contact.",
    guidance:
      "Keep communication records factual, concise and easy to review later.",
    prompts: [
      "Who was involved?",
      "What was discussed?",
      "Were there any decisions or actions?",
      "What needs follow-up?",
    ],
    sections: [
      buildSection("Communication details", [
        fieldDateTime(
          "contact_datetime",
          "Date and time",
          toDateTimeLocalValue(item.contact_datetime) || now
        ),
        fieldText("contact_type", "Contact type", item.contact_type || ""),
        fieldText("contact_person", "Contact person", item.contact_person || ""),
        fieldText("organisation", "Organisation", item.organisation || ""),
        fieldText("role", "Role", item.role || ""),
        fieldText("direction", "Direction", item.direction || ""),
      ]),
      buildSection("Communication summary", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("decisions", "Decisions", item.decisions || ""),
        fieldTextArea("actions_required", "Actions required", item.actions_required || ""),
        fieldCheckbox("follow_up_required", "Follow-up required", Boolean(item.follow_up_required)),
      ]),
    ],
  };
}

function buildTherapyContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit therapeutic service note" : "New therapeutic service note",
    subtitle: "Record therapy input, recommendations and follow-up.",
    guidance:
      "Capture therapeutic involvement in a practical, respectful way that helps the team respond consistently.",
    prompts: [
      "What therapeutic input was provided?",
      "What themes or recommendations matter most?",
      "What should adults do next?",
    ],
    sections: [
      buildSection("Therapeutic input", [
        fieldDate("session_date", "Session date", item.session_date || today),
        fieldText("service_name", "Service name", item.service_name || ""),
        fieldText("professional_name", "Professional name", item.professional_name || ""),
        fieldText("intervention_type", "Intervention type", item.intervention_type || ""),
      ]),
      buildSection("Clinical summary", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("recommendations", "Recommendations", item.recommendations || ""),
        fieldTextArea("staff_guidance", "Guidance for staff", item.staff_guidance || ""),
        fieldTextArea("next_steps", "Next steps", item.next_steps || ""),
      ]),
    ],
  };
}

function buildTeamContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit team update" : "New team update",
    subtitle: "Record staffing, deployment and workforce context.",
    guidance:
      "Use this for team-wide operational staffing notes rather than child-specific records.",
    prompts: [
      "What staffing issue or update needs recording?",
      "What is the operational impact?",
      "What action is required?",
    ],
    sections: [
      buildSection("Team update", [
        fieldDate("record_date", "Date", item.record_date || today),
        fieldText("update_type", "Update type", item.update_type || ""),
        fieldText("shift", "Shift / period", item.shift || ""),
        fieldText("staff_member", "Staff member", item.staff_member || ""),
      ]),
      buildSection("Operational context", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("impact", "Impact", item.impact || ""),
        fieldTextArea("actions_required", "Actions required", item.actions_required || ""),
      ]),
    ],
  };
}

function buildSupervisionContent(item = {}) {
  const today = getToday();

  return {
    title: item?.id ? "Edit supervision record" : "New supervision record",
    subtitle: "Record supervision, development and support.",
    guidance:
      "Keep this structured, professional and useful for leadership oversight.",
    prompts: [
      "What was discussed?",
      "What support or development needs were identified?",
      "What was agreed next?",
    ],
    sections: [
      buildSection("Supervision details", [
        fieldDate("session_date", "Session date", item.session_date || today),
        fieldText("staff_member", "Staff member", item.staff_member || ""),
        fieldText("supervisor", "Supervisor", item.supervisor || ""),
        fieldText("supervision_type", "Supervision type", item.supervision_type || ""),
      ]),
      buildSection("Discussion and outcomes", [
        fieldTextArea("summary", "Summary", item.summary || ""),
        fieldTextArea("strengths", "Strengths", item.strengths || ""),
        fieldTextArea("development_needs", "Development needs", item.development_needs || ""),
        fieldTextArea("actions_agreed", "Actions agreed", item.actions_agreed || ""),
      ]),
    ],
  };
}

function buildManagerActionContent(item = {}) {
  return {
    title: item?.id ? "Edit manager action" : "New manager action",
    subtitle: "Record management oversight, escalation, or follow-up.",
    guidance:
      "Use this for management decisions, oversight actions, escalation, and formal follow-up.",
    prompts: [
      "What needs management attention?",
      "Why does this matter?",
      "What is the decision or required follow-up?",
    ],
    sections: [
      buildSection("Manager action details", [
        fieldText("action_type", "Action type", item.action_type || ""),
        fieldText(
          "related_table",
          "Related table",
          item.related_table || item.source_record_type || ""
        ),
        fieldText(
          "related_id",
          "Related ID",
          item.related_id || item.source_record_id || ""
        ),
      ]),
      buildSection("Management note", [
        fieldTextArea("note", "Note", item.note || item.summary || ""),
        fieldTextArea("summary", "Summary", item.summary || ""),
      ]),
    ],
  };
}

function getComposerContent(recordType, item = {}) {
  const map = {
    daily_note: buildDailyNoteContent,
    incident: buildIncidentContent,
    support_plan: buildSupportPlanContent,
    risk: buildRiskContent,
    health_record: buildHealthRecordContent,
    education_record: buildEducationRecordContent,
    family_contact: buildFamilyContactContent,
    keywork: buildKeyworkContent,
    appointment: buildAppointmentContent,
    achievement_record: buildAchievementContent,
    safeguarding_record: buildSafeguardingContent,
    missing_episode: buildMissingEpisodeContent,
    task: buildTaskContent,
    profile_identity: buildProfileIdentityContent,
    profile_communication: buildProfileCommunicationContent,
    profile_education: buildProfileEducationContent,
    profile_health: buildProfileHealthContent,
    profile_legal: buildProfileLegalContent,
    profile_formulation: buildProfileFormulationContent,
    document: buildDocumentContent,
    communication: buildCommunicationContent,
    therapy: buildTherapyContent,
    team: buildTeamContent,
    supervision: buildSupervisionContent,
    manager_action: buildManagerActionContent,
  };

  const builder = map[recordType];
  if (builder) return builder(item);

  return {
    title: "New record",
    subtitle: "Record clearly and accurately.",
    guidance: "Complete the fields below.",
    prompts: [],
    sections: [],
  };
}

function getStorageKey() {
  return [
    "yp-shell-composer",
    getCurrentScope(),
    getScopeEntityId() || "none",
    state.composerRecordType || "none",
    state.composerMode || "create",
    state.composerRecordId || "new",
  ].join(":");
}

function serialiseValue(key, value) {
  if (
    [
      "reminder_minutes_before",
      "attendance_baseline",
      "incident_id",
      "linked_risk_assessment_id",
      "linked_plan_id",
      "linked_target_id",
      "related_id",
      "assigned_to_user_id",
    ].includes(key)
  ) {
    return value === "" ? null : Number(value);
  }

  return value;
}

function serializeComposerForm() {
  const form = getComposerForm();
  if (!form) return {};

  const formData = new FormData(form);
  const payload = {};

  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    if (checkbox.name) {
      payload[checkbox.name] = checkbox.checked;
    }
  });

  for (const [key, value] of formData.entries()) {
    payload[key] = serialiseValue(key, value);
  }

  if (getCurrentScope() === "child") {
    payload.young_person_id = state.youngPersonId;
  } else {
    payload.home_id = getCurrentHomeId();
    payload.scope = getCurrentScope();
  }

  const meta = getComposerMeta();

  if (meta.source_record_type && !payload.source_record_type) {
    payload.source_record_type = meta.source_record_type;
  }

  if (meta.source_record_id && !payload.source_record_id) {
    payload.source_record_id = meta.source_record_id;
  }

  return payload;
}

function buildDraftState() {
  return {
    saved_at: new Date().toISOString(),
    values: serializeComposerForm(),
    meta: getComposerMeta(),
  };
}

function saveDraftToLocal() {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(buildDraftState()));

    showComposerStatus(
      `Autosaved ${new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    );
  } catch {
    showComposerStatus("Autosave unavailable");
  }
}

function loadDraftFromLocal() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraftFromLocal() {
  try {
    localStorage.removeItem(getStorageKey());
  } catch {
    // ignore
  }
}

function hydrateComposerDraft(draft) {
  const form = getComposerForm();
  if (!draft?.values || !form) return;

  if (draft.meta && typeof draft.meta === "object") {
    state.composerMeta = {
      ...getComposerMeta(),
      ...draft.meta,
    };
  }

  Object.entries(draft.values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;

    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }

    field.value = value ?? "";
  });
}

let autosaveBoundForKey = "";

function bindComposerAutosave() {
  const form = getComposerForm();
  if (!form) return;

  const storageKey = getStorageKey();
  if (autosaveBoundForKey === storageKey) return;
  autosaveBoundForKey = storageKey;

  form.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      window.clearTimeout(state.autosaveTimer);
      state.autosaveTimer = window.setTimeout(saveDraftToLocal, 500);
    });

    field.addEventListener("change", saveDraftToLocal);
  });
}

function unwrapSavedRecord(recordType, response) {
  if (!response) return null;

  const unwrapped = unwrapCreateResponse(recordType, response);
  if (unwrapped && typeof unwrapped === "object") return unwrapped;

  if (response.data && typeof response.data === "object") return response.data;
  if (response.record && typeof response.record === "object") return response.record;
  if (response.item && typeof response.item === "object") return response.item;

  return response;
}

function buildSuggestionMetadata(recordType, savedRecord) {
  const recordId =
    savedRecord?.id ||
    savedRecord?.record_id ||
    savedRecord?.source_id ||
    state.composerRecordId ||
    null;

  return {
    record_type: recordType,
    id: recordId,
    source_record_type: recordType,
    source_record_id: recordId,
    young_person_id:
      getCurrentScope() === "child"
        ? savedRecord?.young_person_id || state.youngPersonId || null
        : null,
    home_id:
      getCurrentScope() !== "child"
        ? savedRecord?.home_id || getCurrentHomeId() || null
        : null,
    scope: getCurrentScope(),
    user_role: state.userRole || "",
  };
}

async function runSuggestionEngineAfterSave(recordType, savedRecord) {
  if (!recordType || !savedRecord) return [];

  const metadata = buildSuggestionMetadata(recordType, savedRecord);

  const rawSuggestions = await rulesClient.evaluateSuggestions({
    recordType,
    record: {
      ...savedRecord,
      record_type: recordType,
      id: metadata.id,
      source_id: metadata.id,
    },
    metadata,
  });

  const suggestions = rulesClient.mergeSuggestionLists(rawSuggestions);

  state.currentSuggestions = suggestions;
  state.currentSuggestionSource = metadata;
  state.lastSavedRecord = savedRecord;

  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = suggestions.length
      ? `${suggestions.length} linked suggestion${suggestions.length === 1 ? "" : "s"} ready.`
      : "Saved. No AI suggestions triggered.";
  }

  if (!suggestions.length) {
    suggestionsUi.hideSuggestionsPanel?.();
    return suggestions;
  }

  suggestionsUi.showSuggestionsPanel?.(suggestions, {
    source_record_type: metadata.source_record_type,
    source_record_id: metadata.source_record_id,
    scope: metadata.scope,
  });

  return suggestions;
}

function updateComposerAssistantContext() {
  if (!els.composerAiFeedback) return;

  const meta = getComposerMeta();
  const lines = [];

  if (meta.suggestion_action_type) {
    lines.push(
      `Assistant action: ${String(meta.suggestion_action_type).replaceAll("_", " ")}`
    );
  }

  if (meta.source_record_type) {
    lines.push(
      `Linked from ${meta.source_record_type}${
        meta.source_record_id ? ` #${meta.source_record_id}` : ""
      }`
    );
  }

  if (meta.improvement_prompt) {
    lines.push(meta.improvement_prompt);
  } else if (meta.review_prompt) {
    lines.push(meta.review_prompt);
  } else if (meta.suggestion_reason) {
    lines.push(meta.suggestion_reason);
  }

  els.composerAiFeedback.textContent = lines.length
    ? lines.join(" • ")
    : "No AI review run yet.";
}

export function openComposerFor(recordType, mode = "create", item = null) {
  if (!isRecordAllowedInScope(recordType)) {
    throw new Error(`"${recordType}" is not available in ${getCurrentScope()} scope.`);
  }

  if (requiresEntityId(recordType) && !getScopeEntityId()) {
    throw new Error(
      getCurrentScope() === "child"
        ? "Select a young person first."
        : "No home context available for this record."
    );
  }

  state.composerMode = mode;
  state.composerRecordType = recordType;
  state.composerRecordId = item?.id || item?.record_id || item?.source_id || null;
  state.composerEditItem = item || {};
  state.composerOpen = true;

  setComposerMetaFromItem(item || {});

  const content = getComposerContent(recordType, item || {});
  const fieldsHost = getComposerFieldsHost();

  if (els.composerTitle) els.composerTitle.textContent = content.title;
  if (els.composerSubtitle) els.composerSubtitle.textContent = content.subtitle;
  if (els.composerGuidanceText) els.composerGuidanceText.textContent = content.guidance;

  if (els.composerPrompts) {
    els.composerPrompts.innerHTML = [
      ...(content.prompts || []).map(
        (prompt) => `<div class="composer-prompt">${escapeHtml(prompt)}</div>`
      ),
      getSuggestionBannerHtml(),
    ].join("");
  }

  if (fieldsHost) {
    fieldsHost.innerHTML = renderSections(content.sections || []);
  }

  updateComposerAssistantContext();
  openComposer();
  bindComposerAutosave();

  const draft = loadDraftFromLocal();
  if (draft) {
    hydrateComposerDraft(draft);
  }

  showComposerStatus("Autosave ready");
}

export function buildAiFeedback(type = "clarity") {
  const payload = serializeComposerForm();
  const notes = [];
  const meta = getComposerMeta();

  if (type === "grammar") {
    notes.push("Writing review:");
    notes.push("• Tighten long sentences and remove repeated wording.");
    notes.push("• Keep language professional, calm and clear.");
  }

  if (type === "clarity") {
    notes.push("Clarity review:");
    notes.push("• Make the sequence of events easy to follow.");
    notes.push("• Separate facts, reflection and next steps.");
  }

  if (type === "safeguarding") {
    notes.push("Safeguarding review:");
    notes.push("• Check whether risk, response and follow-up are explicit.");
    notes.push("• Make sure any notifications or escalation are clear.");
  }

  if (type === "child_voice") {
    notes.push("Young person voice review:");
    notes.push("• Make the young person’s views, feelings or communication more visible.");
    notes.push("• Show how adults responded to that communication.");
  }

  if (meta.improvement_prompt) {
    notes.push(`• ${meta.improvement_prompt}`);
  }

  if (
    !payload.child_voice &&
    !payload.young_person_voice &&
    !payload.child_voice_summary &&
    getCurrentScope() === "child"
  ) {
    notes.push("• Add more of the young person’s voice where appropriate.");
  }

  return notes.join("\n");
}

function isNotFoundError(error) {
  return (
    error?.status === 404 ||
    error?.message === "Not Found" ||
    /not found/i.test(String(error?.message || ""))
  );
}

function nowIso() {
  return new Date().toISOString();
}

function normaliseSavedRecordForSchema(recordType, payload = {}) {
  const currentScope = getCurrentScope();
  const entityId = getScopeEntityId();
  const id =
    payload.id ||
    state.composerRecordId ||
    `local-${recordType}-${Date.now()}`;

  const base = {
    id,
    record_id: id,
    source_id: id,
    record_type: recordType,
    created_at: payload.created_at || nowIso(),
    updated_at: nowIso(),
    _local_only: true,
  };

  if (currentScope === "child") {
    base.young_person_id = payload.young_person_id || state.youngPersonId || null;
  } else {
    base.home_id = payload.home_id || getCurrentHomeId() || entityId || null;
    base.scope = currentScope;
  }

  const byType = {
    daily_note: {
      note_date: payload.note_date || null,
      shift_type: payload.shift_type || "",
      presentation: payload.presentation || "",
      activities: payload.activities || "",
      education_update: payload.education_update || "",
      health_update: payload.health_update || "",
      family_update: payload.family_update || "",
      behaviour_update: payload.behaviour_update || "",
      young_person_voice: payload.young_person_voice || "",
      positives: payload.positives || "",
      actions_required: payload.actions_required || "",
      significance: payload.significance || "",
      workflow_status: payload.workflow_status || "draft",
      manager_review_comment: payload.manager_review_comment || "",
    },

    incident: {
      incident_type: payload.incident_type || "",
      incident_datetime: payload.incident_datetime || null,
      location: payload.location || "",
      description: payload.description || "",
      antecedent: payload.antecedent || "",
      staff_response: payload.staff_response || "",
      child_response: payload.child_response || "",
      outcome: payload.outcome || "",
      injury_flag: Boolean(payload.injury_flag),
      property_damage_flag: Boolean(payload.property_damage_flag),
      police_involved: Boolean(payload.police_involved),
      safeguarding_flag: Boolean(payload.safeguarding_flag),
      severity: payload.severity || "",
      follow_up_required: Boolean(payload.follow_up_required),
      workflow_status: payload.workflow_status || "draft",
      manager_review_status: payload.manager_review_status || "",
      presentation: payload.presentation || "",
      trauma_informed_formulation: payload.trauma_informed_formulation || "",
      child_voice: payload.child_voice || "",
      restorative_follow_up: payload.restorative_follow_up || "",
      actions_taken: payload.actions_taken || "",
      ofsted_notified: Boolean(payload.ofsted_notified),
      requires_reg40: Boolean(payload.requires_reg40),
    },

    support_plan: {
      plan_type: payload.plan_type || "",
      title: payload.title || "",
      presenting_need: payload.presenting_need || "",
      summary: payload.summary || "",
      child_voice: payload.child_voice || "",
      proactive_strategies: payload.proactive_strategies || "",
      pace_guidance: payload.pace_guidance || "",
      triggers: payload.triggers || "",
      protective_factors: payload.protective_factors || "",
      start_date: payload.start_date || null,
      review_date: payload.review_date || null,
      status: payload.status || "active",
      approval_status: payload.approval_status || "",
      review_comment: payload.review_comment || "",
    },

    risk: {
      category: payload.category || "",
      title: payload.title || "",
      concern_summary: payload.concern_summary || "",
      known_triggers: payload.known_triggers || "",
      early_warning_signs: payload.early_warning_signs || "",
      contextual_factors: payload.contextual_factors || "",
      current_controls: payload.current_controls || "",
      deescalation_strategies: payload.deescalation_strategies || "",
      response_actions: payload.response_actions || "",
      child_views: payload.child_views || "",
      severity: payload.severity || "",
      likelihood: payload.likelihood || "",
      review_date: payload.review_date || null,
      status: payload.status || "active",
      approval_status: payload.approval_status || "",
      review_comment: payload.review_comment || "",
    },

    health_record: {
      record_type: payload.record_type || "",
      event_datetime: payload.event_datetime || null,
      title: payload.title || "",
      summary: payload.summary || "",
      professional_name: payload.professional_name || "",
      outcome: payload.outcome || "",
      follow_up_required: Boolean(payload.follow_up_required),
      next_action_date: payload.next_action_date || null,
      child_voice: payload.child_voice || "",
      workflow_status: payload.workflow_status || "draft",
      significance: payload.significance || "",
      linked_appointment_id: payload.linked_appointment_id || null,
      linked_plan_id: payload.linked_plan_id || null,
    },

    education_record: {
      record_date: payload.record_date || null,
      attendance_status: payload.attendance_status || "",
      provision_name: payload.provision_name || "",
      behaviour_summary: payload.behaviour_summary || "",
      learning_engagement: payload.learning_engagement || "",
      issue_raised: payload.issue_raised || "",
      action_taken: payload.action_taken || "",
      professional_involved: payload.professional_involved || "",
      achievement_note: payload.achievement_note || "",
      child_voice: payload.child_voice || "",
      follow_up_required: Boolean(payload.follow_up_required),
      workflow_status: payload.workflow_status || "draft",
      significance: payload.significance || "",
      linked_plan_id: payload.linked_plan_id || null,
    },

    family_contact: {
      contact_datetime: payload.contact_datetime || null,
      contact_type: payload.contact_type || "",
      contact_person: payload.contact_person || "",
      supervision_level: payload.supervision_level || "",
      location: payload.location || "",
      pre_contact_presentation: payload.pre_contact_presentation || "",
      post_contact_presentation: payload.post_contact_presentation || "",
      child_voice: payload.child_voice || "",
      concerns: payload.concerns || "",
      follow_up_required: Boolean(payload.follow_up_required),
      workflow_status: payload.workflow_status || "draft",
      significance: payload.significance || "",
      linked_contact_id: payload.linked_contact_id || null,
    },

    keywork: {
      session_date: payload.session_date || null,
      topic: payload.topic || "",
      purpose: payload.purpose || "",
      summary: payload.summary || "",
      child_voice: payload.child_voice || "",
      reflective_analysis: payload.reflective_analysis || "",
      actions_agreed: payload.actions_agreed || "",
      next_session_date: payload.next_session_date || null,
      status: payload.status || "draft",
      workflow_status: payload.workflow_status || "draft",
      review_comment: payload.review_comment || "",
      manager_review_comment: payload.manager_review_comment || "",
    },

    appointment: {
      title: payload.title || "",
      description: payload.description || "",
      appointment_type: payload.appointment_type || "",
      start_datetime: payload.start_datetime || null,
      end_datetime: payload.end_datetime || null,
      location: payload.location || "",
      linked_plan_id: payload.linked_plan_id || null,
      reminder_minutes_before: payload.reminder_minutes_before || null,
      status: payload.status || "planned",
      outcome: payload.outcome || payload.outcome_notes || "",
      notes: payload.notes || payload.summary || "",
      professional_name: payload.professional_name || "",
      professional_role: payload.professional_role || "",
      purpose: payload.purpose || "",
      child_voice: payload.child_voice || "",
      preparation_notes: payload.preparation_notes || "",
      follow_up_actions: payload.follow_up_actions || "",
    },

    achievement_record: {
      achievement_date: payload.achievement_date || null,
      achievement_type: payload.achievement_type || "",
      title: payload.title || "",
      description: payload.description || "",
      source: payload.source || "",
      child_voice: payload.child_voice || "",
      linked_plan_id: payload.linked_plan_id || null,
      linked_target_id: payload.linked_target_id || null,
      significance: payload.significance || "",
      archived: Boolean(payload.archived),
    },

    safeguarding_record: {
      incident_id: payload.incident_id || null,
      safeguarding_category: payload.safeguarding_category || "",
      concern_datetime: payload.concern_datetime || null,
      disclosure_details: payload.disclosure_details || "",
      concern_details: payload.concern_details || "",
      immediate_action_taken: payload.immediate_action_taken || "",
      referral_made: Boolean(payload.referral_made),
      referral_details: payload.referral_details || "",
      outcome: payload.outcome || "",
      manager_review_status: payload.manager_review_status || "",
      closed_at: payload.closed_at || null,
    },

    missing_episode: {
      start_datetime: payload.start_datetime || null,
      reported_datetime: payload.reported_datetime || null,
      police_reference: payload.police_reference || "",
      return_datetime: payload.return_datetime || null,
      return_interview_completed: Boolean(payload.return_interview_completed),
      trigger_factors: payload.trigger_factors || "",
      push_pull_factors: payload.push_pull_factors || "",
      actions_taken: payload.actions_taken || "",
      outcome: payload.outcome || "",
      review_required: Boolean(payload.review_required),
      workflow_status: payload.workflow_status || "draft",
      manager_review_status: payload.manager_review_status || "",
      child_voice: payload.child_voice || "",
      return_interview_date: payload.return_interview_date || null,
      linked_risk_assessment_id: payload.linked_risk_assessment_id || null,
    },

    task: {
      home_id:
        payload.home_id || getCurrentHomeId() || null,
      young_person_id:
        currentScope === "child"
          ? payload.young_person_id || state.youngPersonId || null
          : null,
      task: payload.task || "",
      task_date: payload.task_date || null,
      completed: Boolean(payload.completed),
      assigned_role: payload.assigned_role || "",
      title: payload.title || "",
      assigned_to_user_id: payload.assigned_to_user_id || null,
      source_table: payload.source_table || payload.related_table || "",
      source_id: payload.source_id || payload.related_id || null,
      task_type: payload.task_type || "",
      due_date: payload.due_date || null,
      compliance_generated: Boolean(payload.compliance_generated),
      completed_at: payload.completed ? nowIso() : null,
    },

    manager_action: {
      young_person_id:
        currentScope === "child"
          ? payload.young_person_id || state.youngPersonId || null
          : null,
      action_type: payload.action_type || "",
      related_table: payload.related_table || payload.source_record_type || "",
      related_id: payload.related_id || payload.source_record_id || null,
      note: payload.note || payload.summary || "",
      action_at: nowIso(),
      summary: payload.summary || "",
    },

    document: {
      young_person_id:
        currentScope === "child"
          ? payload.young_person_id || state.youngPersonId || null
          : null,
      home_id: payload.home_id || getCurrentHomeId() || null,
      document_type: payload.document_type || "",
      title: payload.title || "",
      issue_date: payload.issue_date || null,
      review_date: payload.review_date || null,
      expiry_date: payload.expiry_date || null,
      approval_status: payload.approval_status || "",
      confidentiality_level: payload.confidentiality_level || "",
      notes: payload.notes || "",
      summary: payload.summary || "",
      important_actions: payload.important_actions || "",
      status: payload.status || "active",
      file_name: payload.file_name || "",
      category: payload.category || "",
    },

    communication: {
      young_person_id:
        currentScope === "child"
          ? payload.young_person_id || state.youngPersonId || null
          : null,
      home_id: payload.home_id || getCurrentHomeId() || null,
      contact_datetime: payload.contact_datetime || null,
      contact_type: payload.contact_type || "",
      contact_person: payload.contact_person || "",
      organisation: payload.organisation || "",
      role: payload.role || "",
      direction: payload.direction || "",
      summary: payload.summary || "",
      decisions: payload.decisions || "",
      actions_required: payload.actions_required || "",
      follow_up_required: Boolean(payload.follow_up_required),
    },

    therapy: {
      home_id: payload.home_id || getCurrentHomeId() || null,
      session_date: payload.session_date || null,
      service_name: payload.service_name || "",
      professional_name: payload.professional_name || "",
      intervention_type: payload.intervention_type || "",
      summary: payload.summary || "",
      recommendations: payload.recommendations || "",
      staff_guidance: payload.staff_guidance || "",
      next_steps: payload.next_steps || "",
    },

    team: {
      home_id: payload.home_id || getCurrentHomeId() || null,
      record_date: payload.record_date || null,
      update_type: payload.update_type || "",
      shift: payload.shift || "",
      staff_member: payload.staff_member || "",
      summary: payload.summary || "",
      impact: payload.impact || "",
      actions_required: payload.actions_required || "",
    },

    supervision: {
      home_id: payload.home_id || getCurrentHomeId() || null,
      session_date: payload.session_date || null,
      staff_member: payload.staff_member || "",
      supervisor: payload.supervisor || "",
      supervision_type: payload.supervision_type || "",
      summary: payload.summary || "",
      strengths: payload.strengths || "",
      development_needs: payload.development_needs || "",
      actions_agreed: payload.actions_agreed || "",
    },

    profile_identity: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      religion_or_faith: payload.religion_or_faith || "",
      cultural_identity: payload.cultural_identity || "",
      first_language: payload.first_language || "",
      dietary_needs: payload.dietary_needs || "",
      interests: payload.interests || "",
      strengths_summary: payload.strengths_summary || "",
      what_matters_to_me: payload.what_matters_to_me || "",
      important_dates: payload.important_dates || "",
    },

    profile_communication: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      neurodiversity_summary: payload.neurodiversity_summary || "",
      communication_style: payload.communication_style || "",
      sensory_profile: payload.sensory_profile || "",
      processing_needs: payload.processing_needs || "",
      signs_of_distress: payload.signs_of_distress || "",
      what_helps: payload.what_helps || "",
      what_to_avoid: payload.what_to_avoid || "",
      routines_and_predictability: payload.routines_and_predictability || "",
      visual_support_needs: payload.visual_support_needs || "",
    },

    profile_education: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      school_name: payload.school_name || "",
      year_group: payload.year_group || "",
      education_status: payload.education_status || "",
      sen_status: payload.sen_status || "",
      ehcp_details: payload.ehcp_details || "",
      designated_teacher: payload.designated_teacher || "",
      attendance_baseline: payload.attendance_baseline || null,
      pep_status: payload.pep_status || "",
      support_summary: payload.support_summary || "",
    },

    profile_health: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      gp_name: payload.gp_name || "",
      gp_contact: payload.gp_contact || "",
      dentist_name: payload.dentist_name || "",
      dentist_contact: payload.dentist_contact || "",
      optician_name: payload.optician_name || "",
      optician_contact: payload.optician_contact || "",
      allergies: payload.allergies || "",
      diagnoses: payload.diagnoses || "",
      mental_health_summary: payload.mental_health_summary || "",
      medication_summary: payload.medication_summary || "",
      consent_notes: payload.consent_notes || "",
    },

    profile_legal: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      legal_status: payload.legal_status || "",
      order_type: payload.order_type || "",
      order_details: payload.order_details || "",
      delegated_authority_details: payload.delegated_authority_details || "",
      restrictions_text: payload.restrictions_text || "",
      consent_arrangements: payload.consent_arrangements || "",
      effective_from: payload.effective_from || null,
      effective_to: payload.effective_to || null,
      is_current: payload.is_current !== false,
    },

    profile_formulation: {
      young_person_id: payload.young_person_id || state.youngPersonId || null,
      presenting_needs: payload.presenting_needs || "",
      developmental_context: payload.developmental_context || "",
      trauma_context: payload.trauma_context || "",
      neurodevelopmental_context: payload.neurodevelopmental_context || "",
      relational_context: payload.relational_context || "",
      meaning_of_behaviour: payload.meaning_of_behaviour || "",
      known_triggers: payload.known_triggers || "",
      early_signs_of_distress: payload.early_signs_of_distress || "",
      protective_factors: payload.protective_factors || "",
      what_helps: payload.what_helps || "",
      what_adults_should_avoid: payload.what_adults_should_avoid || "",
      regulation_strategies: payload.regulation_strategies || "",
      child_voice_summary: payload.child_voice_summary || "",
      review_date: payload.review_date || null,
      is_current: payload.is_current !== false,
    },
  };

  return {
    ...base,
    ...(byType[recordType] || payload),
  };
}

function buildLocalFallbackResponse(recordType, payload = {}) {
  return {
    item: normaliseSavedRecordForSchema(recordType, payload),
    _local_only: true,
  };
}

async function safeComposerSend(url, method, payload, recordType) {
  try {
    return await apiSend(url, method, payload);
  } catch (error) {
    if (getCurrentScope() !== "child" && isNotFoundError(error)) {
      console.warn("[composer] endpoint missing, using local fallback", {
        scope: getCurrentScope(),
        recordType,
        method,
        url,
      });

      return buildLocalFallbackResponse(recordType, payload);
    }

    throw error;
  }
}

export async function saveComposer(mode = "draft") {
  const recordType = state.composerRecordType;
  const config = COMPOSER_CONFIG[recordType];

  if (!config) {
    throw new Error(`No composer configuration for ${recordType}`);
  }

  if (!isRecordAllowedInScope(recordType)) {
    throw new Error(`"${recordType}" is not available in ${getCurrentScope()} scope.`);
  }

  if (requiresEntityId(recordType) && !getScopeEntityId()) {
    throw new Error(
      getCurrentScope() === "child"
        ? "Select a young person first."
        : "No home context available for this record."
    );
  }

  const payload = serializeComposerForm();
  let response;
  let savedRecord;

  const isSingleton = isSingletonComposerRecord(recordType);
  const hasStandardUpdateTarget =
    state.composerMode === "edit" &&
    state.composerRecordId &&
    config.updateUrl &&
    !isSingleton;

  if (isSingleton) {
    response = await safeComposerSend(
      config.updateUrl(),
      config.updateMethod || config.createMethod || "PUT",
      payload,
      recordType
    );

    savedRecord = unwrapSavedRecord(recordType, response);
    state.composerRecordId =
      savedRecord?.id ||
      savedRecord?.record_id ||
      savedRecord?.source_id ||
      state.composerRecordId ||
      getScopeEntityId();

    state.composerMode = "edit";
  } else if (hasStandardUpdateTarget) {
    response = await safeComposerSend(
      config.updateUrl(state.composerRecordId),
      config.updateMethod || "PATCH",
      payload,
      recordType
    );

    savedRecord = unwrapSavedRecord(recordType, response);
    state.composerRecordId =
      savedRecord?.id ||
      savedRecord?.record_id ||
      savedRecord?.source_id ||
      state.composerRecordId;
  } else {
    response = await safeComposerSend(
      config.createUrl(),
      config.createMethod || "POST",
      payload,
      recordType
    );

    savedRecord = unwrapSavedRecord(recordType, response);
    state.composerRecordId =
      savedRecord?.id ||
      savedRecord?.record_id ||
      savedRecord?.source_id ||
      state.composerRecordId;

    state.composerMode = "edit";
  }

  if (
    mode === "submit" &&
    config.submitUrl &&
    state.composerRecordId &&
    !response?._local_only
  ) {
    await safeComposerSend(
      config.submitUrl(state.composerRecordId),
      "POST",
      {},
      recordType
    );
  }

  try {
    await runSuggestionEngineAfterSave(recordType, {
      ...(savedRecord || {}),
      young_person_id:
        getCurrentScope() === "child"
          ? savedRecord?.young_person_id ||
            payload.young_person_id ||
            state.youngPersonId
          : null,
      home_id:
        getCurrentScope() !== "child"
          ? savedRecord?.home_id || payload.home_id || getCurrentHomeId()
          : null,
    });
  } catch (error) {
    console.error("[composer] suggestion trigger failed", error);
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent =
        "Saved, but AI suggestions could not be loaded.";
    }
  }

  clearDraftFromLocal();
  autosaveBoundForKey = "";

  showComposerStatus(
    response?._local_only
      ? "Saved locally"
      : mode === "submit"
      ? "Submitted"
      : "Saved"
  );

  closeComposer(true);
  return response;
}
