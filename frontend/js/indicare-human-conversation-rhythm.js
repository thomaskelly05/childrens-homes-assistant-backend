/* IndiCare Human Conversation Rhythm
   Makes the standalone assistant feel more naturally conversational by adding:
   - adaptive acknowledgement timing
   - contextual pauses
   - interruption recovery prompts
   - softer transition language
   - realtime-feeling partial speech from visible streamed text
*/
(function () {
  const ENABLED_KEY = "indicare_human_rhythm_enabled";
  const SILENCE_KEY = "indicare_human_rhythm_silence_ms";

  const state = {
    enabled: localStorage.getItem(ENABLED_KEY) !== "false",
    silenceMs: Number(localStorage.getItem(SILENCE_KEY) || 420),
    lastAssistantText: "",
    spokenFragments: new Set(),
    fragmentTimer: null,
    lastUserInput: "",
    pendingKind: "general",
  };

  const $ = (id) => document.getElementById(id);

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function conversationKind(text) {
    const q = lower(text);
    if (/safeguarding|disclosure|allegation|lado|mash|social worker|police|missing|risk|restraint|physical intervention/.test(q)) return "safeguarding";
    if (/handover|shift|tonight|today|morning|evening|before i go|what do i need/.test(q)) return "handover";
    if (/upset|worried|stressed|overwhelmed|hard shift|difficult shift|burnt out|burnout|can't cope|cannot cope/.test(q)) return "support";
    if (/chronology|pattern|again|repeated|trend|previous|last week|this week|month/.test(q)) return "pattern";
    if (/ofsted|inspection|sccif|quality standard|evidence|impact|leadership/.test(q)) return "inspection";
    return "general";
  }

  function acknowledgement(kind) {
    const lines = {
      safeguarding: [
        "Okay. Let’s slow this down and work through it carefully.",
        "Right. I’m going to treat this carefully and separate what we know from what still needs checking.",
      ],
      handover: [
        "Right. Let’s make this useful for handover.",
        "Okay, let’s focus on what matters most for the next shift.",
      ],
      support: [
        "Okay. Let’s take a moment and make this feel manageable.",
        "Right, I’m with you. Let’s organise this calmly.",
      ],
      pattern: [
        "I think it’s worth looking at the wider pattern here.",
        "Right. I won’t treat this as isolated until we’ve checked the context.",
      ],
      inspection: [
        "Okay. I’ll look at this through evidence, impact and oversight.",
        "Right. Let’s think about what the evidence would actually show.",
      ],
      general: [
        "Okay. Let me think that through with you.",
        "Right, let’s work through that together.",
      ],
    };
    const options = lines[kind] || lines.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  function transitionFor(kind) {
    const lines = {
      safeguarding: "What I’d want to do next is keep the facts, concerns and immediate actions separate.",
      handover: "The most useful next step is probably to turn this into clear handover priorities.",
      support: "Let’s keep this practical and not try to solve everything at once.",
      pattern: "The next thing I’d want to understand is whether this has happened in the same way before.",
      inspection: "The key question is whether the records show impact, oversight and follow-through.",
      general: "I think the useful next step is to narrow this down a little.",
    };
    return lines[kind] || lines.general;
  }

  function speak(text, opts) {
    if (!state.enabled) return;
    if (window.IndiCareAliveVoice?.speak) {
      window.IndiCareAliveVoice.speak(text);
      return;
    }
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = opts?.rate || 0.9;
    utterance.pitch = 1.01;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const voice = voices.find((v) => /en[-_]gb/i.test(v.lang)) || voices[0];
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }

  function plainTextFromHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return clean(div.textContent || div.innerText || "");
  }

  function latestAssistantText() {
    const messages = [...document.querySelectorAll("#messages .wrap.assistant .msg")];
    const latest = messages[messages.length - 1];
    return latest ? plainTextFromHtml(latest.innerHTML) : "";
  }

  function firstSpeakableFragment(text) {
    const cleanText = clean(text).replace(/[#*_>`]/g, "");
    if (cleanText.length < 80) return "";
    const match = cleanText.match(/^(.{80,240}?[.!?])\s/);
    return match ? match[1].trim() : "";
  }

  function observeStreamingText() {
    const messages = $("messages");
    if (!messages || window.__indicareHumanRhythmObserver) return;
    window.__indicareHumanRhythmObserver = new MutationObserver(() => {
      if (!state.enabled) return;
      window.clearTimeout(state.fragmentTimer);
      state.fragmentTimer = window.setTimeout(() => {
        const latest = latestAssistantText();
        if (!latest || latest === state.lastAssistantText) return;
        const fragment = firstSpeakableFragment(latest);
        if (!fragment || state.spokenFragments.has(fragment)) return;
        state.spokenFragments.add(fragment);
        // Speak early only while the assistant is still visibly building an answer.
        const pending = document.querySelector("#messages .wrap.assistant:last-child .meta");
        if (pending) speak(fragment, { rate: 0.9 });
        state.lastAssistantText = latest;
      }, Math.max(180, state.silenceMs));
    });
    window.__indicareHumanRhythmObserver.observe(messages, { childList: true, subtree: true, characterData: true });
  }

  function patchSend() {
    const send = $("send");
    const input = $("input");
    if (!send || !input || send.dataset.humanRhythmPatched === "true") return;
    send.dataset.humanRhythmPatched = "true";
    send.addEventListener("click", () => {
      if (!state.enabled) return;
      state.lastUserInput = input.value || "";
      state.pendingKind = conversationKind(state.lastUserInput);
      state.spokenFragments.clear();
      const ack = acknowledgement(state.pendingKind);
      window.setTimeout(() => speak(ack, { rate: state.pendingKind === "safeguarding" ? 0.84 : 0.9 }), 80);
    }, true);
  }

  function patchFetchForStyle() {
    if (window.__indicareHumanRhythmFetchPatched) return;
    window.__indicareHumanRhythmFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedHumanRhythmFetch(input, init) {
      try {
        const url = typeof input === "string" ? input : input && input.url;
        if (url && String(url).includes("/assistant/general/stream") && init && init.body) {
          const payload = JSON.parse(init.body);
          const kind = conversationKind(payload.message || state.lastUserInput || "");
          const instruction = [
            "INDICARE HUMAN CONVERSATION RHYTHM:",
            "Respond like a live reflective conversation, not a completed report.",
            "Use natural transitions, short spoken paragraphs, and calm pacing.",
            "Avoid abrupt endings. Keep the conversation open with one natural next thought.",
            "Do not fake feelings or claim consciousness. Be present, grounded and professionally reflective.",
            `Conversation kind: ${kind}.`,
            `Natural continuation to consider: ${transitionFor(kind)}`,
          ].join("\n");
          if (!String(payload.message || "").includes("INDICARE HUMAN CONVERSATION RHYTHM")) {
            payload.message = `${instruction}\n\n${payload.message || ""}`;
          }
          init = { ...init, body: JSON.stringify(payload) };
        }
      } catch (error) {
        console.warn("IndiCare human rhythm patch skipped", error);
      }
      return originalFetch(input, init);
    };
  }

  function installControls() {
    const actions = document.querySelector(".ic-top-actions");
    if (!actions || $("humanRhythmToggle")) return;
    const button = document.createElement("button");
    button.id = "humanRhythmToggle";
    button.className = "ic-nav-btn ic-top-tool";
    button.type = "button";
    button.title = "Human conversation rhythm";
    button.addEventListener("click", () => {
      state.enabled = !state.enabled;
      localStorage.setItem(ENABLED_KEY, state.enabled ? "true" : "false");
      renderControls();
    });
    actions.insertBefore(button, actions.children[6] || null);
    renderControls();
  }

  function renderControls() {
    const button = $("humanRhythmToggle");
    if (!button) return;
    button.textContent = state.enabled ? "Human rhythm" : "Rhythm off";
    button.classList.toggle("active", state.enabled);
  }

  function installStyles() {
    if ($("indicareHumanRhythmStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareHumanRhythmStyles";
    style.textContent = `#humanRhythmToggle.active{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}`;
    document.head.appendChild(style);
  }

  window.IndiCareHumanRhythm = { enabled: () => state.enabled, kind: conversationKind, acknowledge: (kind) => speak(acknowledgement(kind || "general")) };

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installControls();
    patchFetchForStyle();
    const timer = setInterval(() => {
      patchSend();
      observeStreamingText();
      if ($("send") && $("messages")) clearInterval(timer);
    }, 500);
  });
})();
