import { state } from "../state.js";
import { els } from "../dom.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import { getDisplayName } from "../core/utils.js";
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
  if (el) {
    el.textContent = value || fallback;
  }
}

function setHtml(id, value) {
  const el = qs(id);
  if (el) {
    el.innerHTML = value || "";
  }
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

  if (display) {
    el.style.display = show ? display : "";
  }
}

function initialsFromPerson(person = {}) {
  const first = String(
    person.preferred_name ||
      person.first_name ||
      person.full_name ||
      "Y"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const last = String(person.last_name || "")
    .trim()
    .charAt(0)
    .toUpperCase();

  return `${first}${last}`.trim() || "YP";
}

function buildInitialsAvatar(person = {}, className = "avatar avatar-fallback") {
  return `<div class="${className}">${initialsFromPerson(person)}</div>`;
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

function getCurrentScope() {
  return state.currentScope || "child";
}

function getCurrentRole() {
  return String(state.userRole || "staff").toLowerCase();
}

function canAccessScope(scope) {
  const role = getCurrentRole();
  const allowed = ROLE_SCOPE_ACCESS?.[role] || ["child"];
  return allowed.includes(scope);
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

  return "A calm operational view for recording, reflection, continuity and thoughtful next steps.";
}

function getScopeIdentity() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return {
      title: "Home overview",
      meta: "Managers dashboard across the home",
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

function updateWorkspaceContextPill() {
  const valueEl = document.querySelector(".workspace-context-pill-value");
  if (valueEl) {
    valueEl.textContent = getWorkspaceContextValue();
  }
}

function updateSnapshotPhoto(person = {}) {
  const wrap = qs("profileSnapshotPhotoWrap");
  if (!wrap) return;

  wrap.innerHTML = buildInitialsAvatar(person, "profile-photo-fallback");
}

function updateSidebarAvatar(person = {}) {
  setHtml("personAvatar", buildInitialsAvatar(person, "avatar avatar-fallback"));
  setHtml("mobilePersonAvatar", buildInitialsAvatar(person, "avatar avatar-fallback"));
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

    updateSnapshotPhoto(scopeIdentity.seed);
    updateSidebarAvatar(scopeIdentity.seed);
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

  updateSnapshotPhoto(person);
  updateSidebarAvatar(person);
}

function updateScopeButtons() {
  const scope = getCurrentScope();

  const buttons = [
    { el: els.scopeChildBtn, value: "child" },
    { el: els.scopeHomeBtn, value: "home" },
    { el: els.scopeQualityBtn, value: "quality" },
  ];

  buttons.forEach(({ el, value }) => {
    if (!el) return;

    const visible = canAccessScope(value);
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
    const visibleScopes = ["child", "home", "quality"].filter((value) =>
      canAccessScope(value)
    );
    showEl(els.scopeSwitch, visibleScopes.length > 1, "inline-flex");
  }
}

function updateScopeSensitiveActions() {
  const isChildScope = getCurrentScope() === "child";

  showEl(els.profileOpenBtn, isChildScope, "inline-flex");
  showEl(els.profilePhotoUploadBtn, isChildScope, "inline-flex");
  showEl(els.changePersonBtn, isChildScope, "inline-flex");
  showEl(els.backToSelectorBtn, isChildScope, "inline-flex");

  const snapshotWrap = qs("profileSnapshotPhotoWrap");
  if (snapshotWrap) {
    showEl(snapshotWrap, true, "block");
  }
}

function updateHeaderChrome(section = "workspace") {
  const title =
    SECTION_TITLES?.[section] ||
    (getCurrentScope() === "home"
      ? "Home dashboard"
      : getCurrentScope() === "quality"
      ? "Quality dashboard"
      : "Today’s workspace");

  const subtitle =
    SECTION_SUBTITLES?.[section] || getScopeSubtitle();

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
  if (sidebarBrand) {
    sidebarBrand.textContent = scopeTitle;
  }

  const mobileNavHeading = document.querySelector("#mobileNavDrawer h3");
  if (mobileNavHeading) {
    mobileNavHeading.textContent = scopeTitle;
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

export function updateYoungPersonChrome(person = {}) {
  updateYoungPersonText(person);
  updateTopLevelLabels();
  updateWorkspaceContextPill();
  updateScopeButtons();
  updateScopeSensitiveActions();
  updateAppDataset();
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
}

export function closeMobileNav() {
  qs("mobileNavBackdrop")?.classList.add("hidden");
  qs("mobileNavDrawer")?.classList.add("hidden");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "true");

  if (els.mobileNavBtn) {
    els.mobileNavBtn.setAttribute("aria-expanded", "false");
  }
}

async function goHomeToSelector() {
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
      ".mobile-tab-btn[data-nav-section], #mobileNavContent [data-nav-section]"
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

  qs("profileOpenBtn")?.addEventListener("click", async () => {
    const { loadSection } = await import("./nav.js");
    await loadSection("profile");
  });

  bindChromeNavDelegates();
}

export function refreshShellChrome() {
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  updateSectionChrome(state.currentSection || state.activeSection || "workspace");
  refreshAssistantUi();
}
