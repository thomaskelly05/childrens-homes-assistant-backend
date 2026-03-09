const API="https://api.indicare.co.uk/api/assistant/stream"

const chat=document.getElementById("chat")
const input=document.getElementById("input")
const sendBtn=document.getElementById("sendBtn")
const historyPanel=document.getElementById("history")
const search=document.getElementById("search")

let conversations=JSON.parse(localStorage.getItem("indicare_chats")||"[]")
let currentConversation=null

function save(){
localStorage.setItem("indicare_chats",JSON.stringify(conversations))
}

function renderHistory(){

historyPanel.innerHTML=""

const filter=search.value?.toLowerCase()||""

conversations
.filter(c=>c.title?.toLowerCase().includes(filter))
.forEach(c=>{

const item=document.createElement("div")

item.className="historyItem"

item.textContent=c.title||"New Chat"

item.onclick=()=>loadConversation(c)

historyPanel.appendChild(item)

})
}

search.oninput=renderHistory

function loadConversation(convo){

currentConversation=convo

chat.innerHTML=""

convo.messages.forEach(m=>add(m.role,m.text,false))
}

function newChat(){

chat.innerHTML='<div class="welcome">Hello, how can I support you today?</div>'

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

function add(role,text,store=true){

document.querySelector(".welcome")?.remove()

const msg=document.createElement("div")

msg.className="msg "+role

msg.innerHTML=`
<div class="avatar">${role==="assistant"?"AI":"You"}</div>
<div>
<div class="bubble">${text}</div>
<div class="actions">
<span onclick="copy(this)">Copy</span>
</div>
</div>
`

chat.appendChild(msg)

chat.scrollTop=chat.scrollHeight

if(store && currentConversation){
currentConversation.messages.push({role,text})
save()
}
}

function copy(el){
const text=el.closest(".msg").querySelector(".bubble").innerText
navigator.clipboard.writeText(text)
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
body:JSON.stringify({message:text})
})

const reader=res.body.getReader()

const decoder=new TextDecoder()

let reply=""

const container=document.createElement("div")

container.className="msg assistant"

container.innerHTML=`<div class="avatar">AI</div><div><div class="bubble"></div></div>`

chat.appendChild(container)

const bubble=container.querySelector(".bubble")

while(true){

const {done,value}=await reader.read()

if(done)break

reply+=decoder.decode(value,{stream:true})

bubble.textContent=reply

chat.scrollTop=chat.scrollHeight
}

add("assistant",reply)

if(currentConversation && currentConversation.messages.length===1){

currentConversation.title=text.slice(0,30)

save()

renderHistory()
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
