async function loadProfiles(){

const res=await api("/profiles")

const list=document.getElementById("profiles")

list.innerHTML=""

res.forEach(p=>{

const div=document.createElement("div")

div.className="profileCard"

div.innerHTML=`

<strong>${p.name}</strong>

<p>Risks: ${p.risks}</p>

<p>Triggers: ${p.triggers}</p>

`

list.appendChild(div)

})

}
