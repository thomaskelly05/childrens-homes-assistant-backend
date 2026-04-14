function closeOtherWorkspaceMenus(currentMenu) {
  const menus = document.querySelectorAll(".workspace-menu");
  menus.forEach((menu) => {
    if (menu !== currentMenu) {
      menu.removeAttribute("open");
    }
  });
}

function bindWorkspaceMenuSingleOpen() {
  const menus = document.querySelectorAll(".workspace-menu");

  menus.forEach((menu) => {
    const summary = menu.querySelector(".workspace-menu-trigger");
    if (!summary) return;

    summary.addEventListener("click", () => {
      const isOpening = !menu.hasAttribute("open");
      if (isOpening) {
        closeOtherWorkspaceMenus(menu);
      }
    });
  });

  document.addEventListener("click", (event) => {
    const insideMenu = event.target.closest(".workspace-menubar");
    if (!insideMenu) {
      menus.forEach((menu) => menu.removeAttribute("open"));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menus.forEach((menu) => menu.removeAttribute("open"));
    }
  });
}

function bindWorkspaceMenuLinks() {
  const links = document.querySelectorAll(".workspace-menu-link");

  links.forEach((button) => {
    button.addEventListener("click", () => {
      const actionRouter = button.dataset.actionRouter;
      const navSection = button.dataset.navSection;

      if (actionRouter) {
        const target = document.querySelector(`[data-action-router="${actionRouter}"]`);
        if (target && target !== button) {
          target.click();
        }
      }

      if (navSection) {
        const navTarget =
          document.querySelector(`[data-nav-section-target="${navSection}"]`) ||
          document.querySelector(`[data-view="${navSection}"]`) ||
          document.querySelector(`[data-nav-key="${navSection}"]`) ||
          document.querySelector(`[data-view-key="${navSection}"]`);

        if (navTarget && typeof navTarget.click === "function") {
          navTarget.click();
        }
      }

      document.querySelectorAll(".workspace-menu").forEach((menu) => {
        menu.removeAttribute("open");
      });
    });
  });
}

function initWorkspaceMenubar() {
  bindWorkspaceMenuSingleOpen();
  bindWorkspaceMenuLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWorkspaceMenubar);
} else {
  initWorkspaceMenubar();
}

export { initWorkspaceMenubar };