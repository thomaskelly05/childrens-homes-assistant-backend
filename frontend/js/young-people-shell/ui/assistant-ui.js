import { state, createAssistantMeta } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml, getDisplayName } from "../core/utils.js";

let assistantUiBound = false;
let citationEventsBound = false;

const CITATION_REF_REGEX = /\[([a-z_]+:\w[\w:-]*)\]/gi;
const MAX_SOURCE_EXCERPT = 240;

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

  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
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
  state.assistantMeta.assistant_scope = state.assistantMeta.assistant_scope || {};
  state.assistantMeta.assistant_context =
    state.assistantMeta.assistant_context || {};

  return state.assistantMeta;
}

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function normaliseSectionLabel(section = "") {
  return String(section || "workspace")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
}

function getPersonLabel() {
  const person = getCurrentPerson();
  return getDisplayName(person || {}) || "Young person";
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
  return "Young person assistant";
}

function sourceCitationRef(source = {}, index = 0) {
  if (source.citation_ref) return String(source.citation_ref);
  const type = source.record_type || source.type || "record";
  const id = source.record_id || source.id || `idx_${index + 1}`;
  return `${type}:${id}`;
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

function renderInlineText(text = "") {
  let html = escapeHtml(String(text || ""));
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  return html;
}

function renderCitationChip(ref = "", source = null) {
  const safeRef = escapeHtml(ref);
  const label = source?.label || source?.title || ref;
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

function renderParagraphWithCitations(text = "", sourceMap = new Map()) {
  const raw = String(text || "");
  const parts = [];
  let lastIndex = 0;

  raw.replace(CITATION_REF_REGEX, (match, ref, offset) => {
    const before = raw.slice(lastIndex, offset);
    if (before) {
      parts.push(renderInlineText(before));
    }

    const source = sourceMap.get(String(ref || "").toLowerCase()) || null;
    parts.push(renderCitationChip(ref, source));
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
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimRight();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushList();
      blocks.push(`<hr class="assistant-divider" />`);
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList();
      const heading = trimmed.replace(/^#{1,3}\s+/, "");
      blocks.push(`<h4>${renderParagraphWithCitations(heading, sourceMap)}</h4>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      listItems.push(renderParagraphWithCitations(itemText, sourceMap));
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

  try {
    return JSON.stringify(message, null, 2);
  } catch {
    return "";
  }
}

function renderMessageSources(sources = []) {
  if (!Array.isArray(sources) || !sources.length) return "";

  return `
    <div class="assistant-inline-sources">
      <div class="assistant-inline-sources-title">Sources</div>
      <div class="assistant-source-list">
        ${sources
          .map((source, index) => {
            const citationRef = sourceCitationRef(source, index);
            const title = escapeHtml(
              source?.title || source?.label || source?.document_title || "Source"
            );
            const type = escapeHtml(source?.type || source?.record_type || "source");
            const section = escapeHtml(source?.section || "");
            const description = escapeHtml(
              String(source?.description || source?.excerpt || source?.summary || "").slice(
                0,
                MAX_SOURCE_EXCERPT
              )
            );

            return `
              <div
                class="assistant-source-item"
                id="assistant-source-${escapeHtml(
                  citationRef.replace(/[^a-zA-Z0-9_-]/g, "-")
                )}"
                data-source-ref="${escapeHtml(citationRef)}"
              >
                <div class="assistant-source-item-title">${title}</div>
                <div class="assistant-source-item-meta">
                  ${type}${section ? ` • ${section}` : ""} • ${escapeHtml(citationRef)}
                </div>
                ${
                  description
                    ? `<div class="assistant-source-item-description">${description}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderMessage(message = {}, index = 0, messages = []) {
  const role = message.role || "assistant";
  const roleClass =
    role === "user" ? "assistant-message-user" : "assistant-message-system";
  const content = extractAssistantContent(message);

  const isLastAssistantMessage =
    role === "assistant" &&
    index ===
      [...messages]
        .map((item, i) => ({ item, i }))
        .filter(({ item }) => item?.role === "assistant")
        .map(({ i }) => i)
        .pop();

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
      ${isLastAssistantMessage ? renderMessageSources(getSources()) : ""}
    </article>
  `;
}

function buildIntroMessageHtml() {
  const scope = getCurrentScope();

  return `
    <div class="assistant-helper-text">
      ${
        scope === "child"
          ? state.youngPersonId
            ? `
              <p><strong>Ask about ${escapeHtml(getPersonLabel())}.</strong></p>
              <p>You can ask for a full summary, chronology, important dates, risks, appointments, family contact themes, or a handover.</p>
            `
            : `<p>Select a young person to start.</p>`
          : scope === "home"
          ? `
            <p><strong>Ask about ${escapeHtml(getHomeLabel())}.</strong></p>
            <p>You can ask for staffing, compliance, chronology, overdue items, management priorities, or a full home summary.</p>
          `
          : `
            <p><strong>Ask about ${escapeHtml(getHomeLabel())} quality and oversight.</strong></p>
            <p>You can ask for audit themes, compliance gaps, chronology, inspection readiness, or RI-focused summaries.</p>
          `
      }
    </div>
  `;
}

function renderMessageList(host, messages = []) {
  if (!host) return;

  const showIntro = !messages.length;

  host.innerHTML = `
    ${showIntro ? buildIntroMessageHtml() : ""}
    <div class="assistant-history">
      ${messages.map((message, index) => renderMessage(message, index, messages)).join("")}
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

  renderMessageList(
    getEl(els.assistantModalMessages, "assistantModalMessages"),
    state.assistantModalMessages
  );
}

function renderScopeBadges() {
  const scope = getCurrentScope();
  const homeName = getHomeLabel();
  const childName = getPersonLabel();
  const section = normaliseSectionLabel(getCurrentSection());

  const scopeBadge = getEl(els.scopeBadge, "scopeBadge");
  const homeBadge = getEl(els.scopeHomeBadge, "scopeHomeBadge");
  const childBadge = getEl(els.scopeChildBadge, "scopeChildBadge");
  const shiftBadge = getEl(els.scopeShiftBadge, "scopeShiftBadge");
  const modalHomeBadge = getEl(els.modalScopeHomeBadge, "modalScopeHomeBadge");
  const modalChildBadge = getEl(els.modalScopeChildBadge, "modalScopeChildBadge");

  if (scopeBadge) {
    scopeBadge.textContent = getScopeLabel();
  }

  if (homeBadge) {
    const showHome = scope === "home" || scope === "quality" || Boolean(homeName);
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

  if (modalHomeBadge) {
    const showHome = scope === "home" || scope === "quality" || Boolean(homeName);
    modalHomeBadge.textContent = showHome ? homeName : "";
    modalHomeBadge.classList.toggle("hidden", !showHome);
  }

  if (modalChildBadge) {
    const showChild = scope === "child" && Boolean(state.youngPersonId);
    modalChildBadge.textContent = showChild ? childName : "";
    modalChildBadge.classList.toggle("hidden", !showChild);
  }
}

function renderContextText() {
  const scope = getCurrentScope();
  const section = normaliseSectionLabel(getCurrentSection());
  const contextEl = getEl(els.assistantContext, "assistantContext");

  if (!contextEl) return;

  let contextText = "No context loaded.";

  if (scope === "child") {
    contextText = state.youngPersonId
      ? `Scoped to ${getPersonLabel()} • whole OS scope • section: ${section}`
      : "No young person selected.";
  } else if (scope === "home") {
    contextText = `Scoped to ${getHomeLabel()} • whole-home OS view • section: ${section}`;
  } else if (scope === "quality") {
    const homeIds = Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : [];
    contextText =
      state.userRole === "ri" || state.userRole === "admin"
        ? `Scoped to provider quality oversight • ${homeIds.length || 1} home(s) • section: ${section}`
        : `Scoped to ${getHomeLabel()} • quality and RI • section: ${section}`;
  }

  contextEl.textContent = contextText;
}

function renderSources() {
  const sourcesEl = getEl(els.assistantSources, "assistantSources");
  const modalSourcesEl = getEl(
    els.assistantModalSources,
    "assistantModalSources"
  );

  if (sourcesEl) {
    sourcesEl.innerHTML = "";
  }

  if (modalSourcesEl) {
    modalSourcesEl.innerHTML = "";
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
  }
}

function syncAssistantSendButtons() {
  const sending = Boolean(state.assistantSending);

  if (els.assistantSendBtn) {
    els.assistantSendBtn.disabled = sending;
  }

  if (els.assistantModalSendBtn) {
    els.assistantModalSendBtn.disabled = sending;
  }
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);

  if (els.assistantInput) {
    els.assistantInput.disabled = disabled;
  }

  if (els.assistantModalInput) {
    els.assistantModalInput.disabled = disabled;
  }
}

function scrollSourceIntoView(ref = "") {
  if (!ref) return;

  const safeId = `assistant-source-${String(ref).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const sourceEl = document.getElementById(safeId);

  if (!sourceEl) return;

  sourceEl.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  sourceEl.classList.add("assistant-source-highlight");
  window.setTimeout(() => {
    sourceEl.classList.remove("assistant-source-highlight");
  }, 1600);
}

function bindCitationEvents() {
  if (citationEventsBound) return;
  citationEventsBound = true;

  document.addEventListener("click", (event) => {
    const citation = event.target.closest("[data-citation-ref]");
    if (!citation) return;

    const ref = citation.getAttribute("data-citation-ref") || "";
    if (!ref) return;

    scrollSourceIntoView(ref);
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
  renderSources();
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
    content: text,
    created_at: new Date().toISOString(),
  };

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push({ ...entry });
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
  state.assistantModalMessages.push({ ...entry });
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
}

export function setAssistantExplainability(explainability = null) {
  const meta = getAssistantMeta();
  meta.explainability = explainability || {};
}

export function setAssistantScopeSummary(scopeSummary = null) {
  const meta = getAssistantMeta();
  meta.assistant_context = {
    ...(meta.assistant_context || {}),
    ...(scopeSummary || {}),
  };
  renderAllAssistantUi();
}
