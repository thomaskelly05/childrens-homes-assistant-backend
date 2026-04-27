import { FounderAPI } from "./services/founder-api.js";

// ============================================================
// ACCESS GUARD
// ============================================================

async function guardFounderPage() {
  try {
    await FounderAPI.health();
    return true;
  } catch {
    window.location.href = "/index.html";
    return false;
  }
}

const founderAccessAllowed = await guardFounderPage();
if (!founderAccessAllowed) throw new Error("Founder access denied");

// ============================================================
// STATE
// ============================================================

let currentMode = "strategy";
let currentThreadId = null;
let dashboardLoaded = false;

// ============================================================
// ELEMENTS
// ============================================================

const modeButtons = document.querySelectorAll("[data-founder-mode]");
const quickActionButtons = document.querySelectorAll("[data-founder-action]");
const modeTitle = document.getElementById("founderModeTitle");
const modeDescription = document.getElementById("founderModeDescription");
const form = document.getElementById("founderAiForm");
const messageInput = document.getElementById("founderAiMessage");
const output = document.getElementById("founderChatOutput");
const clearBtn = document.getElementById("founderClearBtn");

// NEW FORM ELEMENTS
const taskForm = document.getElementById("founderTaskForm");
const taskTitle = document.getElementById("founderTaskTitle");
const taskPriority = document.getElementById("founderTaskPriority");

const leadForm = document.getElementById("founderLeadForm");
const leadOrg = document.getElementById("founderLeadOrg");
const leadContact = document.getElementById("founderLeadContact");
const leadEmail = document.getElementById("founderLeadEmail");

const noteForm = document.getElementById("founderNoteForm");
const noteTitle = document.getElementById("founderNoteTitle");
const noteContent = document.getElementById("founderNoteContent");

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `founder-message ${
    role === "user" ? "founder-message-user" : "founder-message-assistant"
  }`;

  wrapper.innerHTML = `
    <strong>${role === "user" ? "You" : "Founder AI"}</strong>
    <p>${escapeHtml(content)}</p>
  `;

  output.appendChild(wrapper);
  output.scrollTop = output.scrollHeight;
}

function setLoading(isLoading) {
  const submit = form?.querySelector('button[type="submit"]');
  if (submit) submit.disabled = isLoading;

  quickActionButtons.forEach((btn) => (btn.disabled = isLoading));
}

// ============================================================
// MODE
// ============================================================

const MODE_META = {
  strategy: { title: "Strategy Advisor", description: "Focus direction" },
  growth: { title: "Growth & Sales", description: "Leads & demos" },
  funding: { title: "Funding", description: "Grants & impact" },
  finance: { title: "Finance", description: "Pricing & revenue" },
  operations: { title: "Operations", description: "Execution & systems" },
  product: { title: "Product & UX", description: "Build what sells" },
};

function setMode(mode) {
  currentMode = MODE_META[mode] ? mode : "strategy";

  modeButtons.forEach((b) =>
    b.classList.toggle("is-active", b.dataset.founderMode === currentMode)
  );

  modeTitle.textContent = MODE_META[currentMode].title;
  modeDescription.textContent = MODE_META[currentMode].description;
}

// ============================================================
// DASHBOARD DATA
// ============================================================

async function refreshDashboard() {
  try {
    const [tasks, leads, notes] = await Promise.all([
      FounderAPI.getTasks(),
      FounderAPI.getLeads(),
      FounderAPI.getStrategyNotes(),
    ]);

    console.log("Dashboard refreshed", { tasks, leads, notes });
  } catch {
    console.warn("Dashboard refresh failed");
  }
}

// ============================================================
// AI CHAT
// ============================================================

async function askFounderAi(message) {
  addMessage("user", message);
  setLoading(true);

  try {
    const data = await FounderAPI.chat({
      message,
      mode: currentMode,
      thread_id: currentThreadId,
    });

    currentThreadId = data.thread_id || currentThreadId;
    addMessage("assistant", data.response);
  } catch {
    addMessage("assistant", "AI failed.");
  } finally {
    setLoading(false);
  }
}

// ============================================================
// QUICK ACTIONS
// ============================================================

async function runQuickAction(action) {
  addMessage("assistant", "Running...");

  try {
    const data = await FounderAPI.quickAction(action);
    addMessage("assistant", data.response);
  } catch {
    addMessage("assistant", "Failed.");
  }
}

// ============================================================
// FORM HANDLERS
// ============================================================

taskForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = taskTitle.value.trim();
  if (!title) return;

  await FounderAPI.createTask({
    title,
    priority: taskPriority.value,
  });

  taskTitle.value = "";
  await refreshDashboard();
  addMessage("assistant", "Task saved.");
});

leadForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const org = leadOrg.value.trim();
  if (!org) return;

  await FounderAPI.createLead({
    organisation_name: org,
    contact_name: leadContact.value,
    email: leadEmail.value,
  });

  leadOrg.value = "";
  leadContact.value = "";
  leadEmail.value = "";

  await refreshDashboard();
  addMessage("assistant", "Lead saved.");
});

noteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  if (!title || !content) return;

  await FounderAPI.createStrategyNote({
    title,
    content,
  });

  noteTitle.value = "";
  noteContent.value = "";

  await refreshDashboard();
  addMessage("assistant", "Strategy note saved.");
});

// ============================================================
// EVENTS
// ============================================================

modeButtons.forEach((b) =>
  b.addEventListener("click", () => setMode(b.dataset.founderMode))
);

quickActionButtons.forEach((b) =>
  b.addEventListener("click", () =>
    runQuickAction(b.dataset.founderAction)
  )
);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  messageInput.value = "";
  await askFounderAi(message);
});

clearBtn?.addEventListener("click", () => {
  currentThreadId = null;
  output.innerHTML = "";
});

// ============================================================
// INIT
// ============================================================

setMode("strategy");
refreshDashboard();