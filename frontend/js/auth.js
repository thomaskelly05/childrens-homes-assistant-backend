const SAFE_USER_FIELDS = [
  "id",
  "user_id",
  "email",
  "role",
  "home_id",
  "homeId",
  "provider_id",
  "providerId",
  "first_name",
  "last_name",
  "is_active",
  "subscription_active",
  "subscription_status",
  "plan_name",
  "mfa_enabled",
  "mfa_verified",
  "mfa_pending",
  "has_passkeys",
  "authenticated",
  "allowed_home_ids",
  "allowedHomeIds",
];

function sanitiseStoredUser(user = {}) {
  const safe = {};
  for (const key of SAFE_USER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(user, key)) safe[key] = user[key];
  }
  return safe;
}

function setStoredUser(user, remember = false) {
  if (!user) return;
  const raw = JSON.stringify(sanitiseStoredUser(user));
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
  const raw = sessionStorage.getItem("current_user") || localStorage.getItem("current_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
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
  const allowedHomeIds = user.allowed_home_ids || user.allowedHomeIds || [];
  return sanitiseStoredUser({
    ...user,
    authenticated: !!user.authenticated,
    subscription_active: !!user.subscription_active,
    subscription_status: user.subscription_status || "inactive",
    plan_name: user.plan_name || null,
    provider_id: user.provider_id || user.providerId || null,
    providerId: user.providerId || user.provider_id || null,
    home_id: user.home_id || user.homeId || null,
    homeId: user.homeId || user.home_id || null,
    allowed_home_ids: allowedHomeIds,
    allowedHomeIds,
    mfa_enabled: !!user.mfa_enabled,
    mfa_verified: !!user.mfa_verified,
    mfa_pending: !!user.mfa_pending,
    has_passkeys: !!user.has_passkeys,
  });
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

  const email = credentialsArg?.email?.trim() || (emailInput ? emailInput.value.trim() : "");
  const password = credentialsArg?.password || (passwordInput ? passwordInput.value : "");
  const remember = typeof credentialsArg?.remember === "boolean" ? credentialsArg.remember : !!(rememberInput && rememberInput.checked);

  if (!email || !password) {
    if (loginStatus) loginStatus.textContent = "Please enter your email and password.";
    throw new Error("Please enter your email and password");
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
  }
  if (loginStatus) loginStatus.textContent = "Checking your details...";
  clearRecoveryCodes();

  try {
    const data = await apiFetchJson("/auth/login", { method: "POST", body: JSON.stringify({ email, password, remember }) });
    if (!data || !data.ok) throw new Error("Login failed");

    const user = data.user || {};
    const mfaPending = !!data.mfa_pending || !!data.mfa_required || !!user.mfa_pending;
    if (data.user) {
      setStoredUser(normaliseUserPatch({
        ...user,
        authenticated: !!data.authenticated && !mfaPending,
        mfa_enabled: !!user.mfa_enabled || !!data.mfa_enabled || mfaPending,
        mfa_verified: !!data.authenticated && !mfaPending,
        mfa_pending: mfaPending,
        has_passkeys: !!user.has_passkeys,
      }), remember);
    }

    if (loginStatus) loginStatus.textContent = mfaPending ? "Password accepted. Continuing to multi-factor verification..." : "Sign-in successful. Redirecting...";
    return data;
  } catch (error) {
    clearStoredUser();
    if (loginStatus) loginStatus.textContent = error?.message || "Login failed";
    throw error;
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Sign in with password";
    }
  }
}

async function logoutUser() {
  try { await apiRequest("/auth/logout", { method: "POST" }); } catch (_) {}
  clearStoredUser();
  window.location.replace("/login");
}

function logout() { logoutUser(); }

async function validateSession() {
  try {
    const data = await apiFetchJson("/auth/check", { method: "GET" });
    const existing = getStoredUser() || {};
    const remember = shouldRememberUser();

    if (data?.mfa_pending) {
      const merged = normaliseUserPatch({
        ...existing,
        authenticated: false,
        user_id: data.user_id || existing.user_id || existing.id || null,
        id: data.user_id || existing.id || null,
        subscription_active: false,
        mfa_enabled: true,
        mfa_verified: false,
        mfa_pending: true,
      });
      setStoredUser(merged, remember);
      return { ...merged, authenticated: false, mfa_pending: true, expires_in_seconds: data.expires_in_seconds ?? null };
    }

    if (!data || data.authenticated !== true) {
      clearStoredUser();
      return normaliseUserPatch({ authenticated: false });
    }

    const merged = normaliseUserPatch({
      ...existing,
      authenticated: true,
      id: data.user_id,
      user_id: data.user_id,
      email: data.email,
      role: data.role,
      home_id: data.home_id,
      provider_id: data.provider_id || existing.provider_id || null,
      allowed_home_ids: data.allowed_home_ids || existing.allowed_home_ids || [],
      is_active: data.is_active,
      subscription_active: !!data.subscription_active,
      subscription_status: data.subscription_status || "inactive",
      plan_name: data.plan_name || null,
      mfa_enabled: !!data.mfa_enabled,
      mfa_verified: !!data.mfa_verified,
      mfa_pending: false,
    });
    setStoredUser(merged, remember);
    return { ...merged, authenticated: true, mfa_pending: false };
  } catch (_) {
    clearStoredUser();
    return normaliseUserPatch({ authenticated: false });
  }
}

async function requireAuth() {
  const state = await validateSession();
  if (state.mfa_pending) { window.location.replace("/mfa"); return false; }
  if (!state.authenticated) { window.location.replace("/login"); return false; }
  if (!state.subscription_active && !["admin", "provider_admin", "founder", "owner", "super_admin", "superadmin"].includes(String(state.role || "").toLowerCase())) {
    throw new Error("Subscription required");
  }
  if (!state.mfa_enabled) { window.location.replace("/mfa-setup"); return false; }
  if (!state.mfa_verified) { window.location.replace("/mfa"); return false; }
  return true;
}

async function requireRole(allowedRoles = []) {
  const ok = await requireAuth();
  if (!ok) return false;
  const user = getStoredUser() || {};
  const role = String(user.role || "").toLowerCase();
  if (!allowedRoles.map((item) => String(item).toLowerCase()).includes(role)) {
    window.location.replace(`/access-denied?blocked=${encodeURIComponent(window.location.pathname)}`);
    return false;
  }
  return true;
}

async function stepUpForSensitiveAction() {
  const data = await apiFetchJson("/auth/step-up", { method: "POST" });
  return !!data?.ok;
}

async function verifyMfaCode(code) {
  const data = await apiFetchJson("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code }) });
  if (!data?.ok) throw new Error("Verification failed");
  updateStoredUser({ authenticated: true, mfa_enabled: true, mfa_verified: true, mfa_pending: false, has_passkeys: !!data.has_passkeys, ...(data.user || {}) });
  return data;
}

async function verifyRecoveryCode(recoveryCode) {
  const data = await apiFetchJson("/auth/mfa/recovery", { method: "POST", body: JSON.stringify({ code: recoveryCode }) });
  if (!data?.ok) throw new Error("Recovery verification failed");
  updateStoredUser({ authenticated: true, mfa_enabled: true, mfa_verified: true, mfa_pending: false, has_passkeys: !!data.has_passkeys, ...(data.user || {}) });
  return data;
}

async function getMfaStatus() { return apiFetchJson("/auth/mfa/status", { method: "GET" }); }
async function beginMfaSetup() { return apiFetchJson("/auth/mfa/setup", { method: "GET" }); }

async function completeMfaSetup(code) {
  const data = await apiFetchJson("/auth/mfa/setup", { method: "POST", body: JSON.stringify({ code }) });
  if (!data?.ok) throw new Error("MFA setup failed");
  updateStoredUser({ authenticated: true, mfa_enabled: true, mfa_verified: true, mfa_pending: false, has_passkeys: !!data.has_passkeys, ...(data.user || {}) });
  if (Array.isArray(data.recovery_codes) && data.recovery_codes.length) saveRecoveryCodes(data.recovery_codes);
  return data;
}

async function regenerateRecoveryCodes(code) {
  const data = await apiFetchJson("/auth/mfa/recovery-codes/regenerate", { method: "POST", body: JSON.stringify({ code }) });
  if (!data?.ok) throw new Error("Could not regenerate recovery codes");
  if (Array.isArray(data.recovery_codes) && data.recovery_codes.length) saveRecoveryCodes(data.recovery_codes);
  return data;
}

async function beginPasskeyLogin(email) {
  if (!window.PublicKeyCredential) throw new Error("Passkeys are not supported on this device or browser.");
  const cleanedEmail = String(email || "").trim().toLowerCase();
  if (!cleanedEmail) throw new Error("Enter your work email address to use passkey sign-in.");
  const data = await apiFetchJson("/auth/passkeys/authenticate/options", { method: "POST", body: JSON.stringify({ email: cleanedEmail }) });
  if (!data?.ok || !data?.options) throw new Error("Could not start passkey sign-in");
  const jsonOptions = typeof data.options === "string" ? JSON.parse(data.options) : data.options;
  if (typeof PublicKeyCredential.parseRequestOptionsFromJSON !== "function") throw new Error("This browser does not support JSON passkey options.");
  const credential = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions) });
  if (!credential || typeof credential.toJSON !== "function") throw new Error("Passkey sign-in was cancelled.");
  const verified = await apiFetchJson("/auth/passkeys/authenticate/verify", { method: "POST", body: JSON.stringify({ credential: credential.toJSON() }) });
  if (!verified?.ok) throw new Error("Passkey sign-in failed");
  updateStoredUser({ authenticated: true, mfa_enabled: true, mfa_verified: true, mfa_pending: false, ...(verified.user || {}), has_passkeys: true });
  return verified;
}

async function registerPasskey(nickname = "") {
  if (!window.PublicKeyCredential) throw new Error("Passkeys are not supported on this device or browser.");
  const data = await apiFetchJson("/auth/passkeys/register/options", { method: "POST" });
  if (!data?.ok || !data?.options) throw new Error("Could not start passkey registration");
  const jsonOptions = typeof data.options === "string" ? JSON.parse(data.options) : data.options;
  if (typeof PublicKeyCredential.parseCreationOptionsFromJSON !== "function") throw new Error("This browser does not support JSON passkey options.");
  const credential = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions) });
  if (!credential || typeof credential.toJSON !== "function") throw new Error("Passkey registration was cancelled.");
  const result = await apiFetchJson("/auth/passkeys/register/verify", { method: "POST", body: JSON.stringify({ credential: credential.toJSON(), nickname }) });
  updateStoredUser({ has_passkeys: true });
  return result;
}

async function listPasskeys() { return apiFetchJson("/auth/passkeys", { method: "GET" }); }
async function deletePasskey(passkeyId) { return apiFetchJson(`/auth/passkeys/${passkeyId}`, { method: "DELETE" }); }
async function getPasskeyPromptStatus() { return apiFetchJson("/auth/passkeys/status", { method: "GET" }); }
async function listSessions() { return apiFetchJson("/session-security/sessions", { method: "GET" }); }
async function revokeSession(sessionId) { return apiFetchJson("/session-security/revoke", { method: "POST", body: JSON.stringify({ session_id: sessionId }) }); }
async function revokeAllOtherSessions() { return apiFetchJson("/session-security/revoke-all", { method: "POST" }); }

function bindDefaultSecurityControls() {
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", logout);
  document.querySelectorAll("[data-require-step-up]").forEach((el) => {
    el.addEventListener("click", async (event) => {
      try { await stepUpForSensitiveAction(); } catch (error) { event.preventDefault(); alert(error?.message || "Recent verification required"); }
    });
  });
}

document.addEventListener("DOMContentLoaded", bindDefaultSecurityControls);

window.auth = {
  login,
  logout,
  logoutUser,
  requireAuth,
  requireRole,
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
  stepUpForSensitiveAction,
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
};
