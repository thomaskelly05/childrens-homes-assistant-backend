async function loadComponent(url,target){

const res=await fetch(url)

const html=await res.text()

document.getElementById(target).innerHTML=html

}

async function init(){

await loadComponent("/components/sidebar.html","sidebar")

await loadComponent("/components/header.html","header")

await loadWorkspace()

}

init()
