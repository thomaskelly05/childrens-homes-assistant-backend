import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend, unwrapCreateResponse } from "../core/api.js";
import {
  escapeHtml,
  toDateInputValue,
  toDateTimeLocalValue,
} from "../core/utils.js";

const COMPOSER_CONFIG = {
  daily_note: {
    label: "Daily note",
    createUrl: (id) => `/young-people/${id}/daily-notes`,
    updateUrl: (id) => `/young-people/daily-notes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/daily-notes/${id}/submit`,
  },

  incident: {
    label: "Important event",
    createUrl: (id) => `/young-people/${id}/incidents`,
    updateUrl: (id) => `/young-people/incidents/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/incidents/${id}/submit`,
  },

  support_plan: {
    label: "Support plan",
    createUrl: (id) => `/young-people/${id}/plans`,
    updateUrl: (id) => `/young-people/plans/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/plans/${id}/submit`,
  },

  risk: {
    label: "Risk assessment",
    createUrl: (id) => `/young-people/${id}/risks`,
    updateUrl: (id) => `/young-people/risks/${id}`,
    updateMethod: "PUT",
    submitUrl: (id) => `/young-people/risks/${id}/submit`,
  },

  health_record: {
    label: "Health record",
    createUrl: (id) => `/young-people/${id}/health-records`,
    updateUrl: (id) => `/young-people/health-records/${id}`,
    updateMethod: "PATCH",
  },

  education_record: {
    label: "Education record",
    createUrl: (id) => `/young-people/${id}/education-records`,
    updateUrl: (id) => `/young-people/education-records/${id}`,
    updateMethod: "PATCH",
  },

  family_contact: {
    label: "Family contact",
    createUrl: (id) => `/young-people/${id}/family-contact-records`,
    updateUrl: (id) => `/young-people/family-contact-records/${id}`,
    updateMethod: "PATCH",
  },

  keywork: {
    label: "Keywork session",
    createUrl: (id) => `/young-people/${id}/keywork`,
    updateUrl: (id) => `/young-people/keywork/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/keywork/${id}/submit`,
  },

  appointment: {
    label: "Appointment",
    createUrl: (id) => `/young-people/${id}/appointments`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
    updateMethod: "PATCH",
  },

  profile_identity: {
    label: "Identity profile",
    createUrl: (id) => `/young-people/${id}/identity-profile`,
    updateUrl: (id) => `/young-people/${id}/identity-profile`,
    updateMethod: "PUT",
  },

  profile_communication: {
    label: "Communication profile",
    createUrl: (id) => `/young-people/${id}/communication-profile`,
    updateUrl: (id) => `/young-people/${id}/communication-profile`,
    updateMethod: "PUT",
  },

  profile_education: {
    label: "Education profile",
    createUrl: (id) => `/young-people/${id}/education-profile`,
    updateUrl: (id) => `/young-people/${id}/education-profile`,
    updateMethod: "PUT",
  },

  profile_health: {
    label: "Health profile",
    createUrl: (id) => `/young-people/${id}/health-profile`,
    updateUrl: (id) => `/young-people/${id}/health-profile`,
    updateMethod: "PUT",
  },

  profile_legal: {
    label: "Legal status",
    createUrl: (id) => `/young-people/${id}/legal-status`,
    updateUrl: (id) => `/young-people/${id}/legal-status`,
    updateMethod: "PUT",
  },

  profile_formulation: {
    label: "Formulation",
    createUrl: (id) => `/young-people/${id}/formulation`,
    updateUrl: (id) => `/young-people/${id}/formulation`,
    updateMethod: "PUT",
  },
};

function showComposerStatus(message) {
  if (els.composerAutosaveStatus) {
    els.composerAutosaveStatus.textContent = message || "Ready";
  }
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

  state.composerOpen = false;
  state.composerMode = "create";
  state.composerRecordType = null;
  state.composerRecordId = null;
  state.composerEditItem = null;

  if (els.composerFields) els.composerFields.innerHTML = "";
  if (els.composerAiFeedback) els.composerAiFeedback.textContent = "No AI review run yet.";
  showComposerStatus("Autosave ready");
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
                <option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value || "") ? "selected" : ""}>
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

function getToday() {
  return toDateInputValue(new Date());
}

function getNowLocal() {
  return toDateTimeLocalValue(new Date());
}

function getComposerContent(recordType, item = {}) {
  const today = getToday();
  const now = getNowLocal();

  if (recordType === "daily_note") {
    return {
      title: item?.id ? "Edit daily note" : "New daily note",
      subtitle: "Record the day clearly and keep the young person at the centre.",
      guidance:
        "Describe the day factually, reflect what the young person may have been communicating, note positives, and record what needs to happen next.",
      prompts: [
        "What was the young person showing us today?",
        "What helped them feel safer or more regulated?",
        "What positives or strengths should be noticed?",
        "What do adults need to do next?",
      ],
      sections: [
        {
          title: "Basic details",
          subtitle: "Start with the essential context.",
          fields: [
            { name: "note_date", label: "Date", type: "date", value: item.note_date || today },
            {
              name: "shift_type",
              label: "Shift type",
              type: "select",
              value: item.shift_type || "day",
              options: [
                { value: "day", label: "Day" },
                { value: "evening", label: "Evening" },
                { value: "night", label: "Night" },
                { value: "waking_night", label: "Waking night" },
              ],
            },
            { name: "mood", label: "Mood / presentation", type: "text", value: item.mood || "" },
            { name: "significance", label: "Significance", type: "text", value: item.significance || "" },
          ],
        },
        {
          title: "What happened",
          subtitle: "Describe the lived experience of the day.",
          fields: [
            { name: "presentation", label: "Presentation", type: "textarea", full: true, value: item.presentation || "" },
            { name: "activities", label: "Activities", type: "textarea", full: true, value: item.activities || "" },
            { name: "education_update", label: "Education update", type: "textarea", full: true, value: item.education_update || "" },
            { name: "health_update", label: "Health update", type: "textarea", full: true, value: item.health_update || "" },
            { name: "family_update", label: "Family update", type: "textarea", full: true, value: item.family_update || "" },
            { name: "behaviour_update", label: "Behaviour / communication update", type: "textarea", full: true, value: item.behaviour_update || "" },
          ],
        },
        {
          title: "Voice and next steps",
          subtitle: "Keep the young person visible in the note.",
          fields: [
            { name: "young_person_voice", label: "Young person voice", type: "textarea", full: true, value: item.young_person_voice || "" },
            { name: "positives", label: "Positives / strengths", type: "textarea", full: true, value: item.positives || "" },
            { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item.actions_required || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "incident") {
    return {
      title: item?.id ? "Edit important event" : "New important event",
      subtitle: "Record clearly, calmly and with safeguarding awareness.",
      guidance:
        "Stick to facts, what happened before, how adults responded, what the young person communicated, and what needs to happen next.",
      prompts: [
        "What happened before the incident?",
        "How did adults respond?",
        "What may the young person have been communicating?",
        "What follow-up is needed now?",
      ],
      sections: [
        {
          title: "Incident details",
          fields: [
            { name: "incident_datetime", label: "Incident date and time", type: "datetime-local", value: toDateTimeLocalValue(item.incident_datetime) || now },
            { name: "incident_type", label: "Incident type", type: "text", value: item.incident_type || "" },
            { name: "location", label: "Location", type: "text", value: item.location || "" },
            {
              name: "severity",
              label: "Severity",
              type: "select",
              value: item.severity || "medium",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ],
            },
          ],
        },
        {
          title: "Event narrative",
          fields: [
            { name: "description", label: "What happened", type: "textarea", full: true, value: item.description || "" },
            { name: "antecedent", label: "Antecedent", type: "textarea", full: true, value: item.antecedent || "" },
            { name: "staff_response", label: "Staff response", type: "textarea", full: true, value: item.staff_response || "" },
            { name: "child_response", label: "Child response", type: "textarea", full: true, value: item.child_response || "" },
            { name: "outcome", label: "Outcome", type: "textarea", full: true, value: item.outcome || "" },
          ],
        },
        {
          title: "Reflection and follow-up",
          fields: [
            { name: "presentation", label: "Presentation", type: "textarea", full: true, value: item.presentation || "" },
            { name: "trauma_informed_formulation", label: "Trauma-informed formulation", type: "textarea", full: true, value: item.trauma_informed_formulation || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "restorative_follow_up", label: "Restorative follow-up", type: "textarea", full: true, value: item.restorative_follow_up || "" },
            { name: "actions_taken", label: "Actions taken", type: "textarea", full: true, value: item.actions_taken || "" },
            { name: "injury_flag", label: "Injury flag", type: "checkbox", value: !!item.injury_flag },
            { name: "property_damage_flag", label: "Property damage", type: "checkbox", value: !!item.property_damage_flag },
            { name: "police_involved", label: "Police involved", type: "checkbox", value: !!item.police_involved },
            { name: "safeguarding_flag", label: "Safeguarding concern", type: "checkbox", value: !!item.safeguarding_flag },
            { name: "follow_up_required", label: "Follow-up required", type: "checkbox", value: !!item.follow_up_required },
          ],
        },
      ],
    };
  }

  if (recordType === "support_plan") {
    return {
      title: item?.id ? "Edit support plan" : "New support plan",
      subtitle: "Create practical guidance that helps adults respond consistently.",
      guidance:
        "Describe the presenting need, what helps, what adults should do, and when the plan will be reviewed.",
      prompts: [
        "What need are we responding to?",
        "What should adults notice early?",
        "What helps most?",
        "How is the young person’s voice reflected?",
      ],
      sections: [
        {
          title: "Plan details",
          fields: [
            { name: "plan_type", label: "Plan type", type: "text", value: item.plan_type || "support_plan" },
            { name: "title", label: "Title", type: "text", value: item.title || "" },
            { name: "start_date", label: "Start date", type: "date", value: item.start_date || today },
            { name: "review_date", label: "Review date", type: "date", value: item.review_date || today },
            {
              name: "status",
              label: "Status",
              type: "select",
              value: item.status || "active",
              options: [
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "review_due", label: "Review due" },
                { value: "closed", label: "Closed" },
              ],
            },
          ],
        },
        {
          title: "Plan content",
          fields: [
            { name: "presenting_need", label: "Presenting need", type: "textarea", full: true, value: item.presenting_need || "" },
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "proactive_strategies", label: "Proactive strategies", type: "textarea", full: true, value: item.proactive_strategies || "" },
            { name: "pace_guidance", label: "PACE guidance", type: "textarea", full: true, value: item.pace_guidance || "" },
            { name: "triggers", label: "Triggers", type: "textarea", full: true, value: item.triggers || "" },
            { name: "protective_factors", label: "Protective factors", type: "textarea", full: true, value: item.protective_factors || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "risk") {
    return {
      title: item?.id ? "Edit risk assessment" : "New risk assessment",
      subtitle: "Build clear support and safety guidance.",
      guidance:
        "Focus on patterns, triggers, early warning signs, current controls, de-escalation, and response actions.",
      prompts: [
        "What is the concern adults need to understand?",
        "What are the known triggers?",
        "What are the early warning signs?",
        "What should adults do in practice?",
      ],
      sections: [
        {
          title: "Assessment details",
          fields: [
            { name: "category", label: "Category", type: "text", value: item.category || "" },
            { name: "title", label: "Title", type: "text", value: item.title || "" },
            {
              name: "severity",
              label: "Severity",
              type: "select",
              value: item.severity || "medium",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ],
            },
            { name: "likelihood", label: "Likelihood", type: "text", value: item.likelihood || "" },
            { name: "review_date", label: "Review date", type: "date", value: item.review_date || today },
            {
              name: "status",
              label: "Status",
              type: "select",
              value: item.status || "active",
              options: [
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "closed", label: "Closed" },
              ],
            },
          ],
        },
        {
          title: "Assessment content",
          fields: [
            { name: "concern_summary", label: "Concern summary", type: "textarea", full: true, value: item.concern_summary || "" },
            { name: "known_triggers", label: "Known triggers", type: "textarea", full: true, value: item.known_triggers || "" },
            { name: "early_warning_signs", label: "Early warning signs", type: "textarea", full: true, value: item.early_warning_signs || "" },
            { name: "contextual_factors", label: "Contextual factors", type: "textarea", full: true, value: item.contextual_factors || "" },
            { name: "current_controls", label: "Current controls", type: "textarea", full: true, value: item.current_controls || "" },
            { name: "deescalation_strategies", label: "De-escalation strategies", type: "textarea", full: true, value: item.deescalation_strategies || "" },
            { name: "response_actions", label: "Response actions", type: "textarea", full: true, value: item.response_actions || "" },
            { name: "child_views", label: "Child views", type: "textarea", full: true, value: item.child_views || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "health_record") {
    return {
      title: item?.id ? "Edit health record" : "New health record",
      subtitle: "Record health events, outcomes and follow-up.",
      guidance: "Capture what happened, who was involved, what the outcome was, and what needs to happen next.",
      prompts: [
        "What health event or appointment took place?",
        "Who was involved?",
        "What was the outcome?",
        "Is follow-up needed?",
      ],
      sections: [
        {
          title: "Record details",
          fields: [
            { name: "record_type", label: "Record type", type: "text", value: item.record_type || "" },
            { name: "event_datetime", label: "Event date and time", type: "datetime-local", value: toDateTimeLocalValue(item.event_datetime) || now },
            { name: "title", label: "Title", type: "text", value: item.title || "" },
            { name: "professional_name", label: "Professional name", type: "text", value: item.professional_name || "" },
            { name: "next_action_date", label: "Next action date", type: "date", value: item.next_action_date || "" },
            { name: "significance", label: "Significance", type: "text", value: item.significance || "" },
          ],
        },
        {
          title: "Record content",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "outcome", label: "Outcome", type: "textarea", full: true, value: item.outcome || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "follow_up_required", label: "Follow-up required", type: "checkbox", value: !!item.follow_up_required },
          ],
        },
      ],
    };
  }

  if (recordType === "education_record") {
    return {
      title: item?.id ? "Edit education record" : "New education record",
      subtitle: "Record attendance, engagement, concerns and action taken.",
      guidance: "Describe what the education day was like, what support was needed, and any concerns or positives.",
      prompts: [
        "How did the young person engage?",
        "Was there an attendance issue?",
        "Were any concerns raised?",
        "What action was taken?",
      ],
      sections: [
        {
          title: "Education details",
          fields: [
            { name: "record_date", label: "Record date", type: "date", value: item.record_date || today },
            { name: "attendance_status", label: "Attendance status", type: "text", value: item.attendance_status || "" },
            { name: "provision_name", label: "Provision name", type: "text", value: item.provision_name || "" },
            { name: "professional_involved", label: "Professional involved", type: "text", value: item.professional_involved || "" },
            { name: "significance", label: "Significance", type: "text", value: item.significance || "" },
          ],
        },
        {
          title: "Education narrative",
          fields: [
            { name: "behaviour_summary", label: "Behaviour summary", type: "textarea", full: true, value: item.behaviour_summary || "" },
            { name: "learning_engagement", label: "Learning engagement", type: "textarea", full: true, value: item.learning_engagement || "" },
            { name: "issue_raised", label: "Issue raised", type: "textarea", full: true, value: item.issue_raised || "" },
            { name: "action_taken", label: "Action taken", type: "textarea", full: true, value: item.action_taken || "" },
            { name: "achievement_note", label: "Achievement note", type: "textarea", full: true, value: item.achievement_note || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "follow_up_required", label: "Follow-up required", type: "checkbox", value: !!item.follow_up_required },
          ],
        },
      ],
    };
  }

  if (recordType === "family_contact") {
    return {
      title: item?.id ? "Edit family contact" : "New family contact",
      subtitle: "Record contact, presentation, concerns and follow-up.",
      guidance: "Capture the contact itself, how the young person presented before and after, and what support is needed next.",
      prompts: [
        "Who was the contact with?",
        "How did the young person present before contact?",
        "How did they present after contact?",
        "Were there any concerns or follow-up needs?",
      ],
      sections: [
        {
          title: "Contact details",
          fields: [
            { name: "contact_datetime", label: "Contact date and time", type: "datetime-local", value: toDateTimeLocalValue(item.contact_datetime) || now },
            { name: "contact_type", label: "Contact type", type: "text", value: item.contact_type || "" },
            { name: "contact_person", label: "Contact person", type: "text", value: item.contact_person || "" },
            { name: "supervision_level", label: "Supervision level", type: "text", value: item.supervision_level || "" },
            { name: "location", label: "Location", type: "text", value: item.location || "" },
            { name: "significance", label: "Significance", type: "text", value: item.significance || "" },
          ],
        },
        {
          title: "Contact narrative",
          fields: [
            { name: "pre_contact_presentation", label: "Pre-contact presentation", type: "textarea", full: true, value: item.pre_contact_presentation || "" },
            { name: "post_contact_presentation", label: "Post-contact presentation", type: "textarea", full: true, value: item.post_contact_presentation || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "concerns", label: "Concerns", type: "textarea", full: true, value: item.concerns || "" },
            { name: "follow_up_required", label: "Follow-up required", type: "checkbox", value: !!item.follow_up_required },
          ],
        },
      ],
    };
  }

  if (recordType === "keywork") {
    return {
      title: item?.id ? "Edit keywork session" : "New keywork session",
      subtitle: "Record direct work, reflection and agreed actions.",
      guidance: "Keep the young person’s voice central and record the purpose, summary, reflection and next steps.",
      prompts: [
        "What was the topic and purpose?",
        "What did the young person say or communicate?",
        "What was your reflective analysis?",
        "What was agreed next?",
      ],
      sections: [
        {
          title: "Session details",
          fields: [
            { name: "session_date", label: "Session date", type: "date", value: item.session_date || today },
            { name: "topic", label: "Topic", type: "text", value: item.topic || "" },
            { name: "purpose", label: "Purpose", type: "textarea", full: true, value: item.purpose || "" },
            { name: "next_session_date", label: "Next session date", type: "date", value: item.next_session_date || "" },
          ],
        },
        {
          title: "Session narrative",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "reflective_analysis", label: "Reflective analysis", type: "textarea", full: true, value: item.reflective_analysis || "" },
            { name: "actions_agreed", label: "Actions agreed", type: "textarea", full: true, value: item.actions_agreed || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "appointment") {
    return {
      title: item?.id ? "Edit appointment" : "New appointment",
      subtitle: "Record key dates, professionals, purpose and outcomes.",
      guidance: "Capture the timing, purpose, preparation, and any follow-up needed.",
      prompts: [
        "When is the appointment?",
        "Who is involved?",
        "What is the purpose?",
        "What follow-up is needed?",
      ],
      sections: [
        {
          title: "Appointment details",
          fields: [
            { name: "title", label: "Title", type: "text", value: item.title || "" },
            { name: "appointment_type", label: "Appointment type", type: "text", value: item.appointment_type || "" },
            { name: "start_datetime", label: "Start date and time", type: "datetime-local", value: toDateTimeLocalValue(item.start_datetime || item.appointment_date) || now },
            { name: "end_datetime", label: "End date and time", type: "datetime-local", value: toDateTimeLocalValue(item.end_datetime) || "" },
            { name: "location", label: "Location", type: "text", value: item.location || "" },
            { name: "professional_name", label: "Professional name", type: "text", value: item.professional_name || "" },
            { name: "professional_role", label: "Professional role", type: "text", value: item.professional_role || "" },
            { name: "status", label: "Status", type: "text", value: item.status || "" },
            { name: "reminder_minutes_before", label: "Reminder minutes before", type: "number", value: item.reminder_minutes_before || "" },
          ],
        },
        {
          title: "Appointment narrative",
          fields: [
            { name: "description", label: "Description", type: "textarea", full: true, value: item.description || "" },
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "purpose", label: "Purpose", type: "textarea", full: true, value: item.purpose || "" },
            { name: "child_voice", label: "Child voice", type: "textarea", full: true, value: item.child_voice || "" },
            { name: "preparation_notes", label: "Preparation notes", type: "textarea", full: true, value: item.preparation_notes || "" },
            { name: "outcome_notes", label: "Outcome notes", type: "textarea", full: true, value: item.outcome_notes || item.outcome || "" },
            { name: "follow_up_actions", label: "Follow-up actions", type: "textarea", full: true, value: item.follow_up_actions || "" },
            { name: "notes", label: "Notes", type: "textarea", full: true, value: item.notes || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_identity") {
    return {
      title: "Edit identity profile",
      subtitle: "Identity, culture, strengths and what matters.",
      guidance: "Capture the young person’s identity and what matters to them in a respectful, child-centred way.",
      prompts: [
        "What matters most to the young person?",
        "What strengths should adults keep in mind?",
      ],
      sections: [
        {
          title: "Identity profile",
          fields: [
            { name: "religion_or_faith", label: "Religion or faith", type: "text", value: item.religion_or_faith || "" },
            { name: "cultural_identity", label: "Cultural identity", type: "text", value: item.cultural_identity || "" },
            { name: "first_language", label: "First language", type: "text", value: item.first_language || "" },
            { name: "dietary_needs", label: "Dietary needs", type: "text", value: item.dietary_needs || "" },
            { name: "interests", label: "Interests", type: "textarea", full: true, value: item.interests || "" },
            { name: "strengths_summary", label: "Strengths summary", type: "textarea", full: true, value: item.strengths_summary || "" },
            { name: "what_matters_to_me", label: "What matters to me", type: "textarea", full: true, value: item.what_matters_to_me || "" },
            { name: "important_dates", label: "Important dates", type: "textarea", full: true, value: item.important_dates || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_communication") {
    return {
      title: "Edit communication profile",
      subtitle: "Communication style, sensory needs and what helps.",
      guidance: "Describe how this young person communicates, processes and what adults should understand.",
      prompts: [
        "How does the young person communicate best?",
        "What helps and what should adults avoid?",
      ],
      sections: [
        {
          title: "Communication profile",
          fields: [
            { name: "neurodiversity_summary", label: "Neurodiversity summary", type: "textarea", full: true, value: item.neurodiversity_summary || "" },
            { name: "communication_style", label: "Communication style", type: "textarea", full: true, value: item.communication_style || "" },
            { name: "sensory_profile", label: "Sensory profile", type: "textarea", full: true, value: item.sensory_profile || "" },
            { name: "processing_needs", label: "Processing needs", type: "textarea", full: true, value: item.processing_needs || "" },
            { name: "signs_of_distress", label: "Signs of distress", type: "textarea", full: true, value: item.signs_of_distress || "" },
            { name: "what_helps", label: "What helps", type: "textarea", full: true, value: item.what_helps || "" },
            { name: "what_to_avoid", label: "What to avoid", type: "textarea", full: true, value: item.what_to_avoid || "" },
            { name: "routines_and_predictability", label: "Routines and predictability", type: "textarea", full: true, value: item.routines_and_predictability || "" },
            { name: "visual_support_needs", label: "Visual support needs", type: "textarea", full: true, value: item.visual_support_needs || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_education") {
    return {
      title: "Edit education profile",
      subtitle: "School, learning needs and support.",
      guidance: "Keep the school context clear and practical for adults supporting day to day.",
      prompts: [
        "What school or provision is in place?",
        "What support does the young person need to access learning well?",
      ],
      sections: [
        {
          title: "Education profile",
          fields: [
            { name: "school_name", label: "School name", type: "text", value: item.school_name || "" },
            { name: "year_group", label: "Year group", type: "text", value: item.year_group || "" },
            { name: "education_status", label: "Education status", type: "text", value: item.education_status || "" },
            { name: "sen_status", label: "SEN status", type: "text", value: item.sen_status || "" },
            { name: "ehcp_details", label: "EHCP details", type: "textarea", full: true, value: item.ehcp_details || "" },
            { name: "designated_teacher", label: "Designated teacher", type: "text", value: item.designated_teacher || "" },
            { name: "attendance_baseline", label: "Attendance baseline", type: "number", value: item.attendance_baseline || "" },
            { name: "pep_status", label: "PEP status", type: "text", value: item.pep_status || "" },
            { name: "support_summary", label: "Support summary", type: "textarea", full: true, value: item.support_summary || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_health") {
    return {
      title: "Edit health profile",
      subtitle: "Health professionals, diagnoses and wellbeing.",
      guidance: "Keep this accurate and practical so health needs are easy to understand.",
      prompts: [
        "What health needs are most important for staff to understand?",
        "What medication or health follow-up matters most?",
      ],
      sections: [
        {
          title: "Health profile",
          fields: [
            { name: "gp_name", label: "GP name", type: "text", value: item.gp_name || "" },
            { name: "gp_contact", label: "GP contact", type: "text", value: item.gp_contact || "" },
            { name: "dentist_name", label: "Dentist name", type: "text", value: item.dentist_name || "" },
            { name: "dentist_contact", label: "Dentist contact", type: "text", value: item.dentist_contact || "" },
            { name: "optician_name", label: "Optician name", type: "text", value: item.optician_name || "" },
            { name: "optician_contact", label: "Optician contact", type: "text", value: item.optician_contact || "" },
            { name: "allergies", label: "Allergies", type: "textarea", full: true, value: item.allergies || "" },
            { name: "diagnoses", label: "Diagnoses", type: "textarea", full: true, value: item.diagnoses || "" },
            { name: "mental_health_summary", label: "Mental health summary", type: "textarea", full: true, value: item.mental_health_summary || "" },
            { name: "medication_summary", label: "Medication summary", type: "textarea", full: true, value: item.medication_summary || "" },
            { name: "consent_notes", label: "Consent notes", type: "textarea", full: true, value: item.consent_notes || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_legal") {
    return {
      title: "Edit legal status",
      subtitle: "Legal context, authority and restrictions.",
      guidance: "Keep legal status clear, current and practical for the team.",
      prompts: [
        "What legal status should adults be aware of?",
        "Are there any restrictions or delegated authority details to hold in mind?",
      ],
      sections: [
        {
          title: "Legal status",
          fields: [
            { name: "legal_status", label: "Legal status", type: "text", value: item.legal_status || "" },
            { name: "order_type", label: "Order type", type: "text", value: item.order_type || "" },
            { name: "order_details", label: "Order details", type: "textarea", full: true, value: item.order_details || "" },
            { name: "delegated_authority_details", label: "Delegated authority details", type: "textarea", full: true, value: item.delegated_authority_details || "" },
            { name: "restrictions_text", label: "Restrictions", type: "textarea", full: true, value: item.restrictions_text || "" },
            { name: "consent_arrangements", label: "Consent arrangements", type: "textarea", full: true, value: item.consent_arrangements || "" },
            { name: "effective_from", label: "Effective from", type: "date", value: item.effective_from || "" },
            { name: "effective_to", label: "Effective to", type: "date", value: item.effective_to || "" },
            { name: "is_current", label: "Current legal status", type: "checkbox", value: !!item.is_current },
          ],
        },
      ],
    };
  }

  if (recordType === "profile_formulation") {
    return {
      title: "Edit formulation",
      subtitle: "How we understand the young person’s needs and behaviour.",
      guidance: "Focus on context, meaning, patterns, what helps and what adults should avoid.",
      prompts: [
        "What is the meaning of behaviour?",
        "What helps most when the young person is distressed?",
      ],
      sections: [
        {
          title: "Formulation",
          fields: [
            { name: "presenting_needs", label: "Presenting needs", type: "textarea", full: true, value: item.presenting_needs || "" },
            { name: "developmental_context", label: "Developmental context", type: "textarea", full: true, value: item.developmental_context || "" },
            { name: "trauma_context", label: "Trauma context", type: "textarea", full: true, value: item.trauma_context || "" },
            { name: "neurodevelopmental_context", label: "Neurodevelopmental context", type: "textarea", full: true, value: item.neurodevelopmental_context || "" },
            { name: "relational_context", label: "Relational context", type: "textarea", full: true, value: item.relational_context || "" },
            { name: "meaning_of_behaviour", label: "Meaning of behaviour", type: "textarea", full: true, value: item.meaning_of_behaviour || "" },
            { name: "known_triggers", label: "Known triggers", type: "textarea", full: true, value: item.known_triggers || "" },
            { name: "early_signs_of_distress", label: "Early signs of distress", type: "textarea", full: true, value: item.early_signs_of_distress || "" },
            { name: "protective_factors", label: "Protective factors", type: "textarea", full: true, value: item.protective_factors || "" },
            { name: "what_helps", label: "What helps", type: "textarea", full: true, value: item.what_helps || "" },
            { name: "what_adults_should_avoid", label: "What adults should avoid", type: "textarea", full: true, value: item.what_adults_should_avoid || "" },
            { name: "regulation_strategies", label: "Regulation strategies", type: "textarea", full: true, value: item.regulation_strategies || "" },
            { name: "child_voice_summary", label: "Child voice summary", type: "textarea", full: true, value: item.child_voice_summary || "" },
            { name: "review_date", label: "Review date", type: "date", value: item.review_date || "" },
            { name: "is_current", label: "Current formulation", type: "checkbox", value: !!item.is_current },
          ],
        },
      ],
    };
  }

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
    state.youngPersonId || "none",
    state.composerRecordType || "none",
    state.composerMode || "create",
    state.composerRecordId || "new",
  ].join(":");
}

function serialiseValue(key, value) {
  if (value === "") return null;

  if (["reminder_minutes_before", "attendance_baseline"].includes(key)) {
    return Number(value);
  }

  return value;
}

function serializeComposerForm() {
  if (!els.composerForm) return {};

  const formData = new FormData(els.composerForm);
  const payload = {};

  els.composerForm.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    payload[checkbox.name] = checkbox.checked;
  });

  for (const [key, value] of formData.entries()) {
    payload[key] = serialiseValue(key, value);
  }

  payload.young_person_id = state.youngPersonId;
  return payload;
}

function saveDraftToLocal() {
  try {
    localStorage.setItem(
      getStorageKey(),
      JSON.stringify({
        saved_at: new Date().toISOString(),
        values: serializeComposerForm(),
      })
    );
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
  if (!draft?.values || !els.composerForm) return;

  Object.entries(draft.values).forEach(([key, value]) => {
    const field = els.composerForm.elements.namedItem(key);
    if (!field) return;

    if (field.type === "checkbox") {
      field.checked = !!value;
      return;
    }

    field.value = value ?? "";
  });
}

function bindComposerAutosave() {
  if (!els.composerForm) return;

  els.composerForm.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      window.clearTimeout(state.autosaveTimer);
      state.autosaveTimer = window.setTimeout(saveDraftToLocal, 500);
    });

    field.addEventListener("change", saveDraftToLocal);
  });
}

export function openComposerFor(recordType, mode = "create", item = null) {
  state.composerMode = mode;
  state.composerRecordType = recordType;
  state.composerRecordId = item?.id || item?.record_id || item?.source_id || null;
  state.composerEditItem = item || {};
  state.composerOpen = true;

  const content = getComposerContent(recordType, item || {});

  if (els.composerTitle) els.composerTitle.textContent = content.title;
  if (els.composerSubtitle) els.composerSubtitle.textContent = content.subtitle;
  if (els.composerGuidanceText) els.composerGuidanceText.textContent = content.guidance;
  if (els.composerPrompts) {
    els.composerPrompts.innerHTML = (content.prompts || [])
      .map((prompt) => `<div class="composer-prompt">${escapeHtml(prompt)}</div>`)
      .join("");
  }
  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = "No AI review run yet.";
  }
  if (els.composerFields) {
    els.composerFields.innerHTML = renderSections(content.sections || []);
  }

  openComposer();
  bindComposerAutosave();

  const draft = loadDraftFromLocal();
  if (draft) hydrateComposerDraft(draft);

  showComposerStatus("Autosave ready");
}

export function buildAiFeedback(type = "clarity") {
  const payload = serializeComposerForm();
  const notes = [];

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

  if (!payload.child_voice && !payload.young_person_voice && !payload.child_voice_summary) {
    notes.push("• Add more of the young person’s voice where appropriate.");
  }

  return notes.join("\n");
}

export async function saveComposer(mode = "draft") {
  const recordType = state.composerRecordType;
  const config = COMPOSER_CONFIG[recordType];

  if (!config) {
    throw new Error(`No composer configuration for ${recordType}`);
  }

  const payload = serializeComposerForm();
  let response;

  if (state.composerMode === "edit" && state.composerRecordId && config.updateUrl) {
    response = await apiSend(
      config.updateUrl(state.composerRecordId),
      config.updateMethod || "PATCH",
      payload
    );
  } else {
    response = await apiSend(
      config.createUrl(state.youngPersonId),
      "POST",
      payload
    );

    const created = unwrapCreateResponse(recordType, response) || response;
    state.composerRecordId = created?.id || state.composerRecordId;
    state.composerMode = "edit";
  }

  if (mode === "submit" && config.submitUrl && state.composerRecordId) {
    await apiSend(config.submitUrl(state.composerRecordId), "POST", {});
  }

  clearDraftFromLocal();
  showComposerStatus(mode === "submit" ? "Submitted" : "Saved");
  closeComposer(true);

  return response;
}
