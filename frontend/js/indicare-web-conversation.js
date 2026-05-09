/* IndiCare Web Conversation
   Detects current/web-style questions, retrieves Tavily context through /assistant/web/search,
   and feeds it into the existing assistant runtime so the conversation stays natural.
*/
(function () {
  const WEB_CONTEXT_PREFIX = "INDICARE LIVE WEB CONTEXT";
  const WEB_DIAGNOSTICS_KEY = "indicare_web_search_available";

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function headers(method) {
    const next = { "Content-Type": "application/json" };
    if (["POST", "PUT", "PATCH", "DELETE"].includes(String(method || "GET").toUpperCase())) {
      const token = csrfToken();
      if (token) next["X-CSRF-Token"] = token;
    }
    return next;
  }

  async function api(url, options) {
    const method = options?.method || "GET";
    const response = await fetch(url, {
      credentials: "include",
      ...(options || {}),
      headers: { ...headers(method), ...(options?.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || payload.message || `Request failed: ${response.status}`);
    return payload;
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

  function looksLikeWebQuestion(text) {
    const q = String(text || "").toLowerCase();
    if (!q || q.includes(WEB_CONTEXT_PREFIX.toLowerCase())) return false;
    const explicit = /(search|look up|google|web|internet|online|latest|current|today|this week|this month|recent|news|update|right now|2026|new guidance|new law|new regulation|what's happening|what is happening)/i;
    const dynamicTopics = /(ofsted|government|legislation|guidance|regulation|inspection|children's social care|children’s social care|case law|funding|prices|weather|event|deadline|publication|report|consultation|research|statistics)/i;
    return explicit.test(q) || (/\b(now|currently|latest|recent)\b/.test(q) && dynamicTopics.test(q));
  }

  function normaliseQuery(text) {
    return String(text || "").replace(/^\s*(can you|could you|please|indicare|hey indicare|look up|search for|find out)\s+/i, "").trim().slice(0, 500);
  }

  function buildWebContext(original, data) {
    const results = data.results || [];
    const answer = data.answer || "";
    const lines = [
      `${WEB_CONTEXT_PREFIX}:`,
      "Use the following live web information as supporting context. Be conversational, cite sources by title/domain in plain language, and be clear where web results are limited.",
      "Do not sound like a search results page. Answer naturally, then continue the conversation with a useful next step or question.",
      "",
      `User question: ${original}`,
    ];
    if (answer) {
      lines.push("", "Tavily summary:", answer);
    }
    if (results.length) {
      lines.push("", "Web results:");
      results.slice(0, 6).forEach((result, index) => {
        lines.push(`${index + 1}. ${result.title || "Web result"}`);
        if (result.url) lines.push(`   URL: ${result.url}`);
        if (result.snippet) lines.push(`   Summary: ${result.snippet}`);
      });
    }
    lines.push(
      "",
      "Now answer the user in the voice of IndiCare AI: calm, British, warm, professional and like an experienced residential children's home manager or supportive colleague.",
      "Keep the conversation open at the end with one natural follow-up question or offer."
    );
    return lines.join("\n");
  }

  async function fetchWebContext(text) {
    const query = normaliseQuery(text);
    if (!query) return null;
    const data = await api("/assistant/web/search", {
      method: "POST",
      body: JSON.stringify({ query, limit: 5, search_depth: "basic" }),
    });
    if (!data.available) return null;
    return buildWebContext(text, data);
  }

  function installStatus() {
    if (document.getElementById("indicareWebStatus")) return;
    const chips = document.getElementById("suggestionChips");
    if (!chips) return;
    const chip = document.createElement("button");
    chip.id = "indicareWebStatus";
    chip.type = "button";
    chip.dataset.webSearchStatus = "true";
    chip.textContent = "Web: checking";
    chips.appendChild(chip);
  }

  async function diagnostics() {
    try {
      const data = await api("/assistant/web/diagnostics");
      localStorage.setItem(WEB_DIAGNOSTICS_KEY, data.web_search_available ? "true" : "false");
      const chip = document.getElementById("indicareWebStatus");
      if (chip) {
        chip.textContent = data.web_search_available ? "Web: Tavily" : "Web: not configured";
        chip.title = data.web_search_available ? "Live web answers are available" : "Set TAVILY_API_KEY to enable live web answers";
      }
    } catch (_) {
      const chip = document.getElementById("indicareWebStatus");
      if (chip) chip.textContent = "Web: unavailable";
    }
  }

  function installSendInterceptor() {
    const send = $("send");
    const input = $("input");
    if (!send || !input || send.dataset.webConversationPatched === "true") return;
    send.dataset.webConversationPatched = "true";

    send.addEventListener("click", async (event) => {
      const text = input.value.trim();
      if (!text || !looksLikeWebQuestion(text) || input.dataset.webContextApplied === "true") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      toast("I’m checking the web for you...");

      try {
        const context = await fetchWebContext(text);
        if (context) {
          input.value = context;
          input.dataset.webContextApplied = "true";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } catch (error) {
        console.warn("IndiCare web context unavailable", error);
        toast("I couldn’t reach web search, so I’ll answer from what I know.");
      } finally {
        setTimeout(() => {
          send.click();
          setTimeout(() => { delete input.dataset.webContextApplied; }, 500);
        }, 60);
      }
    }, true);
  }

  function watchInput() {
    const input = $("input");
    const chip = document.getElementById("indicareWebStatus");
    if (!input || !chip || input.dataset.webHintPatched === "true") return;
    input.dataset.webHintPatched = "true";
    input.addEventListener("input", () => {
      const active = looksLikeWebQuestion(input.value);
      chip.classList.toggle("ic-web-active", active);
      if (active) chip.textContent = "Web: will check";
      else chip.textContent = localStorage.getItem(WEB_DIAGNOSTICS_KEY) === "true" ? "Web: Tavily" : "Web: not configured";
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStatus();
    diagnostics();
    installSendInterceptor();
    watchInput();
    setInterval(() => {
      installSendInterceptor();
      watchInput();
    }, 1500);
  });
})();
