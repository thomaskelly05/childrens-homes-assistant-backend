document.addEventListener("keydown",function(e){

if(e.ctrlKey && e.key==="k"){

e.preventDefault()

toggleCommand()

}

})

function toggleCommand(){

const el=document.getElementById("commandPalette")

if(el.style.display==="block"){

el.style.display="none"

}else{

el.style.display="block"

}

}

function startWorkflow(type){

toggleCommand()

let prompt=""

if(type==="incident"){
prompt="Write an incident report about "
}

if(type==="risk"){
prompt="Create a risk assessment for "
}

if(type==="safeguarding"){
prompt="Provide safeguarding advice regarding "
}

if(type==="handover"){
prompt="Generate a shift handover summary including "
}

document.getElementById("chatInput").value=prompt
document.getElementById("chatInput").focus()

}
