async function loadComponent(url, element){

const res = await fetch(url)
const html = await res.text()

document.getElementById(element).innerHTML = html

}

async function init(){

await loadComponent("/components/sidebar.html","sidebar")

await loadComponent("/components/workspace.html","workspace")

if(window.initChat){
initChat()
}

}

init()

window.openAssistant = async function(){

await loadComponent("/components/workspace.html","workspace")

if(window.initChat){
initChat()
}

}

window.createConversation = function(){

document.getElementById("messages").innerHTML=""

}
