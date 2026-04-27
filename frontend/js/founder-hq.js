async function guardFounderPage() {
  try {
    const response = await fetch("/founder/health", {
      method: "GET",
      credentials: "include",
    });

    if (response.status === 403 || response.status === 401) {
      window.location.href = "/index.html";
      return false;
    }

    if (!response.ok) {
      window.location.href = "/index.html";
      return false;
    }

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

const MODE_META = {
  strategy: {
    title: "Strategy Advisor",
    description: "Ask for help deciding what IndiCare should focus on next.",
  },
  growth: {
    title: "Growth & Sales",
    description: "Create outreach, lead plans, sales scripts and demo strategies.",
  },
  funding: {
    title: "Funding",
    description: "Write grant answers, impact wording and funding narratives.",
  },
  finance: {
    title: "Finance",
    description: "Work through pricing, costs, forecasts and financial decisions.",
  },
  operations: {
    title: "Operations",
    description: "Plan systems, workload, delivery and company processes.",
  },
  product: {
    title: "Product & UX",
    description: "Improve IndiCare workflows, user experience and product priorities.",
  },
};

let currentMode = "strategy";
let currentThreadId = null;

const modeButtons = document.querySelectorAll("[data-founder-mode]");
const quickPromptButtons = document.querySelectorAll("[data-founder-prompt]");
const modeTitle = document.getElementById("founderModeTitle");
const modeDescription = document.getElementById("founderModeDescription");
const form = document.getElementById("founderAiForm");
const messageInput = document.getElementById("founderAiMessage");
const output = document.getElementById("founderChatOutput");
const clearBtn = document.getElementById("founderClearBtn");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function addMessage(role, content) {
  if (!output) return;

  const isUser = role === "user";
  const label = isUser ? "You" : "Founder AI";
  const className = isUser ? "founder-message-user" : "founder-message-assistant";

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

async function askFounderAi(message) {
  addMessage("user", message);
  setLoading(true);

  try {
    const response = await fetch("/founder/ai/chat", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: currentMode,
        message,
        thread_id: currentThreadId,
      }),
    });

    if (response.status === 403) {
      addMessage("assistant", "Founder HQ is restricted to founder users only.");
      return;
    }

    if (!response.ok) {
      addMessage("assistant", "Founder AI could not respond. Please try again.");
      return;
    }

    const data = await response.json();
    currentThreadId = data.thread_id || currentThreadId;
    addMessage("assistant", data.response || "No response returned.");
  } catch (error) {
    addMessage("assistant", "Founder AI connection failed.");
  } finally {
    setLoading(false);
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.founderMode || "strategy");
  });
});

quickPromptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.founderPrompt || "";
    if (messageInput) {
      messageInput.value = prompt;
      messageInput.focus();
    }
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput?.value.trim() || "";
  if (!message) {
    addMessage("assistant", "Type a question for your Founder AI first.");
    return;
  }

  if (messageInput) messageInput.value = "";
  await askFounderAi(message);
});

clearBtn?.addEventListener("click", () => {
  currentThreadId = null;

  if (output) {
    output.innerHTML = `
      <div class="founder-message founder-message-assistant">
        <strong>Founder AI</strong>
        <p>New founder thread started. What should we work on?</p>
      </div>
    `;
  }

  if (messageInput) {
    messageInput.value = "";
    messageInput.focus();
  }
});

setMode("strategy");
