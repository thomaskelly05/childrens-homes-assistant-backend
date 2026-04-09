(function () {
  const state = {
    currentView: "assistant",
    focusMode: false,
    privacyBlur: false,
    theme: localStorage.getItem("ic_theme") || "dark",
    density: localStorage.getItem("ic_density") || "comfortable",
    language: localStorage.getItem("ic_language") || "en-GB",
    context: {
      name: localStorage.getItem("ic_ctx_name") || "",
      placement: localStorage.getItem("ic_ctx_placement") || "",
      shift: localStorage.getItem("ic_ctx_shift") || "",
      worker: localStorage.getItem("ic_ctx_worker") || "",
      dob: localStorage.getItem("ic_ctx_dob") || "",
      education: localStorage.getItem("ic_ctx_education") || "",
      keyWorker: localStorage.getItem("ic_ctx_keyworker") || ""
    },
    attachment: null,
    history: JSON.parse(localStorage.getItem("ic_history") || "[]")
  };

  const els = {
    body: document.body,
    pageTitle: document.getElementById("pageTitle"),
    sidebar: document.getElementById("sidebar"),
    sidebarToggle: document.getElementById("sidebarToggle"),
    mobileMenuBtn: document.getElementById("mobileMenuBtn"),
    mobileOverlay: document.getElementById("mobileOverlay"),
    navItems: Array.from(document.querySelectorAll(".nav-item[data-view]")),
    views: Array.from(document.querySelectorAll(".view")),
    messages: document.getElementById("messages"),
    emptyState: document.getElementById("emptyState"),
    historyList: document.getElementById("historyList"),
    newChatBtn: document.getElementById("newChatBtn"),
    clearChatBtn: document.getElementById("clearChatBtn"),
    messageInput: document.getElementById("messageInput"),
    sendBtn: document.getElementById("sendBtn"),
    attachBtn: document.getElementById("attachBtn"),
    messageUpload: document.getElementById("messageUpload"),
    attachmentPill: document.getElementById("attachmentPill"),
    attachmentName: document.getElementById("attachmentName"),
    clearAttachmentBtn: document.getElementById("clearAttachmentBtn"),
    toast: document.getElementById("toast"),

    openContextBtn: document.getElementById("openContextBtn"),
    editContextBtn: document.getElementById("editContextBtn"),
    contextDrawer: document.getElementById("contextDrawer"),
    contextDrawerOverlay: document.getElementById("contextDrawerOverlay"),
    closeContextBtn: document.getElementById("closeContextBtn"),
    saveContextBtn: document.getElementById("saveContextBtn"),

    openToolsBtn: document.getElementById("openToolsBtn"),
    toolsDrawer: document.getElementById("toolsDrawer"),
    toolsDrawerOverlay: document.getElementById("toolsDrawerOverlay"),
    closeToolsBtn: document.getElementById("closeToolsBtn"),

    openSettingsBtn: document.getElementById("openSettingsBtn"),
    openSettingsTopBtn: document.getElementById("openSettingsTopBtn"),
    settingsDrawer: document.getElementById("settingsDrawer"),
    settingsDrawerOverlay: document.getElementById("settingsDrawerOverlay"),
    closeSettingsBtn: document.getElementById("closeSettingsBtn"),
    saveSettingsBtn: document.getElementById("saveSettingsBtn"),

    focusModeBtn: document.getElementById("focusModeBtn"),
    focusModeToggleBtn: document.getElementById("focusModeToggleBtn"),
    privacyToggleBtn: document.getElementById("privacyToggleBtn"),

    assistantMode: document.getElementById("assistantMode"),
    assistantPersona: document.getElementById("assistantPersona"),
    mobileMode: document.getElementById("mobileMode"),
    mobilePersona: document.getElementById("mobilePersona"),
    themeSelect: document.getElementById("themeSelect"),
    densitySelect: document.getElementById("densitySelect"),
    languageSelect: document.getElementById("languageSelect"),

    inputName: document.getElementById("inputName"),
    inputPlacement: document.getElementById("inputPlacement"),
    inputShift: document.getElementById("inputShift"),
    inputWorker: document.getElementById("inputWorker"),
    inputDob: document.getElementById("inputDob"),
    inputEducation: document.getElementById("inputEducation"),
    inputKeyWorker: document.getElementById("inputKeyWorker"),

    contextName: document.getElementById("contextName"),
    contextPlacement: document.getElementById("contextPlacement"),
    contextShift: document.getElementById("contextShift"),
    contextWorker: document.getElementById("contextWorker"),

    profileName: document.getElementById("profileName"),
    profileDob: document.getElementById("profileDob"),
    profilePlacement: document.getElementById("profilePlacement"),
    profileEducation: document.getElementById("profileEducation"),
    profileKeyWorker: document.getElementById("profileKeyWorker"),

    profileSummary: document.getElementById("profileSummary"),
    saveProfileSummaryBtn: document.getElementById("saveProfileSummaryBtn"),

    planWorkspace: document.getElementById("planWorkspace"),
    savePlanBtn: document.getElementById("savePlanBtn"),

    documentWorkspace: document.getElementById("documentWorkspace"),
    saveDocumentBtn: document.getElementById("saveDocumentBtn"),

    docUpload: document.getElementById("docUpload")
  };

  function init() {
    applyTheme();
    applyDensity();
    hydratePreferences();
    populateContextInputs();
    renderContext();
    renderHistory();
    bindEvents();
    autoResizeTextarea(els.messageInput);

    const savedProfileSummary = localStorage.getItem("ic_profile_summary") || "";
    const savedPlanDraft = localStorage.getItem("ic_plan_draft") || "";
    const savedDocumentNotes = localStorage.getItem("ic_document_notes") || "";

    if (els.profileSummary) els.profileSummary.value = savedProfileSummary;
    if (els.planWorkspace) els.planWorkspace.value = savedPlanDraft;
    if (els.documentWorkspace) els.documentWorkspace.value = savedDocumentNotes;
  }

  function bindEvents() {
    els.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        switchView(item.dataset.view);
        closeMobileSidebar();
      });
    });

    document.querySelectorAll("[data-prompt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt") || "";
        els.messageInput.value = prompt;
        autoResizeTextarea(els.messageInput);
        els.messageInput.focus();
      });
    });

    els.sidebarToggle?.addEventListener("click", () => {
      els.body.classList.toggle("sidebar-collapsed");
      showToast("Sidebar controls can be wired further if needed.");
    });

    els.mobileMenuBtn?.addEventListener("click", openMobileSidebar);
    els.mobileOverlay?.addEventListener("click", closeMobileSidebar);

    els.newChatBtn?.addEventListener("click", startNewChat);
    els.clearChatBtn?.addEventListener("click", clearChat);

    els.messageInput?.addEventListener("input", () => autoResizeTextarea(els.messageInput));
    els.messageInput?.addEventListener("keydown", handleComposerKeydown);
    els.sendBtn?.addEventListener("click", sendMessage);

    els.attachBtn?.addEventListener("click", () => els.messageUpload?.click());
    els.messageUpload?.addEventListener("change", handleAttachment);
    els.docUpload?.addEventListener("change", handleAttachment);
    els.clearAttachmentBtn?.addEventListener("click", clearAttachment);

    els.openContextBtn?.addEventListener("click", () => openDrawer("context"));
    els.editContextBtn?.addEventListener("click", () => openDrawer("context"));
    els.closeContextBtn?.addEventListener("click", () => closeDrawer("context"));
    els.contextDrawerOverlay?.addEventListener("click", () => closeDrawer("context"));
    els.saveContextBtn?.addEventListener("click", saveContext);

    els.openToolsBtn?.addEventListener("click", () => openDrawer("tools"));
    els.closeToolsBtn?.addEventListener("click", () => closeDrawer("tools"));
    els.toolsDrawerOverlay?.addEventListener("click", () => closeDrawer("tools"));

    els.openSettingsBtn?.addEventListener("click", () => openDrawer("settings"));
    els.openSettingsTopBtn?.addEventListener("click", () => openDrawer("settings"));
    els.closeSettingsBtn?.addEventListener("click", () => closeDrawer("settings"));
    els.settingsDrawerOverlay?.addEventListener("click", () => closeDrawer("settings"));
    els.saveSettingsBtn?.addEventListener("click", saveSettings);

    els.focusModeBtn?.addEventListener("click", toggleFocusMode);
    els.focusModeToggleBtn?.addEventListener("click", toggleFocusMode);
    els.privacyToggleBtn?.addEventListener("click", togglePrivacyBlur);

    els.mobileMode?.addEventListener("change", syncModesFromMobile);
    els.mobilePersona?.addEventListener("change", syncPersonasFromMobile);
    els.assistantMode?.addEventListener("change", syncModesFromDesktop);
    els.assistantPersona?.addEventListener("change", syncPersonasFromDesktop);

    els.saveProfileSummaryBtn?.addEventListener("click", () => {
      localStorage.setItem("ic_profile_summary", els.profileSummary.value || "");
      showToast("Profile summary saved");
    });

    els.savePlanBtn?.addEventListener("click", () => {
      localStorage.setItem("ic_plan_draft", els.planWorkspace.value || "");
      showToast("Plan draft saved");
    });

    els.saveDocumentBtn?.addEventListener("click", () => {
      localStorage.setItem("ic_document_notes", els.documentWorkspace.value || "");
      showToast("Document notes saved");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllDrawers();
        closeMobileSidebar();
      }
    });
  }

  function switchView(viewName) {
    state.currentView = viewName;

    els.navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    els.views.forEach((view) => {
      view.classList.toggle("active", view.id === `view-${viewName}`);
    });

    const titles = {
      assistant: "Assistant",
      profiles: "Profiles",
      timeline: "Timeline",
      plans: "Plans",
      documents: "Documents"
    };

    if (els.pageTitle) els.pageTitle.textContent = titles[viewName] || "Assistant";
  }

  function openMobileSidebar() {
    els.sidebar?.classList.add("open");
    els.mobileOverlay?.classList.add("show");
  }

  function closeMobileSidebar() {
    els.sidebar?.classList.remove("open");
    els.mobileOverlay?.classList.remove("show");
  }

  function openDrawer(name) {
    const drawerMap = {
      context: [els.contextDrawer, els.contextDrawerOverlay],
      tools: [els.toolsDrawer, els.toolsDrawerOverlay],
      settings: [els.settingsDrawer, els.settingsDrawerOverlay]
    };

    const [drawer, overlay] = drawerMap[name] || [];
    if (!drawer || !overlay) return;

    drawer.classList.add("open");
    overlay.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer(name) {
    const drawerMap = {
      context: [els.contextDrawer, els.contextDrawerOverlay],
      tools: [els.toolsDrawer, els.toolsDrawerOverlay],
      settings: [els.settingsDrawer, els.settingsDrawerOverlay]
    };

    const [drawer, overlay] = drawerMap[name] || [];
    if (!drawer || !overlay) return;

    drawer.classList.remove("open");
    overlay.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
  }

  function closeAllDrawers() {
    closeDrawer("context");
    closeDrawer("tools");
    closeDrawer("settings");
  }

  function saveContext() {
    state.context.name = els.inputName.value.trim();
    state.context.placement = els.inputPlacement.value.trim();
    state.context.shift = els.inputShift.value.trim();
    state.context.worker = els.inputWorker.value.trim();
    state.context.dob = els.inputDob.value.trim();
    state.context.education = els.inputEducation.value.trim();
    state.context.keyWorker = els.inputKeyWorker.value.trim();

    localStorage.setItem("ic_ctx_name", state.context.name);
    localStorage.setItem("ic_ctx_placement", state.context.placement);
    localStorage.setItem("ic_ctx_shift", state.context.shift);
    localStorage.setItem("ic_ctx_worker", state.context.worker);
    localStorage.setItem("ic_ctx_dob", state.context.dob);
    localStorage.setItem("ic_ctx_education", state.context.education);
    localStorage.setItem("ic_ctx_keyworker", state.context.keyWorker);

    renderContext();
    closeDrawer("context");
    showToast("Context saved");
  }

  function populateContextInputs() {
    els.inputName.value = state.context.name;
    els.inputPlacement.value = state.context.placement;
    els.inputShift.value = state.context.shift;
    els.inputWorker.value = state.context.worker;
    els.inputDob.value = state.context.dob;
    els.inputEducation.value = state.context.education;
    els.inputKeyWorker.value = state.context.keyWorker;
  }

  function renderContext() {
    els.contextName.textContent = state.context.name || "No young person selected";
    els.contextPlacement.textContent = state.context.placement || "—";
    els.contextShift.textContent = state.context.shift || "—";
    els.contextWorker.textContent = state.context.worker || "—";

    els.profileName.textContent = state.context.name || "Not set";
    els.profileDob.textContent = state.context.dob || "Not set";
    els.profilePlacement.textContent = state.context.placement || "Not set";
    els.profileEducation.textContent = state.context.education || "Not set";
    els.profileKeyWorker.textContent = state.context.keyWorker || "Not set";
  }

  function sendMessage() {
    const raw = els.messageInput.value.trim();
    if (!raw && !state.attachment) return;

    const userText = buildUserMessage(raw);
    addMessage("user", userText);

    if (els.emptyState) els.emptyState.classList.add("hidden");
    if (els.messages) els.messages.classList.remove("hidden");

    if (raw) {
      addToHistory(raw);
    }

    const response = generateAssistantResponse(raw);
    window.setTimeout(() => {
      addMessage("assistant", response);
      scrollMessagesToBottom();
    }, 350);

    els.messageInput.value = "";
    autoResizeTextarea(els.messageInput);
    clearAttachment();
    scrollMessagesToBottom();
  }

  function buildUserMessage(raw) {
    let text = raw || "Uploaded a document";
    if (state.attachment?.name) {
      text += `\n\nAttached: ${state.attachment.name}`;
    }
    return text;
  }

  function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "assistant" ? "IC" : "TK";

    const contentWrap = document.createElement("div");
    contentWrap.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = role === "assistant" ? "IndiCare Assistant" : "You";

    contentWrap.appendChild(bubble);
    contentWrap.appendChild(meta);

    if (role === "assistant") {
      row.appendChild(avatar);
      row.appendChild(contentWrap);
    } else {
      row.appendChild(contentWrap);
      row.appendChild(avatar);
    }

    els.messages.appendChild(row);
  }

  function generateAssistantResponse(message) {
    const persona = els.assistantPersona?.value || "default";
    const mode = els.assistantMode?.value || "balanced";
    const ctxName = state.context.name ? ` for ${state.context.name}` : "";

    const introMap = {
      default: `Here is a clear working response${ctxName}.`,
      safeguarding: `Here is a safeguarding-aware response${ctxName}.`,
      manager: `Here is a manager-focused response${ctxName}.`,
      documentation: `Here is a documentation-focused response${ctxName}.`,
      ofsted: `Here is a more inspection-ready response${ctxName}.`
    };

    const depthMap = {
      quick: "I have kept this brief and practical.",
      balanced: "I have kept this clear, professional, and usable in practice.",
      deep: "I have expanded this with a little more structure so it is easier to apply or adapt."
    };

    const attachmentLine = state.attachment?.name
      ? ` I have also noted the attached file: ${state.attachment.name}.`
      : "";

    const contextLine = state.context.shift
      ? ` Current shift context: ${state.context.shift}.`
      : "";

    const userLine = message
      ? `\n\nWorking from your request:\n“${message}”`
      : "";

    return `${introMap[persona] || introMap.default} ${depthMap[mode] || depthMap.balanced}${attachmentLine}${contextLine}${userLine}

Next best step:
- review the wording for accuracy
- add specific factual details, times, and observations
- keep language neutral, proportionate, and child-centred where relevant`;
  }

  function handleComposerKeydown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }

  function handleAttachment(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    state.attachment = {
      name: file.name,
      size: file.size,
      type: file.type
    };

    els.attachmentPill.classList.remove("hidden");
    els.attachmentName.textContent = file.name;
    showToast(`Attached ${file.name}`);
  }

  function clearAttachment() {
    state.attachment = null;
    els.attachmentPill.classList.add("hidden");
    els.attachmentName.textContent = "";
    if (els.messageUpload) els.messageUpload.value = "";
    if (els.docUpload) els.docUpload.value = "";
  }

  function startNewChat() {
    switchView("assistant");
    els.messages.innerHTML = "";
    els.messages.classList.add("hidden");
    els.emptyState.classList.remove("hidden");
    els.messageInput.value = "";
    autoResizeTextarea(els.messageInput);
    clearAttachment();
    showToast("Started a new chat");
  }

  function clearChat() {
    els.messages.innerHTML = "";
    els.messages.classList.add("hidden");
    els.emptyState.classList.remove("hidden");
    showToast("Chat cleared");
  }

  function addToHistory(text) {
    const title = text.length > 42 ? `${text.slice(0, 42)}…` : text;
    state.history = [title, ...state.history.filter((item) => item !== title)].slice(0, 10);
    localStorage.setItem("ic_history", JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    if (!els.historyList) return;

    if (!state.history.length) {
      els.historyList.innerHTML = `
        <button class="history-item" type="button">No recent chats yet</button>
      `;
      return;
    }

    els.historyList.innerHTML = "";
    state.history.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "history-item";
      btn.type = "button";
      btn.textContent = item;
      btn.addEventListener("click", () => {
        switchView("assistant");
        els.messageInput.value = item;
        autoResizeTextarea(els.messageInput);
        els.messageInput.focus();
      });
      els.historyList.appendChild(btn);
    });
  }

  function toggleFocusMode() {
    state.focusMode = !state.focusMode;
    els.body.classList.toggle("focus-mode", state.focusMode);
    if (els.focusModeToggleBtn) {
      els.focusModeToggleBtn.classList.toggle("is-on", state.focusMode);
      els.focusModeToggleBtn.textContent = state.focusMode ? "On" : "Off";
    }
    if (els.focusModeBtn) {
      els.focusModeBtn.textContent = state.focusMode ? "Focus on" : "Focus mode";
    }
    showToast(state.focusMode ? "Focus mode enabled" : "Focus mode disabled");
  }

  function togglePrivacyBlur() {
    state.privacyBlur = !state.privacyBlur;
    els.body.classList.toggle("privacy-blur", state.privacyBlur);
    if (els.privacyToggleBtn) {
      els.privacyToggleBtn.classList.toggle("is-on", state.privacyBlur);
      els.privacyToggleBtn.textContent = state.privacyBlur ? "On" : "Off";
    }
    showToast(state.privacyBlur ? "Privacy blur enabled" : "Privacy blur disabled");
  }

  function syncModesFromMobile() {
    if (els.assistantMode && els.mobileMode) {
      els.assistantMode.value = els.mobileMode.value;
    }
  }

  function syncModesFromDesktop() {
    if (els.assistantMode && els.mobileMode) {
      els.mobileMode.value = els.assistantMode.value;
    }
  }

  function syncPersonasFromMobile() {
    if (els.assistantPersona && els.mobilePersona) {
      els.assistantPersona.value = els.mobilePersona.value;
    }
  }

  function syncPersonasFromDesktop() {
    if (els.assistantPersona && els.mobilePersona) {
      els.mobilePersona.value = els.assistantPersona.value;
    }
  }

  function saveSettings() {
    state.theme = els.themeSelect.value;
    state.density = els.densitySelect.value;
    state.language = els.languageSelect.value;

    localStorage.setItem("ic_theme", state.theme);
    localStorage.setItem("ic_density", state.density);
    localStorage.setItem("ic_language", state.language);

    applyTheme();
    applyDensity();

    closeDrawer("settings");
    showToast("Settings saved");
  }

  function hydratePreferences() {
    if (els.themeSelect) els.themeSelect.value = state.theme;
    if (els.densitySelect) els.densitySelect.value = state.density;
    if (els.languageSelect) els.languageSelect.value = state.language;

    if (els.mobileMode && els.assistantMode) {
      els.mobileMode.value = els.assistantMode.value;
    }

    if (els.mobilePersona && els.assistantPersona) {
      els.mobilePersona.value = els.assistantPersona.value;
    }

    if (els.focusModeToggleBtn) {
      els.focusModeToggleBtn.textContent = "Off";
    }

    if (els.privacyToggleBtn) {
      els.privacyToggleBtn.textContent = "Off";
    }
  }

  function applyTheme() {
    els.body.classList.toggle("light-theme", state.theme === "light");
  }

  function applyDensity() {
    els.body.classList.toggle("compact-density", state.density === "compact");
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2200);
  }

  function scrollMessagesToBottom() {
    requestAnimationFrame(() => {
      els.messages.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }

  init();
})();
