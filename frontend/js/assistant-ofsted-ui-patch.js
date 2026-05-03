/*
  IndiCare Assistant Ofsted UI polish patch.
  Loaded after assistant.js to improve presentation without rewriting the main assistant file.
*/
(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    return /^https:\/\//i.test(raw) ? raw : "";
  }

  function enhanceBeautify(text) {
    return String(text || "")
      .replace(/Inspection lens:/gi, "### Inspection lens")
      .replace(/Recording\s*\/\s*evidence to check:/gi, "### Recording / evidence to check")
      .replace(/Evidence to check:/gi, "### Evidence to check")
      .replace(/Safeguarding considerations:/gi, "### Safeguarding considerations")
      .replace(/Management oversight:/gi, "### Management oversight")
      .replace(/Reg 45 lens:/gi, "### Reg 45 lens")
      .replace(/Sources:/gi, "### Sources");
  }

  function renderMarkdown(text, roleName) {
    let s = roleName === "assistant" ? enhanceBeautify(text) : String(text || "");
    s = escapeHtml(s)
      .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
      .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.*?)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    const lines = s.split("\n");
    let html = "";
    let list = false;

    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        if (!list) {
          html += "<ul>";
          list = true;
        }
        html += `<li>${line.replace(/^\s*-\s+/, "")}</li>`;
        continue;
      }

      if (list) {
        html += "</ul>";
        list = false;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        html += "<br>";
      } else if (/^<h[23]>.*<\/h[23]>$/.test(trimmed)) {
        html += trimmed;
      } else {
        html += `<p>${line}</p>`;
      }
    }

    if (list) html += "</ul>";
    return html;
  }

  function sourceCard(source) {
    const url = safeUrl(source && source.url);
    if (!url) return "";
    const title = escapeHtml(source.title || "Source");
    const type = escapeHtml(source.source_type || "official source");
    const excerpt = escapeHtml(source.excerpt || "Relevant source used by IndiCare Assistant.");
    return `
      <a class="ofsted-source-card" href="${url}" target="_blank" rel="noopener noreferrer">
        <strong>${title}</strong>
        <span>${type}</span>
        <small>${excerpt}</small>
      </a>
    `;
  }

  function renderSources(sources) {
    const clean = Array.isArray(sources)
      ? sources.filter((source) => source && safeUrl(source.url))
      : [];
    if (!clean.length) return "";

    return `
      <div class="ofsted-source-panel">
        <div class="ofsted-source-title">Sources and evidence base</div>
        ${clean.slice(0, 6).map(sourceCard).join("")}
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById("assistant-ofsted-ui-patch-styles")) return;

    const style = document.createElement("style");
    style.id = "assistant-ofsted-ui-patch-styles";
    style.textContent = `
      .msg.assistant .bubble,
      .assistant-msg .bubble,
      .message.assistant .bubble {
        line-height: 1.55;
      }

      .msg.assistant .bubble h2,
      .msg.assistant .bubble h3,
      .assistant-msg .bubble h2,
      .assistant-msg .bubble h3,
      .message.assistant .bubble h2,
      .message.assistant .bubble h3 {
        margin: 14px 0 7px;
        font-size: 0.95rem;
        color: #16675f;
        letter-spacing: -0.01em;
      }

      .msg.assistant .bubble h2:first-child,
      .msg.assistant .bubble h3:first-child,
      .assistant-msg .bubble h2:first-child,
      .assistant-msg .bubble h3:first-child,
      .message.assistant .bubble h2:first-child,
      .message.assistant .bubble h3:first-child {
        margin-top: 0;
      }

      .msg.assistant .bubble a,
      .assistant-msg .bubble a,
      .message.assistant .bubble a {
        color: #16766d;
        font-weight: 800;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .ofsted-source-panel {
        margin-top: 12px;
        border: 1px solid rgba(22, 103, 95, 0.18);
        border-radius: 16px;
        padding: 12px;
        background: rgba(47, 143, 131, 0.07);
      }

      .ofsted-source-title {
        font-size: 0.72rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #16675f;
        margin-bottom: 8px;
      }

      .ofsted-source-card {
        display: block;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 12px;
        background: #ffffff;
        padding: 10px;
        margin-top: 8px;
        text-decoration: none;
        color: #17211f;
      }

      .ofsted-source-card strong {
        display: block;
        font-size: 0.86rem;
        margin-bottom: 3px;
      }

      .ofsted-source-card span {
        display: block;
        font-size: 0.72rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }

      .ofsted-source-card small {
        display: block;
        color: #475569;
        line-height: 1.35;
      }

      .ofsted-trust-strip {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 14px;
        justify-content: center;
      }

      .ofsted-trust-pill {
        border: 1px solid rgba(22, 103, 95, 0.18);
        background: rgba(47, 143, 131, 0.08);
        color: #16675f;
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 0.76rem;
        font-weight: 800;
      }

      body.theme-dark .ofsted-source-card {
        background: rgba(255,255,255,0.06);
        color: #f8fafc;
        border-color: rgba(226,232,240,0.16);
      }

      body.theme-dark .ofsted-source-card small,
      body.theme-dark .ofsted-source-card span {
        color: #cbd5e1;
      }
    `;
    document.head.appendChild(style);
  }

  function patchRender() {
    if (typeof window.render === "function") {
      window.render = function patchedRender(text, roleName = "assistant") {
        return renderMarkdown(text, roleName);
      };
    }
  }

  function patchStructuredPrompt() {
    if (typeof window.buildStructuredPrompt === "function") {
      window.buildStructuredPrompt = function patchedStructuredPrompt(intent) {
        const map = {
          incident:
            "Improve or structure the supplied incident information using factual, neutral, safeguarding-aware language. Do not invent missing details. Include inspection-ready evidence prompts only where helpful.",
          risk:
            "Help review the supplied risk information. Identify presenting risks, protective factors, staff actions, oversight and review points. Do not invent facts.",
          handover:
            "Rewrite the supplied information into a concise handover summary with key risks, actions completed and outstanding actions. Keep it operational.",
          chronology:
            "Rewrite the supplied information as a concise, factual chronology entry. Include date/time only if supplied. Do not add unnecessary template sections.",
          keywork:
            "Improve the supplied keywork information with discussion, young person's views, support offered and next steps where known. Do not invent the child's voice.",
          review:
            "Review the supplied information through an Ofsted-ready lens: impact, evidence, oversight, actions and follow-through.",
          safeguarding:
            "Give safeguarding-aware guidance prioritising immediate safety, risk, protection, who may need informing, and recording expectations. Avoid legal certainty where thresholds require professional judgement.",
          daily_note:
            "Improve and rewrite the supplied daily note. Keep it factual, child-centred, neutral and suitable for care records. Do not create a full template unless asked.",
          report:
            "Improve the supplied information into a clear report-style summary, keeping facts separate from interpretation and highlighting evidence or missing details.",
          policy:
            "Answer the policy or guidance question clearly. Include practical application, recording implications and sources where available.",
          general:
            "Answer clearly as an Ofsted-ready residential children's home assistant. Include inspection lens, evidence to check and sources where relevant.",
        };
        return map[intent] || map.general;
      };
    }
  }

  function patchMetaRendering() {
    const originalScroll = window.scrollMessagesToBottom;

    window.renderOfstedSourcesForLatestAssistantMessage = function renderLatestSources() {
      try {
        const sources = window.state?.currentStreamMeta?.sources || [];
        const html = renderSources(sources);
        if (!html) return;

        const messages = document.getElementById("messages");
        if (!messages) return;

        const candidates = Array.from(
          messages.querySelectorAll(".msg.assistant, .assistant-msg, .message.assistant")
        );
        const latest = candidates[candidates.length - 1];
        if (!latest || latest.querySelector(".ofsted-source-panel")) return;

        latest.insertAdjacentHTML("beforeend", html);
        if (typeof originalScroll === "function") originalScroll();
      } catch (error) {
        console.warn("Could not render Ofsted source cards", error);
      }
    };
  }

  function addTrustStrip() {
    const empty = document.getElementById("empty");
    if (!empty || empty.querySelector(".ofsted-trust-strip")) return;

    const strip = document.createElement("div");
    strip.className = "ofsted-trust-strip";
    strip.innerHTML = `
      <span class="ofsted-trust-pill">Ofsted lens</span>
      <span class="ofsted-trust-pill">Evidence checks</span>
      <span class="ofsted-trust-pill">Clickable sources</span>
      <span class="ofsted-trust-pill">Safeguarding-aware</span>
    `;

    const target = empty.querySelector(".assistant-trust-row") || empty.querySelector(".assistant-empty-inner") || empty;
    target.appendChild(strip);
  }

  function init() {
    injectStyles();
    patchRender();
    patchStructuredPrompt();
    patchMetaRendering();
    addTrustStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
