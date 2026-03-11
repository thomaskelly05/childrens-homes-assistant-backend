async function loadSidebar(){

const res = await fetch("/components/sidebar.html");

const html = await res.text();

document.getElementById("sidebar").innerHTML = html;

}

async function loadWorkspace(){

const res = await fetch("/components/workspace.html");

const html = await res.text();

document.getElementById("workspace").innerHTML = html;

/* IMPORTANT: start chat AFTER workspace loads */

if(typeof initChat === "function"){
initChat();
}

}

loadSidebar();
loadWorkspace();
