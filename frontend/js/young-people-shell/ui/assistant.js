import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { withCsrfHeaders } from "../core/api.js";

function getCurrentYoungPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getCurrentViewName() {
  return state.currentSection || state.currentView || "workspace";
}

export function openAssistant() {
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();

  state.assistantOpen = true;
  els.assistantModal?.classList.remove("hidden");
  els.assistantBackdrop?.classList.remove("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "false");
}

export function closeAssistant() {
  state.assistantOpen = false;
  els.assistantModal?.classList.add("hidden");
  els.assistantBackdrop?.classList.add("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "true");
}

export function getFullYoungPersonName() {
  const person = getCurrentYoungPerson();
  if (!person) return "";

  return (
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

export function updateAssistantScopeDataset() {
  if (!els.app) return;

  const person = getCurrentYoungPerson();

  els.app.dataset.assistantScopeType = state.youngPersonId ? "young_person" : "global";
  els.app.dataset.youngPersonId = state.youngPersonId ? String(state.youngPersonId) : "";
  els.app.dataset.homeId = person?.home_id != null ? String(person.home_id) : "";
}

export function renderAssistantScopeBadges() {
  const person = getCurrentYoungPerson();

  const homeText =
    person?.home_name ||
    (person?.home_id != null ? `Home ${person.home_id}` : "");

  const childText = getFullYoungPersonName();
  const currentView = getCurrentViewName();

  if (els.scopeBadge) {
    els.scopeBadge.textContent = state.youngPersonId ? "Young person assistant" : "Assistant";
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
    els.scopeShiftBadge.textContent = currentView
      ? currentView.replaceAll("_", " ").replaceAll("-", " ")
      : "";

    if (currentView) {
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
      "Give me a short handover for this young person.",
      "What matters most right now?",
    ],
    overview: [
      "Give me a short handover for this young person.",
      "What matters most right now?",
    ],
    profile: [
      "Summarise this young person’s key needs and strengths.",
      "What should adults hold in mind when supporting this young person?",
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
      "Summarise current health and wellbeing needs.",
      "What appointments or follow-up matter most?",
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
      "Summarise upcoming appointments and key dates.",
      "What preparation or follow-up matters most?",
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
    "Give me a short handover for this young person.",
    "Summarise current support themes.",
    "What matters most right now?",
  ];
}

export function updateAssistantContext() {
  const person = getCurrentYoungPerson();
  const fullName = getFullYoungPersonName();
  const currentView = getCurrentViewName();

  updateAssistantScopeDataset();
  renderAssistantScopeBadges();

  if (!person) {
    if (els.assistantContext) {
      els.assistantContext.textContent = "No young person selected.";
    }
  } else {
    const text = [
      `Young person: ${fullName}`,
      person.home_name || null,
      `View: ${currentView.replaceAll("_", " ").replaceAll("-", " ")}`,
    ]
      .filter(Boolean)
      .join(" • ");

    if (els.assistantContext) {
      els.assistantContext.textContent = text;
    }
  }

  const prompts = assistantPromptsForView(currentView);

  if (els.assistantSuggestions) {
    els.assistantSuggestions.innerHTML = prompts
      .map(
        (prompt) =>
          `<button class="secondary-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
      )
      .join("");
  }
}

function renderAssistantMessageList(host, messages) {
  if (!host) return;

  const intro = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">${
        state.youngPersonId
          ? `Ask a question about ${escapeHtml(getFullYoungPersonName() || "this young person")}.`
          : "Select a young person to start."
      }</div>
    </article>
  `;

  const body = (messages || [])
    .map(
      (message) => `
        <article class="assistant-message ${message.role === "user" ? "assistant-message-user" : ""}">
          <div class="assistant-message-role">${message.role === "user" ? "You" : "Assistant"}</div>
          <div class="assistant-message-body">${escapeHtml(message.content || "")}</div>
        </article>
      `
    )
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
  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(entry);
  renderAssistantMessages();
}

function addAssistantPlaceholder() {
  state.assistantMessages.push({ role: "assistant", content: "Thinking…", _streaming: true });
  state.assistantModalMessages.push({ role: "assistant", content: "Thinking…", _streaming: true });
  renderAssistantMessages();
}

function replaceLastAssistantPlaceholder(text) {
  const lists = [state.assistantMessages, state.assistantModalMessages];

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
  const lists = [state.assistantMessages, state.assistantModalMessages];

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
  const actions = [];
  const scope = state.assistantMeta?.assistant_scope || {};
  const context = state.assistantMeta?.assistant_context || {};

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

  if (Array.isArray(state.assistantMeta?.suggested_actions)) {
    actions.push(...state.assistantMeta.suggested_actions);
  }

  return [...new Set(actions)].slice(0, 6);
}

export function renderAssistantInsights() {
  const scope = state.assistantMeta?.assistant_scope || {};
  const context = state.assistantMeta?.assistant_context || {};
  const sources = state.assistantMeta?.sources || [];
  const runtime = state.assistantMeta?.runtime || {};
  const explainability = state.assistantMeta?.explainability || {};
  const person = getCurrentYoungPerson();

  if (els.assistantScopeSummary) {
    const rows = [];

    rows.push(`
      <div class="entity-row">
        <div>
          <div class="entity-title">${scope.scope_type === "young_person" ? "Young person scope" : "Assistant scope"}</div>
          <div class="entity-meta">View: ${escapeHtml(getCurrentViewName().replaceAll("_", " ").replaceAll("-", " "))}</div>
        </div>
      </div>
    `);

    if (person) {
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
  const person = getCurrentYoungPerson();
  const currentView = getCurrentViewName();

  return {
    scope: "young_person",
    young_person_id: state.youngPersonId,
    current_view: currentView,
    current_section: currentView,
    young_person_name: getFullYoungPersonName(),
    placement_status: person?.placement_status || null,
    summary_risk_level: person?.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
    home_name: person?.home_name || null,
    shift_context: currentView || null,
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

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const complete = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of complete) {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;

      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
      }
    }

    onEvent(eventName, dataLines.join("\n"));
  }

  return remainder;
}

export async function askAssistant(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed || !state.youngPersonId || state.assistantSending) return;

  pushAssistantMessage("user", trimmed);
  addAssistantPlaceholder();
  setAssistantSending(true);

  try {
    const response = await fetch("/young-people/assistant", {
      method: "POST",
      credentials: "include",
      headers: withCsrfHeaders("POST", {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      }),
      body: JSON.stringify({
        message: trimmed,
        response_mode: detectAssistantResponseMode(trimmed),
        context: buildAssistantContextPayload(),
      }),
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body.detail || body.error || body.message || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    if (!response.body) {
      throw new Error("No assistant response stream was returned.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamedText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      buffer = parseSseChunk(buffer, (eventName, payload) => {
        if (eventName === "done" || payload === "[DONE]") return;

        if (eventName === "meta") {
          try {
            const meta = JSON.parse(payload || "{}");
            state.assistantMeta = {
              sources: Array.isArray(meta.sources) ? meta.sources : [],
              runtime: meta.runtime || {},
              explainability: meta.explainability || {},
              assistant_scope: meta.assistant_scope || {},
              assistant_context: meta.assistant_context || {},
              suggested_actions: Array.isArray(meta.suggested_actions) ? meta.suggested_actions : [],
            };
            renderAssistantInsights();
          } catch {
            // ignore malformed meta
          }
          return;
        }

        if (eventName === "progress") return;

        if (eventName === "message") {
          streamedText += payload || "";
          updateLastAssistantStreamingText(streamedText.trim() || "Thinking…");
        }
      });
    }

    replaceLastAssistantPlaceholder(streamedText.trim() || "No assistant reply returned.");
  } catch (error) {
    replaceLastAssistantPlaceholder(error?.message || "The assistant could not answer right now.");
  } finally {
    setAssistantSending(false);
  }
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  renderAssistantMessages();
}

async function handlePromptClick(prompt) {
  if (!prompt) return;
  await askAssistant(prompt);
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

  document.addEventListener("click", async (event) => {
    const promptButton = event.target.closest("[data-prompt]");
    if (promptButton) {
      await handlePromptClick(promptButton.dataset.prompt || "");
      return;
    }

    const chipButton = event.target.closest("[data-assistant-chip]");
    if (chipButton) {
      await handlePromptClick(chipButton.dataset.assistantChip || "");
    }
  });
}
