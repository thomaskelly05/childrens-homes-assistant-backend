const API = "https://childrens-homes-assistant-backend-new.onrender.com";

async function sendMessage(message, sessionId) {
    const token = localStorage.getItem("indicare_access_token") || "";

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API}/chat/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            message: message,
            session_id: sessionId
        })
    });

    return response;
}
