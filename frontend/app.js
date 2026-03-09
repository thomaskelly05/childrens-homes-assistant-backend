const API="https://api.indicare.co.uk/api/assistant/stream"

const chat=document.getElementById("chat")
const input=document.getElementById("input")
const sendBtn=document.getElementById("sendBtn")
const historyPanel=document.getElementById("history")

let conversations=JSON.parse(localStorage.getItem("indicare_chats")||"[]")
let currentConversation=null


function renderHistory(){

historyPanel.innerHTML=""

conversations.forEach(c=>{

const item=document.createElement("div")

item.className="historyItem"

item.textContent=c.title||"New Chat"

item.onclick=()=>loadConversation(c)

historyPanel.appendChild(item)

})

}


function loadConversation(convo){

currentConversation=convo

chat.innerHTML=""

convo.messages.forEach(m=>{

add(m.role,m.text)

})

}


function newChat(){

chat.innerHTML='<div class="welcome">How can I support you today?</div>'

const convo={
id:Date.now(),
title:"New Chat",
messages:[]
}

conversations.unshift(convo)

currentConversation=convo

save()

renderHistory()

}


function save(){

localStorage.setItem("indicare_chats",JSON.stringify(conversations))

}


function add(role,text){

document.querySelector(".welcome")?.remove()

const msg=document.createElement("div")

msg.className="msg "+role

msg.textContent=text

chat.appendChild(msg)

chat.scrollTop=chat.scrollHeight

if(currentConversation){

currentConversation.messages.push({role,text})

save()

}

}


async function send(){

const text=input.value.trim()

if(!text)return

add("user",text)

input.value=""

const res=await fetch(API,{
method:"POST",
credentials:"include",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:text
})
})

const reader=res.body.getReader()

const decoder=new TextDecoder()

let reply=""

const assistant=document.createElement("div")

assistant.className="msg assistant"

chat.appendChild(assistant)

while(true){

const {done,value}=await reader.read()

if(done)break

reply+=decoder.decode(value,{stream:true})

assistant.textContent=reply

chat.scrollTop=chat.scrollHeight

}

if(currentConversation && currentConversation.messages.length===1){

currentConversation.title=text.slice(0,30)

renderHistory()

save()

}

}


sendBtn.onclick=send


input.addEventListener("keydown",e=>{

if(e.key==="Enter"&&!e.shiftKey){

e.preventDefault()

send()

}

})


if(conversations.length){

loadConversation(conversations[0])

renderHistory()

}else{

newChat()

}
