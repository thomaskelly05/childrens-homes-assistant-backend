import { state, normaliseUserRole } from "../state.js";
import { els, refreshEls } from "../dom.js";
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
  return normaliseUserRole(state.userRole || state.currentUser?.role || "staff");
}

function getAllowedScopes() {
  return getAllowedScopesForRole(getCurrentRole());
}

function getCurrentSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function normaliseSection(section = "") {
  const raw = String(section || "").trim().toLowerCase();

  const aliases = {
    home: "workspace",
    dashboard: "workspace",
    myday: "workspace",
    "my-day": "workspace",
    evidence: "sccif-evidence",
  };

  return aliases[raw] || raw || "workspace";
}

function normaliseViewToSection(view = "") {
  const value = normaliseSection(view);

  const map = {
    home: "workspace",
    timeline: "timeline",
    profile: "profile",
    risk: "risk",
    manager: "manager",
    health: "health",
    education: "education",
    family: "family",
    appointments: "appointments",
    compliance: "compliance",
    evidence: "sccif-evidence",
  };

  return map[value] || value;
}

function getCurrentHomeLabel() {
  return (
    state.currentUser?.home_name ||
    state.currentUser?.homeName ||
    state.selectedYoungPerson?.home_name ||
    state.selectedYoungPerson?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Home")
  );
}

function getCurrentPerson() {
  return state.selectedYoungPerson || state.youngPerson || null;
}

function buildPersonMeta(person = {}) {
  return [
    person.preferred_name ? `Preferred: ${person.preferred_name}` : "",
    person.home_name || person.homeName || "",
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
      seed: { first_name: "H", last_name: "" },
    };
  }

  if (scope === "quality") {
    return {
      title: "Quality and RI oversight",
      meta: "Audit, assurance, drift and governance view for this home",
      seed: { first_name: "Q", last_name: "" },
    };
  }

  if (scope === "ofsted") {
    return {
      title: "Inspection evidence preparation",
      meta: "Inspection preparation, evidence testing and regulator-facing assurance.",
      seed: { first_name: "O", last_name: "" },
    };
  }

  return null;
}

function getWorkspaceContextValue() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  if (scope === "ofsted") return "Evidence workspace";

  const person = getCurrentPerson();
  const name = person ? getDisplayName(person) : "";

  return name ? `${name} Care Hub` : "Choose home and young person";
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home Rhythm";
  if (scope === "quality") return "Quality Picture";
  if (scope === "ofsted") return "Evidence and Inspection evidence preparation";

  return "My Day";
}

function getScopeSubtitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return "A clear view of daily operations, staffing, safeguarding, tasks and home rhythm.";
  }

  if (scope === "quality") {
    return "Quality assurance, audits, actions, drift, compliance and improvement evidence.";
  }

  if (scope === "ofsted") {
    return "Inspection preparation, SCCIF evidence, strengths, gaps and likely lines of enquiry.";
  }

  return "A practical view of today: what matters, what has changed, what adults need to know, and what needs doing next.";
}

function getWorkspaceEyebrowText() {
  const scope = getCurrentScope();

  if (scope === "home") return "Home workspace";
  if (scope === "quality") return "Quality workspace";
  if (scope === "ofsted") return "Evidence workspace";

  return "Child Care Hub";
}

function getWorkspaceHomeButtonLabel() {
  const scope = getCurrentScope();

  if (scope === "child") return "Entry point";
  if (scope === "home") return "Home dashboard";
  if (scope === "quality") return "Quality dashboard";
  if (scope === "ofsted") return "Evidence dashboard";

  return "Dashboard";
}

function getAssistantScopeType() {
  const scope = getCurrentScope();

  if (scope === "home") return "home";
  if (scope === "quality" || scope === "ofsted") return "quality";

  return "child";
}

function renderAvatarHtml(person = {}, imageClass, fallbackClass) {
  return buildImageOrInitials(person, imageClass, fallbackClass);
}

function updateWorkspaceContextPill() {
  const valueEl = document.querySelector(".workspace-context-pill-value");
  if (valueEl) valueEl.textContent = getWorkspaceContextValue();

  const labelEl = document.querySelector(".workspace-context-pill-label");
  if (labelEl) {
    labelEl.textContent = state.youngPersonId ? "Current Care Hub" : "Entry point";
  }
}

function updateWorkspaceEyebrow() {
  const eyebrow =
    qs("workspaceEyebrow") ||
    document.querySelector(".workspace-header-copy .eyebrow");

  if (!eyebrow) return;

  eyebrow.textContent = getWorkspaceEyebrowText();
  eyebrow.classList.remove("hidden");
  eyebrow.setAttribute("aria-hidden", "false");
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

function updateMobileAvatars(person = {}) {
  const imageUrl = getProfileImage(person);
  const name = getDisplayName(person) || person?.first_name || "Workspace";
  const initials = initialsFromName(name);

  const html = imageUrl
    ? `<img class="avatar" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
        name
      )}" />`
    : `<div class="avatar avatar-fallback">${escapeHtml(initials)}</div>`;

  if (els.mobilePersonAvatar) {
    els.mobilePersonAvatar.innerHTML = html;
  }

  const drawerAvatar = document.querySelector(
    "#mobileNavPanel .workspace-stage-mobile-avatar, #mobileNavDrawer .workspace-stage-mobile-avatar"
  );

  if (drawerAvatar) {
    drawerAvatar.innerHTML = html;
  }
}

function updateMobileDrawerPerson(person = {}) {
  const scopeIdentity = getScopeIdentity();

  if (scopeIdentity) {
    setText("mobileDrawerPersonName", scopeIdentity.title, "Workspace");
    setText("mobileDrawerPersonMeta", scopeIdentity.meta, "Current workspace");
    return;
  }

  const safePerson = person || getCurrentPerson() || {};
  const displayName = getDisplayName(safePerson);
  const meta = buildPersonMeta(safePerson) || "Current Care Hub";

  setText("mobileDrawerPersonName", displayName, "Young person");
  setText("mobileDrawerPersonMeta", meta, "Current Care Hub");
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

    if (els.personAvatar) {
      els.personAvatar.innerHTML = renderAvatarHtml(
        scopeIdentity.seed,
        "profile-photo",
        "profile-photo-fallback"
      );
    }

    updateSnapshotAvatar(scopeIdentity.seed);
    updateMobileAvatars(scopeIdentity.seed);
    updateMobileDrawerPerson(scopeIdentity.seed);
    return;
  }

  const safePerson = person || getCurrentPerson() || {};
  const displayName = getDisplayName(safePerson);
  const meta = buildPersonMeta(safePerson) || "Child-centred overview and current context";

  setText("personName", displayName, "Young person");
  setText("personMeta", meta, "Child-centred overview and current context");

  setText("mobilePersonName", displayName, "Young person");
  setText("mobilePersonMeta", meta, "Care Hub open");

  setText("profileSnapshotName", displayName, "Young person");
  setText("profileSnapshotMeta", meta, "Current context");

  if (els.personAvatar) {
    els.personAvatar.innerHTML = renderAvatarHtml(
      safePerson,
      "profile-photo",
      "profile-photo-fallback"
    );
  }

  updateSnapshotAvatar(safePerson);
  updateMobileAvatars(safePerson);
  updateMobileDrawerPerson(safePerson);
}

function updateScopeButtons() {
  const scope = getCurrentScope();
  const allowedScopes = getAllowedScopes();

  const buttons = [
    { el: els.scopeChildBtn, value: "child" },
    { el: els.scopeHomeBtn, value: "home" },
    { el: els.scopeQualityBtn, value: "quality" },
    { el: els.scopeOfstedBtn, value: "ofsted" },
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

  showEl(els.changePersonBtn, true, "inline-flex");
  showEl(els.profileOpenBtn, isChildScope, "inline-flex");
  showEl(els.profilePhotoUploadBtn, isChildScope, "inline-flex");

  [els.homeBtn, els.mobileHomeBtn, els.goHomeBtn].forEach((button) => {
    if (!button) return;
    button.textContent = getWorkspaceHomeButtonLabel();
  });
}

function updateHeaderChrome(section = "workspace") {
  const safeSection = normaliseSection(section);
  const title = getSectionTitle(safeSection) || getScopeTitle();
  const subtitle = getSectionSubtitle(safeSection) || getScopeSubtitle();

  setText("pageTitle", title, "Workspace");
  setText("pageSubtitle", subtitle, getScopeSubtitle());

  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    const target = normaliseSection(button.dataset.navSection);
    const isActive = target === safeSection;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    const target = normaliseViewToSection(button.dataset.view);
    const isActive = target === safeSection;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.querySelectorAll(".os-nav-item").forEach((button) => {
    const target = button.dataset.view
      ? normaliseViewToSection(button.dataset.view)
      : normaliseSection(button.dataset.navSection || "");

    const isActive = target === safeSection;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  document.querySelectorAll(".journey-step").forEach((button) => {
    const target = button.dataset.view
      ? normaliseViewToSection(button.dataset.view)
      : normaliseSection(button.dataset.navSection || "");

    const isActive = target === safeSection;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "step" : "false");
  });
}

function updateTopLevelLabels() {
  const mobileNavHeading = document.querySelector(
    "#mobileNavPanel h3, #mobileNavDrawer h3"
  );

  if (mobileNavHeading) mobileNavHeading.textContent = "What do you need?";
}

function updateSearchPlaceholders() {
  const scope = getCurrentScope();
  const recordSearch = qs("recordSearchInput");
  const mobileRecordSearch = qs("mobileRecordSearchInput");
  const selectorSearch = qs("selectorSearch");
  const youngPersonSearchInput = qs("youngPersonSearchInput");
  const filter = qs("recordTypeFilter");

  let placeholder = "Search care story, actions, plans, documents or events...";

  if (scope === "home") {
    placeholder = "Search staffing, incidents, actions, documents or compliance...";
  } else if (scope === "quality" || scope === "ofsted") {
    placeholder = "Search audits, actions, compliance, reports or evidence...";
  }

  if (recordSearch) recordSearch.placeholder = placeholder;
  if (mobileRecordSearch) mobileRecordSearch.placeholder = "Search care story...";
  if (selectorSearch) selectorSearch.placeholder = "Search young people...";
  if (youngPersonSearchInput) youngPersonSearchInput.placeholder = "Search young people...";

  if (filter) {
    filter.setAttribute(
      "aria-label",
      scope === "child" ? "Filter child records" : "Filter workspace records"
    );
  }
}

function updateAppDataset() {
  if (!els.app) return;

  els.app.dataset.scope = getCurrentScope();
  els.app.dataset.section = getCurrentSection();
  els.app.dataset.userRole = getCurrentRole();
  els.app.dataset.assistantScopeType = getAssistantScopeType();

  els.app.dataset.youngPersonId =
    getCurrentScope() === "child" && state.youngPersonId
      ? String(state.youngPersonId)
      : "";

  els.app.dataset.homeId = state.homeId ? String(state.homeId) : "";
  els.app.dataset.providerId = state.providerId ? String(state.providerId) : "";
  els.app.dataset.allowedHomeIds = JSON.stringify(
    Array.isArray(state.allowedHomeIds) ? state.allowedHomeIds : []
  );
}

function updateWelcomePanel() {
  const user = state.currentUser || {};
  const firstName =
    user.first_name ||
    user.firstName ||
    user.name?.split?.(" ")?.[0] ||
    "";

  const hour = new Date().getHours();
  let greeting = "Welcome back";

  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  setText("welcomeMessage", firstName ? `${greeting}, ${firstName}.` : `${greeting}.`);
  setText(
    "welcomeSubMessage",
    "Choose your home and young person to open a calm, child-centred Care Hub."
  );
}

function updateLaunchReadinessText() {
  const homeLabel =
    state.selectedYoungPerson?.home_name ||
    state.selectedYoungPerson?.homeName ||
    (state.homeId ? `Home ${state.homeId}` : "Not selected");

  const person = getCurrentPerson();
  const childLabel =
    person && getDisplayName(person)
      ? getDisplayName(person)
      : state.youngPersonId
        ? `Young person ${state.youngPersonId}`
        : "Not selected";

  setText("launchReadyHome", homeLabel, "Not selected");
  setText("launchReadyChild", childLabel, "Not selected");

  const openBtn = qs("launchOpenCareHubBtn");
  if (openBtn) {
    const ready = !!state.youngPersonId;
    openBtn.disabled = !ready;
    openBtn.setAttribute("aria-disabled", ready ? "false" : "true");
  }
}

function updateThemeButtons() {
  const app = els.app || qs("app");
  const theme = document.documentElement.dataset.theme || app?.dataset.theme || "light";
  const themeBtn = qs("themeToggleBtn");

  if (themeBtn) {
    themeBtn.textContent = theme === "dark" ? "Dark mode" : "Light mode";
    themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  const nightBtn = qs("nightShiftModeBtn");
  const nightEnabled =
    document.body.classList.contains("night-shift-mode") ||
    app?.dataset.nightShift === "true";

  if (nightBtn) {
    nightBtn.textContent = nightEnabled ? "Night mode on" : "Night mode";
    nightBtn.setAttribute("aria-pressed", nightEnabled ? "true" : "false");
  }
}

function updateLayoutChrome() {
  document.body.classList.toggle("has-open-child", !!state.youngPersonId);
  document.body.classList.toggle("scope-home", getCurrentScope() === "home");
  document.body.classList.toggle("scope-quality", getCurrentScope() === "quality");
  document.body.classList.toggle("scope-ofsted", getCurrentScope() === "ofsted");
}

export function updateYoungPersonChrome(person = {}) {
  refreshEls();

  const safePerson = person || getCurrentPerson() || {};

  updateYoungPersonText(safePerson);
  updateTopLevelLabels();
  updateWorkspaceContextPill();
  updateWorkspaceEyebrow();
  updateScopeButtons();
  updateScopeSensitiveActions();
  updateSearchPlaceholders();
  updateAppDataset();
  updateWelcomePanel();
  updateLaunchReadinessText();
  updateThemeButtons();
  updateLayoutChrome();
}

export function updateSectionChrome(section = "workspace") {
  updateHeaderChrome(section);
}

export function openMobileNav() {
  qs("mobileNavBackdrop")?.classList.remove("hidden");
  qs("mobileNavPanel")?.classList.remove("hidden");
  qs("mobileNavDrawer")?.classList.remove("hidden");

  qs("mobileNavPanel")?.setAttribute("aria-hidden", "false");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "false");

  if (els.mobileNavBtn) els.mobileNavBtn.setAttribute("aria-expanded", "true");
  if (els.mobileNavToggle) els.mobileNavToggle.setAttribute("aria-expanded", "true");

  state.mobileNavOpen = true;
}

export function closeMobileNav() {
  qs("mobileNavBackdrop")?.classList.add("hidden");
  qs("mobileNavPanel")?.classList.add("hidden");
  qs("mobileNavDrawer")?.classList.add("hidden");

  qs("mobileNavPanel")?.setAttribute("aria-hidden", "true");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "true");

  if (els.mobileNavBtn) els.mobileNavBtn.setAttribute("aria-expanded", "false");
  if (els.mobileNavToggle) els.mobileNavToggle.setAttribute("aria-expanded", "false");

  state.mobileNavOpen = false;
}

async function goHomeToSelector() {
  const scope = getCurrentScope();

  if (scope !== "child") {
    const { loadSection } = await import("./nav.js");

    if (scope === "home") {
      await loadSection("home-dashboard");
      return;
    }

    if (scope === "quality") {
      await loadSection("quality");
      return;
    }

    if (scope === "ofsted") {
      await loadSection("ofsted-dashboard");
      return;
    }

    await loadSection("home-dashboard");
    return;
  }

  const { goBackToSelector } = await import("./selector.js");
  goBackToSelector();
}

async function openSectionFromButton(button) {
  const rawSection = button?.dataset?.navSection || button?.dataset?.view;
  if (!rawSection) return;

  const section = button.dataset.view
    ? normaliseViewToSection(rawSection)
    : normaliseSection(rawSection);

  const { loadSection } = await import("./nav.js");
  await loadSection(section);
  closeMobileNav();
}

function bindChromeNavDelegates() {
  if (chromeNavDelegatesBound) return;
  chromeNavDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const navButton = event.target.closest(
      "#mobileNavContent [data-nav-section], #mobileBottomBar [data-nav-section], #mobileBottomNav [data-nav-section], #mobileNavContent [data-view], #mobileBottomBar [data-view], #mobileBottomNav [data-view]"
    );

    if (!navButton) return;

    await openSectionFromButton(navButton);
  });
}

export function bindShellChrome() {
  if (shellChromeBound) return;
  shellChromeBound = true;

  qs("mobileNavBtn")?.addEventListener("click", openMobileNav);
  qs("mobileNavToggle")?.addEventListener("click", openMobileNav);
  qs("closeMobileNavBtn")?.addEventListener("click", closeMobileNav);
  qs("mobileNavBackdrop")?.addEventListener("click", closeMobileNav);

  qs("mobileHomeBtn")?.addEventListener("click", goHomeToSelector);
  qs("changePersonBtn")?.addEventListener("click", goHomeToSelector);
  qs("logoBtn")?.addEventListener("click", goHomeToSelector);
  qs("homeBtn")?.addEventListener("click", goHomeToSelector);
  qs("goHomeBtn")?.addEventListener("click", goHomeToSelector);

  qs("heroAssistantBtn")?.addEventListener("click", async () => {
    const { openAssistant } = await import("./assistant.js");
    openAssistant();
  });

  bindChromeNavDelegates();
}

export function refreshShellChrome() {
  refreshEls();
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  updateSectionChrome(getCurrentSection());
}