(function () {
  const WIDGET_ID = "indicare-assistant-widget-root";

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    return /^https:\/\//i.test(raw) ? raw : "";
  }

  function renderMarkdown(text) {
    let s = escapeHtml(text || "")
      .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
      .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.*?)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\s*-\s+/g, "\n- ");

    const lines = s.split("\n");
    let html = "";
    let listOpen = false;

    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        if (!listOpen) {
          html += "<ul>";
          listOpen = true;
        }
        html += `<li>${line.replace(/^\s*-\s+/, "")}</li>`;
        continue;
      }

      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        html += "<br>";
      } else if (/^<h[23]>.*<\/h[23]>$/.test(trimmed)) {
        html += line;
      } else {
        html += `<p>${line}</p>`;
      }
    }

    if (listOpen) html += "</ul>";
    return html;
  }

  function normaliseConfig(config) {
    const safe = config || {};
    return {
      apiUrl: String(safe.apiUrl || "").replace(/\/$/, ""),
      apiKey: String(safe.apiKey || ""),
      organisationId: safe.organisationId || null,
      hostSystem: safe.hostSystem || "external_system",
      userRole: safe.userRole || null,
      recordType: safe.recordType || null,
      position: safe.position || "bottom-right",
      title: safe.title || "IndiCare Assistant",
      subtitle: safe.subtitle || "Ofsted-ready residential care support",
      buttonLabel: safe.buttonLabel || "Ask IndiCare",
      theme: safe.theme || "light",
      defaultMode: safe.defaultMode || "guidance",
    };
  }

  function createStyles() {
    if (document.getElementById("indicare-assistant-widget-styles")) return;

    const style = document.createElement("style");
    style.id = "indicare-assistant-widget-styles";
    style.textContent = `
      #${WIDGET_ID} {
        --ic-bg: #ffffff;
        --ic-bg-soft: #f7faf9;
        --ic-text: #14211f;
        --ic-muted: #64748b;
        --ic-border: rgba(15, 23, 42, 0.14);
        --ic-primary: #15313a;
        --ic-primary-2: #2f8f83;
        --ic-primary-soft: rgba(47, 143, 131, 0.12);
        --ic-user: #eaf6f3;
        --ic-assistant: #ffffff;
        --ic-danger: #b42318;
        --ic-warning: #a16207;
        --ic-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${WIDGET_ID}.ic-dark {
        --ic-bg: #0f172a;
        --ic-bg-soft: #111827;
        --ic-text: #f8fafc;
        --ic-muted: #cbd5e1;
        --ic-border: rgba(226, 232, 240, 0.16);
        --ic-primary: #2f8f83;
        --ic-primary-2: #7dd3c7;
        --ic-primary-soft: rgba(125, 211, 199, 0.12);
        --ic-user: rgba(47, 143, 131, 0.22);
        --ic-assistant: rgba(255, 255, 255, 0.06);
      }

      #${WIDGET_ID} * { box-sizing: border-box; }

      #${WIDGET_ID} .ic-button {
        position: fixed;
        z-index: 2147483000;
        right: 20px;
        bottom: 20px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--ic-primary), var(--ic-primary-2));
        color: #fff;
        padding: 14px 18px;
        font-weight: 850;
        font-size: 14px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      #${WIDGET_ID} .ic-button::before { content: "✦"; }
      #${WIDGET_ID}.ic-bottom-left .ic-button { left: 20px; right: auto; }

      #${WIDGET_ID} .ic-panel {
        position: fixed;
        z-index: 2147483001;
        right: 20px;
        bottom: 84px;
        width: min(460px, calc(100vw - 32px));
        height: min(720px, calc(100vh - 112px));
        border: 1px solid var(--ic-border);
        border-radius: 26px;
        background: var(--ic-bg);
        color: var(--ic-text);
        box-shadow: var(--ic-shadow);
        display: none;
        overflow: hidden;
      }

      #${WIDGET_ID}.ic-bottom-left .ic-panel { left: 20px; right: auto; }
      #${WIDGET_ID}.ic-open .ic-panel { display: flex; flex-direction: column; }

      #${WIDGET_ID} .ic-header {
        padding: 16px 18px;
        background: linear-gradient(135deg, var(--ic-primary), var(--ic-primary-2));
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      #${WIDGET_ID} .ic-title { font-weight: 900; font-size: 16px; letter-spacing: -0.01em; }
      #${WIDGET_ID} .ic-subtitle { font-size: 12px; opacity: 0.9; margin-top: 2px; }
      #${WIDGET_ID} .ic-close {
        background: rgba(255,255,255,0.16);
        border: 1px solid rgba(255,255,255,0.24);
        color: #fff;
        border-radius: 999px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 18px;
      }

      #${WIDGET_ID} .ic-trustbar {
        padding: 10px 14px;
        border-bottom: 1px solid var(--ic-border);
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        background: var(--ic-bg);
      }

      #${WIDGET_ID} .ic-trust-pill {
        border: 1px solid var(--ic-border);
        border-radius: 999px;
        padding: 6px 8px;
        font-size: 10.5px;
        color: var(--ic-muted);
        text-align: center;
        background: var(--ic-bg-soft);
        white-space: nowrap;
      }

      #${WIDGET_ID} .ic-modebar {
        padding: 10px 12px;
        display: flex;
        gap: 6px;
        overflow-x: auto;
        border-bottom: 1px solid var(--ic-border);
        background: var(--ic-bg);
      }

      #${WIDGET_ID} .ic-mode {
        border: 1px solid var(--ic-border);
        border-radius: 999px;
        background: var(--ic-bg-soft);
        color: var(--ic-text);
        padding: 7px 10px;
        font-size: 11.5px;
        font-weight: 750;
        cursor: pointer;
        white-space: nowrap;
      }

      #${WIDGET_ID} .ic-mode.ic-active {
        background: var(--ic-primary-soft);
        border-color: var(--ic-primary-2);
        color: var(--ic-primary);
      }

      #${WIDGET_ID} .ic-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: var(--ic-bg-soft);
      }

      #${WIDGET_ID} .ic-message {
        margin-bottom: 14px;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      #${WIDGET_ID} .ic-message.ic-user { align-items: flex-end; }
      #${WIDGET_ID} .ic-message.ic-assistant { align-items: flex-start; }

      #${WIDGET_ID} .ic-bubble,
      #${WIDGET_ID} .ic-sg-banner,
      #${WIDGET_ID} .ic-action-panel,
      #${WIDGET_ID} .ic-sources {
        max-width: 94%;
      }

      #${WIDGET_ID} .ic-bubble {
        border: 1px solid var(--ic-border);
        border-radius: 20px;
        padding: 12px 14px;
        font-size: 14px;
        line-height: 1.48;
        background: var(--ic-assistant);
        overflow-wrap: anywhere;
      }

      #${WIDGET_ID} .ic-user .ic-bubble { background: var(--ic-user); }
      #${WIDGET_ID} .ic-bubble h2,
      #${WIDGET_ID} .ic-bubble h3 {
        margin: 12px 0 6px;
        font-size: 13px;
        letter-spacing: 0.01em;
        color: var(--ic-primary);
      }
      #${WIDGET_ID} .ic-bubble h2:first-child,
      #${WIDGET_ID} .ic-bubble h3:first-child { margin-top: 0; }
      #${WIDGET_ID} .ic-bubble p { margin: 0 0 8px; }
      #${WIDGET_ID} .ic-bubble p:last-child { margin-bottom: 0; }
      #${WIDGET_ID} .ic-bubble ul { margin: 6px 0 8px 18px; padding: 0; }
      #${WIDGET_ID} .ic-bubble li { margin: 4px 0; }
      #${WIDGET_ID} .ic-bubble a { color: var(--ic-primary-2); font-weight: 800; text-decoration: underline; }

      #${WIDGET_ID} .ic-sg-banner {
        border-radius: 16px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.4;
        border: 1px solid var(--ic-border);
      }
      #${WIDGET_ID} .ic-sg-banner strong { display: block; font-weight: 900; margin-bottom: 4px; }
      #${WIDGET_ID} .ic-sg-banner p { margin: 0; }
      #${WIDGET_ID} .ic-sg-banner.urgent {
        background: #fff1f1;
        border-color: #f5c2c2;
        color: #7f1d1d;
      }
      #${WIDGET_ID} .ic-sg-banner.concern {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #7c2d12;
      }
      #${WIDGET_ID}.ic-dark .ic-sg-banner.urgent { background: rgba(127,29,29,0.22); color: #fecaca; }
      #${WIDGET_ID}.ic-dark .ic-sg-banner.concern { background: rgba(124,45,18,0.22); color: #fed7aa; }

      #${WIDGET_ID} .ic-action-panel {
        border: 1px solid var(--ic-border);
        border-radius: 16px;
        padding: 10px;
        background: var(--ic-bg);
      }
      #${WIDGET_ID} .ic-action-title {
        font-size: 11px;
        font-weight: 900;
        color: var(--ic-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 7px;
      }
      #${WIDGET_ID} .ic-action-btn {
        display: block;
        width: 100%;
        text-align: left;
        border: 1px solid var(--ic-border);
        background: var(--ic-bg-soft);
        color: var(--ic-text);
        border-radius: 12px;
        padding: 9px 10px;
        margin-top: 7px;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
      }

      #${WIDGET_ID} .ic-meta {
        font-size: 11px;
        color: var(--ic-muted);
        padding: 0 4px;
      }

      #${WIDGET_ID} .ic-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      #${WIDGET_ID} .ic-copy {
        border: 1px solid var(--ic-border);
        background: var(--ic-bg);
        color: var(--ic-text);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 750;
        cursor: pointer;
      }

      #${WIDGET_ID} .ic-sources {
        border: 1px solid var(--ic-border);
        border-radius: 16px;
        background: var(--ic-bg);
        padding: 10px;
      }

      #${WIDGET_ID} .ic-sources-title {
        font-size: 11px;
        font-weight: 900;
        color: var(--ic-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 7px;
      }

      #${WIDGET_ID} .ic-source {
        display: block;
        border-radius: 12px;
        padding: 9px;
        background: var(--ic-bg-soft);
        color: var(--ic-text);
        text-decoration: none;
        border: 1px solid var(--ic-border);
        margin-top: 7px;
      }

      #${WIDGET_ID} .ic-source strong { display: block; font-size: 12.5px; margin-bottom: 3px; }
      #${WIDGET_ID} .ic-source span { display: block; font-size: 11px; color: var(--ic-muted); line-height: 1.35; }

      #${WIDGET_ID} .ic-footer {
        border-top: 1px solid var(--ic-border);
        padding: 12px;
        background: var(--ic-bg);
      }

      #${WIDGET_ID} .ic-form {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      #${WIDGET_ID} .ic-input {
        flex: 1;
        min-height: 46px;
        max-height: 130px;
        resize: vertical;
        border: 1px solid var(--ic-border);
        border-radius: 17px;
        padding: 11px 12px;
        background: var(--ic-bg-soft);
        color: var(--ic-text);
        font: inherit;
        font-size: 14px;
      }

      #${WIDGET_ID} .ic-send {
        border: 0;
        border-radius: 17px;
        padding: 13px 15px;
        background: var(--ic-primary);
        color: #fff;
        font-weight: 850;
        cursor: pointer;
      }

      #${WIDGET_ID} .ic-send:disabled,
      #${WIDGET_ID} .ic-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      #${WIDGET_ID} .ic-error {
        color: var(--ic-danger);
        font-size: 12px;
        margin-top: 8px;
        display: none;
      }

      #${WIDGET_ID}.ic-has-error .ic-error { display: block; }

      @media (max-width: 520px) {
        #${WIDGET_ID} .ic-panel {
          left: 10px;
          right: 10px;
          bottom: 76px;
          width: auto;
          height: min(720px, calc(100vh - 96px));
          border-radius: 22px;
        }
        #${WIDGET_ID} .ic-button { right: 14px; bottom: 14px; }
        #${WIDGET_ID} .ic-trustbar { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderSafeguardingBanner(wrapper, level, safeguarding) {
    if (!level || level === "standard" || level === "none") return;

    const banner = document.createElement("div");
    banner.className = `ic-sg-banner ${level === "urgent" ? "urgent" : "concern"}`;
    const fallback = level === "urgent"
      ? "Prioritise immediate safety. Follow safeguarding procedures and inform the relevant manager/DSL without delay."
      : "Ensure this is recorded clearly, shared with the relevant manager/DSL, and reviewed against the young person's plan.";
    banner.innerHTML = `
      <strong>${level === "urgent" ? "Immediate safeguarding concern" : "Safeguarding consideration"}</strong>
      <p>${escapeHtml((safeguarding && safeguarding.banner) || fallback)}</p>
    `;
    wrapper.appendChild(banner);
  }

  function renderSuggestedActions(wrapper, actions) {
    const safeActions = Array.isArray(actions) ? actions.filter((item) => item && item.label) : [];
    if (!safeActions.length) return;

    const panel = document.createElement("div");
    panel.className = "ic-action-panel";
    panel.innerHTML = `<div class="ic-action-title">Suggested actions</div>`;

    safeActions.slice(0, 5).forEach((action) => {
      const button = document.createElement("button");
      button.className = "ic-action-btn";
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(action.label);
          button.textContent = "Copied action";
          setTimeout(() => (button.textContent = action.label), 1200);
        } catch (_) {}
      });
      panel.appendChild(button);
    });

    wrapper.appendChild(panel);
  }

  function renderSources(wrapper, citations) {
    const safeCitations = Array.isArray(citations) ? citations.filter((item) => item && item.url) : [];
    if (!safeCitations.length) return;

    const box = document.createElement("div");
    box.className = "ic-sources";
    box.innerHTML = `<div class="ic-sources-title">Sources and evidence base</div>`;

    safeCitations.slice(0, 5).forEach((source) => {
      const url = safeUrl(source.url);
      if (!url) return;
      const link = document.createElement("a");
      link.className = "ic-source";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.innerHTML = `
        <strong>${escapeHtml(source.title || "Source")}</strong>
        <span>${escapeHtml(source.excerpt || source.source_type || "Official source")}</span>
      `;
      box.appendChild(link);
    });

    wrapper.appendChild(box);
  }

  function renderMessage(root, role, text, meta, options) {
    const opts = options || {};
    const messages = root.querySelector(".ic-messages");
    const wrapper = document.createElement("div");
    wrapper.className = `ic-message ic-${role}`;

    if (role === "assistant") {
      renderSafeguardingBanner(wrapper, opts.safeguardingLevel, opts.safeguarding);
    }

    const bubble = document.createElement("div");
    bubble.className = "ic-bubble";
    bubble.innerHTML = role === "assistant" ? renderMarkdown(text) : escapeHtml(text);
    wrapper.appendChild(bubble);

    renderSuggestedActions(wrapper, opts.suggestedActions);
    renderSources(wrapper, opts.citations);

    if (meta) {
      const metaEl = document.createElement("div");
      metaEl.className = "ic-meta";
      metaEl.textContent = meta;
      wrapper.appendChild(metaEl);
    }

    if (role === "assistant" && text) {
      const actions = document.createElement("div");
      actions.className = "ic-actions";

      const copy = document.createElement("button");
      copy.className = "ic-copy";
      copy.type = "button";
      copy.textContent = "Copy answer";
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = "Copied";
          setTimeout(() => (copy.textContent = "Copy answer"), 1400);
        } catch (_) {
          copy.textContent = "Copy failed";
          setTimeout(() => (copy.textContent = "Copy answer"), 1400);
        }
      });
      actions.appendChild(copy);
      wrapper.appendChild(actions);
    }

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  function setMode(root, mode) {
    root.dataset.mode = mode;
    root.querySelectorAll(".ic-mode").forEach((button) => {
      button.classList.toggle("ic-active", button.dataset.mode === mode);
    });
  }

  async function sendMessage(root, config, message) {
    root.classList.remove("ic-has-error");
    const input = root.querySelector(".ic-input");
    const send = root.querySelector(".ic-send");
    const error = root.querySelector(".ic-error");
    const mode = root.dataset.mode || config.defaultMode || "guidance";

    input.disabled = true;
    send.disabled = true;
    renderMessage(root, "user", message);
    const loading = renderMessage(root, "assistant", "Thinking through practice, safeguarding and inspection evidence...");

    try {
      const response = await fetch(config.apiUrl + "/v1/assistant/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({
          message: message,
          mode: mode,
          context: {
            organisation_id: config.organisationId,
            host_system: config.hostSystem,
            user_role: config.userRole,
            record_type: config.recordType,
            page_url: window.location.href,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.error || "IndiCare Assistant could not respond.");
      }

      loading.remove();
      const metaParts = [];
      if (data.audit_id) metaParts.push(`Audit: ${data.audit_id}`);
      if (data.safeguarding_level && data.safeguarding_level !== "standard") metaParts.push(`Safeguarding: ${data.safeguarding_level}`);
      metaParts.push(`Mode: ${data.mode || mode}`);

      renderMessage(root, "assistant", data.answer || "No answer returned.", metaParts.join(" · "), {
        citations: data.citations || [],
        suggestedActions: data.suggested_actions || [],
        safeguardingLevel: data.safeguarding_level,
        safeguarding: data.metadata && data.metadata.explainability ? data.metadata.explainability.safeguarding : null,
      });
    } catch (err) {
      loading.remove();
      root.classList.add("ic-has-error");
      error.textContent = err && err.message ? err.message : "Something went wrong.";
      renderMessage(root, "assistant", "I could not complete that request just now. Please try again.");
    } finally {
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  function init(rawConfig) {
    const config = normaliseConfig(rawConfig);

    if (!config.apiUrl || !config.apiKey) {
      throw new Error("IndiCareAssistant.init requires apiUrl and apiKey.");
    }

    const existing = document.getElementById(WIDGET_ID);
    if (existing) existing.remove();

    createStyles();

    const root = document.createElement("div");
    root.id = WIDGET_ID;
    root.className = `${config.position === "bottom-left" ? "ic-bottom-left" : "ic-bottom-right"} ${config.theme === "dark" ? "ic-dark" : ""}`;
    root.dataset.mode = config.defaultMode;

    root.innerHTML = `
      <button class="ic-button" type="button">${escapeHtml(config.buttonLabel)}</button>
      <section class="ic-panel" aria-label="${escapeHtml(config.title)}">
        <header class="ic-header">
          <div>
            <div class="ic-title">${escapeHtml(config.title)}</div>
            <div class="ic-subtitle">${escapeHtml(config.subtitle)}</div>
          </div>
          <button class="ic-close" type="button" aria-label="Close">×</button>
        </header>
        <div class="ic-trustbar">
          <div class="ic-trust-pill">Ofsted lens</div>
          <div class="ic-trust-pill">Evidence checks</div>
          <div class="ic-trust-pill">Safeguarding-aware</div>
        </div>
        <div class="ic-modebar" aria-label="Assistant mode">
          <button class="ic-mode" type="button" data-mode="guidance">Guidance</button>
          <button class="ic-mode" type="button" data-mode="recording_support">Recording</button>
          <button class="ic-mode" type="button" data-mode="safeguarding_review">Safeguarding</button>
          <button class="ic-mode" type="button" data-mode="chronology">Chronology</button>
          <button class="ic-mode" type="button" data-mode="reg45_review">Reg 45</button>
        </div>
        <div class="ic-messages"></div>
        <footer class="ic-footer">
          <form class="ic-form">
            <textarea class="ic-input" placeholder="Ask about a situation, improve a note, or check safeguarding..."></textarea>
            <button class="ic-send" type="submit">Send</button>
          </form>
          <div class="ic-error"></div>
        </footer>
      </section>
    `;

    document.body.appendChild(root);
    setMode(root, config.defaultMode);

    const button = root.querySelector(".ic-button");
    const close = root.querySelector(".ic-close");
    const form = root.querySelector(".ic-form");
    const input = root.querySelector(".ic-input");

    renderMessage(
      root,
      "assistant",
      "Hello, I’m IndiCare Assistant. I can help you improve records, think through safeguarding, prepare chronologies and evidence practice for Reg 45 or Ofsted. Choose a mode above or ask naturally."
    );

    root.querySelectorAll(".ic-mode").forEach((modeButton) => {
      modeButton.addEventListener("click", function () {
        setMode(root, modeButton.dataset.mode || "guidance");
      });
    });

    button.addEventListener("click", function () {
      root.classList.toggle("ic-open");
      if (root.classList.contains("ic-open")) input.focus();
    });

    close.addEventListener("click", function () {
      root.classList.remove("ic-open");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      input.value = "";
      sendMessage(root, config, message);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  }

  window.IndiCareAssistant = { init };
})();
