import { state, resetAssistantState, resetComposerState } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import {
  getDisplayName,
  getProfileImage,
  initialsFromName,
  escapeHtml,
  formatShortDate,
} from "../core/utils.js";
import {
  updateAssistantScopeDataset,
  renderAssistantScopeBadges,
  updateYoungPersonHeader,
  renderHeroQuickActions,
  renderMobileBottomBar,
} from "./header.js";
import { renderDesktopNav, renderMobileNav, setActiveView, closeMobileNav } from "./nav.js";
import {
  updateAssistantContext,
  renderAssistantInsights,
  renderAssistantMessages,
  closeAssistant,
} from "./assistant-ui.js";
import { loadCurrentView } from "../features/workspace.js";
import { closeComposer } from "./composer.js";
import { closeDrawer } from "./records.js";
import { showError, clearStatus } from "./ui.js";

export function showSelectorOnlyMode() {
  els.selectorScreen?.classList.remove("hidden");
  els.workspaceScreen?.classList.add("hidden");
  els.refreshBtn?.classList.add("hidden");
  clearStatus();
}

export function showWorkspaceMode() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
  els.refreshBtn?.classList.remove("hidden");
}

export function renderSelectorList(items = []) {
  if (!els.selectorList) return;

  if (!items.length) {
    els.selectorList.innerHTML = `
      <div class="empty-state">
        <p>No young people found.</p>
      </div>
    `;
    return;
  }

  els.selectorList.innerHTML = `
    <div class="selector-grid">
      ${items
        .map((item) => {
          const fullName = getDisplayName(item);
          const image = getProfileImage(item);

          const meta = [
            item.preferred_name ? `Prefers ${item.preferred_name}` : null,
            item.date_of_birth ? `DOB ${formatShortDate(item.date_of_birth)}` : null,
            item.home_name || null,
          ].filter(Boolean);

          return `
            <button
              class="selector-card selector-card--photo"
              type="button"
              data-open-young-person="${item.id}"
              aria-label="Open workspace for ${escapeHtml(fullName)}"
            >
              <div class="selector-card-media">
                ${
                  image
                    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(fullName)}" class="selector-card-photo" />`
                    : `<div class="selector-card-photo-fallback">${escapeHtml(initialsFromName(fullName))}</div>`
                }
              </div>

              <div class="selector-card-body">
                <h3>${escapeHtml(fullName)}</h3>
                <div class="selector-card-meta">
                  ${meta.map((m) => `<span class="selector-pill">${escapeHtml(m)}</span>`).join("")}
                </div>
                <p>Open workspace</p>
              </div>

              <div class="selector-card-actions">
                <span class="primary-btn selector-open-label">Open</span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

export function filterSelectorList() {
  const term = String(els.selectorSearch?.value || "").trim().toLowerCase();

  if (!term) {
    renderSelectorList(state.selectorItems);
    return;
  }

  const filtered = state.selectorItems.filter((item) => {
    const haystack = [
      item.first_name,
      item.last_name,
      item.preferred_name,
      item.home_name,
      item.date_of_birth,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  renderSelectorList(filtered);
}

export async function loadYoungPersonSelector() {
  showSelectorOnlyMode();

  if (els.selectorList) {
    els.selectorList.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading young people...</p>
        </div>
      </div>
    `;
  }

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || data.items || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    showError(error.message || "Unable to load young people.");

    if (els.selectorList) {
      els.selectorList.innerHTML = `
        <div class="empty-state">
          <p>${escapeHtml(error.message || "Unable to load young people.")}</p>
        </div>
      `;
    }
  }
}

export async function loadYoungPerson() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  state.youngPerson = data.young_person || data.bundle?.young_person || data || {};

  updateYoungPersonHeader();
  updateAssistantScopeDataset();
  updateAssistantContext();
  renderAssistantScopeBadges();
  renderAssistantInsights();
  renderHeroQuickActions();
  renderDesktopNav();
  renderMobileNav();
  renderMobileBottomBar();
}

export async function openYoungPerson(id, options = {}) {
  const preserveView = !!options.preserveView;

  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState({}, "", url.toString());

  state.youngPersonId = Number(id);

  if (!preserveView) {
    setActiveView("overview");
  }

  showWorkspaceMode();
  await loadYoungPerson();
  await loadCurrentView();
}

export async function openYoungPersonFromState() {
  if (!state.youngPersonId) return;
  showWorkspaceMode();
  await loadYoungPerson();
}

export async function goBackToSelector() {
  state.youngPersonId = null;
  state.youngPerson = null;
  state.currentView = "overview";
  state.activeRecordItem = null;
  state.activeRecordType = null;

  resetAssistantState();
  resetComposerState();

  closeDrawer();
  closeComposer(false);
  closeAssistant();
  closeMobileNav();

  const url = new URL(window.location.href);
  url.searchParams.delete("id");
  url.searchParams.delete("young_person_id");
  window.history.replaceState({}, "", url.toString());

  updateAssistantScopeDataset();
  updateAssistantContext();
  renderAssistantMessages();
  renderAssistantInsights();
  renderAssistantScopeBadges();

  await loadYoungPersonSelector();
}
