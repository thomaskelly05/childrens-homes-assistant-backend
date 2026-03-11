async function loadConversations(){

const list = document.getElementById("conversation-list")

if(!list) return

const res = await fetch(API + "/chat/conversations",{
credentials:"include"
})

const data = await res.json()

list.innerHTML = ""

data.forEach(c => {

const item = document.createElement("div")

item.className = "conversation-item"

item.innerText = c.title

item.onclick = () => openConversation(c.id)

list.appendChild(item)

})

}

async function openConversation(id){

conversationId = id

const res = await fetch(API + "/chat/conversations/" + id,{
credentials:"include"
})

const data = await res.json()

const messages = document.getElementById("messages")

messages.innerHTML = ""

data.forEach(m => {

appendMessage(m.role,m.message)

})

}

function createConversation(){

conversationId = null

const messages = document.getElementById("messages")

messages.innerHTML = ""

}
