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
  const raw =
    sessionStorage.getItem("current_user") ||
    localStorage.getItem("current_user");

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

function hasRememberedUser() {
  return !!localStorage.getItem("current_user");
}

async function apiFetchJson(path, options = {}) {
  if (typeof window.apiRequest === "function") {
    return window.apiRequest(path, options);
  }

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  let data = {};

  try {
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text ? { detail: text } : {};
    }
  } catch (_) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `Request failed (${res.status})`);
  }

  return data;
}

function updateStoredUserFromSessionState(data) {
  const existing = getStoredUser() || {};
  const remember = hasRememberedUser();

  const merged = {
    ...existing,
    id: data.user_id ?? existing.id,
    email: data.email ?? existing.email,
    role: data.role ?? existing.role,
    home_id: data.home_id ?? existing.home_id,
    is_active: data.is_active ?? existing.is_active,
    subscription_status: data.subscription_status ?? existing.subscription_status,
    plan_name: data.plan_name ?? existing.plan_name,
    subscription_active: data.subscription_active ?? existing.subscription_active,
    mfa_enabled: data.mfa_enabled ?? existing.mfa_enabled ?? false,
    mfa_verified: data.mfa_verified ?? existing.mfa_verified ?? false,
    authenticated: data.authenticated ?? true,
  };

  setStoredUser(merged, remember);
  return merged;
}

async function login(credentialsArg = null) {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("rememberMe");
  const loginButton = document.getElementById("loginBtn");
  const loginStatus = document.getElementById("loginStatus");

  const email =
    credentialsArg?.email?.trim() ||
    (emailInput ? emailInput.value.trim() : "");

  const password =
    credentialsArg?.password ||
    (passwordInput ? passwordInput.value : "");

  const remember =
    typeof credentialsArg?.remember === "boolean"
      ? credentialsArg.remember
      : !!(rememberInput && rememberInput.checked);

  if (!email || !password) {
    if (loginStatus) {
      loginStatus.textContent = "Please enter your email and password.";
    }
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
      body: JSON.stringify({ email, password, remember }),
    });

    if (!data || !data.ok) {
      throw new Error("Login failed");
    }

    if (data.user) {
      setStoredUser(
        {
          ...data.user,
          authenticated: true,
          mfa_enabled: !!data.mfa_enabled,
          mfa_verified: false,
        },
        remember
      );
    }

    if (loginStatus) {
      loginStatus.textContent = data.mfa_required
        ? "Password accepted. Redirecting to security check..."
        : "Sign-in successful. Redirecting...";
    }

    return data;
  } catch (error) {
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
    await apiFetchJson("/auth/logout", { method: "POST" });
  } catch (_) {}

  clearStoredUser();
  window.location.replace("/login");
}

function logout() {
  logoutUser();
}

async function validateSession() {
  try {
    const data = await apiFetchJson("/auth/check", { method: "GET" });

    if (!data || data.authenticated !== true) {
      clearStoredUser();
      return {
        authenticated: false,
        mfaEnabled: false,
        mfaVerified: false,
        user: null,
      };
    }

    const user = updateStoredUserFromSessionState(data);

    return {
      authenticated: true,
      mfaEnabled: !!data.mfa_enabled,
      mfaVerified: !!data.mfa_verified,
      user,
      raw: data,
    };
  } catch (_) {
    clearStoredUser();
    return {
      authenticated: false,
      mfaEnabled: false,
      mfaVerified: false,
      user: null,
    };
  }
}

async function requireAuth() {
  const state = await validateSession();

  if (!state.authenticated) {
    window.location.replace("/login");
    return false;
  }

  if (!state.mfaEnabled) {
    window.location.replace("/mfa-setup");
    return false;
  }

  if (!state.mfaVerified) {
    window.location.replace("/mfa");
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
  getStoredUser,
  clearStoredUser,
  setStoredUser,
};
