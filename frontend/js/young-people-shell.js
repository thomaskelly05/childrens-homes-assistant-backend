const selector = document.getElementById("youngPersonSelector");
const summaryCards = document.getElementById("ypSummaryCards");
const alertsContainer = document.getElementById("ypAlerts");
const complianceContainer = document.getElementById("ypCompliance");
const overviewContent = document.getElementById("overviewContent");
const profileContent = document.getElementById("profileContent");
const plansPanel = document.getElementById("tab-plans");
const riskPanel = document.getElementById("tab-risk");
const dailyNotesPanel = document.getElementById("tab-daily-notes");
const incidentsPanel = document.getElementById("tab-incidents");
const healthPanel = document.getElementById("tab-health");
const educationPanel = document.getElementById("tab-education");

let youngPeople = [];
let selectedYoungPerson = null;
let selectedProfile = null;
let selectedPlans = [];
let selectedRisks = [];
let selectedDailyNotes = [];
let selectedIncidents = [];
let selectedHealthRecords = [];
let selectedMedicationProfiles = [];
let selectedMedicationRecords = [];
let selectedEducationRecords = [];

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
    selectedPlans = [];
    selectedRisks = [];
    selectedDailyNotes = [];
    selectedIncidents = [];
    selectedHealthRecords = [];
    selectedMedicationProfiles = [];
    selectedMedicationRecords = [];
    selectedEducationRecords = [];
    clearDisplay();
    return;
  }

  const [
    personRes,
    profileRes,
    plansRes,
    risksRes,
    dailyNotesRes,
    incidentsRes,
    healthRes,
    medicationProfilesRes,
    medicationRecordsRes,
    educationRes
  ] = await Promise.all([
    fetch(`/young-people/${id}`),
    fetch(`/young-people/${id}/profile`),
    fetch(`/young-people/${id}/plans`),
    fetch(`/young-people/${id}/risks`),
    fetch(`/young-people/${id}/daily-notes`),
    fetch(`/young-people/${id}/incidents`),
    fetch(`/young-people/${id}/health`),
    fetch(`/young-people/${id}/medication-profiles`),
    fetch(`/young-people/${id}/medication-records`),
    fetch(`/young-people/${id}/education`)
  ]);

  if (
    !personRes.ok ||
    !profileRes.ok ||
    !plansRes.ok ||
    !risksRes.ok ||
    !dailyNotesRes.ok ||
    !incidentsRes.ok ||
    !healthRes.ok ||
    !medicationProfilesRes.ok ||
    !medicationRecordsRes.ok ||
    !educationRes.ok
  ) return;

  selectedYoungPerson = await personRes.json();
  selectedProfile = await profileRes.json();
  selectedPlans = await plansRes.json();
  selectedRisks = await risksRes.json();
  selectedDailyNotes = await dailyNotesRes.json();
  selectedIncidents = await incidentsRes.json();
  selectedHealthRecords = await healthRes.json();
  selectedMedicationProfiles = await medicationProfilesRes.json();
  selectedMedicationRecords = await medicationRecordsRes.json();
  selectedEducationRecords = await educationRes.json();

  renderYoungPerson();
}

function clearDisplay() {
  summaryCards.innerHTML = "";
  alertsContainer.innerHTML = `<span class="badge muted">No alerts loaded</span>`;
  complianceContainer.innerHTML = `<span class="badge muted">No compliance data yet</span>`;
  overviewContent.innerHTML = `Select a young person to load overview data.`;
  profileContent.innerHTML = `Profile details will load here.`;
  plansPanel.innerHTML = `<div class="panel-card"><h2>Plans</h2><p>Select a young person to load plans.</p></div>`;
  riskPanel.innerHTML = `<div class="panel-card"><h2>Risk</h2><p>Select a young person to load risk assessments.</p></div>`;
  dailyNotesPanel.innerHTML = `<div class="panel-card"><h2>Daily Notes</h2><p>Select a young person to load daily notes.</p></div>`;
  incidentsPanel.innerHTML = `<div class="panel-card"><h2>Incidents</h2><p>Select a young person to load incidents.</p></div>`;
  healthPanel.innerHTML = `<div class="panel-card"><h2>Health</h2><p>Select a young person to load health records.</p></div>`;
  educationPanel.innerHTML = `<div class="panel-card"><h2>Education</h2><p>Select a young person to load education records.</p></div>`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB");
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function renderAlerts() {
  const alerts = selectedProfile?.alerts || [];
  if (!alerts.length) {
    alertsContainer.innerHTML = `<span class="badge muted">No active alerts</span>`;
    return;
  }
  alertsContainer.innerHTML = alerts.map(alert => `<span class="badge alert">${alert.title}</span>`).join("");
}

function renderPlans() {
  if (!selectedPlans.length) {
    plansPanel.innerHTML = `<div class="panel-card"><h2>Plans</h2><p>No support plans recorded yet.</p></div>`;
    return;
  }

  plansPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedPlans.map(plan => `
        <div class="panel-card">
          <h2>${plan.title}</h2>
          <div class="profile-grid">
            <div class="profile-label">Type</div><div class="profile-value">${plan.plan_type || "—"}</div>
            <div class="profile-label">Status</div><div class="profile-value">${plan.status || "—"}</div>
            <div class="profile-label">Start date</div><div class="profile-value">${formatDate(plan.start_date)}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(plan.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${plan.owner_first_name ? `${plan.owner_first_name} ${plan.owner_last_name || ""}` : "—"}</div>
            <div class="profile-label">Presenting need</div><div class="profile-value">${plan.presenting_need || "—"}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${plan.summary || "—"}</div>
            <div class="profile-label">PACE guidance</div><div class="profile-value">${plan.pace_guidance || "—"}</div>
            <div class="profile-label">Triggers</div><div class="profile-value">${plan.triggers || "—"}</div>
            <div class="profile-label">Protective factors</div><div class="profile-value">${plan.protective_factors || "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRisks() {
  if (!selectedRisks.length) {
    riskPanel.innerHTML = `<div class="panel-card"><h2>Risk</h2><p>No risk assessments recorded yet.</p></div>`;
    return;
  }

  riskPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedRisks.map(risk => `
        <div class="panel-card">
          <h2>${risk.title}</h2>
          <div class="profile-grid">
            <div class="profile-label">Category</div><div class="profile-value">${risk.category || "—"}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${risk.severity || "—"}</div>
            <div class="profile-label">Likelihood</div><div class="profile-value">${risk.likelihood || "—"}</div>
            <div class="profile-label">Status</div><div class="profile-value">${risk.status || "—"}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(risk.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${risk.owner_first_name ? `${risk.owner_first_name} ${risk.owner_last_name || ""}` : "—"}</div>
            <div class="profile-label">Concern summary</div><div class="profile-value">${risk.concern_summary || "—"}</div>
            <div class="profile-label">Known triggers</div><div class="profile-value">${risk.known_triggers || "—"}</div>
            <div class="profile-label">Early warning signs</div><div class="profile-value">${risk.early_warning_signs || "—"}</div>
            <div class="profile-label">Current controls</div><div class="profile-value">${risk.current_controls || "—"}</div>
            <div class="profile-label">De-escalation</div><div class="profile-value">${risk.deescalation_strategies || "—"}</div>
            <div class="profile-label">Response actions</div><div class="profile-value">${risk.response_actions || "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDailyNotes() {
  if (!selectedDailyNotes.length) {
    dailyNotesPanel.innerHTML = `<div class="panel-card"><h2>Daily Notes</h2><p>No daily notes recorded yet.</p></div>`;
    return;
  }

  dailyNotesPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedDailyNotes.map(note => `
        <div class="panel-card">
          <h2>${formatDate(note.note_date)} • ${note.shift_type || "Shift"}</h2>
          <div class="profile-grid">
            <div class="profile-label">Mood</div><div class="profile-value">${note.mood || "—"}</div>
            <div class="profile-label">Presentation</div><div class="profile-value">${note.presentation || "—"}</div>
            <div class="profile-label">Activities</div><div class="profile-value">${note.activities || "—"}</div>
            <div class="profile-label">Education</div><div class="profile-value">${note.education_update || "—"}</div>
            <div class="profile-label">Health</div><div class="profile-value">${note.health_update || "—"}</div>
            <div class="profile-label">Family</div><div class="profile-value">${note.family_update || "—"}</div>
            <div class="profile-label">Behaviour</div><div class="profile-value">${note.behaviour_update || "—"}</div>
            <div class="profile-label">Young person voice</div><div class="profile-value">${note.young_person_voice || "—"}</div>
            <div class="profile-label">Positives</div><div class="profile-value">${note.positives || "—"}</div>
            <div class="profile-label">Actions required</div><div class="profile-value">${note.actions_required || "—"}</div>
            <div class="profile-label">Significance</div><div class="profile-value">${note.significance || "—"}</div>
            <div class="profile-label">Author</div><div class="profile-value">${note.author_first_name ? `${note.author_first_name} ${note.author_last_name || ""}` : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderIncidents() {
  if (!selectedIncidents.length) {
    incidentsPanel.innerHTML = `<div class="panel-card"><h2>Incidents</h2><p>No incidents recorded yet.</p></div>`;
    return;
  }

  incidentsPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedIncidents.map(incident => `
        <div class="panel-card">
          <h2>${incident.incident_type || "Incident"}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(incident.incident_datetime || incident.created_at)}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${incident.severity || "—"}</div>
            <div class="profile-label">Location</div><div class="profile-value">${incident.location || "—"}</div>
            <div class="profile-label">Antecedent</div><div class="profile-value">${incident.antecedent || "—"}</div>
            <div class="profile-label">Description</div><div class="profile-value">${incident.description || "—"}</div>
            <div class="profile-label">Staff response</div><div class="profile-value">${incident.staff_response || "—"}</div>
            <div class="profile-label">Child response</div><div class="profile-value">${incident.child_response || "—"}</div>
            <div class="profile-label">Outcome</div><div class="profile-value">${incident.outcome || "—"}</div>
            <div class="profile-label">Injury</div><div class="profile-value">${incident.injury_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Damage</div><div class="profile-value">${incident.property_damage_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Police involved</div><div class="profile-value">${incident.police_involved ? "Yes" : "No"}</div>
            <div class="profile-label">Safeguarding</div><div class="profile-value">${incident.safeguarding_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Manager review</div><div class="profile-value">${incident.manager_review_status || "—"}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${incident.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Staff</div><div class="profile-value">${incident.staff_first_name ? `${incident.staff_first_name} ${incident.staff_last_name || ""}` : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHealth() {
  const healthCards = [];
  const medicationCards = [];

  if (selectedHealthRecords.length) {
    healthCards.push(...selectedHealthRecords.map(record => `
      <div class="panel-card">
        <h2>${record.title}</h2>
        <div class="profile-grid">
          <div class="profile-label">Type</div><div class="profile-value">${record.record_type || "—"}</div>
          <div class="profile-label">Event date/time</div><div class="profile-value">${formatDateTime(record.event_datetime)}</div>
          <div class="profile-label">Summary</div><div class="profile-value">${record.summary || "—"}</div>
          <div class="profile-label">Professional</div><div class="profile-value">${record.professional_name || "—"}</div>
          <div class="profile-label">Outcome</div><div class="profile-value">${record.outcome || "—"}</div>
          <div class="profile-label">Follow-up required</div><div class="profile-value">${record.follow_up_required ? "Yes" : "No"}</div>
          <div class="profile-label">Next action date</div><div class="profile-value">${formatDate(record.next_action_date)}</div>
          <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? `${record.created_by_first_name} ${record.created_by_last_name || ""}` : "—"}</div>
        </div>
      </div>
    `));
  }

  if (selectedMedicationProfiles.length) {
    medicationCards.push(...selectedMedicationProfiles.map(profile => `
      <div class="panel-card">
        <h2>${profile.medication_name}</h2>
        <div class="profile-grid">
          <div class="profile-label">Dosage</div><div class="profile-value">${profile.dosage || "—"}</div>
          <div class="profile-label">Route</div><div class="profile-value">${profile.route || "—"}</div>
          <div class="profile-label">Frequency</div><div class="profile-value">${profile.frequency || "—"}</div>
          <div class="profile-label">PRN guidance</div><div class="profile-value">${profile.prn_guidance || "—"}</div>
          <div class="profile-label">Prescribed by</div><div class="profile-value">${profile.prescribed_by || "—"}</div>
          <div class="profile-label">Start date</div><div class="profile-value">${formatDate(profile.start_date)}</div>
          <div class="profile-label">End date</div><div class="profile-value">${formatDate(profile.end_date)}</div>
          <div class="profile-label">Active</div><div class="profile-value">${profile.is_active ? "Yes" : "No"}</div>
          <div class="profile-label">Notes</div><div class="profile-value">${profile.notes || "—"}</div>
        </div>
      </div>
    `));
  }

  if (selectedMedicationRecords.length) {
    medicationCards.push(...selectedMedicationRecords.map(record => `
      <div class="panel-card">
        <h2>${record.medication_name}</h2>
        <div class="profile-grid">
          <div class="profile-label">Scheduled time</div><div class="profile-value">${formatDateTime(record.scheduled_time)}</div>
          <div class="profile-label">Administered time</div><div class="profile-value">${formatDateTime(record.administered_time)}</div>
          <div class="profile-label">Dose</div><div class="profile-value">${record.dose || "—"}</div>
          <div class="profile-label">Route</div><div class="profile-value">${record.route || "—"}</div>
          <div class="profile-label">Status</div><div class="profile-value">${record.status || "—"}</div>
          <div class="profile-label">Refusal reason</div><div class="profile-value">${record.refusal_reason || "—"}</div>
          <div class="profile-label">Omission reason</div><div class="profile-value">${record.omission_reason || "—"}</div>
          <div class="profile-label">Error flag</div><div class="profile-value">${record.error_flag ? "Yes" : "No"}</div>
          <div class="profile-label">Error details</div><div class="profile-value">${record.error_details || "—"}</div>
          <div class="profile-label">Manager review</div><div class="profile-value">${record.manager_review_status || "—"}</div>
          <div class="profile-label">Administered by</div><div class="profile-value">${record.administered_by_first_name ? `${record.administered_by_first_name} ${record.administered_by_last_name || ""}` : "—"}</div>
        </div>
      </div>
    `));
  }

  if (!healthCards.length && !medicationCards.length) {
    healthPanel.innerHTML = `<div class="panel-card"><h2>Health</h2><p>No health or medication records recorded yet.</p></div>`;
    return;
  }

  healthPanel.innerHTML = `
    <div class="panel-grid">
      ${healthCards.join("")}
      ${medicationCards.join("")}
    </div>
  `;
}

function renderEducation() {
  if (!selectedEducationRecords.length) {
    educationPanel.innerHTML = `<div class="panel-card"><h2>Education</h2><p>No education records recorded yet.</p></div>`;
    return;
  }

  educationPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedEducationRecords.map(record => `
        <div class="panel-card">
          <h2>${formatDate(record.record_date)} • ${record.provision_name || "Education record"}</h2>
          <div class="profile-grid">
            <div class="profile-label">Attendance</div><div class="profile-value">${record.attendance_status || "—"}</div>
            <div class="profile-label">Provision</div><div class="profile-value">${record.provision_name || "—"}</div>
            <div class="profile-label">Behaviour</div><div class="profile-value">${record.behaviour_summary || "—"}</div>
            <div class="profile-label">Engagement</div><div class="profile-value">${record.learning_engagement || "—"}</div>
            <div class="profile-label">Issue raised</div><div class="profile-value">${record.issue_raised || "—"}</div>
            <div class="profile-label">Action taken</div><div class="profile-value">${record.action_taken || "—"}</div>
            <div class="profile-label">Professional involved</div><div class="profile-value">${record.professional_involved || "—"}</div>
            <div class="profile-label">Achievement</div><div class="profile-value">${record.achievement_note || "—"}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? `${record.created_by_first_name} ${record.created_by_last_name || ""}` : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderYoungPerson() {
  if (!selectedYoungPerson) return;

  summaryCards.innerHTML = `
    <div class="summary-card"><div class="label">Preferred Name</div><div class="value">${selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || "—"}</div></div>
    <div class="summary-card"><div class="label">Age</div><div class="value">${calculateAge(selectedYoungPerson.date_of_birth)}</div></div>
    <div class="summary-card"><div class="label">Home</div><div class="value">${selectedYoungPerson.home_name || "—"}</div></div>
    <div class="summary-card"><div class="label">Placement</div><div class="value">${selectedYoungPerson.placement_status || "—"}</div></div>
    <div class="summary-card"><div class="label">Risk</div><div class="value">${selectedYoungPerson.summary_risk_level || "—"}</div></div>
  `;

  renderAlerts();
  complianceContainer.innerHTML = `<span class="badge warning">Compliance tracker next</span>`;

  overviewContent.innerHTML = `
    <div class="profile-grid">
      <div class="profile-label">Full name</div><div class="profile-value">${selectedYoungPerson.first_name || ""} ${selectedYoungPerson.last_name || ""}</div>
      <div class="profile-label">Preferred name</div><div class="profile-value">${selectedYoungPerson.preferred_name || "—"}</div>
      <div class="profile-label">Date of birth</div><div class="profile-value">${formatDate(selectedYoungPerson.date_of_birth)}</div>
      <div class="profile-label">Admission date</div><div class="profile-value">${formatDate(selectedYoungPerson.admission_date)}</div>
      <div class="profile-label">Discharge date</div><div class="profile-value">${formatDate(selectedYoungPerson.discharge_date)}</div>
      <div class="profile-label">Gender</div><div class="profile-value">${selectedYoungPerson.gender || "—"}</div>
      <div class="profile-label">Ethnicity</div><div class="profile-value">${selectedYoungPerson.ethnicity || "—"}</div>
      <div class="profile-label">NHS number</div><div class="profile-value">${selectedYoungPerson.nhs_number || "—"}</div>
      <div class="profile-label">Local ID</div><div class="profile-value">${selectedYoungPerson.local_id_number || "—"}</div>
      <div class="profile-label">Keyworker</div><div class="profile-value">${selectedYoungPerson.keyworker_first_name ? `${selectedYoungPerson.keyworker_first_name} ${selectedYoungPerson.keyworker_last_name || ""}` : "—"}</div>
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
          <div class="profile-label">Legal status</div><div class="profile-value">${legal?.legal_status || "—"}</div>
          <div class="profile-label">Order type</div><div class="profile-value">${legal?.order_type || "—"}</div>
          <div class="profile-label">Order details</div><div class="profile-value">${legal?.order_details || "—"}</div>
          <div class="profile-label">Delegated authority</div><div class="profile-value">${legal?.delegated_authority_details || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Education</h2>
        <div class="profile-grid">
          <div class="profile-label">School</div><div class="profile-value">${education?.school_name || "—"}</div>
          <div class="profile-label">Year group</div><div class="profile-value">${education?.year_group || "—"}</div>
          <div class="profile-label">SEN status</div><div class="profile-value">${education?.sen_status || "—"}</div>
          <div class="profile-label">PEP status</div><div class="profile-value">${education?.pep_status || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Health</h2>
        <div class="profile-grid">
          <div class="profile-label">GP</div><div class="profile-value">${health?.gp_name || "—"}</div>
          <div class="profile-label">Allergies</div><div class="profile-value">${health?.allergies || "—"}</div>
          <div class="profile-label">Diagnoses</div><div class="profile-value">${health?.diagnoses || "—"}</div>
          <div class="profile-label">Mental health</div><div class="profile-value">${health?.mental_health_summary || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Communication</h2>
        <div class="profile-grid">
          <div class="profile-label">Summary</div><div class="profile-value">${communication?.neurodiversity_summary || "—"}</div>
          <div class="profile-label">Style</div><div class="profile-value">${communication?.communication_style || "—"}</div>
          <div class="profile-label">What helps</div><div class="profile-value">${communication?.what_helps || "—"}</div>
          <div class="profile-label">Avoid</div><div class="profile-value">${communication?.what_to_avoid || "—"}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Identity</h2>
        <div class="profile-grid">
          <div class="profile-label">Culture</div><div class="profile-value">${identity?.cultural_identity || "—"}</div>
          <div class="profile-label">Language</div><div class="profile-value">${identity?.first_language || "—"}</div>
          <div class="profile-label">Interests</div><div class="profile-value">${identity?.interests || "—"}</div>
          <div class="profile-label">Strengths</div><div class="profile-value">${identity?.strengths_summary || "—"}</div>
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

  renderPlans();
  renderRisks();
  renderDailyNotes();
  renderIncidents();
  renderHealth();
  renderEducation();
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
