const API="https://api.indicare.co.uk"

let conversation=null
let userName=""
let streamingMsg=null

const chat=document.getElementById("chat")

function initApp(){

loadUser()
loadConversations()

}

async function loadUser(){

const res=await fetch(API+"/account/me",{credentials:"include"})

const data=await res.json()

userName=data.name||""

renderHome()

}

function renderHome(){

conversation=null

chat.innerHTML=`
<div class="home">
<h2>Hello ${userName}, how can I support you today?</h2>
<p>IndiCare helps with safeguarding guidance, reports and reflections.</p>
</div>
`

}

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

async function sendChat(){

const text=document.getElementById("chatInput").value.trim()

if(!text)return

addMsg("user",text)

document.getElementById("chatInput").value=""

streamingMsg=addMsg("assistant","")

const bubble=streamingMsg.querySelector(".bubble")

const res=await fetch(API+"/chat/",{

method:"POST",
headers:{"Content-Type":"application/json"},
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

async function logout(){

await fetch(API+"/auth/logout",{credentials:"include"})

window.location="/login.html"

}
