import { ypApiPost, youngPersonPath } from "./api.js";
import { clearYoungPeopleDataCache } from "./data-loader.js";
import { state } from "./state.js";
import {
  byId,
  closeComposerShell,
  escapeHtml,
  openComposerShell,
  setComposerSaving,
  setComposerStatus,
  setComposerTitle,
  setStatus,
} from "./ui.js";
import { evidenceForRecordType } from "../workflow-contract.js";

const COMPOSER_DEFS = Object.freeze({
  daily_note: {
    title: "New daily note",
    subtitle: "Record the day clearly, kindly and professionally.",
    endpoint: "/daily-notes",
    refreshTab: "daily",
    fields: [
      { name: "note_date", label: "Date", type: "date" },
      { name: "shift_type", label: "Shift type", type: "text", placeholder: "Day, late, night..." },
      { name: "presentation", label: "Presentation / wellbeing", type: "textarea", required: true },
      { name: "behaviour_update", label: "Behaviour update", type: "textarea" },
      { name: "positives", label: "Positives", type: "textarea" },
      { name: "actions_required", label: "Actions required / next steps", type: "textarea" },
      { name: "young_person_voice", label: "Young person's voice", type: "textarea" },
    ],
  },
  health_record: {
    title: "New health record",
    subtitle: "Record health and wellbeing information.",
    endpoint: "/health-records",
    refreshTab: "health",
    fields: [
      { name: "event_datetime", label: "Date and time", type: "datetime-local" },
      { name: "record_type", label: "Record type", type: "text", placeholder: "Appointment, illness, wellbeing..." },
      { name: "title", label: "Title", type: "text" },
      { name: "summary", label: "Summary", type: "textarea", required: true },
      { name: "action_taken", label: "Action taken", type: "textarea" },
      { name: "follow_up_required", label: "Follow-up required", type: "checkbox" },
    ],
  },
  education_record: {
    title: "New education record",
    subtitle: "Record education, attendance or learning updates.",
    endpoint: "/education-records",
    refreshTab: "education",
    fields: [
      { name: "record_date", label: "Date", type: "date" },
      { name: "attendance_status", label: "Attendance status", type: "text" },
      { name: "provision_name", label: "Provision / school", type: "text" },
      { name: "behaviour_summary", label: "Behaviour / presentation", type: "textarea" },
      { name: "learning_engagement", label: "Learning engagement", type: "textarea" },
      { name: "issue_raised", label: "Any issue raised", type: "textarea", placeholder: "Leave blank if no issue was raised." },
      { name: "action_taken", label: "Action taken", type: "textarea", placeholder: "Leave blank if no action was needed." },
      { name: "professional_involved", label: "Professional involved", type: "text" },
      { name: "achievement_note", label: "Achievement / positive note", type: "textarea" },
    ],
  },
  family_record: {
    title: "New family record",
    subtitle: "Record family time, contact and relationship updates.",
    endpoint: "/family/records",
    refreshTab: "family",
    fields: [
      { name: "contact_datetime", label: "Date and time", type: "datetime-local" },
      { name: "contact_type", label: "Contact type", type: "text" },
      { name: "contact_person", label: "Contact person", type: "text" },
      { name: "pre_contact_presentation", label: "Presentation before contact", type: "textarea" },
      { name: "post_contact_presentation", label: "Presentation after contact", type: "textarea" },
      { name: "child_voice", label: "Young person's voice", type: "textarea" },
      { name: "concerns", label: "Concerns", type: "textarea" },
      { name: "follow_up_required", label: "Follow-up required", type: "checkbox" },
    ],
  },
  incident: {
    title: "New incident",
    subtitle: "Record important events factually and clearly.",
    endpoint: "/incidents",
    refreshTab: "incidents",
    fields: [
      { name: "incident_datetime", label: "Date and time", type: "datetime-local" },
      { name: "incident_type", label: "Incident type", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "summary", label: "What happened?", type: "textarea", required: true },
      { name: "staff_response", label: "Staff response", type: "textarea" },
      { name: "outcome", label: "Outcome", type: "textarea" },
      { name: "safeguarding_follow_up", label: "Safeguarding follow-up", type: "textarea" },
      { name: "follow_up_required", label: "Follow-up required", type: "text", placeholder: "No / Yes - describe what follow-up is needed" },
    ],
  },
});

function currentYoungPersonId() {
  return state.youngPersonId || document.body?.dataset?.youngPersonId || null;
}

function fieldHtml(field) {
  const label = escapeHtml(field.label || field.name);
  const name = escapeHtml(field.name);
  const required = field.required ? "required" : "";
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : "";

  if (field.type === "textarea") {
    return `<label class="yp-field"><span>${label}</span><textarea name="${name}" ${required} ${placeholder}></textarea></label>`;
  }

  if (field.type === "checkbox") {
    return `<label class="yp-field yp-field-checkbox"><span>${label}</span><input name="${name}" type="checkbox" /></label>`;
  }

  return `<label class="yp-field"><span>${label}</span><input name="${name}" type="${escapeHtml(field.type || "text")}" ${required} ${placeholder} /></label>`;
}

function renderFields(definition) {
  const fields = byId("ypComposerFields");
  if (fields) fields.innerHTML = definition.fields.map(fieldHtml).join("");
}

function normaliseEducationPayload(payload, status) {
  payload.issue_raised = payload.issue_raised || "";
  payload.action_taken = payload.action_taken || "";

  if (status === "submitted") {
    payload.create_follow_up_task = false;
    payload.manager_review_needed = false;
    payload.safeguarding_concern = false;
    payload.link_to_chronology = true;
    payload.link_to_support_plans = false;
    payload.link_monthly_reviews = true;
    payload.link_quality_standards = true;
  }

  return payload;
}

function lifecycleStateForStatus(status) {
  return status === "submitted" ? "submitted" : "draft";
}

function workflowPayload(recordType, status, payload) {
  const evidence = evidenceForRecordType(recordType);
  const actionTypes = status === "submitted" ? [...(evidence.defaultActions || [])] : [];

  if (recordType === "incident") {
    const safeguardingText = String(payload.safeguarding_follow_up || "").trim();
    const followUpText = String(payload.follow_up_required || "").trim().toLowerCase();
    if (safeguardingText) actionTypes.push("safeguarding_follow_up");
    if (safeguardingText || followUpText.includes("yes")) actionTypes.push("reg40_decision");
  }

  return {
    lifecycle_state: lifecycleStateForStatus(status),
    workflow_status: status,
    record_type: recordType,
    evidence_mapping: {
      sccif: evidence.sccif || [],
      quality_standards: evidence.quality || [],
    },
    action_intents: [...new Set(actionTypes)].map((type) => ({
      type,
      source: "record_submission",
      status: "open",
    })),
    manager_review_needed: status === "submitted",
    evidence_bank_ready: status === "submitted",
  };
}

function collectPayload(status) {
  const payload = { status, workflow_status: status };
  byId("ypComposerFields")?.querySelectorAll("input, textarea, select").forEach((field) => {
    if (!field.name) return;
    payload[field.name] = field.type === "checkbox" ? Boolean(field.checked) : field.value;
  });

  if (state.composerRecordType === "education_record") normaliseEducationPayload(payload, status);

  if (state.composerRecordType === "daily_note") {
    payload.manager_review_needed = status === "submitted";
    payload.create_follow_up_task = false;
    payload.link_to_chronology = true;
    payload.link_to_support_plans = false;
    payload.safeguarding_concern = false;
    payload.link_monthly_reviews = false;
    payload.link_quality_standards = true;
  }

  return {
    ...payload,
    workflow: workflowPayload(state.composerRecordType, status, payload),
  };
}

export function openComposer(type) {
  const definition = COMPOSER_DEFS[type];
  if (!definition) {
    setStatus("This record type is not available yet.");
    return false;
  }

  if (!currentYoungPersonId()) {
    setStatus("Select a young person before creating a record.");
    return false;
  }

  state.composerOpen = true;
  state.composerRecordType = type;
  setComposerTitle(definition.title, definition.subtitle);
  setComposerStatus("");
  renderFields(definition);
  openComposerShell();
  return true;
}

export function closeComposer() {
  state.composerOpen = false;
  state.composerRecordType = null;
  setComposerStatus("");
  closeComposerShell();
}

export async function saveComposer(status = "draft") {
  if (!state.composerRecordType) return false;
  const definition = COMPOSER_DEFS[state.composerRecordType];
  if (!definition) return false;

  const youngPersonId = currentYoungPersonId();
  if (!youngPersonId) {
    setComposerStatus("No young person selected.");
    return false;
  }

  setComposerSaving(true);
  setComposerStatus(status === "draft" ? "Saving draft..." : "Sending for review...");

  try {
    await ypApiPost(youngPersonPath(youngPersonId, definition.endpoint), collectPayload(status));
    clearYoungPeopleDataCache(youngPersonId);
    const refreshTab = definition.refreshTab || state.currentSection || "daily";
    closeComposer();
    setStatus(status === "draft" ? "Draft saved." : "Sent for review and added to workflow.");
    window.IndiCareYoungPeopleBoot?.setCurrentTab?.(refreshTab);
    return true;
  } catch (error) {
    console.error("[young-people-shell/composer] save failed", error);
    setComposerStatus(error?.message || "Save failed.");
    return false;
  } finally {
    setComposerSaving(false);
  }
}

export function bindComposer() {
  document.querySelectorAll("[data-composer-type]").forEach((button) => {
    button.addEventListener("click", () => openComposer(button.dataset.composerType));
  });
  byId("ypComposerClose")?.addEventListener("click", closeComposer);
  byId("ypComposerBackdrop")?.addEventListener("click", closeComposer);
  byId("ypComposerSaveDraft")?.addEventListener("click", () => saveComposer("draft"));
  byId("ypComposerSubmit")?.addEventListener("click", () => saveComposer("submitted"));
}

window.IndiCareYoungPeopleComposer = Object.freeze({ bindComposer, openComposer, closeComposer, saveComposer });
