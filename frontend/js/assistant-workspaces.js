/* IndiCare Assistant workspaces.
   Local-first project/workspace layer for the standalone assistant. This keeps the
   UI ChatGPT-simple while adding children’s residential operational context. */

(function () {
  const WORKSPACES_KEY = "indicare_assistant_workspaces";
  const ACTIVE_WORKSPACE_KEY = "indicare_assistant_active_workspace";
  const CONVERSATIONS_KEY = "indicare_standalone_assistant_conversations";
  const ACTIVE_CONVERSATION_KEY = "indicare_standalone_assistant_active";

  const DEFAULT_WORKSPACES = [
    {
      id: "workspace-ofsted",
      name: "Ofsted Inspection",
      description: "Inspection preparation, evidence quality, impact, leadership oversight and improvement planning.",
      mode: "ofsted",
      promptPrefix: "Workspace context: Ofsted Inspection. Focus on evidence, impact, leadership oversight, safeguarding culture, Quality Standards, inspection questions and improvement actions.",
    },
    {
      id: "workspace-reg45",
      name: "Regulation 45",
      description: "Quality of care reviews, evidence summaries, impact analysis and improvement actions.",
      mode: "ofsted",
      promptPrefix: "Workspace context: Regulation 45. Focus on quality of care, safeguarding, leadership oversight, evidence of impact, shortfalls, consultation themes and improvement planning.",
    },
    {
      id: "workspace-safeguarding",
      name: "Safeguarding",
      description: "Safeguarding concerns, thresholds, professional curiosity, missing information and review actions.",
      mode: "safeguarding",
      promptPrefix: "Workspace context: Safeguarding. Focus on immediate safety, professional curiosity, risk indicators, notifications, missing evidence, DSL/manager review and proportionate next steps.",
    },
    {
      id: "workspace-missing",
      name: "Missing From Care",
      description: "Missing episodes, return planning, chronologies, patterns, triggers and safeguarding reviews.",
      mode: "safeguarding",
      promptPrefix: "Workspace context: Missing from care. Focus on chronology, search actions, notifications, return details, risks, patterns, triggers, missing information and management oversight.",
    },
    {
      id: "workspace-policies",
      name: "Policies & Procedures",
      description: "Policy summaries, staff guidance, compliance gaps and operational implications.",
      mode: "practice",
      promptPrefix: "Workspace context: Policies and procedures. Focus on plain-English summaries, practice implications, responsibilities, training points, compliance gaps and inspection relevance.",
    },
    {
      id: "workspace-behaviour",
      name: "Behaviour Support",
      description: "Behaviour analysis, relational practice, trauma-informed thinking and support planning.",
      mode: "practice",
      promptPrefix: "Workspace context: Behaviour support. Focus on unmet need, relational practice, trauma-informed analysis, triggers, protective factors, co-regulation and support planning.",
    },
    {
      id: "workspace-team",
      name: "Team Development",
      description: "Supervision, reflective practice, team learning, recording quality and staff development.",
      mode: "records",
      promptPrefix: "Workspace context: Team development. Focus on supervision, reflective practice, learning, recording quality, staff development, debriefs and practice improvement.",
    },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "");
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function showToast(text) {
    const existing = document.querySelector(".ic-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "ic-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normaliseWorkspace(workspace) {
    return {
      id: workspace.id || `workspace-${Date.now()}`,
      name: workspace.name || "Workspace",
      description: workspace.description || "Assistant workspace.",
      mode: workspace.mode || "ofsted",
      promptPrefix: workspace.promptPrefix || `Workspace context: ${workspace.name || "Workspace"}.`,
      documents: Array.isArray(workspace.documents) ? workspace.documents : [],
      pinned: Array.isArray(workspace.pinned) ? workspace.pinned : [],
      savedPrompts: Array.isArray(workspace.savedPrompts) ? workspace.savedPrompts : [],
      createdAt: workspace.createdAt || nowIso(),
      updatedAt: workspace.updatedAt || nowIso(),
    };
  }

  function loadWorkspaces() {
    const stored = readJson(WORKSPACES_KEY, null);
    if (Array.isArray(stored) && stored.length) return stored.map(normaliseWorkspace);
    const defaults = DEFAULT_WORKSPACES.map((workspace) => normaliseWorkspace(workspace));
    writeJson(WORKSPACES_KEY, defaults);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, defaults[0].id);
    return defaults;
  }

  function saveWorkspaces(workspaces) {
    writeJson(WORKSPACES_KEY, workspaces.map(normaliseWorkspace));
  }

  function activeWorkspace(workspaces) {
    const activeId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    return workspaces.find((workspace) => workspace.id === activeId) || workspaces[0];
  }

  function allConversations() {
    const items = readJson(CONVERSATIONS_KEY, []);
    return Array.isArray(items) ? items : [];
  }

  function saveConversations(items) {
    writeJson(CONVERSATIONS_KEY, items);
  }

  function attachCurrentConversationToWorkspace(workspaceId) {
    const activeConversationId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
    if (!activeConversationId || !workspaceId) return;
    const conversations = allConversations();
    const conversation = conversations.find((item) => item.id === activeConversationId);
    if (!conversation) return;
    conversation.workspaceId = conversation.workspaceId || workspaceId;
    conversation.updatedAt = nowIso();
    saveConversations(conversations);
  }

  function setWorkspace(workspaceId, options) {
    const opts = options || {};
    const workspaces = loadWorkspaces();
    const workspace = workspaces.find((item) => item.id === workspaceId) || workspaces[0];
    if (!workspace) return;

    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    localStorage.setItem("indicare_assistant_workspace_context", JSON.stringify({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      mode: workspace.mode,
      promptPrefix: workspace.promptPrefix,
    }));

    const select = $("workspaceSelect");
    if (select) select.value = workspace.id;
    if ($("workspacePill")) $("workspacePill").textContent = workspace.name;
    if ($("workspaceTitle")) $("workspaceTitle").textContent = workspace.description;
    if ($("workspaceDescription")) $("workspaceDescription").textContent = `${workspace.description} This standalone assistant only uses what you provide in this workspace/chat.`;

    if (!opts.silent) showToast(`${workspace.name} workspace`);
    filterConversationHistory(workspace.id);

    const modeButton = document.querySelector(`[data-mode="${workspace.mode}"]`);
    if (modeButton && !opts.skipModeClick) modeButton.click();
  }

  function renderWorkspaceSelect() {
    const select = $("workspaceSelect");
    if (!select) return;
    const workspaces = loadWorkspaces();
    const active = activeWorkspace(workspaces);
    select.innerHTML = workspaces.map((workspace) => `<option value="${escapeHtml(workspace.id)}">${escapeHtml(workspace.name)}</option>`).join("");
    select.value = active.id;
    setWorkspace(active.id, { silent: true });
  }

  function filterConversationHistory(workspaceId) {
    const conversations = allConversations();
    const activeId = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
    const activeConversation = conversations.find((item) => item.id === activeId);
    if (activeConversation && !activeConversation.workspaceId) {
      activeConversation.workspaceId = workspaceId;
      saveConversations(conversations);
    }

    document.querySelectorAll("#history .item").forEach((item) => {
      const openButton = item.querySelector("[data-open-conversation]");
      const id = openButton?.getAttribute("data-open-conversation");
      const conversation = conversations.find((entry) => entry.id === id);
      const belongs = !conversation || !conversation.workspaceId || conversation.workspaceId === workspaceId;
      item.classList.toggle("ic-workspace-hidden-chat", !belongs);
    });
  }

  function createWorkspace() {
    const name = prompt("Workspace name", "New Workspace");
    if (!name || !name.trim()) return;
    const workspaces = loadWorkspaces();
    const id = `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const workspace = normaliseWorkspace({
      id,
      name: name.trim(),
      description: "Custom assistant workspace for documents, drafting and evidence.",
      mode: "ofsted",
      promptPrefix: `Workspace context: ${name.trim()}. Focus on the user's provided information, evidence, gaps, actions and professional residential care practice.`,
    });
    workspaces.push(workspace);
    saveWorkspaces(workspaces);
    renderWorkspaceSelect();
    setWorkspace(workspace.id);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function interceptPromptBeforeSend() {
    const send = $("send");
    const input = $("input");
    if (!send || !input) return;

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#send")) return;
      const workspace = activeWorkspace(loadWorkspaces());
      if (!workspace || !input.value.trim()) return;
      if (input.dataset.workspaceContextApplied === "true") return;
      input.value = `${workspace.promptPrefix}\n\n${input.value}`;
      input.dataset.workspaceContextApplied = "true";
      setTimeout(() => { input.dataset.workspaceContextApplied = "false"; }, 1200);
    }, true);
  }

  function watchHistoryChanges() {
    const history = $("history");
    if (!history) return;
    const observer = new MutationObserver(() => {
      const workspace = activeWorkspace(loadWorkspaces());
      if (workspace) filterConversationHistory(workspace.id);
    });
    observer.observe(history, { childList: true, subtree: true });
  }

  function bind() {
    $("workspaceSelect")?.addEventListener("change", (event) => setWorkspace(event.target.value));
    $("newWorkspace")?.addEventListener("click", createWorkspace);
    document.addEventListener("click", (event) => {
      if (event.target.closest("#newChat")) {
        const workspace = activeWorkspace(loadWorkspaces());
        setTimeout(() => attachCurrentConversationToWorkspace(workspace?.id), 80);
      }
    });
  }

  function init() {
    renderWorkspaceSelect();
    bind();
    watchHistoryChanges();
    interceptPromptBeforeSend();
    const workspace = activeWorkspace(loadWorkspaces());
    if (workspace) setTimeout(() => filterConversationHistory(workspace.id), 120);
  }

  window.IndiCareAssistantWorkspaces = {
    loadWorkspaces,
    activeWorkspace: () => activeWorkspace(loadWorkspaces()),
    setWorkspace,
  };

  window.addEventListener("DOMContentLoaded", init);
})();
