const API="https://api.indicare.co.uk"

async function api(path,options={}){

options.credentials="include"

const res=await fetch(API+path,options)

if(!res.ok)throw new Error("API error")

return res.json()

}
