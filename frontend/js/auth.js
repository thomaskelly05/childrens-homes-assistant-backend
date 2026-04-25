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
    authenticated: !!user.authenticated,
    subscription_active: !!user.subscription_active,
    subscription_status: user.subscription_status || "inactive",
    plan_name: user.plan_name || null,
    provider_id: user.provider_id || user.providerId || null,
    providerId: user.providerId || user.provider_id || null,
    home_id: user.home_id || user.homeId || null,
    homeId: user.homeId || user.home_id || null,
    mfa_enabled: !!user.mfa_enabled,
    mfa_verified: !!user.mfa_verified,
    mfa_pending: !!user.mfa_pending,
    has_passkeys: !!user.has_passkeys,
    mfaEnabled: !!user.mfa_enabled,
    mfaVerified: !!user.mfa_verified,
    mfaPending: !!user.mfa_pending,
    hasPasskeys: !!user.has_passkeys,
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

    const user = data.user || {};

    const mfaPending =
      !!data.mfa_pending ||
      !!data.mfa_required ||
      !!data.mfa_mandatory ||
      !!user.mfa_pending;

    if (data.user) {
      setStoredUser(
        normaliseUserPatch({
          ...user,
          authenticated: !!data.authenticated && !mfaPending,
          mfa_enabled:
            !!user.mfa_enabled ||
            !!data.mfa_enabled ||
            !!data.mfa_mandatory ||
            mfaPending,
          mfa_verified: !!data.authenticated && !mfaPending,
          mfa_pending: mfaPending,
          has_passkeys: !!user.has_passkeys,
        }),
        remember
      );
    }

    if (loginStatus) {
      if (mfaPending) {
        loginStatus.textContent =
          "Password accepted. Continuing to multi-factor verification...";
      } else {
        loginStatus.textContent = "Sign-in successful. Redirecting...";
      }
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
      loginButton.textContent = "Sign in with password";
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
    const data = await apiFetchJson("/auth/me", { method: "GET" });
    const user = data.user || {};
    const authenticated = data.ok === true && !!(user.id || user.user_id);

    const mfaEnabled =
      !!user.mfa_enabled ||
      !!data.mfa_enabled ||
      !!data.mfa_mandatory;

    const backendMfaVerified =
      !!user.mfa_verified ||
      !!data.mfa_verified;

    const mfaPending =
      !!data.mfa_pending ||
      !!data.mfa_required ||
      !!data.mfa_mandatory ||
      !!user.mfa_pending ||
      (mfaEnabled && !backendMfaVerified);

    if (!authenticated) {
      const existing = getStoredUser() || {};
      const remember = shouldRememberUser();

      if (mfaPending) {
        const merged = normaliseUserPatch({
          ...existing,
          authenticated: false,
          mfa_enabled: true,
          mfa_verified: false,
          mfa_pending: true,
        });

        setStoredUser(merged, remember);

        return {
          ...merged,
          authenticated: false,
          subscription_active: false,
          mfa_enabled: true,
          mfa_verified: false,
          mfa_pending: true,
          mfaEnabled: true,
          mfaVerified: false,
          mfaPending: true,
          expires_in_seconds: data.expires_in_seconds ?? null,
        };
      }

      clearStoredUser();

      return {
        authenticated: false,
        subscription_active: false,
        mfa_enabled: false,
        mfa_verified: false,
        mfa_pending: false,
        mfaEnabled: false,
        mfaVerified: false,
        mfaPending: false,
      };
    }

    const existing = getStoredUser() || {};
    const remember = shouldRememberUser();

    const merged = normaliseUserPatch({
      ...existing,
      ...user,
      authenticated: true,
      id: user.id || user.user_id,
      user_id: user.user_id || user.id,
      email: user.email,
      role: user.role,
      home_id: user.home_id || user.homeId || null,
      homeId: user.homeId || user.home_id || null,
      provider_id: user.provider_id || user.providerId || null,
      providerId: user.providerId || user.provider_id || null,
      is_active: user.is_active,
      subscription_active: !!user.subscription_active,
      subscription_status: user.subscription_status || "inactive",
      plan_name: user.plan_name || null,
      mfa_enabled: mfaEnabled,
      mfa_verified: !mfaPending,
      mfa_pending: mfaPending,
      has_passkeys: !!user.has_passkeys,
    });

    setStoredUser(merged, remember);

    return {
      ...merged,
      authenticated: true,
      user_id: merged.user_id,
      email: merged.email,
      role: merged.role,
      home_id: merged.home_id,
      homeId: merged.homeId,
      provider_id: merged.provider_id,
      providerId: merged.providerId,
      is_active: merged.is_active,
      subscription_active: !!merged.subscription_active,
      subscription_status: merged.subscription_status || "inactive",
      plan_name: merged.plan_name || null,
      mfa_enabled: mfaEnabled,
      mfa_verified: !mfaPending,
      mfa_pending: mfaPending,
      mfaEnabled: mfaEnabled,
      mfaVerified: !mfaPending,
      mfaPending: mfaPending,
    };
  } catch (_) {
    clearStoredUser();

    return {
      authenticated: false,
      subscription_active: false,
      mfa_enabled: false,
      mfa_verified: false,
      mfa_pending: false,
      mfaEnabled: false,
      mfaVerified: false,
      mfaPending: false,
    };
  }
}

async function requireAuth() {
  const state = await validateSession();

  if (state.mfa_pending) {
    window.location.replace("/mfa");
    return false;
  }

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
    authenticated: true,
    mfa_enabled: true,
    mfa_verified: true,
    mfa_pending: false,
    has_passkeys: !!data.has_passkeys,
    ...(data.user || {}),
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
    authenticated: true,
    mfa_enabled: true,
    mfa_verified: true,
    mfa_pending: false,
    has_passkeys: !!data.has_passkeys,
    ...(data.user || {}),
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
    authenticated: true,
    mfa_enabled: true,
    mfa_verified: true,
    mfa_pending: false,
    has_passkeys: !!data.has_passkeys,
    ...(data.user || {}),
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

async function beginPasskeyLogin(email) {
  if (!window.PublicKeyCredential) {
    throw new Error("Passkeys are not supported on this device or browser.");
  }

  const cleanedEmail = String(email || "").trim().toLowerCase();

  if (!cleanedEmail) {
    throw new Error("Enter your work email address to use passkey sign-in.");
  }

  const data = await apiFetchJson("/auth/passkeys/authenticate/options", {
    method: "POST",
    body: JSON.stringify({ email: cleanedEmail }),
  });

  if (!data?.ok || !data?.options) {
    throw new Error("Could not start passkey sign-in");
  }

  const jsonOptions =
    typeof data.options === "string" ? JSON.parse(data.options) : data.options;

  if (typeof PublicKeyCredential.parseRequestOptionsFromJSON !== "function") {
    throw new Error("This browser does not support JSON passkey options.");
  }

  const publicKey =
    PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions);

  const credential = await navigator.credentials.get({ publicKey });

  if (!credential || typeof credential.toJSON !== "function") {
    throw new Error("Passkey sign-in was cancelled.");
  }

  const credentialJson = credential.toJSON();

  const verified = await apiFetchJson("/auth/passkeys/authenticate/verify", {
    method: "POST",
    body: JSON.stringify({ credential: credentialJson }),
  });

  if (!verified?.ok) {
    throw new Error("Passkey sign-in failed");
  }

  updateStoredUser({
    authenticated: true,
    mfa_enabled: true,
    mfa_verified: true,
    mfa_pending: false,
    ...(verified.user || {}),
    has_passkeys: true,
  });

  return verified;
}

async function registerPasskey(nickname = "") {
  if (!window.PublicKeyCredential) {
    throw new Error("Passkeys are not supported on this device or browser.");
  }

  const data = await apiFetchJson("/auth/passkeys/register/options", {
    method: "POST",
  });

  if (!data?.ok || !data?.options) {
    throw new Error("Could not start passkey registration");
  }

  const jsonOptions =
    typeof data.options === "string" ? JSON.parse(data.options) : data.options;

  if (typeof PublicKeyCredential.parseCreationOptionsFromJSON !== "function") {
    throw new Error("This browser does not support JSON passkey options.");
  }

  const publicKey =
    PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions);

  const credential = await navigator.credentials.create({ publicKey });

  if (!credential || typeof credential.toJSON !== "function") {
    throw new Error("Passkey registration was cancelled.");
  }

  const credentialJson = credential.toJSON();

  const result = await apiFetchJson("/auth/passkeys/register/verify", {
    method: "POST",
    body: JSON.stringify({
      credential: credentialJson,
      nickname,
    }),
  });

  updateStoredUser({
    has_passkeys: true,
  });

  return result;
}

async function listPasskeys() {
  return apiFetchJson("/auth/passkeys", { method: "GET" });
}

async function deletePasskey(passkeyId) {
  return apiFetchJson(`/auth/passkeys/${passkeyId}`, {
    method: "DELETE",
  });
}

async function getPasskeyPromptStatus() {
  return apiFetchJson("/auth/passkeys/status", { method: "GET" });
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
  beginPasskeyLogin,
  registerPasskey,
  listPasskeys,
  deletePasskey,
  getPasskeyPromptStatus,
};
