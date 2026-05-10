(() => {
  const PUBLIC_PATHS = new Set([
    "/login",
    "/login.html",
    "/mfa",
    "/mfa.html",
    "/mfa-setup",
    "/mfa-setup.html",
    "/mfa-recovery",
    "/mfa-recovery.html",
    "/access-denied",
    "/access-denied.html",
  ]);

  function currentPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function isPublic() {
    return PUBLIC_PATHS.has(currentPath());
  }

  async function enforceAuth() {
    if (isPublic()) return true;
    if (!window.auth || typeof window.auth.requireAuth !== "function") {
      window.location.replace("/login");
      return false;
    }
    return await window.auth.requireAuth();
  }

  window.IndiCareRouteGuard = Object.freeze({
    enforceAuth,
    isPublic,
  });
})();
