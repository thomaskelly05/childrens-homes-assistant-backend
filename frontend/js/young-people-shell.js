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
const familyPanel = document.getElementById("tab-family");
const keyworkPanel = document.getElementById("tab-key-work");
const chronologyPanel = document.getElementById("tab-chronology");
const compliancePanel = document.getElementById("tab-compliance");

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
let selectedFamilyRecords = [];
let selectedKeyworkSessions = [];
let selectedChronology = [];
let selectedCompliance = null;

async function loadYoungPeople() {
  const res = await fetch("/young-people");

  if (!res.ok) {
    selector.innerHTML = `<option value="">Failed to load young people</option>`;
    return;
  }

  youngPeople = await res.json();
  selector.innerHTML = `<option value="">Select a young person</option>`;

  youngPeople.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = `${person.preferred_name || person.first_name} ${person.last_name || ""}`;
    selector.appendChild(option);
  });
}

async function loadYoungPerson(id) {
  if (!id) {
    resetState();
    clearDisplay();
    return;
  }

  try {
    await fetch(`/young-people/${id}/chronology/rebuild`, {
      method: "POST",
    });

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
      educationRes,
      familyRes,
      keyworkRes,
      chronologyRes,
      complianceRes,
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
      fetch(`/young-people/${id}/education`),
      fetch(`/young-people/${id}/family`),
      fetch(`/young-people/${id}/keywork`),
      fetch(`/young-people/${id}/chronology`),
      fetch(`/young-people/${id}/compliance`),
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
      !educationRes.ok ||
      !familyRes.ok ||
      !keyworkRes.ok ||
      !chronologyRes.ok ||
      !complianceRes.ok
    ) {
      console.error("One or more young person requests failed.");
      return;
    }

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
    selectedFamilyRecords = await familyRes.json();
    selectedKeyworkSessions = await keyworkRes.json();
    selectedChronology = await chronologyRes.json();
    selectedCompliance = await complianceRes.json();

    renderYoungPerson();
  } catch (error) {
    console.error("Failed to load young person shell data:", error);
  }
}

function resetState() {
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
  selectedFamilyRecords = [];
  selectedKeyworkSessions = [];
  selectedChronology = [];
  selectedCompliance = null;
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
  familyPanel.innerHTML = `<div class="panel-card"><h2>Family</h2><p>Select a young person to load family records.</p></div>`;
  keyworkPanel.innerHTML = `<div class="panel-card"><h2>Key Work</h2><p>Select a young person to load key work sessions.</p></div>`;
  chronologyPanel.innerHTML = `<div class="panel-card"><h2>Chronology</h2><p>Select a young person to load chronology.</p></div>`;
  compliancePanel.innerHTML = `<div class="panel-card"><h2>Compliance</h2><p>Select a young person to load compliance.</p></div>`;
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

  alertsContainer.innerHTML = alerts
    .map((alert) => `<span class="badge alert">${escapeHtml(alert.title || "Alert")}</span>`)
    .join("");
}

function renderComplianceHeader() {
  const summary = selectedCompliance?.summary;

  if (!summary) {
    complianceContainer.innerHTML = `<span class="badge muted">No compliance data yet</span>`;
    return;
  }

  const badges = [];

  if (summary.overdue > 0) {
    badges.push(`<span class="badge alert">${summary.overdue} overdue</span>`);
  }
  if (summary.due_today > 0) {
    badges.push(`<span class="badge warning">${summary.due_today} due today</span>`);
  }
  if (summary.due_soon > 0) {
    badges.push(`<span class="badge warning">${summary.due_soon} due soon</span>`);
  }
  if (summary.total === 0) {
    badges.push(`<span class="badge success">No compliance issues</span>`);
  }

  complianceContainer.innerHTML = badges.join("") || `<span class="badge muted">No compliance items</span>`;
}

function renderPlans() {
  if (!selectedPlans.length) {
    plansPanel.innerHTML = `<div class="panel-card"><h2>Plans</h2><p>No support plans recorded yet.</p></div>`;
    return;
  }

  plansPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedPlans.map((plan) => `
        <div class="panel-card">
          <h2>${escapeHtml(plan.title || "Support plan")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Type</div><div class="profile-value">${escapeHtml(plan.plan_type || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(plan.status || "—")}</div>
            <div class="profile-label">Start date</div><div class="profile-value">${formatDate(plan.start_date)}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(plan.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${plan.owner_first_name ? escapeHtml(`${plan.owner_first_name} ${plan.owner_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Presenting need</div><div class="profile-value">${escapeHtml(plan.presenting_need || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(plan.summary || "—")}</div>
            <div class="profile-label">PACE guidance</div><div class="profile-value">${escapeHtml(plan.pace_guidance || "—")}</div>
            <div class="profile-label">Triggers</div><div class="profile-value">${escapeHtml(plan.triggers || "—")}</div>
            <div class="profile-label">Protective factors</div><div class="profile-value">${escapeHtml(plan.protective_factors || "—")}</div>
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
      ${selectedRisks.map((risk) => `
        <div class="panel-card">
          <h2>${escapeHtml(risk.title || "Risk assessment")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Category</div><div class="profile-value">${escapeHtml(risk.category || "—")}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${escapeHtml(risk.severity || "—")}</div>
            <div class="profile-label">Likelihood</div><div class="profile-value">${escapeHtml(risk.likelihood || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(risk.status || "—")}</div>
            <div class="profile-label">Review date</div><div class="profile-value">${formatDate(risk.review_date)}</div>
            <div class="profile-label">Owner</div><div class="profile-value">${risk.owner_first_name ? escapeHtml(`${risk.owner_first_name} ${risk.owner_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Concern summary</div><div class="profile-value">${escapeHtml(risk.concern_summary || "—")}</div>
            <div class="profile-label">Known triggers</div><div class="profile-value">${escapeHtml(risk.known_triggers || "—")}</div>
            <div class="profile-label">Early warning signs</div><div class="profile-value">${escapeHtml(risk.early_warning_signs || "—")}</div>
            <div class="profile-label">Current controls</div><div class="profile-value">${escapeHtml(risk.current_controls || "—")}</div>
            <div class="profile-label">De-escalation</div><div class="profile-value">${escapeHtml(risk.deescalation_strategies || "—")}</div>
            <div class="profile-label">Response actions</div><div class="profile-value">${escapeHtml(risk.response_actions || "—")}</div>
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
      ${selectedDailyNotes.map((note) => `
        <div class="panel-card">
          <h2>${formatDate(note.note_date)} • ${escapeHtml(note.shift_type || "Shift")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Mood</div><div class="profile-value">${escapeHtml(note.mood || "—")}</div>
            <div class="profile-label">Presentation</div><div class="profile-value">${escapeHtml(note.presentation || "—")}</div>
            <div class="profile-label">Activities</div><div class="profile-value">${escapeHtml(note.activities || "—")}</div>
            <div class="profile-label">Education</div><div class="profile-value">${escapeHtml(note.education_update || "—")}</div>
            <div class="profile-label">Health</div><div class="profile-value">${escapeHtml(note.health_update || "—")}</div>
            <div class="profile-label">Family</div><div class="profile-value">${escapeHtml(note.family_update || "—")}</div>
            <div class="profile-label">Behaviour</div><div class="profile-value">${escapeHtml(note.behaviour_update || "—")}</div>
            <div class="profile-label">Young person voice</div><div class="profile-value">${escapeHtml(note.young_person_voice || "—")}</div>
            <div class="profile-label">Positives</div><div class="profile-value">${escapeHtml(note.positives || "—")}</div>
            <div class="profile-label">Actions required</div><div class="profile-value">${escapeHtml(note.actions_required || "—")}</div>
            <div class="profile-label">Significance</div><div class="profile-value">${escapeHtml(note.significance || "—")}</div>
            <div class="profile-label">Author</div><div class="profile-value">${note.author_first_name ? escapeHtml(`${note.author_first_name} ${note.author_last_name || ""}`.trim()) : "—"}</div>
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
      ${selectedIncidents.map((incident) => `
        <div class="panel-card">
          <h2>${escapeHtml(incident.incident_type || "Incident")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(incident.incident_datetime || incident.created_at)}</div>
            <div class="profile-label">Severity</div><div class="profile-value">${escapeHtml(incident.severity || "—")}</div>
            <div class="profile-label">Location</div><div class="profile-value">${escapeHtml(incident.location || "—")}</div>
            <div class="profile-label">Antecedent</div><div class="profile-value">${escapeHtml(incident.antecedent || "—")}</div>
            <div class="profile-label">Description</div><div class="profile-value">${escapeHtml(incident.description || "—")}</div>
            <div class="profile-label">Staff response</div><div class="profile-value">${escapeHtml(incident.staff_response || "—")}</div>
            <div class="profile-label">Child response</div><div class="profile-value">${escapeHtml(incident.child_response || "—")}</div>
            <div class="profile-label">Outcome</div><div class="profile-value">${escapeHtml(incident.outcome || "—")}</div>
            <div class="profile-label">Injury</div><div class="profile-value">${incident.injury_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Damage</div><div class="profile-value">${incident.property_damage_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Police involved</div><div class="profile-value">${incident.police_involved ? "Yes" : "No"}</div>
            <div class="profile-label">Safeguarding</div><div class="profile-value">${incident.safeguarding_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Manager review</div><div class="profile-value">${escapeHtml(incident.manager_review_status || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${incident.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Staff</div><div class="profile-value">${incident.staff_first_name ? escapeHtml(`${incident.staff_first_name} ${incident.staff_last_name || ""}`.trim()) : "—"}</div>
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
    healthCards.push(
      ...selectedHealthRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.title || "Health record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Type</div><div class="profile-value">${escapeHtml(record.record_type || "—")}</div>
            <div class="profile-label">Event date/time</div><div class="profile-value">${formatDateTime(record.event_datetime)}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(record.summary || "—")}</div>
            <div class="profile-label">Professional</div><div class="profile-value">${escapeHtml(record.professional_name || "—")}</div>
            <div class="profile-label">Outcome</div><div class="profile-value">${escapeHtml(record.outcome || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${record.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Next action date</div><div class="profile-value">${formatDate(record.next_action_date)}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `)
    );
  }

  if (selectedMedicationProfiles.length) {
    medicationCards.push(
      ...selectedMedicationProfiles.map((profile) => `
        <div class="panel-card">
          <h2>${escapeHtml(profile.medication_name || "Medication profile")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Dosage</div><div class="profile-value">${escapeHtml(profile.dosage || "—")}</div>
            <div class="profile-label">Route</div><div class="profile-value">${escapeHtml(profile.route || "—")}</div>
            <div class="profile-label">Frequency</div><div class="profile-value">${escapeHtml(profile.frequency || "—")}</div>
            <div class="profile-label">PRN guidance</div><div class="profile-value">${escapeHtml(profile.prn_guidance || "—")}</div>
            <div class="profile-label">Prescribed by</div><div class="profile-value">${escapeHtml(profile.prescribed_by || "—")}</div>
            <div class="profile-label">Start date</div><div class="profile-value">${formatDate(profile.start_date)}</div>
            <div class="profile-label">End date</div><div class="profile-value">${formatDate(profile.end_date)}</div>
            <div class="profile-label">Active</div><div class="profile-value">${profile.is_active ? "Yes" : "No"}</div>
            <div class="profile-label">Notes</div><div class="profile-value">${escapeHtml(profile.notes || "—")}</div>
          </div>
        </div>
      `)
    );
  }

  if (selectedMedicationRecords.length) {
    medicationCards.push(
      ...selectedMedicationRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.medication_name || "Medication record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Scheduled time</div><div class="profile-value">${formatDateTime(record.scheduled_time)}</div>
            <div class="profile-label">Administered time</div><div class="profile-value">${formatDateTime(record.administered_time)}</div>
            <div class="profile-label">Dose</div><div class="profile-value">${escapeHtml(record.dose || "—")}</div>
            <div class="profile-label">Route</div><div class="profile-value">${escapeHtml(record.route || "—")}</div>
            <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(record.status || "—")}</div>
            <div class="profile-label">Refusal reason</div><div class="profile-value">${escapeHtml(record.refusal_reason || "—")}</div>
            <div class="profile-label">Omission reason</div><div class="profile-value">${escapeHtml(record.omission_reason || "—")}</div>
            <div class="profile-label">Error flag</div><div class="profile-value">${record.error_flag ? "Yes" : "No"}</div>
            <div class="profile-label">Error details</div><div class="profile-value">${escapeHtml(record.error_details || "—")}</div>
            <div class="profile-label">Manager review</div><div class="profile-value">${escapeHtml(record.manager_review_status || "—")}</div>
            <div class="profile-label">Administered by</div><div class="profile-value">${record.administered_by_first_name ? escapeHtml(`${record.administered_by_first_name} ${record.administered_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `)
    );
  }

  if (!healthCards.length && !medicationCards.length) {
    healthPanel.innerHTML = `<div class="panel-card"><h2>Health</h2><p>No health or medication records recorded yet.</p></div>`;
    return;
  }

  healthPanel.innerHTML = `<div class="panel-grid">${healthCards.join("")}${medicationCards.join("")}</div>`;
}

function renderEducation() {
  if (!selectedEducationRecords.length) {
    educationPanel.innerHTML = `<div class="panel-card"><h2>Education</h2><p>No education records recorded yet.</p></div>`;
    return;
  }

  educationPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedEducationRecords.map((record) => `
        <div class="panel-card">
          <h2>${formatDate(record.record_date)} • ${escapeHtml(record.provision_name || "Education record")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Attendance</div><div class="profile-value">${escapeHtml(record.attendance_status || "—")}</div>
            <div class="profile-label">Provision</div><div class="profile-value">${escapeHtml(record.provision_name || "—")}</div>
            <div class="profile-label">Behaviour</div><div class="profile-value">${escapeHtml(record.behaviour_summary || "—")}</div>
            <div class="profile-label">Engagement</div><div class="profile-value">${escapeHtml(record.learning_engagement || "—")}</div>
            <div class="profile-label">Issue raised</div><div class="profile-value">${escapeHtml(record.issue_raised || "—")}</div>
            <div class="profile-label">Action taken</div><div class="profile-value">${escapeHtml(record.action_taken || "—")}</div>
            <div class="profile-label">Professional involved</div><div class="profile-value">${escapeHtml(record.professional_involved || "—")}</div>
            <div class="profile-label">Achievement</div><div class="profile-value">${escapeHtml(record.achievement_note || "—")}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFamily() {
  if (!selectedFamilyRecords.length) {
    familyPanel.innerHTML = `<div class="panel-card"><h2>Family</h2><p>No family contact records recorded yet.</p></div>`;
    return;
  }

  familyPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedFamilyRecords.map((record) => `
        <div class="panel-card">
          <h2>${escapeHtml(record.contact_person || "Family contact")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(record.contact_datetime)}</div>
            <div class="profile-label">Contact type</div><div class="profile-value">${escapeHtml(record.contact_type || "—")}</div>
            <div class="profile-label">Supervision</div><div class="profile-value">${escapeHtml(record.supervision_level || "—")}</div>
            <div class="profile-label">Location</div><div class="profile-value">${escapeHtml(record.location || "—")}</div>
            <div class="profile-label">Pre-contact presentation</div><div class="profile-value">${escapeHtml(record.pre_contact_presentation || "—")}</div>
            <div class="profile-label">Post-contact presentation</div><div class="profile-value">${escapeHtml(record.post_contact_presentation || "—")}</div>
            <div class="profile-label">Child voice</div><div class="profile-value">${escapeHtml(record.child_voice || "—")}</div>
            <div class="profile-label">Concerns</div><div class="profile-value">${escapeHtml(record.concerns || "—")}</div>
            <div class="profile-label">Follow-up required</div><div class="profile-value">${record.follow_up_required ? "Yes" : "No"}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${record.created_by_first_name ? escapeHtml(`${record.created_by_first_name} ${record.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderKeywork() {
  if (!selectedKeyworkSessions.length) {
    keyworkPanel.innerHTML = `<div class="panel-card"><h2>Key Work</h2><p>No key work sessions recorded yet.</p></div>`;
    return;
  }

  keyworkPanel.innerHTML = `
    <div class="panel-grid">
      ${selectedKeyworkSessions.map((session) => `
        <div class="panel-card">
          <h2>${escapeHtml(session.topic || "Key work session")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Session date</div><div class="profile-value">${formatDate(session.session_date)}</div>
            <div class="profile-label">Worker</div><div class="profile-value">${session.worker_first_name ? escapeHtml(`${session.worker_first_name} ${session.worker_last_name || ""}`.trim()) : "—"}</div>
            <div class="profile-label">Purpose</div><div class="profile-value">${escapeHtml(session.purpose || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(session.summary || "—")}</div>
            <div class="profile-label">Child voice</div><div class="profile-value">${escapeHtml(session.child_voice || "—")}</div>
            <div class="profile-label">Reflective analysis</div><div class="profile-value">${escapeHtml(session.reflective_analysis || "—")}</div>
            <div class="profile-label">Actions agreed</div><div class="profile-value">${escapeHtml(session.actions_agreed || "—")}</div>
            <div class="profile-label">Next session date</div><div class="profile-value">${formatDate(session.next_session_date)}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderChronology() {
  if (!selectedChronology.length) {
    chronologyPanel.innerHTML = `<div class="panel-card"><h2>Chronology</h2><p>No chronology events recorded yet.</p></div>`;
    return;
  }

  chronologyPanel.innerHTML = `
    <div class="panel-grid" style="grid-template-columns: 1fr;">
      ${selectedChronology.map((event) => `
        <div class="panel-card">
          <h2>${escapeHtml(event.title || "Chronology event")}</h2>
          <div class="profile-grid">
            <div class="profile-label">Date/time</div><div class="profile-value">${formatDateTime(event.event_datetime)}</div>
            <div class="profile-label">Category</div><div class="profile-value">${escapeHtml(event.category || "—")}</div>
            <div class="profile-label">Subcategory</div><div class="profile-value">${escapeHtml(event.subcategory || "—")}</div>
            <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(event.summary || "—")}</div>
            <div class="profile-label">Significance</div><div class="profile-value">${escapeHtml(event.significance || "—")}</div>
            <div class="profile-label">Source table</div><div class="profile-value">${escapeHtml(event.source_table || "—")}</div>
            <div class="profile-label">Auto generated</div><div class="profile-value">${event.auto_generated ? "Yes" : "No"}</div>
            <div class="profile-label">Created by</div><div class="profile-value">${event.created_by_first_name ? escapeHtml(`${event.created_by_first_name} ${event.created_by_last_name || ""}`.trim()) : "—"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCompliance() {
  const summary = selectedCompliance?.summary;
  const items = selectedCompliance?.items || [];

  if (!summary) {
    compliancePanel.innerHTML = `<div class="panel-card"><h2>Compliance</h2><p>No compliance data available.</p></div>`;
    return;
  }

  const summaryHtml = `
    <div class="panel-grid">
      <div class="panel-card"><h2>Overdue</h2><p>${summary.overdue ?? 0}</p></div>
      <div class="panel-card"><h2>Due Today</h2><p>${summary.due_today ?? 0}</p></div>
      <div class="panel-card"><h2>Due Soon</h2><p>${summary.due_soon ?? 0}</p></div>
      <div class="panel-card"><h2>Completed</h2><p>${summary.completed ?? 0}</p></div>
    </div>
  `;

  const itemsHtml = items.length
    ? `
      <div class="panel-grid" style="margin-top: 16px; grid-template-columns: 1fr;">
        ${items.map((item) => `
          <div class="panel-card">
            <h2>${escapeHtml(item.record_type || "Compliance item")}</h2>
            <div class="profile-grid">
              <div class="profile-label">Section</div><div class="profile-value">${escapeHtml(item.section || "—")}</div>
              <div class="profile-label">Title</div><div class="profile-value">${escapeHtml(item.title || "—")}</div>
              <div class="profile-label">Due date</div><div class="profile-value">${formatDate(item.due_date)}</div>
              <div class="profile-label">Status</div><div class="profile-value">${escapeHtml(item.status || "—")}</div>
              <div class="profile-label">Notes</div><div class="profile-value">${escapeHtml(item.notes || "—")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `
    : `<div class="panel-card" style="margin-top: 16px;"><h2>Compliance</h2><p>No compliance items found.</p></div>`;

  compliancePanel.innerHTML = summaryHtml + itemsHtml;
}

function renderYoungPerson() {
  if (!selectedYoungPerson) return;

  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="label">Preferred Name</div>
      <div class="value">${escapeHtml(selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Age</div>
      <div class="value">${calculateAge(selectedYoungPerson.date_of_birth)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Home</div>
      <div class="value">${escapeHtml(selectedYoungPerson.home_name || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Placement</div>
      <div class="value">${escapeHtml(selectedYoungPerson.placement_status || "—")}</div>
    </div>
    <div class="summary-card">
      <div class="label">Risk</div>
      <div class="value">${escapeHtml(selectedYoungPerson.summary_risk_level || "—")}</div>
    </div>
  `;

  renderAlerts();
  renderComplianceHeader();

  overviewContent.innerHTML = `
    <div class="profile-grid">
      <div class="profile-label">Full name</div><div class="profile-value">${escapeHtml(`${selectedYoungPerson.first_name || ""} ${selectedYoungPerson.last_name || ""}`.trim() || "—")}</div>
      <div class="profile-label">Preferred name</div><div class="profile-value">${escapeHtml(selectedYoungPerson.preferred_name || "—")}</div>
      <div class="profile-label">Date of birth</div><div class="profile-value">${formatDate(selectedYoungPerson.date_of_birth)}</div>
      <div class="profile-label">Admission date</div><div class="profile-value">${formatDate(selectedYoungPerson.admission_date)}</div>
      <div class="profile-label">Discharge date</div><div class="profile-value">${formatDate(selectedYoungPerson.discharge_date)}</div>
      <div class="profile-label">Gender</div><div class="profile-value">${escapeHtml(selectedYoungPerson.gender || "—")}</div>
      <div class="profile-label">Ethnicity</div><div class="profile-value">${escapeHtml(selectedYoungPerson.ethnicity || "—")}</div>
      <div class="profile-label">NHS number</div><div class="profile-value">${escapeHtml(selectedYoungPerson.nhs_number || "—")}</div>
      <div class="profile-label">Local ID</div><div class="profile-value">${escapeHtml(selectedYoungPerson.local_id_number || "—")}</div>
      <div class="profile-label">Keyworker</div><div class="profile-value">${selectedYoungPerson.keyworker_first_name ? escapeHtml(`${selectedYoungPerson.keyworker_first_name} ${selectedYoungPerson.keyworker_last_name || ""}`.trim()) : "—"}</div>
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
          <div class="profile-label">Legal status</div><div class="profile-value">${escapeHtml(legal?.legal_status || "—")}</div>
          <div class="profile-label">Order type</div><div class="profile-value">${escapeHtml(legal?.order_type || "—")}</div>
          <div class="profile-label">Order details</div><div class="profile-value">${escapeHtml(legal?.order_details || "—")}</div>
          <div class="profile-label">Delegated authority</div><div class="profile-value">${escapeHtml(legal?.delegated_authority_details || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Education</h2>
        <div class="profile-grid">
          <div class="profile-label">School</div><div class="profile-value">${escapeHtml(education?.school_name || "—")}</div>
          <div class="profile-label">Year group</div><div class="profile-value">${escapeHtml(education?.year_group || "—")}</div>
          <div class="profile-label">SEN status</div><div class="profile-value">${escapeHtml(education?.sen_status || "—")}</div>
          <div class="profile-label">PEP status</div><div class="profile-value">${escapeHtml(education?.pep_status || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Health</h2>
        <div class="profile-grid">
          <div class="profile-label">GP</div><div class="profile-value">${escapeHtml(health?.gp_name || "—")}</div>
          <div class="profile-label">Allergies</div><div class="profile-value">${escapeHtml(health?.allergies || "—")}</div>
          <div class="profile-label">Diagnoses</div><div class="profile-value">${escapeHtml(health?.diagnoses || "—")}</div>
          <div class="profile-label">Mental health</div><div class="profile-value">${escapeHtml(health?.mental_health_summary || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Communication</h2>
        <div class="profile-grid">
          <div class="profile-label">Summary</div><div class="profile-value">${escapeHtml(communication?.neurodiversity_summary || "—")}</div>
          <div class="profile-label">Style</div><div class="profile-value">${escapeHtml(communication?.communication_style || "—")}</div>
          <div class="profile-label">What helps</div><div class="profile-value">${escapeHtml(communication?.what_helps || "—")}</div>
          <div class="profile-label">Avoid</div><div class="profile-value">${escapeHtml(communication?.what_to_avoid || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Identity</h2>
        <div class="profile-grid">
          <div class="profile-label">Culture</div><div class="profile-value">${escapeHtml(identity?.cultural_identity || "—")}</div>
          <div class="profile-label">Language</div><div class="profile-value">${escapeHtml(identity?.first_language || "—")}</div>
          <div class="profile-label">Interests</div><div class="profile-value">${escapeHtml(identity?.interests || "—")}</div>
          <div class="profile-label">Strengths</div><div class="profile-value">${escapeHtml(identity?.strengths_summary || "—")}</div>
        </div>
      </div>

      <div class="panel-card">
        <h2>Contacts</h2>
        ${
          contacts.length
            ? contacts.map((contact) => `
              <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong>${escapeHtml(contact.full_name || "Contact")}</strong><br>
                <span>${escapeHtml(contact.relationship_to_young_person || "—")}</span><br>
                <span>${escapeHtml(contact.phone || "—")}</span><br>
                <span>${escapeHtml(contact.supervision_level || "—")}</span>
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
  renderFamily();
  renderKeywork();
  renderChronology();
  renderCompliance();
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function init() {
  setupTabs();
  await loadYoungPeople();
}

init();
