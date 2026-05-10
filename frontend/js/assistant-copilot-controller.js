(function () {
  const HISTORY_KEY = "indicare_standalone_history_v2";
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
    state.history.push({ role, content: clean.slice(0, 3500) });
    state.history = state.history.slice(-MAX_HISTORY);
    saveHistory();
  }

  function normaliseHeadings(text) {
    return String(text || "")
      .replace(/^(Direct answer|Improved note|Safeguarding threshold|Safeguarding consideration|Safeguarding analysis|What this means|What to do next|How to record it|Inspection lens|Recording \/ evidence to check|Recording and evidence to check|Evidence to check|Management oversight|Sources):/gim, "### $1")
      .replace(/Safeguarding Referral Threshold/g, "### Safeguarding threshold")
      .replace(/Follow-up/g, "### Follow-up")
      .replace(/Outcome/g, "### Outcome");
  }

  function markdown(text) {
    let html = escapeHtml(normaliseHeadings(text))
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
        continue;
      }

      if (listOpen) {
        out += "</ul>";
        listOpen = false;
      }

      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^<h3>.*<\/h3>$/.test(trimmed)) out += trimmed;
      else out += `<p>${line}</p>`;
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
      .ic-mode-row,.ic-quick-row{max-width:960px;margin:12px auto 0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.ic-mode-chip,.ic-quick-chip{border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:999px;padding:7px 11px;color:#0f172a;font-weight:800;cursor:pointer;font-size:13px}.ic-mode-chip.active,.ic-quick-chip:hover{background:rgba(22,118,109,.08);color:#16766d;border-color:rgba(22,118,109,.3)}
      .ic-row{max-width:920px;margin:18px auto;display:flex;gap:12px;align-items:flex-start}.ic-row.user{justify-content:flex-end}.ic-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(22,118,109,.08);color:#16766d;font-weight:900;border:1px solid rgba(15,23,42,.12);font-size:12px}.ic-row.user .ic-avatar{display:none}
      .ic-card{max-width:780px;border:1px solid rgba(15,23,42,.12);background:#fff;color:#0f172a;border-radius:20px;padding:16px 17px;box-shadow:0 14px 34px rgba(15,23,42,.07);line-height:1.58;animation:icFade .18s ease-out}.ic-row.user .ic-card{background:#2563eb;color:#fff;border-bottom-right-radius:7px}.ic-row.assistant .ic-card{border-bottom-left-radius:7px}.ic-card p{margin:0 0 10px}.ic-card h3{margin:15px 0 7px;padding-top:9px;border-top:1px solid rgba(22,118,109,.13);color:#16766d;font-size:15px;letter-spacing:-.01em}.ic-card h3:first-child{border-top:0;padding-top:0;margin-top:0}.ic-card ul{margin:7px 0 10px 18px;padding:0}.ic-card li{margin:4px 0}.ic-card a{color:#16766d;font-weight:800}.ic-meta{max-width:780px;margin-top:10px;display:grid;gap:10px}.ic-panel{border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:16px;padding:12px;color:#0f172a;animation:icFade .18s ease-out}.ic-panel-title{font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#16766d;margin-bottom:7px}.ic-btn,.ic-source{display:block;width:100%;border:1px solid rgba(15,23,42,.12);background:#f8fafc;border-radius:12px;padding:9px;margin-top:7px;text-align:left;color:#0f172a;text-decoration:none;font-weight:700}.ic-source small{color:#64748b;line-height:1.35}.ic-sg.urgent{background:#fff1f1;color:#7f1d1d;border-color:#f5c2c2}.ic-sg.concern{background:#fff7ed;color:#7c2d12;border-color:#fed7aa}.ic-boundary{background:#eff6ff;color:#1e3a8a;border-color:#bfdbfe}.ic-follow,.ic-quality{display:flex;gap:6px;flex-wrap:wrap}.ic-chip{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fff;padding:7px 10px;font-weight:800;cursor:pointer}.ic-chip:hover{background:rgba(22,118,109,.08);color:#16766d}.ic-quality span{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fff;color:#64748b;padding:5px 8px;font-size:12px}.ic-thinking{color:#64748b}.ic-thinking:after{content:"";animation:icdots 1.2s infinite}@keyframes icdots{0%{content:""}33%{content:"."}66%{content:".."}100%{content:"..."}}@keyframes icFade{from{opacity:.5;transform:translateY(3px)}to{opacity:1;transform:none}}
      .ic-decision{border-left:5px solid #16766d}.ic-decision.immediate_action{background:#fff1f1;color:#7f1d1d;border-color:#f5c2c2;border-left-color:#dc2626}.ic-decision.likely_referral{background:#fff7ed;color:#7c2d12;border-color:#fed7aa;border-left-color:#ea580c}.ic-decision.possible_referral{background:#fffbeb;color:#78350f;border-color:#fde68a;border-left-color:#d97706}.ic-decision.monitor{background:#f0fdfa;color:#115e59;border-color:#99f6e4;border-left-color:#0d9488}.ic-decision.not_indicated{background:#f8fafc;color:#334155;border-left-color:#64748b}.ic-decision-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}.ic-threshold-badge{border-radius:999px;padding:5px 8px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.04em;background:rgba(255,255,255,.72);border:1px solid rgba(15,23,42,.12);white-space:nowrap}.ic-decision-text{font-weight:850;line-height:1.35}.ic-decision-small{font-size:13px;line-height:1.45;margin-top:5px}.ic-decision-list{margin:8px 0 0 18px;padding:0}.ic-decision-list li{margin:4px 0;font-size:13px;line-height:1.42}.ic-decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ic-decision-mini{border:1px solid rgba(15,23,42,.1);border-radius:12px;padding:9px;background:rgba(255,255,255,.55)}.ic-decision-mini strong{display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.ic-decision-mini p{font-size:13px;margin:0 0 5px;line-height:1.4}
      .ic-toast{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:99999;background:#0f172a;color:#fff;border-radius:999px;padding:9px 13px;font-weight:800;font-size:13px;box-shadow:0 18px 40px rgba(15,23,42,.25)}
      body.theme-dark .ic-card,body.theme-dark .ic-panel,body.theme-dark .ic-top-strip,body.theme-dark .ic-chip,body.theme-dark .ic-mode-chip,body.theme-dark .ic-quick-chip,body.theme-dark .ic-quality span{background:rgba(255,255,255,.06);color:#f8fafc;border-color:rgba(226,232,240,.16)}body.theme-dark .ic-btn,body.theme-dark .ic-source{background:rgba(255,255,255,.06);color:#f8fafc;border-color:rgba(226,232,240,.16)}body.theme-dark .ic-source small{color:#cbd5e1}body.theme-dark .ic-decision-mini{background:rgba(255,255,255,.06);border-color:rgba(226,232,240,.16)}
      @media(max-width:700px){.ic-row{max-width:calc(100% - 16px);gap:8px}.ic-card{max-width:100%;padding:14px}.ic-avatar{width:30px;height:30px}.ic-mode-row,.ic-quick-row{justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding:0 10px 4px}.ic-mode-chip,.ic-quick-chip{white-space:nowrap}.ic-decision-grid{grid-template-columns:1fr}.ic-decision-top{display:block}.ic-threshold-badge{display:inline-block;margin-top:7px}}
    `;
    document.head.appendChild(style);
  }

  function showToast(text) {
    const old = document.querySelector(".ic-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "ic-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1400);
  }

  function setupChrome() {
    if (!document.querySelector(".ic-top-strip")) {
      const app = el("app") || document.body;
      const strip = document.createElement("div");
      strip.className = "ic-top-strip";
      strip.innerHTML = `<div><strong>Standalone Assistant</strong> · guidance only · no access to OS records</div><div class="ic-pill">Public knowledge + what you type here</div>`;
      app.prepend(strip);
    }

    const empty = el("empty");
    const inner = empty && empty.querySelector(".assistant-empty-inner");
    if (inner && !inner.querySelector(".ic-mode-row")) {
      const title = el("welcomeTitle");
      const text = el("welcomeText");
      if (title) title.textContent = "How can I support practice today?";
      if (text) text.textContent = "Describe a situation, paste a note, or ask about safeguarding, recording, Reg 45, Ofsted evidence or care practice.";
      inner.insertAdjacentHTML("beforeend", `
        <div class="ic-mode-row">
          <button type="button" class="ic-mode-chip active" data-prefix="">Guidance</button>
          <button type="button" class="ic-mode-chip" data-prefix="Improve this as a factual, child-centred care record: ">Recording</button>
          <button type="button" class="ic-mode-chip" data-prefix="Check this for safeguarding considerations, recording and escalation: ">Safeguarding</button>
          <button type="button" class="ic-mode-chip" data-prefix="Create a concise chronology entry from this: ">Chronology</button>
          <button type="button" class="ic-mode-chip" data-prefix="Review this through a Reg 45 and Ofsted evidence lens: ">Reg 45</button>
        </div>
        <div class="ic-quick-row">
          <button type="button" class="ic-quick-chip" data-prompt="Improve this note using factual, child-centred care-recording language: ">Improve a note</button>
          <button type="button" class="ic-quick-chip" data-prompt="Check this situation for safeguarding considerations and what needs recording: ">Check safeguarding</button>
          <button type="button" class="ic-quick-chip" data-prompt="What would Ofsted or a manager look for in this situation? ">Inspection lens</button>
          <button type="button" class="ic-quick-chip" data-prompt="Create a concise chronology entry from this information: ">Chronology</button>
        </div>
      `);
    }

    const input = el("input");
    if (input) input.placeholder = "Describe a situation, paste a note, or ask about safeguarding...";
  }

  function hideEmpty() {
    const empty = el("empty");
    if (empty) empty.style.display = "none";
  }

  function scrollBottom() {
    const messages = el("messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function row(role, content) {
    hideEmpty();
    const messages = el("messages");
    const wrapper = document.createElement("div");
    wrapper.className = `ic-row ${role}`;
    wrapper.innerHTML = `<div class="ic-avatar">IC</div><div><div class="ic-card ${role === "assistant" && !content ? "ic-thinking" : ""}">${role === "assistant" ? markdown(content || "Thinking through practice, safeguarding and evidence") : escapeHtml(content)}</div><div class="ic-meta"></div></div>`;
    messages.appendChild(wrapper);
    scrollBottom();
    return wrapper;
  }

  function update(rowEl, text, done) {
    const card = rowEl.querySelector(".ic-card");
    if (!card) return;
    card.classList.toggle("ic-thinking", !done && !text);
    card.innerHTML = markdown(text || "Thinking through practice, safeguarding and evidence");
    scrollBottom();
  }

  function renderDecisionPanel(box, decision) {
    if (!decision || !decision.threshold_view) return;
    const threshold = String(decision.threshold_view || "not_indicated");
    const rationale = Array.isArray(decision.rationale) ? decision.rationale.filter(Boolean) : [];
    const checks = Array.isArray(decision.recording_evidence_to_check) ? decision.recording_evidence_to_check.filter(Boolean) : [];
    const refs = Array.isArray(decision.reference_points) ? decision.reference_points.filter(Boolean) : [];

    box.insertAdjacentHTML("beforeend", `
      <div class="ic-panel ic-decision ${escapeHtml(threshold)}">
        <div class="ic-decision-top">
          <div>
            <div class="ic-panel-title">Safeguarding decision support</div>
            <div class="ic-decision-text">${escapeHtml(decision.headline || "Safeguarding threshold considered")}</div>
          </div>
          <span class="ic-threshold-badge">${escapeHtml(threshold.replaceAll("_", " "))}</span>
        </div>
        <div class="ic-decision-small">${escapeHtml(decision.decision || "Use professional judgement and follow local safeguarding procedures.")}</div>
        ${rationale.length ? `<ul class="ic-decision-list">${rationale.slice(0,6).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        <div class="ic-decision-grid">
          ${checks.length ? `<div class="ic-decision-mini"><strong>Recording/evidence to check</strong>${checks.slice(0,5).map(item => `<p>${escapeHtml(item)}</p>`).join("")}</div>` : ""}
          ${refs.length ? `<div class="ic-decision-mini"><strong>Reference points</strong>${refs.slice(0,4).map(ref => `<p><b>${escapeHtml(ref.title || "Reference")}</b><br>${escapeHtml(ref.principle || "")}</p>`).join("")}</div>` : ""}
        </div>
      </div>
    `);
  }

  function renderMeta(rowEl, meta) {
    const box = rowEl.querySelector(".ic-meta");
    if (!box || box.dataset.done === "true") return;
    box.dataset.done = "true";

    const sg = meta.safeguarding || (meta.explainability && meta.explainability.safeguarding) || {};
    const level = String(sg.level || (meta.runtime && meta.runtime.safeguarding_level) || "standard").toLowerCase();

    renderDecisionPanel(box, sg.decision);

    if (level === "urgent" || level === "concern") {
      const fallback = level === "urgent" ? "Prioritise immediate safety and follow safeguarding procedures." : "Record clearly and share with the relevant manager/DSL.";
      box.insertAdjacentHTML("beforeend", `<div class="ic-panel ic-sg ${level}"><strong>${level === "urgent" ? "Immediate safeguarding concern" : "Safeguarding consideration"}</strong><p>${escapeHtml(sg.banner || fallback)}</p></div>`);
    }

    const boundary = meta.boundary || (meta.explainability && meta.explainability.boundary) || (meta.assistant_context && meta.assistant_context.boundary) || {};
    if (boundary.internal_data_request_detected) {
      box.insertAdjacentHTML("beforeend", `<div class="ic-panel ic-boundary"><strong>OS records are not available here</strong><p>This standalone assistant provides guidance only. Use the OS Assistant inside the authorised workspace for live records.</p></div>`);
    }

    const actions = Array.isArray(meta.suggested_actions) ? meta.suggested_actions : [];
    if (actions.length) {
      box.insertAdjacentHTML("beforeend", `<div class="ic-panel"><div class="ic-panel-title">Suggested actions</div>${actions.slice(0,5).map(a => `<button type="button" class="ic-btn" data-copy="${escapeHtml(a.label || a)}">${escapeHtml(a.label || a)}</button>`).join("")}</div>`);
    }

    const sources = Array.isArray(meta.sources) ? meta.sources.filter(s => s && /^https:\/\//i.test(String(s.url || ""))) : [];
    if (sources.length) {
      box.insertAdjacentHTML("beforeend", `<div class="ic-panel"><div class="ic-panel-title">Evidence base used</div>${sources.slice(0,5).map(s => `<a class="ic-source" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(s.title || "Source")}</strong><br><small>${escapeHtml(s.excerpt || s.source_type || "Official source")}</small></a>`).join("")}</div>`);
    }

    box.insertAdjacentHTML("beforeend", `<div class="ic-follow"><button class="ic-chip" data-prompt="Turn this into a paste-ready care record.">Turn into record</button><button class="ic-chip" data-prompt="What would Ofsted or a manager look for in this situation?">Ofsted lens</button><button class="ic-chip" data-prompt="Create a concise chronology entry from this.">Chronology</button></div><div class="ic-quality"><span>Safeguarding: ${escapeHtml(level)}</span><span>Guidance only</span><span>No OS record access</span></div>`);
    scrollBottom();
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
        try {
          await navigator.clipboard.writeText(value);
          showToast("Copied");
        } catch (_) {}
      }
      const prompt = event.target.closest && event.target.closest(".ic-chip,.ic-quick-chip,.ic-mode-chip");
      if (prompt) {
        const prefix = prompt.dataset.prefix || "";
        input.value = prompt.dataset.prompt || prefix || prompt.textContent || "";
        input.focus();
        document.querySelectorAll(".ic-mode-chip").forEach(btn => btn.classList.remove("active"));
        if (prompt.classList.contains("ic-mode-chip")) prompt.classList.add("active");
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
