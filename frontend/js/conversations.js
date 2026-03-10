const list = document.getElementById("conversation-list")

let conversations =
JSON.parse(localStorage.getItem("indicare_conversations") || "[]")

function saveConversations(){

localStorage.setItem(
"indicare_conversations",
JSON.stringify(conversations)
)

}

function createConversation(title){

const id = crypto.randomUUID()

conversations.unshift({
id,
title,
date: new Date().toISOString()
})

saveConversations()

localStorage.setItem("session_id", id)

renderConversations()

location.reload()

}

function renderConversations(){

if(!list) return

list.innerHTML=""

conversations.forEach(conv=>{

const div=document.createElement("div")

div.className="conversation-item"

div.innerText=conv.title

div.onclick=()=>{

localStorage.setItem("session_id",conv.id)

location.reload()

}

list.appendChild(div)

})

}

window.createConversation=createConversation

renderConversations()
