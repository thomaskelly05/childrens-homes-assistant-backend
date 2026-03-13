const ACCESS_TOKEN_KEY = "indicare_access_token";
const CURRENT_USER_KEY = "indicare_current_user";

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

    if (!res.ok) {
        alert(data.detail || data.message || "Login failed");
        return;
    }

    const token = data.access_token;

    if (!token) {
        alert("Login succeeded but no access token was returned");
        return;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    if (data.user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
    }

    window.location = "/";
}

function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location = "/login.html";
}

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

function getAuthHeaders(extraHeaders = {}) {
    const token = getAccessToken();

    if (!token) {
        return { ...extraHeaders };
    }

    return {
        ...extraHeaders,
        Authorization: `Bearer ${token}`
    };
}

async function checkAuth() {
    const token = getAccessToken();

    if (!token) {
        return false;
    }

    try {
        const res = await fetch(`${API}/auth/check`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (!res.ok || !data.authenticated) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(CURRENT_USER_KEY);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Auth check error:", error);
        return false;
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
