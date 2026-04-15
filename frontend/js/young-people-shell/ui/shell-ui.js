import { state, normaliseUserRole } from "../state.js";
import { els } from "../dom.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import {
  getDisplayName,
  getProfileImage,
  initialsFromName,
  escapeHtml,
  buildImageOrInitials,
} from "../core/utils.js";
import {
  SECTION_TITLES,
  SECTION_SUBTITLES,
  ROLE_SCOPE_ACCESS,
} from "../core/config.js";

let shellChromeBound = false;
let chromeNavDelegatesBound = false;

function qs(id) {
  return document.getElementById(id);
}

function setText(id, value, fallback = "") {
  const el = qs(id);
  if (el) el.textContent = value || fallback;
}

function showEl(el, show = true, display = "") {
  if (!el) return;

  el.classList.toggle("hidden", !show);
  el.setAttribute("aria-hidden", show ? "false" : "true");

  if (!show) {
    el.setAttribute("tabindex", "-1");
  } else {
    el.removeAttribute("tabindex");
  }

  if (display && show) {
    el.style.display = display;
  } else {
    el.style.removeProperty("display");
  }
}

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentRole() {
  return normaliseUserRole(state.userRole || "staff");
}

function getAllowedScopesForRole() {
  const role = getCurrentRole();

  if (ROLE_SCOPE_ACCESS?.[role]) {
    return ROLE_SCOPE_ACCESS[role];
  }

  if (role === "admin") {
    return ["child", "home", "quality"];
  }

  return ["child"];
}

function buildPersonMeta(person = {}) {
  return [
    person.preferred_name ? `Preferred: ${person.preferred_name}` : "",
    person.home_name || "",
    person.placement_status || "",
    person.summary_risk_level ? `Risk: ${person.summary_risk_level}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function getScopeIdentity() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return {
      title: "Home overview",
      meta: state.homeId
        ? `Operational dashboard for home ${state.homeId}`
        : "Operational dashboard across the home",
      seed: { first_name: "H" },
    };
  }

  if (scope === "quality") {
    return {
      title: "Quality overview",
      meta: "RI and quality assurance dashboard",
      seed: { first_name: "Q" },
    };
  }

  return null;
}

function getWorkspaceContextValue() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home oversight";
  if (scope === "quality") return "Quality and RI";
  return "Young people";
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home-wide workspace";
  if (scope === "quality") return "Quality and RI workspace";
  return "Young person workspace";
}

function getScopeSubtitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return "Operational, staffing, safeguarding, compliance and leadership visibility across the home.";
  }

  if (scope === "quality") {
    return "Quality assurance, reporting, compliance, audit and regulator-facing oversight.";
  }

  return "A calmer, child-centred workspace for recording, reflection, continuity and thoughtful next steps.";
}

function getWorkspaceEyebrowText() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  return "Young person workspace";
}

function updateWorkspaceContextPill() {
  const valueEl = document.querySelector(".workspace-context-pill-value");
  if (valueEl) valueEl.textContent = getWorkspaceContextValue();
}

function updateWorkspaceEyebrow() {
  const eyebrow = document.querySelector(".workspace-header-copy .eyebrow");
  if (eyebrow) eyebrow.textContent = getWorkspaceEyebrowText();
}

function renderAvatarHtml(person = {}, imageClass, fallbackClass) {
  return buildImageOrInitials(person, imageClass, fallbackClass);
}

function updateSnapshotAvatar(person = {}) {
  const wrap = qs("profileSnapshotPhotoWrap");
  if (!wrap) return;

  wrap.innerHTML = renderAvatarHtml(
    person,
    "profile-photo",
    "profile-photo-fallback"
  );
}

function updateSidebarAvatar(person = {}) {
  const imageUrl = getProfileImage(person);
  const name = getDisplayName(person);
  const initials = initialsFromName(name);

  const sidebarAvatar = qs("personAvatar");
  const mobileAvatar = qs("mobilePersonAvatar");

  const html = imageUrl
    ? `<img class="avatar" src="${escapeHtml(name ? imageUrl : imageUrl)}" alt="${escapeHtml(name)}" />`
    : `<div class="avatar avatar-fallback">${escapeHtml(initials)}</div>`;

  if (sidebarAvatar) sidebarAvatar.innerHTML = html;
  if (mobileAvatar) mobileAvatar.innerHTML = html;
}

function updateMobileDrawerPerson(person = {}) {
  const scopeIdentity = getScopeIdentity();

  if (scopeIdentity) {
    setText("mobileDrawerPersonName", scopeIdentity.title, "Workspace");
    setText("mobileDrawerPersonMeta", scopeIdentity.meta, "Current workspace");
    return;
  }

  const displayName = getDisplayName(person);
  const meta = buildPersonMeta(person) || "Current workspace";

  setText("mobileDrawerPersonName", displayName, "Young person");
  setText("mobileDrawerPersonMeta", meta, "Current workspace");
}

function updateYoungPersonText(person = {}) {
  const scopeIdentity = getScopeIdentity();

  if (scopeIdentity) {
    setText("personName", scopeIdentity.title, "Workspace");
    setText("personMeta", scopeIdentity.meta, "Workspace");

    setText("mobilePersonName", scopeIdentity.title, "Workspace");
    setText("mobilePersonMeta", scopeIdentity.meta, "Workspace");

    setText("profileSnapshotName", scopeIdentity.title, "Workspace");
    setText("profileSnapshotMeta", scopeIdentity.meta, "Dashboard snapshot");

    updateSnapshotAvatar(scopeIdentity.seed);
    updateSidebarAvatar(scopeIdentity.seed);
    updateMobileDrawerPerson(scopeIdentity.seed);
    return;
  }

  const displayName = getDisplayName(person);
  const meta = buildPersonMeta(person) || "Young person workspace";

  setText("personName", displayName, "Young person");
  setText("personMeta", meta, "Workspace");

  setText("mobilePersonName", displayName, "Young person");
  setText("mobilePersonMeta", meta, "Workspace");

  setText("profileSnapshotName", displayName, "Young person");
  setText("profileSnapshotMeta", meta, "Profile snapshot");

  updateSnapshotAvatar(person);
  updateSidebarAvatar(person);
  updateMobileDrawerPerson(person);
}

function updateScopeButtons() {
  const scope = getCurrentScope();
  const allowedScopes = getAllowedScopesForRole();

  const buttons = [
    { el: els.scopeChildBtn, value: "child" },
    { el: els.scopeHomeBtn, value: "home" },
    { el: els.scopeQualityBtn, value: "quality" },
  ];

  buttons.forEach(({ el, value }) => {
    if (!el) return;

    const visible = allowedScopes.includes(value);
    const active = scope === value;

    showEl(el, visible, "inline-flex");

    if (visible) {
      el.classList.toggle("active", active);
      el.setAttribute("aria-selected", active ? "true" : "false");
      el.setAttribute("aria-pressed", active ? "true" : "false");
    } else {
      el.classList.remove("active");
      el.setAttribute("aria-selected", "false");
      el.setAttribute("aria-pressed", "false");
    }
  });

  if (els.scopeSwitch) {
    showEl(els.scopeSwitch, allowedScopes.length > 1, "inline-flex");
  }
}

function updateScopeSensitiveActions() {
  const isChildScope = getCurrentScope() === "child";

  showEl(els.changePersonBtn, isChildScope, "inline-flex");
  showEl(els.backToSelectorBtn, isChildScope, "inline-flex");
  showEl(els.profileOpenBtn, isChildScope, "inline-flex");
  showEl(els.profilePhotoUploadBtn, isChildScope, "inline-flex");

  const selectorButtons = [els.homeBtn, els.mobileHomeBtn];
  selectorButtons.forEach((button) => {
    if (!button) return;
    button.textContent = isChildScope ? "Young people home" : "Workspace home";
  });
}

function updateHeaderChrome(section = "workspace") {
  const title =
    SECTION_TITLES?.[section] ||
    (getCurrentScope() === "home"
      ? "Home dashboard"
      : getCurrentScope() === "quality"
      ? "Quality dashboard"
      : "Today’s workspace");

  const subtitle = SECTION_SUBTITLES?.[section] || getScopeSubtitle();

  setText("pageTitle", title, "Workspace");
  setText("pageSubtitle", subtitle, getScopeSubtitle());

  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    const isActive = button.dataset.navSection === section;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updateTopLevelLabels() {
  const scopeTitle = getScopeTitle();

  const sidebarBrand = document.querySelector(".workspace-sidebar-brand span");
  if (sidebarBrand) sidebarBrand.textContent = scopeTitle;

  const mobileNavHeading = document.querySelector("#mobileNavDrawer h3");
  if (mobileNavHeading) mobileNavHeading.textContent = scopeTitle;
}

function updateAppDataset() {
  if (!els.app) return;

  els.app.dataset.scope = getCurrentScope();
  els.app.dataset.userRole = getCurrentRole();
  els.app.dataset.assistantScopeType = getCurrentScope();
  els.app.dataset.youngPersonId =
    getCurrentScope() === "child" && state.youngPersonId
      ? String(state.youngPersonId)
      : "";
  els.app.dataset.homeId = state.homeId ? String(state.homeId) : "";
}

function updateLayoutChrome() {
  const scope = getCurrentScope();
  const workspaceInner = qs("workspaceShell");
  const sidebar = document.querySelector(".workspace-sidebar");
  const desktopNav = qs("desktopNav");
  const profileCard = document.querySelector(".workspace-sidebar-profile-card");

  const shouldShowSidebar = scope !== "child";

  if (workspaceInner) {
    workspaceInner.classList.toggle("has-sidebar", shouldShowSidebar);
  }

  if (sidebar) {
    sidebar.classList.toggle("workspace-sidebar--hidden", !shouldShowSidebar);
    sidebar.classList.toggle("workspace-sidebar--visible", shouldShowSidebar);
    sidebar.setAttribute("aria-hidden", shouldShowSidebar ? "false" : "true");
  }

  if (desktopNav) {
    desktopNav.classList.toggle("workspace-nav--hidden", !shouldShowSidebar);
    desktopNav.classList.toggle("workspace-nav--visible", shouldShowSidebar);
    desktopNav.setAttribute("aria-hidden", shouldShowSidebar ? "false" : "true");
  }

  if (profileCard) {
    showEl(profileCard, true, "block");
  }
}

export function updateYoungPersonChrome(person = {}) {
  updateYoungPersonText(person);
  updateTopLevelLabels();
  updateWorkspaceContextPill();
  updateWorkspaceEyebrow();
  updateScopeButtons();
  updateScopeSensitiveActions();
  updateAppDataset();
  updateLayoutChrome();
}

export function updateSectionChrome(section = "workspace") {
  updateHeaderChrome(section);
}

export function openMobileNav() {
  qs("mobileNavBackdrop")?.classList.remove("hidden");
  qs("mobileNavDrawer")?.classList.remove("hidden");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "false");

  if (els.mobileNavBtn) {
    els.mobileNavBtn.setAttribute("aria-expanded", "true");
  }

  state.mobileNavOpen = true;
}

export function closeMobileNav() {
  qs("mobileNavBackdrop")?.classList.add("hidden");
  qs("mobileNavDrawer")?.classList.add("hidden");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "true");

  if (els.mobileNavBtn) {
    els.mobileNavBtn.setAttribute("aria-expanded", "false");
  }

  state.mobileNavOpen = false;
}

async function goHomeToSelector() {
  const scope = getCurrentScope();

  if (scope !== "child") {
    const { loadSection } = await import("./nav.js");
    await loadSection(scope === "home" ? "home-dashboard" : "quality");
    return;
  }

  const { goBackToSelector } = await import("./selector.js");
  goBackToSelector();
}

async function openSectionFromButton(button) {
  const section = button?.dataset?.navSection;
  if (!section) return;

  const { loadSection } = await import("./nav.js");
  await loadSection(section);
  closeMobileNav();
}

function bindChromeNavDelegates() {
  if (chromeNavDelegatesBound) return;
  chromeNavDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const navButton = event.target.closest(
      "#mobileNavContent [data-nav-section], #mobileBottomBar [data-nav-section]"
    );
    if (!navButton) return;

    await openSectionFromButton(navButton);
  });
}

export function bindShellChrome() {
  if (shellChromeBound) return;
  shellChromeBound = true;

  qs("mobileNavBtn")?.addEventListener("click", openMobileNav);
  qs("closeMobileNavBtn")?.addEventListener("click", closeMobileNav);
  qs("mobileNavBackdrop")?.addEventListener("click", closeMobileNav);

  qs("backToSelectorBtn")?.addEventListener("click", goHomeToSelector);
  qs("mobileHomeBtn")?.addEventListener("click", goHomeToSelector);
  qs("changePersonBtn")?.addEventListener("click", goHomeToSelector);
  qs("logoBtn")?.addEventListener("click", goHomeToSelector);
  qs("homeBtn")?.addEventListener("click", goHomeToSelector);

  qs("heroAssistantBtn")?.addEventListener("click", async () => {
    const { openAssistant } = await import("./assistant.js");
    openAssistant();
  });

  bindChromeNavDelegates();
}

export function refreshShellChrome() {
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  updateSectionChrome(
    state.currentSection || state.activeSection || state.currentView || "workspace"
  );
  refreshAssistantUi();
}
