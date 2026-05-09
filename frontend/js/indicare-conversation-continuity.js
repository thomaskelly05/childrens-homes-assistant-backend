/* IndiCare Conversation Continuity
   Lightweight standalone continuity layer.
   Reuses the existing local assistant conversation store and injects recent themes
   into the next assistant call so IndiCare feels more continuous without becoming OS-bound.
*/
(function () {
  const STORAGE_KEY = "indicare_standalone_assistant_conversations";
  const ACTIVE_KEY = "indicare_standalone_assistant_active";
  const MODE_KEY = "indicare_ai_assistant_mode";
  const CONTINUITY_ENABLED_KEY = "indicare_conversation_continuity_enabled";
  const MAX_MEMORY_CHARS = 4500;

  const state = {
    enabled: localStorage.getItem(CONTINUITY_ENABLED_KEY) !== "false",
  };

  function safeJsonParse(value, fallback) {
    try { return JSON.parse(value || ""); } catch (_) { return fallback; }
  }

  function conversations() {
    const items = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
    return Array.isArray(items) ? items : [];
  }

  function activeConversationId() {
    return localStorage.getItem(ACTIVE_KEY) || "";
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function messageThemes(text) {
    const lower = cleanText(text).toLowerCase();
    const themes = [];
    const checks = [
      ["safeguarding", /safeguarding|disclosure|allegation|threshold|social worker|mash|lado/],
      ["incident", /incident|restraint|physical intervention|de[- ]?escalat|behaviour|missing|police/],
      ["handover", /handover|shift|night staff|morning|evening|today|tonight/],
      ["chronology", /chronology|timeline|pattern|trend|again|repeated|previous|history/],
      ["recording quality", /record|recording|language|wording|professional|child[- ]?centred|judgemental/],
      ["Ofsted evidence", /ofsted|sccif|quality standards|inspection|evidence|impact|leadership/],
      ["documents", /document|docs|policy|procedure|template|regulation 45|reg 45/],
      ["communication", /email|mail|message|reply|connect|communication|phone call/],
      ["staff wellbeing", /stress|overwhelmed|burnt out|burnout|staffing|pressure|tired|difficult shift/],
    ];
    checks.forEach(([label, regex]) => { if (regex.test(lower)) themes.push(label); });
    return themes;
  }

  function buildContinuityContext() {
    if (!state.enabled) return "";
    const all = conversations();
    if (!all.length) return "";

    const activeId = activeConversationId();
    const active = all.find((item) => item.id === activeId);
    const recentConversations = [active, ...all.filter((item) => item && item.id !== activeId)].filter(Boolean).slice(0, 5);
    const snippets = [];
    const themeCounts = new Map();

    recentConversations.forEach((conversation) => {
      const messages = Array.isArray(conversation.messages) ? conversation.messages.filter((msg) => !msg.pending) : [];
      const recent = messages.slice(-6);
      const joined = recent.map((msg) => `${msg.role === "user" ? "User" : "IndiCare"}: ${cleanText(msg.content).slice(0, 550)}`).join("\n");
      if (joined) {
        snippets.push(`Conversation: ${conversation.title || "Untitled"}\n${joined}`);
        messageThemes(joined).forEach((theme) => themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1));
      }
    });

    if (!snippets.length) return "";

    const themes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([theme, count]) => `${theme} (${count})`)
      .join(", ");

    const mode = localStorage.getItem(MODE_KEY) || "children_home_specialist";
    return [
      "INDICARE CONVERSATION CONTINUITY CONTEXT:",
      "This is local standalone assistant continuity from recent conversations. It may be incomplete. Use it gently, only when relevant, and do not overclaim memory.",
      "Do not expose this context verbatim. Use it to keep the conversation flowing naturally and avoid making the user repeat themselves.",
      `Current mode: ${mode}`,
      themes ? `Recurring recent themes: ${themes}` : "Recurring recent themes: not enough signal yet.",
      "Recent conversation excerpts:",
      snippets.join("\n\n---\n\n").slice(0, MAX_MEMORY_CHARS),
      "END CONTINUITY CONTEXT.",
    ].join("\n");
  }

  function patchFetch() {
    if (window.__indicareContinuityFetchPatched) return;
    window.__indicareContinuityFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedContinuityFetch(input, init) {
      try {
        const url = typeof input === "string" ? input : input && input.url;
        if (url && String(url).includes("/assistant/general/stream") && init && init.body) {
          const payload = JSON.parse(init.body);
          const memory = buildContinuityContext();
          if (memory && !String(payload.message || "").includes("INDICARE CONVERSATION CONTINUITY CONTEXT")) {
            payload.message = `${memory}\n\n${payload.message || ""}`;
            payload.continuity_enabled = true;
          }
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch (error) {
        console.warn("IndiCare continuity patch skipped", error);
      }
      return originalFetch(input, init);
    };
  }

  function installButton() {
    if (document.getElementById("continuityToggle")) return;
    const actions = document.querySelector(".ic-top-actions");
    if (!actions) return;
    const button = document.createElement("button");
    button.id = "continuityToggle";
    button.className = "ic-nav-btn ic-top-tool";
    button.type = "button";
    button.title = "Recent conversation continuity";
    button.addEventListener("click", () => {
      state.enabled = !state.enabled;
      localStorage.setItem(CONTINUITY_ENABLED_KEY, state.enabled ? "true" : "false");
      renderButton();
      toast(state.enabled ? "Continuity on" : "Continuity off");
    });
    actions.insertBefore(button, actions.children[4] || null);
    renderButton();
  }

  function renderButton() {
    const button = document.getElementById("continuityToggle");
    if (!button) return;
    button.textContent = state.enabled ? "Continuity" : "Continuity off";
    button.classList.toggle("active", state.enabled);
  }

  function installStyles() {
    if (document.getElementById("indicareContinuityStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareContinuityStyles";
    style.textContent = `#continuityToggle.active{background:#ecfdf5;border-color:#a7f3d0;color:#047857}`;
    document.head.appendChild(style);
  }

  function toast(text) {
    const existing = document.querySelector(".ic-bridge-toast, .ic-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "ic-bridge-toast";
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1800);
  }

  window.IndiCareConversationContinuity = {
    build: buildContinuityContext,
    enabled: () => state.enabled,
    setEnabled: (value) => {
      state.enabled = !!value;
      localStorage.setItem(CONTINUITY_ENABLED_KEY, state.enabled ? "true" : "false");
      renderButton();
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installButton();
    patchFetch();
  });
})();
