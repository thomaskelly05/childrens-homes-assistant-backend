const API="/api/assistant/stream"

const chat=document.getElementById("chat") || document.getElementById("messages")

const input =
document.getElementById("input") ||
document.getElementById("user-input")

const sendBtn =
document.getElementById("sendBtn") ||
document.getElementById("send-btn")

const menuBtn=document.getElementById("menuBtn")
const drawer=document.getElementById("drawer")

if(menuBtn && drawer){
menuBtn.onclick=()=>{
drawer.classList.toggle("open")
}
}

function add(role,text){

if(!chat) return

document.querySelector(".welcome")?.remove()

const msg=document.createElement("div")
msg.className="msg "+role
msg.textContent=text

chat.appendChild(msg)

chat.scrollTop=chat.scrollHeight

}

async function send(){

if(!input) return

const text=input.value.trim()

if(!text) return

add("user",text)

input.value=""

const payload={

message:text,

mode:document.getElementById("mode")?.value || "reflective",

role:
document.getElementById("role")?.value ||
document.getElementById("role-select")?.value ||
"support_worker",

ld_friendly:
document.getElementById("ld")?.checked ||
document.getElementById("ld-toggle")?.checked ||
false,

slow_mode:
document.getElementById("slow")?.checked ||
document.getElementById("slow-toggle")?.checked ||
false

}

const res=await fetch(API,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(payload)
})

const reader=res.body.getReader()
const decoder=new TextDecoder()

let reply=""

const assistant=document.createElement("div")
assistant.className="msg assistant"

chat.appendChild(assistant)

while(true){

const {done,value}=await reader.read()

if(done) break

reply+=decoder.decode(value)

assistant.textContent=reply

chat.scrollTop=chat.scrollHeight

}

}

if(sendBtn){
sendBtn.addEventListener("click",send)
}

if(input){
input.addEventListener("keydown",e=>{
if(e.key==="Enter" && !e.shiftKey){
e.preventDefault()
send()
}
})
}

function newChat(){

if(!chat) return

chat.innerHTML='<div class="welcome">What would you like to reflect on today?</div>'

}
