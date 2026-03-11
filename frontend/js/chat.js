const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

if (sendBtn) {
sendBtn.onclick = sendMessage;
}

if (inputEl) {
inputEl.addEventListener("keypress", function (e) {
if (e.key === "Enter") {
sendMessage();
}
});
}

async function sendMessage() {

const message = inputEl.value.trim();

if (!message) return;

appendMessage("user", message);

inputEl.value = "";

const assistantMessageEl = appendMessage("assistant", "...");

const response = await fetch(API + "/chat/", {
method: "POST",
headers: {
"Content-Type": "application/json"
},
credentials: "include",
body: JSON.stringify({
message: message
})
});

if (!response.body) {
assistantMessageEl.innerText = "No response from server";
return;
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

let fullText = "";

while (true) {

const { done, value } = await reader.read();

if (done) break;

const chunk = decoder.decode(value);

fullText += chunk;

assistantMessageEl.innerText = fullText;

messagesEl.scrollTop = messagesEl.scrollHeight;

}

}

function appendMessage(role, text) {

if (!messagesEl) return null;

const msg = document.createElement("div");

msg.className = "message " + role;

msg.innerText = text;

messagesEl.appendChild(msg);

messagesEl.scrollTop = messagesEl.scrollHeight;

return msg;

}
