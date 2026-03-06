const API = "https://childrens-homes-assistant-backend.onrender.com"

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("login-form")

    form.addEventListener("submit", async (e) => {

        e.preventDefault()

        const email = document.getElementById("email").value
        const password = document.getElementById("password").value
        const error = document.getElementById("login-error")

        error.innerText = ""

        try {

            const res = await fetch(`${API}/auth/login`, {
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
                error.innerText = "Invalid email or password"
                return
            }

            window.location.href = "/"

        } catch (err) {

            error.innerText = "Unable to connect to server"

        }

    })

})
