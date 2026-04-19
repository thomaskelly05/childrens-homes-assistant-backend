import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import {
  resolveEl,
  ensureAssistantState,
  getAssistantMeta,
  getCurrentScope,
  getCurrentSection,
  getPersonLabel,
  getHomeLabel,
  getScopeLabel,
  getReadableSectionLabel,
  getReadableSectionSubtitle,
  extractAssistantContent,
  sourceCitationRef,
  sourceSafeDomId,
  getSources,
  buildSourceMap,
  buildRecordLookupMap,
  RECORD_LINK_REGEX,
} from "../assistant/helpers.js";

let assistantUiBound = false;
let citationEventsBound = false;

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function renderInlineText(text = "") {
  let html = escapeHtml(String(text || ""));
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  return html;
}

function renderCitationChip(ref = "", source = null) {
  const safeRef = escapeHtml(ref);
  const label = source?.label || source?.title || source?.document_title || ref;
  const safeLabel = escapeHtml(String(label || ref));
  const evidenceKind = escapeHtml(String(source?.evidence_kind || "direct"));

  return `
    <button
      class="assistant-citation-chip"
      type="button"
      data-citation-ref="${safeRef}"
      data-evidence-kind="${evidenceKind}"
      title="${safeLabel}"
      aria-label="View source ${safeLabel}"
    >
      ${safeRef}
    </button>
  `;
}

function renderLinkedRecordChip(label = "", recordId = "", recordType = "") {
  const safeLabel = escapeHtml(label);
  const safeRecordId = escapeHtml(String(recordId || ""));
  const safeRecordType = escapeHtml(String(recordType || ""));

  return `
    <button
      class="assistant-citation-chip assistant-citation-chip--record"
      type="button"
      data-linked-record-id="${safeRecordId}"
      data-linked-record-type="${safeRecordType}"
      aria-label="Open ${safeLabel}"
      title="${safeLabel}"
    >
      ${safeLabel}
    </button>
  `;
}

function injectRecordLinks(text = "", recordLookup = new Map()) {
  const raw = String(text || "");

  return raw.replace(RECORD_LINK_REGEX, (match, kind, _numberWord, idToken) => {
    const numericId = String(idToken || "").replace(/[^\d]/g, "");
    if (!numericId) return match;

    const linked = recordLookup.get(numericId);
    const label = match;

    return `%%RECORD_LINK_START%%${JSON.stringify({
      label,
      recordId: numericId,
      recordType: linked?.record_type || kind || "",
    })}%%RECORD_LINK_END%%`;
  });
}

function renderParagraphWithCitations(text = "", sourceMap = new Map()) {
  const recordLookup = buildRecordLookupMap();
  const raw = injectRecordLinks(String(text || ""), recordLookup);

  const parts = [];
  let lastIndex = 0;

  const regex =
    /%%RECORD_LINK_START%%(.*?)%%RECORD_LINK_END%%|\[([a-z_]+:\w[\w:-]*)\]/gi;

  raw.replace(regex, (match, recordPayload, citationRef, offset) => {
    const before = raw.slice(lastIndex, offset);
    if (before) {
      parts.push(renderInlineText(before));
    }

    if (recordPayload) {
      try {
        const parsed = JSON.parse(recordPayload);
        parts.push(
          renderLinkedRecordChip(
            parsed.label || "Open record",
            parsed.recordId || "",
            parsed.recordType || ""
          )
        );
      } catch {
        parts.push(renderInlineText(match));
      }
    } else if (citationRef) {
      const source =
        sourceMap.get(String(citationRef || "").toLowerCase()) || null;
      parts.push(renderCitationChip(citationRef, source));
    }

    lastIndex = offset + match.length;
    return match;
  });

  const tail = raw.slice(lastIndex);
  if (tail) {
    parts.push(renderInlineText(tail));
  }

  return parts.join("");
}

function renderAssistantRichText(text = "") {
  const sourceMap = buildSourceMap();
  const lines = String(text || "").split("\n");
  const blocks = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      `<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = String(rawLine || "").trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(
        renderParagraphWithCitations(trimmed.replace(/^[-*]\s+/, ""), sourceMap)
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushList();
      blocks.push(
        `<p><strong>${renderParagraphWithCitations(
          trimmed.replace(/^(\d+\.)\s+/, "$1 ")
        )}</strong></p>`
      );
      continue;
    }

    flushList();
    blocks.push(`<p>${renderParagraphWithCitations(trimmed, sourceMap)}</p>`);
  }

  flushList();

  return blocks.join("") || "<p></p>";
}

function renderUserRichText(text = "") {
  return `<p>${escapeHtml(String(text || ""))}</p>`;
}

function renderEvidenceBadge(message = {}) {
  const citations = Array.isArray(message.citations) ? message.citations : [];
  const actions = Array.isArray(message.actions) ? message.actions : [];
  const intent = message.intent ? escapeHtml(String(message.intent)) : "";
  const parts = [];

  if (intent) {
    parts.push(`<span class="meta-chip meta-chip--soft">${intent}</span>`);
  }

  if (citations.length) {
    parts.push(
      `<span class="meta-chip meta-chip--soft">${escapeHtml(
        String(citations.length)
      )} source${citations.length === 1 ? "" : "s"}</span>`
    );
  }

  if (actions.length) {
    parts.push(
      `<span class="meta-chip meta-chip--soft">${escapeHtml(
        String(actions.length)
      )} action${actions.length === 1 ? "" : "s"}</span>`
    );
  }

  if (!parts.length) return "";
  return `<div class="assistant-message-meta-row">${parts.join("")}</div>`;
}

function renderStreamingIndicator(message = {}) {
  const isStreaming =
    message.status === "streaming" || Boolean(message._streaming);

  if (!isStreaming) return "";

  return `
    <div class="assistant-message-streaming" aria-live="polite">
      <span class="assistant-message-streaming-dot"></span>
      <span>Streaming response…</span>
    </div>
  `;
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass =
    role === "user" ? "assistant-message-user" : "assistant-message-system";
  const content = extractAssistantContent(message);

  return `
    <article
      class="assistant-message ${escapeHtml(roleClass)}"
      data-message-id="${escapeHtml(String(message.id || ""))}"
      data-message-status="${escapeHtml(String(message.status || "complete"))}"
    >
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      ${renderEvidenceBadge(message)}
      <div class="assistant-message-body">
        ${
          role === "assistant"
            ? renderAssistantRichText(content)
            : renderUserRichText(content)
        }
      </div>
      ${renderStreamingIndicator(message)}
    </article>
  `;
}

function buildIntroMessageHtml() {
  const scope = getCurrentScope();
  const sectionTitle = getReadableSectionLabel();
  const sectionSubtitle = getReadableSectionSubtitle();

  return `
    <div class="assistant-helper-text">
      ${
        scope === "child"
          ? state.youngPersonId
            ? `
              <p><strong>Ask about ${escapeHtml(getPersonLabel())}.</strong></p>
              <p>You are in <strong>${escapeHtml(sectionTitle)}</strong>.</p>
              ${sectionSubtitle ? `<p>${escapeHtml(sectionSubtitle)}</p>` : ""}
            `
            : `<p>Select a child or young person to begin.</p>`
          : scope === "home"
            ? `
              <p><strong>Ask about ${escapeHtml(getHomeLabel())}.</strong></p>
              <p>You are in <strong>${escapeHtml(sectionTitle)}</strong>.</p>
              ${sectionSubtitle ? `<p>${escapeHtml(sectionSubtitle)}</p>` : ""}
            `
            : `
              <p><strong>Ask about quality and oversight.</strong></p>
              <p>You are in <strong>${escapeHtml(sectionTitle)}</strong>.</p>
              ${sectionSubtitle ? `<p>${escapeHtml(sectionSubtitle)}</p>` : ""}
            `
      }
    </div>
  `;
}

function shouldStickToBottom(host) {
  if (!host) return false;
  const threshold = 48;
  return host.scrollHeight - host.scrollTop - host.clientHeight <= threshold;
}

function renderMessageList(host, messages = []) {
  if (!host) return;

  const shouldAutoScroll = shouldStickToBottom(host) || state.assistantAutoScroll;

  host.innerHTML = `
    ${!messages.length ? buildIntroMessageHtml() : ""}
    <div class="assistant-history">
      ${messages.map((message) => renderMessage(message)).join("")}
    </div>
  `;

  if (shouldAutoScroll) {
    host.scrollTop = host.scrollHeight;
  }
}

function renderMessages() {
  ensureAssistantState();

  renderMessageList(
    resolveEl(els.assistantMessages, "assistantMessages"),
    state.assistantMessages
  );
}

function renderScopeBadges() {
  const scope = getCurrentScope();
  const homeName = getHomeLabel();
  const childName = getPersonLabel();
  const section = getReadableSectionLabel();

  const scopeBadge = resolveEl(els.scopeBadge, "scopeBadge");
  const homeBadge = resolveEl(els.scopeHomeBadge, "scopeHomeBadge");
  const childBadge = resolveEl(els.scopeChildBadge, "scopeChildBadge");
  const shiftBadge = resolveEl(els.scopeShiftBadge, "scopeShiftBadge");

  if (scopeBadge) {
    scopeBadge.textContent = getScopeLabel();
  }

  if (homeBadge) {
    const showHome = scope !== "child";
    homeBadge.textContent = showHome ? homeName : "";
    homeBadge.classList.toggle("hidden", !showHome);
  }

  if (childBadge) {
    const showChild = scope === "child" && Boolean(state.youngPersonId);
    childBadge.textContent = showChild ? childName : "";
    childBadge.classList.toggle("hidden", !showChild);
  }

  if (shiftBadge) {
    shiftBadge.textContent = section;
    shiftBadge.classList.toggle("hidden", !section);
  }
}

function renderContextText() {
  const scope = getCurrentScope();
  const section = getReadableSectionLabel();
  const contextEl = resolveEl(els.assistantContext, "assistantContext");

  if (!contextEl) return;

  if (scope === "child") {
    contextEl.textContent = state.youngPersonId
      ? `${getPersonLabel()} • ${section}`
      : "No child selected.";
    return;
  }

  if (scope === "home") {
    contextEl.textContent = `${getHomeLabel()} • ${section}`;
    return;
  }

  const homeIds = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
    : [];

  contextEl.textContent =
    state.userRole === "ri" || state.userRole === "admin"
      ? `Provider quality view • ${homeIds.length || 1} home(s) • ${section}`
      : `${getHomeLabel()} • quality • ${section}`;
}

function renderEvidenceKindPill(kind = "direct") {
  const safeKind = String(kind || "direct").toLowerCase();
  const label =
    safeKind === "inference"
      ? "Pattern"
      : safeKind === "action"
        ? "Action"
        : "Evidence";

  return `<span class="meta-chip meta-chip--soft">${escapeHtml(label)}</span>`;
}

function renderSourcesHtml(sources = []) {
  if (!Array.isArray(sources) || !sources.length) {
    return `<p class="assistant-muted">No sources yet.</p>`;
  }

  return `
    <div class="assistant-source-list assistant-source-list--simple">
      ${sources
        .map((source, index) => {
          const citationRef = sourceCitationRef(source, index);
          const title = escapeHtml(
            source?.title ||
              source?.label ||
              source?.document_title ||
              source?.name ||
              "Source"
          );

          const meta = [
            source?.record_type || source?.type || "",
            source?.section || "",
            source?.created_at
              ? new Date(source.created_at).toLocaleDateString("en-GB")
              : "",
          ]
            .filter(Boolean)
            .map((item) => escapeHtml(String(item)))
            .join(" • ");

          const description = escapeHtml(
            String(
              source?.description || source?.excerpt || source?.summary || ""
            )
          );

          return `
            <button
              class="assistant-source-row"
              id="${sourceSafeDomId(citationRef)}"
              type="button"
              data-source-ref="${escapeHtml(citationRef)}"
              data-linked-record-id="${escapeHtml(
                String(source?.record_id || source?.id || source?.source_id || "")
              )}"
              data-linked-record-type="${escapeHtml(
                String(source?.record_type || source?.type || "")
              )}"
            >
              <div class="assistant-source-row-top">
                <strong>${title}</strong>
                <span>${escapeHtml(citationRef)}</span>
              </div>
              <div class="assistant-source-row-meta-wrap">
                ${source?.evidence_kind ? renderEvidenceKindPill(source.evidence_kind) : ""}
                ${
                  meta
                    ? `<div class="assistant-source-row-meta">${meta}</div>`
                    : ""
                }
              </div>
              ${
                description
                  ? `<div class="assistant-source-row-text">${description}</div>`
                  : ""
              }
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStandaloneSources() {
  const html = renderSourcesHtml(getSources());
  const sourcesEl = resolveEl(els.assistantSources, "assistantSources");
  if (sourcesEl) sourcesEl.innerHTML = html;
}

function renderSuggestedActions() {
  const meta = getAssistantMeta();
  const actions = Array.isArray(meta.suggested_actions)
    ? meta.suggested_actions
    : [];
  const host = resolveEl(els.assistantSuggestions, "assistantSuggestions");

  if (!host) return;

  if (!actions.length) {
    host.innerHTML = `<span class="chip">No actions yet</span>`;
    return;
  }

  host.innerHTML = actions
    .map((action) => {
      const label =
        typeof action === "string"
          ? action
          : action?.label || action?.title || action?.type || "Action";

      const actionType =
        typeof action === "string"
          ? ""
          : action?.action_type || action?.type || "create_record";

      const recordType =
        typeof action === "string"
          ? ""
          : action?.record_type || action?.target_record_type || "";

      return `
        <button
          class="chip assistant-action-chip"
          type="button"
          data-suggestion-action
          data-action-type="${escapeHtml(String(actionType))}"
          data-record-type="${escapeHtml(String(recordType))}"
          data-title="${escapeHtml(String(label))}"
        >
          ${escapeHtml(String(label))}
        </button>
      `;
    })
    .join("");
}

function renderScopeSummary() {
  const host = resolveEl(els.assistantScopeSummary, "assistantScopeSummary");
  const meta = getAssistantMeta();
  const runtime = meta.runtime || {};
  const context = meta.assistant_context || {};

  const html = `
    <div class="assistant-scope-summary">
      <div class="assistant-scope-summary-row">
        <span>Scope</span>
        <strong>${escapeHtml(getScopeLabel())}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Section</span>
        <strong>${escapeHtml(getReadableSectionLabel())}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Evidence</span>
        <strong>${escapeHtml(String(runtime.evidence_count || 0))}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Mode</span>
        <strong>${escapeHtml(
          String(runtime.retrieval_mode || context.requested_scope_mode || getCurrentScope())
        )}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Intent</span>
        <strong>${escapeHtml(String(runtime.assistant_intent || meta.intent || "unknown"))}</strong>
      </div>
    </div>
  `;

  if (host) host.innerHTML = html;
}

function renderRuntimeAndExplainability() {
  const meta = getAssistantMeta();

  if (els.assistantRuntime) {
    els.assistantRuntime.textContent = JSON.stringify(meta.runtime || {}, null, 2);
  }

  if (els.assistantExplainability) {
    els.assistantExplainability.textContent = JSON.stringify(
      meta.explainability || {},
      null,
      2
    );
  }
}

function syncAssistantVisibility() {
  const isOpen = Boolean(state.assistantOpen);

  if (els.assistantModal) {
    els.assistantModal.classList.toggle("hidden", !isOpen);
    els.assistantModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  if (els.assistantBackdrop) {
    els.assistantBackdrop.classList.toggle("hidden", !isOpen);
    els.assistantBackdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }
}

function syncAssistantSendButtons() {
  const sending = Boolean(state.assistantSending);
  if (els.assistantSendBtn) els.assistantSendBtn.disabled = sending;
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);
  if (els.assistantInput) els.assistantInput.disabled = disabled;
}

function renderLiveStatus() {
  const liveStatusEl = resolveEl(els.assistantLiveStatus, "assistantLiveStatus");
  if (!liveStatusEl) return;

  if (state.assistantSending) {
    liveStatusEl.textContent = "Assistant is analysing the current scope…";
    return;
  }

  const meta = getAssistantMeta();
  const lastAnalysisAt = meta.last_analysis_at;

  liveStatusEl.textContent = lastAnalysisAt
    ? `Assistant ready. Last analysis ${new Date(lastAnalysisAt).toLocaleString("en-GB")}.`
    : "Assistant ready.";
}

function renderBundleStatus() {
  const bundleStatusEl = resolveEl(
    els.assistantScopeBundleStatus,
    "assistantScopeBundleStatus"
  );
  const bundleErrorEl = resolveEl(
    els.assistantScopeBundleError,
    "assistantScopeBundleError"
  );

  if (bundleStatusEl) {
    if (state.scopeBundleLoading) {
      bundleStatusEl.textContent = "Refreshing scoped records…";
    } else if (state.scopeBundleLoadedAt) {
      bundleStatusEl.textContent = `Scoped records loaded ${new Date(
        state.scopeBundleLoadedAt
      ).toLocaleString("en-GB")}.`;
    } else {
      bundleStatusEl.textContent = "No scoped records loaded.";
    }
  }

  if (bundleErrorEl) {
    const hasError = Boolean(state.scopeBundleError);
    bundleErrorEl.textContent = hasError ? String(state.scopeBundleError) : "";
    bundleErrorEl.classList.toggle("hidden", !hasError);
  }
}

function renderDerivedBriefs() {
  if (els.morningBriefBody) {
    els.morningBriefBody.innerHTML = state.latestMorningBrief
      ? `<div class="assistant-structured-answer">${renderAssistantRichText(
          String(state.latestMorningBrief)
        )}</div>`
      : `<p>No shift brief available yet.</p>`;
  }

  if (els.managerBriefBody) {
    els.managerBriefBody.innerHTML = state.latestManagerBrief
      ? `<div class="assistant-structured-answer">${renderAssistantRichText(
          String(state.latestManagerBrief)
        )}</div>`
      : `<p>No manager summary available yet.</p>`;
  }

  if (els.qualityBriefBody) {
    els.qualityBriefBody.innerHTML = state.latestQualityBrief
      ? `<div class="assistant-structured-answer">${renderAssistantRichText(
          String(state.latestQualityBrief)
        )}</div>`
      : `<p>No quality summary available yet.</p>`;
  }
}

function renderLiveUpdates() {
  if (!els.liveUpdatesBody) return;

  const updates = Array.isArray(state.liveUpdates) ? state.liveUpdates : [];

  if (!updates.length) {
    els.liveUpdatesBody.innerHTML = `<p>No live updates yet.</p>`;
    return;
  }

  els.liveUpdatesBody.innerHTML = `
    <div class="assistant-live-update-list">
      ${updates
        .map((update) => {
          const title = escapeHtml(String(update.title || "Update"));
          const body = escapeHtml(String(update.message || update.summary || ""));
          const timestamp = update.created_at
            ? new Date(update.created_at).toLocaleString("en-GB")
            : "";

          return `
            <article class="assistant-live-update-item">
              <strong>${title}</strong>
              ${timestamp ? `<div class="assistant-live-update-time">${escapeHtml(timestamp)}</div>` : ""}
              ${body ? `<p>${body}</p>` : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAllAssistantUi() {
  ensureAssistantState();
  getAssistantMeta();

  syncAssistantVisibility();
  syncAssistantSendButtons();
  syncAssistantInputs();
  renderScopeBadges();
  renderContextText();
  renderMessages();
  renderStandaloneSources();
  renderSuggestedActions();
  renderScopeSummary();
  renderRuntimeAndExplainability();
  renderLiveStatus();
  renderBundleStatus();
  renderDerivedBriefs();
  renderLiveUpdates();
}

function scrollSourceIntoView(ref = "") {
  if (!ref) return;

  const sourceEl = document.getElementById(sourceSafeDomId(ref));
  if (!sourceEl) return;

  sourceEl.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  sourceEl.classList.add("assistant-source-highlight");
  window.setTimeout(() => {
    sourceEl.classList.remove("assistant-source-highlight");
  }, 1200);
}

async function openLinkedRecord(recordId = "", recordType = "") {
  if (!recordId) return;

  try {
    const { openRecordDetail } = await import("./records.js");

    const numericId = Number(recordId);
    const safeId = Number.isNaN(numericId) ? recordId : numericId;

    state.activeRecordType = recordType || null;
    state.activeRecordItem = {
      id: safeId,
      source_id: safeId,
      record_id: safeId,
      record_type: recordType || "",
      title: "",
    };

    await openRecordDetail(state.activeRecordItem);
  } catch (error) {
    console.error("[assistant-ui] failed opening linked record", error);
  }
}

function bindCitationEvents() {
  if (citationEventsBound) return;
  citationEventsBound = true;

  document.addEventListener("click", async (event) => {
    const citation = event.target.closest("[data-citation-ref]");
    if (citation) {
      const ref = citation.getAttribute("data-citation-ref") || "";
      if (ref) scrollSourceIntoView(ref);
      return;
    }

    const linkedRecord = event.target.closest("[data-linked-record-id]");
    if (linkedRecord) {
      const recordId = linkedRecord.getAttribute("data-linked-record-id") || "";
      const recordType =
        linkedRecord.getAttribute("data-linked-record-type") || "";
      if (recordId) {
        await openLinkedRecord(recordId, recordType);
      }
      return;
    }

    const sourceRow = event.target.closest("[data-source-ref]");
    if (sourceRow) {
      const ref = sourceRow.getAttribute("data-source-ref") || "";
      if (ref) scrollSourceIntoView(ref);
    }
  });
}

export function bindAssistantUi() {
  if (assistantUiBound) return;
  assistantUiBound = true;

  bindCitationEvents();

  const messagesHost = resolveEl(els.assistantMessages, "assistantMessages");
  if (messagesHost) {
    messagesHost.addEventListener("scroll", () => {
      state.assistantAutoScroll = shouldStickToBottom(messagesHost);
    });
  }

  renderAllAssistantUi();
}

export function refreshAssistantUi() {
  renderAllAssistantUi();
}

export function appendAssistantSystemMessage(text, extra = {}) {
  ensureAssistantState();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    content: typeof text === "string" ? text : extractAssistantContent(text),
    created_at: new Date().toISOString(),
    status: extra.status || "complete",
    intent: extra.intent || null,
    citations: Array.isArray(extra.citations) ? extra.citations : [],
    actions: Array.isArray(extra.actions) ? extra.actions : [],
    scope_snapshot:
      extra.scope_snapshot && typeof extra.scope_snapshot === "object"
        ? extra.scope_snapshot
        : {
            scope: getCurrentScope(),
            section: getCurrentSection(),
          },
    _streaming: Boolean(extra._streaming),
  };

  state.assistantMessages.push(entry);
  refreshAssistantUi();
}

export function appendAssistantUserMessage(text, extra = {}) {
  ensureAssistantState();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content: String(text || ""),
    created_at: new Date().toISOString(),
    status: "complete",
    intent: extra.intent || null,
    citations: [],
    actions: [],
    scope_snapshot:
      extra.scope_snapshot && typeof extra.scope_snapshot === "object"
        ? extra.scope_snapshot
        : {
            scope: getCurrentScope(),
            section: getCurrentSection(),
          },
    _streaming: false,
  };

  state.assistantMessages.push(entry);
  refreshAssistantUi();
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  refreshAssistantUi();
}
