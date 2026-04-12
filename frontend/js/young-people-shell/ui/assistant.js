import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { apiStreamAssistant } from "../core/api.js";

export function openAssistant() {
  updateAssistantContext();
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

export function getFullYoungPersonName() {
  const person = state.selectedYoungPerson || state.youngPerson || {};
  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

export function updateAssistantScopeDataset() {
  if (!els.app) return;

  const person = state.selectedYoungPerson || state.youngPerson || {};

  els.app.dataset.assistantScopeType = state.youngPersonId ? "young_person" : "global";
  els.app.dataset.youngPersonId = state.youngPersonId ? String(state.youngPersonId) : "";
  els.app.dataset.homeId = person.home_id != null ? String(person.home_id) : "";
}

export function renderAssistantScopeBadges() {
  const person = state.selectedYoungPerson || state.youngPerson || {};
  const homeText =
    person.home_name ||
    (person.home_id != null ? `Home ${person.home_id}` : "");

  const childText = getFullYoungPersonName();

  if (els.scopeBadge) {
    els.scopeBadge.textContent = state.youngPersonId
      ? "Young person assistant"
      : "Assistant";
  }

  if (els.scopeHomeBadge) {
    if (homeText) {
      els.scopeHomeBadge.textContent = homeText;
      els.scopeHomeBadge.classList.remove("hidden");
    } else {
      els.scopeHomeBadge.textContent = "";
      els.scopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.scopeChildBadge) {
    if (childText) {
      els.scopeChildBadge.textContent = childText;
      els.scopeChildBadge.classList.remove("hidden");
    } else {
      els.scopeChildBadge.textContent = "";
      els.scopeChildBadge.classList.add("hidden");
    }
  }

  if (els.scopeShiftBadge) {
    const label = (state.currentSection || state.activeSection || "workspace")
      .replaceAll("_", " ")
      .replaceAll("-", " ");

    els.scopeShiftBadge.textContent = label;

    if (label) {
      els.scopeShiftBadge.classList.remove("hidden");
    } else {
      els.scopeShiftBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeHomeBadge) {
    if (homeText) {
      els.modalScopeHomeBadge.textContent = homeText;
      els.modalScopeHomeBadge.classList.remove("hidden");
    } else {
      els.modalScopeHomeBadge.textContent = "";
      els.modalScopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeChildBadge) {
    if (childText) {
      els.modalScopeChildBadge.textContent = childText;
      els.modalScopeChildBadge.classList.remove("hidden");
    } else {
      els.modalScopeChildBadge.textContent = "";
      els.modalScopeChildBadge.classList.add("hidden");
    }
  }
}

function assistantPromptsForView(view) {
  const map = {
    workspace: [
      "Give me a 6 month summary for this young person.",
      "What matters most right now?",
      "Draft a short handover for the next shift.",
    ],
    overview: [
      "Give me a short handover for this young person.",
      "What matters most right now?",
    ],
    profile: [
      "Summarise this young person's needs and what helps.",
      "What should adults hold in mind day to day?",
    ],
    timeline: [
      "Create a short chronology summary.",
      "What are the key turning points recently?",
    ],
    handover: [
      "Give me a short handover for this young person.",
      "What does the next shift most need to know?",
    ],
    health: [
      "When was the last dentist appointment?",
      "Summarise current health and wellbeing needs.",
    ],
    education: [
      "Summarise education themes and needs.",
      "What helps this young person engage with learning?",
    ],
    family: [
      "Summarise key relationship and family themes.",
      "What should adults hold in mind around contact?",
    ],
    calendar: [
      "What is the next appointment?",
      "When was the last appointment?",
    ],
    readiness: [
      "What is overdue or due soon?",
      "What should be completed next?",
    ],
    manager: [
      "What needs manager review right now?",
      "What themes should leadership notice?",
    ],
    reports: [
      "Give me a 6 month summary for this young person.",
      "What are the strongest themes across the record?",
    ],
  };

  return map[view] || [
    "Give me a 6 month summary for this young person.",
    "What matters most right now?",
    "When was the last appointment?",
  ];
}

export function updateAssistantContext() {
  const fullName = getFullYoungPersonName();
  const currentView = (state.currentSection || state.activeSection || "workspace")
    .replaceAll("_", " ")
    .replaceAll("-", " ");

  const person = state.selectedYoungPerson || state.youngPerson || {};

  if (!state.youngPersonId) {
    if (els.assistantContext) {
      els.assistantContext.textContent = "No young person selected.";
    }
  } else {
    const text = [
      `Young person: ${fullName}`,
      person.home_name || null,
      `View: ${currentView}`,
    ]
      .filter(Boolean)
      .join(" • ");

    if (els.assistantContext) {
      els.assistantContext.textContent = text;
    }
  }

  const prompts = assistantPromptsForView(state.currentSection || state.activeSection || "workspace");
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

  const intro = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">
        ${
          state.youngPersonId
            ? `<p>Ask a question about ${escapeHtml(getFullYoungPersonName() || "this young person")}.</p>`
            : `<p>Select a young person to start.</p>`
        }
      </div>
    </article>
  `;

  const body = messages
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
  renderAssistantMessageList(els.assistantMessages, state.assistantMessages || []);
  renderAssistantMessageList(els.assistantModalMessages, state.assistantModalMessages || []);
}

function pushAssistantMessage(role, content) {
  const entry = { role, content };
  state.assistantMessages = state.assistantMessages || [];
  state.assistantModalMessages = state.assistantModalMessages || [];
  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
  renderAssistantMessages();
}

function addAssistantPlaceholder() {
  state.assistantMessages = state.assistantMessages || [];
  state.assistantModalMessages = state.assistantModalMessages || [];

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
  if (els.assistantSendBtn) els.assistantSendBtn.disabled = !!flag;
  if (els.assistantModalSendBtn) els.assistantModalSendBtn.disabled = !!flag;
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
      const label = escapeHtml(source?.label || source?.document_title || "Source");
      const excerpt = escapeHtml(source?.excerpt || "");
      const section = escapeHtml(source?.section || "");
      const page = source?.page_number != null ? escapeHtml(String(source.page_number)) : "";

      return `
        <div class="entity-row">
          <div>
            <div class="entity-title">${label}</div>
            <div class="entity-meta">
              ${type}
              ${section ? ` • ${section}` : ""}
              ${page ? ` • p.${page}` : ""}
            </div>
            ${excerpt ? `<div class="entity-meta" style="margin-top:6px;">${excerpt}</div>` : ""}
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

  if (scope.scope_type === "young_person") {
    actions.push("Draft handover");
    actions.push("Pull young person voice themes");
    actions.push("Summarise recent incidents");
    actions.push("Summarise current support guidance");
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

  return [...new Set(actions)].slice(0, 6);
}

export function renderAssistantInsights() {
  const meta = state.assistantMeta || {};
  const scope = meta.assistant_scope || {};
  const context = meta.assistant_context || {};
  const sources = meta.sources || [];
  const runtime = meta.runtime || {};
  const explainability = meta.explainability || {};

  if (els.assistantScopeSummary) {
    const currentView = (state.currentSection || state.activeSection || "workspace")
      .replaceAll("_", " ")
      .replaceAll("-", " ");

    const rows = [];

    rows.push(`
      <div class="entity-row">
        <div>
          <div class="entity-title">${scope.scope_type === "young_person" ? "Young person scope" : "Assistant scope"}</div>
          <div class="entity-meta">View: ${escapeHtml(currentView)}</div>
        </div>
      </div>
    `);

    if (state.selectedYoungPerson || state.youngPersonId) {
      const person = state.selectedYoungPerson || state.youngPerson || {};
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">${escapeHtml(getFullYoungPersonName())}</div>
            <div class="entity-meta">${escapeHtml(person.home_name || "Workspace loaded")}</div>
          </div>
        </div>
      `);
    }

    if (context.young_person && typeof context.young_person === "object") {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">Context loaded</div>
            <div class="entity-meta">Assistant context includes profile and recent records.</div>
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
  const person = state.selectedYoungPerson || state.youngPerson || {};

  return {
    scope: "young_person",
    young_person_id: state.youngPersonId,
    current_view: state.currentSection || state.activeSection || "workspace",
    young_person_name: getFullYoungPersonName(),
    placement_status: person.placement_status || null,
    summary_risk_level: person.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
    home_name: person.home_name || null,
    shift_context: state.currentSection || state.activeSection || "workspace",
    record_type: state.activeRecordType || state.composerRecordType || null,
    record_id:
      state.activeRecordItem?.record_id ||
      state.activeRecordItem?.source_id ||
      state.activeRecordItem?.id ||
      state.composerRecordId ||
      null,
  };
}

function detectAssistantResponseMode(text) {
  return /6 month|six month|12 month|twelve month|summary|timeline|chronology|review|report/i.test(
    String(text || "")
  )
    ? "deep"
    : "balanced";
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed || !state.youngPersonId || state.assistantSending) return;

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
            sources: Array.isArray(meta.sources) ? meta.sources : [],
            runtime: meta.runtime || {},
            explainability: meta.explainability || {},
            assistant_scope: meta.assistant_scope || {},
            assistant_context: meta.assistant_context || {},
            suggested_actions: Array.isArray(meta.suggested_actions)
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
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  renderAssistantMessages();
}

function bindPromptButtons() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-prompt], [data-assistant-chip]");
    if (!button) return;

    const prompt =
      button.dataset.prompt ||
      button.dataset.assistantChip ||
      "";

    if (!prompt) return;
    await askAssistant(prompt);
  });
}

export function bindAssistantEvents() {
  els.assistantLauncher?.addEventListener("click", openAssistant);
  els.assistantExpandBtn?.addEventListener("click", openAssistant);
  els.closeAssistantBtn?.addEventListener("click", closeAssistant);
  els.assistantBackdrop?.addEventListener("click", closeAssistant);

  els.assistantClearBtn?.addEventListener("click", () => {
    clearAssistantMessages();
  });

  els.assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantInput?.value || "";
    if (els.assistantInput) els.assistantInput.value = "";
    await askAssistant(question);
  });

  els.assistantModalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = els.assistantModalInput?.value || "";
    if (els.assistantModalInput) els.assistantModalInput.value = "";
    await askAssistant(question);
  });

  bindPromptButtons();
}
