/* IndiCare Assistant professional rendering enhancements.
   Lightweight add-on: observes rendered assistant messages and upgrades them into
   operational cards without changing the core streaming/runtime flow. */

(function () {
  const SECTION_TYPES = [
    { key: "safeguarding", className: "ic-pro-section--safeguarding", match: /safeguarding|risk|threshold|harm|exploitation|missing from care|missing-from-care/i },
    { key: "missing", className: "ic-pro-section--missing ic-pro-section--warning", match: /missing information|missing evidence|gaps|unknown|not visible|not provided/i },
    { key: "manager", className: "ic-pro-section--manager", match: /manager|leadership|oversight|registered manager|responsible individual|ri review|dsl/i },
    { key: "actions", className: "ic-pro-section--actions", match: /next steps|recommended actions|actions|follow-up|follow up|what should happen next/i },
    { key: "evidence", className: "ic-pro-section--evidence", match: /sources|regulation|guidance|quality standards|sccif|evidence|ofsted/i },
    { key: "record", className: "ic-pro-section--record", match: /record|incident|chronology|handover|daily log|key work|supervision/i },
    { key: "ofsted", className: "ic-pro-section--ofsted", match: /ofsted|inspection|impact|quality of care|leadership and management/i },
    { key: "facts", className: "ic-pro-section--facts", match: /known facts|facts|summary|what happened|timeline/i },
    { key: "reflection", className: "ic-pro-section--reflection", match: /reflection|reflective|trauma-informed|relational|child.?s voice|young person.?s voice/i },
  ];

  const FOLLOW_UP_PROMPTS = {
    regenerate: "Regenerate your previous response with clearer structure, stronger evidence separation and professional children's residential care language.",
    ofsted: "Convert your previous response into an Inspection evidence support evidence summary. Include evidence, impact, gaps, leadership oversight and likely inspector questions.",
    chronology: "Convert your previous response into a factual chronology. Include times/dates where known, events, actions taken, risk points and missing information.",
    handover: "Convert your previous response into a concise shift handover with current risks, support offered, follow-up tasks and management awareness.",
    qa: "Review your previous response for recording quality. Improve factuality, child-centred language, chronology, missing evidence and management oversight.",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function typeForHeading(text) {
    const clean = String(text || "").trim();
    return SECTION_TYPES.find((item) => item.match.test(clean)) || { key: "default", className: "" };
  }

  function hasOperationalContent(text) {
    return /(safeguarding|missing information|manager review|ofsted|quality standards|recommended actions|next steps|chronology|incident|recording quality|leadership oversight|child.?s voice|young person.?s voice)/i.test(text || "");
  }

  function buildTrustStrip(text) {
    const lower = String(text || "").toLowerCase();
    const pills = ["Standalone assistant"];

    if (lower.includes("upload") || lower.includes("attached") || lower.includes("document")) pills.push("Uses provided information");
    if (/missing information|missing evidence|not provided|not visible|gaps/.test(lower)) pills.push("Evidence gaps checked");
    if (/manager|oversight|dsl|registered manager|responsible individual/.test(lower)) pills.push("Review prompts included");
    if (/ofsted|regulation|quality standards|sccif|guidance/.test(lower)) pills.push("Regulation-aware");
    if (/safeguarding|risk|threshold|harm|exploitation/.test(lower)) pills.push("Safeguarding-aware");

    return `<div class="ic-trust-strip">${pills.slice(0, 5).map((pill) => `<span class="ic-trust-pill">${pill}</span>`).join("")}</div>`;
  }

  function sectionise(messageNode) {
    const headings = Array.from(messageNode.querySelectorAll("h3"));
    if (!headings.length) return false;

    headings.forEach((heading) => {
      if (heading.closest(".ic-pro-section")) return;

      const type = typeForHeading(heading.textContent);
      const wrapper = document.createElement("section");
      wrapper.className = `ic-pro-section ${type.className || ""}`.trim();

      heading.parentNode.insertBefore(wrapper, heading);
      wrapper.appendChild(heading);

      let node = wrapper.nextSibling;
      while (node && !(node.nodeType === 1 && node.tagName === "H3")) {
        const next = node.nextSibling;
        wrapper.appendChild(node);
        node = next;
      }
    });

    return true;
  }

  function enhanceAssistantMessage(messageNode) {
    if (!messageNode || messageNode.dataset.professionalEnhanced === "true") return;

    const text = messageNode.textContent || "";
    if (!text.trim() || !hasOperationalContent(text)) return;

    const didSectionise = sectionise(messageNode);
    if (!didSectionise) {
      const wrapper = document.createElement("section");
      wrapper.className = "ic-pro-section ic-pro-section--record";
      wrapper.innerHTML = `<h3>Professional Response</h3>`;
      while (messageNode.firstChild) wrapper.appendChild(messageNode.firstChild);
      messageNode.appendChild(wrapper);
    }

    messageNode.insertAdjacentHTML("afterbegin", buildTrustStrip(text));
    messageNode.classList.add("ic-professional-rendered");
    messageNode.dataset.professionalEnhanced = "true";
  }

  function enhanceMessageActions() {
    document.querySelectorAll(".wrap.assistant .ic-message-actions").forEach((actions) => {
      if (actions.dataset.enhanced === "true") return;
      actions.insertAdjacentHTML("beforeend", `
        <button type="button" data-pro-followup="regenerate">Regenerate</button>
        <button type="button" data-pro-followup="ofsted">Inspection evidence support</button>
        <button type="button" data-pro-followup="chronology">Chronology</button>
        <button type="button" data-pro-followup="handover">Handover</button>
        <button type="button" data-pro-followup="qa">QA review</button>
        <button type="button" data-edit-response>Edit</button>
      `);
      actions.dataset.enhanced = "true";
    });
  }

  function enhanceAllMessages() {
    document.querySelectorAll(".wrap.assistant .msg").forEach(enhanceAssistantMessage);
    enhanceMessageActions();
  }

  function conversationText() {
    return Array.from(document.querySelectorAll("#messages .wrap"))
      .map((wrap) => {
        const role = wrap.classList.contains("user") ? "User" : "IndiCare";
        const msg = wrap.querySelector(".msg");
        return `${role}:\n${(msg?.innerText || "").trim()}`;
      })
      .filter((chunk) => chunk.trim())
      .join("\n\n");
  }

  function exportConversation(format) {
    const text = conversationText();
    if (!text.trim()) {
      showLocalToast("Nothing to export");
      return;
    }

    if (format === "html") {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>IndiCare Assistant Export</title><style>body{font-family:Arial,sans-serif;line-height:1.55;padding:32px;color:#071a3a}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h1>IndiCare Assistant Export</h1><pre>${escapeHtml(text)}</pre></body></html>`;
      downloadBlob(html, "text/html;charset=utf-8", "html");
      showLocalToast("HTML exported");
      return;
    }

    downloadBlob(text, "text/plain;charset=utf-8", "txt");
    showLocalToast("Conversation exported");
  }

  function downloadBlob(content, type, extension) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indicare-assistant-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showLocalToast(text) {
    const existing = document.querySelector(".ic-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "ic-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  function setComposerPrompt(text) {
    const input = $("input");
    if (!input) return;
    input.value = text;
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function wireResponseEnhancements() {
    $("messages")?.addEventListener("click", (event) => {
      const follow = event.target.closest("[data-pro-followup]");
      const edit = event.target.closest("[data-edit-response]");

      if (follow) {
        const key = follow.getAttribute("data-pro-followup");
        setComposerPrompt(FOLLOW_UP_PROMPTS[key] || FOLLOW_UP_PROMPTS.regenerate);
      }

      if (edit) {
        const wrap = edit.closest(".wrap.assistant");
        const msg = wrap?.querySelector(".msg");
        if (!msg) return;
        toggleEditableMessage(msg);
      }
    });
  }

  function toggleEditableMessage(msg) {
    if (msg.getAttribute("contenteditable") === "true") {
      msg.setAttribute("contenteditable", "false");
      msg.classList.remove("ic-editing-response");
      showLocalToast("Edits kept on page");
      return;
    }
    msg.setAttribute("contenteditable", "true");
    msg.classList.add("ic-editing-response");
    msg.focus();
    showLocalToast("Editing response");
  }

  function wireDropUpload() {
    const dock = $("composerDock");
    const input = $("upload");
    const hint = $("dropHint");
    if (!dock || !input) return;

    ["dragenter", "dragover"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        event.preventDefault();
        hint?.classList.remove("hidden");
        dock.classList.add("ic-drop-active");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        event.preventDefault();
        if (eventName === "drop" && event.dataTransfer?.files?.length) {
          input.files = event.dataTransfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        hint?.classList.add("hidden");
        dock.classList.remove("ic-drop-active");
      });
    });
  }

  function wireExports() {
    $("exportConversation")?.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.shiftKey) exportConversation("html");
      else exportConversation("txt");
    });
  }

  function wirePasteText() {
    $("input")?.addEventListener("paste", (event) => {
      const text = event.clipboardData?.getData("text/plain") || "";
      if (text.length > 2500) showLocalToast("Large text pasted");
    });
  }

  function observeMessages() {
    const target = $("messages");
    if (!target) return;
    const observer = new MutationObserver(() => enhanceAllMessages());
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    enhanceAllMessages();
  }

  function init() {
    wireExports();
    wireDropUpload();
    wireResponseEnhancements();
    wirePasteText();
    observeMessages();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
