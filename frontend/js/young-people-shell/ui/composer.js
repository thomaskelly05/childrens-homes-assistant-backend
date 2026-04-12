import { state } from "../state.js";
import { els } from "../dom.js";
import { apiSend, unwrapCreateResponse } from "../core/api.js";
import {
  escapeHtml,
  toDateInputValue,
  toDateTimeLocalValue,
} from "../core/utils.js";
import * as rulesClient from "../core/rules-client.js";
import * as suggestionsUi from "./suggestions.js";

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

  achievement_record: {
    label: "Achievement",
    createUrl: (id) => `/young-people/${id}/achievements`,
    updateUrl: (id) => `/young-people/achievements/${id}`,
    updateMethod: "PATCH",
  },

  safeguarding_record: {
    label: "Safeguarding record",
    createUrl: (id) => `/young-people/${id}/safeguarding-records`,
    updateUrl: (id) => `/young-people/safeguarding-records/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/safeguarding-records/${id}/submit`,
  },

  missing_episode: {
    label: "Missing episode",
    createUrl: (id) => `/young-people/${id}/missing-episodes`,
    updateUrl: (id) => `/young-people/missing-episodes/${id}`,
    updateMethod: "PATCH",
    submitUrl: (id) => `/young-people/missing-episodes/${id}/submit`,
  },

  task: {
    label: "Task",
    createUrl: (id) => `/young-people/${id}/tasks`,
    updateUrl: (id) => `/young-people/tasks/${id}`,
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

function getComposerMeta() {
  if (!state.composerMeta) {
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
    suggestion_metadata: item.suggestion_metadata || item.metadata || {},
  };
}

function getToday() {
  return toDateInputValue(new Date());
}

function getNowLocal() {
  return toDateTimeLocalValue(new Date());
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

  resetComposerMeta();

  if (els.composerFields) els.composerFields.innerHTML = "";
  if (els.composerAiFeedback) {
    els.composerAiFeedback.textContent = "No AI review run yet.";
  }

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

/*
  IMPORTANT:
  PASTE YOUR EXISTING FULL getComposerContent(recordType, item = {}) FUNCTION HERE.
  Use the exact version you already have now.
*/
function getComposerContent(recordType, item = {}) {
  const today = getToday();
  const now = getNowLocal();

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

  if (
    [
      "reminder_minutes_before",
      "attendance_baseline",
      "incident_id",
      "linked_risk_assessment_id",
      "linked_plan_id",
      "linked_target_id",
    ].includes(key)
  ) {
    return Number(value);
  }

  return value;
}

function serializeComposerForm() {
  if (!els.composerForm) return {};

  const formData = new FormData(els.composerForm);
  const payload = {};

  els.composerForm.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    if (checkbox.name) {
      payload[checkbox.name] = checkbox.checked;
    }
  });

  for (const [key, value] of formData.entries()) {
    payload[key] = serialiseValue(key, value);
  }

  payload.young_person_id = state.youngPersonId;

  const meta = getComposerMeta();

  if (meta.source_record_type) payload.source_record_type = meta.source_record_type;
  if (meta.source_record_id !== null && meta.source_record_id !== undefined) {
    payload.source_record_id = meta.source_record_id;
  }
  if (meta.suggestion_id) payload.suggestion_id = meta.suggestion_id;
  if (meta.suggestion_priority) payload.suggestion_priority = meta.suggestion_priority;
  if (meta.suggestion_reason) payload.suggestion_reason = meta.suggestion_reason;
  if (meta.suggestion_record_type) payload.suggestion_record_type = meta.suggestion_record_type;

  return payload;
}

function saveDraftToLocal() {
  try {
    localStorage.setItem(
      getStorageKey(),
      JSON.stringify({
        saved_at: new Date().toISOString(),
        values: serializeComposerForm(),
        meta: getComposerMeta(),
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

  if (draft.meta && typeof draft.meta === "object") {
    state.composerMeta = {
      ...getComposerMeta(),
      ...draft.meta,
    };
  }

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
    young_person_id: savedRecord?.young_person_id || state.youngPersonId || null,
  };
}

async function runSuggestionEngineAfterSave(recordType, savedRecord) {
  if (!recordType || !savedRecord) return [];

  const metadata = buildSuggestionMetadata(recordType, savedRecord);

  const rawSuggestions = rulesClient.evaluateRecordSuggestions(
    {
      ...savedRecord,
      record_type: recordType,
      id: metadata.id,
      source_id: metadata.id,
    },
    {
      recordType,
      metadata,
    }
  );

  const suggestions = rulesClient.mergeSuggestionLists(rawSuggestions);

  state.currentSuggestions = suggestions;
  state.currentSuggestionSource = metadata;
  state.lastSavedRecord = savedRecord;

  if (els.composerAiFeedback) {
    if (suggestions.length) {
      els.composerAiFeedback.textContent = `${suggestions.length} linked suggestion${suggestions.length === 1 ? "" : "s"} ready.`;
    } else {
      els.composerAiFeedback.textContent = "Saved. No AI suggestions triggered.";
    }
  }

  if (!suggestions.length) {
    suggestionsUi.hideSuggestionsPanel();
    return suggestions;
  }

  suggestionsUi.showSuggestionsPanel(suggestions, {
    source_record_type: metadata.source_record_type,
    source_record_id: metadata.source_record_id,
  });

  return suggestions;
}

export function openComposerFor(recordType, mode = "create", item = null) {
  state.composerMode = mode;
  state.composerRecordType = recordType;
  state.composerRecordId = item?.id || item?.record_id || item?.source_id || null;
  state.composerEditItem = item || {};
  state.composerOpen = true;

  setComposerMetaFromItem(item || {});

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
    const meta = getComposerMeta();
    if (meta.source_record_type || meta.source_record_id) {
      els.composerAiFeedback.textContent = `Linked from ${
        meta.source_record_type || "source record"
      }${meta.source_record_id ? ` #${meta.source_record_id}` : ""}.`;
    } else {
      els.composerAiFeedback.textContent = "No AI review run yet.";
    }
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
  let savedRecord;

  if (state.composerMode === "edit" && state.composerRecordId && config.updateUrl) {
    response = await apiSend(
      config.updateUrl(state.composerRecordId),
      config.updateMethod || "PATCH",
      payload
    );

    savedRecord = unwrapSavedRecord(recordType, response);
    state.composerRecordId =
      savedRecord?.id ||
      savedRecord?.record_id ||
      savedRecord?.source_id ||
      state.composerRecordId;
  } else {
    response = await apiSend(
      config.createUrl(state.youngPersonId),
      "POST",
      payload
    );

    savedRecord = unwrapSavedRecord(recordType, response);
    state.composerRecordId =
      savedRecord?.id ||
      savedRecord?.record_id ||
      savedRecord?.source_id ||
      state.composerRecordId;

    state.composerMode = "edit";
  }

  if (mode === "submit" && config.submitUrl && state.composerRecordId) {
    await apiSend(config.submitUrl(state.composerRecordId), "POST", {});
  }

  try {
    await runSuggestionEngineAfterSave(recordType, {
      ...(savedRecord || {}),
      young_person_id:
        savedRecord?.young_person_id ||
        payload.young_person_id ||
        state.youngPersonId,
    });
  } catch (error) {
    console.error("[composer] suggestion trigger failed", error);
    if (els.composerAiFeedback) {
      els.composerAiFeedback.textContent = "Saved, but AI suggestions could not be loaded.";
    }
  }

  clearDraftFromLocal();
  showComposerStatus(mode === "submit" ? "Submitted" : "Saved");
  closeComposer(true);

  return response;
}