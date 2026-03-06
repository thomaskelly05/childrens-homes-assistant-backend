const API = "https://childrens-homes-assistant-backend-new.onrender.com"

const form = document.getElementById("login-form")
const error = document.getElementById("login-error")

form.addEventListener("submit", async (e) => {

    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    error.textContent = ""

    try {

        const res = await fetch(API + "/auth/login", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                email: email,
                password: password
            })

        })

        if (!res.ok) {
            error.textContent = "Invalid email or password"
            return
        }

        window.location.href = "/"

    } catch (err) {

        error.textContent = "Server connection error"

    }

})
