function setAccessToken(token) {
  if (!token) return;
  localStorage.setItem("access_token", token);
}

function getAccessToken() {
  return localStorage.getItem("access_token");
}

function clearAccessToken() {
  localStorage.removeItem("access_token");
}

function setStoredUser(user) {
  if (!user) return;
  localStorage.setItem("current_user", JSON.stringify(user));
}

function getStoredUser() {
  const raw = localStorage.getItem("current_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function clearStoredUser() {
  localStorage.removeItem("current_user");
}

async function apiFetchJson(path, options = {}) {
  return apiRequest(path, options);
}

async function login() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginBtn");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    alert("Please enter your email and password");
    return;
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
  }

  try {
    const data = await apiFetchJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!data.access_token) {
      throw new Error("Login succeeded but no access token was returned");
    }

    setAccessToken(data.access_token);

    if (data.user) {
      setStoredUser(data.user);
    }

    window.location.href = "/";
  } catch (error) {
    console.error("Login failed:", error);
    alert(error.message || "Login failed");
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Log in";
    }
  }
}

async function logoutUser() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST"
    });
  } catch (_) {
    // ignore API logout failure
  }

  clearAccessToken();
  clearStoredUser();
  window.location.href = "/login";
}

function logout() {
  logoutUser();
}

function requireAuth() {
  const token = getAccessToken();

  if (!token) {
    window.location.href = "/login";
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("loginBtn");
  const passwordInput = document.getElementById("password");
  const emailInput = document.getElementById("email");
  const logoutButton = document.getElementById("logoutBtn");

  if (loginButton) {
    loginButton.addEventListener("click", login);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

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
