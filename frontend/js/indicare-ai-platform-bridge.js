/* IndiCare AI bridge: safe shell loader for standalone assistant tools. */
(function () {
  const PROFILE_KEY = "indicare_assistant_user_profile";
  const MODE_KEY = "indicare_assistant_default_mode";
  const PROFILE_IMAGE_KEY = "indicare_profile_image";
  const ACTIVE_WORKSPACE_KEY = "indicare_assistant_active_workspace";

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const safe = (label, fn) => {
    try { return fn(); } catch (error) { console.warn(`IndiCare bridge skipped ${label}`, error); return null; }
  };

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

  function initials(name, email) {
    const parts = String(name || email || "IC").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "IC";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function activeProjectId() {
    return $("workspaceSelect")?.value || localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "standalone";
  }

  function openApp(view) {
    document.querySelector(`[data-suite-view="${view}"]`)?.click();
  }

  function putInComposer(text) {
    openApp("intelligence");
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
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: displayName, role, defaultMode: profile.assistant_default_mode || "ofsted", tone: profile.assistant_tone || "professional", image }));
      localStorage.setItem(MODE_KEY, profile.assistant_default_mode || "ofsted");
      if (image) localStorage.setItem(PROFILE_IMAGE_KEY, image);
      ["icUserName", "icUserNameSidebar"].forEach((id) => { if ($(id)) $(id).textContent = displayName; });
      if ($("icUserRoleSidebar")) $("icUserRoleSidebar").textContent = role;
      ["icUserAvatar", "icUserAvatarSidebar"].forEach((id) => {
        const node = $(id);
        if (!node) return;
        node.innerHTML = image ? `<img src="${image}" alt="${esc(displayName)}" />` : esc(profile.initials || initials(displayName, user.email));
      });
    } catch (error) {
      console.warn("IndiCare profile unavailable", error);
    }
  }

  function installShellButtons() {
    const actions = document.querySelector(".ic-top-actions");
    if (actions && !$("openCommandPalette")) {
      const buttons = [
        ["openCommandPalette", "⌘K", "Command palette"],
        ["openVoiceCompanion", "Hey IndiCare", "Talk to IndiCare AI"],
        ["openDevicePermissions", "Devices", "Microphone and camera setup"],
        ["openNotifications", "Updates", "Helpful reminders, review prompts and follow-ups"],
      ];
      buttons.forEach(([id, text, title], index) => {
        const button = document.createElement("button");
        button.id = id;
        button.className = "ic-nav-btn ic-top-tool";
        button.type = "button";
        button.title = title;
        button.innerHTML = id === "openNotifications" ? `Updates <span id="notificationBadge" class="ic-badge hidden">0</span>` : text;
        actions.insertBefore(button, actions.children[index] || null);
      });
      const profile = document.createElement("a");
      profile.id = "openProfile";
      profile.className = "ic-nav-btn ic-top-tool ic-link-tool";
      profile.href = "/my-profile";
      profile.textContent = "Profile";
      actions.insertBefore(profile, actions.children[4] || null);
    }
    const footer = document.querySelector(".ic-sidebar-footer");
    if (footer && !$("sidebarProfileLink")) {
      const link = document.createElement("a");
      link.id = "sidebarProfileLink";
      link.className = "ic-sidebar-profile-link";
      link.href = "/my-profile";
      link.textContent = "Profile, photo and password";
      footer.appendChild(link);
    }
  }

  function installPanels() {
    if (!$("notificationsDrawer")) {
      const drawer = document.createElement("aside");
      drawer.id = "notificationsDrawer";
      drawer.className = "ic-floating-panel hidden";
      drawer.innerHTML = `<div class="ic-floating-head"><div><strong>Updates</strong><span>Helpful reminders, review prompts and follow-ups</span></div><button type="button" data-close-panel="notificationsDrawer">×</button></div><div class="ic-floating-actions"><button type="button" id="markAllNotificationsRead">Mark all read</button><button type="button" id="refreshNotifications">Refresh</button></div><div id="notificationList" class="ic-floating-list"><p class="ic-muted-mini">Loading...</p></div>`;
      document.body.appendChild(drawer);
    }
    if (!$("commandPalette")) {
      const palette = document.createElement("div");
      palette.id = "commandPalette";
      palette.className = "ic-command-overlay hidden";
      palette.innerHTML = `<div class="ic-command-card" role="dialog" aria-label="Command palette"><div class="ic-command-search"><input id="commandSearch" type="text" placeholder="Search tools, conversations, projects, templates, mail, web, context and reviews..." autocomplete="off" /><button type="button" data-close-panel="commandPalette">×</button></div><div id="commandResults" class="ic-command-results"></div></div>`;
      document.body.appendChild(palette);
    }
  }

  async function refreshUpdates() {
    const badge = $("notificationBadge");
    try {
      const count = await api("/notifications/unread-count");
      const value = Number(count.count || 0);
      if (badge) {
        badge.textContent = String(value);
        badge.classList.toggle("hidden", value <= 0);
      }
      const data = await api("/notifications?limit=30");
      const items = data.items || [];
      const list = $("notificationList");
      if (!list) return;
      if (!data.available) {
        list.innerHTML = `<p class="ic-muted-mini">${esc(data.message || "Updates are not available yet.")}</p>`;
        return;
      }
      if (!items.length) {
        list.innerHTML = '<p class="ic-muted-mini">No updates right now.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `<article class="ic-notification ${item.read_at ? "read" : "unread"}"><small>${esc(item.priority || item.notification_type || "update")}</small><strong>${esc(item.title || "Update")}</strong><p>${esc(item.body || item.message || "")}</p><div class="ic-notification-actions">${item.href ? `<a href="${esc(item.href)}">Open</a>` : ""}<button type="button" data-read-notification="${item.id}">Mark read</button><button type="button" data-dismiss-notification="${item.id}">Dismiss</button></div></article>`).join("");
    } catch (_) {
      if ($("notificationList")) $("notificationList").innerHTML = '<p class="ic-muted-mini">Updates could not be loaded.</p>';
    }
  }

  async function loadQaSummary() { try { return await api("/qa/dashboard"); } catch (_) { return null; } }
  async function loadTimelineSummary() { try { return await api(`/standalone-timeline/projects/${encodeURIComponent(activeProjectId())}/summary`); } catch (_) { return null; } }
  async function projectSearch(query) { return api("/standalone-search/operational", { method: "POST", body: JSON.stringify({ project_id: activeProjectId(), query, limit: 12 }) }); }

  async function insertQaPrompt() {
    const data = await loadQaSummary();
    if (data) putInComposer(`Review this quality and follow-up summary for a children's home. Identify recording/document issues, priorities, risks, manager oversight and next actions:\n\n${JSON.stringify(data, null, 2)}`);
  }

  async function insertTimelinePrompt() {
    const data = await loadTimelineSummary();
    if (data) putInComposer(`Summarise this project chronology. Identify themes, safeguarding patterns, gaps and suggested next actions:\n\n${JSON.stringify(data, null, 2)}`);
  }

  const COMMANDS = [
    { id: "profile", title: "Open My Profile", subtitle: "Profile picture, password and settings", run: () => { window.location.href = "/my-profile"; } },
    { id: "devices", title: "Set up devices", subtitle: "Microphone and camera access for Hey IndiCare", run: () => window.IndiCareDevicePermissions?.open?.() },
    { id: "voice-setup", title: "Voice setup", subtitle: "Set up voice capture and confirmed speaker label", run: () => window.IndiCareVoiceSetup?.open?.() },
    { id: "new-chat", title: "New conversation", subtitle: "Start a fresh IndiCare AI chat", run: () => $("newChat")?.click() },
    { id: "ai", title: "IndiCare AI", subtitle: "ChatGPT-style assistant for children's home practice", run: () => openApp("intelligence") },
    { id: "voice", title: "Hey IndiCare", subtitle: "Open the British voice companion", run: () => $("voiceOrb")?.click() },
    { id: "awareness", title: "IndiCare Awareness", subtitle: "Things IndiCare thinks you should know", run: () => $("openAmbientIntelligence")?.click() },
    { id: "web", title: "Ask with web search", subtitle: "Use Tavily for current information", run: () => putInComposer("Search the web and answer conversationally: ") },
    { id: "presence", title: "Use IndiCare context", subtitle: "Timeline, proactive intelligence and Connect context", run: () => putInComposer("What patterns, risks, unresolved actions or follow-ups should I be aware of?") },
    { id: "notes", title: "I-Notes", subtitle: "Note, transcribe, clean up and review with AI", run: () => openApp("notes") },
    { id: "docs", title: "IndiCare Docs", subtitle: "Template documents with AI review and rewriting", run: () => openApp("docs") },
    { id: "mail", title: "IndiCare Mail", subtitle: "Internal and external AI-native mail", run: () => openApp("mail") },
    { id: "qa", title: "AI review dashboard", subtitle: "Review quality, follow-ups and document issues", run: insertQaPrompt },
    { id: "timeline", title: "Chronology summary", subtitle: "Summarise project chronology intelligence", run: insertTimelinePrompt },
    { id: "incident", title: "Incident record", subtitle: "Create a professional incident record", run: () => putInComposer("Create a professional incident record with chronology, staff actions, outcome, safeguarding considerations and manager review:") },
    { id: "safeguarding", title: "Safeguarding review", subtitle: "Review facts, concerns and actions", run: () => putInComposer("Review this safeguarding concern. Separate facts, concerns, missing information, immediate actions, manager/DSL review and recording implications:") },
    { id: "mail-compose", title: "Compose email", subtitle: "Open IndiCare Mail composer", run: () => { openApp("mail"); setTimeout(() => $("mailCompose")?.click(), 150); } },
  ];

  async function renderCommands(query) {
    const results = $("commandResults");
    if (!results) return;
    const q = String(query || "").trim().toLowerCase();
    const local = COMMANDS.filter((cmd) => !q || `${cmd.title} ${cmd.subtitle} ${cmd.id}`.toLowerCase().includes(q));
    let html = local.map((cmd) => `<button type="button" class="ic-command-item" data-command-id="${cmd.id}"><strong>${esc(cmd.title)}</strong><span>${esc(cmd.subtitle)}</span></button>`).join("");
    if (q.length >= 2) {
      html += '<div class="ic-command-section">Project search</div>';
      try {
        const data = await projectSearch(q);
        const items = data.results || data.items || [];
        html += items.length ? items.slice(0, 8).map((item, index) => {
          const title = item.title || item.record_type || item.type || `Result ${index + 1}`;
          const body = item.summary || item.text || item.excerpt || item.content || "";
          return `<button type="button" class="ic-command-item" data-search-text="${esc(`${title}\n${body}`)}"><strong>${esc(title)}</strong><span>${esc(body).slice(0, 180)}</span></button>`;
        }).join("") : '<p class="ic-muted-mini">No project search results.</p>';
      } catch (_) { html += '<p class="ic-muted-mini">Project search is unavailable.</p>'; }
    }
    results.innerHTML = html || '<p class="ic-muted-mini">No commands found.</p>';
  }

  function openCommandPalette() {
    const palette = $("commandPalette");
    if (!palette) return;
    palette.classList.remove("hidden");
    const input = $("commandSearch");
    if (input) { input.value = ""; input.focus(); }
    renderCommands("");
  }

  function closePanel(id) { $(id)?.classList.add("hidden"); }

  function openUpdates() {
    const drawer = $("notificationsDrawer");
    if (!drawer) return;
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) refreshUpdates();
  }

  async function refreshTimelinePanel() {
    const data = await loadTimelineSummary();
    if (!data) return;
    if ($("timelineSummaryTitle")) $("timelineSummaryTitle").textContent = `${data.eventCount || 0} chronology item${Number(data.eventCount || 0) === 1 ? "" : "s"}`;
    if ($("timelineSummaryText")) $("timelineSummaryText").textContent = data.summary || "Chronology review is available for this project.";
  }

  function loadScript(src, marker, delay) {
    window.setTimeout(() => safe(`load ${src}`, () => {
      if (document.querySelector(`script[${marker}="true"]`)) return;
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.async = false;
      script.setAttribute(marker, "true");
      script.onerror = () => console.warn(`Optional IndiCare script failed: ${src}`);
      document.body.appendChild(script);
    }), delay || 0);
  }

  function bind() {
    document.addEventListener("click", async (event) => safe("document click", async () => {
      const target = event.target;
      if (target.closest("#openCommandPalette")) return openCommandPalette();
      if (target.closest("#openNotifications")) return openUpdates();
      if (target.closest("#openDevicePermissions")) return window.IndiCareDevicePermissions?.open?.();
      if (target.closest("#openVoiceCompanion")) return $("voiceOrb")?.click();
      const close = target.closest("[data-close-panel]");
      if (close) return closePanel(close.getAttribute("data-close-panel"));
      const commandNode = target.closest("[data-command-id]");
      if (commandNode) {
        const command = COMMANDS.find((cmd) => cmd.id === commandNode.getAttribute("data-command-id"));
        closePanel("commandPalette");
        if (command) await command.run();
        return;
      }
      const search = target.closest("[data-search-text]");
      if (search) {
        closePanel("commandPalette");
        putInComposer(`Use this project search result as context and help me analyse it:\n\n${search.getAttribute("data-search-text")}`);
      }
    }));
    document.addEventListener("input", (event) => safe("command input", () => { if (event.target?.id === "commandSearch") renderCommands(event.target.value); }));
    document.addEventListener("keydown", (event) => safe("keyboard shortcut", () => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCommandPalette(); }
      if (event.key === "Escape") { closePanel("commandPalette"); closePanel("notificationsDrawer"); }
    }));
  }

  function boot() {
    if (window.__indicareAiBridgeBooted) return;
    window.__indicareAiBridgeBooted = true;
    safe("install shell buttons", installShellButtons);
    safe("install panels", installPanels);
    safe("bind bridge", bind);
    safe("hydrate profile", hydrateProfile);
    safe("refresh updates", refreshUpdates);
    safe("refresh timeline", refreshTimelinePanel);

    const optionalScripts = [
      ["/js/indicare-assistant-mode-switch.js", "data-indicare-assistant-mode-switch", 50],
      ["/js/indicare-device-permissions.js", "data-indicare-device-permissions", 100],
      ["/js/indicare-ai-product-upgrades.js", "data-indicare-product-upgrades", 150],
      ["/js/indicare-mail-shell.js", "data-indicare-mail-shell", 200],
      ["/js/indicare-web-conversation.js", "data-indicare-web-conversation", 250],
      ["/js/indicare-presence-context.js", "data-indicare-presence-context", 300],
      ["/js/indicare-conversation-continuity.js", "data-indicare-conversation-continuity", 350],
      ["/js/indicare-ambient-intelligence.js", "data-indicare-ambient-intelligence", 400],
      ["/js/indicare-voice-companion.js", "data-indicare-voice-companion", 450],
      ["/js/indicare-voice-transcription-bridge.js", "data-indicare-voice-transcription-bridge", 500],
      ["/js/indicare-alive-voice-layer.js", "data-indicare-alive-voice-layer", 650],
      ["/js/indicare-voice-setup.js", "data-indicare-voice-setup", 900],
      ["/js/indicare-hey-indicare-wake.js", "data-indicare-hey-indicare-wake", 1000],
    ];
    optionalScripts.forEach(([src, marker, delay]) => loadScript(src, marker, delay));
    window.setInterval(() => safe("refresh updates interval", refreshUpdates), 60000);
  }

  if (document.readyState === "complete") {
    window.setTimeout(boot, 0);
  } else {
    window.addEventListener("load", boot, { once: true });
  }
})();
