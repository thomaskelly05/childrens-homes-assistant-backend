let conversation=null

async function sendChat(){

const input=document.getElementById("chatInput")

const text=input.value

input.value=""

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

document.getElementById("aiOutput").innerHTML=ai

}

}
