const API="https://api.indicare.co.uk"

const form=document.getElementById("loginForm")

form.onsubmit=async e=>{

e.preventDefault()

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const res=await fetch(API+"/auth/login",{

method:"POST",

credentials:"include",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
password
})

})

if(res.ok){

window.location="/"

}else{

alert("Login failed")

}

}
