const API="https://api.indicare.co.uk"

async function api(url,options={}){

options.credentials="include"

const res=await fetch(API+url,options)

if(!res.ok){

throw new Error("API error")

}

return res.json()

}
async function logout(){

await fetch(API+"/auth/logout",{

method:"POST",
credentials:"include"

})

window.location="/login.html"

}
