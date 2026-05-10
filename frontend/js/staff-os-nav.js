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
    "/forgot-password",
    "/privacy",
    "/support",
    "/terms",
  ]);

  const FALLBACK_NAV_LINKS = [
    { href: "/care-os", title: "Care OS", subtitle: "Main workspace", roles: ["staff", "manager", "provider"] },
    { href: "/care-os#young-people", title: "Young people", subtitle: "Profiles and records", roles: ["staff", "manager", "provider"] },
    { href: "/care-os#safeguarding", title: "Safeguarding", subtitle: "Risk and safety", roles: ["staff", "manager", "provider"] },
    { href: "/care-os#documents", title: "Documents", subtitle: "Files and evidence", roles: ["staff", "manager", "provider"] },
    { href: "/care-os#assistant", title: "Assistant", subtitle: "Guidance and summaries", roles: ["staff", "manager", "provider"] },
    { href: "/security-centre", title: "Security Centre", subtitle: "Sessions and devices", roles: ["staff", "manager", "provider"] },
  ];

  const fallbackRestrictedPaths = FALLBACK_NAV_LINKS.reduce((acc, item) => {
    const path = item.href.split("#")[0];
    acc[path] = item.roles || [];
    acc[`${path}.html`] = item.roles || [];
    return acc;
  }, {});

  function permissions() { return window.IndiCarePermissions || {}; }
  function restrictedPaths() { return permissions().RESTRICTED_PATHS || fallbackRestrictedPaths; }
  function currentPath() { return window.location.pathname.replace(/\/$/, "") || "/"; }
  function isEmbeddedMode() { try { return new URLSearchParams(window.location.search).get("embedded") === "1" || window.self !== window.top; } catch (_) { return false; } }
  function isPublicPage() { return PUBLIC_PATHS.has(currentPath()); }
  function currentRoleGroup() { return permissions().currentRoleGroup?.() || "staff"; }
  function roleCanAccess(allowed = [], roleGroup = currentRoleGroup()) { if (permissions().roleCanAccess) return permissions().roleCanAccess(allowed, roleGroup); if (!Array.isArray(allowed) || allowed.length === 0) return true; return allowed.includes(roleGroup); }
  function loginRedirect() { window.location.replace(`/login?next=${encodeURIComponent("/care-os")}`); }
  function accessDeniedRedirect() { const blocked = encodeURIComponent(window.location.pathname + window.location.search); window.location.replace(`/access-denied?blocked=${blocked}`); }

  function showAccessDenied(roleGroup) {
    const banner = document.getElementById("indicareAccessDenied") || document.createElement("div");
    banner.id = "indicareAccessDenied";
    banner.className = "indicare-status-banner warning";
    banner.style.cssText = "margin:16px auto;max-width:1180px;position:relative;z-index:10;";
    banner.innerHTML = `<strong>Access limited.</strong> This area is not available for your current role (${roleGroup}).`;
    document.body.prepend(banner);
  }

  function enforceRoleAccess() {
    const path = currentPath();
    const allowed = restrictedPaths()[path];
    const roleGroup = currentRoleGroup();
    if (allowed && !roleCanAccess(allowed, roleGroup)) {
      showAccessDenied(roleGroup);
      window.setTimeout(accessDeniedRedirect, 500);
      return false;
    }
    return true;
  }

  async function requirePageAuth() {
    if (isPublicPage()) return true;
    if (window.IndiCareRouteGuard?.enforceAuth) {
      const ok = await window.IndiCareRouteGuard.enforceAuth();
      if (!ok) return false;
      return enforceRoleAccess();
    }
    if (!window.auth || typeof window.auth.requireAuth !== "function") {
      loginRedirect();
      return false;
    }
    try {
      const ok = await window.auth.requireAuth();
      if (!ok) return false;
      return enforceRoleAccess();
    } catch (error) {
      const banner = document.getElementById("indicareAuthError") || document.createElement("div");
      banner.id = "indicareAuthError";
      banner.textContent = error?.message || "You need to sign in to continue.";
      banner.style.cssText = "position:fixed;left:16px;right:16px;top:16px;z-index:99999;padding:12px 16px;border-radius:14px;background:#fff3cd;color:#4b3a00;border:1px solid #f0d98c;font-weight:700;";
      document.body.prepend(banner);
      return false;
    }
  }

  function removeLegacyTopNav() {
    const selectors = [
      ".indicare-global-nav",
      ".legacy-topnav",
      ".legacy-header",
      ".old-toolbar",
      ".topbar:not(.keep-topbar)",
      "header[role='banner'].indicare-global-nav",
    ];
    selectors.forEach((selector) => document.querySelectorAll(selector).forEach((node) => node.remove()));
    document.body.classList.add("indicare-no-legacy-topnav");
  }

  function injectNoNavStyles() {
    if (document.getElementById("indicareNoLegacyNavStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareNoLegacyNavStyles";
    style.textContent = `
      .indicare-global-nav,
      .legacy-topnav,
      .legacy-header,
      .old-toolbar,
      body > header.indicare-global-nav {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      body.indicare-no-legacy-topnav { padding-top: 0 !important; }
    `;
    document.head.appendChild(style);
  }

  function filterExistingLinksByRole() {
    const roleGroup = currentRoleGroup();
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href")?.replace(/\/$/, "");
      const allowed = restrictedPaths()[href];
      if (allowed && !roleCanAccess(allowed, roleGroup)) {
        link.setAttribute("hidden", "hidden");
        link.setAttribute("aria-hidden", "true");
      }
    });
  }

  function addSidebarLink(container, href, title, subtitle) {
    if (!container || isEmbeddedMode()) return;
    if ([...container.querySelectorAll("a")].some((link) => link.getAttribute("href") === href)) return;
    const allowed = restrictedPaths()[href];
    if (allowed && !roleCanAccess(allowed)) return;
    const link = document.createElement("a");
    link.href = href;
    link.style.display = "block";
    link.style.padding = "12px 14px";
    link.style.marginTop = "8px";
    link.style.border = "1px solid rgba(255,255,255,.16)";
    link.style.borderRadius = "14px";
    link.style.textDecoration = "none";
    link.style.color = "inherit";
    link.innerHTML = `<span style="display:block;font-weight:700">${title}</span><small style="display:block;opacity:.75">${subtitle}</small>`;
    container.appendChild(link);
  }

  async function loadStaffAlert() {
    if (isEmbeddedMode()) return;
    const footer = document.querySelector(".yp-sidebar-footer");
    if (!footer) return;
    addSidebarLink(footer, "/care-os", "Care OS", "Main workspace");
    addSidebarLink(footer, "/my-profile", "My Profile", "Training, supervision and actions");
    addSidebarLink(footer, "/security-centre", "Security Centre", "Sessions, passkeys and devices");
    addSidebarLink(footer, "/staff-profiles", "Staff Hub", "Team learning and oversight");
  }

  async function boot() {
    if (isEmbeddedMode()) document.body.classList.add("embedded-mode");
    injectNoNavStyles();
    removeLegacyTopNav();
    const ok = await requirePageAuth();
    if (!ok) return;
    removeLegacyTopNav();
    filterExistingLinksByRole();
    loadStaffAlert();
    new MutationObserver(removeLegacyTopNav).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
