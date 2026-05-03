(() => {
  "use strict";

  const osState = {
    youngPersonId: null,
    data: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  }

  function getYoungPersonId() {
    const selector = $("ypSelector");
    const value =
      selector?.value ||
      document.body.dataset.youngPersonId ||
      $("ypShell")?.dataset.youngPersonId ||
      "1001";
    return text(value) || "1001";
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.innerText = value ?? "";
  }

  async function safeJson(res) {
    const raw = await res.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn("Invalid JSON response", { status: res.status, body: raw.slice(0, 300) });
      return {};
    }
  }

  async function loadOSData(youngPersonId = getYoungPersonId()) {
    try {
      osState.youngPersonId = youngPersonId;
      const res = await fetch(`/assistant/os/context/${encodeURIComponent(youngPersonId)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await safeJson(res);
      osState.data = data;

      setText("ypSummaryTimeline", Array.isArray(data.timeline) ? data.timeline.length : 0);
      setText("ypSummaryRisk", Array.isArray(data.risk_signals) ? data.risk_signals.length : 0);
      setText("ypSummaryPatterns", Array.isArray(data.patterns) ? data.patterns.length : 0);
      setText("ypSummarySources", Array.isArray(data.sources) ? data.sources.length : 0);

      return data;
    } catch (err) {
      console.error("OS load error", err);
      osState.data = {};
      return null;
    }
  }

  function addMessage(role, content) {
    const box = $("ypAssistantMessages");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `yp-message yp-message-${role}`;
    el.innerHTML = `<strong>${role === "user" ? "You" : "IndiCare"}</strong><span>${content}</span>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  async function answerAssistantQuestion() {
    const input = $("ypAssistantInput");
    const question = text(input?.value);
    if (!question) return;

    addMessage("user", escapeHtml(question));
    if (input) input.value = "";

    try {
      const res = await fetch("/assistant/os/reason", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          young_person_id: osState.youngPersonId || getYoungPersonId() || 1001,
          question,
        }),
      });

      const data = await safeJson(res);
      addMessage("assistant", escapeHtml(data.answer || "I could not load a response, but the OS is still running safely."));
    } catch (err) {
      console.error(err);
      addMessage("assistant", "There was an error getting a response, but the OS is still running safely.");
    }
  }

  function bindAssistant() {
    const send = $("ypAssistantSend");
    const input = $("ypAssistantInput");

    if (send) send.addEventListener("click", answerAssistantQuestion);

    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          answerAssistantQuestion();
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindAssistant();
    loadOSData();
    $("ypSelector")?.addEventListener("change", () => loadOSData());
  });
})();
