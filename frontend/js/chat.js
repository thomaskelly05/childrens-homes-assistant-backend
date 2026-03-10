import { sendMessage, captureReflection } from "./api.js";

let sessionId = localStorage.getItem("session_id");

if (!sessionId) {

  sessionId = crypto.randomUUID();
  localStorage.setItem("session_id", sessionId);

}

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const captureButton = document.getElementById("capture-reflection");


function addMessage(role, text) {

  const div = document.createElement("div");

  div.className = `message ${role}`;

  div.innerText = text;

  chatMessages.appendChild(div);

  chatMessages.scrollTop = chatMessages.scrollHeight;

  return div;

}


async function sendChat() {

  const message = chatInput.value.trim();

  if (!message) return;

  addMessage("user", message);

  chatInput.value = "";

  const assistantDiv = addMessage("assistant", "");

  const stream = await sendMessage(message, sessionId);

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let text = "";

  while (true) {

    const { done, value } = await reader.read();

    if (done) break;

    text += decoder.decode(value);

    assistantDiv.innerText = text;

  }

}


sendButton.onclick = sendChat;

chatInput.addEventListener("keypress", e => {

  if (e.key === "Enter") {
    sendChat();
  }

});


captureButton.onclick = async () => {

  await captureReflection(sessionId);

  alert("Reflection saved for supervision.");

};
