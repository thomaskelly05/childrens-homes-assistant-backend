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

  function enhanceAllMessages() {
    document.querySelectorAll(".wrap.assistant .msg").forEach(enhanceAssistantMessage);
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

  function exportConversation() {
    const text = conversationText();
    if (!text.trim()) {
      showLocalToast("Nothing to export");
      return;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indicare-assistant-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showLocalToast("Conversation exported");
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
    $("exportConversation")?.addEventListener("click", exportConversation);
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
    observeMessages();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
