/* Standalone IndiCare Assistant cockpit runtime.
   This file intentionally uses only /assistant/general/stream and does not load
   child, home, chronology or OS workspace context. */

(function () {
  const SURFACE = "standalone";
  const STORAGE_KEY = "indicare_standalone_assistant_conversations";
  const ACTIVE_KEY = "indicare_standalone_assistant_active";
  const MAX_HISTORY_ITEMS = 12;

  const $ = (id) => document.getElementById(id);

  const state = {
    conversations: [],
    activeConversationId: null,
    attachedDocument: null,
    isStreaming: false,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value || "");
    } catch (_) {
      return fallback;
    }
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getCookie(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp("(^|;\\s*)" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  function csrfHeaders(method, headers) {
    const next = { ...(headers || {}) };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) {
      const token = getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf");
      if (token) next["X-CSRF-Token"] = token;
    }
    return next;
  }

  function loadState() {
    state.conversations = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(state.conversations)) state.conversations = [];
    state.activeConversationId = localStorage.getItem(ACTIVE_KEY) || null;
    if (!state.conversations.some((conversation) => conversation.id === state.activeConversationId)) {
      state.activeConversationId = state.conversations[0]?.id || null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations.slice(0, 80)));
    if (state.activeConversationId) {
      localStorage.setItem(ACTIVE_KEY, state.activeConversationId);
    }
  }

  function activeConversation() {
    if (!state.activeConversationId) return null;
    return state.conversations.find((conversation) => conversation.id === state.activeConversationId) || null;
  }

  function ensureConversation() {
    let conversation = activeConversation();
    if (conversation) return conversation;

    conversation = {
      id: makeId("standalone"),
      title: "New conversation",
      surface: SURFACE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      sources: [],
    };
    state.conversations.unshift(conversation);
    state.activeConversationId = conversation.id;
    saveState();
    renderHistory();
    return conversation;
  }

  function conversationTitleFrom(text) {
    const clean = String(text || "")
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return "New conversation";
    return clean.split(" ").slice(0, 6).join(" ");
  }

  function setChatActive(active) {
    const root = $("icCockpit");
    if (!root) return;
    root.classList.toggle("ic-chat-active", !!active);
    const messages = $("messages");
    if (messages) messages.classList.toggle("hidden", !active);
  }

  function renderMarkdownLite(text) {
    const escaped = escapeHtml(text || "");
    const lines = escaped.split("\n");
    let html = "";
    let inList = false;

    for (const line of lines) {
      if (/^\s*[-*]\s+/.test(line)) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`;
        continue;
      }

      if (inList) {
        html += "</ul>";
        inList = false;
      }

      if (/^#{1,3}\s+/.test(line)) {
        html += `<h3>${line.replace(/^#{1,3}\s+/, "")}</h3>`;
      } else if (line.trim()) {
        html += `<p>${line}</p>`;
      } else {
        html += "<br>";
      }
    }

    if (inList) html += "</ul>";
    return html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function messageElement(message, index) {
    const role = message.role === "user" ? "user" : "assistant";
    const label = role === "user" ? "You" : "IC";
    return `
      <div class="wrap ${role}" data-message-index="${index}">
        <div class="avatar">${label}</div>
        <div class="block">
          <div class="msg">${renderMarkdownLite(message.content)}</div>
          ${message.pending ? '<div class="meta">Writing...</div>' : ''}
        </div>
      </div>
    `;
  }

  function renderMessages() {
    const conversation = activeConversation();
    const messages = $("messages");
    if (!messages) return;

    if (!conversation || conversation.messages.length === 0) {
      messages.innerHTML = "";
      setChatActive(false);
      return;
    }

    setChatActive(true);
    messages.innerHTML = conversation.messages.map(messageElement).join("");
    messages.scrollTop = messages.scrollHeight;
  }

  function renderHistory() {
    const history = $("history");
    if (!history) return;

    if (!state.conversations.length) {
      history.innerHTML = '<div class="ic-brand-sub">No conversations yet.</div>';
      return;
    }

    history.innerHTML = state.conversations.map((conversation) => `
      <div class="item ${conversation.id === state.activeConversationId ? "active" : ""}" data-conversation-id="${conversation.id}">
        <div class="row">
          <button class="mainbtn" type="button" data-open-conversation="${conversation.id}">
            <div class="ttl">${escapeHtml(conversation.title || "Conversation")}</div>
          </button>
          <button class="mini" type="button" data-rename-conversation="${conversation.id}" title="Rename">✎</button>
          <button class="mini danger" type="button" data-delete-conversation="${conversation.id}" title="Delete">×</button>
        </div>
      </div>
    `).join("");
  }

  function renderSources(sources) {
    const list = $("standaloneSourceList");
    if (!list) return;

    const clean = Array.isArray(sources) ? sources.filter(Boolean) : [];

    if (!clean.length) {
      list.innerHTML = `
        <article class="ic-citation"><small>Standalone boundary</small><strong>No OS records loaded</strong><p>This assistant page does not show live child, home, chronology or safeguarding workspace records.</p><span class="ic-rel">Privacy boundary</span></article>
        <article class="ic-citation"><small>Document-aware mode</small><strong>Upload or library sources</strong><p>Attach a document or search your approved library to ground responses in available material.</p><span class="ic-rel">Available when provided</span></article>
        <article class="ic-citation"><small>Regulatory answers</small><strong>Quote, name and label sources</strong><p>When regulations are requested, the assistant should name the regulation and clearly separate quoted wording from explanation.</p><span class="ic-rel">Answer policy</span></article>
      `;
      return;
    }

    list.innerHTML = clean.map((source, index) => {
      const title = source.title || source.label || source.document_title || source.name || `Source ${index + 1}`;
      const type = source.type || source.source_type || source.record_type || "Source";
      const excerpt = source.excerpt || source.summary || source.text || source.description || "Source returned by assistant runtime.";
      const ref = source.citation_ref || source.reference || source.record_id || `source:${index + 1}`;
      return `
        <article class="ic-citation">
          <small>${escapeHtml(type)}</small>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(excerpt)}</p>
          <span class="ic-rel">${escapeHtml(ref)}</span>
        </article>
      `;
    }).join("");
  }

  function buildHistoryForApi(conversation) {
    return (conversation?.messages || [])
      .filter((message) => !message.pending)
      .slice(-MAX_HISTORY_ITEMS)
      .map((message) => ({ role: message.role, content: message.content }));
  }

  function appendMessage(role, content, extra) {
    const conversation = ensureConversation();
    conversation.messages.push({
      role,
      content: String(content || ""),
      createdAt: new Date().toISOString(),
      ...(extra || {}),
    });
    conversation.updatedAt = new Date().toISOString();
    if (role === "user" && (!conversation.title || conversation.title === "New conversation")) {
      conversation.title = conversationTitleFrom(content);
    }
    saveState();
    renderHistory();
    renderMessages();
    return conversation.messages.length - 1;
  }

  function updateMessage(index, content, extra) {
    const conversation = activeConversation();
    if (!conversation || !conversation.messages[index]) return;
    conversation.messages[index] = {
      ...conversation.messages[index],
      content: String(content || ""),
      ...(extra || {}),
    };
    conversation.updatedAt = new Date().toISOString();
    saveState();
    renderMessages();
  }

  function clearStandaloneContext() {
    try {
      localStorage.removeItem("indicare_workspace_context");
      localStorage.removeItem("indicare_context_state");
      sessionStorage.removeItem("indicare_workspace_context");
      sessionStorage.removeItem("indicare_context_state");
    } catch (_) {}
  }

  function standaloneSystemPrefix() {
    return [
      "STANDALONE ASSISTANT BOUNDARY:",
      "This request is from /assistant, the standalone external assistant surface.",
      "Do not use or infer any child, home, chronology, inspection dashboard, placement, or OS operational record context unless the user has explicitly provided that information in this chat or an uploaded document.",
      "If answering about regulations or statutory guidance, name the source, quote relevant wording where appropriate, and clearly label quotes separately from explanation.",
      "Use British English and professional children’s residential care language.",
    ].join("\n");
  }

  async function readAttachedFile(file) {
    if (!file) return null;
    const allowedText = /^(text\/|application\/json)/.test(file.type || "") || /\.(txt|md|csv|json)$/i.test(file.name || "");
    if (!allowedText) {
      return {
        name: file.name,
        text: "",
        unsupported: true,
      };
    }
    const text = await file.text();
    return {
      name: file.name,
      text: text.slice(0, 12000),
      unsupported: false,
    };
  }

  async function sendMessage() {
    if (state.isStreaming) return;
    const input = $("input");
    if (!input) return;

    const raw = input.value.trim();
    if (!raw && !state.attachedDocument) return;

    clearStandaloneContext();
    const conversation = ensureConversation();
    const attachmentBlock = state.attachedDocument?.text
      ? `\n\nATTACHED DOCUMENT (${state.attachedDocument.name}):\n${state.attachedDocument.text}`
      : state.attachedDocument?.unsupported
        ? `\n\nThe user attached ${state.attachedDocument.name}, but the browser could not read this file directly. Ask them to paste relevant text or use supported upload handling.`
        : "";

    const userText = raw || `Please review the attached document: ${state.attachedDocument?.name || "document"}`;
    const apiMessage = `${standaloneSystemPrefix()}\n\nUSER REQUEST:\n${userText}${attachmentBlock}`;

    appendMessage("user", userText);
    input.value = "";
    input.style.height = "auto";

    const assistantIndex = appendMessage("assistant", "", { pending: true });
    let assistantText = "";
    state.isStreaming = true;

    try {
      const response = await fetch("/assistant/general/stream", {
        method: "POST",
        credentials: "include",
        headers: csrfHeaders("POST", { "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: apiMessage,
          response_mode: "balanced",
          conversation_id: conversation.id,
          history: buildHistoryForApi(conversation),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Assistant request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const parsed = parseSse(part);
          if (!parsed) continue;

          if (parsed.event === "done") continue;
          if (parsed.event === "meta") {
            const meta = safeJsonParse(parsed.data, {});
            const sources = Array.isArray(meta.sources) ? meta.sources : [];
            conversation.sources = sources;
            renderSources(sources);
            continue;
          }
          if (parsed.event === "progress") continue;

          if (parsed.data) {
            assistantText += parsed.data;
            updateMessage(assistantIndex, assistantText, { pending: true });
          }
        }
      }

      updateMessage(assistantIndex, assistantText || "I could not generate a response just now.", { pending: false });
      clearAttachment();
    } catch (error) {
      console.error(error);
      updateMessage(
        assistantIndex,
        "Sorry, I could not reach the standalone assistant just now. Please try again.",
        { pending: false }
      );
    } finally {
      state.isStreaming = false;
    }
  }

  function parseSse(chunk) {
    const lines = String(chunk || "").split("\n");
    let event = "message";
    const data = [];
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return { event, data: data.join("\n") };
  }

  function newConversation() {
    const conversation = {
      id: makeId("standalone"),
      title: "New conversation",
      surface: SURFACE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      sources: [],
    };
    state.conversations.unshift(conversation);
    state.activeConversationId = conversation.id;
    saveState();
    renderHistory();
    renderMessages();
    renderSources([]);
  }

  function openConversation(id) {
    state.activeConversationId = id;
    saveState();
    renderHistory();
    renderMessages();
    renderSources(activeConversation()?.sources || []);
  }

  function deleteConversation(id) {
    state.conversations = state.conversations.filter((conversation) => conversation.id !== id);
    if (state.activeConversationId === id) {
      state.activeConversationId = state.conversations[0]?.id || null;
    }
    saveState();
    renderHistory();
    renderMessages();
    renderSources(activeConversation()?.sources || []);
  }

  function renameConversation(id) {
    const conversation = state.conversations.find((item) => item.id === id);
    if (!conversation) return;
    const title = prompt("Conversation title", conversation.title || "Conversation");
    if (!title) return;
    conversation.title = title.trim();
    conversation.updatedAt = new Date().toISOString();
    saveState();
    renderHistory();
  }

  function clearAttachment() {
    state.attachedDocument = null;
    const doc = $("doc");
    const docText = $("docText");
    const upload = $("upload");
    if (doc) doc.classList.remove("show");
    if (docText) docText.textContent = "";
    if (upload) upload.value = "";
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    state.attachedDocument = await readAttachedFile(file);
    const doc = $("doc");
    const docText = $("docText");
    if (doc) doc.classList.add("show");
    if (docText) {
      docText.textContent = state.attachedDocument.unsupported
        ? `${file.name} attached - paste text for best results`
        : file.name;
    }
  }

  function quick(type) {
    const prompts = {
      policy: "Search policy and guidance for: ",
      incident: "Turn these rough notes into a clear, factual incident record: ",
      risk: "Create a structured risk summary covering risks, triggers, protective factors and actions for: ",
      handover: "Write a concise handover summary for: ",
      chronology: "Create a factual chronology-style summary from this information: ",
    };
    const input = $("input");
    if (!input) return;
    input.value = prompts[type] || "Help me with: ";
    input.focus();
    input.dispatchEvent(new Event("input"));
  }

  function bindEvents() {
    $("send")?.addEventListener("click", sendMessage);
    $("newChat")?.addEventListener("click", newConversation);
    $("clearDoc")?.addEventListener("click", clearAttachment);
    $("upload")?.addEventListener("change", handleUpload);

    $("input")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    $("input")?.addEventListener("input", (event) => {
      const target = event.target;
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
    });

    $("history")?.addEventListener("click", (event) => {
      const open = event.target.closest("[data-open-conversation]");
      const del = event.target.closest("[data-delete-conversation]");
      const rename = event.target.closest("[data-rename-conversation]");
      if (open) openConversation(open.getAttribute("data-open-conversation"));
      if (del) deleteConversation(del.getAttribute("data-delete-conversation"));
      if (rename) renameConversation(rename.getAttribute("data-rename-conversation"));
    });

    $("assistantSearch")?.addEventListener("input", (event) => {
      const q = String(event.target.value || "").toLowerCase();
      document.querySelectorAll("#history .item").forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });

    $("search")?.addEventListener("input", (event) => {
      const q = String(event.target.value || "").toLowerCase();
      document.querySelectorAll("#history .item").forEach((item) => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  function hydrateUser() {
    const first = localStorage.getItem("first_name") || "there";
    const last = localStorage.getItem("last_name") || "";
    const role = localStorage.getItem("role") || "Standalone";
    const full = [first, last].filter(Boolean).join(" ").trim();
    const welcome = $("welcomeTitle");
    if (welcome) welcome.textContent = `Good ${timeOfDay()}, ${first}.`;
    const user = $("icUserName");
    if (user) user.textContent = full || "Assistant user";
    const userRole = $("icUserRole");
    if (userRole) userRole.textContent = role;
    const avatar = $("icUserAvatar");
    if (avatar) avatar.textContent = ((first[0] || "I") + (last[0] || "C")).toUpperCase();
  }

  function timeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
  }

  function init() {
    clearStandaloneContext();
    loadState();
    hydrateUser();
    bindEvents();
    renderHistory();
    renderMessages();
    renderSources(activeConversation()?.sources || []);
  }

  window.quick = quick;
  window.addEventListener("DOMContentLoaded", init);
})();
