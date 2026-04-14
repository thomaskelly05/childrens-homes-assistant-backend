import { els } from "../dom.js";

let workspaceMenubarBound = false;

function getWorkspaceMenus() {
  return Array.from(document.querySelectorAll(".workspace-menu"));
}

function closeOtherWorkspaceMenus(currentMenu) {
  getWorkspaceMenus().forEach((menu) => {
    if (menu !== currentMenu) {
      menu.removeAttribute("open");
    }
  });
}

function closeAllWorkspaceMenus() {
  getWorkspaceMenus().forEach((menu) => {
    menu.removeAttribute("open");
  });
}

function findMenuActionTarget(actionRouter, sourceButton) {
  if (!actionRouter) return null;

  const exactMatches = Array.from(
    document.querySelectorAll(`[data-action-router="${actionRouter}"]`)
  ).filter((node) => node !== sourceButton);

  return exactMatches[0] || null;
}

function findMenuNavTarget(navSection) {
  if (!navSection) return null;

  return (
    document.querySelector(`[data-nav-section-target="${navSection}"]`) ||
    document.querySelector(`[data-view="${navSection}"]`) ||
    document.querySelector(`[data-nav-key="${navSection}"]`) ||
    document.querySelector(`[data-view-key="${navSection}"]`) ||
    null
  );
}

function handleWorkspaceMenuLink(button) {
  if (!button) return;

  const actionRouter = button.dataset.actionRouter;
  const navSection = button.dataset.navSection;

  if (actionRouter) {
    const target = findMenuActionTarget(actionRouter, button);
    if (target && typeof target.click === "function") {
      target.click();
    }
  }

  if (navSection) {
    const navTarget = findMenuNavTarget(navSection);
    if (navTarget && typeof navTarget.click === "function") {
      navTarget.click();
    }
  }

  closeAllWorkspaceMenus();
}

function bindWorkspaceMenuEvents() {
  if (workspaceMenubarBound) return;
  workspaceMenubarBound = true;

  document.addEventListener("toggle", (event) => {
    const menu = event.target;

    if (!(menu instanceof HTMLDetailsElement)) return;
    if (!menu.classList.contains("workspace-menu")) return;

    if (menu.open) {
      closeOtherWorkspaceMenus(menu);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const linkButton = event.target.closest(".workspace-menu-link");
    if (linkButton) {
      handleWorkspaceMenuLink(linkButton);
      return;
    }

    const clickedInsideMenubar = event.target.closest(".workspace-menubar");
    if (!clickedInsideMenubar) {
      closeAllWorkspaceMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllWorkspaceMenus();
    }
  });
}

function enhanceInitialMenuState() {
  const menus = getWorkspaceMenus();

  if (!menus.length) return;

  const openMenus = menus.filter((menu) => menu.hasAttribute("open"));

  if (openMenus.length <= 1) return;

  openMenus.forEach((menu, index) => {
    if (index > 0) {
      menu.removeAttribute("open");
    }
  });
}

function initWorkspaceMenubar() {
  if (!els.heroQuickActions) return;

  enhanceInitialMenuState();
  bindWorkspaceMenuEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWorkspaceMenubar, { once: true });
} else {
  initWorkspaceMenubar();
}

export { initWorkspaceMenubar, closeAllWorkspaceMenus, closeOtherWorkspaceMenus };