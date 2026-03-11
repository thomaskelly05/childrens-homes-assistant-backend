let conversationId = null

function initChat(){

const sendBtn = document.getElementById("send-btn")
const input = document.getElementById("chat-input")

if(sendBtn){
sendBtn.onclick = sendMessage
}

if(input){

input.addEventListener("keypress",function(e){

if(e.key === "Enter"){
sendMessage()
}

})

}

}

function fillPrompt(text){

const input = document.getElementById("chat-input")

if(input){
input.value = text
input.focus()
}

}

window.fillPrompt = fillPrompt

async function sendMessage(){

const input = document.getElementById("chat-input")
const messages = document.getElementById("messages")
const welcome = document.getElementById("welcome-panel")

const message = input.value.trim()

if(!message) return

if(welcome){
welcome.remove()
}

appendMessage("user",message)

input.value = ""

const res = await fetch(API + "/chat/",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

credentials:"include",

body:JSON.stringify({
message:message,
conversation_id:conversationId
})

})

const reader = res.body.getReader()
const decoder = new TextDecoder()

let assistantMessage = ""

while(true){

const {done,value} = await reader.read()

if(done) break

const chunk = decoder.decode(value)

assistantMessage += chunk

updateAssistantMessage(assistantMessage)

}

}

function appendMessage(role,text){

const messages = document.getElementById("messages")

const msg = document.createElement("div")

msg.className = "message " + role

msg.innerText = text

messages.appendChild(msg)

messages.scrollTop = messages.scrollHeight

}

function updateAssistantMessage(text){

const messages = document.getElementById("messages")

let last = messages.querySelector(".message.assistant:last-child")

if(!last){

last = document.createElement("div")
last.className = "message assistant"
messages.appendChild(last)

}

last.innerText = text

messages.scrollTop = messages.scrollHeight

}
