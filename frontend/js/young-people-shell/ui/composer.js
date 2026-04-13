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

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentHomeId() {
  return state.homeId || state.currentUser?.home_id || null;
}

function getScopeEntityId() {
  if (getCurrentScope() === "child") return state.youngPersonId || null;
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
  ];

  return homeScopedTypes.includes(recordType);
}

function buildScopePath(basePath = "") {
  const scope = getCurrentScope();
  const entityId = getScopeEntityId();

  if (scope === "child") {
    return basePath.replace("{scope}", "young-people").replace("{id}", String(entityId || ""));
  }

  return basePath.replace("{scope}", "homes").replace("{id}", String(entityId || ""));
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
    createUrl: () =>
      getCurrentScope() === "child"
        ? buildScopePath("/{scope}/{id}/risks")
        : buildScopePath("/{scope}/{id}/risks"),
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
    createUrl: () =>
      getCurrentScope() === "child"
        ? buildScopePath("/{scope}/{id}/appointments")
        : buildScopePath("/{scope}/{id}/appointments"),
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
    createUrl: () =>
      getCurrentScope() === "child"
        ? buildScopePath("/{scope}/{id}/tasks")
        : buildScopePath("/{scope}/{id}/tasks"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/tasks/${id}`
        : `/homes/tasks/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  document: {
    label: "Document",
    createUrl: () =>
      getCurrentScope() === "child"
        ? buildScopePath("/{scope}/{id}/documents")
        : buildScopePath("/{scope}/{id}/documents"),
    updateUrl: (id) =>
      getCurrentScope() === "child"
        ? `/young-people/documents/${id}`
        : `/homes/documents/${id}`,
    updateMethod: "PATCH",
    scopes: ["child", "home", "quality"],
  },

  communication: {
    label: "Professional communication",
    createUrl: () =>
      getCurrentScope() === "child"
        ? buildScopePath("/{scope}/{id}/communications")
        : buildScopePath("/{scope}/{id}/communications"),
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

  const scopes = config.scopes || ["child"];
  return scopes.includes(getCurrentScope());
}

function showComposerStatus(message) {
  if (els.composerAutosaveStatus) {
    els.composerAutosaveStatus.textContent = message || "Ready";
  }
}

function getComposerMeta() {
  if (!state.composerMeta) state.composerMeta = {};
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

function isSingletonComposerRecord(recordType) {
  return !!COMPOSER_CONFIG[recordType]?.singleton;
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

/**
 * Keep your original child record builders intact,
 * then add scoped manager/RI builders below.
 */
function getComposerContent(recordType, item = {}) {
  const today = getToday();
  const now = getNowLocal();
  const scope = getCurrentScope();

  if (recordType === "document") {
    return {
      title: item?.id ? "Edit document record" : "Upload document",
      subtitle:
        scope === "child"
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
        {
          title: "Document details",
          fields: [
            { name: "title", label: "Title", type: "text", value: item.title || "" },
            { name: "document_type", label: "Document type", type: "text", value: item.document_type || "" },
            { name: "category", label: "Category", type: "text", value: item.category || "" },
            { name: "review_date", label: "Review date", type: "date", value: item.review_date || "" },
            { name: "status", label: "Status", type: "text", value: item.status || "active" },
            { name: "file_name", label: "File name / reference", type: "text", value: item.file_name || "" },
          ],
        },
        {
          title: "Document notes",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "notes", label: "Notes", type: "textarea", full: true, value: item.notes || "" },
            { name: "important_actions", label: "Important actions", type: "textarea", full: true, value: item.important_actions || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "communication") {
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
        {
          title: "Communication details",
          fields: [
            { name: "contact_datetime", label: "Date and time", type: "datetime-local", value: toDateTimeLocalValue(item.contact_datetime) || now },
            { name: "contact_type", label: "Contact type", type: "text", value: item.contact_type || "" },
            { name: "contact_person", label: "Contact person", type: "text", value: item.contact_person || "" },
            { name: "organisation", label: "Organisation", type: "text", value: item.organisation || "" },
            { name: "role", label: "Role", type: "text", value: item.role || "" },
            { name: "direction", label: "Direction", type: "text", value: item.direction || "" },
          ],
        },
        {
          title: "Communication summary",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "decisions", label: "Decisions", type: "textarea", full: true, value: item.decisions || "" },
            { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item.actions_required || "" },
            { name: "follow_up_required", label: "Follow-up required", type: "checkbox", value: !!item.follow_up_required },
          ],
        },
      ],
    };
  }

  if (recordType === "therapy") {
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
        {
          title: "Therapeutic input",
          fields: [
            { name: "session_date", label: "Session date", type: "date", value: item.session_date || today },
            { name: "service_name", label: "Service name", type: "text", value: item.service_name || "" },
            { name: "professional_name", label: "Professional name", type: "text", value: item.professional_name || "" },
            { name: "intervention_type", label: "Intervention type", type: "text", value: item.intervention_type || "" },
          ],
        },
        {
          title: "Clinical summary",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "recommendations", label: "Recommendations", type: "textarea", full: true, value: item.recommendations || "" },
            { name: "staff_guidance", label: "Guidance for staff", type: "textarea", full: true, value: item.staff_guidance || "" },
            { name: "next_steps", label: "Next steps", type: "textarea", full: true, value: item.next_steps || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "team") {
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
        {
          title: "Team update",
          fields: [
            { name: "record_date", label: "Date", type: "date", value: item.record_date || today },
            { name: "update_type", label: "Update type", type: "text", value: item.update_type || "" },
            { name: "shift", label: "Shift / period", type: "text", value: item.shift || "" },
            { name: "staff_member", label: "Staff member", type: "text", value: item.staff_member || "" },
          ],
        },
        {
          title: "Operational context",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "impact", label: "Impact", type: "textarea", full: true, value: item.impact || "" },
            { name: "actions_required", label: "Actions required", type: "textarea", full: true, value: item.actions_required || "" },
          ],
        },
      ],
    };
  }

  if (recordType === "supervision") {
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
        {
          title: "Supervision details",
          fields: [
            { name: "session_date", label: "Session date", type: "date", value: item.session_date || today },
            { name: "staff_member", label: "Staff member", type: "text", value: item.staff_member || "" },
            { name: "supervisor", label: "Supervisor", type: "text", value: item.supervisor || "" },
            { name: "supervision_type", label: "Supervision type", type: "text", value: item.supervision_type || "" },
          ],
        },
        {
          title: "Discussion and outcomes",
          fields: [
            { name: "summary", label: "Summary", type: "textarea", full: true, value: item.summary || "" },
            { name: "strengths", label: "Strengths", type: "textarea", full: true, value: item.strengths || "" },
            { name: "development_needs", label: "Development needs", type: "textarea", full: true, value: item.development_needs || "" },
            { name: "actions_agreed", label: "Actions agreed", type: "textarea", full: true, value: item.actions_agreed || "" },
          ],
        },
      ],
    };
  }

  // ---------- KEEP EXISTING CHILD BUILDERS ----------
  // Replace this comment block with your existing large child-scope builders
  // for:
  // daily_note, incident, support_plan, risk, health_record,
  // education_record, family_contact, keywork, appointment,
  // achievement_record, task, safeguarding_record, missing_episode,
  // profile_identity, profile_communication, profile_education,
  // profile_health, profile_legal, profile_formulation

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
    ].includes(key)
  ) {
    return value === "" ? null : Number(value);
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

  if (getCurrentScope() === "child") {
    payload.young_person_id = state.youngPersonId;
  } else {
    payload.home_id = getCurrentHomeId();
    payload.scope = getCurrentScope();
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

let autosaveBoundForKey = "";

function bindComposerAutosave() {
  if (!els.composerForm) return;

  const storageKey = getStorageKey();
  if (autosaveBoundForKey === storageKey) return;
  autosaveBoundForKey = storageKey;

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
    young_person_id:
      getCurrentScope() === "child"
        ? savedRecord?.young_person_id || state.youngPersonId || null
        : null,
    home_id:
      getCurrentScope() !== "child"
        ? savedRecord?.home_id || getCurrentHomeId() || null
        : null,
    scope: getCurrentScope(),
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
    scope: metadata.scope,
  });

  return suggestions;
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
    response = await apiSend(
      config.updateUrl(),
      config.updateMethod || config.createMethod || "PUT",
      payload
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
      config.createUrl(),
      config.createMethod || "POST",
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
        getCurrentScope() === "child"
          ? savedRecord?.young_person_id || payload.young_person_id || state.youngPersonId
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
  showComposerStatus(mode === "submit" ? "Submitted" : "Saved");
  closeComposer(true);

  return response;
}
