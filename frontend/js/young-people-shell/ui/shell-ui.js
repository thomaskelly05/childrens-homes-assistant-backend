import { state } from "../state.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import {
  buildImageOrInitials,
  getDisplayName,
} from "../core/utils.js";
import {
  SECTION_TITLES,
  SECTION_SUBTITLES,
} from "../core/config.js";

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

function buildPersonMeta(person = {}) {
  return [
    person.preferred_name ? `Preferred: ${person.preferred_name}` : "",
    person.placement_status || "",
    person.summary_risk_level ? `Risk: ${person.summary_risk_level}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function updateSnapshotPhoto(person = {}) {
  const wrap = qs("profileSnapshotPhotoWrap");
  if (!wrap) return;

  wrap.innerHTML = buildImageOrInitials(
    person,
    "profile-photo",
    "profile-photo-fallback"
  );
}

function updateSidebarAvatar(person = {}) {
  setHtml(
    "personAvatar",
    buildImageOrInitials(person, "avatar", "avatar avatar-fallback")
  );

  setHtml(
    "mobilePersonAvatar",
    buildImageOrInitials(person, "avatar", "avatar avatar-fallback")
  );
}

export function updateYoungPersonChrome(person = {}) {
  const displayName = getDisplayName(person);
  const meta = buildPersonMeta(person) || "Workspace";

  setText("personName", displayName, "Young person");
  setText("personMeta", meta, "Workspace");

  setText("mobilePersonName", displayName, "Young person");
  setText("mobilePersonMeta", meta, "Workspace");

  setText("profileSnapshotName", displayName, "Young person");
  setText("profileSnapshotMeta", meta, "Profile snapshot");

  updateSnapshotPhoto(person);
  updateSidebarAvatar(person);
}

export function updateSectionChrome(section = "workspace") {
  const title = SECTION_TITLES?.[section] || "Today’s workspace";
  const subtitle =
    SECTION_SUBTITLES?.[section] ||
    "A calm space to record, reflect and respond to what matters today.";

  setText("pageTitle", title, "Today’s workspace");
  setText("pageSubtitle", subtitle, "What matters today");

  document.querySelectorAll("[data-nav-section]").forEach((button) => {
    const isActive = button.dataset.navSection === section;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.querySelectorAll(".mobile-tab-btn[data-nav-section]").forEach((button) => {
    const isActive = button.dataset.navSection === section;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export function openMobileNav() {
  qs("mobileNavBackdrop")?.classList.remove("hidden");
  qs("mobileNavDrawer")?.classList.remove("hidden");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "false");
}

export function closeMobileNav() {
  qs("mobileNavBackdrop")?.classList.add("hidden");
  qs("mobileNavDrawer")?.classList.add("hidden");
  qs("mobileNavDrawer")?.setAttribute("aria-hidden", "true");
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

export function bindShellChrome() {
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

  document.addEventListener("click", async (event) => {
    const navButton = event.target.closest(".mobile-tab-btn[data-nav-section], #mobileNavContent [data-nav-section]");
    if (!navButton) return;
    await openSectionFromButton(navButton);
  });
}

export function refreshShellChrome() {
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  updateSectionChrome(state.currentSection || state.activeSection || "workspace");
  refreshAssistantUi();
}
