const API="https://api.indicare.co.uk"

let conversation=null
let userName=""
let streamingMsg=null

const chat=document.getElementById("chat")


/* ----------------------------- */
/* INIT */
/* ----------------------------- */

function initApp(){

loadUser()
loadConversations()

}


/* ----------------------------- */
/* LOAD USER */
/* ----------------------------- */

async function loadUser(){

const res=await fetch(API+"/auth/me",{credentials:"include"})

if(!res.ok){

window.location="/login.html"
return

}

const data=await res.json()

userName=data.email || "User"

renderHome()

}


/* ----------------------------- */
/* HOME SCREEN */
/* ----------------------------- */

function renderHome(){

conversation=null

chat.innerHTML=`
<div class="home">

<h2>Hello ${userName}, how can I support you today?</h2>

<p>IndiCare helps with safeguarding guidance, reports and reflections.</p>

</div>
`

}


/* ----------------------------- */
/* ADD MESSAGE */
/* ----------------------------- */

function addMsg(role,text){

const div=document.createElement("div")

div.className="msg "+role

div.innerHTML=`

<div class="avatar">${role==="assistant"?"AI":"You"}</div>

<div>

<div class="bubble">${marked.parse(text)}</div>

</div>

`

chat.appendChild(div)

chat.scrollTop=chat.scrollHeight

return div

}


/* ----------------------------- */
/* SEND CHAT */
/* ----------------------------- */

async function sendChat(){

const input=document.getElementById("chatInput")

const text=input.value.trim()

if(!text)return

addMsg("user",text)

input.value=""

streamingMsg=addMsg("assistant","")

const bubble=streamingMsg.querySelector(".bubble")

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


/* ----------------------------- */
/* LOAD CONVERSATIONS */
/* ----------------------------- */

async function loadConversations(){

const res=await fetch(API+"/chat/conversations",{

credentials:"include"

})

if(!res.ok)return

const data=await res.json()

const list=document.getElementById("conversationList")

list.innerHTML=""

data.forEach(c=>{

const div=document.createElement("div")

div.className="convo"

div.innerText=c.title || "Conversation"

div.onclick=()=>loadConversation(c.id)

list.appendChild(div)

})

}


/* ----------------------------- */
/* LOAD SINGLE CONVERSATION */
/* ----------------------------- */

async function loadConversation(id){

conversation=id

const res=await fetch(API+"/chat/conversations/"+id,{

credentials:"include"

})

const data=await res.json()

chat.innerHTML=""

data.forEach(m=>{

addMsg(m.role,m.message)

})

}


/* ----------------------------- */
/* NEW CHAT */
/* ----------------------------- */

function newChat(){

conversation=null

renderHome()

}


/* ----------------------------- */
/* TOOL PROMPTS */
/* ----------------------------- */

function toolPrompt(text){

const input=document.getElementById("chatInput")

input.value=text+" "

input.focus()

}


/* ----------------------------- */
/* ACCOUNT */
/* ----------------------------- */

async function loadAccount(){

const res=await fetch(API+"/auth/me",{

credentials:"include"

})

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


/* ----------------------------- */
/* SETTINGS */
/* ----------------------------- */

function loadSettings(){

chat.innerHTML=`

<h2>Settings</h2>

<div class="panel">

<p>Settings will appear here.</p>

</div>

`

}


/* ----------------------------- */
/* LOGOUT */
/* ----------------------------- */

async function logout(){

await fetch(API+"/auth/logout",{

method:"POST",

credentials:"include"

})

window.location="/login.html"

}
