const API = "https://api.indicare.co.uk"


/* ----------------------------- */
/* GENERIC API */
/* ----------------------------- */

async function api(path, options = {}) {

    const res = await fetch(API + path, {

        ...options,

        credentials: "include",

        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }

    })

    if (res.status === 401) {

        console.log("Not authenticated")

        window.location = "/login.html"

        return
    }

    if (!res.ok) {

        throw new Error("API error")
    }

    return res.json()
}


/* ----------------------------- */
/* AUTH */
/* ----------------------------- */

async function getUser() {

    return await api("/auth/me")
}


async function logout() {

    await api("/auth/logout", {
        method: "POST"
    })

    window.location = "/login.html"
}
