const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

if(sendBtn){
sendBtn.onclick = sendMessageHandler;
}

if(inputEl){
inputEl.addEventListener("keypress",function(e){
if(e.key === "Enter"){
sendMessageHandler();
}
});
}

async function sendMessageHandler(){

const message = inputEl.value.trim();

if(!message) return;

appendMessage("user", message);

inputEl.value = "";

const assistantMessage = appendMessage("assistant","...");

const response = await sendMessage(message,null);

if(!response.body){
assistantMessage.innerText = "No response from server";
return;
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

let fullText = "";

while(true){

const {done,value} = await reader.read();

if(done) break;

const chunk = decoder.decode(value);

fullText += chunk;

assistantMessage.innerText = fullText;

messagesEl.scrollTop = messagesEl.scrollHeight;

}

}

function appendMessage(role,text){

const msg = document.createElement("div");

msg.className = "message " + role;

msg.innerText = text;

messagesEl.appendChild(msg);

messagesEl.scrollTop = messagesEl.scrollHeight;

return msg;

}
