import { state, createAssistantMeta } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";
import { getSectionTitle, getSectionSubtitle } from "../core/config.js";

let assistantUiBound = false;
let citationEventsBound = false;

const RECORD_LINK_REGEX =
  /\b(incident|record|note|task|document|report|chronology|entry)\s+(number\s+)?(#?\d+)\b/gi;

const MAX_SOURCE_EXCERPT = 220;

function qs(id) {
  return document.getElementById(id);
}

function getEl(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const found = qs(candidate);
      if (found) return found;
      continue;
    }

    return candidate;
  }

  return null;
}

function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function ensureAssistantArrays() {
  if (!Array.isArray(state.assistantMessages)) {
    state.assistantMessages = [];
  }
}

function getAssistantMeta() {
  if (!state.assistantMeta || typeof state.assistantMeta !== "object") {
    state.assistantMeta = createAssistantMeta();
  }

  if (!Array.isArray(state.assistantMeta.sources)) {
    state.assistantMeta.sources = [];
  }

  if (!Array.isArray(state.assistantMeta.suggested_actions)) {
    state.assistantMeta.suggested_actions = [];
  }

  state.assistantMeta.runtime = state.assistantMeta.runtime || {};
  state.assistantMeta.explainability = state.assistantMeta.explainability || {};
  state.assistantMeta.assistant_scope =
    state.assistantMeta.assistant_scope || {};
  state.assistantMeta.assistant_context =
    state.assistantMeta.assistant_context || {};

  return state.assistantMeta;
}

function extractAssistantContent(message = {}) {
  if (typeof message === "string") return message;
  if (!message || typeof message !== "object") return "";

  const directCandidates = [
    message.content,
    message.text,
    message.message,
    message.response,
    message.answer,
    message.output,
    message.accumulated_text,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  if (message.content && typeof message.content === "object") {
    const content = message.content;
    const nestedCandidates = [
      content.text,
      content.message,
      content.response,
      content.answer,
      content.output,
      content.content,
      content.accumulated_text,
    ];

    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    if (Array.isArray(content.parts)) {
      const joined = content.parts
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part.text === "string") return part.text;
          if (part && typeof part.content === "string") return part.content;
          return "";
        })
        .filter(Boolean)
        .join("\n");

      if (joined.trim()) return joined;
    }
  }

  if (Array.isArray(message.parts)) {
    const joined = message.parts
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        if (part && typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");

    if (joined.trim()) return joined;
  }

  return "";
}

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function getPersonLabel() {
  const person = getCurrentPerson();
  return getDisplayName(person || {}) || "Child";
}

function getHomeLabel() {
  const person = getCurrentPerson() || {};
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
  return "Child assistant";
}

function getReadableSectionLabel() {
  return getSectionTitle(getCurrentSection()) || "Workspace";
}

function getReadableSectionSubtitle() {
  return getSectionSubtitle(getCurrentSection()) || "";
}

function sourceCitationRef(source = {}, index = 0) {
  if (source.citation_ref) return String(source.citation_ref);
  const type = source.record_type || source.type || "record";
  const id = source.record_id || source.id || `idx_${index + 1}`;
  return `${type}:${id}`;
}

function sourceSafeDomId(ref = "") {
  return `assistant-source-${String(ref).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getSources() {
  const meta = getAssistantMeta();
  return Array.isArray(meta.sources) ? meta.sources : [];
}

function buildSourceMap() {
  const map = new Map();

  getSources().forEach((source, index) => {
    const citationRef = sourceCitationRef(source, index);
    map.set(citationRef.toLowerCase(), {
      ...source,
      citation_ref: citationRef,
      source_index: index,
    });
  });

  return map;
}

function buildRecordLookupMap() {
  const map = new Map();

  getSources().forEach((source, index) => {
    const recordId =
      source?.record_id ||
      source?.id ||
      source?.source_id ||
      source?.linked_record_id ||
      null;

    if (!recordId) return;

    map.set(String(recordId), {
      ...source,
      citation_ref: sourceCitationRef(source, index),
    });
  });

  return map;
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

  return `
    <button
      class="assistant-citation-chip"
      type="button"
      data-citation-ref="${safeRef}"
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
      const source = sourceMap.get(String(citationRef || "").toLowerCase()) || null;
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

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass =
    role === "user" ? "assistant-message-user" : "assistant-message-system";
  const content = extractAssistantContent(message);

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      <div class="assistant-message-body">
        ${
          role === "assistant"
            ? renderAssistantRichText(content)
            : renderUserRichText(content)
        }
      </div>
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

function renderMessageList(host, messages = []) {
  if (!host) return;

  host.innerHTML = `
    ${!messages.length ? buildIntroMessageHtml() : ""}
    <div class="assistant-history">
      ${messages.map((message) => renderMessage(message)).join("")}
    </div>
  `;

  host.scrollTop = host.scrollHeight;
}

function renderMessages() {
  ensureAssistantArrays();

  renderMessageList(
    getEl(els.assistantMessages, "assistantMessages"),
    state.assistantMessages
  );
}

function renderScopeBadges() {
  const scope = getCurrentScope();
  const homeName = getHomeLabel();
  const childName = getPersonLabel();
  const section = getReadableSectionLabel();

  const scopeBadge = getEl(els.scopeBadge, "scopeBadge");
  const homeBadge = getEl(els.scopeHomeBadge, "scopeHomeBadge");
  const childBadge = getEl(els.scopeChildBadge, "scopeChildBadge");
  const shiftBadge = getEl(els.scopeShiftBadge, "scopeShiftBadge");

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
  const contextEl = getEl(els.assistantContext, "assistantContext");

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
            ).slice(0, MAX_SOURCE_EXCERPT)
          );

          return `
            <button
              class="assistant-source-row"
              id="${sourceSafeDomId(citationRef)}"
              type="button"
              data-source-ref="${escapeHtml(citationRef)}"
              data-linked-record-id="${escapeHtml(
                String(
                  source?.record_id || source?.id || source?.source_id || ""
                )
              )}"
              data-linked-record-type="${escapeHtml(
                String(source?.record_type || source?.type || "")
              )}"
            >
              <div class="assistant-source-row-top">
                <strong>${title}</strong>
                <span>${escapeHtml(citationRef)}</span>
              </div>
              ${
                meta
                  ? `<div class="assistant-source-row-meta">${meta}</div>`
                  : ""
              }
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
  const sourcesEl = getEl(els.assistantSources, "assistantSources");
  if (sourcesEl) sourcesEl.innerHTML = html;
}

function renderSuggestedActions() {
  const meta = getAssistantMeta();
  const actions = Array.isArray(meta.suggested_actions)
    ? meta.suggested_actions
    : [];
  const host = getEl(els.assistantSuggestions, "assistantSuggestions");

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
  const host = getEl(els.assistantScopeSummary, "assistantScopeSummary");
  const meta = getAssistantMeta();
  const runtime = meta.runtime || {};

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
        <strong>${escapeHtml(getCurrentScope())}</strong>
      </div>
    </div>
  `;

  if (host) host.innerHTML = html;
}

function renderRuntimeAndExplainability() {
  const meta = getAssistantMeta();

  if (els.assistantRuntime) {
    els.assistantRuntime.textContent = JSON.stringify(
      meta.runtime || {},
      null,
      2
    );
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

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = sending;
  }
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);

  if (els.assistantInput) {
    els.assistantInput.disabled = disabled;
  }
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

function renderAllAssistantUi() {
  ensureAssistantArrays();
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
}

export function bindAssistantUi() {
  if (assistantUiBound) return;
  assistantUiBound = true;
  bindCitationEvents();
  renderAllAssistantUi();
}

export function refreshAssistantUi() {
  renderAllAssistantUi();
}

export function appendAssistantSystemMessage(text) {
  ensureAssistantArrays();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "assistant",
    content: typeof text === "string" ? text : extractAssistantContent(text),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  renderAllAssistantUi();
}

export function appendAssistantUserMessage(text) {
  ensureAssistantArrays();

  const entry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    content: String(text || ""),
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  renderAllAssistantUi();
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  renderAllAssistantUi();
}

export function setAssistantSources(sources = []) {
  const meta = getAssistantMeta();
  meta.sources = Array.isArray(sources) ? sources : [];
  renderAllAssistantUi();
}

export function setAssistantRuntime(runtime = null) {
  const meta = getAssistantMeta();
  meta.runtime = runtime || {};
  renderAllAssistantUi();
}

export function setAssistantExplainability(explainability = null) {
  const meta = getAssistantMeta();
  meta.explainability = explainability || {};
  renderAllAssistantUi();
}

export function setAssistantScopeSummary(scopeSummary = null) {
  const meta = getAssistantMeta();
  meta.assistant_context = {
    ...(meta.assistant_context || {}),
    ...(scopeSummary || {}),
  };
  renderAllAssistantUi();
}
