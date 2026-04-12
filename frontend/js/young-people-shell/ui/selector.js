import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import {
  escapeHtml,
  setYoungPersonIdInUrl,
  getDisplayName,
  formatDate,
} from "../core/utils.js";
import { refreshShellChrome } from "./shell-ui.js";
import { refreshAssistantUi } from "./assistant-ui.js";

function getSelectorList() {
  return els.selectorList || document.getElementById("selectorList");
}

function renderPhoto(item = {}) {
  const firstInitial = String(item.first_name || "Y").charAt(0).toUpperCase();
  const lastInitial = String(item.last_name || "P").charAt(0).toUpperCase();
  const initials = `${firstInitial}${lastInitial}`;
  const name = getDisplayName(item);

  if (item.photo_url) {
    return `
      <img
        class="selector-card-photo"
        src="${escapeHtml(item.photo_url)}"
        alt="${escapeHtml(name)}"
        onerror="this.outerHTML='<div class=&quot;selector-card-photo-fallback&quot;>${escapeHtml(initials)}</div>'"
      />
    `;
  }

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
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <button
      type="button"
      class="selector-card selector-card--photo"
      data-open-young-person="${escapeHtml(String(item.id || ""))}"
      data-young-person-id="${escapeHtml(String(item.id || ""))}"
    >
      <div class="selector-card-media">
        ${renderPhoto(item)}
      </div>

      <div class="selector-card-body">
        <h3>${escapeHtml(displayName)}</h3>

        ${
          metaPills.length
            ? `<div class="selector-card-meta">
                ${metaPills
                  .map((pill) => `<span class="selector-pill">${escapeHtml(pill)}</span>`)
                  .join("")}
              </div>`
            : ""
        }

        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>

      <div class="selector-card-actions">
        <span class="secondary-btn">Open</span>
      </div>
    </button>
  `;
}

function renderSelectorList(items = []) {
  const list = getSelectorList();
  if (!list) return;

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No young people found.</p>
      </div>
    `;
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
          <div class="spinner"></div>
          <p>Loading young people…</p>
        </div>
      </div>
    `;
  }

  const data = await apiGet("/young-people");
  const items = normaliseYoungPeopleResponse(data);

  state.youngPeople = items;
  filterSelectorList(state.youngPeopleFilter || "");
}

export function goBackToSelector() {
  state.youngPersonId = null;
  state.selectedYoungPerson = null;
  setYoungPersonIdInUrl(null);

  els.workspaceScreen?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");

  refreshShellChrome();
  refreshAssistantUi();
}

export async function openYoungPerson(id, options = {}) {
  if (!id) {
    throw new Error("Young person ID is required.");
  }

  const numericId = Number(id);
  const youngPersonId = Number.isNaN(numericId) ? id : numericId;

  state.youngPersonId = youngPersonId;
  setYoungPersonIdInUrl(youngPersonId);

  const existing =
    (state.youngPeople || []).find(
      (item) => String(item.id) === String(youngPersonId)
    ) || null;

  if (existing) {
    state.selectedYoungPerson = existing;
  } else {
    try {
      const data = await apiGet(`/young-people/${youngPersonId}`);
      state.selectedYoungPerson =
        data.young_person || data.item || data || null;
    } catch {
      state.selectedYoungPerson = { id: youngPersonId };
    }
  }

  els.selectorScreen?.classList.add("hidden");
  els.workspaceScreen?.classList.remove("hidden");

  refreshShellChrome();
  refreshAssistantUi();

  if (!options.skipInitialSectionLoad) {
    const navModule = await import("./nav.js");

    if (typeof navModule.loadSection === "function") {
      await navModule.loadSection(state.currentSection || state.activeSection || "workspace");
    } else if (typeof navModule.handleViewChange === "function") {
      await navModule.handleViewChange(state.currentView || "overview");
    }
  }

  return state.selectedYoungPerson;
}
