import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import {
  escapeHtml,
  setYoungPersonIdInUrl,
  buildImageOrInitials,
  getDisplayName,
  formatDate,
} from "../core/utils.js";

function getSelectorList() {
  return els.youngPeopleList || document.getElementById("youngPeopleList");
}

function getSelectorEmpty() {
  return els.youngPeopleEmpty || document.getElementById("youngPeopleEmpty");
}

function renderYoungPersonCard(item = {}) {
  const displayName = getDisplayName(item);
  const subtitle = [
    item.preferred_name ? `Preferred: ${item.preferred_name}` : "",
    item.placement_status || "",
    item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  const meta = [
    item.date_of_birth ? `DOB ${formatDate(item.date_of_birth)}` : "",
    item.admission_date ? `Admitted ${formatDate(item.admission_date)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return `
    <button
      type="button"
      class="young-person-card"
      data-open-young-person="${escapeHtml(String(item.id || ""))}"
      data-young-person-id="${escapeHtml(String(item.id || ""))}"
    >
      <div class="young-person-card-avatar">
        ${buildImageOrInitials(item, "avatar avatar-lg", "avatar avatar-lg avatar-fallback")}
      </div>

      <div class="young-person-card-content">
        <div class="young-person-card-title">${escapeHtml(displayName)}</div>
        ${subtitle ? `<div class="young-person-card-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        ${meta ? `<div class="young-person-card-meta">${escapeHtml(meta)}</div>` : ""}
      </div>
    </button>
  `;
}

function renderSelectorList(items = []) {
  const list = getSelectorList();
  const empty = getSelectorEmpty();

  if (!list) return;

  if (!items.length) {
    list.innerHTML = "";
    if (empty) {
      empty.classList.remove("hidden");
      empty.innerHTML = `<p>No young people found.</p>`;
    }
    return;
  }

  if (empty) {
    empty.classList.add("hidden");
    empty.innerHTML = "";
  }

  list.innerHTML = items.map(renderYoungPersonCard).join("");
}

function normaliseYoungPeopleResponse(data = {}) {
  return (
    data.items ||
    data.records ||
    data.young_people ||
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term.toLowerCase());
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
  const empty = getSelectorEmpty();

  if (list) {
    list.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading young people...</p>
        </div>
      </div>
    `;
  }

  if (empty) {
    empty.classList.add("hidden");
    empty.innerHTML = "";
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

  els.workspaceShell?.classList.add("hidden");
  els.selectorScreen?.classList.remove("hidden");
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
  els.workspaceShell?.classList.remove("hidden");

  if (!options.skipInitialSectionLoad) {
    const { loadSection } = await import("./nav.js");
    await loadSection(state.currentSection || state.activeSection || "workspace");
  }

  return state.selectedYoungPerson;
}