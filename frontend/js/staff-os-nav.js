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
    { href: "/care-os#academy", title: "Academy", subtitle: "Learning and evidence", roles: ["staff", "manager", "provider"] },
    { href: "/care-os#assistant", title: "Assistant", subtitle: "Guidance and summaries", roles: ["staff", "manager", "provider"] },
  ];

  const fallbackRestrictedPaths = FALLBACK_NAV_LINKS.reduce((acc, item) => {
    const path = item.href.split("#")[0];
    acc[path] = item.roles || [];
    acc[`${path}.html`] = item.roles || [];
    return acc;
  }, {});

  function permissions() { return window.IndiCarePermissions || {}; }

  function navLinks() {
    const links = permissions().NAV_LINKS || FALLBACK_NAV_LINKS;
    return links.map((item) => {
      const href = String(item.href || "");
      if (href === "/young-people-shell" || href === "/young-people-shell.html" || href === "/childrens-home-os") return { ...item, href: "/care-os", title: "Care OS" };
      const map = {
        "/young-people": "/care-os#young-people",
        "/safeguarding-hub": "/care-os#safeguarding",
        "/documents-hub": "/care-os#documents",
        "/academy": "/care-os#academy",
        "/assistant": "/care-os#assistant",
        "/quality-hub": "/care-os#quality",
        "/journal": "/care-os#journal",
        "/supervision": "/care-os#supervision",
        "/ai-notes": "/care-os#ai-notes",
        "/ai-note": "/care-os#ai-notes",
        "/rostering": "/care-os#rostering",
        "/staff-profiles": "/care-os#staff",
        "/admin-users": "/care-os#admin",
        "/founder-hq": "/care-os#founder",
        "/os-dashboard": "/care-os#intelligence",
      };
      return map[href] ? { ...item, href: map[href] } : item;
    });
  }

  function restrictedPaths() { return permissions().RESTRICTED_PATHS || fallbackRestrictedPaths; }
  function currentPath() { return window.location.pathname.replace(/\/$/, "") || "/"; }
  function isEmbeddedMode() { try { return new URLSearchParams(window.location.search).get("embedded") === "1" || window.self !== window.top; } catch (_) { return false; } }
  function isPublicPage() { return PUBLIC_PATHS.has(currentPath()); }
  function currentUser() { return window.auth?.getStoredUser?.() || {}; }
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
    if (!window.auth || typeof window.auth.requireAuth !== "function") { loginRedirect(); return false; }
    try { const ok = await window.auth.requireAuth(); if (!ok) return false; return enforceRoleAccess(); }
    catch (error) {
      const banner = document.getElementById("indicareAuthError") || document.createElement("div");
      banner.id = "indicareAuthError";
      banner.textContent = error?.message || "You need to sign in to continue.";
      banner.style.cssText = "position:fixed;left:16px;right:16px;top:16px;z-index:99999;padding:12px 16px;border-radius:14px;background:#fff3cd;color:#4b3a00;border:1px solid #f0d98c;font-weight:700;";
      document.body.prepend(banner);
      return false;
    }
  }

  function makeLink(href, title, subtitle = "") {
    const link = document.createElement("a");
    link.href = href;
    link.className = "indicare-global-nav-link";
    link.setAttribute("data-nav-href", href);
    const strong = document.createElement("span");
    strong.textContent = title;
    strong.className = "indicare-global-nav-title";
    link.appendChild(strong);
    if (subtitle) { const small = document.createElement("small"); small.textContent = subtitle; small.className = "indicare-global-nav-subtitle"; link.appendChild(small); }
    return link;
  }

  function injectStyles() {
    if (document.getElementById("indicareGlobalNavStyles")) return;
    const style = document.createElement("style");
    style.id = "indicareGlobalNavStyles";
    style.textContent = `
      .indicare-global-nav{position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:rgba(255,255,255,.96);border-bottom:1px solid rgba(15,23,42,.1);box-shadow:0 10px 28px rgba(15,23,42,.08);backdrop-filter:blur(10px);color:#10201f}
      .indicare-global-nav-brand{display:flex;align-items:center;gap:10px;min-width:max-content;font-weight:900}
      .indicare-global-nav-mark{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:#163b3a;color:#fff;font-size:13px}
      .indicare-global-nav-links{display:flex;gap:8px;overflow-x:auto;padding:2px}
      .indicare-global-nav-link{display:block;min-width:max-content;padding:8px 11px;border:1px solid #d7e1de;border-radius:12px;background:#fff;color:#163b3a;text-decoration:none;line-height:1.15}
      .indicare-global-nav-link[aria-current="page"]{background:#163b3a;color:#fff;border-color:#163b3a}
      .indicare-global-nav-title{display:block;font-size:13px;font-weight:900}
      .indicare-global-nav-subtitle{display:block;margin-top:2px;font-size:11px;opacity:.72}
      .indicare-global-nav-actions{display:flex;gap:8px;align-items:center}
      .indicare-global-nav-user{font-size:12px;color:#55706d;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .indicare-global-nav-role{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;background:#e8f1ef;color:#163b3a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
      .indicare-global-nav-button{border:1px solid #d7e1de;border-radius:12px;background:#fff;color:#163b3a;padding:8px 11px;font-weight:900;cursor:pointer}
      @media (max-width:900px){.indicare-global-nav{align-items:flex-start;flex-direction:column}.indicare-global-nav-links{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function shouldSkipTopNav() { if (isPublicPage()) return true; if (isEmbeddedMode()) return true; if (document.body?.dataset?.skipGlobalNav === "true") return true; return Boolean(document.querySelector(".indicare-global-nav")); }

  function injectTopNav() {
    if (shouldSkipTopNav()) return;
    injectStyles();
    const nav = document.createElement("header");
    nav.className = "indicare-global-nav";
    nav.setAttribute("role", "banner");
    const brand = document.createElement("a");
    brand.href = "/care-os";
    brand.className = "indicare-global-nav-brand";
    brand.style.textDecoration = "none";
    brand.style.color = "inherit";
    brand.innerHTML = `<span class="indicare-global-nav-mark">IC</span><span>IndiCare OS</span>`;
    const links = document.createElement("nav");
    links.className = "indicare-global-nav-links";
    links.setAttribute("aria-label", "IndiCare OS navigation");
    const path = currentPath();
    const roleGroup = currentRoleGroup();
    for (const item of navLinks()) {
      if (!roleCanAccess(item.roles, roleGroup)) continue;
      const link = makeLink(item.href, item.title, item.subtitle);
      const linkPath = String(item.href || "").split("#")[0];
      if (path === linkPath || path === `${linkPath}.html`) link.setAttribute("aria-current", "page");
      links.appendChild(link);
    }
    const actions = document.createElement("div");
    actions.className = "indicare-global-nav-actions";
    const storedUser = currentUser();
    const user = document.createElement("span");
    user.className = "indicare-global-nav-user";
    user.textContent = storedUser.email || storedUser.role || "Signed in";
    const role = document.createElement("span");
    role.className = "indicare-global-nav-role";
    role.textContent = roleGroup;
    const logout = document.createElement("button");
    logout.className = "indicare-global-nav-button";
    logout.type = "button";
    logout.textContent = "Sign out";
    logout.addEventListener("click", () => window.auth?.logout?.());
    actions.appendChild(user); actions.appendChild(role); actions.appendChild(logout);
    nav.appendChild(brand); nav.appendChild(links); nav.appendChild(actions); document.body.prepend(nav);
  }

  function addSidebarLink(container, href, title, subtitle) {
    if (!container || isEmbeddedMode()) return;
    if ([...container.querySelectorAll("a")].some((link) => link.getAttribute("href") === href)) return;
    const allowed = restrictedPaths()[href]; if (allowed && !roleCanAccess(allowed)) return;
    const link = document.createElement("a"); link.href = href; link.style.display = "block"; link.style.padding = "12px 14px"; link.style.marginTop = "8px"; link.style.border = "1px solid rgba(255,255,255,.16)"; link.style.borderRadius = "14px"; link.style.textDecoration = "none"; link.style.color = "inherit";
    const strong = document.createElement("span"); strong.textContent = title; strong.style.display = "block"; strong.style.fontWeight = "700";
    const small = document.createElement("small"); small.textContent = subtitle; small.style.display = "block"; small.style.opacity = ".75";
    link.appendChild(strong); link.appendChild(small); container.appendChild(link);
  }

  function filterExistingLinksByRole() {
    const roleGroup = currentRoleGroup();
    document.querySelectorAll("a[href]").forEach((link) => { const href = link.getAttribute("href")?.replace(/\/$/, ""); const allowed = restrictedPaths()[href]; if (allowed && !roleCanAccess(allowed, roleGroup)) { link.setAttribute("hidden", "hidden"); link.setAttribute("aria-hidden", "true"); } });
  }

  async function loadStaffAlert() {
    if (isEmbeddedMode()) return;
    const footer = document.querySelector(".yp-sidebar-footer");
    if (!footer) return;
    addSidebarLink(footer, "/care-os", "Care OS", "Main workspace");
    addSidebarLink(footer, "/my-profile", "My Profile", "Training, supervision and actions");
    addSidebarLink(footer, "/staff-profiles", "Staff Hub", "Team learning and oversight");
  }

  async function boot() { if (isEmbeddedMode()) document.body.classList.add("embedded-mode"); const ok = await requirePageAuth(); if (!ok) return; filterExistingLinksByRole(); injectTopNav(); loadStaffAlert(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
