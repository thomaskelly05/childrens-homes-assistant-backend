const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

async function sendMessage(){

const message = inputEl.value.trim();

if(!message) return;

appendMessage("user", message);

inputEl.value="";

const response = await fetch(API + "/chat/", {
method:"POST",
headers:{
"Content-Type":"application/json"
},
credentials:"include",
body:JSON.stringify({
message:message
})
});

const data = await response.json();

appendMessage("assistant", data.reply || data.message || "No response");

}

function appendMessage(role,text){

const msg = document.createElement("div");

msg.className = "message " + role;

msg.innerText = text;

messagesEl.appendChild(msg);

messagesEl.scrollTop = messagesEl.scrollHeight;

}

sendBtn.onclick = sendMessage;

inputEl.addEventListener("keypress",function(e){

if(e.key==="Enter"){
sendMessage();
}

});
