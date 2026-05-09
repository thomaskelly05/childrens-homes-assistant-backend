/* IndiCare Presence Context
   Reuses existing timeline, proactive intelligence, operational memory and Connect routes.
   It adds lightweight context to the existing assistant flow when the user asks about patterns,
   memory, follow-ups, actions, Connect, risk, chronology or ongoing situations.
*/
(function () {
  const PRESENCE_PREFIX = "INDICARE EXISTING PLATFORM CONTEXT";
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
    return /(remember|memory|ongoing|previous|before|earlier|pattern|trend|timeline|chronology|risk|safeguarding|action|follow[- ]?up|unresolved|connect|message|meeting|channel|what have we missed|what's changed|what has changed|same issue|again|recently|over time)/i.test(q);
  }

  async function safeFetch(label, fn) {
    try {
      const data = await fn();
      return { label, ok: true, data };
    } catch (error) {
      return { label, ok: false, error: String(error && error.message ? error.message : error) };
    }
  }

  async function gatherContext(text) {
    const projectId = activeProjectId();
    const results = await Promise.all([
      safeFetch("timeline_summary", () => api(`/standalone-timeline/projects/${encodeURIComponent(projectId)}/summary`)),
      safeFetch("proactive_alerts", () => api("/intelligence/proactive?days=30")),
      safeFetch("connect_channels", () => api("/api/connect/channels?limit=20")),
    ]);

    const lines = [
      `${PRESENCE_PREFIX}:`,
      "Use this existing platform context naturally and carefully. It may be partial. Do not pretend certainty if data is missing.",
      "Respond like a calm British residential children's home colleague: warm, reflective, practical and conversational.",
      "Keep the conversation going with one useful next step or question.",
      "",
      `Active project/workspace: ${projectId}`,
      `User request: ${text}`,
    ];

    results.forEach((result) => {
      lines.push("", `Context source: ${result.label}`);
      if (!result.ok) {
        lines.push("Unavailable or not configured.");
      } else {
        lines.push(JSON.stringify(result.data, null, 2).slice(0, 6000));
      }
    });

    lines.push(
      "",
      "Now answer the user using the context above where relevant. Do not expose raw JSON. Summarise naturally, identify patterns/actions if present, and make it feel like an ongoing conversation."
    );

    return lines.join("\n");
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
      toast("I’m checking the existing IndiCare context...");

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
    chip.textContent = "Context: IndiCare";
    chip.title = "Uses timeline, proactive intelligence and Connect context when relevant";
    chip.addEventListener("click", () => {
      const input = $("input");
      if (!input) return;
      input.value = "What patterns, risks, unresolved actions or follow-ups should I be aware of?";
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
