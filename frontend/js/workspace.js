async function loadWorkspace(component){

const res = await fetch("/components/" + component)
const html = await res.text()

document.getElementById("workspace").innerHTML = html

}


function openAssistant(){

loadWorkspace("assistant.html")

}

function openReflections(){

loadWorkspace("reflections.html")

}

function openSupervisionNotes(){

loadWorkspace("supervision_notes.html")

}

function openCapturedReflections(){

loadWorkspace("captured_reflections.html")

}

function openSupervisionTemplate(){

loadWorkspace("supervision_template.html")

}

function openShiftReflection(){

loadWorkspace("shift_reflection.html")

}

function openSafeguarding(){

loadWorkspace("guidance_safeguarding.html")

}

function openOfsted(){

loadWorkspace("guidance_ofsted.html")

}
