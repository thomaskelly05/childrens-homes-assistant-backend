const API = "https://api.indicare.co.uk";

async function sendMessage(message, sessionId) {

const response = await fetch(API + "/chat", {

method: "POST",

headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({
message: message,
session_id: sessionId
})

});

return response.body;

}
