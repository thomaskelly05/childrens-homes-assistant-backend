const youngPeopleGrid = document.getElementById("youngPeopleGrid");
const searchInput = document.getElementById("youngPersonSearch");
const placementFilter = document.getElementById("placementFilter");
const homeSelect = document.getElementById("homeSelect");
const openCareHubBtn = document.getElementById("openCareHubBtn");
const refreshGatewayBtn = document.getElementById("refreshGatewayBtn");
const statusBar = document.getElementById("statusBar");

const addYoungPersonBtn = document.getElementById("addYoungPersonBtn");
const youngPersonModal = document.getElementById("youngPersonModal");
const closeYoungPersonModalBtn = document.getElementById("closeYoungPersonModalBtn");
const cancelYoungPersonBtn = document.getElementById("cancelYoungPersonBtn");
const youngPersonForm = document.getElementById("youngPersonForm");
const youngPersonModalTitle = document.getElementById("youngPersonModalTitle");

const youngPersonSelect = document.getElementById("youngPersonSelect");
const youngPersonIdInput = document.getElementById("youngPersonId");
const ypFirstName = document.getElementById("ypFirstName");
const ypLastName = document.getElementById("ypLastName");
const ypPreferredName = document.getElementById("ypPreferredName");
const ypDOB = document.getElementById("ypDOB");
const ypGender = document.getElementById("ypGender");
const ypEthnicity = document.getElementById("ypEthnicity");
const ypAdmissionDate = document.getElementById("ypAdmissionDate");
const ypPlacementStatus = document.getElementById("ypPlacementStatus");
const ypRiskLevel = document.getElementById("ypRiskLevel");

let allYoungPeople = [];
let allHomes = [];
let selectedHomeId = "";
let selectedYoungPersonId = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showStatus(message, type = "info") {
  if (!statusBar) return;
  statusBar.classList.remove("hidden");
  statusBar.dataset.type = type;
  statusBar.textContent = message;
}

function clearStatus() {
  if (!statusBar) return;
  statusBar.classList.add("hidden");
  statusBar.textContent = "";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function normaliseId(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? String(num) : "";
}

function getPersonHomeId(person) {
  return normaliseId(person.home_id || person.homeId || person.home?.id);
}

function getDisplayName(person) {
  return (
    `${person.preferred_name || person.first_name || ""} ${person.last_name || ""}`.trim() ||
    "Unnamed child"
  );
}

function getRiskBadgeClass(riskLevel) {
  const value = String(riskLevel || "").toLowerCase();

  if (value === "high" || value === "critical") return "badge alert";
  if (value === "medium") return "badge warning";
  if (value === "low") return "badge success";
  return "badge muted";
}

function getPlacementBadgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active") return "badge success";
  if (value === "planned") return "badge warning";
  if (value === "discharged") return "badge muted";
  return "badge muted";
}

function deriveHomesFromYoungPeople() {
  const map = new Map();

  allYoungPeople.forEach((person) => {
    const id = getPersonHomeId(person);
    const name = person.home_name || person.homeName || person.home?.name || "Unassigned home";

    if (!id) return;
    map.set(id, { id, name });
  });

  allHomes = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function renderHomeSelect() {
  if (!homeSelect) return;

  homeSelect.innerHTML = [
    `<option value="">Choose a home</option>`,
    ...allHomes.map((home) => `<option value="${escapeHtml(home.id)}">${escapeHtml(home.name)}</option>`),
  ].join("");

  if (selectedHomeId) {
    homeSelect.value = selectedHomeId;
  }
}

function getFilteredYoungPeople() {
  const searchTerm = (searchInput?.value || "").trim().toLowerCase();
  const placementValue = (placementFilter?.value || "").trim().toLowerCase();

  return allYoungPeople.filter((person) => {
    const fullName = `${person.first_name || ""} ${person.last_name || ""}`.toLowerCase();
    const preferredName = `${person.preferred_name || ""}`.toLowerCase();
    const homeName = `${person.home_name || person.homeName || ""}`.toLowerCase();
    const placementStatus = String(person.placement_status || "").toLowerCase();
    const personHomeId = getPersonHomeId(person);

    const matchesHome = !selectedHomeId || personHomeId === selectedHomeId;

    const matchesSearch =
      !searchTerm ||
      fullName.includes(searchTerm) ||
      preferredName.includes(searchTerm) ||
      homeName.includes(searchTerm);

    const matchesPlacement = !placementValue || placementStatus === placementValue;

    return matchesHome && matchesSearch && matchesPlacement;
  });
}

function renderYoungPersonSelect() {
  if (!youngPersonSelect) return;

  const filtered = getFilteredYoungPeople();

  youngPersonSelect.innerHTML = [
    `<option value="">Choose a child</option>`,
    ...filtered.map((person) => {
      const name = getDisplayName(person);
      const home = person.home_name || person.homeName || "No home assigned";
      return `<option value="${escapeHtml(person.id)}">${escapeHtml(name)} — ${escapeHtml(home)}</option>`;
    }),
  ].join("");

  if (selectedYoungPersonId) {
    youngPersonSelect.value = selectedYoungPersonId;
  }
}

function renderYoungPeople() {
  if (!youngPeopleGrid) {
    renderYoungPersonSelect();
    return;
  }

  const filtered = getFilteredYoungPeople();

  renderYoungPersonSelect();

  if (!selectedHomeId && homeSelect) {
    youngPeopleGrid.innerHTML = `
      <div class="panel-card empty-state">
        <h3>Choose a home first</h3>
        <p>Select the home you are working in, then choose a child to open their Care Hub.</p>
      </div>
    `;
    return;
  }

  if (!filtered.length) {
    youngPeopleGrid.innerHTML = `
      <div class="panel-card empty-state">
        <h3>No children found</h3>
        <p>Try changing the search, placement filter or selected home.</p>
      </div>
    `;
    return;
  }

  youngPeopleGrid.innerHTML = filtered
    .map((person) => {
      const displayName = getDisplayName(person);
      const age = calculateAge(person.date_of_birth);
      const initials = displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return `
        <article class="young-person-card panel-card" data-person-id="${escapeHtml(person.id)}">
          <div class="young-person-card-top">
            <div class="young-person-avatar" aria-hidden="true">${escapeHtml(initials || "YP")}</div>

            <div>
              <h3>${escapeHtml(displayName)}</h3>
              <p>${escapeHtml(person.home_name || person.homeName || "No home assigned")}</p>
            </div>

            <div class="badge-row">
              <span class="${getPlacementBadgeClass(person.placement_status)}">${escapeHtml(person.placement_status || "unknown")}</span>
              <span class="${getRiskBadgeClass(person.summary_risk_level)}">${escapeHtml(person.summary_risk_level || "unknown")} risk</span>
            </div>
          </div>

          <div class="profile-grid">
            <div class="profile-label">Full name</div>
            <div class="profile-value">${escapeHtml(`${person.first_name || ""} ${person.last_name || ""}`.trim() || "—")}</div>

            <div class="profile-label">Age</div>
            <div class="profile-value">${escapeHtml(age)}</div>

            <div class="profile-label">Date of birth</div>
            <div class="profile-value">${escapeHtml(formatDate(person.date_of_birth))}</div>

            <div class="profile-label">Admission date</div>
            <div class="profile-value">${escapeHtml(formatDate(person.admission_date))}</div>

            <div class="profile-label">Keyworker</div>
            <div class="profile-value">${escapeHtml(person.primary_keyworker_name || "—")}</div>
          </div>

          <div class="card-actions">
            <button class="btn primary open-shell-btn" type="button" data-id="${escapeHtml(person.id)}" data-home-id="${escapeHtml(getPersonHomeId(person))}">
              Open Care Hub
            </button>
            <button class="btn secondary edit-young-person-btn" type="button" data-id="${escapeHtml(person.id)}">
              Edit
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  wireCardButtons();
}

async function loadYoungPeople() {
  if (youngPeopleGrid) {
    youngPeopleGrid.innerHTML = `<div class="panel-card loading-state"><p>Loading homes and children...</p></div>`;
  }

  clearStatus();

  try {
    const response = await fetch("/young-people", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load children and young people");
    }

    const data = await response.json();
    allYoungPeople = Array.isArray(data.young_people)
      ? data.young_people
      : Array.isArray(data.items)
        ? data.items
        : [];

    deriveHomesFromYoungPeople();
    renderHomeSelect();
    renderYoungPeople();

    if (!allYoungPeople.length) {
      showStatus("No children or young people are currently available.", "info");
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Unable to load homes and children.", "error");

    if (youngPeopleGrid) {
      youngPeopleGrid.innerHTML = `
        <div class="panel-card empty-state">
          <h3>Unable to load homes and children</h3>
          <p>Please refresh or check your access.</p>
        </div>
      `;
    }
  }
}

function openCareHub(personId, homeId = "") {
  const safePersonId = normaliseId(personId);
  const safeHomeId = normaliseId(homeId || selectedHomeId);

  if (!safeHomeId) {
    showStatus("Choose a home before opening a child’s Care Hub.", "warning");
    homeSelect?.focus();
    return;
  }

  if (!safePersonId) {
    showStatus("Choose a child before opening the Care Hub.", "warning");
    youngPersonSelect?.focus();
    return;
  }

  window.location.href = `/young-people-shell.html?home_id=${encodeURIComponent(safeHomeId)}&young_person_id=${encodeURIComponent(safePersonId)}`;
}

function wireCardButtons() {
  document.querySelectorAll(".open-shell-btn").forEach((button) => {
    button.addEventListener("click", () => {
      selectedYoungPersonId = normaliseId(button.dataset.id);
      selectedHomeId = normaliseId(button.dataset.homeId || selectedHomeId);
      openCareHub(selectedYoungPersonId, selectedHomeId);
    });
  });

  document.querySelectorAll(".edit-young-person-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const person = allYoungPeople.find((item) => Number(item.id) === id);
      if (!person) return;
      openYoungPersonModal(person);
    });
  });
}

function resetYoungPersonForm() {
  if (!youngPersonForm) return;

  youngPersonForm.reset();
  if (youngPersonIdInput) youngPersonIdInput.value = "";
  if (ypPlacementStatus) ypPlacementStatus.value = "active";
  if (ypRiskLevel) ypRiskLevel.value = "low";
  if (youngPersonModalTitle) youngPersonModalTitle.textContent = "Add Young Person";
}

function openYoungPersonModal(person = null) {
  if (!youngPersonModal || !youngPersonForm) return;

  resetYoungPersonForm();

  if (person) {
    if (youngPersonModalTitle) youngPersonModalTitle.textContent = "Edit Young Person";
    if (youngPersonIdInput) youngPersonIdInput.value = person.id || "";
    if (ypFirstName) ypFirstName.value = person.first_name || "";
    if (ypLastName) ypLastName.value = person.last_name || "";
    if (ypPreferredName) ypPreferredName.value = person.preferred_name || "";
    if (ypDOB) ypDOB.value = person.date_of_birth ? person.date_of_birth.split("T")[0] : "";
    if (ypGender) ypGender.value = person.gender || "";
    if (ypEthnicity) ypEthnicity.value = person.ethnicity || "";
    if (ypAdmissionDate) ypAdmissionDate.value = person.admission_date ? person.admission_date.split("T")[0] : "";
    if (ypPlacementStatus) ypPlacementStatus.value = person.placement_status || "active";
    if (ypRiskLevel) ypRiskLevel.value = person.summary_risk_level || "low";
  }

  youngPersonModal.classList.remove("hidden");
  youngPersonModal.setAttribute("aria-hidden", "false");
}

function closeYoungPersonModal() {
  if (!youngPersonModal) return;

  youngPersonModal.classList.add("hidden");
  youngPersonModal.setAttribute("aria-hidden", "true");
  resetYoungPersonForm();
}

async function saveYoungPerson(event) {
  event.preventDefault();

  const existingId = youngPersonIdInput?.value.trim();

  const payload = {
    first_name: ypFirstName?.value.trim() || "",
    last_name: ypLastName?.value.trim() || "",
    preferred_name: ypPreferredName?.value.trim() || null,
    date_of_birth: ypDOB?.value || null,
    gender: ypGender?.value || null,
    ethnicity: ypEthnicity?.value.trim() || null,
    admission_date: ypAdmissionDate?.value || null,
    placement_status: ypPlacementStatus?.value || "active",
    summary_risk_level: ypRiskLevel?.value || "low",
  };

  const url = existingId ? `/young-people/${existingId}` : "/young-people";
  const method = existingId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Failed to save young person";
      try {
        const body = await response.json();
        message = body.detail || body.error || message;
      } catch {
        // Ignore JSON parsing failure.
      }
      throw new Error(message);
    }

    closeYoungPersonModal();
    await loadYoungPeople();
    showStatus("Child profile saved.", "success");
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Unable to save young person.", "error");
  }
}

function bindEvents() {
  searchInput?.addEventListener("input", renderYoungPeople);
  placementFilter?.addEventListener("change", renderYoungPeople);

  homeSelect?.addEventListener("change", () => {
    selectedHomeId = normaliseId(homeSelect.value);
    selectedYoungPersonId = "";
    if (youngPersonSelect) youngPersonSelect.value = "";
    clearStatus();
    renderYoungPeople();
  });

  youngPersonSelect?.addEventListener("change", () => {
    selectedYoungPersonId = normaliseId(youngPersonSelect.value);

    const person = allYoungPeople.find((item) => normaliseId(item.id) === selectedYoungPersonId);
    if (person && !selectedHomeId) {
      selectedHomeId = getPersonHomeId(person);
      if (homeSelect) homeSelect.value = selectedHomeId;
    }

    clearStatus();
    renderYoungPeople();
  });

  openCareHubBtn?.addEventListener("click", () => {
    openCareHub(selectedYoungPersonId, selectedHomeId);
  });

  refreshGatewayBtn?.addEventListener("click", loadYoungPeople);

  addYoungPersonBtn?.addEventListener("click", () => openYoungPersonModal());
  closeYoungPersonModalBtn?.addEventListener("click", closeYoungPersonModal);
  cancelYoungPersonBtn?.addEventListener("click", closeYoungPersonModal);
  youngPersonForm?.addEventListener("submit", saveYoungPerson);

  youngPersonModal?.addEventListener("click", (event) => {
    if (event.target === youngPersonModal) closeYoungPersonModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && youngPersonModal && !youngPersonModal.classList.contains("hidden")) {
      closeYoungPersonModal();
    }
  });
}

async function init() {
  bindEvents();
  await loadYoungPeople();
}

init();
