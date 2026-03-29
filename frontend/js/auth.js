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

function clearStoredSessionMeta() {
  sessionStorage.removeItem("indicare_pending_mfa");
  localStorage.removeItem("indicare_pending_mfa");
  sessionStorage.removeItem("indicare_mfa_user");
  localStorage.removeItem("indicare_mfa_user");
}

function setPendingMfa(user, remember = false) {
  const raw = JSON.stringify({
    pending: true,
    remember: !!remember,
    user: user || null,
    created_at: new Date().toISOString()
  });

  if (remember) {
    localStorage.setItem("indicare_pending_mfa", raw);
    sessionStorage.removeItem("indicare_pending_mfa");
  } else {
    sessionStorage.setItem("indicare_pending_mfa", raw);
    localStorage.removeItem("indicare_pending_mfa");
  }

  if (user) {
    const userRaw = JSON.stringify(user);
    if (remember) {
      localStorage.setItem("indicare_mfa_user", userRaw);
      sessionStorage.removeItem("indicare_mfa_user");
    } else {
      sessionStorage.setItem("indicare_mfa_user", userRaw);
      localStorage.removeItem("indicare_mfa_user");
    }
  }
}

function getPendingMfa() {
  const raw =
    sessionStorage.getItem("indicare_pending_mfa") ||
    localStorage.getItem("indicare_pending_mfa");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getPendingMfaUser() {
  const raw =
    sessionStorage.getItem("indicare_mfa_user") ||
    localStorage.getItem("indicare_mfa_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function apiFetchJson(path, options = {}) {
  return apiRequest(path, options);
}

function redirectToLogin() {
  window.location.replace("/login");
}

function redirectAfterSuccessfulAuth() {
  window.location.replace("/assistant");
}

function redirectForMfaRequirement(data) {
  if (!data || data.mfa_required !== true) return false;

  if (data.mfa_enabled) {
    window.location.replace("/mfa");
  } else {
    window.location.replace("/mfa-setup");
  }

  return true;
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

    clearStoredUser();
    clearStoredSessionMeta();

    if (data.user) {
      setPendingMfa(data.user, remember);
    }

    if (loginStatus) {
      loginStatus.textContent = data.mfa_required
        ? "Password accepted. Continuing to multi-factor sign-in..."
        : "Sign-in successful. Redirecting...";
    }

    if (redirectForMfaRequirement(data)) {
      return data;
    }

    if (data.user) {
      setStoredUser(data.user, remember);
    }

    redirectAfterSuccessfulAuth();
    return data;
  } catch (error) {
    clearStoredUser();
    clearStoredSessionMeta();
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
  } catch (_) {}

  clearStoredUser();
  clearStoredSessionMeta();
  redirectToLogin();
}

function logout() {
  logoutUser();
}

async function validateSession() {
  try {
    const data = await apiFetchJson("/auth/check", { method: "GET" });

    if (!data || data.authenticated !== true) {
      clearStoredUser();
      clearStoredSessionMeta();
      return false;
    }

    if (data.mfa_enabled && data.mfa_verified !== true) {
      const existingPending = getPendingMfa();
      const remember = existingPending ? !!existingPending.remember : !!localStorage.getItem("current_user");
      const pendingUser = getPendingMfaUser() || getStoredUser() || {
        id: data.user_id,
        email: data.email,
        role: data.role,
        home_id: data.home_id,
        is_active: data.is_active,
        subscription_status: data.subscription_status,
        plan_name: data.plan_name,
        mfa_enabled: data.mfa_enabled,
        mfa_verified: data.mfa_verified,
      };

      clearStoredUser();
      setPendingMfa(pendingUser, remember);
      window.location.replace("/mfa");
      return false;
    }

    const existing = getStoredUser() || getPendingMfaUser() || {};
    const remember = !!localStorage.getItem("current_user");

    setStoredUser(
      {
        ...existing,
        id: data.user_id,
        email: data.email,
        role: data.role,
        home_id: data.home_id,
        is_active: data.is_active,
        subscription_status: data.subscription_status,
        plan_name: data.plan_name,
        subscription_active: data.subscription_active,
        mfa_enabled: data.mfa_enabled,
        mfa_verified: data.mfa_verified,
      },
      remember
    );

    clearStoredSessionMeta();
    return true;
  } catch (_) {
    clearStoredUser();
    clearStoredSessionMeta();
    return false;
  }
}

async function requireAuth() {
  const ok = await validateSession();
  if (!ok) {
    redirectToLogin();
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
  getPendingMfa,
  getPendingMfaUser,
  clearStoredUser,
};
