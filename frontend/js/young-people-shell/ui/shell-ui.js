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
  getSectionTitle,
  getSectionSubtitle,
  getAllowedScopesForRole,
} from "../core/config.js";

let shellChromeBound = false;
let chromeNavDelegatesBound = false;

function qs(id) {
  return document.getElementById(id);
}

function setText(id, value, fallback = "") {
  const el = qs(id);
  if (!el) return;
  el.textContent = value || fallback;
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

function getAllowedScopes() {
  return getAllowedScopesForRole(getCurrentRole());
}

function getCurrentSection() {
  return state.currentSection || state.activeSection || state.currentView || "workspace";
}

function getCurrentHomeLabel() {
  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
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
      title: getCurrentHomeLabel(),
      meta: state.homeId
        ? `Operational dashboard for home ${state.homeId}`
        : "Operational dashboard across the home",
      seed: { first_name: "H" },
    };
  }

  if (scope === "quality") {
    return {
      title: "Quality overview",
      meta: "Quality assurance, compliance and RI oversight",
      seed: { first_name: "Q" },
    };
  }

  return null;
}

function getWorkspaceContextValue() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  return "Child workspace";
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") return "Residential care home workspace";
  if (scope === "quality") return "Quality and oversight workspace";
  return "Residential child workspace";
}

function getScopeSubtitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return "Operations, staffing, safeguarding, compliance and management visibility across the home.";
  }

  if (scope === "quality") {
    return "Quality assurance, audits, compliance, trends and regulator-facing oversight.";
  }

  return "A calm, child-centred workspace for recording, reflection, continuity, safeguarding and thoughtful next steps.";
}

function getWorkspaceEyebrowText() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  return "Child workspace";
}

function getWorkspaceHomeButtonLabel() {
  return getCurrentScope() === "child" ? "Children and young people" : "Dashboard";
}

function renderAvatarHtml(person = {}, imageClass, fallbackClass) {
  return buildImageOrInitials(person, imageClass, fallbackClass);
}

function updateWorkspaceContextPill() {
  const valueEl = document.querySelector(".workspace-context-pill-value");
  if (valueEl) valueEl.textContent = getWorkspaceContextValue();
}

function updateWorkspaceEyebrow() {
  const eyebrow = qs("workspaceEyebrow") || document.querySelector(".workspace-header-copy .eyebrow");
  if (eyebrow) eyebrow.textContent = getWorkspaceEyebrowText();
}

function updateSnapshotAvatar(person = {}) {
  const wrap = qs("profileSnapshotPhotoWrap");
  if (!wrap) return;

  wrap.innerHTML = renderAvatarHtml(person, "profile-photo", "profile-photo-fallback");
}

function updateSidebarAvatar(person = {}) {
  const imageUrl = getProfileImage(person);
  const name = getDisplayName(person) || person?.first_name || "Workspace";
  const initials = initialsFromName(name);

  const sidebarAvatar = qs("personAvatar");
  const mobileAvatar = qs("mobilePersonAvatar");
  const drawerAvatar = document.querySelector("#mobileNavDrawer .workspace-stage-mobile-avatar");

  const html = imageUrl
    ? `<img class="avatar" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" />`
    : `<div class="avatar avatar-fallback">${escapeHtml(initials)}</div>`;

  if (sidebarAvatar) sidebarAvatar.innerHTML = html;
  if (mobileAvatar) mobileAvatar.innerHTML = html;
  if (drawerAvatar) drawerAvatar.innerHTML = html;
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

  setText("mobileDrawerPersonName", displayName, "Child");
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
  const meta = buildPersonMeta(person) || "Child workspace";

  setText("personName", displayName, "Child");
  setText("personMeta", meta, "Workspace");

  setText("mobilePersonName", displayName, "Child");
  setText("mobilePersonMeta", meta, "Workspace");

  setText("profileSnapshotName", displayName, "Child");
  setText("profileSnapshotMeta", meta, "Current context");

  updateSnapshotAvatar(person);
  updateSidebarAvatar(person);
  updateMobileDrawerPerson(person);
}

function updateScopeButtons() {
  const scope = getCurrentScope();
  const allowedScopes = getAllowedScopes();

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

  [els.homeBtn, els.mobileHomeBtn].forEach((button) => {
    if (!button) return;
    button.textContent = getWorkspaceHomeButtonLabel();
  });
}

function updateHeaderChrome(section = "workspace") {
  const title = getSectionTitle(section) || getScopeTitle();
  const subtitle = getSectionSubtitle(section) || getScopeSubtitle();

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
  if (mobileNavHeading) mobileNavHeading.textContent = "Main menu";
}

function updateSearchPlaceholders() {
  const scope = getCurrentScope();
  const topbarSearch = qs("topbarSearchInput");
  const recordSearch = qs("recordSearchInput");
  const filter = qs("recordTypeFilter");

  let placeholder = "Search notes, incidents, plans, documents or communication...";

  if (scope === "home") {
    placeholder = "Search staffing, incidents, actions, documents or compliance...";
  } else if (scope === "quality") {
    placeholder = "Search audits, actions, compliance, reports or evidence...";
  }

  if (topbarSearch) topbarSearch.placeholder = placeholder;
  if (recordSearch) recordSearch.placeholder = placeholder;

  if (filter) {
    filter.setAttribute("aria-label", scope === "child" ? "Filter child records" : "Filter workspace records");
  }
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
  updateSearchPlaceholders();
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
  updateSectionChrome(getCurrentSection());
  refreshAssistantUi();
}
