const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const sidebarItems = document.querySelectorAll(".sidebar-item");
const supervisionPanel = document.getElementById("supervision-panel");
const modeIndicator = document.getElementById("mode-indicator");
const modeChips = document.querySelectorAll(".mode-chip");
const ldToggle = document.getElementById("ld-toggle");
const slowToggle = document.getElementById("slow-toggle");
const roleSelect = document.getElementById("role-select");

let currentMode = "reflective";
let isLdFriendly = false;
let isSlowMode = false;
let currentRole = "support";

sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {
    sidebarItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    currentMode = item.dataset.mode;
    updateModeIndicator();
    updateBodyMode();
    toggleSupervisionPanel();
  });
});

ldToggle.addEventListener("change", () => {
  isLdFriendly = ldToggle.checked;
});

slowToggle.addEventListener("change", () => {
  isSlowMode = slowToggle.checked;
});

roleSelect.addEventListener("change", () => {
  currentRole = roleSelect.value;
});

modeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const text = chip.textContent.trim();
    userInput.value = text;
    userInput.focus();
  });
});

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  streamAssistant(text);
}

function addMessage(text, role) {
  const msg = document.createElement("div");
  msg.className = `message ${role}`;
  msg.textContent = text;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateModeIndicator() {
  const label = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
  modeIndicator.textContent = `${label} mode`;
}

function updateBodyMode() {
  document.body.className = `mode-${currentMode}`;
}

function toggleSupervisionPanel() {
  if (currentMode === "supervision") {
    supervisionPanel.classList.add("active");
  } else {
    supervisionPanel.classList.remove("active");
  }
}

async function streamAssistant(text) {
  const payload = {
    message: text,
    mode: currentMode,
    ld_friendly: isLdFriendly,
    slow_mode: isSlowMode,
    role: currentRole,
  };

  let response;
  try {
    response = await fetch("/api/assistant/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    addMessage(
      "I’m having trouble reaching the server just now. If this keeps happening, let someone know.",
      "assistant"
    );
    return;
  }

  if (!response.ok || !response.body) {
    addMessage(
      "Something didn’t quite work there. You haven’t done anything wrong. You can try again in a moment.",
      "assistant"
    );
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let assistantMsg = document.createElement("div");
  assistantMsg.className = "message assistant";
  messagesEl.appendChild(assistantMsg);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    assistantMsg.textContent += chunk;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (isSlowMode) {
      await delay(40);
    }
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Initial welcome */
addMessage(
  "Good to see you. This space is here for your practice, not your performance. When you’re ready, tell me what’s on your mind.",
  "assistant"
);
