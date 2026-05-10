/* IndiCare AI Assistant Mode Switch
   Adds a clear user-facing switch between:
   - General use: broad everyday assistant, no specialist orchestrator by default
   - Children's Home Specialist: Ofsted-grade advanced practitioner with IndiCare brain/orchestrator
*/
(function () {
  const MODE_KEY = "indicare_ai_assistant_mode";
  const GENERAL = "general";
  const SPECIALIST = "children_home_specialist";

  function currentMode() {
    return localStorage.getItem(MODE_KEY) || SPECIALIST;
  }

  function setMode(mode) {
    const next = mode === GENERAL ? GENERAL : SPECIALIST;
    localStorage.setItem(MODE_KEY, next);
    document.body.dataset.indicareAssistantMode = next;
    renderState();
    toast(next === GENERAL ? "General assistant mode" : "Children’s Home Specialist mode");
  }

  function toast(text) {
    const existing = document.querySelector(".ic-bridge-toast, .ic-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "ic-bridge-toast";
    node.textContent = text;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  function installStyles() {
    if (document.getElementById("indicareAssistantModeStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareAssistantModeStyles";
    style.textContent = `
      .ic-mode-switch{display:flex;align-items:center;gap:4px;border:1px solid var(--shell-line,#e5e7eb);background:#fff;border-radius:999px;padding:3px;box-shadow:0 8px 22px rgba(15,23,42,.06)}
      .ic-mode-switch button{border:0;background:transparent;color:var(--shell-muted,#6b7280);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:900;white-space:nowrap}
      .ic-mode-switch button.active{background:#111827;color:#fff}
      .ic-mode-helper{font-size:11px;color:var(--shell-muted,#6b7280);padding:0 3px;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:900px){.ic-mode-helper{display:none}.ic-mode-switch button{padding:7px 8px}}
    `;
    document.head.appendChild(style);
  }

  function installSwitch() {
    if (document.getElementById("indicareAssistantModeSwitch")) return;
    const actions = document.querySelector(".ic-top-actions");
    if (!actions) return;
    const wrap = document.createElement("div");
    wrap.id = "indicareAssistantModeSwitch";
    wrap.className = "ic-mode-switch";
    wrap.innerHTML = `
      <button type="button" data-indicare-mode="general">General</button>
      <button type="button" data-indicare-mode="children_home_specialist">Children’s Home</button>
    `;
    actions.insertBefore(wrap, actions.firstChild);

    const helper = document.createElement("span");
    helper.id = "indicareAssistantModeHelper";
    helper.className = "ic-mode-helper";
    actions.insertBefore(helper, wrap.nextSibling);
  }

  function renderState() {
    const mode = currentMode();
    document.body.dataset.indicareAssistantMode = mode;
    document.querySelectorAll("[data-indicare-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.indicareMode === mode);
    });
    const helper = document.getElementById("indicareAssistantModeHelper");
    if (helper) {
      helper.textContent = mode === GENERAL
        ? "General use: everyday questions, writing, ideas and web answers."
        : "Specialist: Ofsted-grade residential childcare practice intelligence.";
    }
  }

  function specialistInstruction() {
    return [
      "INDICARE MODE: CHILDREN'S HOME SPECIALIST ASSISTANT.",
      "Act as an advanced Ofsted inspector-level residential childcare practitioner: highly knowledgeable, analytical, evidence-led, child-centred and professionally rigorous.",
      "Use SCCIF judgement thinking, Children’s Homes Quality Standards, safeguarding expectations, leadership oversight, impact, evidence quality, professional curiosity and improvement planning where relevant.",
      "Sound conversational, warm and calm, but bring the depth of the most advanced residential childcare practitioner in the room.",
      "Do not claim to be an actual Ofsted inspector. Do not make final safeguarding/legal/regulatory decisions. Support professional judgement, manager/DSL review and evidence-led action.",
    ].join("\n");
  }

  function generalInstruction() {
    return [
      "INDICARE MODE: GENERAL ASSISTANT.",
      "This is general-use IndiCare AI, not the specialist children’s home assistant mode.",
      "Answer as a warm, conversational, useful general assistant. Help with everyday questions, drafting, planning, learning, web-aware questions and general reasoning.",
      "Do not force Ofsted, safeguarding, children’s home operations or specialist practice framing unless the user asks for it.",
      "Keep the conversation natural and open."
    ].join("\n");
  }

  function patchFetch() {
    if (window.__indicareAssistantModeFetchPatched) return;
    window.__indicareAssistantModeFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedFetch(input, init) {
      try {
        const url = typeof input === "string" ? input : input && input.url;
        if (url && String(url).includes("/assistant/general/stream") && init && init.body) {
          const payload = JSON.parse(init.body);
          const mode = currentMode();
          const instruction = mode === GENERAL ? generalInstruction() : specialistInstruction();
          payload.message = `${instruction}\n\n${payload.message || ""}`;
          payload.assistant_mode = mode;
          payload.use_orchestrator = mode !== GENERAL;
          payload.project_id = payload.project_id || localStorage.getItem("indicare_assistant_active_workspace") || payload.conversation_id || "standalone";
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch (error) {
        console.warn("IndiCare assistant mode patch skipped", error);
      }
      return originalFetch(input, init);
    };
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-indicare-mode]");
      if (!button) return;
      setMode(button.dataset.indicareMode);
    });
  }

  window.IndiCareAssistantMode = {
    current: currentMode,
    set: setMode,
  };

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installSwitch();
    bind();
    patchFetch();
    renderState();
  });
})();
