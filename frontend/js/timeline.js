async function loadTimeline(){

const data=await api("/timeline")

const timeline=document.getElementById("timeline")

timeline.innerHTML=""

data.forEach(item=>{

const div=document.createElement("div")

div.className="timelineItem"

div.innerHTML=`

<strong>${item.date}</strong>

<p>${item.event}</p>

`

timeline.appendChild(div)

})

}
