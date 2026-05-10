import { state } from "../state.js";
import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { normaliseRecord } from "../core/record-normaliser.js";
import {
  ensureAssistantState,
  getAssistantMeta,
  getCurrentScope,
  getPersonLabel,
  getHomeLabel,
  getScopeLabel,
  getReadableSectionLabel,
  getReadableSectionSubtitle,
  extractAssistantContent,
  cloneAssistantMessage,
  sourceCitationRef,
  sourceSafeDomId,
  buildSourceMap,
  buildRecordLookupMap,
  RECORD_LINK_REGEX,
} from "../assistant/helpers.js";

let assistantUiBound = false;
let citationEventsBound = false;

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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getAssistantHistory() {
  ensureAssistantState();

  const main = Array.isArray(state.assistantMessages)
    ? state.assistantMessages
    : [];

  return main.map((entry) => cloneAssistantMessage(entry));
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
    if (before) parts.push(renderInlineText(before));

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
  if (tail) parts.push(renderInlineText(tail));

  return parts.join("");
}

const ASSISTANT_SECTION_HEADINGS = new Set([
  "overview",
  "key themes",
  "strengths and positives",
  "gaps or areas needing stronger evidence",
  "gaps or areas needing stronger evidence:",
  "what staff should be doing right now",
  "professional escalation to consider",
  "risk overview",
  "most relevant risk evidence",
  "immediate actions",
  "residential handover",
  "what matters at the start of the shift",
  "upcoming appointment",
  "what staff should do next",
  "manager oversight brief",
  "key oversight points",
  "management actions",
  "escalation and scrutiny",
  "quality and inspection-readiness brief",
  "inspection and scrutiny themes",
  "evidence gaps",
  "reg 45 review support",
  "progress, experience and positives",
  "themes requiring review",
  "evidence gaps to address before finalising the report",
  "try asking for",
]);

function isAssistantHeading(line = "") {
  return ASSISTANT_SECTION_HEADINGS.has(String(line || "").trim().toLowerCase());
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

    if (isAssistantHeading(trimmed)) {
      flushList();
      blocks.push(
        `<h4 class="assistant-answer-heading">${escapeHtml(trimmed)}</h4>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(
        renderParagraphWithCitations(trimmed.replace(/^[-*]\s+/, ""), sourceMap)
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(
        renderParagraphWithCitations(
          trimmed.replace(/^\d+\.\s+/, ""),
          sourceMap
        )
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

function formatRole(role = "") {
  if (role === "user") return "You";
  if (role === "assistant") return "Assistant";
  return "System";
}

function renderIntentPill(intent = "") {
  if (!intent) return "";
  return `<span class="meta-chip meta-chip--soft">${escapeHtml(
    String(intent).replaceAll("_", " ")
  )}</span>`;
}

function renderStatusPill(status = "") {
  if (!status) return "";
  const safeStatus = String(status).toLowerCase();

  let className = "meta-chip meta-chip--soft";
  if (safeStatus === "streaming") className = "meta-chip";
  if (safeStatus === "error") className = "meta-chip meta-chip--danger";
  if (safeStatus === "complete") className = "meta-chip meta-chip--success";

  return `<span class="${className}">${escapeHtml(safeStatus)}</span>`;
}

function renderMessageActions(actions = []) {
  if (!Array.isArray(actions) || !actions.length) return "";

  const chips = actions
    .map((action) => {
      if (typeof action === "string") {
        return `
          <button
            class="chip assistant-action-chip"
            type="button"
            data-assistant-chip="${escapeHtml(action)}"
          >
            ${escapeHtml(action)}
          </button>
        `;
      }

      const label = action?.label || action?.title || action?.type || "Action";
      const prompt = action?.prompt || action?.label || action?.title || "";

      return `
        <button
          class="chip assistant-action-chip"
          type="button"
          data-assistant-chip="${escapeHtml(String(prompt))}"
          data-action-type="${escapeHtml(String(action?.type || ""))}"
          data-record-type="${escapeHtml(String(action?.record_type || ""))}"
        >
          ${escapeHtml(String(label))}
        </button>
      `;
    })
    .join("");

  return `
    <div class="assistant-message-actions">
      ${chips}
    </div>
  `;
}

function renderMessageMeta(message = {}) {
  const pills = [
    renderIntentPill(message.intent),
    renderStatusPill(message.status),
  ]
    .filter(Boolean)
    .join("");

  if (!pills) return "";

  return `<div class="assistant-message-meta">${pills}</div>`;
}

function renderMessage(message = {}) {
  const role = message.role || "assistant";
  const roleClass =
    role === "user" ? "assistant-message-user" : "assistant-message-system";
  const content = extractAssistantContent(message);

  return `
    <article class="assistant-message ${escapeHtml(roleClass)}">
      <div class="assistant-message-role">${escapeHtml(formatRole(role))}</div>
      ${renderMessageMeta(message)}
      <div class="assistant-message-body">
        ${
          role === "assistant"
            ? renderAssistantRichText(content)
            : renderUserRichText(content)
        }
      </div>
      ${
        role === "assistant" &&
        Array.isArray(message.actions) &&
        message.actions.length
          ? renderMessageActions(message.actions)
          : ""
      }
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
  const messages = getAssistantHistory();
  renderMessageList(getEl(els.assistantMessages, "assistantMessages"), messages);
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

  if (scopeBadge) scopeBadge.textContent = getScopeLabel();

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

  const homeIds = Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : [];

  contextEl.textContent =
    state.userRole === "ri" || state.userRole === "admin"
      ? `Provider quality view • ${homeIds.length || 1} home(s) • ${section}`
      : `${getHomeLabel()} • quality • ${section}`;
}

function getAssistantSources() {
  const meta = getAssistantMeta() || {};
  return [
    ...safeArray(meta.sources),
    ...safeArray(meta.top_sources),
    ...safeArray(meta.runtime?.top_sources),
    ...safeArray(meta.assistant_insight_pack?.top_sources),
  ];
}

function renderSourcesHtml(sources = []) {
  if (!Array.isArray(sources) || !sources.length) {
    return `<p class="assistant-muted">No sources yet.</p>`;
  }

  const seen = new Set();
  const uniqueSources = sources.filter((source, index) => {
    const ref = sourceCitationRef(source, index);
    const key = String(ref || source?.id || source?.record_id || index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return `
    <div class="assistant-source-list assistant-source-list--simple">
      ${uniqueSources
        .map((source, index) => {
          const citationRef = sourceCitationRef(source, index);
          const normalised = normaliseRecord(source, source?.record_type || source?.type || "");
          const title = escapeHtml(
            normalised.title ||
              source?.title ||
              source?.label ||
              source?.document_title ||
              source?.name ||
              "Source"
          );

          const meta = [
            normalised.label || source?.record_type || source?.type || "",
            normalised.section || source?.section || "",
            source?.evidence_kind || "",
            normalised.date
              ? new Date(normalised.date).toLocaleDateString("en-GB")
              : source?.date || "",
            source?.created_at && !normalised.date
              ? new Date(source.created_at).toLocaleDateString("en-GB")
              : "",
          ]
            .filter(Boolean)
            .map((item) => escapeHtml(String(item)))
            .join(" • ");

          const description = escapeHtml(
            String(
              normalised.summary ||
                source?.description ||
                source?.excerpt ||
                source?.summary ||
                ""
            ).slice(0, 220)
          );

          return `
            <button
              class="assistant-source-row"
              id="${sourceSafeDomId(citationRef)}"
              type="button"
              data-source-ref="${escapeHtml(citationRef)}"
              data-linked-record-id="${escapeHtml(
                String(normalised.id || source?.record_id || source?.id || source?.source_id || "")
              )}"
              data-linked-record-type="${escapeHtml(
                String(normalised.type || source?.record_type || source?.type || "")
              )}"
            >
              <div class="assistant-source-row-top">
                <strong>${title}</strong>
                <span>${escapeHtml(citationRef)}</span>
              </div>
              ${meta ? `<div class="assistant-source-row-meta">${meta}</div>` : ""}
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
  const html = renderSourcesHtml(getAssistantSources());
  const sourcesEl = getEl(els.assistantSources, "assistantSources");
  if (sourcesEl) sourcesEl.innerHTML = html;
}

function actionToPrompt(action = "") {
  const label = String(action || "").trim();

  const map = {
    "Review safeguarding records":
      "Review safeguarding records and tell me what needs action.",
    "Draft handover": "Draft a residential handover for the next shift.",
    "Build quality brief": "Build a quality and inspection-readiness brief.",
    "Check inspection readiness":
      "Check inspection readiness and highlight evidence gaps.",
    "Review overdue items":
      "Review overdue items and list what needs owner, action and timescale.",
    "Check management actions":
      "Check management actions and tell me what needs management oversight.",
    "Draft summary": "Give me a full overview using the current evidence.",
  };

  return map[label] || label;
}

function renderSuggestedActions() {
  const meta = getAssistantMeta();
  const actions = [
    ...safeArray(meta.suggested_actions),
    ...safeArray(meta.actions),
    ...safeArray(meta.runtime?.suggested_actions),
  ];

  const host = getEl(els.assistantSuggestions, "assistantSuggestions");
  if (!host) return;

  if (!actions.length) {
    host.innerHTML = `<span class="chip">No actions yet</span>`;
    return;
  }

  const seen = new Set();

  host.innerHTML = actions
    .filter((action) => {
      const label =
        typeof action === "string"
          ? action
          : action?.label || action?.title || action?.type || "Action";
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .map((action) => {
      const label =
        typeof action === "string"
          ? action
          : action?.label || action?.title || action?.type || "Action";

      const prompt =
        typeof action === "string"
          ? actionToPrompt(action)
          : action?.prompt || actionToPrompt(action?.label || action?.title || "");

      const actionType =
        typeof action === "string"
          ? ""
          : action?.action_type || action?.type || "";

      const recordType =
        typeof action === "string"
          ? ""
          : action?.record_type || action?.target_record_type || "";

      return `
        <button
          class="chip assistant-action-chip"
          type="button"
          data-assistant-chip="${escapeHtml(String(prompt))}"
          data-action-type="${escapeHtml(String(actionType))}"
          data-record-type="${escapeHtml(String(recordType))}"
        >
          ${escapeHtml(String(label))}
        </button>
      `;
    })
    .join("");
}

function resolveEvidenceCount(meta = {}) {
  const runtime = safeObject(meta.runtime);
  const context = safeObject(meta.assistant_context);
  const liveSummary = safeObject(meta.live_summary);
  const brainSummary = safeObject(meta.brain_summary);

  return (
    runtime.evidence_count ||
    meta.evidence_count ||
    brainSummary.total ||
    liveSummary.evidence_count ||
    liveSummary.total ||
    context?.evidence_summary?.total ||
    safeArray(getAssistantSources()).length ||
    0
  );
}

function renderScopeSummary() {
  const host = getEl(els.assistantScopeSummary, "assistantScopeSummary");
  const meta = getAssistantMeta();
  const runtime = safeObject(meta.runtime);
  const context = safeObject(meta.assistant_context);

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
        <strong>${escapeHtml(String(resolveEvidenceCount(meta)))}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Mode</span>
        <strong>${escapeHtml(
          String(runtime.output_mode || meta.output_mode || getCurrentScope())
        )}</strong>
      </div>
      <div class="assistant-scope-summary-row">
        <span>Lens</span>
        <strong>${escapeHtml(
          String(
            runtime.analysis_lens ||
              context.analysis_lens ||
              meta.analysis_lens ||
              "general"
          )
        )}</strong>
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

  const modalSendBtn = qs("assistantModalSendBtn");
  if (modalSendBtn) modalSendBtn.disabled = sending;
}

function syncAssistantInputs() {
  const disabled = Boolean(state.assistantSending);

  if (els.assistantInput) els.assistantInput.disabled = disabled;

  const modalInput = qs("assistantModalInput");
  if (modalInput) modalInput.disabled = disabled;
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

    const normalised = normaliseRecord(
      {
        id: safeId,
        source_id: safeId,
        record_id: safeId,
        record_type: recordType || "",
        title: "",
      },
      recordType
    );

    state.activeRecordType = normalised.type || recordType || null;
    state.activeRecordItem = normalised;

    await openRecordDetail(normalised);
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
      if (recordId) await openLinkedRecord(recordId, recordType);
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
  ensureAssistantState();

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

export function onAssistantScopeChanged(scope = null, section = null) {
  try {
    renderAllAssistantUi();

    window.dispatchEvent(
      new CustomEvent("indicare:assistant-scope-changed", {
        detail: {
          scope: scope || state.currentScope || "child",
          section:
            section ||
            state.currentSection ||
            state.activeSection ||
            state.currentView ||
            "",
          timestamp: new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.warn("[assistant-ui] failed handling assistant scope change", error);
  }
}

export function appendAssistantSystemMessage(text, extra = {}) {
  ensureAssistantState();

  const entry = cloneAssistantMessage({
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
        : null,
    _streaming: Boolean(extra._streaming),
  });

  if (!Array.isArray(state.assistantMessages)) state.assistantMessages = [];
  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(cloneAssistantMessage(entry));
  renderAllAssistantUi();
}

export function appendAssistantUserMessage(text, extra = {}) {
  ensureAssistantState();

  const entry = cloneAssistantMessage({
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
        : null,
  });

  if (!Array.isArray(state.assistantMessages)) state.assistantMessages = [];
  if (!Array.isArray(state.assistantModalMessages)) {
    state.assistantModalMessages = [];
  }

  state.assistantMessages.push(entry);
  state.assistantModalMessages.push(cloneAssistantMessage(entry));
  renderAllAssistantUi();
}

export function clearAssistantMessages() {
  state.assistantMessages = [];
  state.assistantModalMessages = [];
  renderAllAssistantUi();
}
