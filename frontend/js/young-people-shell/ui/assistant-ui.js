import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml, dedupeStrings } from "../core/utils.js";
import { apiStreamAssistant } from "../core/api.js";

function getYoungPersonName() {
  return (
    [state.youngPerson?.first_name, state.youngPerson?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    state.youngPerson?.preferred_name ||
    "Young person"
  );
}

function formatAssistantMessage(text = "") {
  const escaped = escapeHtml(String(text || ""));

  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

export function assistantPromptsForView(view) {
  const map = {
    overview: [
      "Give me a short handover for this young person.",
      "What matters most right now?",
    ],
    incidents: [
      "Summarise the recent incidents.",
      "What patterns are showing in significant events?",
    ],
    plans: [
      "Summarise current support plans.",
      "What should adults hold in mind?",
    ],
    handover: [
      "Give me a short handover for this young person.",
      "What does the next shift most need to know?",
    ],
    manager: [
      "What needs manager review right now?",
      "What is overdue or waiting for sign-off?",
    ],
    health: [
      "Summarise current health and wellbeing needs.",
      "What appointments or follow-up matter most right now?",
    ],
    education: [
      "Summarise current education themes.",
      "What should adults hold in mind about learning right now?",
    ],
    family: [
      "Summarise important family and relationship updates.",
      "What should adults know about contact and relationships?",
    ],
    timeline: [
      "Summarise the recent chronology.",
      "What themes stand out across the timeline?",
    ],
    reports: [
      "What would make a strong report summary right now?",
      "Summarise the main themes for this young person.",
    ],
  };

  return map[view] || [
    "Give me a short handover for this young person.",
    "What matters most right now?",
  ];
}

export function getAssistantContextPayload() {
  return {
    scope: "young_person",
    young_person_id: state.youngPersonId,
    current_view: state.currentView,
    young_person_name: getYoungPersonName(),
    placement_status: state.youngPerson?.placement_status || null,
    summary_risk_level: state.youngPerson?.summary_risk_level || null,
    composer_record_type: state.composerRecordType || null,
    home_name: state.youngPerson?.home_name || null,
    shift_context: state.currentView || null,
    record_type: state.activeRecordType || state.composerRecordType || null,
    record_id:
      state.activeRecordItem?.record_id ||
      state.activeRecordItem?.source_id ||
      state.activeRecordItem?.id ||
      state.composerRecordId ||
      null,
  };
}

export function updateAssistantContext() {
  if (!state.youngPerson) {
    if (els.assistantContext) {
      els.assistantContext.textContent = "No young person selected.";
    }
  } else {
    const text = [
      `Young person: ${getYoungPersonName()}`,
      state.youngPerson.home_name || null,
      `View: ${String(state.currentView || "overview").replaceAll("_", " ")}`,
    ]
      .filter(Boolean)
      .join(" • ");

    if (els.assistantContext) {
      els.assistantContext.textContent = text;
    }
  }

  const prompts = assistantPromptsForView(state.currentView);
  if (els.assistantSuggestions) {
    els.assistantSuggestions.innerHTML = prompts
      .map(
        (prompt) =>
          `<button class="secondary-btn" type="button" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
      )
      .join("");
  }
}

export function renderAssistantMessageList(host, messages) {
  if (!host) return;

  const base = `
    <article class="assistant-message assistant-message-system">
      <div class="assistant-message-role">Assistant</div>
      <div class="assistant-message-body">${
        state.youngPersonId
          ? `Ask a question about ${escapeHtml(getYoungPersonName())}.`
          : "Select a young person to start."
      }</div>
    </article>
  `;

  const messagesHtml = (messages || [])
    .map(
      (message) => `
        <article class="assistant-message ${message.role === "user" ? "assistant-message-user" : ""}">
          <div class="assistant-message-role">${message.role === "user" ? "You" : "Assistant"}</div>
          <div class="assistant-message-body">${
            message.role === "assistant"
              ? formatAssistantMessage(message.content || "")
              : escapeHtml(message.content || "")
          }</div>
        </article>
      `
    )
    .join("");

  host.innerHTML = base + messagesHtml;
  host.scrollTop = host.scrollHeight;
}

export function renderAssistantMessages() {
  renderAssistantMessageList(els.assistantMessages, state.assistantMessages);
  renderAssistantMessageList(els.assistantModalMessages, state.assistantModalMessages);
}

export function pushAssistantMessage(role, content) {
  const entry = {
    role,
    content: String(content || ""),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
  renderAssistantMessages();
}

export function addAssistantPlaceholder() {
  const entry = {
    role: "assistant",
    content: "Thinking…",
    _streaming: true,
  };

  state.assistantMessages.push({ ...entry });
  state.assistantModalMessages.push({ ...entry });
  renderAssistantMessages();
}

export function replaceLastAssistantPlaceholder(text) {
  const finalText = String(text || "").trim() || "No assistant reply returned.";
  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!list.length) return;
    const last = list[list.length - 1];

    if (last.role === "assistant" && last._streaming) {
      last.content = finalText;
      last._streaming = false;
    }
  });

  renderAssistantMessages();
}

export function updateLastAssistantStreamingText(text) {
  const nextText = String(text || "").trim() || "Thinking…";
  const lists = [state.assistantMessages, state.assistantModalMessages];

  lists.forEach((list) => {
    if (!list.length) return;
    const last = list[list.length - 1];

    if (last.role === "assistant" && last._streaming) {
      last.content = nextText;
    }
  });

  renderAssistantMessages();
}

export function setAssistantSending(flag) {
  state.assistantSending = !!flag;

  if (els.assistantSendBtn) els.assistantSendBtn.disabled = state.assistantSending;
  if (els.assistantModalSendBtn) els.assistantModalSendBtn.disabled = state.assistantSending;
  if (els.assistantInput) els.assistantInput.disabled = state.assistantSending;
  if (els.assistantModalInput) els.assistantModalInput.disabled = state.assistantSending;
}

export function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

export function renderAssistantSourcesHtml(sources) {
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

export function inferAssistantSuggestedActions() {
  const actions = [];
  const scope = state.assistantMeta.assistant_scope || {};
  const context = state.assistantMeta.assistant_context || {};

  if (scope.scope_type === "young_person") {
    actions.push(
      "Draft handover",
      "Pull young person voice themes",
      "Summarise recent incidents",
      "Summarise current support guidance"
    );
  }

  if (context.recent_records?.incidents?.length) {
    actions.push("Review incident patterns");
  }

  if (context.active_work?.tasks?.length) {
    actions.push("Review outstanding tasks");
  }

  if (Array.isArray(state.assistantMeta.suggested_actions)) {
    actions.push(...state.assistantMeta.suggested_actions);
  }

  return dedupeStrings(actions).slice(0, 6);
}

export function renderAssistantInsights() {
  const scope = state.assistantMeta.assistant_scope || {};
  const context = state.assistantMeta.assistant_context || {};
  const sources = state.assistantMeta.sources || [];
  const runtime = state.assistantMeta.runtime || {};
  const explainability = state.assistantMeta.explainability || {};

  if (els.assistantScopeSummary) {
    const rows = [];

    rows.push(`
      <div class="entity-row">
        <div>
          <div class="entity-title">${scope.scope_type === "young_person" ? "Young person scope" : "Assistant scope"}</div>
          <div class="entity-meta">View: ${escapeHtml(String(state.currentView || "overview").replaceAll("_", " "))}</div>
        </div>
      </div>
    `);

    if (state.youngPerson) {
      rows.push(`
        <div class="entity-row">
          <div>
            <div class="entity-title">${escapeHtml(getYoungPersonName())}</div>
            <div class="entity-meta">${escapeHtml(state.youngPerson.home_name || "Workspace loaded")}</div>
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

export function openAssistant() {
  updateAssistantContext();
  els.assistantModal?.classList.remove("hidden");
  els.assistantBackdrop?.classList.remove("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "false");
}

export function closeAssistant() {
  els.assistantModal?.classList.add("hidden");
  els.assistantBackdrop?.classList.add("hidden");
  els.assistantModal?.setAttribute("aria-hidden", "true");
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

  let streamedText = "";

  try {
    await apiStreamAssistant(
      {
        message: trimmed,
        response_mode: detectAssistantResponseMode(trimmed),
        context: getAssistantContextPayload(),
      },
      {
        onMeta(meta) {
          state.assistantMeta = {
            sources: Array.isArray(meta?.sources) ? meta.sources : [],
            runtime: meta?.runtime || {},
            explainability: meta?.explainability || {},
            assistant_scope: meta?.assistant_scope || {},
            assistant_context: meta?.assistant_context || {},
            suggested_actions: Array.isArray(meta?.suggested_actions) ? meta.suggested_actions : [],
          };
          renderAssistantInsights();
        },
        onMessage(text) {
          streamedText = String(text || "");
          updateLastAssistantStreamingText(streamedText);
        },
        onDone(text) {
          const finalText = String(text || streamedText || "").trim();
          replaceLastAssistantPlaceholder(finalText || "No assistant reply returned.");
        },
      }
    );
  } catch (error) {
    replaceLastAssistantPlaceholder(error.message || "The assistant could not answer right now.");
  } finally {
    setAssistantSending(false);
  }
}
