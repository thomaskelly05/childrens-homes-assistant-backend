async function loadWorkspace(file){

const res = await fetch("/components/" + file)
const html = await res.text()

document.getElementById("workspace").innerHTML = html

}

function openAssistant(){
loadWorkspace("assistant.html")
}

function openReflections(){
loadWorkspace("reflections.html")
}

function openSupervision(){
loadWorkspace("supervision.html")
}

function openTemplates(){
loadWorkspace("templates.html")
}

function openGuidance(){
loadWorkspace("guidance.html")
}
