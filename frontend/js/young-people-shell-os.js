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

  function formatDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return text(value);
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getYoungPersonName() {
    const selector = $("ypSelector");
    return text(selector?.selectedOptions?.[0]?.textContent) || text($("ypPersonName")?.innerText) || "this young person";
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  async function loadOSData(youngPersonId = getYoungPersonId()) {
    try {
      osState.youngPersonId = youngPersonId;
      const res = await fetch(`/assistant/os/context/${encodeURIComponent(youngPersonId)}`);
      const data = await res.json();
      osState.data = data;

      setText("ypSummaryTimeline", (data.timeline || []).length);
      setText("ypSummaryRisk", (data.risk_signals || []).length);
      setText("ypSummaryPatterns", (data.patterns || []).length);
      setText("ypSummarySources", (data.sources || []).length);

      return data;
    } catch (err) {
      console.error("OS load error", err);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          young_person_id: osState.youngPersonId || 1001,
          question
        })
      });

      const data = await res.json();

      addMessage("assistant", data.answer || "No response");

    } catch (err) {
      console.error(err);
      addMessage("assistant", "There was an error getting a response.");
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
  });
})();
