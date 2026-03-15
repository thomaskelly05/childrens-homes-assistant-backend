const youngPeopleGrid = document.getElementById("youngPeopleGrid");
const searchInput = document.getElementById("youngPersonSearch");
const placementFilter = document.getElementById("placementFilter");

const addYoungPersonBtn = document.getElementById("addYoungPersonBtn");
const youngPersonModal = document.getElementById("youngPersonModal");
const closeYoungPersonModalBtn = document.getElementById("closeYoungPersonModalBtn");
const cancelYoungPersonBtn = document.getElementById("cancelYoungPersonBtn");
const youngPersonForm = document.getElementById("youngPersonForm");
const youngPersonModalTitle = document.getElementById("youngPersonModalTitle");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function getRiskBadgeClass(riskLevel) {
  const value = (riskLevel || "").toLowerCase();

  if (value === "high") return "badge alert";
  if (value === "medium") return "badge warning";
  if (value === "low") return "badge success";
  return "badge muted";
}

function getPlacementBadgeClass(status) {
  const value = (status || "").toLowerCase();

  if (value === "active") return "badge success";
  if (value === "planned") return "badge warning";
  if (value === "discharged") return "badge muted";
  return "badge muted";
}

async function loadYoungPeople() {
  youngPeopleGrid.innerHTML = `<div class="panel-card"><p>Loading young people...</p></div>`;

  try {
    const response = await fetch("/young-people");

    if (!response.ok) {
      throw new Error("Failed to load young people");
    }

    allYoungPeople = await response.json();
    renderYoungPeople();
  } catch (error) {
    console.error(error);
    youngPeopleGrid.innerHTML = `<div class="panel-card"><p>Unable to load young people.</p></div>`;
  }
}

function renderYoungPeople() {
  const searchTerm = (searchInput.value || "").trim().toLowerCase();
  const placementValue = (placementFilter.value || "").trim().toLowerCase();

  const filtered = allYoungPeople.filter((person) => {
    const fullName = `${person.first_name || ""} ${person.last_name || ""}`.toLowerCase();
    const preferredName = `${person.preferred_name || ""}`.toLowerCase();
    const placementStatus = (person.placement_status || "").toLowerCase();

    const matchesSearch =
      !searchTerm ||
      fullName.includes(searchTerm) ||
      preferredName.includes(searchTerm);

    const matchesPlacement =
      !placementValue || placementStatus === placementValue;

    return matchesSearch && matchesPlacement;
  });

  if (!filtered.length) {
    youngPeopleGrid.innerHTML = `<div class="panel-card"><p>No young people found.</p></div>`;
    return;
  }

  youngPeopleGrid.innerHTML = filtered
    .map((person) => {
      const displayName =
        `${person.preferred_name || person.first_name || ""} ${person.last_name || ""}`.trim() || "Unnamed";
      const age = calculateAge(person.date_of_birth);

      return `
        <div class="young-person-card panel-card">
          <div class="young-person-card-top">
            <div>
              <h3>${escapeHtml(displayName)}</h3>
              <p>${escapeHtml(person.home_name || "No home assigned")}</p>
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
            <div class="profile-value">${age}</div>

            <div class="profile-label">Date of birth</div>
            <div class="profile-value">${formatDate(person.date_of_birth)}</div>

            <div class="profile-label">Admission date</div>
            <div class="profile-value">${formatDate(person.admission_date)}</div>

            <div class="profile-label">Keyworker</div>
            <div class="profile-value">${
              person.keyworker_first_name
                ? escapeHtml(`${person.keyworker_first_name} ${person.keyworker_last_name || ""}`.trim())
                : "—"
            }</div>
          </div>

          <div class="card-actions">
            <button class="btn open-shell-btn" data-id="${person.id}">
              Open Record
            </button>
            <button class="btn secondary edit-young-person-btn" data-id="${person.id}">
              Edit
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  wireCardButtons();
}

function wireCardButtons() {
  document.querySelectorAll(".open-shell-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      window.location.href = `/young-people-shell?young_person_id=${id}`;
    });
  });

  document.querySelectorAll(".edit-young-person-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const person = allYoungPeople.find((item) => item.id === id);
      if (!person) return;
      openYoungPersonModal(person);
    });
  });
}

function resetYoungPersonForm() {
  youngPersonForm.reset();
  youngPersonIdInput.value = "";
  ypPlacementStatus.value = "active";
  ypRiskLevel.value = "low";
  youngPersonModalTitle.textContent = "Add Young Person";
}

function openYoungPersonModal(person = null) {
  resetYoungPersonForm();

  if (person) {
    youngPersonModalTitle.textContent = "Edit Young Person";
    youngPersonIdInput.value = person.id || "";
    ypFirstName.value = person.first_name || "";
    ypLastName.value = person.last_name || "";
    ypPreferredName.value = person.preferred_name || "";
    ypDOB.value = person.date_of_birth ? person.date_of_birth.split("T")[0] : "";
    ypGender.value = person.gender || "";
    ypEthnicity.value = person.ethnicity || "";
    ypAdmissionDate.value = person.admission_date ? person.admission_date.split("T")[0] : "";
    ypPlacementStatus.value = person.placement_status || "active";
    ypRiskLevel.value = person.summary_risk_level || "low";
  }

  youngPersonModal.classList.remove("hidden");
}

function closeYoungPersonModal() {
  youngPersonModal.classList.add("hidden");
  resetYoungPersonForm();
}

async function saveYoungPerson(event) {
  event.preventDefault();

  const existingId = youngPersonIdInput.value.trim();

  const payload = {
    first_name: ypFirstName.value.trim(),
    last_name: ypLastName.value.trim(),
    preferred_name: ypPreferredName.value.trim() || null,
    date_of_birth: ypDOB.value || null,
    gender: ypGender.value || null,
    ethnicity: ypEthnicity.value.trim() || null,
    admission_date: ypAdmissionDate.value || null,
    placement_status: ypPlacementStatus.value || "active",
    summary_risk_level: ypRiskLevel.value || "low",
  };

  const url = existingId ? `/young-people/${existingId}` : "/young-people";
  const method = existingId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to save young person");
    }

    closeYoungPersonModal();
    await loadYoungPeople();
  } catch (error) {
    console.error(error);
    alert("Unable to save young person. Please check your backend route fields.");
  }
}

searchInput.addEventListener("input", renderYoungPeople);
placementFilter.addEventListener("change", renderYoungPeople);

addYoungPersonBtn.addEventListener("click", () => openYoungPersonModal());
closeYoungPersonModalBtn.addEventListener("click", closeYoungPersonModal);
cancelYoungPersonBtn.addEventListener("click", closeYoungPersonModal);
youngPersonForm.addEventListener("submit", saveYoungPerson);

youngPersonModal.addEventListener("click", (event) => {
  if (event.target === youngPersonModal) {
    closeYoungPersonModal();
  }
});

async function init() {
  await loadYoungPeople();
}

init();
