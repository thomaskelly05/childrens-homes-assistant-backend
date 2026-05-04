(() => {
  const ROLE_GROUPS = Object.freeze({
    staff: new Set(["staff", "support_worker", "key_worker", "senior", "senior_staff"]),
    manager: new Set(["manager", "registered_manager", "deputy_manager", "home_manager"]),
    provider: new Set(["ri", "responsible_individual", "provider_admin", "admin", "administrator", "super_admin", "superadmin", "founder"]),
  });

  const NAV_LINKS = Object.freeze([
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
  ]);

  const RESTRICTED_PATHS = NAV_LINKS.reduce((acc, item) => {
    acc[item.href] = item.roles || [];
    acc[`${item.href}.html`] = item.roles || [];
    return acc;
  }, {});

  function normaliseRole(role = "") {
    const value = String(role || "").trim().toLowerCase();
    if (ROLE_GROUPS.provider.has(value)) return "provider";
    if (ROLE_GROUPS.manager.has(value)) return "manager";
    return "staff";
  }

  function getStoredUser() {
    return window.auth?.getStoredUser?.() || {};
  }

  function currentRoleGroup() {
    return normaliseRole(getStoredUser().role);
  }

  function roleCanAccess(allowed = [], roleGroup = currentRoleGroup()) {
    if (!Array.isArray(allowed) || allowed.length === 0) return true;
    return allowed.includes(roleGroup);
  }

  function linksForCurrentRole() {
    const roleGroup = currentRoleGroup();
    return NAV_LINKS.filter((item) => roleCanAccess(item.roles, roleGroup));
  }

  window.IndiCarePermissions = Object.freeze({
    ROLE_GROUPS,
    NAV_LINKS,
    RESTRICTED_PATHS,
    normaliseRole,
    currentRoleGroup,
    roleCanAccess,
    linksForCurrentRole,
  });
})();
