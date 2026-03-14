const selector = document.getElementById("youngPersonSelector");
const summaryCards = document.getElementById("ypSummaryCards");
const alertsContainer = document.getElementById("ypAlerts");
const complianceContainer = document.getElementById("ypCompliance");
const overviewContent = document.getElementById("overviewContent");
const profileContent = document.getElementById("profileContent");

let youngPeople = [];
let selectedYoungPerson = null;
let selectedProfile = null;

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
    selectedProfile = null;
    clearDisplay();
    return;
  }

  const [personRes, profileRes] = await Promise.all([
    fetch(`/young-people/${id}`),
    fetch(`/young-people/${id}/profile`)
  ]);

  if (!personRes.ok || !profileRes.ok) return;

  selectedYoungPerson = await personRes.json();
  selectedProfile = await profileRes.json();

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

function renderAlerts() {
  const alerts = selectedProfile?.alerts || [];
  if (!alerts.length) {
    alertsContainer.innerHTML = `<span class="badge muted">No active alerts</span>`;
    return;
  }

  alertsContainer.innerHTML = alerts.map(alert => {
    return `<span class="badge alert">${alert.title}</span>`;
  }).join("");
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

  renderAlerts();

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

  const legal = selectedProfile?.legal_statuses?.[0];
  const education = selectedProfile?.education_profile;
  const health = selectedProfile?.health_profile;
  const communication = selectedProfile?.communication_profile;
  const identity = selectedProfile?.identity_profile;
  const contacts = selectedProfile?.contacts || [];

  profileContent.innerHTML = `
    <div class="panel-grid">
      <div class="panel-card">
        <h2>Legal Status</h2>
        <div class="profile-grid">
          <div class="profile-label">Legal status</div>
          <div class="profile-value">${legal?.legal_status || "—"}</div>

          <div class="profile-label">Order type</div>
          <div class="profile-value">${legal?.order_type || "—"}</div>

          <div class="profile-label">Order details</div>
          <div class="profile-value">${legal?.order_details || "—"}</div>

          <div class="profile-label">Delegated authority</div>
          <div class="profile-value">${legal?.delegated_authority_details || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Education</h2>
        <div class="profile-grid">
          <div class="profile-label">School</div>
          <div class="profile-value">${education?.school_name || "—"}</div>

          <div class="profile-label">Year group</div>
          <div class="profile-value">${education?.year_group || "—"}</div>

          <div class="profile-label">SEN status</div>
          <div class="profile-value">${education?.sen_status || "—"}</div>

          <div class="profile-label">PEP status</div>
          <div class="profile-value">${education?.pep_status || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Health</h2>
        <div class="profile-grid">
          <div class="profile-label">GP</div>
          <div class="profile-value">${health?.gp_name || "—"}</div>

          <div class="profile-label">Allergies</div>
          <div class="profile-value">${health?.allergies || "—"}</div>

          <div class="profile-label">Diagnoses</div>
          <div class="profile-value">${health?.diagnoses || "—"}</div>

          <div class="profile-label">Mental health</div>
          <div class="profile-value">${health?.mental_health_summary || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Communication</h2>
        <div class="profile-grid">
          <div class="profile-label">Summary</div>
          <div class="profile-value">${communication?.neurodiversity_summary || "—"}</div>

          <div class="profile-label">Style</div>
          <div class="profile-value">${communication?.communication_style || "—"}</div>

          <div class="profile-label">What helps</div>
          <div class="profile-value">${communication?.what_helps || "—"}</div>

          <div class="profile-label">Avoid</div>
          <div class="profile-value">${communication?.what_to_avoid || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Identity</h2>
        <div class="profile-grid">
          <div class="profile-label">Culture</div>
          <div class="profile-value">${identity?.cultural_identity || "—"}</div>

          <div class="profile-label">Language</div>
          <div class="profile-value">${identity?.first_language || "—"}</div>

          <div class="profile-label">Interests</div>
          <div class="profile-value">${identity?.interests || "—"}</div>

          <div class="profile-label">Strengths</div>
          <div class="profile-value">${identity?.strengths_summary || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Contacts</h2>
        ${
          contacts.length
            ? contacts.map(contact => `
              <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
                <strong>${contact.full_name}</strong><br>
                <span>${contact.relationship_to_young_person || "—"}</span><br>
                <span>${contact.phone || "—"}</span><br>
                <span>${contact.supervision_level || "—"}</span>
              </div>
            `).join("")
            : "<p>No contacts recorded.</p>"
        }
      </div>
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
