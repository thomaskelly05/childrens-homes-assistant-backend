import { FounderAPI } from "./services/founder-api.js";

// ============================================================
// ACCESS GUARD
// ============================================================

async function guardFounderPage() {
  try {
    await FounderAPI.health();
    return true;
  } catch (error) {
    window.location.href = "/index.html";
    return false;
  }
}

const founderAccessAllowed = await guardFounderPage();

if (!founderAccessAllowed) {
  throw new Error("Founder access denied");
}

// ============================================================
// MODE META
// ============================================================

const MODE_META = {
  strategy: {
    title: "Strategy Advisor",
    description: "Decide what IndiCare should focus on next.",
  },
  growth: {
    title: "Growth & Sales",
    description: "Get leads, outreach, demos and conversions.",
  },
  funding: {
    title: "Funding",
    description: "Grants, impact and funding narratives.",
  },
  finance: {
    title: "Finance",
    description: "Pricing, revenue and sustainability.",
  },
  operations: {
    title: "Operations",
    description: "Execution, systems and priorities.",
  },
  product: {
    title: "Product & UX",
    description: "Build what sells and works in homes.",
  },
};

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
const founderMain = document.querySelector(".founder-main");

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseList(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return String(value);
  }
}

function addMessage(role, content) {
  if (!output) return;

  const isUser = role === "user";
  const label = isUser ? "You" : "Founder AI";
  const className = isUser
    ? "founder-message-user"
    : "founder-message-assistant";

  const wrapper = document.createElement("div");
  wrapper.className = `founder-message ${className}`;
  wrapper.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    <p>${escapeHtml(content)}</p>
  `;

  output.appendChild(wrapper);
  output.scrollTop = output.scrollHeight;
}

function setLoading(isLoading) {
  const submit = form?.querySelector('button[type="submit"]');

  if (submit) {
    submit.disabled = isLoading;
    submit.textContent = isLoading ? "Thinking..." : "Ask Founder AI";
  }

  quickActionButtons.forEach((button) => {
    button.disabled = isLoading;
  });
}

function setMode(mode) {
  currentMode = MODE_META[mode] ? mode : "strategy";

  modeButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.founderMode === currentMode
    );
  });

  const meta = MODE_META[currentMode];

  if (modeTitle) modeTitle.textContent = meta.title;
  if (modeDescription) modeDescription.textContent = meta.description;
}

// ============================================================
// DASHBOARD WIDGETS
// ============================================================

function ensureDashboardWidgets() {
  if (document.getElementById("founderDashboardWidgets")) return;

  const quickCard = document.querySelector(".founder-quick-actions")?.closest(".founder-card");
  const chatCard = document.querySelector(".founder-chat-card");

  const wrapper = document.createElement("section");
  wrapper.id = "founderDashboardWidgets";
  wrapper.className = "founder-dashboard-widgets";
  wrapper.innerHTML = `
    <div class="founder-card founder-widget-card">
      <h3>Founder Tasks</h3>
      <div id="founderTasksList" class="founder-widget-list">
        <p>Loading tasks...</p>
      </div>
    </div>

    <div class="founder-card founder-widget-card">
      <h3>Founder Leads</h3>
      <div id="founderLeadsList" class="founder-widget-list">
        <p>Loading leads...</p>
      </div>
    </div>

    <div class="founder-card founder-widget-card">
      <h3>Strategy Notes</h3>
      <div id="founderNotesList" class="founder-widget-list">
        <p>Loading notes...</p>
      </div>
    </div>
  `;

  if (quickCard && quickCard.parentNode) {
    quickCard.parentNode.insertBefore(wrapper, chatCard || quickCard.nextSibling);
  } else if (founderMain) {
    founderMain.appendChild(wrapper);
  }
}

function renderTasks(tasks) {
  const target = document.getElementById("founderTasksList");
  if (!target) return;

  const items = normaliseList(tasks);

  if (!items.length) {
    target.innerHTML = `<p>No founder tasks yet.</p>`;
    return;
  }

  target.innerHTML = items
    .slice(0, 8)
    .map((task) => {
      return `
        <article class="founder-widget-item">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${escapeHtml(task.priority || "medium")} · ${escapeHtml(task.status || "open")}</span>
          ${task.due_date ? `<small>Due: ${escapeHtml(formatDate(task.due_date))}</small>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderLeads(leads) {
  const target = document.getElementById("founderLeadsList");
  if (!target) return;

  const items = normaliseList(leads);

  if (!items.length) {
    target.innerHTML = `<p>No founder leads yet.</p>`;
    return;
  }

  target.innerHTML = items
    .slice(0, 8)
    .map((lead) => {
      return `
        <article class="founder-widget-item">
          <strong>${escapeHtml(lead.organisation_name)}</strong>
          <span>${escapeHtml(lead.contact_name || "No contact")} · ${escapeHtml(lead.status || "new")}</span>
          ${lead.contact_role ? `<small>${escapeHtml(lead.contact_role)}</small>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderNotes(notes) {
  const target = document.getElementById("founderNotesList");
  if (!target) return;

  const items = normaliseList(notes);

  if (!items.length) {
    target.innerHTML = `<p>No strategy notes yet.</p>`;
    return;
  }

  target.innerHTML = items
    .slice(0, 6)
    .map((note) => {
      return `
        <article class="founder-widget-item">
          <strong>${escapeHtml(note.title)}</strong>
          <span>${escapeHtml(formatDate(note.updated_at || note.created_at))}</span>
          <small>${escapeHtml(String(note.content || "").slice(0, 120))}</small>
        </article>
      `;
    })
    .join("");
}

async function loadFounderDataWidgets() {
  ensureDashboardWidgets();

  try {
    const [tasksData, leadsData, notesData] = await Promise.all([
      FounderAPI.getTasks(),
      FounderAPI.getLeads(),
      FounderAPI.getStrategyNotes(),
    ]);

    renderTasks(tasksData.tasks);
    renderLeads(leadsData.leads);
    renderNotes(notesData.notes);
  } catch (error) {
    renderTasks([]);
    renderLeads([]);
    renderNotes([]);
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
    addMessage("assistant", data.response || "No response returned.");
  } catch (error) {
    if (error.message === "FORBIDDEN") {
      addMessage("assistant", "Founder HQ is restricted.");
      return;
    }

    if (error.message === "UNAUTHENTICATED") {
      addMessage("assistant", "You need to sign in again.");
      return;
    }

    addMessage("assistant", "Founder AI failed to respond.");
  } finally {
    setLoading(false);
  }
}

// ============================================================
// QUICK ACTIONS
// ============================================================

async function runQuickAction(action) {
  if (!action) return;

  addMessage("user", `Run quick action: ${action.replaceAll("_", " ")}`);
  setLoading(true);

  try {
    const data = await FounderAPI.quickAction(action);
    addMessage("assistant", data.response || "No response.");
  } catch (error) {
    if (error.message === "FORBIDDEN") {
      addMessage("assistant", "Founder HQ is restricted.");
      return;
    }

    addMessage("assistant", "Quick action failed.");
  } finally {
    setLoading(false);
  }
}

// ============================================================
// DASHBOARD BRAIN
// ============================================================

async function loadFounderDashboardBrain() {
  if (dashboardLoaded) return;
  dashboardLoaded = true;

  addMessage("assistant", "Loading Founder Dashboard Brain...");

  try {
    const data = await FounderAPI.getSummary();

    if (data?.summary) {
      addMessage("assistant", data.summary);

      if (data.widgets) {
        renderTasks(data.widgets.tasks || data.widgets.priorities || []);
        renderLeads(data.widgets.leads || []);
        renderNotes(data.widgets.strategy_notes || []);
      }

      return;
    }

    addMessage("assistant", "Founder Dashboard Brain is ready, but no summary was returned.");
  } catch (error) {
    addMessage(
      "assistant",
      "Founder Dashboard Brain is ready, but I could not load today’s summary."
    );
  }
}

// ============================================================
// EVENTS
// ============================================================

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.founderMode);
  });
});

quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.founderAction;
    runQuickAction(action);
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput?.value.trim();

  if (!message) {
    addMessage("assistant", "Type a question first.");
    return;
  }

  messageInput.value = "";
  await askFounderAi(message);
});

clearBtn?.addEventListener("click", () => {
  currentThreadId = null;

  if (output) {
    output.innerHTML = `
      <div class="founder-message founder-message-assistant">
        <strong>Founder AI</strong>
        <p>New thread started. What should we work on?</p>
      </div>
    `;
  }

  if (messageInput) {
    messageInput.value = "";
    messageInput.focus();
  }
});

// ============================================================
// INIT
// ============================================================

setMode("strategy");
ensureDashboardWidgets();
loadFounderDataWidgets();
loadFounderDashboardBrain();