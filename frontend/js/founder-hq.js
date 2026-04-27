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

    addMessage("assistant", "Founder AI failed to respond.");
  } finally {
    setLoading(false);
  }
}

// ============================================================
// QUICK ACTIONS
// ============================================================

async function runQuickAction(action) {
  addMessage("assistant", "Running action...");

  try {
    const data = await FounderAPI.quickAction(action);
    addMessage("assistant", data.response || "No response.");
  } catch (error) {
    addMessage("assistant", "Quick action failed.");
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
});

// ============================================================
// INIT
// ============================================================

setMode("strategy");