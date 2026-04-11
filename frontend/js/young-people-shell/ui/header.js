import { state } from "../state.js";
import { els } from "../dom.js";
import { VIEW_CONFIG, MOBILE_TABS } from "../core/config.js";
import {
  getDisplayName,
  getProfileImage,
  initialsFromName,
  escapeHtml,
  formatShortDate,
} from "../core/utils.js";

export function updateAssistantScopeDataset() {
  if (!els.app) return;

  els.app.dataset.assistantScopeType = state.youngPersonId ? "young_person" : "global";
  els.app.dataset.youngPersonId = state.youngPersonId ? String(state.youngPersonId) : "";
  els.app.dataset.homeId = state.youngPerson?.home_id != null ? String(state.youngPerson.home_id) : "";
}

export function renderAssistantScopeBadges() {
  const homeText =
    state.youngPerson?.home_name ||
    (state.youngPerson?.home_id != null ? `Home ${state.youngPerson.home_id}` : "");

  const childText = getDisplayName(state.youngPerson || {});
  const viewText = VIEW_CONFIG[state.currentView]?.title || state.currentView;

  if (els.scopeBadge) {
    els.scopeBadge.textContent = state.youngPersonId ? "Young person assistant" : "Assistant";
  }

  if (els.scopeHomeBadge) {
    if (homeText) {
      els.scopeHomeBadge.textContent = homeText;
      els.scopeHomeBadge.classList.remove("hidden");
    } else {
      els.scopeHomeBadge.textContent = "";
      els.scopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.scopeChildBadge) {
    if (childText) {
      els.scopeChildBadge.textContent = childText;
      els.scopeChildBadge.classList.remove("hidden");
    } else {
      els.scopeChildBadge.textContent = "";
      els.scopeChildBadge.classList.add("hidden");
    }
  }

  if (els.scopeShiftBadge) {
    if (viewText) {
      els.scopeShiftBadge.textContent = viewText;
      els.scopeShiftBadge.classList.remove("hidden");
    } else {
      els.scopeShiftBadge.textContent = "";
      els.scopeShiftBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeHomeBadge) {
    if (homeText) {
      els.modalScopeHomeBadge.textContent = homeText;
      els.modalScopeHomeBadge.classList.remove("hidden");
    } else {
      els.modalScopeHomeBadge.textContent = "";
      els.modalScopeHomeBadge.classList.add("hidden");
    }
  }

  if (els.modalScopeChildBadge) {
    if (childText) {
      els.modalScopeChildBadge.textContent = childText;
      els.modalScopeChildBadge.classList.remove("hidden");
    } else {
      els.modalScopeChildBadge.textContent = "";
      els.modalScopeChildBadge.classList.add("hidden");
    }
  }
}

export function updatePageHeader() {
  const config = VIEW_CONFIG[state.currentView];
  if (!config) return;

  if (els.pageTitle) els.pageTitle.textContent = config.title;
  if (els.pageSubtitle) els.pageSubtitle.textContent = config.subtitle;
}

export function updateYoungPersonHeader() {
  const yp = state.youngPerson || {};
  const name = getDisplayName(yp);
  const photo = getProfileImage(yp);

  const meta = [
    yp.preferred_name ? `Prefers ${yp.preferred_name}` : null,
    yp.date_of_birth ? `DOB ${formatShortDate(yp.date_of_birth)}` : null,
    yp.home_name || null,
  ]
    .filter(Boolean)
    .join(" • ");

  if (els.personName) els.personName.textContent = name;
  if (els.personMeta) els.personMeta.textContent = meta || "Young person workspace";

  if (els.mobilePersonName) els.mobilePersonName.textContent = name;
  if (els.mobilePersonMeta) els.mobilePersonMeta.textContent = meta || "Young person workspace";

  if (els.personAvatar) {
    if (photo) {
      els.personAvatar.innerHTML = `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" />`;
    } else {
      els.personAvatar.textContent = initialsFromName(name);
    }
  }

  if (els.mobilePersonAvatar) {
    if (photo) {
      els.mobilePersonAvatar.innerHTML = `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" />`;
    } else {
      els.mobilePersonAvatar.textContent = initialsFromName(name);
    }
  }

  if (els.profileSnapshotPhotoWrap) {
    if (photo) {
      els.profileSnapshotPhotoWrap.innerHTML = `<img class="profile-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" />`;
    } else {
      els.profileSnapshotPhotoWrap.innerHTML = `<div class="profile-photo-fallback">${escapeHtml(initialsFromName(name))}</div>`;
    }
  }

  if (els.profileSnapshotName) els.profileSnapshotName.textContent = name;

  if (els.profileSnapshotMeta) {
    els.profileSnapshotMeta.textContent =
      [
        yp.preferred_name ? `Prefers ${yp.preferred_name}` : null,
        yp.home_name || null,
        yp.summary_risk_level ? `Support level: ${yp.summary_risk_level}` : null,
      ]
        .filter(Boolean)
        .join(" • ") || "Young person profile";
  }
}

export function renderHeroQuickActions() {
  if (!els.heroQuickActions) return;

  els.heroQuickActions.innerHTML = `
    <button class="quick-action-btn" type="button" data-action="daily-note">Add daily note</button>
    <button class="quick-action-btn" type="button" data-action="incident">Add important event</button>
    <button class="quick-action-btn" type="button" data-action="plan">Add support plan</button>
    <button class="quick-action-btn" type="button" data-assistant-quick="handover">Draft handover</button>
  `;
}

export function renderMobileTabState() {
  document.querySelectorAll("[data-mobile-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mobileView === state.currentView);
  });
}

export function renderMobileBottomBar() {
  if (!els.mobileBottomBar) return;

  els.mobileBottomBar.innerHTML = MOBILE_TABS.map((tab) => {
    const isActive = tab.key !== "assistant" && state.currentView === tab.key;

    return `
      <button
        class="mobile-tab-btn ${isActive ? "active" : ""}"
        type="button"
        data-mobile-view="${escapeHtml(tab.key)}"
        data-mobile-tab="${escapeHtml(tab.key)}"
      >
        <span class="mobile-tab-icon">${escapeHtml(tab.icon)}</span>
        <span class="mobile-tab-label">${escapeHtml(tab.label)}</span>
      </button>
    `;
  }).join("");
}
