const API="/api/assistant/stream"

const chat=document.getElementById("chat")
const input=document.getElementById("input")
const sendBtn=document.getElementById("sendBtn")

const menuBtn=document.getElementById("menuBtn")
const drawer=document.getElementById("drawer")

if(menuBtn && drawer){

menuBtn.onclick=()=>{
drawer.classList.toggle("open")
}

}

function add(role,text){

document.querySelector(".welcome")?.remove()

const msg=document.createElement("div")

msg.className="msg "+role

msg.textContent=text

chat.appendChild(msg)

chat.scrollTop=chat.scrollHeight

}

async function send(){

const text=input.value.trim()

if(!text) return

add("user",text)

input.value=""

const res=await fetch(API,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
message:text,
mode:document.getElementById("mode")?.value || "reflective",
role:document.getElementById("role")?.value || "support_worker",
ld_friendly:document.getElementById("ld")?.checked || false,
slow_mode:document.getElementById("slow")?.checked || false
})
})

const reader=res.body.getReader()

const decoder=new TextDecoder()

let reply=""

const assistant=document.createElement("div")

assistant.className="msg"

chat.appendChild(assistant)

while(true){

const {done,value}=await reader.read()

if(done) break

reply+=decoder.decode(value)

assistant.textContent=reply

chat.scrollTop=chat.scrollHeight

}

}

sendBtn.addEventListener("click",send)

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter" && !e.shiftKey){

e.preventDefault()

send()

}

})

function newChat(){

chat.innerHTML='<div class="welcome">What would you like to reflect on today?</div>'

}
