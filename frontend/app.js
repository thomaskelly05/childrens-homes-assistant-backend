// LOGIN HANDLER ----------------------------------------------------

if (window.location.pathname === "/login.html") {
    const form = document.getElementById("login-form");

    form.onsubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            document.getElementById("login-error").textContent = "Invalid login.";
            return;
        }

        window.location.href = "/";
    };
}
