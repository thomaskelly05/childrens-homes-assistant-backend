/* IndiCare Mail shell integration
   Adds a fifth product inside the IndiCare AI workspace without changing assistant wiring.
   Supports internal mail, external SMTP-backed sending, AI flags, threads and compose.
*/
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  let currentFolder = "inbox";
  let currentThreadId = null;

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
    setTimeout(() => node.remove(), 2600);
  }

  function recipientList(value) {
    return String(value || "")
      .split(/[;,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      const date = new Date(value);
      return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return String(value);
    }
  }

  function flagBadges(flags) {
    if (!flags || typeof flags !== "object") return "";
    const badges = [];
    if (flags.safeguarding_review) badges.push(["safeguarding", "Safeguarding"]);
    if (flags.tone_review) badges.push(["tone", "Tone"]);
    if (flags.actions_likely) badges.push(["actions", "Actions"]);
    if (flags.chronology_relevant) badges.push(["chronology", "Chronology"]);
    return badges.map(([key, label]) => `<span class="ic-mail-flag ${key}">${label}</span>`).join("");
  }

  function installNav() {
    const switcher = document.querySelector(".ic-suite-switcher");
    if (!switcher || document.querySelector('[data-suite-view="mail"]')) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.suiteView = "mail";
    button.setAttribute("aria-label", "IndiCare Mail");
    button.title = "IndiCare Mail";
    button.innerHTML = '<span class="ic-nav-dot mail"></span><span>IndiCare Mail</span>';
    switcher.appendChild(button);
  }

  function installPanel() {
    const content = $("assistantPanel");
    if (!content || document.querySelector('[data-suite-panel="mail"]')) return;
    const panel = document.createElement("section");
    panel.className = "ic-suite-page ic-mail-page hidden";
    panel.dataset.suitePanel = "mail";
    panel.setAttribute("aria-label", "IndiCare Mail");
    panel.innerHTML = `
      <div class="ic-suite-header ic-mail-header">
        <div>
          <h1>IndiCare Mail</h1>
          <p>Internal and external email with safeguarding, chronology and professional tone intelligence.</p>
        </div>
        <div class="ic-mail-header-actions">
          <button id="mailRefresh" type="button">Refresh</button>
          <button id="mailCompose" type="button" class="primary">Compose</button>
        </div>
      </div>
      <div class="ic-mail-layout">
        <aside class="ic-card ic-mail-folders">
          <button class="active" type="button" data-mail-folder="inbox">Inbox</button>
          <button type="button" data-mail-folder="sent">Sent</button>
          <button type="button" data-mail-folder="starred">Starred</button>
          <button type="button" data-mail-folder="archive">Archive</button>
          <button type="button" data-mail-folder="all">All mail</button>
          <hr />
          <div class="ic-mail-search">
            <input id="mailSearch" type="search" placeholder="Search mail..." />
          </div>
          <div id="mailDiagnostics" class="ic-muted-mini"></div>
        </aside>
        <section class="ic-card ic-mail-list-card">
          <div id="mailList" class="ic-mail-list"><p class="ic-muted-mini">Loading mail...</p></div>
        </section>
        <section class="ic-card ic-mail-thread-card">
          <div id="mailThread" class="ic-mail-thread-empty">
            <h2>Select an email</h2>
            <p>Open a thread to review messages, reply, add to chronology or ask IndiCare AI to improve the response.</p>
          </div>
        </section>
      </div>
      <div id="mailComposer" class="ic-mail-compose hidden" role="dialog" aria-label="Compose email">
        <div class="ic-mail-compose-card">
          <div class="ic-mail-compose-head"><strong>New email</strong><button type="button" id="mailComposeClose">×</button></div>
          <input id="mailTo" type="text" placeholder="To: internal user email or external address" />
          <input id="mailCc" type="text" placeholder="Cc" />
          <input id="mailSubject" type="text" placeholder="Subject" />
          <textarea id="mailBody" placeholder="Write your message..."></textarea>
          <div id="mailAiReview" class="ic-mail-ai-review"></div>
          <div class="ic-mail-compose-actions">
            <label><input id="mailSendExternal" type="checkbox" checked /> Send externally if needed</label>
            <button type="button" id="mailReviewWithAi">AI review</button>
            <button type="button" id="mailSend" class="primary">Send</button>
          </div>
        </div>
      </div>
    `;
    content.appendChild(panel);
  }

  async function loadDiagnostics() {
    try {
      const data = await api("/indicare-mail/diagnostics");
      const node = $("mailDiagnostics");
      if (node) node.textContent = data.external_smtp_configured ? "External mail configured." : "Internal mail active. External SMTP not configured yet.";
    } catch (error) {
      const node = $("mailDiagnostics");
      if (node) node.textContent = "Mail diagnostics unavailable.";
    }
  }

  async function loadMessages() {
    const list = $("mailList");
    if (list) list.innerHTML = '<p class="ic-muted-mini">Loading mail...</p>';
    try {
      const q = $("mailSearch")?.value || "";
      const url = `/indicare-mail/messages?folder=${encodeURIComponent(currentFolder)}&limit=50${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const data = await api(url);
      renderList(data.messages || []);
    } catch (error) {
      if (list) list.innerHTML = `<p class="ic-muted-mini">${esc(error.message || "Mail could not be loaded.")}</p>`;
    }
  }

  function renderList(messages) {
    const list = $("mailList");
    if (!list) return;
    if (!messages.length) {
      list.innerHTML = '<p class="ic-muted-mini">No mail in this folder.</p>';
      return;
    }
    list.innerHTML = messages.map((message) => `
      <button type="button" class="ic-mail-row ${message.is_read === false ? "unread" : ""}" data-mail-thread="${esc(message.thread_id)}" data-mail-id="${message.id}">
        <span class="ic-mail-row-top"><strong>${esc(message.sender_email || "IndiCare Mail")}</strong><time>${esc(formatDate(message.created_at))}</time></span>
        <span class="ic-mail-subject">${esc(message.subject || "No subject")}</span>
        <span class="ic-mail-preview">${esc(message.body || "").slice(0, 160)}</span>
        <span class="ic-mail-flags">${flagBadges(message.ai_flags)}</span>
      </button>
    `).join("");
  }

  async function loadThread(threadId) {
    currentThreadId = threadId;
    const node = $("mailThread");
    if (node) node.innerHTML = '<p class="ic-muted-mini">Loading thread...</p>';
    try {
      const data = await api(`/indicare-mail/threads/${encodeURIComponent(threadId)}`);
      renderThread(data.messages || []);
      const firstUnread = (data.messages || []).find((item) => item.is_read === false);
      if (firstUnread) {
        await api(`/indicare-mail/messages/${firstUnread.id}/state`, { method: "PATCH", body: JSON.stringify({ is_read: true }) }).catch(() => null);
      }
    } catch (error) {
      if (node) node.innerHTML = `<p class="ic-muted-mini">${esc(error.message || "Thread could not be loaded.")}</p>`;
    }
  }

  function renderThread(messages) {
    const node = $("mailThread");
    if (!node) return;
    if (!messages.length) {
      node.innerHTML = '<p class="ic-muted-mini">Thread not found.</p>';
      return;
    }
    const latest = messages[messages.length - 1];
    node.innerHTML = `
      <div class="ic-mail-thread-head">
        <div><h2>${esc(latest.subject || "No subject")}</h2><p>${messages.length} message${messages.length === 1 ? "" : "s"}</p></div>
        <div class="ic-mail-thread-actions">
          <button type="button" data-mail-reply="${esc(latest.thread_id)}" data-mail-parent="${latest.id}">Reply</button>
          <button type="button" data-mail-ai="tone">Improve reply</button>
          <button type="button" data-mail-ai="chronology">Chronology</button>
          <button type="button" data-mail-ai="safeguarding">Safeguarding</button>
        </div>
      </div>
      <div class="ic-mail-thread-messages">
        ${messages.map((message) => `
          <article class="ic-mail-message">
            <header><strong>${esc(message.sender_email || "IndiCare Mail")}</strong><time>${esc(formatDate(message.created_at))}</time></header>
            <div class="ic-mail-to">To: ${esc((message.to || []).join(", "))}</div>
            <div class="ic-mail-flags">${flagBadges(message.ai_flags)}</div>
            <p>${esc(message.body || "").replace(/\n/g, "<br>")}</p>
            ${message.external_delivery_status ? `<small class="ic-mail-delivery ${esc(message.external_delivery_status)}">External: ${esc(message.external_delivery_status)}${message.external_error ? ` — ${esc(message.external_error)}` : ""}</small>` : ""}
          </article>`).join("")}
      </div>
    `;
  }

  function openCompose(prefill) {
    const composer = $("mailComposer");
    if (!composer) return;
    composer.classList.remove("hidden");
    if (prefill) {
      if ($("mailTo")) $("mailTo").value = prefill.to || "";
      if ($("mailSubject")) $("mailSubject").value = prefill.subject || "";
      if ($("mailBody")) $("mailBody").value = prefill.body || "";
    }
    $("mailTo")?.focus();
  }

  function closeCompose() {
    $("mailComposer")?.classList.add("hidden");
  }

  async function sendMail() {
    const payload = {
      to: recipientList($("mailTo")?.value),
      cc: recipientList($("mailCc")?.value),
      bcc: [],
      subject: $("mailSubject")?.value || "",
      body: $("mailBody")?.value || "",
      send_external: $("mailSendExternal")?.checked !== false,
      parent_message_id: Number($("mailComposer")?.dataset.parentMessageId || 0) || null,
    };
    try {
      const data = await api("/indicare-mail/messages", { method: "POST", body: JSON.stringify(payload) });
      closeCompose();
      toast(data.external_delivery_status === "failed" ? "Saved internally, but external delivery failed." : "Email sent");
      await loadMessages();
      if (data.message?.thread_id) await loadThread(data.message.thread_id);
    } catch (error) {
      toast(error.message || "Email could not be sent");
    }
  }

  function reviewCompose() {
    const subject = $("mailSubject")?.value || "";
    const body = $("mailBody")?.value || "";
    const text = `${subject}\n${body}`.toLowerCase();
    const checks = [];
    if (/safeguarding|risk|harm|missing|police|disclosure|exploitation|restraint|self-harm/.test(text)) checks.push("Safeguarding language detected — check chronology, notifications and manager oversight before sending.");
    if (/angry|furious|unacceptable|failed|complaint/.test(text)) checks.push("Tone may sound reactive. Consider factual, neutral wording.");
    if (/urgent|asap|follow up|action|deadline|by tomorrow/.test(text)) checks.push("This appears to contain actions or deadlines. Make ownership and timescales explicit.");
    if (!/kind regards|regards|many thanks|thank you/.test(text)) checks.push("Consider adding a professional closing.");
    const node = $("mailAiReview");
    if (node) {
      node.innerHTML = checks.length
        ? checks.map((item) => `<div class="ic-mail-review-item">${esc(item)}</div>`).join("")
        : '<div class="ic-mail-review-item ok">No obvious safeguarding, tone or action issues detected.</div>';
    }
  }

  function askAi(mode) {
    const messages = [...document.querySelectorAll(".ic-mail-message p")].map((item) => item.innerText).join("\n\n---\n\n");
    const prompts = {
      tone: "Draft a professional, factual reply to this email thread. Keep it calm, clear and suitable for residential childcare communication.",
      chronology: "Extract chronology entries from this email thread using Date/Time → Event → Action → Outcome → Missing information.",
      safeguarding: "Review this email thread for safeguarding concerns, missing information, escalation points, manager oversight and follow-up actions. Do not make final threshold decisions.",
    };
    document.querySelector('[data-suite-view="intelligence"]')?.click();
    const input = $("input");
    if (input) {
      input.value = `${prompts[mode] || "Review this email thread."}\n\nEmail thread:\n${messages}`;
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const folder = event.target.closest("[data-mail-folder]");
      if (folder) {
        currentFolder = folder.dataset.mailFolder;
        document.querySelectorAll("[data-mail-folder]").forEach((button) => button.classList.toggle("active", button === folder));
        loadMessages();
        return;
      }
      const row = event.target.closest("[data-mail-thread]");
      if (row) {
        loadThread(row.dataset.mailThread);
        return;
      }
      const reply = event.target.closest("[data-mail-reply]");
      if (reply) {
        const latest = document.querySelector(".ic-mail-message header strong")?.textContent || "";
        $("mailComposer")?.setAttribute("data-parent-message-id", reply.dataset.mailParent || "");
        openCompose({ to: latest, subject: document.querySelector(".ic-mail-thread-head h2")?.textContent ? `Re: ${document.querySelector(".ic-mail-thread-head h2").textContent.replace(/^Re:\s*/i, "")}` : "Re:" });
        return;
      }
      const ai = event.target.closest("[data-mail-ai]");
      if (ai) {
        askAi(ai.dataset.mailAi);
        return;
      }
    });

    $("mailRefresh")?.addEventListener("click", loadMessages);
    $("mailCompose")?.addEventListener("click", () => openCompose());
    $("mailComposeClose")?.addEventListener("click", closeCompose);
    $("mailSend")?.addEventListener("click", sendMail);
    $("mailReviewWithAi")?.addEventListener("click", reviewCompose);
    $("mailSearch")?.addEventListener("input", () => {
      clearTimeout(window.__indicareMailSearchTimer);
      window.__indicareMailSearchTimer = setTimeout(loadMessages, 250);
    });
  }

  function patchSuiteSwitching() {
    document.addEventListener("click", (event) => {
      const suite = event.target.closest('[data-suite-view="mail"]');
      if (!suite) return;
      document.querySelectorAll("[data-suite-view]").forEach((button) => button.classList.toggle("active", button === suite));
      document.querySelectorAll("[data-suite-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.suitePanel !== "mail"));
      $("composerDock")?.classList.add("hidden");
      if ($("workspaceTitle")) $("workspaceTitle").textContent = "IndiCare Mail";
      loadDiagnostics();
      loadMessages();
    }, true);

    document.addEventListener("click", (event) => {
      const suite = event.target.closest("[data-suite-view]");
      if (!suite || suite.dataset.suiteView === "mail") return;
      if (suite.dataset.suiteView === "intelligence") $("composerDock")?.classList.remove("hidden");
    }, true);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installNav();
    installPanel();
    bind();
    patchSuiteSwitching();
    loadDiagnostics();
  });
})();
