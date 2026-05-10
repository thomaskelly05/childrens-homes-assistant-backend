/* IndiCare Presence Context
   Calls the backend IndiCare AI orchestrator so the standalone AI tools platform
   uses one server-side brain instead of stitching knowledge together in the browser.
*/
(function () {
  const PRESENCE_PREFIX = "INDICARE AI ORCHESTRATED BRAIN CONTEXT";
  const ACTIVE_WORKSPACE_KEY = "indicare_assistant_active_workspace";

  const $ = (id) => document.getElementById(id);

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
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json().catch(() => ({}));
  }

  function activeProjectId() {
    return $("workspaceSelect")?.value || localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "standalone";
  }

  function looksLikeContextQuestion(text) {
    const q = String(text || "").toLowerCase();
    if (!q || q.includes(PRESENCE_PREFIX.toLowerCase())) return false;
    return /(remember|memory|ongoing|previous|before|earlier|pattern|trend|timeline|chronology|risk|safeguarding|action|follow[- ]?up|unresolved|connect|message|meeting|channel|what have we missed|what's changed|what has changed|same issue|again|recently|over time|knowledge|policy|policies|procedure|folder|library|template|document|guidance|brain|what do we know|what does indicare know|context|orchestrator)/i.test(q);
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

  async function gatherContext(text) {
    const data = await api("/assistant/orchestrator/context", {
      method: "POST",
      body: JSON.stringify({
        question: String(text || "").slice(0, 12000),
        project_id: activeProjectId(),
        limit: 8,
      }),
    });
    if (data && data.prompt_context) return data.prompt_context;
    return [
      `${PRESENCE_PREFIX}:`,
      "The backend orchestrator returned limited context. Answer conversationally and be clear that context may be incomplete.",
      "",
      `User request: ${text}`,
    ].join("\n");
  }

  function installSendInterceptor() {
    const send = $("send");
    const input = $("input");
    if (!send || !input || send.dataset.presenceContextPatched === "true") return;
    send.dataset.presenceContextPatched = "true";

    send.addEventListener("click", async (event) => {
      const text = input.value.trim();
      if (!text || input.dataset.presenceContextApplied === "true") return;
      if (!looksLikeContextQuestion(text)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      toast("I’m checking IndiCare’s orchestrated brain...");

      try {
        input.value = await gatherContext(text);
        input.dataset.presenceContextApplied = "true";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (error) {
        console.warn("Presence context unavailable", error);
      } finally {
        setTimeout(() => {
          send.click();
          setTimeout(() => { delete input.dataset.presenceContextApplied; }, 500);
        }, 50);
      }
    }, true);
  }

  function installCommandChip() {
    if ($("indicarePresenceStatus")) return;
    const chips = $("suggestionChips");
    if (!chips) return;
    const chip = document.createElement("button");
    chip.id = "indicarePresenceStatus";
    chip.type = "button";
    chip.textContent = "Brain: IndiCare";
    chip.title = "Uses the backend orchestrator: knowledge folders, documents, timeline, proactive intelligence and Connect context";
    chip.addEventListener("click", () => {
      const input = $("input");
      if (!input) return;
      input.value = "Using IndiCare knowledge, documents, timeline and context, what patterns, risks, unresolved actions or follow-ups should I be aware of?";
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    chips.appendChild(chip);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installCommandChip();
    installSendInterceptor();
    setInterval(installSendInterceptor, 1500);
  });
})();
