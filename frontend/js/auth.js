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

function rememberPreference() {
  return !!localStorage.getItem("current_user");
}

function setStatus(loginStatus, message, isError = false) {
  if (!loginStatus) return;
  loginStatus.textContent = message || "";
  loginStatus.classList.remove("is-error", "is-success");
  if (isError) {
    loginStatus.classList.add("is-error");
  } else if (message) {
    loginStatus.classList.add("is-success");
  }
}

async function apiFetchJson(path, options = {}) {
  return apiRequest(path, options);
}

function buildStoredUser(existing, authData) {
  return {
    ...existing,
    id: authData?.user_id ?? authData?.user?.id ?? existing?.id,
    email: authData?.email ?? authData?.user?.email ?? existing?.email,
    role: authData?.role ?? authData?.user?.role ?? existing?.role,
    home_id: authData?.home_id ?? authData?.user?.home_id ?? existing?.home_id,
    first_name: authData?.user?.first_name ?? existing?.first_name,
    last_name: authData?.user?.last_name ?? existing?.last_name,
    is_active: authData?.is_active ?? authData?.user?.is_active ?? existing?.is_active,
    subscription_active:
      authData?.subscription_active ??
      authData?.user?.subscription_active ??
      existing?.subscription_active,
    subscription_status:
      authData?.subscription_status ??
      authData?.user?.subscription_status ??
      existing?.subscription_status,
    plan_name:
      authData?.plan_name ??
      authData?.user?.plan_name ??
      existing?.plan_name,
    mfa_enabled:
      authData?.mfa_enabled ??
      authData?.user?.mfa_enabled ??
      existing?.mfa_enabled ??
      false,
    mfa_verified:
      authData?.mfa_verified ??
      authData?.user?.mfa_verified ??
      existing?.mfa_verified ??
      false,
  };
}

function redirectForAuthState(authData) {
  const mfaEnabled =
    authData?.mfa_enabled ??
    authData?.user?.mfa_enabled ??
    false;

  const mfaVerified =
    authData?.mfa_verified ??
    authData?.user?.mfa_verified ??
    false;

  if (!mfaEnabled) {
    window.location.href = "/mfa-setup";
    return;
  }

  if (!mfaVerified) {
    window.location.href = "/mfa";
    return;
  }

  window.location.href = "/assistant";
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
    setStatus(loginStatus, "Please enter your email and password.", true);
    throw new Error("Please enter your email and password");
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
  }

  setStatus(loginStatus, "Checking your details...");

  try {
    const data = await apiFetchJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
    });

    if (!data || !data.ok) {
      throw new Error("Login failed");
    }

    const stored = buildStoredUser({}, data);
    setStoredUser(stored, remember);

    setStatus(loginStatus, "Sign-in successful. Redirecting...");

    redirectForAuthState(data);
    return data;
  } catch (error) {
    clearStoredUser();
    const message = error?.message || "Login failed";
    setStatus(loginStatus, message, true);
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
        fullyAuthenticated: false,
        mfaEnabled: false,
        mfaVerified: false,
      };
    }

    const existing = getStoredUser() || {};
    const remember = rememberPreference();

    const merged = buildStoredUser(existing, data);
    setStoredUser(merged, remember);

    return {
      authenticated: true,
      fullyAuthenticated: data.mfa_enabled === true && data.mfa_verified === true,
      mfaEnabled: data.mfa_enabled === true,
      mfaVerified: data.mfa_verified === true,
      user: merged,
    };
  } catch (_) {
    clearStoredUser();
    return {
      authenticated: false,
      fullyAuthenticated: false,
      mfaEnabled: false,
      mfaVerified: false,
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

async function redirectIfAlreadySignedIn() {
  const state = await validateSession();

  if (!state.authenticated) return false;

  if (!state.mfaEnabled) {
    window.location.replace("/mfa-setup");
    return true;
  }

  if (!state.mfaVerified) {
    window.location.replace("/mfa");
    return true;
  }

  window.location.replace("/assistant");
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
  redirectIfAlreadySignedIn,
};
