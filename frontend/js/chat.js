function initChat() {
  const sendBtn = document.getElementById("send-btn");
  const input = document.getElementById("chat-input");

  if (!sendBtn || !input) return;

  sendBtn.onclick = sendMessage;

  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

window.initChat = initChat;

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const messages = document.getElementById("messages");
  const welcome = document.getElementById("welcome-panel");

  if (!input || !messages) return;

  const message = input.value.trim();
  if (!message) return;

  if (welcome) {
    welcome.remove();
  }

  appendMessage("user", message);
  input.value = "";

  const res = await fetch(API + "/chat/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      message: message,
      conversation_id: window.conversationId || null
    })
  });

  if (!res.ok || !res.body) {
    appendMessage("assistant", "Sorry, something went wrong.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let assistantMessage = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    assistantMessage += chunk;
    updateAssistantMessage(assistantMessage);
  }

  if (typeof loadConversations === "function") {
    loadConversations();
  }
}

function appendMessage(role, text) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const msg = document.createElement("div");
  msg.className = "message " + role;
  msg.innerText = text;

  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

window.appendMessage = appendMessage;

function updateAssistantMessage(text) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  let last = messages.querySelector(".message.assistant:last-child");

  if (!last) {
    last = document.createElement("div");
    last.className = "message assistant";
    messages.appendChild(last);
  }

  last.innerText = text;
  messages.scrollTop = messages.scrollHeight;
}

function fillPrompt(text) {
  const input = document.getElementById("chat-input");
  if (!input) return;

  input.value = text;
  input.focus();
}

window.fillPrompt = fillPrompt;
