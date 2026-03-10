const API = "https://api.indicare.co.uk"


/* -------------------------------------------------- */
/* GENERIC API CALL */
/* -------------------------------------------------- */

async function api(path, options = {}) {

    const res = await fetch(API + path, {
        ...options,
        credentials: "include",   // IMPORTANT
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    })

    if (!res.ok) {

        if (res.status === 401) {

            console.log("Not authenticated")

            window.location = "/login.html"

            return
        }

        throw new Error("API error")
    }

    return res.json()
}


/* -------------------------------------------------- */
/* AUTH */
/* -------------------------------------------------- */

async function getUser() {

    return await api("/auth/me")
}


async function logout() {

    await api("/auth/logout", {
        method: "POST"
    })

    window.location = "/login.html"
}


/* -------------------------------------------------- */
/* CHAT */
/* -------------------------------------------------- */

async function sendChat(message, conversationId) {

    const res = await fetch(API + "/chat/", {

        method: "POST",

        credentials: "include",  // CRITICAL

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            message: message,
            conversation_id: conversationId
        })
    })

    if (!res.ok) {

        if (res.status === 401) {

            window.location = "/login.html"
            return
        }

        throw new Error("Chat request failed")
    }

    return res
}
