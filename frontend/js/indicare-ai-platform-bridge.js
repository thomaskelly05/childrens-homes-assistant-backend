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

  function resolveAiSuiteAsset(file) {
    const resolver = window.IndiCareAISuiteAssets;
    if (resolver?.resolve) return resolver.resolve(file);
    const version = window.__INDICARE_AI_SUITE_ASSET_VERSION__ || document.querySelector('meta[name="indicare-ai-suite-asset-version"]')?.content || '';
    const path = window.location.pathname || '/';
    const aiSuiteIndex = path.indexOf('/ai-suite');
    const basePath = window.__INDICARE_AI_SUITE_ASSET_BASE__ || (aiSuiteIndex >= 0
      ? `${path.slice(0, aiSuiteIndex)}/ai-suite/`
      : `${path.replace(/\/?(?:assistant(?:\.html)?|ai-suite)?\/?$/, '/') || '/'}ai-suite/`);
    const url = new URL(String(file || '').replace(/^\/+/, ''), window.location.origin + basePath).href;
    return version ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` : url;
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
    if (window.IndiCareAISuite?.setActiveApp) {
      window.IndiCareAISuite.setActiveApp(view);
      return;
    }
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

  function installCss(href, marker) {
    safe(`load css ${href}`, () => {
      if (document.querySelector(`link[${marker}="true"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute(marker, "true");
      document.head.appendChild(link);
    });
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
      palette.innerHTML = `<div class="ic-command-card" role="dialog" aria-label="Command palette"><div class="ic-command-search"><input id="commandSearch" type="text" placeholder="Search chats, notes, docs, connect, mail, memory and context..." autocomplete="off" /><button type="button" data-close-panel="commandPalette">×</button></div><div id="commandResults" class="ic-command-results"></div></div>`;
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

  const COMMANDS = [
    { id: "profile", title: "Open My Profile", subtitle: "Profile picture, password and settings", run: () => { window.location.href = "/my-profile"; } },
    { id: "devices", title: "Set up devices", subtitle: "Microphone and camera access for Hey IndiCare", run: () => window.IndiCareDevicePermissions?.open?.() },
    { id: "voice-setup", title: "Voice setup", subtitle: "Set up voice capture and confirmed speaker label", run: () => window.IndiCareVoiceSetup?.open?.() },
    { id: "new-chat", title: "New conversation", subtitle: "Start a fresh IndiCare AI chat", run: () => $("newChat")?.click() },
    { id: "ai", title: "IndiCare AI", subtitle: "ChatGPT-style assistant", run: () => openApp("intelligence") },
    { id: "voice", title: "Hey IndiCare", subtitle: "Open voice mode", run: () => window.IndiCareVoiceCompanion?.open?.() || $("voiceOrb")?.click() },
    { id: "notes", title: "I-Notes", subtitle: "Capture, clean up and summarise notes", run: () => openApp("notes") },
    { id: "docs", title: "Docs", subtitle: "Draft, rewrite and review documents", run: () => openApp("docs") },
    { id: "connect", title: "Connect", subtitle: "Meetings, collaboration and continuity", run: () => openApp("connect") },
    { id: "mail", title: "Mail", subtitle: "Draft, summarise and respond to mail", run: () => openApp("mail") },
    { id: "memory", title: "Memory", subtitle: "Use remembered context and continuity", run: () => putInComposer("Use my saved context and continuity to help with this: ") },
    { id: "web", title: "Ask with web search", subtitle: "Use current information", run: () => putInComposer("Search the web and answer conversationally: ") },
  ];

  async function renderCommands(query) {
    const results = $("commandResults");
    if (!results) return;
    const q = String(query || "").trim().toLowerCase();
    const local = COMMANDS.filter((cmd) => !q || `${cmd.title} ${cmd.subtitle} ${cmd.id}`.toLowerCase().includes(q));
    results.innerHTML = local.map((cmd) => `<button type="button" class="ic-command-item" data-command-id="${cmd.id}"><strong>${esc(cmd.title)}</strong><span>${esc(cmd.subtitle)}</span></button>`).join("") || '<p class="ic-muted-mini">No commands found.</p>';
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
      if (target.closest("#openVoiceCompanion")) return window.IndiCareVoiceCompanion?.open?.() || $("voiceOrb")?.click();
      const close = target.closest("[data-close-panel]");
      if (close) return closePanel(close.getAttribute("data-close-panel"));
      const commandNode = target.closest("[data-command-id]");
      if (commandNode) {
        const command = COMMANDS.find((cmd) => cmd.id === commandNode.getAttribute("data-command-id"));
        closePanel("commandPalette");
        if (command) await command.run();
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

    document.body?.classList.add("indicare-ai-suite");
    document.documentElement?.setAttribute("data-product-surface", "ai-suite");

    installCss("/css/indicare-conversational-experience.css", "data-indicare-conversational-css");
    safe("install shell buttons", installShellButtons);
    safe("install panels", installPanels);
    safe("bind bridge", bind);
    safe("hydrate profile", hydrateProfile);
    safe("refresh updates", refreshUpdates);

    const optionalScripts = [
      ["/js/indicare-runtime-core.js", "data-indicare-runtime-core", 10],
      ["/js/indicare-conversational-experience.js", "data-indicare-conversational-experience", 45],
      ["/js/indicare-assistant-mode-switch.js", "data-indicare-assistant-mode-switch", 70],
      ["/js/indicare-device-permissions.js", "data-indicare-device-permissions", 110],
      ["/js/indicare-ai-product-upgrades.js", "data-indicare-product-upgrades", 160],
      ["/js/indicare-mail-shell.js", "data-indicare-mail-shell", 210],
      ["/js/indicare-web-conversation.js", "data-indicare-web-conversation", 260],
      ["/js/indicare-presence-context.js", "data-indicare-presence-context", 310],
      ["/js/indicare-conversation-continuity.js", "data-indicare-conversation-continuity", 360],
      ["/js/indicare-ambient-intelligence.js", "data-indicare-ambient-intelligence", 410],
      ["/js/indicare-voice-companion.js", "data-indicare-voice-companion", 460],
      ["/js/indicare-voice-transcription-bridge.js", "data-indicare-voice-transcription-bridge", 560],
      ["/js/indicare-alive-voice-layer.js", "data-indicare-alive-voice-layer", 650],
      ["/js/indicare-voice-setup.js", "data-indicare-voice-setup", 900],
      ["/js/indicare-hey-indicare-wake.js", "data-indicare-hey-indicare-wake", 1000],
      [resolveAiSuiteAsset("indicare-ai-suite-loader.js"), "data-indicare-ai-suite-loader", 1120],
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
