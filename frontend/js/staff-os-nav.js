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

  const ROLE_GROUPS = Object.freeze({
    staff: new Set(["staff", "support_worker", "key_worker", "senior", "senior_staff"]),
    manager: new Set(["manager", "registered_manager", "deputy_manager", "home_manager"]),
    provider: new Set(["ri", "responsible_individual", "provider_admin", "admin", "administrator", "super_admin", "superadmin", "founder"]),
  });

  const NAV_LINKS = [
    { href: "/my-profile", title: "My Profile", subtitle: "My start page", roles: ["staff", "manager", "provider"] },
    { href: "/young-people-shell", title: "Care OS", subtitle: "Children's home workspace", roles: ["staff", "manager", "provider"] },
    { href: "/young-people", title: "Young people", subtitle: "Profiles and records", roles: ["staff", "manager", "provider"] },
    { href: "/safeguarding-hub", title: "Safeguarding", subtitle: "Risk and safety", roles: ["staff", "manager", "provider"] },
    { href: "/documents-hub", title: "Documents", subtitle: "Files and evidence", roles: ["staff", "manager", "provider"] },
    { href: "/academy", title: "Academy", subtitle: "Learning and evidence", roles: ["staff", "manager", "provider"] },
    { href: "/assistant", title: "Assistant", subtitle: "Guidance and summaries", roles: ["staff", "manager", "provider"] },
    { href: "/quality-hub", title: "Quality", subtitle: "Audit and assurance", roles: ["manager", "provider"] },
    { href: "/os-dashboard", title: "Dashboard", subtitle: "Oversight and trends", roles: ["manager", "provider"] },
    { href: "/rostering", title: "Rostering", subtitle: "Staffing and shifts", roles: ["manager", "provider"] },
    { href: "/staff-profiles", title: "Staff Hub", subtitle: "Team oversight", roles: ["manager", "provider"] },
    { href: "/admin-users", title: "Admin", subtitle: "Users and access", roles: ["provider"] },
    { href: "/founder-hq", title: "Founder HQ", subtitle: "Platform control", roles: ["provider"] },
  ];

  const RESTRICTED_PATHS = NAV_LINKS.reduce((acc, item) => {
    acc[item.href] = item.roles || [];
    acc[`${item.href}.html`] = item.roles || [];
    return acc;
  }, {});

  function currentPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function isPublicPage() {
    return PUBLIC_PATHS.has(currentPath());
  }

  function normaliseRole(role = "") {
    const value = String(role || "").trim().toLowerCase();
    if (ROLE_GROUPS.provider.has(value)) return "provider";
    if (ROLE_GROUPS.manager.has(value)) return "manager";
    return "staff";
  }

  function currentUser() {
    return window.auth?.getStoredUser?.() || {};
  }

  function currentRoleGroup() {
    return normaliseRole(currentUser().role);
  }

  function roleCanAccess(allowed = [], roleGroup = currentRoleGroup()) {
    if (!Array.isArray(allowed) || allowed.length === 0) return true;
    return allowed.includes(roleGroup);
  }

  function loginRedirect() {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }

  function accessDeniedRedirect() {
    const blocked = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/access-denied?blocked=${blocked}`);
  }

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
    const allowed = RESTRICTED_PATHS[path];
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

  function makeLink(href, title, subtitle = "") {
    const link = document.createElement("a");
    link.href = href;
    link.className = "indicare-global-nav-link";
    link.setAttribute("data-nav-href", href);
    const strong = document.createElement("span");
    strong.textContent = title;
    strong.className = "indicare-global-nav-title";
    link.appendChild(strong);
    if (subtitle) {
      const small = document.createElement("small");
      small.textContent = subtitle;
      small.className = "indicare-global-nav-subtitle";
      link.appendChild(small);
    }
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

  function shouldSkipTopNav() {
    if (isPublicPage()) return true;
    if (document.body?.dataset?.skipGlobalNav === "true") return true;
    return Boolean(document.querySelector(".indicare-global-nav"));
  }

  function injectTopNav() {
    if (shouldSkipTopNav()) return;
    injectStyles();
    const nav = document.createElement("header");
    nav.className = "indicare-global-nav";
    nav.setAttribute("role", "banner");
    const brand = document.createElement("a");
    brand.href = "/my-profile";
    brand.className = "indicare-global-nav-brand";
    brand.style.textDecoration = "none";
    brand.style.color = "inherit";
    brand.innerHTML = `<span class="indicare-global-nav-mark">IC</span><span>IndiCare OS</span>`;
    const links = document.createElement("nav");
    links.className = "indicare-global-nav-links";
    links.setAttribute("aria-label", "IndiCare OS navigation");
    const path = currentPath();
    const roleGroup = currentRoleGroup();
    for (const item of NAV_LINKS) {
      if (!roleCanAccess(item.roles, roleGroup)) continue;
      const link = makeLink(item.href, item.title, item.subtitle);
      if (path === item.href || path === `${item.href}.html`) link.setAttribute("aria-current", "page");
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
    actions.appendChild(user);
    actions.appendChild(role);
    actions.appendChild(logout);
    nav.appendChild(brand);
    nav.appendChild(links);
    nav.appendChild(actions);
    document.body.prepend(nav);
  }

  function addSidebarLink(container, href, title, subtitle) {
    if (!container) return;
    if ([...container.querySelectorAll("a")].some((link) => link.getAttribute("href") === href)) return;
    const allowed = RESTRICTED_PATHS[href];
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
    const strong = document.createElement("span");
    strong.textContent = title;
    strong.style.display = "block";
    strong.style.fontWeight = "700";
    const small = document.createElement("small");
    small.textContent = subtitle;
    small.style.display = "block";
    small.style.opacity = ".75";
    link.appendChild(strong);
    link.appendChild(small);
    container.appendChild(link);
  }

  function filterExistingLinksByRole() {
    const roleGroup = currentRoleGroup();
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href")?.replace(/\/$/, "");
      const allowed = RESTRICTED_PATHS[href];
      if (allowed && !roleCanAccess(allowed, roleGroup)) {
        link.setAttribute("hidden", "hidden");
        link.setAttribute("aria-hidden", "true");
      }
    });
  }

  async function loadStaffAlert() {
    const footer = document.querySelector(".yp-sidebar-footer");
    if (!footer) return;
    addSidebarLink(footer, "/my-profile", "My Profile", "Training, supervision and actions");
    addSidebarLink(footer, "/staff-profiles", "Staff Hub", "Team learning and oversight");
    try {
      const res = await fetch("/staff/me", { credentials: "include" });
      const json = await res.json();
      const data = json.data || {};
      const intelligence = ((data.academy || {}).intelligence) || {};
      const score = intelligence.priority_score || 0;
      const needs = intelligence.learning_needs || [];
      const actions = data.manager_actions || [];
      if (document.getElementById("staffAttentionCard")) return;
      const card = document.createElement("div");
      card.id = "staffAttentionCard";
      card.style.marginTop = "10px";
      card.style.padding = "12px";
      card.style.borderRadius = "14px";
      card.style.background = "rgba(255,255,255,.08)";
      card.style.fontSize = "13px";
      const title = document.createElement("strong");
      title.textContent = "My attention score: " + score;
      const details = document.createElement("span");
      details.textContent = needs.length + " learning needs | " + actions.length + " actions";
      details.style.display = "block";
      card.appendChild(title);
      card.appendChild(details);
      footer.appendChild(card);
    } catch (_) {}
  }

  async function boot() {
    const ok = await requirePageAuth();
    if (!ok) return;
    filterExistingLinksByRole();
    injectTopNav();
    loadStaffAlert();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
