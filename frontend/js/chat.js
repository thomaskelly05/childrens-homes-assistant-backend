function initChat() {
  const sendBtn = document.getElementById("send-btn");
  const input = document.getElementById("chat-input");

  if (!sendBtn || !input) return;

  sendBtn.onclick = sendMessage;

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
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

function createMessageElement(role, text = "") {
  const wrapper = document.createElement("div");
  wrapper.className = `message-wrapper ${role}`;

  const msg = document.createElement("div");
  msg.className = `message ${role}`;

  wrapper._messageEl = msg;
  wrapper._rawText = text;

  if (role === "assistant") {
    msg.innerHTML = renderMarkdown(text);

    const actions = document.createElement("div");
    actions.className = "message-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(wrapper._rawText || "");
        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });

    wrapper._copyBtn = copyBtn;

    actions.appendChild(copyBtn);
    wrapper.appendChild(msg);
    wrapper.appendChild(actions);
  } else {
    msg.innerText = text;
    wrapper.appendChild(msg);
  }

  return wrapper;
}

function appendMessage(role, text) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const messageEl = createMessageElement(role, text);
  messages.appendChild(messageEl);
  messages.scrollTop = messages.scrollHeight;
}

window.appendMessage = appendMessage;

function updateAssistantMessage(text) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  let lastWrapper = messages.querySelector(".message-wrapper.assistant:last-child");

  if (!lastWrapper) {
    lastWrapper = createMessageElement("assistant", text);
    messages.appendChild(lastWrapper);
  } else {
    const msg = lastWrapper._messageEl || lastWrapper.querySelector(".message.assistant");
    if (msg) {
      msg.innerHTML = renderMarkdown(text);
    }
    lastWrapper._rawText = text;
  }

  messages.scrollTop = messages.scrollHeight;
}

function renderMarkdown(text) {
  if (window.marked) {
    return window.marked.parse(text);
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function fillPrompt(text) {
  const input = document.getElementById("chat-input");
  if (!input) return;

  input.value = text;
  input.focus();
}

window.fillPrompt = fillPrompt;
