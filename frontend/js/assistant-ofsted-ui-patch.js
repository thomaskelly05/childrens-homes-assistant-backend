/*
  IndiCare Assistant Premium Standalone UI layer.
  This keeps /assistant separate from the OS assistant while making it feel
  like a purpose-built children's homes practice assistant, not a generic chat UI.
*/
(function () {
  const MODE_STORAGE_KEY = "indicare_assistant_ofsted_mode";

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

  function currentMeta() {
    return window.state && window.state.currentStreamMeta
      ? window.state.currentStreamMeta
      : { sources: [], runtime: {}, explainability: {}, suggested_actions: [], safeguarding: {} };
  }

  function getBoundaryMeta(meta) {
    const explainability = (meta && meta.explainability) || {};
    const assistantContext = (meta && meta.assistant_context) || {};
    const runtime = (meta && meta.runtime) || {};
    return (
      meta.boundary ||
      explainability.boundary ||
      assistantContext.boundary ||
      {
        assistant_surface: "standalone",
        data_boundary: runtime.data_boundary || "public_guidance_only",
        internal_data_access: false,
      }
    );
  }

  function getSafeguardingMeta(meta) {
    const explainability = (meta && meta.explainability) || {};
    const runtime = (meta && meta.runtime) || {};
    return (
      meta.safeguarding ||
      explainability.safeguarding ||
      {
        level: runtime.safeguarding_level || "standard",
        banner: "",
        matched_signals: [],
      }
    );
  }

  function enhanceBeautify(text) {
    return String(text || "")
      .replace(/Improved note:/gi, "### Improved note")
      .replace(/Improved note/gi, "### Improved note")
      .replace(/Details to add if known:/gi, "### Details to add if known")
      .replace(/What this means:/gi, "### What this means")
      .replace(/What to do next:/gi, "### What to do next")
      .replace(/How to record it:/gi, "### How to record it")
      .replace(/Inspection lens:/gi, "### Inspection lens")
      .replace(/Recording\s*\/\s*evidence to check:/gi, "### Recording / evidence to check")
      .replace(/Recording and evidence to check:/gi, "### Recording / evidence to check")
      .replace(/Evidence to check:/gi, "### Evidence to check")
      .replace(/Safeguarding considerations:/gi, "### Safeguarding considerations")
      .replace(/Immediate actions:/gi, "### Immediate actions")
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
    return `
      <a class="ofsted-source-card" href="${url}" target="_blank" rel="noopener noreferrer">
        <strong>${escapeHtml(source.title || "Source")}</strong>
        <span>${escapeHtml(source.source_type || "official source")}</span>
        <small>${escapeHtml(source.excerpt || "Relevant source used by IndiCare Assistant.")}</small>
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
        <div class="ofsted-panel-title">Evidence base used</div>
        ${clean.slice(0, 6).map(sourceCard).join("")}
      </div>
    `;
  }

  function renderSafeguardingBanner(meta) {
    const safeguarding = getSafeguardingMeta(meta || {});
    const level = String(safeguarding.level || meta?.runtime?.safeguarding_level || "standard").toLowerCase();
    if (!["urgent", "concern"].includes(level)) return "";

    const title = level === "urgent" ? "Immediate safeguarding concern" : "Safeguarding consideration";
    const fallback =
      level === "urgent"
        ? "Prioritise immediate safety. Follow safeguarding procedures and inform the relevant manager/DSL without delay."
        : "Ensure this is recorded clearly, shared with the relevant manager/DSL, and reviewed against the young person's plan.";
    const matched = Array.isArray(safeguarding.matched_signals)
      ? safeguarding.matched_signals.map((item) => item && item.label).filter(Boolean).slice(0, 3)
      : [];

    return `
      <div class="ofsted-sg-banner ${level}">
        <strong>${level === "urgent" ? "⚠️ " : "• "}${escapeHtml(title)}</strong>
        <p>${escapeHtml(safeguarding.banner || fallback)}</p>
        ${matched.length ? `<small>Detected indicators: ${escapeHtml(matched.join(", "))}</small>` : ""}
      </div>
    `;
  }

  function renderBoundaryPanel(meta) {
    const boundary = getBoundaryMeta(meta || {});
    const internalRequest = boundary.internal_data_request_detected === true;
    const dataBoundary = boundary.data_boundary || "public_guidance_only";
    const internalAccess = boundary.internal_data_access === true;

    if (!internalRequest && dataBoundary !== "public_guidance_only" && dataBoundary !== "standalone_public_guidance_only") {
      return "";
    }

    return `
      <div class="ofsted-boundary-panel ${internalRequest ? "blocked" : ""}">
        <strong>${internalRequest ? "OS records are not available here" : "Standalone guidance mode"}</strong>
        <span>${internalAccess ? "Internal OS access enabled" : "Does not access child, home, chronology, incident, daily note or quality dashboard records."}</span>
      </div>
    `;
  }

  function renderSuggestedActions(actions) {
    const clean = Array.isArray(actions)
      ? actions.filter((action) => action && (action.label || typeof action === "string"))
      : [];
    if (!clean.length) return "";

    return `
      <div class="ofsted-action-panel">
        <div class="ofsted-panel-title">Suggested actions</div>
        ${clean
          .slice(0, 6)
          .map((action) => {
            const label = typeof action === "string" ? action : action.label;
            return `<button type="button" class="ofsted-action-btn" data-action-label="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderFollowUps() {
    return `
      <div class="ofsted-followup-panel">
        <button type="button" class="ofsted-followup-btn" data-followup="Turn this into a paste-ready care record.">Turn into record</button>
        <button type="button" class="ofsted-followup-btn" data-followup="What would Ofsted or a manager look for in this situation?">Ofsted lens</button>
        <button type="button" class="ofsted-followup-btn" data-followup="Create a concise chronology entry from this.">Chronology</button>
      </div>
    `;
  }

  function renderQualityFooter(meta) {
    const runtime = (meta && meta.runtime) || {};
    const boundary = getBoundaryMeta(meta || {});
    const mode = runtime.response_mode || runtime.assistant_mode || "guidance";
    const level = runtime.safeguarding_level || getSafeguardingMeta(meta || {}).level || "standard";
    const sources = Array.isArray(runtime.official_sources_loaded)
      ? runtime.official_sources_loaded.filter(Boolean).length
      : 0;

    return `
      <div class="ofsted-quality-footer">
        <span>Mode: ${escapeHtml(mode)}</span>
        <span>Safeguarding: ${escapeHtml(level)}</span>
        <span>${boundary.internal_data_access ? "OS data access" : "Guidance only"}</span>
        ${sources ? `<span>Sources: ${sources}</span>` : ""}
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById("assistant-ofsted-ui-patch-styles")) return;

    const style = document.createElement("style");
    style.id = "assistant-ofsted-ui-patch-styles";
    style.textContent = `
      :root {
        --ofsted-ink: #12211f;
        --ofsted-muted: #64748b;
        --ofsted-line: rgba(15, 23, 42, 0.12);
        --ofsted-teal: #16766d;
        --ofsted-teal-dark: #115e59;
        --ofsted-soft: rgba(47, 143, 131, 0.08);
        --ofsted-card: #ffffff;
        --ofsted-red-bg: #fff1f1;
        --ofsted-red-border: #f5c2c2;
        --ofsted-red-text: #7f1d1d;
        --ofsted-amber-bg: #fff7ed;
        --ofsted-amber-border: #fed7aa;
        --ofsted-amber-text: #7c2d12;
      }

      body.theme-dark {
        --ofsted-ink: #f8fafc;
        --ofsted-muted: #cbd5e1;
        --ofsted-line: rgba(226,232,240,0.16);
        --ofsted-card: rgba(255,255,255,0.06);
        --ofsted-soft: rgba(125, 211, 199, 0.11);
      }

      .assistant-empty-inner { max-width: 1020px !important; }
      .assistant-title { letter-spacing: -0.045em; }

      .ofsted-context-strip {
        width: min(1020px, calc(100% - 28px));
        margin: 12px auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        border: 1px solid var(--ofsted-line);
        background: var(--ofsted-card);
        color: var(--ofsted-muted);
        border-radius: 18px;
        padding: 10px 12px;
        font-size: 0.78rem;
      }

      .ofsted-context-strip strong { color: var(--ofsted-teal-dark); }
      .ofsted-context-pill {
        border: 1px solid var(--ofsted-line);
        border-radius: 999px;
        padding: 5px 8px;
        background: var(--ofsted-soft);
        color: var(--ofsted-teal-dark);
        font-weight: 850;
      }

      .ofsted-hero-panel {
        margin: 18px auto 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        width: min(940px, 100%);
      }

      .ofsted-hero-card {
        border: 1px solid var(--ofsted-line);
        border-radius: 20px;
        padding: 14px;
        background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(247,250,249,0.82));
        color: var(--ofsted-ink);
        text-align: left;
        box-shadow: 0 16px 36px rgba(15,23,42,0.08);
        cursor: pointer;
      }

      body.theme-dark .ofsted-hero-card { background: rgba(255,255,255,0.06); }
      .ofsted-hero-card strong { display: block; font-size: 0.92rem; margin-bottom: 5px; }
      .ofsted-hero-card span { display: block; color: var(--ofsted-muted); line-height: 1.35; font-size: 0.78rem; }

      .ofsted-modebar,
      .ofsted-quickdock {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
        margin: 16px auto 0;
        width: min(940px, 100%);
      }

      .ofsted-mode-btn,
      .ofsted-quick-btn,
      .ofsted-followup-btn {
        border: 1px solid var(--ofsted-line);
        background: var(--ofsted-card);
        color: var(--ofsted-ink);
        border-radius: 999px;
        padding: 8px 12px;
        font-weight: 850;
        font-size: 0.78rem;
        cursor: pointer;
      }

      .ofsted-mode-btn.active,
      .ofsted-quick-btn:hover,
      .ofsted-followup-btn:hover {
        background: var(--ofsted-soft);
        color: var(--ofsted-teal-dark);
        border-color: rgba(22, 118, 109, 0.35);
      }

      .msg.assistant .bubble,
      .assistant-msg .bubble,
      .message.assistant .bubble {
        line-height: 1.58;
        border: 1px solid var(--ofsted-line) !important;
        box-shadow: 0 14px 34px rgba(15,23,42,0.07);
      }

      .msg.assistant .bubble h2,
      .msg.assistant .bubble h3,
      .assistant-msg .bubble h2,
      .assistant-msg .bubble h3,
      .message.assistant .bubble h2,
      .message.assistant .bubble h3 {
        margin: 16px 0 7px;
        font-size: 0.95rem;
        color: var(--ofsted-teal-dark);
        letter-spacing: -0.015em;
        padding-top: 8px;
        border-top: 1px solid rgba(22, 118, 109, 0.12);
      }

      .msg.assistant .bubble h2:first-child,
      .msg.assistant .bubble h3:first-child,
      .assistant-msg .bubble h2:first-child,
      .assistant-msg .bubble h3:first-child,
      .message.assistant .bubble h2:first-child,
      .message.assistant .bubble h3:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: 0;
      }

      .msg.assistant .bubble a,
      .assistant-msg .bubble a,
      .message.assistant .bubble a { color: var(--ofsted-teal); font-weight: 850; text-decoration: underline; text-underline-offset: 2px; }
      .msg.assistant .bubble ul,
      .assistant-msg .bubble ul,
      .message.assistant .bubble ul { padding-left: 1.15rem; }

      .ofsted-sg-banner,
      .ofsted-action-panel,
      .ofsted-source-panel,
      .ofsted-quality-footer,
      .ofsted-boundary-panel,
      .ofsted-followup-panel {
        width: min(760px, 92%);
        margin: 10px 0 0 48px;
      }

      .ofsted-sg-banner,
      .ofsted-boundary-panel {
        border-radius: 18px;
        padding: 13px 15px;
        font-size: 0.86rem;
        line-height: 1.42;
        border: 1px solid var(--ofsted-line);
      }

      .ofsted-sg-banner strong,
      .ofsted-boundary-panel strong { display: block; font-weight: 950; margin-bottom: 4px; }
      .ofsted-sg-banner p { margin: 0; }
      .ofsted-sg-banner small { display: block; margin-top: 7px; opacity: 0.86; }

      .ofsted-sg-banner.urgent { background: var(--ofsted-red-bg); border-color: var(--ofsted-red-border); color: var(--ofsted-red-text); }
      .ofsted-sg-banner.concern { background: var(--ofsted-amber-bg); border-color: var(--ofsted-amber-border); color: var(--ofsted-amber-text); }
      .ofsted-boundary-panel { background: var(--ofsted-soft); color: var(--ofsted-teal-dark); }
      .ofsted-boundary-panel.blocked { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }

      body.theme-dark .ofsted-sg-banner.urgent { background: rgba(127, 29, 29, 0.22); color: #fecaca; }
      body.theme-dark .ofsted-sg-banner.concern { background: rgba(124, 45, 18, 0.22); color: #fed7aa; }
      body.theme-dark .ofsted-boundary-panel.blocked { background: rgba(30,58,138,0.24); color: #bfdbfe; }

      .ofsted-action-panel,
      .ofsted-source-panel {
        border: 1px solid var(--ofsted-line);
        border-radius: 18px;
        padding: 12px;
        background: var(--ofsted-card);
      }

      .ofsted-panel-title { font-size: 0.72rem; font-weight: 950; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ofsted-teal-dark); margin-bottom: 8px; }
      .ofsted-action-btn { display: block; width: 100%; text-align: left; border: 1px solid var(--ofsted-line); border-radius: 13px; background: rgba(248,250,252,0.9); color: var(--ofsted-ink); padding: 9px 10px; margin-top: 7px; cursor: pointer; font-weight: 780; }
      body.theme-dark .ofsted-action-btn { background: rgba(255,255,255,0.06); }

      .ofsted-source-card { display: block; border: 1px solid var(--ofsted-line); border-radius: 13px; background: rgba(248,250,252,0.9); padding: 10px; margin-top: 8px; text-decoration: none; color: var(--ofsted-ink); }
      body.theme-dark .ofsted-source-card { background: rgba(255,255,255,0.06); }
      .ofsted-source-card strong { display: block; font-size: 0.86rem; margin-bottom: 3px; }
      .ofsted-source-card span { display: block; font-size: 0.7rem; color: var(--ofsted-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
      .ofsted-source-card small { display: block; color: var(--ofsted-muted); line-height: 1.35; }

      .ofsted-followup-panel { display: flex; gap: 6px; flex-wrap: wrap; }
      .ofsted-quality-footer { display: flex; gap: 6px; flex-wrap: wrap; color: var(--ofsted-muted); font-size: 0.72rem; }
      .ofsted-quality-footer span { border: 1px solid var(--ofsted-line); background: var(--ofsted-card); border-radius: 999px; padding: 5px 8px; }

      .ofsted-trust-strip { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; justify-content: center; }
      .ofsted-trust-pill { border: 1px solid rgba(22, 103, 95, 0.18); background: var(--ofsted-soft); color: var(--ofsted-teal-dark); border-radius: 999px; padding: 7px 10px; font-size: 0.76rem; font-weight: 850; }

      @media (max-width: 860px) {
        .ofsted-hero-panel { grid-template-columns: 1fr 1fr; }
        .ofsted-sg-banner,
        .ofsted-action-panel,
        .ofsted-source-panel,
        .ofsted-quality-footer,
        .ofsted-boundary-panel,
        .ofsted-followup-panel { margin-left: 0; width: 100%; }
      }

      @media (max-width: 560px) {
        .ofsted-hero-panel { grid-template-columns: 1fr; }
        .ofsted-modebar,
        .ofsted-quickdock { justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
        .ofsted-mode-btn,
        .ofsted-quick-btn { white-space: nowrap; }
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
        const mode = localStorage.getItem(MODE_STORAGE_KEY) || "guidance";
        const modePrefix = {
          guidance: "Answer as the standalone IndiCare Assistant. Provide public guidance only. Include practical steps, inspection lens, evidence to check and sources where relevant.",
          recording: "Prioritise paste-ready care-record wording. Use only the text provided by the user. Keep it factual, neutral, child-centred and do not invent missing details.",
          safeguarding: "Prioritise immediate safety, threshold-aware safeguarding thinking, who may need informing, recording expectations and management oversight. Do not claim access to OS records.",
          chronology: "Prioritise concise chronological recording using only supplied information. Include sequence, dates/times where supplied, impact and follow-up actions.",
          reg45: "Prioritise Reg 45 review thinking using only supplied information: evidence, impact, patterns, leadership oversight, actions and monitoring.",
        }[mode] || "Answer as the standalone IndiCare Assistant using public guidance only.";

        const map = {
          incident: "Improve or structure the supplied incident information using factual, neutral, safeguarding-aware language. Do not invent missing details.",
          risk: "Help review the supplied risk information. Identify presenting risks, protective factors, staff actions, oversight and review points. Do not invent facts.",
          handover: "Rewrite the supplied information into a concise handover summary with key risks, actions completed and outstanding actions. Keep it operational.",
          chronology: "Rewrite the supplied information as a concise, factual chronology entry. Include date/time only if supplied. Do not add unnecessary template sections.",
          keywork: "Improve the supplied keywork information with discussion, young person's views, support offered and next steps where known. Do not invent the child's voice.",
          review: "Review the supplied information through an Inspection evidence support lens: impact, evidence, oversight, actions and follow-through.",
          safeguarding: "Give safeguarding-aware guidance prioritising immediate safety, risk, protection, who may need informing, and recording expectations. Avoid legal certainty where thresholds require professional judgement.",
          daily_note: "Improve and rewrite the supplied daily note. Keep it factual, child-centred, neutral and suitable for care records. Do not create a full template unless asked.",
          report: "Improve the supplied information into a clear report-style summary, keeping facts separate from interpretation and highlighting evidence or missing details.",
          policy: "Answer the policy or guidance question clearly. Include practical application, recording implications and sources where available.",
          general: "Answer clearly and professionally for residential children's home practice.",
        };
        return `${modePrefix} ${map[intent] || map.general}`;
      };
    }
  }

  function renderLatestEnhancements() {
    try {
      const meta = currentMeta();
      const messages = document.getElementById("messages");
      if (!messages) return;

      const candidates = Array.from(messages.querySelectorAll(".msg.assistant, .assistant-msg, .message.assistant"));
      const latest = candidates[candidates.length - 1];
      if (!latest || latest.dataset.ofstedEnhanced === "true") return;

      const banner = renderSafeguardingBanner(meta);
      const boundary = renderBoundaryPanel(meta);
      const actions = renderSuggestedActions(meta.suggested_actions || meta.suggestedActions || []);
      const sources = renderSources(meta.sources || []);
      const footer = renderQualityFooter(meta);
      const followups = renderFollowUps();

      if (banner || boundary) latest.insertAdjacentHTML("afterbegin", `${banner}${boundary}`);
      latest.insertAdjacentHTML("beforeend", `${actions}${sources}${followups}${footer}`);

      latest.dataset.ofstedEnhanced = "true";
      if (typeof window.scrollMessagesToBottom === "function") window.scrollMessagesToBottom();
    } catch (error) {
      console.warn("Could not render IndiCare assistant enhancements", error);
    }
  }

  function setInputPrompt(text) {
    const input = document.getElementById("input");
    if (!input) return;
    input.value = text;
    input.focus();
    if (typeof window.resize === "function") window.resize();
  }

  function patchMetaRendering() {
    window.renderOfstedSourcesForLatestAssistantMessage = renderLatestEnhancements;

    const observerTarget = document.getElementById("messages");
    if (observerTarget) {
      const observer = new MutationObserver(() => {
        window.clearTimeout(renderLatestEnhancements._timer);
        renderLatestEnhancements._timer = window.setTimeout(renderLatestEnhancements, 120);
      });
      observer.observe(observerTarget, { childList: true, subtree: true });
    }

    document.addEventListener("click", async (event) => {
      const actionBtn = event.target && event.target.closest ? event.target.closest(".ofsted-action-btn") : null;
      if (actionBtn) {
        const label = actionBtn.dataset.actionLabel || actionBtn.textContent || "";
        try {
          await navigator.clipboard.writeText(label);
          const original = actionBtn.textContent;
          actionBtn.textContent = "Copied action";
          window.setTimeout(() => (actionBtn.textContent = original), 1300);
        } catch (_) {}
        return;
      }

      const followup = event.target && event.target.closest ? event.target.closest(".ofsted-followup-btn") : null;
      if (followup) setInputPrompt(followup.dataset.followup || followup.textContent || "");
    });
  }

  function addBoundaryStrip() {
    if (document.querySelector(".ofsted-context-strip")) return;
    const app = document.getElementById("app") || document.body;
    const strip = document.createElement("div");
    strip.className = "ofsted-context-strip";
    strip.innerHTML = `
      <div><strong>Standalone Assistant</strong> · Guidance only · No access to OS records</div>
      <div class="ofsted-context-pill">Public knowledge + user supplied text only</div>
    `;
    app.prepend(strip);
  }

  function addTrustStrip() {
    const empty = document.getElementById("empty");
    if (!empty || empty.querySelector(".ofsted-trust-strip")) return;

    const welcomeTitle = document.getElementById("welcomeTitle");
    if (welcomeTitle) welcomeTitle.textContent = "How can I support practice today?";

    const welcomeText = document.getElementById("welcomeText");
    if (welcomeText) {
      welcomeText.textContent = "Describe a situation, paste a note, or ask about safeguarding, recording, Reg 45, Ofsted evidence or care practice.";
    }

    const strip = document.createElement("div");
    strip.className = "ofsted-trust-strip";
    strip.innerHTML = `
      <span class="ofsted-trust-pill">Guidance only</span>
      <span class="ofsted-trust-pill">Ofsted lens</span>
      <span class="ofsted-trust-pill">Evidence checks</span>
      <span class="ofsted-trust-pill">Clickable sources</span>
      <span class="ofsted-trust-pill">Safeguarding-aware</span>
    `;

    const target = empty.querySelector(".assistant-trust-row") || empty.querySelector(".assistant-empty-inner") || empty;
    target.appendChild(strip);
  }

  function setMode(mode) {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    document.querySelectorAll(".ofsted-mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  }

  function addModeBarAndHeroCards() {
    const empty = document.getElementById("empty");
    const inner = empty && empty.querySelector(".assistant-empty-inner");
    if (!inner || inner.querySelector(".ofsted-modebar")) return;

    const activeMode = localStorage.getItem(MODE_STORAGE_KEY) || "guidance";

    const modebar = document.createElement("div");
    modebar.className = "ofsted-modebar";
    modebar.innerHTML = `
      <button type="button" class="ofsted-mode-btn" data-mode="guidance">Guidance</button>
      <button type="button" class="ofsted-mode-btn" data-mode="recording">Recording</button>
      <button type="button" class="ofsted-mode-btn" data-mode="safeguarding">Safeguarding</button>
      <button type="button" class="ofsted-mode-btn" data-mode="chronology">Chronology</button>
      <button type="button" class="ofsted-mode-btn" data-mode="reg45">Reg 45</button>
    `;

    const quickdock = document.createElement("div");
    quickdock.className = "ofsted-quickdock";
    quickdock.innerHTML = `
      <button type="button" class="ofsted-quick-btn" data-prompt="Improve this note using factual, child-centred care-recording language: ">Improve a note</button>
      <button type="button" class="ofsted-quick-btn" data-prompt="Check this situation for safeguarding considerations and what needs recording: ">Check safeguarding</button>
      <button type="button" class="ofsted-quick-btn" data-prompt="What would Ofsted or a manager look for in this situation? ">Inspection lens</button>
      <button type="button" class="ofsted-quick-btn" data-prompt="Create a concise chronology entry from this information: ">Chronology</button>
    `;

    const hero = document.createElement("div");
    hero.className = "ofsted-hero-panel";
    hero.innerHTML = `
      <button type="button" class="ofsted-hero-card" data-prompt="Improve this daily note and show what detail is missing: ">
        <strong>Improve a record</strong>
        <span>Turn rough wording into factual, child-centred care recording.</span>
      </button>
      <button type="button" class="ofsted-hero-card" data-prompt="Check this safeguarding concern and tell me what to record, who may need informing and what oversight is needed: ">
        <strong>Check safeguarding</strong>
        <span>Think through immediate safety, escalation and recording expectations.</span>
      </button>
      <button type="button" class="ofsted-hero-card" data-prompt="Create a concise chronology entry from this information: ">
        <strong>Create chronology</strong>
        <span>Sequence events clearly with impact, actions and follow-up.</span>
      </button>
      <button type="button" class="ofsted-hero-card" data-prompt="Review this information through a Reg 45 and Ofsted evidence lens: ">
        <strong>Reg 45 / Ofsted lens</strong>
        <span>Identify evidence, impact, patterns, leadership oversight and actions.</span>
      </button>
    `;

    inner.appendChild(modebar);
    inner.appendChild(quickdock);
    inner.appendChild(hero);

    modebar.querySelectorAll(".ofsted-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode || "guidance"));
    });
    setMode(activeMode);

    inner.querySelectorAll(".ofsted-hero-card, .ofsted-quick-btn").forEach((card) => {
      card.addEventListener("click", () => setInputPrompt(card.dataset.prompt || ""));
    });
  }

  function patchInputExperience() {
    const input = document.getElementById("input");
    if (input) input.placeholder = "Describe a situation, paste a note, or ask about safeguarding…";
    const send = document.getElementById("send");
    if (send && !send.title) send.title = "Send to IndiCare Assistant";
  }

  function init() {
    injectStyles();
    patchRender();
    patchStructuredPrompt();
    patchMetaRendering();
    addBoundaryStrip();
    addTrustStrip();
    addModeBarAndHeroCards();
    patchInputExperience();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
