const list=document.getElementById("conversation-list")

function loadConversations(){

const conversations=
JSON.parse(localStorage.getItem("indicare_conversations") || "[]")

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

loadConversations()
