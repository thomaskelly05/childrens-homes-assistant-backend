import {
  state,
  clearSelectedYoungPerson,
  setSelectedYoungPerson,
  setCurrentScope,
} from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import {
  escapeHtml,
  setYoungPersonIdInUrl,
  getDisplayName,
  formatDate,
  initialsFromName,
} from "../core/utils.js";
import { refreshShellChrome } from "./shell-ui.js";
import { refreshAssistantUi } from "./assistant-ui.js";
import {
  onYoungPersonSelected,
  renderAssistantControllerPanels,
} from "./assistant-controller.js";

function getSelectorList() {
  return els.selectorList || document.getElementById("selectorList");
}

function renderEmptyState({
  title = "Nothing to show",
  message = "There is nothing to display right now.",
} = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-state-icon" aria-hidden="true">○</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function renderPhoto(item = {}) {
  const name = getDisplayName(item);
  const initials = initialsFromName(name);
  return `<div class="selector-card-photo-fallback">${escapeHtml(initials)}</div>`;
}

function renderYoungPersonCard(item = {}) {
  const displayName = getDisplayName(item);

  const metaPills = [
    item.preferred_name ? `Prefers ${item.preferred_name}` : "",
    item.placement_status || "",
    item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : "",
  ].filter(Boolean);

  const subtitle = [
    item.date_of_birth ? `DOB ${formatDate(item.date_of_birth)}` : "",
    item.admission_date ? `Admitted ${formatDate(item.admission_date)}` : "",
    item.home_name || "",
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <button
      type="button"
      class="selector-card selector-card--photo"
      data-open-young-person="${escapeHtml(String(item.id || ""))}"
      data-young-person-id="${escapeHtml(String(item.id || ""))}"
      aria-label="Open workspace for ${escapeHtml(displayName)}"
    >
      <div class="selector-card-media">
        ${renderPhoto(item)}
      </div>

      <div class="selector-card-body">
        <h3>${escapeHtml(displayName)}</h3>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}

        ${
          metaPills.length
            ? `<div class="selector-card-meta">
                ${metaPills
                  .map(
                    (pill) => `<span class="selector-pill">${escapeHtml(pill)}</span>`
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>

      <div class="selector-card-actions">
        <span class="secondary-btn">Open workspace</span>
      </div>
    </button>
  `;
}

function renderSelectorList(items = []) {
  const list = getSelectorList();
  if (!list) return;

  if (!items.length) {
    list.innerHTML = renderEmptyState({
      title: "No young people found",
      message: "Try a different search or refresh the list.",
    });
    return;
  }

  list.innerHTML = `
    <div class="selector-grid">
      ${items.map(renderYoungPersonCard).join("")}
    </div>
  `;
}

function normaliseYoungPeopleResponse(data = {}) {
  return (
    data.young_people ||
    data.items ||
    data.records ||
    data.youngPeople ||
    []
  );
}

function matchesSearch(item = {}, term = "") {
  if (!term) return true;

  const haystack = [
    item.first_name,
    item.last_name,
    item.preferred_name,
    item.full_name,
    item.name,
    item.placement_status,
    item.summary_risk_level,
    item.local_id_number,
    item.nhs_number,
    item.home_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(String(term).toLowerCase());
}

function getResolvedSection() {
  return (
    state.currentSection ||
    state.activeSection ||
    state.currentView ||
    "workspace"
  );
}

function showSelectorScreen() {
  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
}

function showWorkspaceScreen() {
  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");
}

export function filterSelectorList(term = "") {
  state.youngPeopleFilter = term || "";

  const filtered = (state.youngPeople || []).filter((item) =>
    matchesSearch(item, state.youngPeopleFilter)
  );

  renderSelectorList(filtered);
}

export async function loadYoungPersonSelector() {
  const list = getSelectorList();

  if (list) {
    list.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner" aria-hidden="true"></div>
          <p>Loading young people…</p>
        </div>
      </div>
    `;
  }

  const data = await apiGet("/young-people");
  const items = normaliseYoungPeopleResponse(data);

  state.youngPeople = Array.isArray(items) ? items : [];
  filterSelectorList(state.youngPeopleFilter || "");
}

export function goBackToSelector() {
  clearSelectedYoungPerson();
  setYoungPersonIdInUrl(null);

  showSelectorScreen();
  refreshShellChrome();
  refreshAssistantUi();
  renderAssistantControllerPanels();
}

export async function openYoungPerson(id, options = {}) {
  if (!id) {
    throw new Error("Young person ID is required.");
  }

  const numericId = Number(id);
  const youngPersonId = Number.isNaN(numericId) ? id : numericId;

  setYoungPersonIdInUrl(youngPersonId);

  const existing =
    (state.youngPeople || []).find(
      (item) => String(item.id) === String(youngPersonId)
    ) || null;

  if (existing) {
    setSelectedYoungPerson(existing);
  } else {
    try {
      const data = await apiGet(`/young-people/${youngPersonId}`);
      const person = data.young_person || data.item || data || null;
      setSelectedYoungPerson(person || { id: youngPersonId });
    } catch {
      setSelectedYoungPerson({ id: youngPersonId });
    }
  }

  setCurrentScope("child", { resetSection: false });

  showWorkspaceScreen();
  refreshShellChrome();
  refreshAssistantUi();
  renderAssistantControllerPanels();

  await onYoungPersonSelected();

  if (!options.skipInitialSectionLoad) {
    const navModule = await import("./nav.js");

    if (typeof navModule.loadSection === "function") {
      await navModule.loadSection(getResolvedSection());
    }
  }

  return state.selectedYoungPerson;
}
