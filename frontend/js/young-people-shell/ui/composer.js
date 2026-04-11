import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend } from "../core/api.js";
import { escapeHtml, toDateInputValue, toDateTimeLocalValue } from "../core/utils.js";

const RECORD_CONFIG = {
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
  appointment: {
    label: "Appointment",
    createUrl: (id) => `/young-people/${id}/appointments`,
    updateUrl: (id) => `/young-people/appointments/${id}`,
    updateMethod: "PATCH",
  },
};

let autosaveTimer = null;

function unwrapCreateResponse(recordType, response) {
  if (!response || typeof response !== "object") return null;

  const map = {
    daily_note: response.daily_note,
    incident: response.incident,
    support_plan: response.support_plan || response.plan,
    appointment: response.appointment,
  };

  return map[recordType] || response;
}

function getComposerStorageKey() {
  return [
    "yp-composer",
    state.youngPersonId || "none",
    state.composerRecordType || "none",
    state.composerMode || "create",
    state.composerRecordId || "new",
  ].join(":");
}

function clearAutosaveTimer() {
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function setAutosaveStatus(text) {
  if (els.composerAutosaveStatus) {
    els.composerAutosaveStatus.textContent = text || "";
  }
}

function loadDraftFromLocal() {
  try {
    const raw = localStorage.getItem(getComposerStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraftFromLocal() {
  try {
    localStorage.removeItem(getComposerStorageKey());
  } catch {}
}

function serialiseValue(key, value) {
  if (value === "") return null;

  if (["linked_plan_id", "reminder_minutes_before", "physical_intervention_duration_minutes"].includes(key)) {
    return Number(value);
  }

  if (["physical_intervention_used", "body_map_required", "external_notification_required"].includes(key)) {
    return value === "on";
  }

  return value;
}

export function serializeComposerForm() {
  const formData = new FormData(els.recordComposerForm);
  const obj = {};

  const checkboxNames = [
    "physical_intervention_used",
    "body_map_required",
    "external_notification_required",
  ];

  for (const name of checkboxNames) {
    obj[name] = false;
  }

  for (const [key, value] of formData.entries()) {
    obj[key] = serialiseValue(key, value);
  }

  obj.young_person_id = state.youngPersonId;
  return obj;
}

function saveDraftToLocal() {
  try {
    if (!state.composerOpen || !els.recordComposerForm) return;

    const payload = serializeComposerForm();
    localStorage.setItem(
      getComposerStorageKey(),
      JSON.stringify({
        saved_at: new Date().toISOString(),
        values: payload,
      })
    );

    setAutosaveStatus(
      `Autosaved ${new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    );
  } catch {
    setAutosaveStatus("Autosave unavailable");
  }
}

function scheduleAutosave() {
  clearAutosaveTimer();
  autosaveTimer = window.setTimeout(saveDraftToLocal, 500);
}

function hydrateComposerDraft(draft) {
  if (!draft?.values || !els.recordComposerForm) return;

  Object.entries(draft.values).forEach(([key, value]) => {
    const field = els.recordComposerForm.elements.namedItem(key);
    if (!field) return;

    if (field instanceof RadioNodeList) return;

    if (field.type === "checkbox") {
      field.checked = !!value;
      return;
    }

    if (value !== null && value !== undefined) {
      field.value = value;
    }
  });
}

function buildFormField(field) {
  const label = `<label class="form-label" for="${field.name}">${escapeHtml(field.label)}</label>`;

  if (field.type === "textarea") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        ${label}
        <textarea
          id="${field.name}"
          name="${field.name}"
          class="textarea-input autosave-field"
        >${escapeHtml(field.value || "")}</textarea>
      </div>
    `;
  }

  if (field.type === "select") {
    return `
      <div class="composer-field ${field.full ? "full" : ""}">
        ${label}
        <select id="${field.name}" name="${field.name}" class="select-input autosave-field">
          ${(field.options || [])
            .map(
              (opt) => `
                <option value="${escapeHtml(opt.value)}" ${
                String(opt.value) === String(field.value || "") ? "selected" : ""
              }>
                  ${escapeHtml(opt.label)}
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
        <label class="checkbox-row" for="${field.name}">
          <input
            id="${field.name}"
            name="${field.name}"
            type="checkbox"
            class="autosave-field"
            ${field.value ? "checked" : ""}
          />
          <span>${escapeHtml(field.label)}</span>
        </label>
      </div>
    `;
  }

  return `
    <div class="composer-field ${field.full ? "full" : ""}">
      ${label}
      <input
        id="${field.name}"
        name="${field.name}"
        type="${field.type || "text"}"
        class="text-input autosave-field"
        value="${escapeHtml(field.value || "")}"
      />
    </div>
  `;
}

function renderComposerSections(content) {
  return (content.sections || [])
    .map(
      (section) => `
        <section class="composer-section">
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.subtitle || "")}</p>
          <div class="composer-grid">
            ${(section.fields || []).map(buildFormField).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function getComposerContent(recordType, item = null) {
  const today = toDateInputValue(new Date());

  if (recordType === "daily_note") {
    return {
      title: item ? "Update daily reflection" : "New daily reflection",
      subtitle: "Record the day in a calm, child-centred and trauma-informed way.",
      guidance:
        "Describe what the young person may have been communicating, what helped, what strengths were shown, and what adults need to hold in mind next.",
      prompts: [
        "What was the young person showing us through behaviour, language or presentation?",
        "What helped them feel safer, calmer or more connected?",
        "What positives, progress or strengths should be noticed?",
        "What do adults need to do next?",
      ],
      sections: [
        {
          title: "Day details",
          subtitle: "Start with the basic context.",
          fields: [
            { name: "title", label: "Title", type: "text", value: item?.title || "" },
            { name: "note_date", label: "Date", type: "date", value: item?.note_date || today },
            {
              name: "shift_type",
              label: "Part of day",
              type: "select",
              value: item?.shift_type || "day",
              options: [
                { value: "day", label: "Day" },
                { value: "evening", label: "Evening" },
                { value: "night", label: "Night" },
                { value: "waking_night", label: "Waking night" },
              ],
            },
            {
              name: "mood",
              label: "Presentation and mood",
              type: "text",
              value: item?.mood || "",
            },
          ],
        },
        {
          title: "What happened",
          subtitle: "Describe the day clearly and supportively.",
          fields: [
            {
              name: "presentation",
              label: "Presentation",
              type: "textarea",
              full: true,
              value: item?.presentation || "",
            },
            {
              name: "activities",
              label: "Activities and engagement",
              type: "textarea",
              full: true,
              value: item?.activities || "",
            },
            {
              name: "behaviour_update",
              label: "Behaviour and communication",
              type: "textarea",
              full: true,
              value: item?.behaviour_update || "",
            },
            {
              name: "education_update",
              label: "Learning update",
              type: "textarea",
              full: true,
              value: item?.education_update || "",
            },
            {
              name: "health_update",
              label: "Health and wellbeing update",
              type: "textarea",
              full: true,
              value: item?.health_update || "",
            },
            {
              name: "family_update",
              label: "Relationship and family update",
              type: "textarea",
              full: true,
              value: item?.family_update || "",
            },
          ],
        },
        {
          title: "Voice and next steps",
          subtitle: "Keep the young person visible in the record.",
          fields: [
            {
              name: "young_person_voice",
              label: "Young person voice",
              type: "textarea",
              full: true,
              value: item?.young_person_voice || item?.child_voice || "",
            },
            {
              name: "positives",
              label: "Strengths and positives",
              type: "textarea",
              full: true,
              value: item?.positives || "",
            },
            {
              name: "actions_required",
              label: "What adults need to do next",
              type: "textarea",
              full: true,
              value: item?.actions_required || "",
            },
          ],
        },
      ],
    };
  }

  if (recordType === "incident") {
    return {
      title: item ? "Update significant event" : "New significant event",
      subtitle: "Record what happened with clarity, compassion and safeguarding awareness.",
      guidance:
        "Keep to observed facts, likely meaning, what adults did, what helped reduce distress, the young person’s voice, and what follow-up is needed.",
      prompts: [
        "What may the young person have been communicating?",
        "What were the earliest signs adults noticed?",
        "What helped, reduced distress or supported safety?",
        "What learning or follow-up is needed now?",
      ],
      sections: [
        {
          title: "Event details",
          subtitle: "Start with the basics.",
          fields: [
            {
              name: "incident_datetime",
              label: "Date and time",
              type: "datetime-local",
              value: item?.incident_datetime ? String(item.incident_datetime).slice(0, 16) : "",
            },
            {
              name: "incident_type",
              label: "Type of event",
              type: "text",
              value: item?.incident_type || "",
            },
            { name: "location", label: "Location", type: "text", value: item?.location || "" },
            {
              name: "severity",
              label: "Level of concern",
              type: "select",
              value: item?.severity || "medium",
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
          title: "Context and response",
          subtitle: "Describe what happened and how adults responded.",
          fields: [
            {
              name: "antecedent",
              label: "What led up to this",
              type: "textarea",
              full: true,
              value: item?.antecedent || "",
            },
            {
              name: "description",
              label: "What happened",
              type: "textarea",
              full: true,
              value: item?.description || "",
            },
            {
              name: "staff_response",
              label: "What adults did",
              type: "textarea",
              full: true,
              value: item?.staff_response || "",
            },
            {
              name: "outcome",
              label: "Outcome",
              type: "textarea",
              full: true,
              value: item?.outcome || "",
            },
          ],
        },
        {
          title: "Meaning and follow-up",
          subtitle: "Keep it reflective and child-centred.",
          fields: [
            {
              name: "trauma_informed_formulation",
              label: "Reflective understanding",
              type: "textarea",
              full: true,
              value: item?.trauma_informed_formulation || "",
            },
            {
              name: "child_voice",
              label: "Young person voice",
              type: "textarea",
              full: true,
              value: item?.child_voice || "",
            },
            {
              name: "restorative_follow_up",
              label: "Repair and reflection",
              type: "textarea",
              full: true,
              value: item?.restorative_follow_up || "",
            },
            {
              name: "follow_up_required",
              label: "What happens next",
              type: "textarea",
              full: true,
              value: item?.follow_up_required || "",
            },
          ],
        },
      ],
    };
  }

  if (recordType === "risk") {
    return {
      title: item ? "Update support and safety guidance" : "New support and safety guidance",
      subtitle: "Build practical guidance that helps adults respond consistently and kindly.",
      guidance:
        "Focus on patterns, known triggers, early signs, what helps, and what adults should do to reduce distress and support safety.",
      prompts: [
        "What is the underlying need adults need to understand?",
        "What are the early signs or triggers?",
        "What helps this young person most?",
        "What should adults do in practice?",
      ],
      sections: [
        {
          title: "Guidance overview",
          subtitle: "Set out the main area of concern.",
          fields: [
            { name: "category", label: "Area", type: "text", value: item?.category || "" },
            { name: "title", label: "Title", type: "text", value: item?.title || "" },
            {
              name: "review_date",
              label: "Review date",
              type: "date",
              value: item?.review_date || today,
            },
          ],
        },
        {
          title: "Understanding what is happening",
          subtitle: "Help adults understand the pattern.",
          fields: [
            {
              name: "concern_summary",
              label: "Summary",
              type: "textarea",
              full: true,
              value: item?.concern_summary || "",
            },
            {
              name: "known_triggers",
              label: "Known triggers",
              type: "textarea",
              full: true,
              value: item?.known_triggers || "",
            },
            {
              name: "early_warning_signs",
              label: "Early signs",
              type: "textarea",
              full: true,
              value: item?.early_warning_signs || "",
            },
            {
              name: "contextual_factors",
              label: "Contextual factors",
              type: "textarea",
              full: true,
              value: item?.contextual_factors || "",
            },
          ],
        },
        {
          title: "What helps",
          subtitle: "Keep this practical and useful.",
          fields: [
            {
              name: "current_controls",
              label: "What already helps",
              type: "textarea",
              full: true,
              value: item?.current_controls || "",
            },
            {
              name: "deescalation_strategies",
              label: "Co-regulation and calming strategies",
              type: "textarea",
              full: true,
              value: item?.deescalation_strategies || "",
            },
            {
              name: "child_views",
              label: "Young person views",
              type: "textarea",
              full: true,
              value: item?.child_views || "",
            },
            {
              name: "response_actions",
              label: "What adults should do",
              type: "textarea",
              full: true,
              value: item?.response_actions || "",
            },
          ],
        },
      ],
    };
  }

  if (recordType === "appointment") {
    return {
      title: item ? "Update appointment" : "New appointment",
      subtitle: "Record the appointment clearly, including support needed before and after.",
      guidance:
        "Show the purpose of the appointment, how the young person feels about it, what support is needed, and any follow-up.",
      prompts: [
        "What is the purpose of this appointment?",
        "How does the young person feel about it?",
        "What preparation or support is needed?",
        "What follow-up is needed afterwards?",
      ],
      sections: [
        {
          title: "Appointment details",
          subtitle: "Set out the practical information clearly.",
          fields: [
            { name: "title", label: "Title", type: "text", value: item?.title || "" },
            {
              name: "appointment_type",
              label: "Type",
              type: "text",
              value: item?.appointment_type || "",
            },
            {
              name: "appointment_date",
              label: "Date and time",
              type: "datetime-local",
              value: item?.appointment_date ? toDateTimeLocalValue(item.appointment_date) : "",
            },
            {
              name: "end_datetime",
              label: "End time",
              type: "datetime-local",
              value: item?.end_datetime ? toDateTimeLocalValue(item.end_datetime) : "",
            },
            { name: "location", label: "Location", type: "text", value: item?.location || "" },
            {
              name: "professional_name",
              label: "Professional name",
              type: "text",
              value: item?.professional_name || "",
            },
            {
              name: "professional_role",
              label: "Professional role",
              type: "text",
              value: item?.professional_role || "",
            },
          ],
        },
        {
          title: "Purpose and support",
          subtitle: "Help adults understand the meaning and support needed.",
          fields: [
            {
              name: "purpose",
              label: "Purpose",
              type: "textarea",
              full: true,
              value: item?.purpose || "",
            },
            {
              name: "summary",
              label: "Summary",
              type: "textarea",
              full: true,
              value: item?.summary || "",
            },
            {
              name: "child_voice",
              label: "Young person voice",
              type: "textarea",
              full: true,
              value: item?.child_voice || "",
            },
            {
              name: "preparation_notes",
              label: "Preparation notes",
              type: "textarea",
              full: true,
              value: item?.preparation_notes || "",
            },
          ],
        },
        {
          title: "Follow-up",
          subtitle: "Record outcomes and next steps.",
          fields: [
            {
              name: "outcome_notes",
              label: "Outcome notes",
              type: "textarea",
              full: true,
              value: item?.outcome_notes || "",
            },
            {
              name: "follow_up_actions",
              label: "Follow-up actions",
              type: "textarea",
              full: true,
              value: item?.follow_up_actions || "",
            },
            {
              name: "reminder_minutes_before",
              label: "Reminder minutes before",
              type: "number",
              value: item?.reminder_minutes_before ?? 30,
            },
          ],
        },
      ],
    };
  }

  return {
    title: item ? "Update support plan" : "New support plan",
    subtitle: "Create practical support guidance around the young person’s needs and strengths.",
    guidance:
      "Write with warmth, clarity and purpose. Reflect the young person’s voice, what helps, what adults should do consistently, and the outcomes being worked towards.",
    prompts: [
      "What need are adults trying to understand better?",
      "What helps this young person feel safe, connected and understood?",
      "What should adults do consistently?",
      "How is the young person’s voice reflected here?",
    ],
    sections: [
      {
        title: "Plan overview",
        subtitle: "Core information.",
        fields: [
          { name: "title", label: "Title", type: "text", value: item?.title || "" },
          {
            name: "plan_type",
            label: "Plan type",
            type: "text",
            value: item?.plan_type || "support_plan",
          },
          { name: "start_date", label: "Start date", type: "date", value: item?.start_date || today },
          {
            name: "review_date",
            label: "Review date",
            type: "date",
            value: item?.review_date || today,
          },
        ],
      },
      {
        title: "Understanding the need",
        subtitle: "Describe the need and formulation.",
        fields: [
          {
            name: "presenting_need",
            label: "Need being addressed",
            type: "textarea",
            full: true,
            value: item?.presenting_need || "",
          },
          { name: "summary", label: "Summary", type: "textarea", full: true, value: item?.summary || "" },
          {
            name: "child_voice",
            label: "Young person voice",
            type: "textarea",
            full: true,
            value: item?.child_voice || "",
          },
          {
            name: "formulation",
            label: "Reflective understanding",
            type: "textarea",
            full: true,
            value: item?.formulation || "",
          },
        ],
      },
      {
        title: "Guidance for adults",
        subtitle: "Be clear, kind and practical.",
        fields: [
          {
            name: "proactive_strategies",
            label: "Proactive strategies",
            type: "textarea",
            full: true,
            value: item?.proactive_strategies || "",
          },
          {
            name: "triggers",
            label: "Known triggers",
            type: "textarea",
            full: true,
            value: item?.triggers || "",
          },
          {
            name: "protective_factors",
            label: "Protective factors",
            type: "textarea",
            full: true,
            value: item?.protective_factors || "",
          },
          {
            name: "staff_guidance",
            label: "What adults should do",
            type: "textarea",
            full: true,
            value: item?.staff_guidance || "",
          },
        ],
      },
    ],
  };
}

export function buildAiFeedback(type) {
  const form = serializeComposerForm();
  const notes = [];

  if (type === "grammar") {
    notes.push("Writing review:");
    notes.push("• Shorten long sentences where needed.");
    notes.push("• Keep wording calm, clear and professional.");
    notes.push("• Remove repeated wording and make times precise.");
  }

  if (type === "clarity") {
    notes.push("Clarity review:");
    notes.push("• Make the order of events easy to follow.");
    notes.push("• Separate facts, reflection and next steps.");
    notes.push("• Use plain language that another adult can quickly understand.");
  }

  if (type === "safeguarding") {
    notes.push("Safeguarding review:");
    notes.push("• Check whether the record shows risk, response and follow-up clearly.");
    notes.push("• Consider whether anyone else needs to be informed.");
    notes.push("• Make sure the next action is explicit.");
  }

  if (type === "child_voice") {
    notes.push("Young person voice review:");
    notes.push("• Check whether the young person’s views, feelings or communication are visible.");
    notes.push("• If communication was non-verbal, describe how it was shown.");
    notes.push("• Show how adults responded to that communication.");
  }

  if (!form.child_voice && !form.young_person_voice && type !== "grammar") {
    notes.push("");
    notes.push("Prompt:");
    notes.push("• This draft may need more of the young person’s voice.");
  }

  if (!form.actions_required && !form.response_actions && !form.follow_up_actions && type !== "grammar") {
    notes.push("• Add clearer next steps for adults.");
  }

  return notes.join("\n");
}

export function openComposer() {
  state.composerOpen = true;
  els.recordComposerPage?.classList.remove("hidden");
  els.recordComposerPage?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function closeComposer(clearDraft = false) {
  state.composerOpen = false;
  state.composerMode = "create";
  state.composerRecordType = null;
  state.composerRecordId = null;
  state.composerEditItem = null;

  clearAutosaveTimer();

  if (clearDraft) {
    clearDraftFromLocal();
  }

  els.recordComposerPage?.classList.add("hidden");
  els.recordComposerPage?.setAttribute("aria-hidden", "true");

  if (els.recordComposerFields) {
    els.recordComposerFields.innerHTML = "";
  }
  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = "No AI review run yet.";
  }
  setAutosaveStatus("");
  document.body.style.overflow = "";
}

export function openComposerFor(recordType, mode = "create", item = null) {
  state.composerMode = mode;
  state.composerRecordType = recordType;
  state.composerRecordId = item?.id || item?.record_id || item?.source_id || null;
  state.composerEditItem = item || null;

  const content = getComposerContent(recordType, item);

  if (els.composerTitle) {
    els.composerTitle.textContent = content.title;
  }
  if (els.composerSubtitle) {
    els.composerSubtitle.textContent = content.subtitle;
  }
  if (els.composerGuidanceText) {
    els.composerGuidanceText.textContent = content.guidance;
  }
  if (els.composerPrompts) {
    els.composerPrompts.innerHTML = (content.prompts || [])
      .map((prompt) => `<div class="composer-prompt">${escapeHtml(prompt)}</div>`)
      .join("");
  }
  if (els.recordComposerFields) {
    els.recordComposerFields.innerHTML = renderComposerSections(content);
  }
  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = "No AI review run yet.";
  }

  openComposer();
  bindComposerAutosave();

  const draft = loadDraftFromLocal();
  if (draft) {
    hydrateComposerDraft(draft);
    setAutosaveStatus("Restored autosaved draft");
  }
}

export async function saveComposer(mode = "draft") {
  const recordType = state.composerRecordType;
  const config = RECORD_CONFIG[recordType];

  if (!config) {
    throw new Error("This record type is not configured.");
  }

  const payload = serializeComposerForm();

  if (mode === "submit" && recordType !== "appointment") {
    if (!state.composerRecordId) {
      const createdResponse = await apiSend(config.createUrl(state.youngPersonId), "POST", payload);
      const created = unwrapCreateResponse(recordType, createdResponse);
      state.composerRecordId = created?.id || created?.record_id || state.composerRecordId;
    } else {
      await apiSend(config.updateUrl(state.composerRecordId), config.updateMethod || "PATCH", payload);
    }

    await apiSend(config.submitUrl(state.composerRecordId), "POST", {});
    clearDraftFromLocal();
    return { submitted: true, label: config.label };
  }

  if (state.composerMode === "edit" && state.composerRecordId) {
    await apiSend(config.updateUrl(state.composerRecordId), config.updateMethod || "PATCH", payload);
    clearDraftFromLocal();
    return { updated: true, label: config.label };
  }

  const createdResponse = await apiSend(config.createUrl(state.youngPersonId), "POST", payload);
  const created = unwrapCreateResponse(recordType, createdResponse);
  state.composerRecordId = created?.id || created?.record_id || state.composerRecordId;
  state.composerMode = "edit";
  clearDraftFromLocal();

  return { created: true, label: config.label };
}

export function bindComposerAutosave() {
  if (!els.recordComposerForm) return;

  els.recordComposerForm.querySelectorAll(".autosave-field").forEach((field) => {
    field.addEventListener("input", scheduleAutosave);
    field.addEventListener("change", saveDraftToLocal);
  });
}

export function bindComposerEvents({ onSaved } = {}) {
  els.closeComposerBtn?.addEventListener("click", () => closeComposer(false));

  els.composerSaveDraftBtn?.addEventListener("click", async () => {
    const result = await saveComposer("draft");
    await onSaved?.(result);
  });

  els.composerSubmitBtn?.addEventListener("click", async () => {
    const result = await saveComposer("submit");
    closeComposer(true);
    await onSaved?.(result);
  });

  els.composerCheckBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
  });

  els.composerGrammarBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("grammar");
    }
  });

  els.composerClarityBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("clarity");
    }
  });

  els.composerSafeguardingBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("safeguarding");
    }
  });

  els.composerChildVoiceBtn?.addEventListener("click", () => {
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = buildAiFeedback("child_voice");
    }
  });
}
