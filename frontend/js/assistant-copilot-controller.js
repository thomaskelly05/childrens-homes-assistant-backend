(function () {
  const HISTORY_KEY = "indicare_standalone_history_v1";
  const MAX_HISTORY = 10;
  const state = {
    busy: false,
    history: loadHistory(),
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
    } catch (_) {
      return [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-MAX_HISTORY)));
    } catch (_) {}
  }

  function remember(role, content) {
    const clean = String(content || "").trim();
    if (!clean) return;
    state.history.push({ role, content: clean.slice(0, 3000) });
    state.history = state.history.slice(-MAX_HISTORY);
    saveHistory();
  }

  function markdown(text) {
    let html = escapeHtml(text)
      .replace(/^(Direct answer|Improved note|Safeguarding consideration|Safeguarding analysis|What this means|What to do next|How to record it|Inspection lens|Recording \/ evidence to check|Sources):/gim, "### $1")
      .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.*?)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    const lines = html.split("\n");
    let out = "";
    let listOpen = false;
    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        if (!listOpen) {
          out += "<ul>";
          listOpen = true;
        }
        out += `<li>${line.replace(/^\s*-\s+/, "")}</li>`;
      } else {
        if (listOpen) {
          out += "</ul>";
          listOpen = false;
        }
        const t = line.trim();
        if (!t) continue;
        if (/^<h3>.*<\/h3>$/.test(t)) out += t;
        else out += `<p>${line}</p>`;
      }
    }
    if (listOpen) out += "</ul>";
    return out;
  }

  function addStyles() {
    if (el("ic-copilot-styles")) return;
    const style = document.createElement("style");
    style.id = "ic-copilot-styles";
    style.textContent = `
      .ofsted-context-strip,.ofsted-modebar,.ofsted-quickdock,.ofsted-hero-panel,.ofsted-trust-strip{display:none!important}
      .ic-top-strip{max-width:1040px;margin:12px auto;padding:10px 12px;border:1px solid rgba(15,23,42,.12);border-radius:16px;background:#fff;color:#64748b;font-size:13px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .ic-top-strip strong{color:#16766d}.ic-pill{border:1px solid rgba(15,23,42,.12);border-radius:999px;padding:4px 8px;background:rgba(22,118,109,.08);color:#16766d;font-weight:800}
      .ic-row{max-width:900px;margin:18px auto;display:flex;gap:12px;align-items:flex-start}.ic-row.user{justify-content:flex-end}.ic-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(22,118,109,.08);color:#16766d;font-weight:900;border:1px solid rgba(15,23,42,.12);font-size:12px}.ic-row.user .ic-avatar{display:none}
      .ic-card{max-width:760px;border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;border-radius:20px;padding:16px 17px;box-shadow:0 14px 34px rgba(15,23,42,.07);line-height:1.58}.ic-row.user .ic-card{background:#2563eb;color:#fff;border-bottom-right-radius:7px}.ic-row.assistant .ic-card{border-bottom-left-radius:7px}.ic-card p{margin:0 0 10px}.ic-card h3{margin:14px 0 7px;color:#16766d;font-size:15px}.ic-card ul{margin:7px 0 10px 18px;padding:0}.ic-card a{color:#16766d;font-weight:800}.ic-meta{max-width:760px;margin-top:10px;display:grid;gap:10px}.ic-panel{border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:16px;padding:12px;color:#0f172a}.ic-panel-title{font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#16766d;margin-bottom:7px}.ic-btn,.ic-source{display:block;width:100%;border:1px solid rgba(15,23,42,.12);background:#f8fafc;border-radius:12px;padding:9px;margin-top:7px;text-align:left;color:#0f172a;text-decoration:none;font-weight:700}.ic-sg.urgent{background:#fff1f1;color:#7f1d1d;border-color:#f5c2c2}.ic-sg.concern{background:#fff7ed;color:#7c2d12;border-color:#fed7aa}.ic-follow{display:flex;gap:6px;flex-wrap:wrap}.ic-chip{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fff;padding:7px 10px;font-weight:800;cursor:pointer}.ic-thinking{color:#64748b}.ic-thinking:after{content:"";animation:icdots 1.2s infinite}@keyframes icdots{0%{content:""}33%{content:"."}66%{content:".."}100%{content:"..."}}
      body.theme-dark .ic-card,body.theme-dark .ic-panel,body.theme-dark .ic-top-strip,body.theme-dark .ic-chip{background:rgba(255,255,255,.06);color:#f8fafc;border-color:rgba(226,232,240,.16)}body.theme-dark .ic-btn,body.theme-dark .ic-source{background:rgba(255,255,255,.06);color:#f8fafc;border-color:rgba(226,232,240,.16)}
    `;
    document.head.appendChild(style);
  }

  function setupChrome() {
    if (!document.querySelector(".ic-top-strip")) {
      const app = el("app") || document.body;
      const strip = document.createElement("div");
      strip.className = "ic-top-strip";
      strip.innerHTML = `<div><strong>Standalone Assistant</strong> · guidance only · no access to OS records</div><div class="ic-pill">Public knowledge + what you type here</div>`;
      app.prepend(strip);
    }
    const input = el("input");
    if (input) input.placeholder = "Describe a situation, paste a note, or ask about safeguarding...";
  }

  function hideEmpty() {
    const empty = el("empty");
    if (empty) empty.style.display = "none";
  }

  function row(role, content) {
    hideEmpty();
    const messages = el("messages");
    const wrapper = document.createElement("div");
    wrapper.className = `ic-row ${role}`;
    wrapper.innerHTML = `<div class="ic-avatar">IC</div><div><div class="ic-card ${role === "assistant" && !content ? "ic-thinking" : ""}">${role === "assistant" ? markdown(content || "Thinking through practice, safeguarding and evidence") : escapeHtml(content)}</div><div class="ic-meta"></div></div>`;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  function update(rowEl, text, done) {
    const card = rowEl.querySelector(".ic-card");
    if (!card) return;
    card.classList.toggle("ic-thinking", !done && !text);
    card.innerHTML = markdown(text || "Thinking through practice, safeguarding and evidence");
    const messages = el("messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function renderMeta(rowEl, meta) {
    const box = rowEl.querySelector(".ic-meta");
    if (!box || box.dataset.done === "true") return;
    box.dataset.done = "true";
    const sg = meta.safeguarding || (meta.explainability && meta.explainability.safeguarding) || {};
    const level = String(sg.level || (meta.runtime && meta.runtime.safeguarding_level) || "standard").toLowerCase();
    if (level === "urgent" || level === "concern") {
      const fallback = level === "urgent" ? "Prioritise immediate safety and follow safeguarding procedures." : "Record clearly and share with the relevant manager/DSL.";
      box.insertAdjacentHTML("beforeend", `<div class="ic-panel ic-sg ${level}"><strong>${level === "urgent" ? "Immediate safeguarding concern" : "Safeguarding consideration"}</strong><p>${escapeHtml(sg.banner || fallback)}</p></div>`);
    }
    const actions = Array.isArray(meta.suggested_actions) ? meta.suggested_actions : [];
    if (actions.length) box.insertAdjacentHTML("beforeend", `<div class="ic-panel"><div class="ic-panel-title">Suggested actions</div>${actions.slice(0,5).map(a => `<button type="button" class="ic-btn" data-copy="${escapeHtml(a.label || a)}">${escapeHtml(a.label || a)}</button>`).join("")}</div>`);
    const sources = Array.isArray(meta.sources) ? meta.sources.filter(s => s && /^https:\/\//i.test(String(s.url || ""))) : [];
    if (sources.length) box.insertAdjacentHTML("beforeend", `<div class="ic-panel"><div class="ic-panel-title">Evidence base used</div>${sources.slice(0,5).map(s => `<a class="ic-source" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(s.title || "Source")}</strong><br><small>${escapeHtml(s.excerpt || s.source_type || "Official source")}</small></a>`).join("")}</div>`);
    box.insertAdjacentHTML("beforeend", `<div class="ic-follow"><button class="ic-chip" data-prompt="Turn this into a paste-ready care record.">Turn into record</button><button class="ic-chip" data-prompt="What would Ofsted or a manager look for in this situation?">Ofsted lens</button><button class="ic-chip" data-prompt="Create a concise chronology entry from this.">Chronology</button></div>`);
  }

  async function parseSSE(response, onToken, onMeta) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        let name = "message";
        const data = [];
        chunk.split("\n").forEach(line => {
          if (line.startsWith("event:")) name = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        });
        const payload = data.join("\n");
        if (!payload || payload === "[DONE]") continue;
        if (name === "meta") {
          try { onMeta(JSON.parse(payload)); } catch (_) {}
        } else if (name === "message") onToken(payload);
      }
    }
  }

  async function sendMessage(message) {
    if (state.busy) return;
    state.busy = true;
    const input = el("input");
    const send = el("send");
    if (input) input.disabled = true;
    if (send) send.disabled = true;
    row("user", message);
    remember("user", message);
    const assistant = row("assistant", "");
    let text = "";
    let meta = {};
    try {
      const response = await fetch("/assistant/general/stream", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          response_mode: (el("mode") && el("mode").value) || "balanced",
          conversation_id: sessionStorage.getItem("indicare_standalone_conversation_id") || "standalone-session",
          history: state.history.slice(0, -1),
        }),
      });
      if (!response.ok || !response.body) throw new Error("Assistant stream failed");
      await parseSSE(response, token => {
        text += token;
        update(assistant, text, false);
      }, payload => { meta = payload || {}; });
      update(assistant, text, true);
      renderMeta(assistant, meta);
      remember("assistant", text);
    } catch (error) {
      update(assistant, "I could not complete that request just now. Please try again.", true);
      console.error(error);
    } finally {
      state.busy = false;
      if (input) { input.disabled = false; input.focus(); }
      if (send) send.disabled = false;
    }
  }

  function bind() {
    const form = document.querySelector("form") || el("assistantForm") || el("chatForm");
    const input = el("input");
    if (!form || !input || form.dataset.icCopilot === "true") return;
    form.dataset.icCopilot = "true";
    form.addEventListener("submit", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const message = String(input.value || "").trim();
      if (!message || state.busy) return;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      sendMessage(message);
    }, true);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    }, true);
    document.addEventListener("click", async event => {
      const copy = event.target.closest && event.target.closest(".ic-btn");
      if (copy) {
        const value = copy.dataset.copy || copy.textContent || "";
        try { await navigator.clipboard.writeText(value); } catch (_) {}
      }
      const prompt = event.target.closest && event.target.closest(".ic-chip");
      if (prompt) {
        input.value = prompt.dataset.prompt || prompt.textContent || "";
        input.focus();
      }
    });
  }

  function init() {
    addStyles();
    setupChrome();
    bind();
    window.IndiCareStandaloneAssistant = { sendMessage, history: state.history };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
