document.addEventListener("DOMContentLoaded", () => {

let sessionId = localStorage.getItem("session_id");

if(!sessionId){

sessionId = crypto.randomUUID();
localStorage.setItem("session_id", sessionId);

}

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");

if(!chatMessages || !chatInput || !sendButton) return;


function addMessage(role,text){

const div=document.createElement("div");

div.className="message "+role;

div.innerHTML=text;

chatMessages.appendChild(div);

chatMessages.scrollTop=chatMessages.scrollHeight;

return div;

}


async function sendChat(){

const message = chatInput.value.trim();

if(!message) return;

chatInput.value="";

addMessage("user",message);

const assistantDiv = addMessage("assistant","");

const response = await fetch(API + "/chat",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
message:message,
session_id:sessionId
})

});

const reader=response.body.getReader();

const decoder=new TextDecoder();

let text="";

while(true){

const {done,value}=await reader.read();

if(done) break;

text+=decoder.decode(value);

assistantDiv.innerHTML=text;

chatMessages.scrollTop=chatMessages.scrollHeight;

}

}

sendButton.onclick=sendChat;

chatInput.addEventListener("keypress",e=>{

if(e.key==="Enter") sendChat();

});

});
