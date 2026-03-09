const API="https://api.indicare.co.uk"

let conversation=null
let userName=""
let streamingMsg=null

let chat


function initApp(){

chat=document.getElementById("chat")

loadUser()
loadConversations()

}


/* USER */

async function loadUser(){

const res=await fetch(API+"/auth/me",{credentials:"include"})

const data=await res.json()

userName=data.email||"User"

renderHome()

}


/* HOME */

function renderHome(){

conversation=null

chat.innerHTML=`
<div class="home">
<h2>Hello ${userName}, how can I support you today?</h2>
<p>IndiCare helps with safeguarding guidance, reports and reflections.</p>
</div>
`

}


/* SIDEBAR */

function toggleSidebar(){

document.getElementById("sidebar").classList.toggle("hidden")

}


/* MESSAGE */

function addMsg(role,text){

const div=document.createElement("div")

div.className="msg "+role

div.innerHTML=`

<div class="avatar">${role==="assistant"?"AI":"You"}</div>

<div>

<div class="bubble">

${marked.parse(text)}

${role==="assistant" ? '<div class="copyBtn" onclick="copyText(this)">Copy</div>' : ''}

</div>

</div>

`

chat.appendChild(div)

chat.scrollTop=chat.scrollHeight

return div

}

/* STREAM */

async function sendChat(){

const input=document.getElementById("chatInput")

const text=input.value.trim()

if(!text)return

addMsg("user",text)

input.value=""

streamingMsg=addMsg("assistant","")

const bubble=streamingMsg.querySelector(".bubble")

bubble.innerHTML=`
<div class="typing">
<span></span>
<span></span>
<span></span>
</div>
`
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

chat.scrollTop=chat.scrollHeight

}

loadConversations()

}


/* COPY */

function copyMsg(el){

const text=el.parentElement.parentElement.querySelector(".bubble").innerText

navigator.clipboard.writeText(text)

}


/* DELETE */

function deleteMsg(el){

el.closest(".msg").remove()

}


/* EDIT */

function editMsg(el){

const bubble=el.parentElement.parentElement.querySelector(".bubble")

document.getElementById("chatInput").value=bubble.innerText

bubble.closest(".msg").remove()

}


/* REGENERATE */

function regenerate(){

const lastUser=document.querySelector(".msg.user:last-of-type .bubble").innerText

document.getElementById("chatInput").value=lastUser

sendChat()

}


/* CONVERSATIONS */

async function loadConversations(){

const res=await fetch(API+"/chat/conversations",{credentials:"include"})

if(!res.ok)return

const data=await res.json()

const list=document.getElementById("conversationList")

list.innerHTML=""

data.forEach(c=>{

const div=document.createElement("div")

div.className="convo"

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


/* SEARCH */

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

div.className="convo"

div.innerText=c.title

div.onclick=()=>loadConversation(c.id)

list.appendChild(div)

})

}


/* NEW CHAT */

function newChat(){

conversation=null

renderHome()

}


/* TOOL PROMPTS */

function toolPrompt(text){

const input=document.getElementById("chatInput")

input.value=text+" "

input.focus()

}


/* ACCOUNT */

async function loadAccount(){

const res=await fetch(API+"/auth/me",{credentials:"include"})

const user=await res.json()

chat.innerHTML=`

<h2>Account</h2>

<div class="panel">

<p><b>Email</b></p>
<p>${user.email}</p>

<p><b>Role</b></p>
<p>${user.role}</p>

<br>

<button onclick="logout()" class="sendBtn">Logout</button>

</div>

`

}


/* SETTINGS */

function loadSettings(){

chat.innerHTML=`

<h2>Settings</h2>

<div class="panel">

<p>Settings will appear here.</p>

</div>

`

}

function copyText(el){

const text = el.parentElement.innerText

navigator.clipboard.writeText(text)

el.innerText = "Copied"

setTimeout(()=>{

el.innerText="Copy"

},2000)

}
/* LOGOUT */

async function logout(){

await fetch(API+"/auth/logout",{
method:"POST",
credentials:"include"
})

window.location="/login.html"

}
