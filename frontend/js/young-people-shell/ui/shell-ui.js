import { state } from "../state.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import {
  buildImageOrInitials,
  getDisplayName,
} from "../core/utils.js";

const SECTION_META = {
  workspace: {
    title: "Workspace",
    subtitle: "Live operational view across care, risk, appointments and follow-up.",
  },
  overview: {
    title: "Overview",
    subtitle: "What matters today.",
  },
  profile: {
    title: "Profile",
    subtitle: "Identity, needs, context and what matters.",
  },
  timeline: {
    title: "Timeline",
    subtitle: "Chronology, linked records and significant events.",
  },
  handover: {
    title: "Handover",
    subtitle: "Shift continuity, priorities and key context.",
  },
  health: {
    title: "Health",
    subtitle: "Health events, medication and appointments.",
  },
  education: {
    title: "Education",
    subtitle: "Attendance, engagement, progress and support.",
  },
  family: {
    title: "Family",
    subtitle: "Contacts, family time, concerns and follow-up.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Appointments grouped by date.",
  },
  readiness: {
    title: "Readiness",
    subtitle: "Compliance, documents, tasks and inspection readiness.",
  },
  manager: {
    title: "Manager review",
    subtitle: "Oversight, review-needed items and management actions.",
  },
  reports: {
    title: "Reports",
    subtitle: "Monthly reviews, AI reports, handovers and evidence.",
  },
};

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
  const meta = SECTION_META[section] || SECTION_META.workspace;

  setText("pageTitle", meta.title, "Workspace");
  setText("pageSubtitle", meta.subtitle, "What matters today");

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

  qs("profileOpenBtn")?.addEventListener("click", async () => {
    const { loadSection } = await import("./nav.js");
    await loadSection("profile");
  });

  document.querySelectorAll(".mobile-tab-btn[data-nav-section]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openSectionFromButton(button);
    });
  });

  document.querySelectorAll("#mobileNavContent [data-nav-section]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openSectionFromButton(button);
    });
  });
}

export function refreshShellChrome() {
  updateYoungPersonChrome(state.selectedYoungPerson || {});
  updateSectionChrome(state.currentSection || state.activeSection || "workspace");
  refreshAssistantUi();
}