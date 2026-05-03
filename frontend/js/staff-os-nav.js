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
    "/forgot-password",
    "/privacy",
    "/support",
    "/terms",
  ]);

  const NAV_LINKS = [
    ["/my-profile", "My Profile", "My start page"],
    ["/young-people-shell", "Care OS", "Children's home workspace"],
    ["/young-people", "Young people", "Profiles and records"],
    ["/safeguarding-hub", "Safeguarding", "Risk and safety"],
    ["/quality-hub", "Quality", "Audit and assurance"],
    ["/documents-hub", "Documents", "Files and evidence"],
    ["/academy", "Academy", "Learning and evidence"],
    ["/assistant", "Assistant", "Guidance and summaries"],
  ];

  function currentPath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function isPublicPage() {
    return PUBLIC_PATHS.has(currentPath());
  }

  function loginRedirect() {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }

  async function requirePageAuth() {
    if (isPublicPage()) return true;

    if (!window.auth || typeof window.auth.requireAuth !== "function") {
      loginRedirect();
      return false;
    }

    try {
      return await window.auth.requireAuth();
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
      .indicare-global-nav {
        position: sticky;
        top: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px;
        background: rgba(255,255,255,.96);
        border-bottom: 1px solid rgba(15,23,42,.1);
        box-shadow: 0 10px 28px rgba(15,23,42,.08);
        backdrop-filter: blur(10px);
        color: #10201f;
      }
      .indicare-global-nav-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: max-content;
        font-weight: 900;
      }
      .indicare-global-nav-mark {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #163b3a;
        color: #fff;
        font-size: 13px;
      }
      .indicare-global-nav-links {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 2px;
      }
      .indicare-global-nav-link {
        display: block;
        min-width: max-content;
        padding: 8px 11px;
        border: 1px solid #d7e1de;
        border-radius: 12px;
        background: #fff;
        color: #163b3a;
        text-decoration: none;
        line-height: 1.15;
      }
      .indicare-global-nav-link[aria-current="page"] {
        background: #163b3a;
        color: #fff;
        border-color: #163b3a;
      }
      .indicare-global-nav-title {
        display: block;
        font-size: 13px;
        font-weight: 900;
      }
      .indicare-global-nav-subtitle {
        display: block;
        margin-top: 2px;
        font-size: 11px;
        opacity: .72;
      }
      .indicare-global-nav-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .indicare-global-nav-user {
        font-size: 12px;
        color: #55706d;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .indicare-global-nav-button {
        border: 1px solid #d7e1de;
        border-radius: 12px;
        background: #fff;
        color: #163b3a;
        padding: 8px 11px;
        font-weight: 900;
        cursor: pointer;
      }
      @media (max-width: 900px) {
        .indicare-global-nav {
          align-items: flex-start;
          flex-direction: column;
        }
        .indicare-global-nav-links {
          width: 100%;
        }
      }
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
    for (const [href, title, subtitle] of NAV_LINKS) {
      const link = makeLink(href, title, subtitle);
      if (path === href || path === `${href}.html`) link.setAttribute("aria-current", "page");
      links.appendChild(link);
    }

    const actions = document.createElement("div");
    actions.className = "indicare-global-nav-actions";

    const storedUser = window.auth?.getStoredUser?.() || {};
    const user = document.createElement("span");
    user.className = "indicare-global-nav-user";
    user.textContent = storedUser.email || storedUser.role || "Signed in";

    const logout = document.createElement("button");
    logout.className = "indicare-global-nav-button";
    logout.type = "button";
    logout.textContent = "Sign out";
    logout.addEventListener("click", () => window.auth?.logout?.());

    actions.appendChild(user);
    actions.appendChild(logout);
    nav.appendChild(brand);
    nav.appendChild(links);
    nav.appendChild(actions);
    document.body.prepend(nav);
  }

  function addSidebarLink(container, href, title, subtitle) {
    if (!container) return;
    if ([...container.querySelectorAll("a")].some((link) => link.getAttribute("href") === href)) return;

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
    injectTopNav();
    loadStaffAlert();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
