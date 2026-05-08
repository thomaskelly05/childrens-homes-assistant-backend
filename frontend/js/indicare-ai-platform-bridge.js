/* IndiCare AI platform bridge.
   Connects existing profile, notifications, command palette, search, QA and timeline APIs
   into the single standalone assistant shell without changing assistant runtime wiring. */
(function () {
  const PROFILE_KEY = "indicare_assistant_user_profile";
  const MODE_KEY = "indicare_assistant_default_mode";
  const PROFILE_IMAGE_KEY = "indicare_profile_image";
  const ACTIVE_WORKSPACE_KEY = "indicare_assistant_active_workspace";

  function $(id) { return document.getElementById(id); }
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
    const response = await fetch(url, { credentials: "include", ...(options || {}), headers: { ...headers(method), ...(options?.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || payload.message || `Request failed: ${response.status}`);
    return payload;
  }
  function initials(name, email) {
    const parts = String(name || email || "IC").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "IC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  function activeProjectId() {
    const selectValue = $("workspaceSelect")?.value;
    return selectValue || localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "standalone";
  }
  function showToast(text) {
    const existing = document.querySelector(".ic-bridge-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "ic-bridge-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }
  function putInComposer(text) {
    const input = $("input");
    if (!input) return;
    input.value = String(text || "").trim();
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function hydrateProfile() {
    try {
      const data = await api("/account/profile");
      const user = data.user || {};
      const profile = data.profile || {};
      const displayName = profile.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "Assistant user";
      const image = profile.profile_image_data || localStorage.getItem(PROFILE_IMAGE_KEY) || "";
      const role = user.role || "IndiCare user";
      const profilePayload = { name: displayName, role, defaultMode: profile.assistant_default_mode || "ofsted", tone: profile.assistant_tone || "professional", image };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profilePayload));
      localStorage.setItem(MODE_KEY, profilePayload.defaultMode);
      if (image) localStorage.setItem(PROFILE_IMAGE_KEY, image);

      ["icUserName", "icUserNameSidebar"].forEach((id) => { if ($(id)) $(id).textContent = displayName; });
      ["icUserRoleSidebar"].forEach((id) => { if ($(id)) $(id).textContent = role; });
      ["icUserAvatar", "icUserAvatarSidebar"].forEach((id) => {
        const node = $(id);
        if (!node) return;
        if (image) node.innerHTML = `<img src="${image}" alt="${escapeHtml(displayName)}" />`;
        else node.textContent = profile.initials || initials(displayName, user.email);
      });
    } catch (error) {
      // Profile is nice-to-have. The assistant should still work if account profile fails.
      console.warn("Profile bridge unavailable", error);
    }
  }

  function installShellButtons() {
    const actions = document.querySelector(".ic-top-actions");
    if (actions && !$("openCommandPalette")) {
      const command = document.createElement("button");
      command.id = "openCommandPalette";
      command.className = "ic-nav-btn ic-top-tool";
      command.type = "button";
      command.textContent = "⌘K";
      command.title = "Command palette";
      actions.insertBefore(command, actions.firstChild);

      const notifications = document.createElement("button");
      notifications.id = "openNotifications";
      notifications.className = "ic-nav-btn ic-top-tool";
      notifications.type = "button";
      notifications.innerHTML = `Notifications <span id="notificationBadge" class="ic-badge hidden">0</span>`;
      notifications.title = "Notifications";
      actions.insertBefore(notifications, actions.children[1] || null);

      const profile = document.createElement("a");
      profile.id = "openProfile";
      profile.className = "ic-nav-btn ic-top-tool ic-link-tool";
      profile.href = "/my-profile";
      profile.textContent = "Profile";
      actions.insertBefore(profile, actions.children[2] || null);
    }

    const sidebarFooter = document.querySelector(".ic-sidebar-footer");
    if (sidebarFooter && !$("sidebarProfileLink")) {
      const link = document.createElement("a");
      link.id = "sidebarProfileLink";
      link.className = "ic-sidebar-profile-link";
      link.href = "/my-profile";
      link.textContent = "Manage profile and password";
      sidebarFooter.appendChild(link);
    }
  }

  function installDrawers() {
    if (!$("notificationsDrawer")) {
      const drawer = document.createElement("aside");
      drawer.id = "notificationsDrawer";
      drawer.className = "ic-floating-panel hidden";
      drawer.innerHTML = `
        <div class="ic-floating-head"><div><strong>Notifications</strong><span>Operational alerts and follow-ups</span></div><button type="button" data-close-panel="notificationsDrawer">×</button></div>
        <div class="ic-floating-actions"><button type="button" id="markAllNotificationsRead">Mark all read</button><button type="button" id="refreshNotifications">Refresh</button></div>
        <div id="notificationList" class="ic-floating-list"><p class="ic-muted-mini">Loading...</p></div>
      `;
      document.body.appendChild(drawer);
    }

    if (!$("commandPalette")) {
      const palette = document.createElement("div");
      palette.id = "commandPalette";
      palette.className = "ic-command-overlay hidden";
      palette.innerHTML = `
        <div class="ic-command-card" role="dialog" aria-label="Command palette">
          <div class="ic-command-search"><input id="commandSearch" type="text" placeholder="Search commands, conversations, projects and intelligence..." autocomplete="off" /><button type="button" data-close-panel="commandPalette">×</button></div>
          <div id="commandResults" class="ic-command-results"></div>
        </div>
      `;
      document.body.appendChild(palette);
    }
  }

  async function refreshNotifications() {
    const badge = $("notificationBadge");
    try {
      const count = await api("/notifications/unread-count");
      if (badge) {
        const value = Number(count.count || 0);
        badge.textContent = String(value);
        badge.classList.toggle("hidden", value <= 0);
      }
      const data = await api("/notifications?limit=30");
      const items = data.items || [];
      const list = $("notificationList");
      if (!list) return;
      if (!data.available) {
        list.innerHTML = `<p class="ic-muted-mini">${escapeHtml(data.message || "Notifications are not available yet.")}</p>`;
        return;
      }
      if (!items.length) {
        list.innerHTML = `<p class="ic-muted-mini">No notifications right now.</p>`;
        return;
      }
      list.innerHTML = items.map((item) => `
        <article class="ic-notification ${item.read_at ? "read" : "unread"}">
          <small>${escapeHtml(item.priority || item.notification_type || "notification")}</small>
          <strong>${escapeHtml(item.title || "Notification")}</strong>
          <p>${escapeHtml(item.body || item.message || "")}</p>
          <div class="ic-notification-actions">
            ${item.href ? `<a href="${escapeHtml(item.href)}">Open</a>` : ""}
            <button type="button" data-read-notification="${item.id}">Mark read</button>
            <button type="button" data-dismiss-notification="${item.id}">Dismiss</button>
          </div>
        </article>
      `).join("");
    } catch (error) {
      const list = $("notificationList");
      if (list) list.innerHTML = `<p class="ic-muted-mini">Notifications could not be loaded.</p>`;
      console.warn("Notifications unavailable", error);
    }
  }

  async function loadQaSummary() {
    try {
      const data = await api("/qa/dashboard");
      return data;
    } catch (_) {
      return null;
    }
  }

  async function loadTimelineSummary() {
    const projectId = activeProjectId();
    try {
      return await api(`/standalone-timeline/projects/${encodeURIComponent(projectId)}/summary`);
    } catch (_) {
      return null;
    }
  }

  async function operationalSearch(query) {
    const projectId = activeProjectId();
    return api("/standalone-search/operational", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, query, limit: 12 }),
    });
  }

  const COMMANDS = [
    { id: "profile", title: "Open My Profile", subtitle: "Profile picture, password and settings", run: () => { window.location.href = "/my-profile"; } },
    { id: "new-chat", title: "New conversation", subtitle: "Start a fresh IndiCare AI chat", run: () => $("newChat")?.click() },
    { id: "notes", title: "Open I-Notes", subtitle: "Capture and structure notes", run: () => document.querySelector('[data-suite-view="notes"]')?.click() },
    { id: "docs", title: "Open IndiCare Docs", subtitle: "Create policies, chronologies and evidence packs", run: () => document.querySelector('[data-suite-view="docs"]')?.click() },
    { id: "ai", title: "Open IndiCare AI", subtitle: "Return to assistant chat", run: () => document.querySelector('[data-suite-view="intelligence"]')?.click() },
    { id: "notifications", title: "Open notifications", subtitle: "Alerts and follow-ups", run: () => openNotifications() },
    { id: "qa", title: "QA dashboard summary", subtitle: "Pull review, document and follow-up quality data", run: async () => insertQaPrompt() },
    { id: "timeline", title: "Timeline summary", subtitle: "Summarise project chronology intelligence", run: async () => insertTimelinePrompt() },
    { id: "safeguarding", title: "Safeguarding review", subtitle: "Prompt: review facts, concerns and actions", run: () => putInComposer("Review this safeguarding concern. Separate facts, concerns, missing information, immediate actions, manager/DSL review and recording implications:") },
    { id: "incident", title: "Incident record", subtitle: "Prompt: create a professional incident record", run: () => putInComposer("Create a professional incident record with chronology, staff actions, outcome, safeguarding considerations and manager review:") },
    { id: "chronology", title: "Extract chronology", subtitle: "Prompt: build a factual chronology", run: () => putInComposer("Extract a factual chronology. Use Date/Time → Event → Staff action → Outcome → Missing information:") },
    { id: "ofsted", title: "Ofsted evidence summary", subtitle: "Prompt: evidence, impact, gaps and leadership oversight", run: () => putInComposer("Prepare an Ofsted evidence summary. Include evidence seen, impact for children, gaps, leadership oversight and likely inspector questions:") },
  ];

  async function insertQaPrompt() {
    const data = await loadQaSummary();
    if (!data) { showToast("QA dashboard is unavailable."); return; }
    putInComposer(`Review this QA dashboard and identify priorities, risks, leadership oversight and next actions:\n\n${JSON.stringify(data, null, 2)}`);
  }

  async function insertTimelinePrompt() {
    const data = await loadTimelineSummary();
    if (!data) { showToast("Timeline summary is unavailable for this project."); return; }
    putInComposer(`Summarise this project timeline intelligence. Identify chronology themes, safeguarding patterns, gaps and next actions:\n\n${JSON.stringify(data, null, 2)}`);
  }

  async function renderCommandResults(query) {
    const results = $("commandResults");
    if (!results) return;
    const q = String(query || "").trim().toLowerCase();
    const local = COMMANDS.filter((command) => !q || `${command.title} ${command.subtitle} ${command.id}`.toLowerCase().includes(q));
    let html = local.map((command) => `
      <button type="button" class="ic-command-item" data-command-id="${command.id}">
        <strong>${escapeHtml(command.title)}</strong><span>${escapeHtml(command.subtitle)}</span>
      </button>
    `).join("");

    if (q.length >= 2) {
      html += `<div class="ic-command-section">Operational search</div>`;
      try {
        const data = await operationalSearch(q);
        const items = data.results || data.items || [];
        if (items.length) {
          html += items.slice(0, 8).map((item, index) => {
            const title = item.title || item.record_type || item.type || `Result ${index + 1}`;
            const body = item.summary || item.text || item.excerpt || item.content || "";
            return `<button type="button" class="ic-command-item" data-search-result="${index}" data-search-text="${escapeHtml(`${title}\n${body}`)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body).slice(0, 180)}</span></button>`;
          }).join("");
        } else {
          html += `<p class="ic-muted-mini">No operational search results.</p>`;
        }
      } catch (error) {
        html += `<p class="ic-muted-mini">Operational search is unavailable for this account/project.</p>`;
      }
    }

    results.innerHTML = html || `<p class="ic-muted-mini">No commands found.</p>`;
  }

  function openCommandPalette() {
    const palette = $("commandPalette");
    if (!palette) return;
    palette.classList.remove("hidden");
    const input = $("commandSearch");
    if (input) {
      input.value = "";
      input.focus();
    }
    renderCommandResults("");
  }

  function closePanel(id) {
    $(id)?.classList.add("hidden");
  }

  function openNotifications() {
    const drawer = $("notificationsDrawer");
    if (!drawer) return;
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) refreshNotifications();
  }

  function bind() {
    document.addEventListener("click", async (event) => {
      const target = event.target;
      if (target.closest("#openCommandPalette")) { openCommandPalette(); return; }
      if (target.closest("#openNotifications")) { openNotifications(); return; }
      const close = target.closest("[data-close-panel]");
      if (close) { closePanel(close.getAttribute("data-close-panel")); return; }
      const commandItem = target.closest("[data-command-id]");
      if (commandItem) {
        const command = COMMANDS.find((item) => item.id === commandItem.getAttribute("data-command-id"));
        closePanel("commandPalette");
        if (command) await command.run();
        return;
      }
      const searchResult = target.closest("[data-search-text]");
      if (searchResult) {
        closePanel("commandPalette");
        putInComposer(`Use this operational search result as context and help me analyse it:\n\n${searchResult.getAttribute("data-search-text")}`);
        return;
      }
      const read = target.closest("[data-read-notification]");
      if (read) {
        await api(`/notifications/${read.getAttribute("data-read-notification")}/read`, { method: "POST" }).catch(() => null);
        refreshNotifications();
        return;
      }
      const dismiss = target.closest("[data-dismiss-notification]");
      if (dismiss) {
        await api(`/notifications/${dismiss.getAttribute("data-dismiss-notification")}/dismiss`, { method: "POST" }).catch(() => null);
        refreshNotifications();
        return;
      }
    });

    $("commandSearch")?.addEventListener("input", (event) => renderCommandResults(event.target.value));
    document.addEventListener("input", (event) => {
      if (event.target?.id === "commandSearch") renderCommandResults(event.target.value);
    });
    document.addEventListener("keydown", (event) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) { event.preventDefault(); openCommandPalette(); }
      if (event.key === "Escape") { closePanel("commandPalette"); closePanel("notificationsDrawer"); }
    });
    document.addEventListener("click", async (event) => {
      if (event.target?.id === "markAllNotificationsRead") {
        await api("/notifications/mark-all-read", { method: "POST" }).catch(() => null);
        refreshNotifications();
      }
      if (event.target?.id === "refreshNotifications") refreshNotifications();
    });
  }

  async function refreshTimelinePanel() {
    const data = await loadTimelineSummary();
    if (!data) return;
    if ($("timelineSummaryTitle")) $("timelineSummaryTitle").textContent = `${data.eventCount || 0} timeline event${Number(data.eventCount || 0) === 1 ? "" : "s"}`;
    if ($("timelineSummaryText")) $("timelineSummaryText").textContent = data.summary || "Timeline intelligence is available for this project.";
    const alerts = data.analysis?.alerts || [];
    const alertNode = $("suiteTimelineAlerts");
    if (alertNode && alerts.length) alertNode.innerHTML = alerts.slice(0, 5).map((alert) => `<button type="button" data-command-id="timeline">${escapeHtml(alert)}</button>`).join("");
  }

  window.addEventListener("DOMContentLoaded", () => {
    installShellButtons();
    installDrawers();
    bind();
    hydrateProfile();
    refreshNotifications();
    refreshTimelinePanel();
    setInterval(refreshNotifications, 60000);
  });
})();
