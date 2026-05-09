/* IndiCare Ambient Intelligence
   Standalone assistant awareness panel: "Things IndiCare thinks you should know".
   Uses /assistant/orchestrator/ambient and opens conversational prompts in the assistant.
*/
(function () {
  const ACTIVE_WORKSPACE_KEY = "indicare_assistant_active_workspace";
  const $ = (id) => document.getElementById(id);

  function esc(value) {
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

  function activeProjectId() {
    return $("workspaceSelect")?.value || localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "standalone";
  }

  function openAssistantWithPrompt(prompt) {
    document.querySelector('[data-suite-view="intelligence"]')?.click();
    const input = $("input");
    if (!input) return;
    input.value = prompt;
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function installStyles() {
    if ($("indicareAmbientStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareAmbientStyles";
    style.textContent = `
      .ic-ambient-drawer{position:fixed;right:24px;top:86px;z-index:84;width:min(430px,calc(100vw - 32px));max-height:calc(100vh - 122px);background:rgba(255,255,255,.97);backdrop-filter:blur(18px);border:1px solid var(--shell-line,#e5e7eb);border-radius:24px;box-shadow:0 26px 80px rgba(15,23,42,.2);overflow:hidden;display:flex;flex-direction:column}.ic-ambient-head{display:flex;justify-content:space-between;gap:12px;padding:16px;border-bottom:1px solid var(--shell-line,#e5e7eb)}.ic-ambient-head strong{display:block;font-size:16px;font-weight:950;color:var(--shell-text,#111827)}.ic-ambient-head span{display:block;margin-top:4px;color:var(--shell-muted,#6b7280);font-size:12.5px;line-height:1.4}.ic-ambient-head button{border:0;background:#f3f4f6;border-radius:12px;width:34px;height:34px;font-size:20px;color:#374151}.ic-ambient-summary{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--shell-line,#e5e7eb);background:#fbfbfc}.ic-ambient-pill{border:1px solid var(--shell-line,#e5e7eb);background:#fff;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;color:var(--shell-muted,#6b7280)}.ic-ambient-list{padding:12px;overflow:auto;display:grid;gap:10px}.ic-ambient-card{border:1px solid var(--shell-line,#e5e7eb);border-radius:18px;background:#fff;padding:13px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.ic-ambient-card.critical{border-color:#fecaca;background:#fff7f7}.ic-ambient-card.high{border-color:#fed7aa;background:#fff8f0}.ic-ambient-card.medium{border-color:#fde68a;background:#fffdf2}.ic-ambient-card.low{background:#fff}.ic-ambient-card small{display:inline-flex;border-radius:999px;padding:4px 7px;background:#f3f4f6;color:#4b5563;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.04em}.ic-ambient-card h3{margin:8px 0 5px;font-size:14px;line-height:1.3;color:var(--shell-text,#111827)}.ic-ambient-card p{margin:0 0 7px;color:var(--shell-muted,#6b7280);font-size:12.5px;line-height:1.45}.ic-ambient-card button{border:1px solid var(--shell-line,#e5e7eb);background:#111827;color:#fff;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:900}.ic-ambient-empty{padding:20px;color:var(--shell-muted,#6b7280);font-size:13px;line-height:1.5}.ic-ambient-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:999px;background:#10a37f;color:#fff;font-size:11px;font-weight:950;margin-left:5px}.ic-top-tool.ic-ambient-active{box-shadow:0 0 0 3px rgba(16,163,127,.12)}@media(max-width:820px){.ic-ambient-drawer{right:12px;top:74px;width:calc(100vw - 24px);max-height:calc(100vh - 96px)}}
    `;
    document.head.appendChild(style);
  }

  function installButton() {
    const actions = document.querySelector(".ic-top-actions");
    if (!actions || $("openAmbientIntelligence")) return;
    const button = document.createElement("button");
    button.id = "openAmbientIntelligence";
    button.className = "ic-nav-btn ic-top-tool";
    button.type = "button";
    button.innerHTML = 'Awareness <span id="ambientBadge" class="ic-ambient-badge hidden">0</span>';
    button.title = "Things IndiCare thinks you should know";
    actions.insertBefore(button, actions.children[3] || null);
  }

  function installDrawer() {
    if ($("ambientDrawer")) return;
    const drawer = document.createElement("aside");
    drawer.id = "ambientDrawer";
    drawer.className = "ic-ambient-drawer hidden";
    drawer.innerHTML = `
      <div class="ic-ambient-head">
        <div><strong>Things IndiCare thinks you should know</strong><span>Calm awareness from the standalone assistant brain.</span></div>
        <button type="button" id="closeAmbientDrawer" aria-label="Close awareness">×</button>
      </div>
      <div id="ambientSummary" class="ic-ambient-summary"></div>
      <div id="ambientList" class="ic-ambient-list"><p class="ic-ambient-empty">Loading awareness...</p></div>
    `;
    document.body.appendChild(drawer);
  }

  function renderAmbient(data) {
    const cards = Array.isArray(data.cards) ? data.cards : [];
    const summary = data.summary || {};
    const badge = $("ambientBadge");
    const button = $("openAmbientIntelligence");
    if (badge) {
      badge.textContent = String(cards.length || 0);
      badge.classList.toggle("hidden", !cards.length);
    }
    if (button) button.classList.toggle("ic-ambient-active", cards.some((card) => ["critical", "high"].includes(card.level)));

    const summaryNode = $("ambientSummary");
    if (summaryNode) {
      summaryNode.innerHTML = `
        <span class="ic-ambient-pill">${Number(summary.total || cards.length || 0)} item${Number(summary.total || cards.length || 0) === 1 ? "" : "s"}</span>
        <span class="ic-ambient-pill">${Number(summary.high || 0) + Number(summary.critical || 0)} high priority</span>
        <span class="ic-ambient-pill">Standalone AI</span>
      `;
    }

    const list = $("ambientList");
    if (!list) return;
    if (!cards.length) {
      list.innerHTML = '<p class="ic-ambient-empty">No awareness cards are visible right now. That does not replace professional review; it just means no high-priority signal was surfaced to IndiCare AI.</p>';
      return;
    }
    list.innerHTML = cards.map((card, index) => `
      <article class="ic-ambient-card ${esc(card.level || "low")}">
        <small>${esc(card.level || "low")} · ${esc(card.category || "awareness")}</small>
        <h3>${esc(card.title || "IndiCare awareness")}</h3>
        <p>${esc(card.message || "There is something that may be useful to review.")}</p>
        ${card.why ? `<p><strong>Why:</strong> ${esc(card.why)}</p>` : ""}
        <button type="button" data-ambient-prompt="${esc(card.suggested_prompt || `Help me review: ${card.title || "this awareness item"}`)}">Talk this through</button>
      </article>
    `).join("");
  }

  async function loadAmbient() {
    try {
      const data = await api(`/assistant/orchestrator/ambient?project_id=${encodeURIComponent(activeProjectId())}&days=30&limit=8`);
      renderAmbient(data);
    } catch (error) {
      const list = $("ambientList");
      if (list) list.innerHTML = '<p class="ic-ambient-empty">IndiCare awareness could not be loaded yet.</p>';
    }
  }

  function toggleDrawer() {
    const drawer = $("ambientDrawer");
    if (!drawer) return;
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) loadAmbient();
  }

  function bind() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("#openAmbientIntelligence")) {
        toggleDrawer();
        return;
      }
      if (event.target.closest("#closeAmbientDrawer")) {
        $("ambientDrawer")?.classList.add("hidden");
        return;
      }
      const prompt = event.target.closest("[data-ambient-prompt]");
      if (prompt) {
        $("ambientDrawer")?.classList.add("hidden");
        openAssistantWithPrompt(prompt.getAttribute("data-ambient-prompt"));
      }
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installButton();
    installDrawer();
    bind();
    loadAmbient();
    setInterval(loadAmbient, 120000);
  });
})();
