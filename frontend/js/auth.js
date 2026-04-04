function setStoredUser(user, remember = false) {
  if (!user) return;

  const raw = JSON.stringify(user);

  if (remember) {
    localStorage.setItem("current_user", raw);
    sessionStorage.removeItem("current_user");
    localStorage.setItem("indicare_remember_me", "true");
  } else {
    sessionStorage.setItem("current_user", raw);
    localStorage.removeItem("current_user");
    localStorage.removeItem("indicare_remember_me");
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

function shouldRememberUser() {
  return localStorage.getItem("indicare_remember_me") === "true";
}

function clearStoredUser() {
  sessionStorage.removeItem("current_user");
  localStorage.removeItem("current_user");
  sessionStorage.removeItem("indicare_recovery_codes");
  localStorage.removeItem("indicare_recovery_codes");
  localStorage.removeItem("indicare_remember_me");
}

async function apiFetchJson(path, options = {}) {
  return apiRequest(path, options);
}

function saveRecoveryCodes(codes) {
  if (!Array.isArray(codes) || !codes.length) return;
  sessionStorage.setItem("indicare_recovery_codes", JSON.stringify(codes));
}

function clearRecoveryCodes() {
  sessionStorage.removeItem("indicare_recovery_codes");
  localStorage.removeItem("indicare_recovery_codes");
}

function normaliseUserPatch(user = {}) {
  return {
    ...user,
    subscription_active: !!user.subscription_active,
    subscription_status: user.subscription_status || "inactive",
    plan_name: user.plan_name || null,
    mfa_enabled: !!user.mfa_enabled,
    mfa_verified: !!user.mfa_verified,
    mfaEnabled: !!user.mfa_enabled,
    mfaVerified: !!user.mfa_verified,
  };
}

function updateStoredUser(patch = {}) {
  const existing = getStoredUser() || {};
  const remember = shouldRememberUser();
  const merged = normaliseUserPatch({ ...existing, ...patch });
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

  clearRecoveryCodes();

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
        normaliseUserPatch({
          ...data.user,
          mfa_enabled: !!data.mfa_enabled,
          mfa_verified: false,
        }),
        remember
      );
    }

    if (loginStatus) {
      loginStatus.textContent = data.mfa_required
        ? "Password accepted. Continuing to multi-factor verification..."
        : "Sign-in successful. Redirecting...";
    }

    if (data.mfa_required) {
      window.location.href = data.mfa_enabled ? "/mfa" : "/mfa-setup";
      return data;
    }

    window.location.href = "/assistant";
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
        subscription_active: false,
        mfa_enabled: false,
        mfa_verified: false,
        mfaEnabled: false,
        mfaVerified: false,
      };
    }

    const existing = getStoredUser() || {};
    const remember = shouldRememberUser();

    const merged = normaliseUserPatch({
      ...existing,
      id: data.user_id,
      user_id: data.user_id,
      email: data.email,
      role: data.role,
      home_id: data.home_id,
      is_active: data.is_active,
      subscription_active: !!data.subscription_active,
      subscription_status: data.subscription_status || "inactive",
      plan_name: data.plan_name || null,
      mfa_enabled: !!data.mfa_enabled,
      mfa_verified: !!data.mfa_verified,
    });

    setStoredUser(merged, remember);

    return {
      authenticated: true,
      user_id: data.user_id,
      email: data.email,
      role: data.role,
      home_id: data.home_id,
      is_active: data.is_active,
      subscription_active: !!data.subscription_active,
      subscription_status: data.subscription_status || "inactive",
      plan_name: data.plan_name || null,
      mfa_enabled: !!data.mfa_enabled,
      mfa_verified: !!data.mfa_verified,
      mfaEnabled: !!data.mfa_enabled,
      mfaVerified: !!data.mfa_verified,
    };
  } catch (_) {
    clearStoredUser();
    return {
      authenticated: false,
      subscription_active: false,
      mfa_enabled: false,
      mfa_verified: false,
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

  if (
    !state.subscription_active &&
    !["admin", "provider_admin"].includes(String(state.role || "").toLowerCase())
  ) {
    throw new Error("Subscription required");
  }

  if (!state.mfa_enabled) {
    window.location.replace("/mfa-setup");
    return false;
  }

  if (!state.mfa_verified) {
    window.location.replace("/mfa");
    return false;
  }

  return true;
}

async function verifyMfaCode(code) {
  const data = await apiFetchJson("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (!data?.ok) {
    throw new Error("Verification failed");
  }

  updateStoredUser({
    mfa_enabled: true,
    mfa_verified: true,
  });

  return data;
}

async function verifyRecoveryCode(recoveryCode) {
  const data = await apiFetchJson("/auth/mfa/recovery", {
    method: "POST",
    body: JSON.stringify({ code: recoveryCode }),
  });

  if (!data?.ok) {
    throw new Error("Recovery verification failed");
  }

  updateStoredUser({
    mfa_enabled: true,
    mfa_verified: true,
  });

  return data;
}

async function getMfaStatus() {
  return apiFetchJson("/auth/mfa/status", { method: "GET" });
}

async function beginMfaSetup() {
  return apiFetchJson("/auth/mfa/setup", { method: "GET" });
}

async function completeMfaSetup(code) {
  const data = await apiFetchJson("/auth/mfa/setup", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (!data?.ok) {
    throw new Error("MFA setup failed");
  }

  updateStoredUser({
    mfa_enabled: true,
    mfa_verified: true,
  });

  if (Array.isArray(data.recovery_codes) && data.recovery_codes.length) {
    saveRecoveryCodes(data.recovery_codes);
  }

  return data;
}

async function regenerateRecoveryCodes(code) {
  const data = await apiFetchJson("/auth/mfa/recovery-codes/regenerate", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  if (!data?.ok) {
    throw new Error("Could not regenerate recovery codes");
  }

  if (Array.isArray(data.recovery_codes) && data.recovery_codes.length) {
    saveRecoveryCodes(data.recovery_codes);
  }

  return data;
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
  updateStoredUser,
  verifyMfaCode,
  verifyRecoveryCode,
  getMfaStatus,
  beginMfaSetup,
  completeMfaSetup,
  regenerateRecoveryCodes,
  saveRecoveryCodes,
  clearRecoveryCodes,
  shouldRememberUser,
};
