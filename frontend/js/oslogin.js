const LOGIN_ENDPOINT = "/auth/login";

function setStatus(text, isError = false) {
  const el = document.getElementById("loginStatus");
  el.textContent = text || "";
  el.style.color = isError ? "#991b1b" : "#6b7280";
}

async function login(email, password) {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Login failed");
  }

  if (!data.access_token) {
    throw new Error("No access token returned");
  }

  localStorage.setItem("chos_access_token", data.access_token);
  localStorage.setItem("chos_user", JSON.stringify(data.user || {}));

  window.location.href = "young-people-shell.html";
}

function bindLogin() {
  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      setStatus("Email and password are required.", true);
      return;
    }

    setStatus("Signing in...");

    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Unable to sign in.", true);
    }
  });
}

function init() {
  const token = localStorage.getItem("chos_access_token");
  if (token) {
    window.location.href = "young-people-shell.html";
    return;
  }

  bindLogin();
}

document.addEventListener("DOMContentLoaded", init);
