async function loadWorkspace(){

const res=await fetch("/components/workspace.html")

const html=await res.text()

document.getElementById("workspace").innerHTML=html

}
