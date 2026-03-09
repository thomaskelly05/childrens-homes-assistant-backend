const API="https://api.indicare.co.uk"

let conversation=null
let chat


function initApp(){

chat=document.getElementById("chat")

loadConversations()

}


function addMsg(role,text){

const div=document.createElement("div")

div.className="msg "+role

div.innerHTML=`

<div class="bubble">

${marked.parse(text)}

</div>

`

chat.appendChild(div)

chat.scrollTop=chat.scrollHeight

return div

}


async function sendChat(){

const input=document.getElementById("chatInput")

const text=input.value.trim()

if(!text)return

addMsg("user",text)

input.value=""

const assistant=addMsg("assistant","")

const bubble=assistant.querySelector(".bubble")

const res=await fetch(API+"/chat/",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

credentials:"include",

body:JSON.stringify({
message:text,
conversation_id:conversation
})

})

const reader=res.body.getReader()
const decoder=new TextDecoder()

let ai=""

while(true){

const {done,value}=await reader.read()

if(done)break

ai+=decoder.decode(value)

bubble.innerHTML=marked.parse(ai)

}

loadConversations()

}


function toolPrompt(text){

const input=document.getElementById("chatInput")

input.value=text+" "

input.focus()

}


async function loadConversations(){

const res=await fetch(API+"/chat/conversations",{credentials:"include"})

if(!res.ok)return

const data=await res.json()

const list=document.getElementById("conversationList")

list.innerHTML=""

data.forEach(c=>{

const div=document.createElement("div")

div.innerText=c.title||"Conversation"

div.onclick=()=>loadConversation(c.id)

list.appendChild(div)

})

}


async function loadConversation(id){

conversation=id

const res=await fetch(API+"/chat/conversations/"+id,{credentials:"include"})

const data=await res.json()

chat.innerHTML=""

data.forEach(m=>addMsg(m.role,m.message))

}


function newChat(){

conversation=null
chat.innerHTML=""

}


async function searchConversations(){

const q=document.getElementById("searchBox").value

if(!q){

loadConversations()
return

}

const res=await fetch(API+"/chat/search?q="+q,{credentials:"include"})

if(!res.ok)return

const data=await res.json()

const list=document.getElementById("conversationList")

list.innerHTML=""

data.forEach(c=>{

const div=document.createElement("div")

div.innerText=c.title

div.onclick=()=>loadConversation(c.id)

list.appendChild(div)

})

}


async function logout(){

await fetch(API+"/auth/logout",{

method:"POST",
credentials:"include"

})

window.location="/login.html"

}
