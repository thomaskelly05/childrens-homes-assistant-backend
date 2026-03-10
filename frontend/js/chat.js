import { sendMessage } from "./api.js"

let sessionId = localStorage.getItem("session_id")

if(!sessionId){

sessionId = crypto.randomUUID()
localStorage.setItem("session_id", sessionId)

}

const chatMessages = document.getElementById("chat-messages")
const chatInput = document.getElementById("chat-input")
const sendButton = document.getElementById("send-button")

let firstMessageSent = false


function createTitleFromMessage(text){

let title = text.trim()

if(title.length > 40){
title = title.substring(0,40) + "..."
}

return title

}


function saveConversationTitle(title){

let conversations =
JSON.parse(localStorage.getItem("indicare_conversations") || "[]")

const exists = conversations.find(c => c.id === sessionId)

if(!exists){

conversations.unshift({
id: sessionId,
title: title,
date: new Date().toISOString()
})

localStorage.setItem(
"indicare_conversations",
JSON.stringify(conversations)
)

}

}


function addMessage(role,text){

const div=document.createElement("div")

div.className="message " + role

div.innerHTML=text

chatMessages.appendChild(div)

chatMessages.scrollTop=chatMessages.scrollHeight

}


async function sendChat(){

const message = chatInput.value.trim()

if(!message) return

chatInput.value=""

addMessage("user",message)


if(!firstMessageSent){

const title=createTitleFromMessage(message)

saveConversationTitle(title)

firstMessageSent=true

}


const assistantDiv=document.createElement("div")

assistantDiv.className="message assistant"

chatMessages.appendChild(assistantDiv)


const stream=await sendMessage(message,sessionId)

const reader=stream.getReader()
const decoder=new TextDecoder()

let text=""

while(true){

const {done,value}=await reader.read()

if(done) break

text+=decoder.decode(value)

assistantDiv.innerHTML=text

chatMessages.scrollTop=chatMessages.scrollHeight

}

}


sendButton.onclick=sendChat

chatInput.addEventListener("keypress",e=>{

if(e.key==="Enter"){
sendChat()
}

})
