import {
  state,
  clearSelectedYoungPerson,
  setSelectedYoungPerson,
  setCurrentScope,
  setCurrentSection,
} from "../state.js";
import { els, refreshEls } from "../dom.js";
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
  onAssistantScopeChanged,
  renderAssistantControllerPanels,
} from "./assistant-controller.js";

let safeStartBound = false;

function byId(id) {
  return document.getElementById(id);
}

function getSelectorList() {
  return els.selectorList || byId("selectorList");
}

function getSafeStartEls() {
  return {
    homeSelect: byId("homeSelect"),
    homeSearchInput: byId("homeSearchInput"),
    homeChipList: byId("homeChipList"),
    selectedHomeSummary: byId("selectedHomeSummary"),

    youngPersonSelect: byId("youngPersonSelect"),
    selectorSearch: byId("selectorSearch"),
    youngPersonSearchInput: byId("youngPersonSearchInput"),
    selectedChildSummary: byId("selectedChildSummary"),

    safeStartChooseHomeBtn: byId("safeStartChooseHomeBtn"),
    safeStartAskAssistantBtn: byId("safeStartAskAssistantBtn"),
    safeStartVoiceSearchBtn: byId("safeStartVoiceSearchBtn"),

    openCareHubBtn: byId("openCareHubBtn"),
    launchOpenCareHubBtn: byId("launchOpenCareHubBtn"),
    clearSafeStartBtn: byId("clearSafeStartBtn"),
    safeStartReadySummary: byId("safeStartReadySummary"),

    readyHomeName: byId("readyHomeName"),
    readyChildName: byId("readyChildName"),

    launchReadyHome: byId("launchReadyHome"),
    launchReadyChild: byId("launchReadyChild"),
    launchLastRefreshed: byId("launchLastRefreshed"),

    homePickerDrawer: byId("homePickerDrawer"),
    childPickerDrawer: byId("childPickerDrawer"),
    openCareHubDrawer: byId("openCareHubDrawer"),

    welcomeOpenActions: byId("welcomeOpenActions"),
    welcomeReviewsDue: byId("welcomeReviewsDue"),
    welcomeDocumentsDue: byId("welcomeDocumentsDue"),
  };
}

function nowTime() {
  try {
    return new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Updated";
  }
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

function renderLoadingState(message = "Loading young people…") {
  return `
    <div class="loading-state">
      <div>
        <div class="spinner" aria-hidden="true"></div>
        <p>${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function getHomeId(item = {}) {
  return item.home_id || item.homeId || item.home?.id || null;
}

function getHomeName(item = {}) {
  return (
    item.home_name ||
    item.homeName ||
    item.home?.name ||
    (getHomeId(item) ? `Home ${getHomeId(item)}` : "Home")
  );
}

function getYoungPersonId(item = {}) {
  return item.id || item.young_person_id || item.person_id || null;
}

function uniqueHomes(items = []) {
  const homes = new Map();

  items.forEach((item) => {
    const homeId = getHomeId(item);
    if (!homeId) return;

    const key = String(homeId);

    if (!homes.has(key)) {
      homes.set(key, {
        id: key,
        name: getHomeName(item),
      });
    }
  });

  return [...homes.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
}

function normaliseYoungPeopleResponse(data = {}) {
  return (
    data.young_people ||
    data.youngPeople ||
    data.children ||
    data.items ||
    data.records ||
    data.results ||
    []
  );
}

function renderPhoto(item = {}) {
  const name = getDisplayName(item);
  const initials = initialsFromName(name);
  const photoUrl =
    item.photo_url ||
    item.profile_photo_url ||
    item.profilePhotoUrl ||
    item.image_url ||
    "";

  if (photoUrl) {
    return `
      <img
        class="selector-card-photo"
        src="${escapeHtml(photoUrl)}"
        alt=""
        loading="lazy"
        onerror="this.style.display='none'; this.nextElementSibling?.classList.remove('hidden');"
      />
      <div class="selector-card-photo-fallback hidden">${escapeHtml(initials)}</div>
    `;
  }

  return `<div class="selector-card-photo-fallback">${escapeHtml(initials)}</div>`;
}

function buildCardSubtitle(item = {}) {
  return [
    item.date_of_birth ? `DOB ${formatDate(item.date_of_birth)}` : "",
    item.admission_date ? `Admitted ${formatDate(item.admission_date)}` : "",
    item.home_name || item.homeName || "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildMetaPills(item = {}) {
  return [
    item.preferred_name ? `Prefers ${item.preferred_name}` : "",
    item.placement_status || "",
    item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : "",
    item.legal_status || "",
  ].filter(Boolean);
}

function renderYoungPersonCard(item = {}) {
  const id = getYoungPersonId(item);
  const displayName = getDisplayName(item) || `Young person ${id || ""}`;
  const subtitle = buildCardSubtitle(item);
  const metaPills = buildMetaPills(item);
  const active = String(state.youngPersonId || "") === String(id || "");

  return `
    <button
      type="button"
      class="selector-card selector-card--photo ${active ? "active" : ""}"
      data-open-young-person="${escapeHtml(String(id || ""))}"
      data-young-person-id="${escapeHtml(String(id || ""))}"
      aria-label="Choose ${escapeHtml(displayName)}"
      aria-pressed="${active ? "true" : "false"}"
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
        <span class="secondary-btn">Choose child</span>
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
      message: "Choose a home, refresh the list, or try a different search.",
    });
    return;
  }

  list.innerHTML = `
    <div class="selector-grid">
      ${items.map(renderYoungPersonCard).join("")}
    </div>
  `;
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
    item.legal_status,
    item.local_id_number,
    item.nhs_number,
    item.home_name,
    item.homeName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(String(term).toLowerCase());
}

function getSelectedHomeId() {
  const s = getSafeStartEls();
  return String(s.homeSelect?.value || state.homeId || "");
}

function getSelectedChildId() {
  const s = getSafeStartEls();
  return String(s.youngPersonSelect?.value || state.youngPersonId || "");
}

function getChildrenForHome(homeId) {
  const selectedHomeId = String(homeId || "");
  const items = Array.isArray(state.youngPeople) ? state.youngPeople : [];

  if (!selectedHomeId) return [];

  return items.filter(
    (item) => String(getHomeId(item) || "") === selectedHomeId
  );
}

function findChildById(childId) {
  const id = String(childId || "");
  return (
    (state.youngPeople || []).find(
      (item) => String(getYoungPersonId(item) || "") === id
    ) || null
  );
}

function findHomeById(homeId) {
  const id = String(homeId || "");
  return uniqueHomes(state.youngPeople || []).find((home) => home.id === id) || null;
}

function syncAppDataset(child = null) {
  const app = byId("app");
  if (!app) return;

  const childId = state.youngPersonId || getYoungPersonId(child || {}) || "";
  const homeId = state.homeId || getHomeId(child || {}) || "";

  app.dataset.scope = "child";
  app.dataset.assistantScopeType = "child";
  app.dataset.youngPersonId = childId ? String(childId) : "";
  app.dataset.homeId = homeId ? String(homeId) : "";
}

function syncSelectedVisuals() {
  const selectedHomeId = getSelectedHomeId();
  const selectedChildId = getSelectedChildId();

  document.querySelectorAll("[data-safe-home-id]").forEach((chip) => {
    const active = String(chip.dataset.safeHomeId || "") === selectedHomeId;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", active ? "true" : "false");
  });

  document.querySelectorAll("[data-open-young-person]").forEach((card) => {
    const active = String(card.dataset.openYoungPerson || "") === selectedChildId;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateSafeStartReadyState() {
  const s = getSafeStartEls();

  const selectedHomeId = String(s.homeSelect?.value || state.homeId || "");
  const selectedChildId = String(s.youngPersonSelect?.value || state.youngPersonId || "");

  const home = findHomeById(selectedHomeId);
  const child = findChildById(selectedChildId);

  const homeName = home ? home.name : "Not selected";
  const childName = child ? getDisplayName(child) : "Not selected";

  if (s.selectedHomeSummary) {
    s.selectedHomeSummary.textContent = home ? home.name : "No home selected";
  }

  if (s.selectedChildSummary) {
    s.selectedChildSummary.textContent = child
      ? getDisplayName(child)
      : selectedHomeId
        ? "No young person selected"
        : "Choose a home first";
  }

  if (s.readyHomeName) s.readyHomeName.textContent = homeName;
  if (s.readyChildName) s.readyChildName.textContent = childName;

  if (s.launchReadyHome) s.launchReadyHome.textContent = homeName;
  if (s.launchReadyChild) s.launchReadyChild.textContent = childName;
  if (s.launchLastRefreshed) s.launchLastRefreshed.textContent = nowTime();

  if (s.safeStartReadySummary) {
    s.safeStartReadySummary.textContent = child
      ? "Ready to open Care Hub"
      : "Waiting for home and young person";
  }

  [s.openCareHubBtn, s.launchOpenCareHubBtn].forEach((button) => {
    if (!button) return;

    button.textContent = "Open Care Hub";
    button.disabled = !child;
    button.setAttribute("aria-disabled", child ? "false" : "true");
  });

  if (s.openCareHubDrawer && child) {
    s.openCareHubDrawer.open = true;
  }

  syncSelectedVisuals();
}

function updateWelcomeMetrics() {
  const s = getSafeStartEls();

  if (s.welcomeOpenActions) s.welcomeOpenActions.textContent = "Ready";
  if (s.welcomeReviewsDue) s.welcomeReviewsDue.textContent = "Check Care Hub";
  if (s.welcomeDocumentsDue) s.welcomeDocumentsDue.textContent = "Check Care Hub";
}

function updateSafeStartChildren() {
  const s = getSafeStartEls();

  const selectedHomeId = String(s.homeSelect?.value || state.homeId || "");
  const children = getChildrenForHome(selectedHomeId);

  if (s.youngPersonSelect) {
    const previousChildId = String(s.youngPersonSelect.value || "");

    s.youngPersonSelect.innerHTML = `
      <option value="">Choose a child</option>
      ${children
        .map((child) => {
          const id = getYoungPersonId(child);

          return `
            <option value="${escapeHtml(String(id || ""))}">
              ${escapeHtml(getDisplayName(child))}
            </option>
          `;
        })
        .join("")}
    `;

    if (
      previousChildId &&
      children.some((child) => String(getYoungPersonId(child)) === previousChildId)
    ) {
      s.youngPersonSelect.value = previousChildId;
    } else if (
      state.youngPersonId &&
      children.some((child) => String(getYoungPersonId(child)) === String(state.youngPersonId))
    ) {
      s.youngPersonSelect.value = String(state.youngPersonId);
    } else {
      state.youngPersonId = null;
    }
  }

  const term =
    s.selectorSearch?.value ||
    s.youngPersonSearchInput?.value ||
    state.youngPeopleFilter ||
    "";

  const filtered = children.filter((item) => matchesSearch(item, term));
  renderSelectorList(filtered);

  if (s.childPickerDrawer && selectedHomeId) {
    s.childPickerDrawer.open = true;
  }

  updateSafeStartReadyState();
}

function renderSafeStartHomes(items = []) {
  const s = getSafeStartEls();
  const homes = uniqueHomes(items);

  if (s.homeSelect) {
    const previousHomeId = String(s.homeSelect.value || state.homeId || "");

    s.homeSelect.innerHTML = `
      <option value="">Choose a home</option>
      ${homes
        .map(
          (home) => `
            <option value="${escapeHtml(home.id)}">
              ${escapeHtml(home.name)}
            </option>
          `
        )
        .join("")}
    `;

    if (previousHomeId && homes.some((home) => home.id === previousHomeId)) {
      s.homeSelect.value = previousHomeId;
    } else if (!previousHomeId && homes.length === 1) {
      s.homeSelect.value = homes[0].id;
      state.homeId = Number(homes[0].id) || homes[0].id;
    }
  }

  if (s.homeChipList) {
    s.homeChipList.innerHTML = homes.length
      ? homes
          .map((home) => {
            const active = String(state.homeId || "") === String(home.id);

            return `
              <button
                type="button"
                class="safe-chip home-chip ${active ? "active" : ""}"
                data-safe-home-id="${escapeHtml(home.id)}"
                aria-pressed="${active ? "true" : "false"}"
              >
                <strong>${escapeHtml(home.name)}</strong>
                <span>Open young people in this home</span>
              </button>
            `;
          })
          .join("")
      : renderEmptyState({
          title: "No homes found",
          message: "No homes were returned from the young people list.",
        });
  }

  updateSafeStartChildren();
  updateWelcomeMetrics();
}

function setSelectedSafeStartChild(childId) {
  const s = getSafeStartEls();
  const child = findChildById(childId);
  if (!child) return;

  const childHomeId = String(getHomeId(child) || "");

  if (s.homeSelect && childHomeId) {
    s.homeSelect.value = childHomeId;
    state.homeId = Number(childHomeId) || childHomeId;
    updateSafeStartChildren();
  }

  if (s.youngPersonSelect) {
    s.youngPersonSelect.value = String(getYoungPersonId(child));
  }

  state.youngPersonId = Number(getYoungPersonId(child)) || getYoungPersonId(child);

  syncAppDataset(child);
  updateSafeStartReadyState();
}

function showSelectorScreen() {
  refreshEls();

  els.workspacePanel?.classList.add("hidden");
  els.workspaceScreen?.classList.add("hidden");
  els.selectorPanel?.classList.remove("hidden");
  els.selectorScreen?.classList.remove("hidden");

  els.workspacePanel?.setAttribute("aria-hidden", "true");
  els.workspaceScreen?.setAttribute("aria-hidden", "true");
  els.selectorPanel?.setAttribute("aria-hidden", "false");
  els.selectorScreen?.setAttribute("aria-hidden", "false");
}

function showWorkspaceScreen() {
  refreshEls();

  els.selectorPanel?.classList.add("hidden");
  els.selectorScreen?.classList.add("hidden");
  els.workspacePanel?.classList.remove("hidden");
  els.workspaceScreen?.classList.remove("hidden");

  els.selectorPanel?.setAttribute("aria-hidden", "true");
  els.selectorScreen?.setAttribute("aria-hidden", "true");
  els.workspacePanel?.setAttribute("aria-hidden", "false");
  els.workspaceScreen?.setAttribute("aria-hidden", "false");
}

async function openSelectedCareHub(button = null) {
  const childId = getSelectedChildId();

  if (!childId) {
    updateSafeStartReadyState();
    return;
  }

  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }

  try {
    await openYoungPerson(childId, {
      initialSection: "workspace",
      forceInitialSectionLoad: true,
      skipInitialSectionLoad: false,
    });
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
}

function clearSafeStartSelection() {
  const s = getSafeStartEls();

  if (s.homeSelect) s.homeSelect.value = "";
  if (s.youngPersonSelect) s.youngPersonSelect.value = "";
  if (s.selectorSearch) s.selectorSearch.value = "";
  if (s.youngPersonSearchInput) s.youngPersonSearchInput.value = "";
  if (s.homeSearchInput) s.homeSearchInput.value = "";

  state.homeId = null;
  state.youngPersonId = null;
  state.youngPeopleFilter = "";

  clearSelectedYoungPerson();
  setYoungPersonIdInUrl(null);
  syncAppDataset(null);

  renderSafeStartHomes(state.youngPeople || []);
}

function bindSafeStartControls() {
  if (safeStartBound) return;
  safeStartBound = true;

  document.addEventListener("change", (event) => {
    if (event.target?.id === "homeSelect") {
      state.homeId = Number(event.target.value) || event.target.value || null;
      updateSafeStartChildren();
      return;
    }

    if (event.target?.id === "youngPersonSelect") {
      const childId = event.target.value || "";
      if (childId) {
        setSelectedSafeStartChild(childId);
      } else {
        state.youngPersonId = null;
        updateSafeStartReadyState();
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (
      event.target?.id === "selectorSearch" ||
      event.target?.id === "youngPersonSearchInput"
    ) {
      filterSelectorList(event.target.value || "");
    }

    if (event.target?.id === "homeSearchInput") {
      const term = String(event.target.value || "").toLowerCase();
      const s = getSafeStartEls();

      s.homeChipList?.querySelectorAll("[data-safe-home-id]").forEach((chip) => {
        const text = chip.innerText.toLowerCase();
        chip.classList.toggle("hidden", Boolean(term && !text.includes(term)));
      });
    }
  });

  document.addEventListener("click", async (event) => {
    const homeChip = event.target.closest("[data-safe-home-id]");
    if (homeChip) {
      const s = getSafeStartEls();
      const homeId = homeChip.dataset.safeHomeId || "";

      if (s.homeSelect) {
        s.homeSelect.value = homeId;
      }

      state.homeId = Number(homeId) || homeId || null;
      state.youngPersonId = null;

      if (s.youngPersonSelect) {
        s.youngPersonSelect.value = "";
      }

      updateSafeStartChildren();
      return;
    }

    const childCard = event.target.closest("[data-open-young-person]");
    if (childCard) {
      const childId = childCard.dataset.openYoungPerson || "";
      setSelectedSafeStartChild(childId);
      return;
    }

    const openButton = event.target.closest("#openCareHubBtn, #launchOpenCareHubBtn");
    if (openButton) {
      event.preventDefault();
      await openSelectedCareHub(openButton);
      return;
    }

    if (event.target.closest("#clearSafeStartBtn")) {
      clearSafeStartSelection();
      return;
    }

    if (event.target.closest("#safeStartAskAssistantBtn")) {
      byId("assistantLauncher")?.click();
      byId("heroAssistantBtn")?.click();
      return;
    }

    if (event.target.closest("#safeStartChooseHomeBtn")) {
      const s = getSafeStartEls();
      s.homePickerDrawer?.setAttribute("open", "");
      s.homeSelect?.focus?.();
    }
  });
}

export function filterSelectorList(term = "") {
  state.youngPeopleFilter = term || "";

  const selectedHomeId = getSelectedHomeId();

  const filtered = (state.youngPeople || []).filter((item) => {
    const sameHome = selectedHomeId
      ? String(getHomeId(item) || "") === selectedHomeId
      : true;

    return sameHome && matchesSearch(item, state.youngPeopleFilter);
  });

  renderSelectorList(filtered);
  updateSafeStartReadyState();
}

export async function loadYoungPersonSelector() {
  const list = getSelectorList();

  if (list) {
    list.innerHTML = renderLoadingState("Loading homes and young people…");
  }

  bindSafeStartControls();

  try {
    const data = await apiGet("/young-people");
    const items = normaliseYoungPeopleResponse(data);

    state.youngPeople = Array.isArray(items) ? items : [];

    renderSafeStartHomes(state.youngPeople);
    filterSelectorList(state.youngPeopleFilter || "");
    updateSafeStartReadyState();

    return state.youngPeople;
  } catch (error) {
    console.error("[selector] failed to load young people", error);

    if (list) {
      list.innerHTML = renderEmptyState({
        title: "Unable to load young people",
        message: "Please refresh or check the API route for /young-people.",
      });
    }

    throw error;
  }
}

export function goBackToSelector() {
  state.youngPersonId = null;
  clearSelectedYoungPerson();
  setYoungPersonIdInUrl(null);
  syncAppDataset(null);

  showSelectorScreen();
  refreshShellChrome();
  refreshAssistantUi();
  renderAssistantControllerPanels();

  renderSafeStartHomes(state.youngPeople || []);
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
      (item) => String(getYoungPersonId(item)) === String(youngPersonId)
    ) || null;

  if (existing) {
    setSelectedYoungPerson(existing);

    const homeId = getHomeId(existing);
    if (homeId) state.homeId = Number(homeId) || homeId;
  } else {
    try {
      const data = await apiGet(`/young-people/${youngPersonId}`);
      const person = data.young_person || data.youngPerson || data.item || data || null;

      setSelectedYoungPerson(person || { id: youngPersonId });

      const homeId = getHomeId(person || {});
      if (homeId) state.homeId = Number(homeId) || homeId;
    } catch {
      setSelectedYoungPerson({ id: youngPersonId });
    }
  }

  state.youngPersonId = youngPersonId;

  const initialSection = options.initialSection || "workspace";

  setCurrentScope("child", { resetSection: false });
  setCurrentSection(initialSection);
  state.activeSection = initialSection;
  state.currentView = initialSection;

  syncAppDataset(state.selectedYoungPerson || { id: youngPersonId });
  showWorkspaceScreen();

  refreshShellChrome();
  refreshAssistantUi();
  renderAssistantControllerPanels();

  await onAssistantScopeChanged();

  if (!options.skipInitialSectionLoad) {
    const navModule = await import("./nav.js");

    if (typeof navModule.loadSection === "function") {
      await navModule.loadSection(initialSection, {
        force: Boolean(options.forceInitialSectionLoad ?? true),
      });
    }
  }

  return state.selectedYoungPerson;
}