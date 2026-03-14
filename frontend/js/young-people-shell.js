const selector = document.getElementById("youngPersonSelector");
const summaryCards = document.getElementById("ypSummaryCards");
const alertsContainer = document.getElementById("ypAlerts");
const complianceContainer = document.getElementById("ypCompliance");
const overviewContent = document.getElementById("overviewContent");
const profileContent = document.getElementById("profileContent");

let youngPeople = [];
let selectedYoungPerson = null;

async function loadYoungPeople() {
  const res = await fetch("/young-people");
  if (!res.ok) {
    selector.innerHTML = `<option value="">Failed to load young people</option>`;
    return;
  }

  youngPeople = await res.json();

  selector.innerHTML = `<option value="">Select a young person</option>`;

  youngPeople.forEach(person => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.preferred_name || person.first_name} ${person.last_name || ""}`;
    selector.appendChild(option);
  });
}

async function loadYoungPerson(id) {
  if (!id) {
    selectedYoungPerson = null;
    clearDisplay();
    return;
  }

  const res = await fetch(`/young-people/${id}`);
  if (!res.ok) return;

  selectedYoungPerson = await res.json();
  renderYoungPerson();
}

function clearDisplay() {
  summaryCards.innerHTML = "";
  alertsContainer.innerHTML = `<span class="badge muted">No alerts loaded</span>`;
  complianceContainer.innerHTML = `<span class="badge muted">No compliance data yet</span>`;
  overviewContent.innerHTML = `Select a young person to load overview data.`;
  profileContent.innerHTML = `Profile details will load here.`;
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
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function renderYoungPerson() {
  if (!selectedYoungPerson) return;

  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="label">Preferred Name</div>
      <div class="value">${selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || "—"}</div>
    </div>
    <div class="summary-card">
      <div class="label">Age</div>
      <div class="value">${calculateAge(selectedYoungPerson.date_of_birth)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Home</div>
      <div class="value">${selectedYoungPerson.home_name || "—"}</div>
    </div>
    <div class="summary-card">
      <div class="label">Placement</div>
      <div class="value">${selectedYoungPerson.placement_status || "—"}</div>
    </div>
    <div class="summary-card">
      <div class="label">Risk</div>
      <div class="value">${selectedYoungPerson.summary_risk_level || "—"}</div>
    </div>
  `;

  alertsContainer.innerHTML = `
    <span class="badge muted">Alerts module next</span>
  `;

  complianceContainer.innerHTML = `
    <span class="badge warning">Compliance tracker next</span>
  `;

  overviewContent.innerHTML = `
    <div class="profile-grid">
      <div class="profile-label">Full name</div>
      <div class="profile-value">${selectedYoungPerson.first_name || ""} ${selectedYoungPerson.last_name || ""}</div>

      <div class="profile-label">Preferred name</div>
      <div class="profile-value">${selectedYoungPerson.preferred_name || "—"}</div>

      <div class="profile-label">Date of birth</div>
      <div class="profile-value">${formatDate(selectedYoungPerson.date_of_birth)}</div>

      <div class="profile-label">Admission date</div>
      <div class="profile-value">${formatDate(selectedYoungPerson.admission_date)}</div>

      <div class="profile-label">Discharge date</div>
      <div class="profile-value">${formatDate(selectedYoungPerson.discharge_date)}</div>

      <div class="profile-label">Gender</div>
      <div class="profile-value">${selectedYoungPerson.gender || "—"}</div>

      <div class="profile-label">Ethnicity</div>
      <div class="profile-value">${selectedYoungPerson.ethnicity || "—"}</div>

      <div class="profile-label">NHS number</div>
      <div class="profile-value">${selectedYoungPerson.nhs_number || "—"}</div>

      <div class="profile-label">Local ID</div>
      <div class="profile-value">${selectedYoungPerson.local_id_number || "—"}</div>

      <div class="profile-label">Keyworker</div>
      <div class="profile-value">${selectedYoungPerson.keyworker_first_name ? `${selectedYoungPerson.keyworker_first_name} ${selectedYoungPerson.keyworker_last_name || ""}` : "—"}</div>
    </div>
  `;

  profileContent.innerHTML = `
    <div class="profile-grid">
      <div class="profile-label">First name</div>
      <div class="profile-value">${selectedYoungPerson.first_name || "—"}</div>

      <div class="profile-label">Last name</div>
      <div class="profile-value">${selectedYoungPerson.last_name || "—"}</div>

      <div class="profile-label">Preferred name</div>
      <div class="profile-value">${selectedYoungPerson.preferred_name || "—"}</div>

      <div class="profile-label">Home</div>
      <div class="profile-value">${selectedYoungPerson.home_name || "—"}</div>

      <div class="profile-label">Placement status</div>
      <div class="profile-value">${selectedYoungPerson.placement_status || "—"}</div>

      <div class="profile-label">Risk level</div>
      <div class="profile-value">${selectedYoungPerson.summary_risk_level || "—"}</div>
    </div>
  `;
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      buttons.forEach(btn => btn.classList.remove("active"));
      panels.forEach(panel => panel.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(`tab-${tab}`).classList.add("active");
    });
  });
}

selector.addEventListener("change", async (e) => {
  await loadYoungPerson(e.target.value);
});

document.getElementById("backToListBtn").addEventListener("click", () => {
  window.location.href = "/young-people-page";
});

document.getElementById("editYoungPersonBtn").addEventListener("click", () => {
  if (!selectedYoungPerson) return;
  window.location.href = "/young-people-page";
});

async function init() {
  setupTabs();
  await loadYoungPeople();
}

init();
