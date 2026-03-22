function setAccessToken(token, remember = false) {
  if (!token) return;

  if (remember) {
    localStorage.setItem("access_token", token);
    sessionStorage.removeItem("access_token");
  } else {
    sessionStorage.setItem("access_token", token);
    localStorage.removeItem("access_token");
  }
}

function getAccessToken() {
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
}

function clearAccessToken() {
  sessionStorage.removeItem("access_token");
  localStorage.removeItem("access_token");
}

function setStoredUser(user, remember = false) {
  if (!user) return;

  const raw = JSON.stringify(user);

  if (remember) {
    localStorage.setItem("current_user", raw);
    sessionStorage.removeItem("current_user");
  } else {
    sessionStorage.setItem("current_user", raw);
    localStorage.removeItem("current_user");
  }
}

function getStoredUser() {
  const raw = sessionStorage.getItem("current_user") || localStorage.getItem("current_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function clearStoredUser() {
  sessionStorage.removeItem("current_user");
  localStorage.removeItem("current_user");
}

async function apiFetchJson(path, options = {}) {
  return apiRequest(path, options);
}

async function login(credentialsArg = null) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("rememberMe");
  const loginButton = document.getElementById("loginBtn");
  const loginStatus = document.getElementById("loginStatus");

  const email = credentialsArg?.email?.trim() || (emailInput ? emailInput.value.trim() : "");
  const password = credentialsArg?.password || (passwordInput ? passwordInput.value : "");
  const remember = typeof credentialsArg?.remember === "boolean"
    ? credentialsArg.remember
    : !!(rememberInput && rememberInput.checked);

  if (!email || !password) {
    if (loginStatus) loginStatus.textContent = "Please enter your email and password.";
    throw new Error("Please enter your email and password");
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
  }

  if (loginStatus) {
    loginStatus.textContent = "Checking your details...";
  }

  try {
    const data = await apiFetchJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!data || !data.access_token) {
      throw new Error("Login succeeded but no access token was returned");
    }

    setAccessToken(data.access_token, remember);

    if (data.user) {
      setStoredUser(data.user, remember);
    }

    if (loginStatus) {
      loginStatus.textContent = "Sign-in successful. Redirecting...";
    }

    window.location.href = "/";
    return data;
  } catch (error) {
    console.error("Login failed:", error);

    clearAccessToken();
    clearStoredUser();

    const message = error?.message || "Login failed";

    if (loginStatus) {
      loginStatus.textContent = message;
    }

    throw error;
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Sign in";
    }
  }
}

async function logoutUser() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (_) {
    // ignore API logout failure
  }

  clearAccessToken();
  clearStoredUser();
  window.location.replace("/login");
}

function logout() {
  logoutUser();
}

async function validateSession() {
  const token = getAccessToken();

  if (!token) {
    clearAccessToken();
    clearStoredUser();
    return false;
  }

  try {
    const data = await apiFetchJson("/auth/check", {
      method: "GET"
    });

    if (!data || data.authenticated !== true) {
      clearAccessToken();
      clearStoredUser();
      return false;
    }

    const existingUser = getStoredUser() || {};
    setStoredUser(
      {
        ...existingUser,
        id: data.user_id,
        email: data.email,
        role: data.role,
        home_id: data.home_id,
        is_active: data.is_active,
        subscription_status: data.subscription_status,
        plan_name: data.plan_name
      },
      !!localStorage.getItem("access_token")
    );

    return true;
  } catch (_) {
    clearAccessToken();
    clearStoredUser();
    return false;
  }
}

async function requireAuth() {
  const ok = await validateSession();

  if (!ok) {
    window.location.replace("/login");
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.getElementById("logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
});

window.auth = {
  login,
  logout,
  logoutUser,
  requireAuth,
  validateSession,
  getAccessToken,
  getStoredUser
};
