document.addEventListener("DOMContentLoaded", () => {

loadSidebar();
loadWorkspace();

});

async function loadSidebar(){

const sidebar=document.getElementById("sidebar");

if(!sidebar) return;

const res=await fetch("/components/sidebar.html");

const html=await res.text();

sidebar.innerHTML=html;

}

async function loadWorkspace(){

const workspace=document.getElementById("workspace");

if(!workspace) return;

const res=await fetch("/components/workspace.html");

const html=await res.text();

workspace.innerHTML=html;

}
