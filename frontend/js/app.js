async function loadSidebar(){

const res = await fetch("/components/sidebar.html")
const html = await res.text()

document.getElementById("sidebar").innerHTML = html

const newChatBtn = document.getElementById("new-chat-btn")

if(newChatBtn){

newChatBtn.onclick = createConversation

}

loadConversations()

}

async function loadWorkspace(){

const res = await fetch("/components/workspace.html")
const html = await res.text()

document.getElementById("workspace").innerHTML = html

initChat()

}

window.onload = async () => {

await loadSidebar()
await loadWorkspace()

}
