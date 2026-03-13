async function login() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!email || !password) {
        alert("Please enter your email and password");
        return;
    }

    try {
        const data = await apiFetchJson("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        if (!data.access_token) {
            alert("Login succeeded but no access token was returned");
            return;
        }

        setAccessToken(data.access_token);

        if (data.user) {
            setStoredUser(data.user);
        }

        window.location.href = "/";
    } catch (error) {
        console.error("Login failed:", error);
        alert(error.message || "Login failed");
    }
}

function logout() {
    logoutUser();
}

document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const emailInput = document.getElementById("email");

    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                login();
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                login();
            }
        });
    }
});
