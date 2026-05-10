(function () {
  function normalisePath(path) {
    return String(path || "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }

  function isDashboardPath(path) {
    return [
      "/academy",
      "/academy.html",
      "/academy-ui",
      "/academy-ui.html",
    ].includes(path);
  }

  function markActiveNav() {
    const nav = document.getElementById("academyNav");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll("a.academy-nav__item"));
    if (!links.length) return;

    const currentPath = normalisePath(window.location.pathname);

    links.forEach((link) => {
      link.classList.remove("is-active");
    });

    let matched = false;

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#")) {
        continue;
      }

      const linkPath = normalisePath(new URL(href, window.location.origin).pathname);

      if (linkPath === currentPath) {
        link.classList.add("is-active");
        matched = true;
        break;
      }
    }

    if (matched) return;

    const dashboardLink = links.find((link) => {
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return false;
      const linkPath = normalisePath(new URL(href, window.location.origin).pathname);
      return isDashboardPath(linkPath) && isDashboardPath(currentPath);
    });

    if (dashboardLink) {
      dashboardLink.classList.add("is-active");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markActiveNav);
  } else {
    markActiveNav();
  }
})();
