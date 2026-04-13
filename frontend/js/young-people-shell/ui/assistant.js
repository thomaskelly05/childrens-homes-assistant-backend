import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { apiStreamAssistant } from "../core/api.js";

let assistantEventsBound = false;
let assistantPromptDelegatesBound = false;

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getSelectedYoungPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getFullYoungPersonName() {
  const person = getSelectedYoungPerson() || {};

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    person.full_name ||
    person.name ||
    "Young person"
  );
}

function getHomeName() {
  const person = getSelectedYoungPerson() || {};
  return (
    person.home_name ||
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

function getScopeLabel() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home assistant";
  if (scope === "quality") return "Quality assistant";
  return "Young person assistant";
}

function getSectionLabel() {
  return String(getCurrentSection() || "workspace")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function getAssistantScopeType() {
  const scope = getCurrentScope();

  if (scope === "home") return "home";
  if (scope === "quality") return "quality";
  return state.youngPersonId ? "young_person" : "global";
}

function hasYoungPersonContext() {
  return Boolean(state.youngPersonId && getSelectedYoungPerson());
}

function ensureAssistantState() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }

  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = {
      sources: [],
      runtime: {},
      explainability: {},
      assistant_scope: {},
      assistant_context: {},
      suggested_actions: [],
    };
  }
}

export function openAssistant() {
  updateAssistantContext();
  renderAssistantInsights();
  renderAssistantMessages();

  els.assistantModal?.classList.remove("hidden");
  els.assistantBackdrop?.classList.remove("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "false");

  state.assistantOpen = true;
}

export function closeAssistant() {
  els.assistantModal?.classList.add("hidden");
  els.assistantBackdrop?.classList.add("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "true");

  state.assistantOpen = false;
}

function updateAssistantScopeDataset() {
  if (!els.app) return;

  const person = getSelectedYoungPerson() || {};
  const scopeType = getAssistantScopeType();

  els.app.dataset.assistantScopeType = scopeType;
  els.app.dataset.youngPersonId =
    getCurrentScope() === "child" && state.youngPersonId
      ? String(state.youngPersonId)
      : "";
  els.app.dataset.homeId =
    state.homeId != null
      ? String(state.homeId)
      : person.home_id != null
      ? String(person.home_id)
      : "";
}

function renderAssistantScopeBadges() {
  const scope = getCurrentScope();
  const homeText = getHomeName();
  const childText = hasYoungPersonContext() ? getFullYoungPersonName() : "";
  const sectionText = getSectionLabel();

  if (els.scopeBadge) {
    els.scopeBadge.textContent = getScopeLabel();
  }

  if (els.scopeHomeBadge) {
    if (scope === "home" || scope === "quality" || homeText) {
      els.scopeHomeBadge.textContent = homeText;
      els.scopeHomeBadge.classList.remove("hidden");
    } else {
      els.scopeHomeBadge.textContent = "";
      els.scopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.scopeChildBadge) {
    if (scope === "child" && childText) {
      els.scopeChildBadge.textContent = childText;
      els.scopeChildBadge.classList.remove("hidden");
    } else {
      els.scopeChildBadge.textContent = "";
      els.scopeChildBadge.classList.add("hidden");
    }
  }

  if (els.scopeShiftBadge) {
    if (sectionText) {
      els.scopeShiftBadge.textContent = sectionText;
      els.scopeShiftBadge.classList.remove("hidden");
    } else {
      els.scopeShiftBadge.textContent = "";
      els.scopeShiftBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeHomeBadge) {
    if (scope === "home" || scope === "quality" || homeText) {
      els.modalScopeHomeBadge.textContent = homeText;
      els.modalScopeHomeBadge.classList.remove("hidden");
    } else {
      els.modalScopeHomeBadge.textContent = "";
      els.modalScopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeChildBadge) {
    if (scope === "child" && childText) {
      els.modalScopeChildBadge.textContent = childText;
      els.modalScopeChildBadge.classList.remove("hidden");
    } else {
      els.modalScopeChildBadge.textContent = "";
      els.modalScopeChildBadge.classList.add("hidden");
    }
  }
}

function assistantPromptsForView(view, scope = getCurrentScope()) {
  const childMap = {
    workspace: [
      "Give me a 6 month summary for this young person.",
      "What matters most right now?",
      "Draft a short handover for the next shift.",
    ],
    overview: [
      "What matters most right now?",
      "Summarise the key themes today.",
      "What should staff prioritise next?",
    ],
    profile: [
      "Summarise this young person’s needs and what helps.",
      "What should adults hold in mind day to day?",
      "What are the most important communication needs?",
    ],
    timeline: [
      "Create a short chronology summary.",
      "What are the key turning points recently?",
      "What patterns can you see across incidents and presentation?",
    ],
    handover: [
      "Give me a short handover for this young person.",
      "What does the next shift most need to know?",
      "What follow-up should the next shift complete?",
    ],
    health: [
      "Summarise current health and wellbeing needs.",
      "What follow-up is needed from recent health records?",
      "What are the main health themes recently?",
    ],
    education: [
      "Summarise education themes and needs.",
      "What helps this young person engage with learning?",
      "What are the current school concerns and strengths?",
    ],
    family: [
      "Summarise key relationship and family themes.",
      "What should adults hold in mind around contact?",
      "What patterns can you see around family contact?",
    ],
    calendar: [
      "What is the next appointment?",
      "What appointments need preparing for?",
      "What follow-up is due from recent appointments?",
    ],
    readiness: [
      "What is overdue or due soon?",
      "What should be completed next?",
      "Summarise the open actions for this young person.",
    ],
    manager: [
      "What needs manager review right now?",
      "What themes should leadership notice?",
      "What risks or compliance issues need oversight?",
    ],
    reports: [
      "Give me a 6 month summary for this young person.",
      "What are the strongest themes across the record?",
      "Draft a professional summary for a review meeting.",
    ],
    documents: [
      "What important documents are missing or due review?",
      "Summarise the key child documents.",
      "What document follow-up is needed?",
    ],
    communication: [
      "Summarise recent communication with professionals and family.",
      "What communication themes are emerging?",
      "Draft a professional update from recent records.",
    ],
    therapy: [
      "Summarise therapeutic themes and recommendations.",
      "What should staff hold in mind from therapeutic input?",
      "What follow-up actions come from therapy records?",
    ],
  };

  const homeMap = {
    "home-dashboard": [
      "Summarise the home’s operational picture.",
      "What needs management attention right now?",
      "What are the biggest risks across the home today?",
    ],
    compliance: [
      "What compliance issues need urgent action?",
      "Summarise gaps across workforce and statutory paperwork.",
      "What would Ofsted notice first right now?",
    ],
    manager: [
      "What needs leadership review right now?",
      "Summarise the main management pressures across the home.",
      "What actions should the manager prioritise this week?",
    ],
    readiness: [
      "What is overdue or due soon across the home?",
      "What actions should be completed first?",
      "Summarise the service readiness risks.",
    ],
    reports: [
      "Summarise the service for reporting purposes.",
      "What are the strongest themes across the home?",
      "Draft a home-level review summary.",
    ],
    calendar: [
      "What are the next key home dates and meetings?",
      "What requires preparation this week?",
      "Summarise upcoming deadlines and appointments.",
    ],
    team: [
      "Summarise staffing issues across the home.",
      "What workforce risks are emerging?",
      "What should leadership notice about team capacity?",
    ],
    supervision: [
      "Which supervisions are overdue or due soon?",
      "Summarise workforce oversight gaps.",
      "What supervision actions should be prioritised?",
    ],
    communication: [
      "Summarise recent professional communication across the home.",
      "What communication follow-up is outstanding?",
      "Draft a service-level professional update.",
    ],
    documents: [
      "What service documents are due review or missing?",
      "Summarise document compliance gaps.",
      "What statutory paperwork needs attention?",
    ],
    therapy: [
      "Summarise therapeutic service activity across the home.",
      "What recommendations need operational follow-up?",
      "What therapeutic themes are emerging?",
    ],
  };

  const qualityMap = {
    quality: [
      "Summarise current quality themes across the service.",
      "What would an RI or auditor notice first?",
      "What quality concerns are emerging?",
    ],
    compliance: [
      "What compliance gaps create the biggest Ofsted risk?",
      "Summarise workforce and paperwork compliance issues.",
      "What needs urgent correction before inspection?",
    ],
    reports: [
      "Draft a quality summary for leadership.",
      "What themes should be highlighted in reporting?",
      "Summarise audit and compliance themes.",
    ],
    manager: [
      "What leadership themes need escalation?",
      "What service-level patterns should management notice?",
      "Where is oversight weakest right now?",
    ],
    calendar: [
      "What quality deadlines and review dates are coming up?",
      "What compliance milestones are due soon?",
      "What needs preparing this month?",
    ],
    team: [
      "Summarise staffing and workforce quality concerns.",
      "What training or supervision gaps are emerging?",
      "What workforce risks affect compliance?",
    ],
    supervision: [
      "What supervision compliance risks are present?",
      "Where are staff oversight gaps strongest?",
      "Summarise overdue supervisions and appraisals.",
    ],
    communication: [
      "Summarise communication themes relevant to audit and quality.",
      "What partner-agency communication needs follow-up?",
      "Draft a professional quality update.",
    ],
    documents: [
      "What statutory paperwork gaps need urgent action?",
      "Summarise document quality and review issues.",
      "Which documents create the biggest inspection risk?",
    ],
    therapy: [
      "Summarise therapeutic provision quality themes.",
      "What therapeutic follow-up is slipping?",
      "Are there patterns in wellbeing or service delivery?",
    ],
  };

  const map =
    scope === "home"
      ? homeMap
      : scope === "quality"
      ? qualityMap
      : childMap;

  return map[view] || [
    scope === "child"
      ? "What matters most right now for this young person?"
      : "What matters most right now across this area?",
    "What needs attention next?",
    "Give me a concise summary.",
  ];
}

export function updateAssistantContext() {
  const scope = getCurrentScope();
  const currentView = getSectionLabel();
  const person = getSelectedYoungPerson() || {};
  const homeName = getHomeName();

  updateAssistantScopeDataset();
  renderAssistantScopeBadges();

  if (els.assistantContext) {
    if (scope === "child") {
      if (!state.youngPersonId) {
        els.assistantContext.textContent = "No young person selected.";
      } else {
        els.assistantContext.textContent = [
          `Young person: ${getFullYoungPersonName()}`,
          person.home_name || homeName,
          `View: ${currentView}`,
        ]
          .filter(Boolean)
          .join(" • ");
      }
    } else if (scope === "home") {
      els.assistantContext.textContent = [
        `Home: ${homeName}`,
        "Scope: home oversight",
        `View: ${currentView}`,
      ].join(" • ");
    } else {
      els.assistantContext.textContent = [
        `Home: ${homeName}`,
        "Scope: quality and RI",
        `View: ${currentView}`,
      ].join(" • ");
    }
  }

  const prompts = assistantPromptsForView(getCurrentSection(), scope);

  if (els.assistantSuggestions) {
    els.assistantSuggestions.innerHTML = prompts
      .map(
        (prompt) =>
          `<button class="secondary-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
      )
      .join("");
  }
}

function renderAssistantRichText(text = "") {
  const escaped = escapeHtml(String(text || ""));

  const withRules = escaped
    .replace(/^---$/gm, '<hr class="assistant-divider" />')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h4>$1</h4>")
    .replace(/^# (.*)$/gm, "<h4>$1</h4>");

  const lines = withRules.split("\n");
  let html = "";
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += "<p></p>";
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p><strong>${line.replace(/^(\d+\.)\s+/, "$1 ")}</strong></p>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (line.startsWith("<h4>") || line.startsWith("<hr")) {
      html += line;
    } else {
      html += `<p>${line}</p>`;
    }
  }

  if (inList) {
    html += "</ul>";
  }

  return html || "<p></p>";
}

function renderAssistantMessageList(host, messages) {
  if (!host) return;

  const scope = getCurrentScope();

  const intro = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">
        ${
          scope === "child"
            ? state.youngPersonId
              ? `<p>Ask a question about ${escapeHtml(getFullYoungPersonName())}.</p>`
              : `<p>Select a young person to start.</p>`
            : scope === "home"
            ? `<p>Ask a question about home operations, compliance or leadership oversight.</p>`
            : `<p>Ask a question about quality, compliance, audit readiness or RI themes.</p>`
        }
      </div>
    </article>
  `;

  const body = (messages || [])
    .map((message) => {
      const role = message.role === "user" ? "You" : "Assistant";
      const cls = message.role === "user" ? "assistant-message-user" : "";

      return `
        <article class="assistant-message ${cls}">
          <div class="assistant-message-role">${escapeHtml(role)}</div>
          <div class="assistant-message-body">
            ${
              message.role === "assistant"
                ? renderAssistantRichText(message.content || "")
                : `<p>${escapeHtml(message.content || "")}</p>`
            }
          </div>
        </article>
      `;
    })
    .join("");

  host.innerHTML = intro + body;
  host.scrollTop = host.scrollHeight;
}

export function renderAssistantMessages() {
  ensureAssistantState();

  renderAssistantMessageList(els.assistantMessages, state.assistantMessages);
  renderAssistantMessageList(els.assistantModalMessages, state.assistantModalMessages);
}

function pushAssistantMessage(role, content) {
  ensureAssistantState();

  const entry = { role, content };
  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });

  renderAssistantMessages();
}

function addAssistantPlaceholder() {
  ensureAssistantState();

  state.assistantMessages.push({
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  });

  state.assistantModalMessages.push({
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  });

  renderAssistantMessages();
}

function replaceLastAssistantPlaceholder(text) {
  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last.role === "assistant" && last._streaming) {
      last.content = text;
      last._streaming = false;
    }
  });

  renderAssistantMessages();
}

function updateLastAssistantStreamingText(text) {
  const lists = [state.assistantMessages || [], state.assistantModalMessages || []];

  lists.forEach((list) => {
    if (!list.length) return;

    const last = list[list.length - 1];
    if (last.role === "assistant" && last._streaming) {
      last.content = text;
    }
  });

  renderAssistantMessages();
}

function setAssistantSending(flag) {
  state.assistantSending = !!flag;

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = !!flag;
  }

  if (els.assistantModalSendBtn) {
    els.assistantModalSendBtn.disabled = !!flag;
  }
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function renderAssistantSourcesHtml(sources) {
  if (!Array.isArray(sources) || !sources.length) {
    return `<p>Sources will appear here after a response.</p>`;
  }

  return sources
    .map((source) => {
      const type = escapeHtml(source?.type || "source");
      const label = escapeHtml(
        source?.label || source?.document_title || source?.title || "Source"
      );
      const excerpt = escapeHtml(source?.excerpt || "");
      const section = escapeHtml(source?.section || "");
      const page =
        source?.page_number != null
          ? escapeHtml(String(source.page_number))
          : "";

      return `
        <div class="entity-row">
          <div>
            <div class="entity-title">${label}</div>
            <div class="entity-meta">
              ${type}
              ${section ? ` • ${section}` : ""}
              ${page ? ` • p.${page}` : ""}
            </div>
            ${
              excerpt
                ? `<div class="entity-meta" style="margin-top:6px;">${excerpt}</div>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");
}

function inferAssistantSuggestedActions() {
  const meta = state.assistantMeta || {};
  const scope = meta.assistant_scope || {};
  const context = meta.assistant_context || {};
  const actions = [];
  const currentScope = getCurrentScope();

  if (currentScope === "child" || scope.scope_type === "young_person") {
    actions.push("Draft handover");
    actions.push("Summarise recent incidents");
    actions.push("Summarise current support guidance");
    actions.push("Review outstanding tasks");
  }

  if (currentScope === "home") {
    actions.push("Summarise home risks");
    actions.push("Review open actions");
    actions.push("Check compliance gaps");
    actions.push("Draft leadership summary");
  }

  if (currentScope === "quality") {
    actions.push("Summarise quality themes");
    actions.push("Check Ofsted risks");
    actions.push("Review compliance gaps");
    actions.push("Draft RI summary");
  }

  if (context.recent_records?.incidents?.length) {
    actions.push("Review incident patterns");
  }

  if (context.active_work?.tasks?.length) {
    actions.push("Review outstanding tasks");
  }

  if (Array.isArray(meta.suggested_actions)) {
    actions.push(...meta.suggested_actions);
  }

  return [...new Set(actions)].slice(0, 8);
}

export function renderAssistantInsights() {
  const meta = state.assistantMeta || {};
  const scope = meta.assistant_scope || {};
  const context = meta.assistant_context || {};
  const sources = meta.sources || [];
  const runtime = meta.runtime || {};
  const explainability = meta.explainability || {};

  if (els.assistantScopeSummary) {
    const rows = [];
    const currentView = getSectionLabel();

    rows.push(`
      <div class="entity-row">
        <div>
          <div class="entity-title">${escapeHtml(getScopeLabel())}</div>
          <div class="entity-meta">View: ${escapeHtml(currentView)}</div>
        </div>
      </div>
    `);

    if (getCurrentScope() === "child" && state.youngPersonId) {
      const person = getSelectedYoungPerson() || {};
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">${escapeHtml(getFullYoungPersonName())}</div>
            <div class="entity-meta">${escapeHtml(person.home_name || getHomeName())}</div>
          </div>
        </div>
      `);
    }

    if (getCurrentScope() !== "child") {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">${escapeHtml(getHomeName())}</div>
            <div class="entity-meta">${
              getCurrentScope() === "home"
                ? "Home-wide oversight context"
                : "Quality and compliance context"
            }</div>
          </div>
        </div>
      `);
    }

    if (context && typeof context === "object" && Object.keys(context).length) {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">Context loaded</div>
            <div class="entity-meta">Assistant context and evidence sources are available.</div>
          </div>
        </div>
      `);
    }

    if (scope.scope_type) {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">Resolved scope</div>
            <div class="entity-meta">${escapeHtml(String(scope.scope_type))}</div>
          </div>
        </div>
      `);
    }

    els.assistantScopeSummary.innerHTML = rows.join("");
  }

  const suggestedActions = inferAssistantSuggestedActions();

  if (els.assistantActions) {
    els.assistantActions.innerHTML = suggestedActions.length
      ? suggestedActions
          .map(
            (item) =>
              `<button class="chip" type="button" data-assistant-chip="${escapeHtml(item)}">${escapeHtml(item)}</button>`
          )
          .join("")
      : `<p>No suggested actions yet.</p>`;
  }

  if (els.assistantSources) {
    els.assistantSources.innerHTML = renderAssistantSourcesHtml(sources);
  }

  if (els.assistantRuntime) {
    els.assistantRuntime.textContent = prettyJson(runtime);
  }

  if (els.assistantExplainability) {
    els.assistantExplainability.textContent = prettyJson(explainability);
  }

  if (els.assistantModalScopeSummary) {
    els.assistantModalScopeSummary.innerHTML = els.assistantScopeSummary
      ? els.assistantScopeSummary.innerHTML
      : `<p>No scoped context loaded.</p>`;
  }

  if (els.assistantModalSources) {
    els.assistantModalSources.innerHTML = renderAssistantSourcesHtml(sources);
  }
}

function buildAssistantContextPayload() {
  const person = getSelectedYoungPerson() || {};
  const scope = getCurrentScope();
  const section = getCurrentSection();

  return {
    scope,
    scope_type: getAssistantScopeType(),
    current_view: section,
    shift_context: section,
    young_person_id: scope === "child" ? state.youngPersonId || null : null,
    young_person_name: scope === "child" ? getFullYoungPersonName() : null,
    home_id:
      state.homeId ||
      person.home_id ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      null,
    home_name: getHomeName(),
    placement_status: person.placement_status || null,
    summary_risk_level: person.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
    record_type: state.activeRecordType || state.composerRecordType || null,
    record_id:
      state.activeRecordItem?.record_id ||
      state.activeRecordItem?.source_id ||
      state.activeRecordItem?.id ||
      state.composerRecordId ||
      null,
    current_scope: scope,
    current_section: section,
    user_role: state.userRole || "staff",
  };
}

function detectAssistantResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report|audit|compliance|ofsted|ri/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();

  if (!trimmed || state.assistantSending) return;

  if (getCurrentScope() === "child" && !state.youngPersonId) {
    pushAssistantMessage(
      "assistant",
      "Please select a young person first so I can answer in the right context."
    );
    return;
  }

  pushAssistantMessage("user", trimmed);
  addAssistantPlaceholder();
  setAssistantSending(true);

  try {
    await apiStreamAssistant(
      {
        message: trimmed,
        response_mode: detectAssistantResponseMode(trimmed),
        context: buildAssistantContextPayload(),
      },
      {
        onMeta: (meta) => {
          state.assistantMeta = {
            sources: Array.isArray(meta?.sources) ? meta.sources : [],
            runtime: meta?.runtime || {},
            explainability: meta?.explainability || {},
            assistant_scope: meta?.assistant_scope || {},
            assistant_context: meta?.assistant_context || {},
            suggested_actions: Array.isArray(meta?.suggested_actions)
              ? meta.suggested_actions
              : [],
          };

          renderAssistantInsights();
        },
        onProgress: () => {},
        onMessage: (streamedText) => {
          updateLastAssistantStreamingText(streamedText || "Thinking…");
        },
        onDone: (streamedText) => {
          replaceLastAssistantPlaceholder(
            String(streamedText || "").trim() || "No assistant reply returned."
          );
        },
      }
    );
  } catch (error) {
    replaceLastAssistantPlaceholder(
      error?.message || "The assistant could not answer right now."
    );
  } finally {
    setAssistantSending(false);
    renderAssistantInsights();
    renderAssistantMessages();
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  renderAssistantMessages();
}

function bindPromptButtons() {
  if (assistantPromptDelegatesBound) return;
  assistantPromptDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-prompt], [data-assistant-chip]");
    if (!button) return;

    const prompt = button.dataset.prompt || button.dataset.assistantChip || "";
    if (!prompt) return;

    await askAssistant(prompt);
  });
}

export function bindAssistantEvents() {
  if (assistantEventsBound) return;
  assistantEventsBound = true;

  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.heroAssistantBtn?.addEventListener("click", openAssistant);
  els.assistantExpandBtn?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    clearAssistantMessages();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) {
      els.assistantInput.value = "";
    }
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) {
      els.assistantModalInput.value = "";
    }
    await askAssistant(question);
  });

  bindPromptButtons();
}
