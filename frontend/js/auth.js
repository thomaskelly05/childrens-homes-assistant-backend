async function login(){

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const res=await fetch(API+"/auth/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

credentials:"include",

body:JSON.stringify({email,password})

})

if(res.ok){

window.location="/"

}else{

alert("Login failed")

}

}
