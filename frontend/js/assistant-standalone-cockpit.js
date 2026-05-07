/* Standalone IndiCare Assistant runtime.
   Uses /assistant/general/stream and deliberately does not load OS child/home context. */

(function () {
  const SURFACE = "standalone";
  const STORAGE_KEY = "indicare_standalone_assistant_conversations";
  const ACTIVE_KEY = "indicare_standalone_assistant_active";
  const THEME_KEY = "indicare_assistant_theme";
  const USER_PROFILE_KEY = "indicare_assistant_user_profile";
  const EVIDENCE_COLLAPSED_KEY = "indicare_assistant_sources_collapsed";
  const MAX_HISTORY_ITEMS = 12;

  const $ = (id) => document.getElementById(id);

  const state = {
    conversations: [],
    activeConversationId: null,
    attachedDocument: null,
    isStreaming: false,
    isUploading: false,
    theme: "light",
    userProfile: { name: "Assistant user", role: "Standalone" },
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
    try { return JSON.parse(value || ""); } catch (_) { return fallback; }
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function showToast(text) {
    const existing = document.querySelector(".ic-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "ic-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
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

  function clearStandaloneContext() {
    try {
      localStorage.removeItem("indicare_workspace_context");
      localStorage.removeItem("indicare_context_state");
      sessionStorage.removeItem("indicare_workspace_context");
      sessionStorage.removeItem("indicare_context_state");
    } catch (_) {}
  }

  function standaloneSystemPrefix() {
    const profile = state.userProfile || {};
    const roleLine = profile.role ? `User role context: ${profile.role}.` : "";
    return [
      "STANDALONE ASSISTANT BOUNDARY:",
      "This request is from /assistant, the standalone assistant surface.",
      "Do not use, infer, or claim access to any live IndiCare OS young person, home, chronology, placement, safeguarding, inspection, or operational record data.",
      "Use only what the user writes in this conversation or what they attach/paste into this chat.",
      "If evidence is missing, say what is not visible rather than filling gaps.",
      "Use British English and professional children's residential care language.",
      "Do not make final safeguarding, legal, clinical, employment, or regulatory decisions. Frame actions for staff or manager review.",
      "If answering about regulations or statutory guidance, name the source and clearly separate quoted wording from explanation where relevant.",
      roleLine,
    ].filter(Boolean).join("\n");
  }

  function loadState() {
    state.conversations = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(state.conversations)) state.conversations = [];
    state.activeConversationId = localStorage.getItem(ACTIVE_KEY) || null;
    if (!state.conversations.some((conversation) => conversation.id === state.activeConversationId)) {
      state.activeConversationId = state.conversations[0]?.id || null;
    }

    const storedProfile = safeJsonParse(localStorage.getItem(USER_PROFILE_KEY), null);
    const first = localStorage.getItem("first_name") || "";
    const last = localStorage.getItem("last_name") || "";
    const role = localStorage.getItem("role") || "Standalone";
    state.userProfile = storedProfile || {
      name: [first, last].filter(Boolean).join(" ").trim() || "Assistant user",
      role,
    };

    state.theme = localStorage.getItem(THEME_KEY) || "light";
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations.slice(0, 80)));
    if (state.activeConversationId) localStorage.setItem(ACTIVE_KEY, state.activeConversationId);
    else localStorage.removeItem(ACTIVE_KEY);
  }

  function activeConversation() {
    return state.conversations.find((conversation) => conversation.id === state.activeConversationId) || null;
  }

  function createConversation() {
    const conversation = {
      id: makeId("standalone"),
      title: "New chat",
      surface: SURFACE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      sources: [],
    };
    state.conversations.unshift(conversation);
    state.activeConversationId = conversation.id;
    saveState();
    return conversation;
  }

  function ensureConversation() { return activeConversation() || createConversation(); }

  function conversationTitleFrom(text) {
    const clean = String(text || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
    return clean ? clean.split(" ").slice(0, 7).join(" ") : "New chat";
  }

  function setChatActive(active) {
    $("icCockpit")?.classList.toggle("ic-chat-active", !!active);
    $("messages")?.classList.toggle("hidden", !active);
  }

  function renderMarkdownLite(text) {
    const escaped = escapeHtml(text || "");
    const linked = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const lines = linked.split("\n");
    let html = "";
    let inList = false;

    for (const line of lines) {
      if (/^\s*[-*•]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${line.replace(/^\s*[-*•]\s+/, "")}</li>`;
        continue;
      }
      if (inList) { html += "</ul>"; inList = false; }
      if (/^#{1,3}\s+/.test(line)) html += `<h3>${line.replace(/^#{1,3}\s+/, "")}</h3>`;
      else if (line.trim()) html += `<p>${line}</p>`;
      else html += "<br>";
    }
    if (inList) html += "</ul>";
    return html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function messageElement(message, index) {
    const role = message.role === "user" ? "user" : "assistant";
    const label = role === "user" ? "You" : "IC";
    const pending = message.pending ? '<div class="meta">Writing...</div>' : "";
    return `
      <div class="wrap ${role}" data-message-index="${index}">
        <div class="avatar">${label}</div>
        <div class="block">
          <div class="msg">${renderMarkdownLite(message.content)}</div>
          ${pending}
        </div>
      </div>`;
  }

  function renderMessages() {
    const conversation = activeConversation();
    const messages = $("messages");
    if (!messages) return;
    if (!conversation || !conversation.messages.length) {
      messages.innerHTML = "";
      setChatActive(false);
      return;
    }
    setChatActive(true);
    messages.innerHTML = conversation.messages.map(messageElement).join("");
    requestAnimationFrame(() => {
      const panel = $("assistantPanel");
      if (panel) panel.scrollTop = panel.scrollHeight;
    });
  }

  function renderHistory() {
    const history = $("history");
    if (!history) return;
    if (!state.conversations.length) {
      history.innerHTML = '<div class="ic-brand-sub">No chats yet.</div>';
      return;
    }
    history.innerHTML = state.conversations.map((conversation) => `
      <div class="item ${conversation.id === state.activeConversationId ? "active" : ""}">
        <div class="row">
          <button class="mainbtn" type="button" data-open-conversation="${conversation.id}">
            <div class="ttl">${escapeHtml(conversation.title || "Chat")}</div>
          </button>
          <button class="mini" type="button" data-rename-conversation="${conversation.id}" title="Rename">✎</button>
          <button class="mini danger" type="button" data-delete-conversation="${conversation.id}" title="Delete">×</button>
        </div>
      </div>`).join("");
  }

  function normaliseDocumentSource(document) {
    if (!document || !document.name) return null;
    const excerpt = document.preview || document.text || "Uploaded document attached to this standalone assistant chat.";
    return {
      type: "Uploaded document",
      title: document.name,
      excerpt: String(excerpt || "").slice(0, 280),
      citation_ref: document.extractedBy === "server" ? "server extracted" : "browser extracted",
    };
  }

  function renderSources(sources) {
    const list = $("standaloneSourceList");
    if (!list) return;
    const clean = Array.isArray(sources) ? sources.filter(Boolean) : [];
    const documentSource = normaliseDocumentSource(state.attachedDocument);
    const combined = documentSource ? [documentSource, ...clean] : clean;
    if (!combined.length) {
      list.innerHTML = `
        <article class="ic-citation"><small>Boundary</small><strong>No OS records loaded</strong><p>This standalone assistant only uses what is typed or attached in this chat.</p><span class="ic-rel">Standalone</span></article>
        <article class="ic-citation"><small>Documents</small><strong>Upload PDF, DOCX or TXT</strong><p>Documents are extracted by the server and used as standalone chat context only.</p><span class="ic-rel">Upload ready</span></article>`;
      return;
    }
    list.innerHTML = combined.map((source, index) => {
      const title = source.title || source.label || source.document_title || source.name || `Source ${index + 1}`;
      const type = source.type || source.source_type || source.record_type || "Source";
      const excerpt = source.excerpt || source.summary || source.text || source.description || "Source returned by assistant runtime.";
      const ref = source.citation_ref || source.reference || source.record_id || `source:${index + 1}`;
      return `<article class="ic-citation"><small>${escapeHtml(type)}</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(excerpt)}</p><span class="ic-rel">${escapeHtml(ref)}</span></article>`;
    }).join("");
  }

  function buildHistoryForApi(conversation) {
    return (conversation?.messages || []).filter((message) => !message.pending).slice(-MAX_HISTORY_ITEMS).map((message) => ({ role: message.role, content: message.content }));
  }

  function appendMessage(role, content, extra) {
    const conversation = ensureConversation();
    conversation.messages.push({ role, content: String(content || ""), createdAt: new Date().toISOString(), ...(extra || {}) });
    conversation.updatedAt = new Date().toISOString();
    if (role === "user" && (!conversation.title || conversation.title === "New chat")) conversation.title = conversationTitleFrom(content);
    saveState();
    renderHistory();
    renderMessages();
    return conversation.messages.length - 1;
  }

  function updateMessage(index, content, extra) {
    const conversation = activeConversation();
    if (!conversation || !conversation.messages[index]) return;
    conversation.messages[index] = { ...conversation.messages[index], content: String(content || ""), ...(extra || {}) };
    conversation.updatedAt = new Date().toISOString();
    saveState();
    renderMessages();
  }

  function parseSse(chunk) {
    const lines = String(chunk || "").split("\n");
    let event = "message";
    const data = [];
    for (const line of lines) {
      if (line.startsWith("event:")) { event = line.slice(6).trim(); continue; }
      if (line.startsWith("data:")) {
        let payload = line.slice(5);
        if (payload.startsWith(" ")) payload = payload.slice(1);
        data.push(payload);
      }
    }
    return { event, data: data.join("\n") };
  }

  async function readAttachedFileInBrowser(file) {
    if (!file) return null;
    const readable = /^(text\/|application\/json)/.test(file.type || "") || /\.(txt|md|csv|json)$/i.test(file.name || "");
    if (!readable) return null;
    const text = await file.text();
    return { name: file.name, text: text.slice(0, 16000), preview: text.slice(0, 1200), unsupported: false, extractedBy: "browser" };
  }

  async function uploadDocumentToServer(file) {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/chat/upload", { method: "POST", credentials: "include", headers: csrfHeaders("POST"), body: form });
    if (!response.ok) {
      const fallback = await response.json().catch(() => ({}));
      throw new Error(fallback.detail || `Upload failed with status ${response.status}`);
    }
    const payload = await response.json();
    return { name: payload.filename || file.name, text: String(payload.text || "").slice(0, 60000), preview: payload.preview || "", unsupported: false, extractedBy: "server" };
  }

  function setDocumentPill(text, busy) {
    const doc = $("doc");
    const docText = $("docText");
    if (!doc || !docText) return;
    doc.classList.add("show");
    docText.textContent = text;
    doc.classList.toggle("is-busy", !!busy);
  }

  function clearAttachment() {
    state.attachedDocument = null;
    $("doc")?.classList.remove("show", "is-busy");
    if ($("docText")) $("docText").textContent = "";
    if ($("upload")) $("upload").value = "";
    renderSources(activeConversation()?.sources || []);
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    state.isUploading = true;
    setDocumentPill(`Reading ${file.name}...`, true);
    renderSources(activeConversation()?.sources || []);
    try {
      state.attachedDocument = await uploadDocumentToServer(file);
      setDocumentPill(`${state.attachedDocument.name} ready`, false);
      showToast("Document ready");
    } catch (serverError) {
      console.warn("Server document upload failed, trying browser extraction", serverError);
      const browserDocument = await readAttachedFileInBrowser(file);
      if (browserDocument) {
        state.attachedDocument = browserDocument;
        setDocumentPill(`${browserDocument.name} ready`, false);
        showToast("Document ready");
      } else {
        state.attachedDocument = { name: file.name, text: "", preview: serverError.message, unsupported: true, error: serverError.message, extractedBy: "failed" };
        setDocumentPill(`${file.name} could not be read`, false);
        showToast("Document could not be read");
      }
    } finally {
      state.isUploading = false;
      renderSources(activeConversation()?.sources || []);
    }
  }

  async function sendMessage() {
    if (state.isStreaming || state.isUploading) return;
    const input = $("input");
    if (!input) return;
    const raw = input.value.trim();
    if (!raw && !state.attachedDocument) return;

    clearStandaloneContext();
    const conversation = ensureConversation();
    const userText = raw || `Please review the attached document: ${state.attachedDocument?.name || "document"}`;
    const apiMessage = `${standaloneSystemPrefix()}\n\nUSER REQUEST:\n${userText}`;

    appendMessage("user", userText);
    input.value = "";
    input.style.height = "auto";

    const assistantIndex = appendMessage("assistant", "", { pending: true });
    let assistantText = "";
    state.isStreaming = true;
    $("send")?.setAttribute("disabled", "disabled");

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
          assistant_surface: SURFACE,
          document_name: state.attachedDocument?.name || null,
          document_text: state.attachedDocument?.text || null,
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Assistant request failed with status ${response.status}`);
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
          if (parsed.event === "done" || parsed.event === "progress") continue;
          if (parsed.event === "meta") {
            const meta = safeJsonParse(parsed.data, {});
            const sources = Array.isArray(meta.sources) ? meta.sources : [];
            conversation.sources = sources;
            renderSources(sources);
            saveState();
            continue;
          }
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
      updateMessage(assistantIndex, "Sorry, I could not reach the assistant just now. Please try again.", { pending: false });
    } finally {
      state.isStreaming = false;
      $("send")?.removeAttribute("disabled");
      input.focus();
    }
  }

  function newConversation() {
    createConversation();
    clearAttachment();
    renderHistory();
    renderMessages();
    renderSources([]);
    $("input")?.focus();
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
    if (state.activeConversationId === id) state.activeConversationId = state.conversations[0]?.id || null;
    saveState();
    renderHistory();
    renderMessages();
    renderSources(activeConversation()?.sources || []);
    showToast("Chat deleted");
  }

  function renameConversation(id) {
    const conversation = state.conversations.find((item) => item.id === id);
    if (!conversation) return;
    const title = prompt("Chat title", conversation.title || "Chat");
    if (!title) return;
    conversation.title = title.trim();
    conversation.updatedAt = new Date().toISOString();
    saveState();
    renderHistory();
  }

  function clearCurrentConversation() {
    const conversation = activeConversation();
    if (!conversation) return;
    conversation.messages = [];
    conversation.sources = [];
    conversation.updatedAt = new Date().toISOString();
    clearAttachment();
    saveState();
    renderMessages();
    renderSources([]);
    showToast("Chat cleared");
  }

  async function copyConversation() {
    const conversation = activeConversation();
    if (!conversation || !conversation.messages.length) {
      showToast("Nothing to copy");
      return;
    }
    const text = conversation.messages
      .filter((message) => !message.pending)
      .map((message) => `${message.role === "user" ? "User" : "IndiCare"}:\n${message.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Conversation copied");
    } catch (_) {
      showToast("Copy failed");
    }
  }

  function quick(type) {
    const prompts = {
      policy: "Summarise this policy or guidance for children's home staff: ",
      incident: "Turn these rough notes into a clear, factual incident record: ",
      risk: "Create a structured risk summary covering concerns, triggers, protective factors and staff actions: ",
      handover: "Write a concise shift handover from this information: ",
      chronology: "Create a factual chronology from this information: ",
    };
    const input = $("input");
    if (!input) return;
    input.value = prompts[type] || "Help me with: ";
    input.focus();
    input.dispatchEvent(new Event("input"));
  }

  function filterHistory(query) {
    const q = String(query || "").toLowerCase();
    document.querySelectorAll("#history .item").forEach((item) => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }

  function initialsFromName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "IC";
    return ((parts[0][0] || "I") + (parts[1]?.[0] || "C")).toUpperCase();
  }

  function hydrateUser() {
    const name = state.userProfile.name || "Assistant user";
    const role = state.userProfile.role || "Standalone";
    const initials = initialsFromName(name);
    ["icUserName", "icUserNameSidebar"].forEach((id) => { if ($(id)) $(id).textContent = name; });
    ["icUserRole", "icUserRoleSidebar"].forEach((id) => { if ($(id)) $(id).textContent = role; });
    ["icUserAvatar", "icUserAvatarSidebar"].forEach((id) => { if ($(id)) $(id).textContent = initials; });
    if ($("settingsName")) $("settingsName").value = name;
    if ($("settingsRole")) $("settingsRole").value = role;
  }

  function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("ic-theme-dark", state.theme === "dark");
    localStorage.setItem(THEME_KEY, state.theme);
    if ($("toggleTheme")) $("toggleTheme").textContent = state.theme === "dark" ? "Light mode" : "Dark mode";
  }

  function toggleTheme() { setTheme(state.theme === "dark" ? "light" : "dark"); }

  function openSettings() {
    hydrateUser();
    $("settingsModal")?.classList.remove("hidden");
    $("settingsModal")?.setAttribute("aria-hidden", "false");
    $("settingsName")?.focus();
  }

  function closeSettings() {
    $("settingsModal")?.classList.add("hidden");
    $("settingsModal")?.setAttribute("aria-hidden", "true");
  }

  function saveSettings() {
    const name = String($("settingsName")?.value || "").trim() || "Assistant user";
    const role = String($("settingsRole")?.value || "").trim() || "Standalone";
    state.userProfile = { name, role };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(state.userProfile));
    hydrateUser();
    closeSettings();
    showToast("Settings saved");
  }

  function setEvidenceCollapsed(collapsed) {
    $("icCockpit")?.classList.toggle("ic-evidence-collapsed", !!collapsed);
    localStorage.setItem(EVIDENCE_COLLAPSED_KEY, collapsed ? "true" : "false");
    if ($("toggleEvidence")) $("toggleEvidence").textContent = collapsed ? "Show" : "Hide";
  }

  function toggleEvidence() {
    const collapsed = !$("icCockpit")?.classList.contains("ic-evidence-collapsed");
    setEvidenceCollapsed(collapsed);
  }

  function bindEvents() {
    $("send")?.addEventListener("click", sendMessage);
    $("newChat")?.addEventListener("click", newConversation);
    $("clearDoc")?.addEventListener("click", clearAttachment);
    $("upload")?.addEventListener("change", handleUpload);
    $("search")?.addEventListener("input", (event) => filterHistory(event.target.value));
    $("toggleTheme")?.addEventListener("click", toggleTheme);
    $("openSettings")?.addEventListener("click", openSettings);
    $("closeSettings")?.addEventListener("click", closeSettings);
    $("saveSettings")?.addEventListener("click", saveSettings);
    $("copyConversation")?.addEventListener("click", copyConversation);
    $("clearConversation")?.addEventListener("click", clearCurrentConversation);
    $("toggleEvidence")?.addEventListener("click", toggleEvidence);

    $("settingsModal")?.addEventListener("click", (event) => {
      if (event.target === $("settingsModal")) closeSettings();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSettings();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        newConversation();
      }
    });

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
  }

  function init() {
    clearStandaloneContext();
    loadState();
    setTheme(state.theme);
    hydrateUser();
    bindEvents();
    setEvidenceCollapsed(localStorage.getItem(EVIDENCE_COLLAPSED_KEY) === "true");
    renderHistory();
    renderMessages();
    renderSources(activeConversation()?.sources || []);
  }

  window.quick = quick;
  window.addEventListener("DOMContentLoaded", init);
})();
