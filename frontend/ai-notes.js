async function transcribe(){

const file = document.getElementById("audio").files[0]

const form = new FormData()

form.append("file",file)

const res = await fetch("/ai-notes/transcribe",{
method:"POST",
body:form
})

const data = await res.json()

document.getElementById("transcript").value = data.transcript
}



async function generate(){

const transcript = document.getElementById("transcript").value

const form = new FormData()

form.append("transcript",transcript)

const res = await fetch("/ai-notes/generate",{
method:"POST",
body:form
})

const data = await res.json()

document.getElementById("note").value = data.note

if(data.safeguarding){
alert("⚠ Safeguarding concern detected")
}

}



async function save(){

const transcript = document.getElementById("transcript").value
const note = document.getElementById("note").value

const form = new FormData()

form.append("child_id",1)
form.append("staff_id",1)
form.append("transcript",transcript)
form.append("note",note)

await fetch("/ai-notes/save",{
method:"POST",
body:form
})

alert("Saved")
}
