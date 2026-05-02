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
      subtitle: safe.subtitle || "Residential care support",
      buttonLabel: safe.buttonLabel || "Ask IndiCare",
      theme: safe.theme || "light",
    };
  }

  function createStyles() {
    if (document.getElementById("indicare-assistant-widget-styles")) return;

    const style = document.createElement("style");
    style.id = "indicare-assistant-widget-styles";
    style.textContent = `
      #${WIDGET_ID} {
        --ic-bg: #ffffff;
        --ic-bg-soft: #f8fafc;
        --ic-text: #17211f;
        --ic-muted: #64748b;
        --ic-border: rgba(15, 23, 42, 0.14);
        --ic-primary: #16313a;
        --ic-primary-2: #2f8f83;
        --ic-user: #eaf6f3;
        --ic-assistant: #f8fafc;
        --ic-danger: #b42318;
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
        --ic-user: rgba(47, 143, 131, 0.22);
        --ic-assistant: rgba(255, 255, 255, 0.06);
      }

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
        font-weight: 800;
        font-size: 14px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
        cursor: pointer;
      }

      #${WIDGET_ID}.ic-bottom-left .ic-button { left: 20px; right: auto; }

      #${WIDGET_ID} .ic-panel {
        position: fixed;
        z-index: 2147483001;
        right: 20px;
        bottom: 84px;
        width: min(420px, calc(100vw - 32px));
        height: min(640px, calc(100vh - 112px));
        border: 1px solid var(--ic-border);
        border-radius: 24px;
        background: var(--ic-bg);
        color: var(--ic-text);
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
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

      #${WIDGET_ID} .ic-title { font-weight: 850; font-size: 16px; }
      #${WIDGET_ID} .ic-subtitle { font-size: 12px; opacity: 0.88; margin-top: 2px; }
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

      #${WIDGET_ID} .ic-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: var(--ic-bg-soft);
      }

      #${WIDGET_ID} .ic-message {
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      #${WIDGET_ID} .ic-message.ic-user { align-items: flex-end; }
      #${WIDGET_ID} .ic-bubble {
        max-width: 92%;
        border: 1px solid var(--ic-border);
        border-radius: 18px;
        padding: 11px 13px;
        font-size: 14px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      #${WIDGET_ID} .ic-user .ic-bubble { background: var(--ic-user); }
      #${WIDGET_ID} .ic-assistant .ic-bubble { background: var(--ic-assistant); }
      #${WIDGET_ID} .ic-meta {
        font-size: 11px;
        color: var(--ic-muted);
        padding: 0 4px;
      }

      #${WIDGET_ID} .ic-copy {
        align-self: flex-start;
        border: 1px solid var(--ic-border);
        background: var(--ic-bg);
        color: var(--ic-text);
        border-radius: 999px;
        padding: 5px 9px;
        font-size: 11px;
        cursor: pointer;
      }

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
        min-height: 44px;
        max-height: 120px;
        resize: vertical;
        border: 1px solid var(--ic-border);
        border-radius: 16px;
        padding: 11px 12px;
        background: var(--ic-bg-soft);
        color: var(--ic-text);
        font: inherit;
        font-size: 14px;
      }

      #${WIDGET_ID} .ic-send {
        border: 0;
        border-radius: 16px;
        padding: 12px 14px;
        background: var(--ic-primary);
        color: #fff;
        font-weight: 800;
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
          height: min(680px, calc(100vh - 96px));
          border-radius: 22px;
        }
        #${WIDGET_ID} .ic-button { right: 14px; bottom: 14px; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderMessage(root, role, text, meta) {
    const messages = root.querySelector(".ic-messages");
    const wrapper = document.createElement("div");
    wrapper.className = `ic-message ic-${role}`;

    const bubble = document.createElement("div");
    bubble.className = "ic-bubble";
    bubble.innerHTML = escapeHtml(text);
    wrapper.appendChild(bubble);

    if (meta) {
      const metaEl = document.createElement("div");
      metaEl.className = "ic-meta";
      metaEl.textContent = meta;
      wrapper.appendChild(metaEl);
    }

    if (role === "assistant" && text) {
      const copy = document.createElement("button");
      copy.className = "ic-copy";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = "Copied";
          setTimeout(() => (copy.textContent = "Copy"), 1400);
        } catch (_) {
          copy.textContent = "Copy failed";
          setTimeout(() => (copy.textContent = "Copy"), 1400);
        }
      });
      wrapper.appendChild(copy);
    }

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  async function sendMessage(root, config, message) {
    root.classList.remove("ic-has-error");
    const input = root.querySelector(".ic-input");
    const send = root.querySelector(".ic-send");
    const error = root.querySelector(".ic-error");

    input.disabled = true;
    send.disabled = true;
    renderMessage(root, "user", message);
    const loading = renderMessage(root, "assistant", "Thinking...");

    try {
      const response = await fetch(config.apiUrl + "/v1/assistant/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({
          message: message,
          mode: "general",
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
      renderMessage(root, "assistant", data.answer || "No answer returned.", data.audit_id ? `Audit: ${data.audit_id}` : null);
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
        <div class="ic-messages"></div>
        <footer class="ic-footer">
          <form class="ic-form">
            <textarea class="ic-input" placeholder="Ask about recording, safeguarding, Reg 45 or care practice..."></textarea>
            <button class="ic-send" type="submit">Send</button>
          </form>
          <div class="ic-error"></div>
        </footer>
      </section>
    `;

    document.body.appendChild(root);

    const button = root.querySelector(".ic-button");
    const close = root.querySelector(".ic-close");
    const form = root.querySelector(".ic-form");
    const input = root.querySelector(".ic-input");

    renderMessage(
      root,
      "assistant",
      "Hello, I’m IndiCare Assistant. I can help with care recording, safeguarding-aware wording, summaries, chronologies and Reg 45 preparation."
    );

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
