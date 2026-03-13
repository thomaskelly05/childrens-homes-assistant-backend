async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter your email and password");
        return;
    }

    let res;
    let data = {};

    try {
        res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        try {
            data = await res.json();
        } catch {
            data = {};
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Could not connect to the server");
        return;
    }

    if (res.ok) {
        window.location = "/";
    } else {
        alert(data.detail || data.message || "Login failed");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const emailInput = document.getElementById("email");

    if (passwordInput) {
        passwordInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                login();
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                login();
            }
        });
    }
});
