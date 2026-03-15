const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  keyworkSessions: [],
  activeKeyworkSessionId: null,
  latestProfileData: null,
  latestPlansData: [],
  latestRiskData: [],
  latestIncidentsData: [],
  latestComplianceData: null,
  jumpComplianceFilter: "all"
};

const endpoints = {
  youngPeopleList: [
    "/young-people",
    "/young-people/list"
  ],
  overview: (id) => [
    `/young-people/${id}`
  ],
  profile: (id) => [
    `/young-people/${id}/profile`
  ],
  plans: (id) => [
    `/young-people/${id}/plans`
  ],
  risk: (id) => [
    `/young-people/${id}/risk`
  ],
  daily_notes: (id) => [
    `/young-people/${id}/daily-notes`
  ],
  incidents: (id) => [
    `/young-people/${id}/incidents`
  ],
  health: (id) => [
    `/young-people/${id}/health`
  ],
  education: (id) => [
    `/young-people/${id}/education`
  ],
  family: (id) => [
    `/young-people/${id}/family`
  ],
  compliance: (id) => [
    `/young-people/${id}/compliance`
  ],
  keyworkList: (id) => `/young-people/${id}/keywork`,
  keyworkById: (id) => `/young-people/keywork/${id}`,
  keyworkCreate: "/young-people/keywork",
  keyworkUpdate: (id) => `/young-people/keywork/${id}`,
  chronologyList: (id) => `/young-people/${id}/chronology`,
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`,
  standardsSummary: (id) => [
    `/young-people/${id}/standards`
  ],
  standardsEvidence: (id) => [
    `/young-people/${id}/standards/evidence`
  ],
  standardsRebuild: (id) => `/young-people/${id}/standards/rebuild`,
  inspectionPackCreate: "/inspection-pack"
};

const els = {
  youngPeopleList: document.getElementById("youngPeopleList"),
  youngPersonSearch: document.getElementById("youngPersonSearch"),
  refreshYoungPeopleBtn: document.getElementById("refreshYoungPeopleBtn"),
  reloadCurrentBtn: document.getElementById("reloadCurrentBtn"),
  inspectionPackBtn: document.getElementById("inspectionPackBtn"),
  selectedYoungPersonName: document.getElementById("selectedYoungPersonName"),
  selectedYoungPersonMeta: document.getElementById("selectedYoungPersonMeta"),
  statusBar: document.getElementById("statusBar"),

  actionOverdueCount: document.getElementById("actionOverdueCount"),
  actionDueSoonCount: document.getElementById("actionDueSoonCount"),
  actionAlertsCount: document.getElementById("actionAlertsCount"),
  actionPlansCount: document.getElementById("actionPlansCount"),
  actionRiskCount: document.getElementById("actionRiskCount"),
  actionIncidentsCount: document.getElementById("actionIncidentsCount"),

  overviewContent: document.getElementById("overviewContent"),
  profileContent: document.getElementById("profileContent"),
  plansContent: document.getElementById("plansContent"),
  riskContent: document.getElementById("riskContent"),
  dailyNotesContent: document.getElementById("dailyNotesContent"),
  incidentsContent: document.getElementById("incidentsContent"),
  healthContent: document.getElementById("healthContent"),
  educationContent: document.getElementById("educationContent"),
  familyContent: document.getElementById("familyContent"),
  chronologyContent: document.getElementById("chronologyContent"),
  complianceContent: document.getElementById("complianceContent"),

  standardsSummary: document.getElementById("standardsSummary"),
  standardsEvidenceList: document.getElementById("standardsEvidenceList"),
  rebuildStandardsBtn: document.getElementById("rebuildStandardsBtn"),

  complianceStatusFilter: document.getElementById("complianceStatusFilter"),
  complianceCategoryFilter: document.getElementById("complianceCategoryFilter"),

  keyworkList: document.getElementById("keyworkList"),
  keyworkForm: document.getElementById("keyworkForm"),
  keyworkFormTitle: document.getElementById("keyworkFormTitle"),
  keyworkSessionId: document.getElementById("keyworkSessionId"),
  sessionDate: document.getElementById("sessionDate"),
  workerId: document.getElementById("workerId"),
  topic: document.getElementById("topic"),
  purpose: document.getElementById("purpose"),
  summary: document.getElementById("summary"),
  childVoice: document.getElementById("childVoice"),
  reflectiveAnalysis: document.getElementById("reflectiveAnalysis"),
  actionsAgreed: document.getElementById("actionsAgreed"),
  nextSessionDate: document.getElementById("nextSessionDate"),
  newKeyworkBtn: document.getElementById("newKeyworkBtn"),
  clearKeyworkFormBtn: document.getElementById("clearKeyworkFormBtn"),
  rebuildChronologyBtn: document.getElementById("rebuildChronologyBtn"),

  recordDetailDrawer: document.getElementById("recordDetailDrawer"),
  recordDetailContent: document.getElementById("recordDetailContent"),
  closeDrawerBtn: document.getElementById("closeDrawerBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  document.querySelectorAll(".action-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const jumpTab = chip.dataset.jumpTab;
      const filter = chip.dataset.filter || "all";

      if (jumpTab === "compliance") {
        state.jumpComplianceFilter = filter;
      }

      setActiveTab(jumpTab);
    });
  });

  if (els.youngPersonSearch) {
    els.youngPersonSearch.addEventListener("input", handleSearch);
  }

  if (els.refreshYoungPeopleBtn) {
    els.refreshYoungPeopleBtn.addEventListener("click", loadYoungPeople);
  }

  if (els.reloadCurrentBtn) {
    els.reloadCurrentBtn.addEventListener("click", reloadCurrentRecord);
  }

  if (els.inspectionPackBtn) {
    els.inspectionPackBtn.addEventListener("click", async () => {
      if (!state.selectedYoungPerson) {
        showStatus("Please select a young person first.", true);
        return;
      }

      try {
        await fetchJson(endpoints.inspectionPackCreate, {
          method: "POST",
          body: JSON.stringify({
            scope_type: "young_person",
            scope_id: state.selectedYoungPerson.id,
            pack_type: "ofsted",
            requested_by: 1
          })
        });

        showStatus("Inspection pack job created. PDF generator is the next step.");
      } catch (error) {
        console.error(error);
        showStatus(`Could not create inspection pack job: ${error.message}`, true);
      }
    });
  }

  if (els.rebuildStandardsBtn) {
    els.rebuildStandardsBtn.addEventListener("click", rebuildStandardsLinks);
  }

  if (els.complianceStatusFilter) {
    els.complianceStatusFilter.addEventListener("change", rerenderComplianceFromState);
  }

  if (els.complianceCategoryFilter) {
    els.complianceCategoryFilter.addEventListener("change", rerenderComplianceFromState);
  }

  if (els.keyworkForm) {
    els.keyworkForm.addEventListener("submit", saveKeyworkSession);
  }

  if (els.newKeyworkBtn) {
    els.newKeyworkBtn.addEventListener("click", resetKeyworkForm);
  }

  if (els.clearKeyworkFormBtn) {
    els.clearKeyworkFormBtn.addEventListener("click", resetKeyworkForm);
  }

  if (els.rebuildChronologyBtn) {
    els.rebuildChronologyBtn.addEventListener("click", rebuildChronology);
  }

  if (els.closeDrawerBtn) {
    els.closeDrawerBtn.addEventListener("click", closeRecordDrawer);
  }
}

function showStatus(message, isError = false) {
  if (!els.statusBar) return;

  els.statusBar.textContent = message;
  els.statusBar.classList.remove("hidden", "error");

  if (isError) {
    els.statusBar.classList.add("error");
  }

  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => {
    els.statusBar.classList.add("hidden");
  }, 4000);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    ...options
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      if (data && data.detail) {
        message = data.detail;
      }
    } catch (_err) {}

    throw new Error(message);
  }

  return response.json();
}

async function fetchFromCandidates(candidateUrls) {
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      return await fetchJson(url);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No endpoint returned data");
}

async function loadYoungPeople() {
  try {
    showStatus("Loading young people...");
    const data = await fetchFromCandidates(endpoints.youngPeopleList);

    const rows = normaliseArrayResponse(data);
    state.youngPeople = rows;
    state.filteredYoungPeople = [...rows];

    renderYoungPeopleList();

    if (!state.selectedYoungPerson && rows.length > 0) {
      await selectYoungPerson(rows[0]);
    } else if (state.selectedYoungPerson) {
      const refreshed = rows.find((p) => Number(p.id) === Number(state.selectedYoungPerson.id));
      if (refreshed) {
        state.selectedYoungPerson = refreshed;
        renderYoungPeopleList();
        updateSelectedPersonHeader();
      }
    }

    showStatus("Young people loaded.");
  } catch (error) {
    console.error(error);

    if (els.youngPeopleList) {
      els.youngPeopleList.innerHTML = `
        <div class="empty-state">
          Could not load young people.
          <br />
          <small>${escapeHtml(error.message)}</small>
        </div>
      `;
    }

    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();

  state.filteredYoungPeople = state.youngPeople.filter((person) => {
    const name = `${person.first_name || ""} ${person.last_name || ""} ${person.preferred_name || ""}`.toLowerCase();
    return name.includes(term);
  });

  renderYoungPeopleList();
}

function renderYoungPeopleList() {
  if (!els.youngPeopleList) return;

  if (!state.filteredYoungPeople.length) {
    els.youngPeopleList.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  els.youngPeopleList.innerHTML = state.filteredYoungPeople.map((person) => {
    const name = getFullName(person);
    const active = Number(state.selectedYoungPerson?.id) === Number(person.id) ? "active" : "";
    const subtitle = person.placement_status
      ? `Status: ${escapeHtml(person.placement_status)}`
      : `ID: ${person.id}`;

    return `
      <div class="young-person-card ${active}" data-id="${person.id}">
        <h4>${escapeHtml(name)}</h4>
        <p>${subtitle}</p>
      </div>
    `;
  }).join("");

  els.youngPeopleList.querySelectorAll(".young-person-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const personId = Number(card.dataset.id);
      const person = state.youngPeople.find((row) => Number(row.id) === personId);
      if (person) {
        await selectYoungPerson(person);
      }
    });
  });
}

async function selectYoungPerson(person) {
  state.selectedYoungPerson = person;
  state.activeKeyworkSessionId = null;
  state.keyworkSessions = [];
  state.latestProfileData = null;
  state.latestPlansData = [];
  state.latestRiskData = [];
  state.latestIncidentsData = [];
  state.latestComplianceData = null;
  renderYoungPeopleList();
  updateSelectedPersonHeader();
  resetKeyworkForm();
  closeRecordDrawer();
  await loadActionBarData();
  await loadActiveTabData();
}

function updateSelectedPersonHeader() {
  if (!els.selectedYoungPersonName || !els.selectedYoungPersonMeta) return;

  if (!state.selectedYoungPerson) {
    els.selectedYoungPersonName.textContent = "Select a young person";
    els.selectedYoungPersonMeta.textContent = "No record loaded";
    return;
  }

  const person = state.selectedYoungPerson;
  const bits = [`ID: ${person.id}`];

  if (person.date_of_birth) bits.push(`DOB: ${formatDate(person.date_of_birth)}`);
  if (person.placement_status) bits.push(`Status: ${person.placement_status}`);
  if (person.summary_risk_level) bits.push(`Risk: ${person.summary_risk_level}`);

  els.selectedYoungPersonName.textContent = getFullName(person);
  els.selectedYoungPersonMeta.textContent = bits.join(" | ");
}

function setActiveTab(tabName) {
  state.activeTab = tabName;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  closeRecordDrawer();
  loadActiveTabData();
}

async function reloadCurrentRecord() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  await loadActionBarData();
  await loadActiveTabData();
}

async function loadActionBarData() {
  if (!state.selectedYoungPerson) return;

  const id = state.selectedYoungPerson.id;

  try {
    const [profileData, plansData, riskData, incidentsData, complianceData] = await Promise.all([
      fetchFromCandidates(endpoints.profile(id)).catch(() => null),
      fetchFromCandidates(endpoints.plans(id)).catch(() => []),
      fetchFromCandidates(endpoints.risk(id)).catch(() => []),
      fetchFromCandidates(endpoints.incidents(id)).catch(() => []),
      fetchFromCandidates(endpoints.compliance(id)).catch(() => null)
    ]);

    state.latestProfileData = profileData;
    state.latestPlansData = normaliseArrayResponse(plansData);
    state.latestRiskData = normaliseArrayResponse(riskData);
    state.latestIncidentsData = normaliseArrayResponse(incidentsData);
    state.latestComplianceData = complianceData;

    const alertsCount = Array.isArray(profileData?.alerts) ? profileData.alerts.length : 0;
    const complianceItems = Array.isArray(complianceData?.compliance_items) ? complianceData.compliance_items : [];
    const overdueCount = complianceItems.filter((item) => item.compliance_status === "overdue").length;
    const dueSoonCount = complianceItems.filter((item) => item.compliance_status === "due_soon").length;

    setText(els.actionOverdueCount, overdueCount);
    setText(els.actionDueSoonCount, dueSoonCount);
    setText(els.actionAlertsCount, alertsCount);
    setText(els.actionPlansCount, state.latestPlansData.length);
    setText(els.actionRiskCount, state.latestRiskData.length);
    setText(els.actionIncidentsCount, state.latestIncidentsData.length);
  } catch (error) {
    console.error("Action bar load failed:", error);
  }
}

async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;

  const id = state.selectedYoungPerson.id;

  try {
    switch (state.activeTab) {
      case "overview":
        await loadOverview(id);
        break;
      case "profile":
        await loadProfile(id);
        break;
      case "plans":
        await loadPlans(id);
        break;
      case "risk":
        await loadRisk(id);
        break;
      case "daily_notes":
        await loadDailyNotes(id);
        break;
      case "incidents":
        await loadIncidents(id);
        break;
      case "health":
        await loadHealth(id);
        break;
      case "education":
        await loadEducation(id);
        break;
      case "family":
        await loadFamily(id);
        break;
      case "chronology":
        await loadChronology(id);
        break;
      case "standards":
        await loadStandards(id);
        break;
      case "compliance":
        await loadCompliance(id);
        break;
      case "keywork":
        await loadKeyworkSessions(id);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
  }
}

async function loadOverview(youngPersonId) {
  if (!els.overviewContent) return;

  els.overviewContent.innerHTML = `<div class="empty-state">Loading overview...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.overview(youngPersonId));

    const keyGroups = [
      {
        title: "Core Details",
        keys: ["first_name", "last_name", "preferred_name", "date_of_birth", "gender", "ethnicity", "local_id_number"]
      },
      {
        title: "Placement",
        keys: ["admission_date", "discharge_date", "placement_status", "summary_risk_level", "home_id"]
      },
      {
        title: "Legal and Education",
        keys: ["legal_status", "order_type", "school_name", "year_group", "education_status"]
      },
      {
        title: "Health and Communication",
        keys: ["gp_name", "allergies", "diagnoses", "communication_style", "sensory_profile"]
      },
      {
        title: "Identity and Voice",
        keys: ["interests", "strengths_summary", "what_matters_to_me"]
      }
    ];

    const topTiles = [
      "placement_status",
      "summary_risk_level",
      "legal_status",
      "school_name",
      "gp_name",
      "allergies",
      "interests",
      "what_matters_to_me"
    ].filter((key) => hasValue(data[key]));

    els.overviewContent.innerHTML = `
      ${topTiles.length ? `
        <div class="overview-grid">
          ${topTiles.map((key) => `
            <div class="overview-tile">
              <h4>${escapeHtml(formatLabel(key))}</h4>
              <p>${escapeHtml(formatFieldValue(key, data[key]))}</p>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${keyGroups.map((group) => renderGroupedKeyValueSection(group.title, data, group.keys)).join("")}
    `;
  } catch (error) {
    els.overviewContent.innerHTML = `
      <div class="empty-state">
        Could not load overview.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadProfile(youngPersonId) {
  if (!els.profileContent) return;

  els.profileContent.innerHTML = `<div class="empty-state">Loading profile...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.profile(youngPersonId));
    state.latestProfileData = data;

    els.profileContent.innerHTML = `
      ${renderObjectSection("Young Person", data.young_person || {}, ["id", "first_name", "last_name", "preferred_name", "date_of_birth", "gender", "ethnicity", "local_id_number", "placement_status", "summary_risk_level"])}
      ${renderArraySection("Legal Status", data.legal_status || [], ["legal_status", "order_type", "order_details", "effective_from", "effective_to", "is_current"])}
      ${renderArraySection("Communication Profile", data.communication_profile || [], ["neurodiversity_summary", "communication_style", "sensory_profile", "processing_needs", "signs_of_distress", "what_helps", "what_to_avoid", "routines_and_predictability", "visual_support_needs"])}
      ${renderArraySection("Identity Profile", data.identity_profile || [], ["religion_or_faith", "cultural_identity", "first_language", "dietary_needs", "interests", "strengths_summary", "what_matters_to_me", "important_dates"])}
      ${renderArraySection("Alerts", data.alerts || [], ["alert_type", "title", "description", "severity", "is_active", "review_date"])}
    `;
  } catch (error) {
    els.profileContent.innerHTML = `
      <div class="empty-state">
        Could not load profile.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadPlans(youngPersonId) {
  if (!els.plansContent) return;

  els.plansContent.innerHTML = `<div class="empty-state">Loading plans...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.plans(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestPlansData = rows;

    els.plansContent.innerHTML = renderArraySection("Support Plans", rows, [
      "status",
      "plan_type",
      "title",
      "presenting_need",
      "review_date",
      "approval_status",
      "owner_first_name",
      "created_at"
    ]);
  } catch (error) {
    els.plansContent.innerHTML = `
      <div class="empty-state">
        Could not load plans.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadRisk(youngPersonId) {
  if (!els.riskContent) return;

  els.riskContent.innerHTML = `<div class="empty-state">Loading risk...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.risk(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestRiskData = rows;

    els.riskContent.innerHTML = renderArraySection("Risk Assessments", rows, [
      "severity",
      "category",
      "title",
      "concern_summary",
      "review_date",
      "status",
      "approval_status",
      "owner_first_name"
    ]);
  } catch (error) {
    els.riskContent.innerHTML = `
      <div class="empty-state">
        Could not load risk.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadDailyNotes(youngPersonId) {
  if (!els.dailyNotesContent) return;

  els.dailyNotesContent.innerHTML = `<div class="empty-state">Loading daily notes...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.daily_notes(youngPersonId));
    const rows = normaliseArrayResponse(data);

    els.dailyNotesContent.innerHTML = renderArraySection("Daily Notes", rows, [
      "note_date",
      "shift_type",
      "workflow_status",
      "mood",
      "presentation",
      "positives",
      "actions_required",
      "author_first_name"
    ]);
  } catch (error) {
    els.dailyNotesContent.innerHTML = `
      <div class="empty-state">
        Could not load daily notes.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadIncidents(youngPersonId) {
  if (!els.incidentsContent) return;

  els.incidentsContent.innerHTML = `<div class="empty-state">Loading incidents...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.incidents(youngPersonId));
    const rows = normaliseArrayResponse(data);
    state.latestIncidentsData = rows;

    els.incidentsContent.innerHTML = renderArraySection("Incidents", rows, [
      "incident_datetime",
      "incident_type",
      "severity",
      "location",
      "description",
      "manager_review_status",
      "follow_up_required",
      "staff_first_name"
    ]);
  } catch (error) {
    els.incidentsContent.innerHTML = `
      <div class="empty-state">
        Could not load incidents.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadHealth(youngPersonId) {
  if (!els.healthContent) return;

  els.healthContent.innerHTML = `<div class="empty-state">Loading health...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.health(youngPersonId));

    els.healthContent.innerHTML = `
      ${renderArraySection("Health Profile", data.health_profile || [], ["gp_name", "gp_contact", "dentist_name", "dentist_contact", "optician_name", "optician_contact", "allergies", "diagnoses", "mental_health_summary", "medication_summary", "consent_notes"])}
      ${renderArraySection("Health Records", data.health_records || [], ["event_datetime", "record_type", "title", "summary", "professional_name", "outcome", "follow_up_required", "next_action_date"])}
      ${renderArraySection("Medication Profiles", data.medication_profiles || [], ["medication_name", "dosage", "route", "frequency", "prescribed_by", "start_date", "end_date", "is_active", "notes"])}
      ${renderArraySection("Medication Records", data.medication_records || [], ["scheduled_time", "administered_time", "medication_name", "dose", "route", "status", "error_flag", "administered_by_first_name"])}
    `;
  } catch (error) {
    els.healthContent.innerHTML = `
      <div class="empty-state">
        Could not load health.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadEducation(youngPersonId) {
  if (!els.educationContent) return;

  els.educationContent.innerHTML = `<div class="empty-state">Loading education...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.education(youngPersonId));

    els.educationContent.innerHTML = `
      ${renderArraySection("Education Profile", data.education_profile || [], ["school_name", "year_group", "education_status", "sen_status", "ehcp_details", "designated_teacher", "attendance_baseline", "pep_status", "support_summary"])}
      ${renderArraySection("Education Records", data.education_records || [], ["record_date", "attendance_status", "provision_name", "behaviour_summary", "learning_engagement", "issue_raised", "action_taken", "professional_involved", "achievement_note"])}
    `;
  } catch (error) {
    els.educationContent.innerHTML = `
      <div class="empty-state">
        Could not load education.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadFamily(youngPersonId) {
  if (!els.familyContent) return;

  els.familyContent.innerHTML = `<div class="empty-state">Loading family...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.family(youngPersonId));

    els.familyContent.innerHTML = `
      ${renderArraySection("Contacts", data.contacts || [], ["contact_type", "full_name", "relationship_to_young_person", "phone", "email", "is_parental_responsibility_holder", "is_approved_contact", "is_restricted_contact", "supervision_level"])}
      ${renderArraySection("Family Contact Records", data.family_contact_records || [], ["contact_datetime", "contact_type", "contact_person", "supervision_level", "location", "pre_contact_presentation", "post_contact_presentation", "child_voice", "concerns", "follow_up_required"])}
    `;
  } catch (error) {
    els.familyContent.innerHTML = `
      <div class="empty-state">
        Could not load family.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadChronology(youngPersonId) {
  if (!els.chronologyContent) return;

  els.chronologyContent.innerHTML = `<div class="empty-state">Loading chronology...</div>`;

  try {
    const data = await fetchJson(endpoints.chronologyList(youngPersonId));
    const rows = normaliseArrayResponse(data);

    els.chronologyContent.innerHTML = renderTableSection("Chronology", rows, [
      "event_datetime",
      "category",
      "subcategory",
      "title",
      "summary",
      "significance",
      "source_table"
    ], true);

    bindOpenRecordButtons();
  } catch (error) {
    console.error(error);
    els.chronologyContent.innerHTML = `
      <div class="empty-state">
        Could not load chronology.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

async function loadStandards(youngPersonId) {
  if (!els.standardsSummary || !els.standardsEvidenceList) return;

  els.standardsSummary.innerHTML = `<div class="empty-state">Loading standards...</div>`;
  els.standardsEvidenceList.innerHTML = `<div class="empty-state">Loading evidence...</div>`;

  try {
    const summary = await fetchFromCandidates(endpoints.standardsSummary(youngPersonId));
    const evidence = await fetchFromCandidates(endpoints.standardsEvidence(youngPersonId));

    renderStandardsSummary(summary);
    renderStandardsEvidence(evidence);
  } catch (error) {
    els.standardsSummary.innerHTML = `
      <div class="empty-state">
        Could not load standards evidence.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
    els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence loaded.</div>`;
  }
}

function renderStandardsSummary(rows) {
  if (!rows || !rows.length) {
    els.standardsSummary.innerHTML = `<div class="empty-state">No standards data found.</div>`;
    return;
  }

  els.standardsSummary.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Title</th>
            <th>Evidence Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            let statusClass = "status-green";
            if (Number(row.linked_record_count) < 3) statusClass = "status-amber";
            if (Number(row.linked_record_count) === 0) statusClass = "status-red";

            return `
              <tr>
                <td><strong>${escapeHtml(row.code)}</strong></td>
                <td>${escapeHtml(row.short_label)}</td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(String(row.linked_record_count))}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStandardsEvidence(rows) {
  if (!rows || !rows.length) {
    els.standardsEvidenceList.innerHTML = `<div class="empty-state">No evidence linked yet.</div>`;
    return;
  }

  els.standardsEvidenceList.innerHTML = `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Standard</th>
            <th>Source</th>
            <th>Source ID</th>
            <th>Evidence Strength</th>
            <th>Rationale</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.standard_code)}</td>
              <td>${escapeHtml(row.source_table)}</td>
              <td>${escapeHtml(String(row.source_id))}</td>
              <td>${escapeHtml(stringifyValue(row.evidence_strength))}</td>
              <td>${escapeHtml(stringifyValue(row.rationale))}</td>
              <td>${escapeHtml(formatDate(row.created_at))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadCompliance(youngPersonId) {
  if (!els.complianceContent) return;

  els.complianceContent.innerHTML = `<div class="empty-state">Loading compliance...</div>`;

  try {
    const data = await fetchFromCandidates(endpoints.compliance(youngPersonId));
    state.latestComplianceData = data;

    if (state.jumpComplianceFilter !== "all" && els.complianceStatusFilter) {
      els.complianceStatusFilter.value = state.jumpComplianceFilter;
      state.jumpComplianceFilter = "all";
    }

    rerenderComplianceFromState();
  } catch (error) {
    els.complianceContent.innerHTML = `
      <div class="empty-state">
        Could not load compliance.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function rerenderComplianceFromState() {
  if (!els.complianceContent) return;

  const data = state.latestComplianceData;
  if (!data) {
    els.complianceContent.innerHTML = `<div class="empty-state">No compliance data found.</div>`;
    return;
  }

  const statusFilter = els.complianceStatusFilter ? els.complianceStatusFilter.value : "all";
  const categoryFilter = els.complianceCategoryFilter ? els.complianceCategoryFilter.value : "all";

  let complianceItems = Array.isArray(data.compliance_items) ? data.compliance_items : [];
  const activeAlerts = Array.isArray(data.active_alerts) ? data.active_alerts : [];

  if (statusFilter !== "all") {
    complianceItems = complianceItems.filter((item) => item.compliance_status === statusFilter);
  }

  if (categoryFilter !== "all") {
    complianceItems = complianceItems.filter((item) => item.compliance_type === categoryFilter);
  }

  const grouped = groupBy(complianceItems, "compliance_type");

  els.complianceContent.innerHTML = `
    ${renderComplianceSummaryStrip(complianceItems, activeAlerts)}
    ${Object.keys(grouped).length
      ? Object.entries(grouped).map(([groupName, rows]) => renderComplianceGroup(groupName, rows)).join("")
      : `<div class="empty-state">No compliance items match the selected filters.</div>`
    }
    ${renderArraySection("Active Alerts", activeAlerts, ["alert_type", "title", "description", "severity", "review_date"])}
  `;

  bindOpenRecordButtons();
}

function renderComplianceSummaryStrip(items, alerts) {
  const overdue = items.filter((item) => item.compliance_status === "overdue").length;
  const dueSoon = items.filter((item) => item.compliance_status === "due_soon").length;
  const ok = items.filter((item) => item.compliance_status === "ok").length;

  return `
    <div class="overview-grid">
      <div class="overview-tile">
        <h4>Overdue</h4>
        <p>${overdue}</p>
      </div>
      <div class="overview-tile">
        <h4>Due Soon</h4>
        <p>${dueSoon}</p>
      </div>
      <div class="overview-tile">
        <h4>Current</h4>
        <p>${ok}</p>
      </div>
      <div class="overview-tile">
        <h4>Active Alerts</h4>
        <p>${alerts.length}</p>
      </div>
    </div>
  `;
}

function renderComplianceGroup(groupName, rows) {
  const columns = [
    { key: "compliance_status", label: "Status" },
    { key: "title", label: "Title" },
    { key: "due_date", label: "Due Date" },
    { key: "status", label: "Record Status" },
    { key: "approval_status", label: "Approval" },
    { key: "created_at", label: "Created" }
  ];

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(formatComplianceGroupTitle(groupName))}</h3>
      <div class="section-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((col) => `
                  <td>${renderTableCell(col.key, row[col.key])}</td>
                `).join("")}
                <td>
                  <button class="text-link-btn js-open-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function loadKeyworkSessions(youngPersonId) {
  if (!els.keyworkList) return;

  els.keyworkList.innerHTML = `<div class="empty-state">Loading key work sessions...</div>`;

  try {
    const data = await fetchJson(endpoints.keyworkList(youngPersonId));
    state.keyworkSessions = normaliseArrayResponse(data);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    els.keyworkList.innerHTML = `
      <div class="empty-state">
        Could not load key work sessions.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function renderKeyworkList() {
  if (!els.keyworkList) return;

  const rows = state.keyworkSessions;

  if (!rows.length) {
    els.keyworkList.innerHTML = `<div class="empty-state">No key work sessions found.</div>`;
    return;
  }

  els.keyworkList.innerHTML = renderTableSection("Key Work Sessions", rows, [
    "session_date",
    "topic",
    "worker_first_name",
    "summary",
    "next_session_date"
  ], true);

  bindOpenRecordButtons();
  bindKeyworkRowSelection();
}

function bindKeyworkRowSelection() {
  if (!els.keyworkList) return;

  els.keyworkList.querySelectorAll(".js-keywork-row").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const sessionId = Number(btn.dataset.sessionId);
      await loadSingleKeyworkSession(sessionId);
    });
  });
}

async function loadSingleKeyworkSession(sessionId) {
  try {
    const session = await fetchJson(endpoints.keyworkById(sessionId));
    state.activeKeyworkSessionId = session.id;
    fillKeyworkForm(session);
    openRecordDrawer("Key Work Session", session);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    showStatus(`Could not load key work session: ${error.message}`, true);
  }
}

function fillKeyworkForm(session) {
  if (els.keyworkFormTitle) els.keyworkFormTitle.textContent = `Edit Key Work Session #${session.id}`;
  if (els.keyworkSessionId) els.keyworkSessionId.value = session.id || "";
  if (els.sessionDate) els.sessionDate.value = toDateInputValue(session.session_date);
  if (els.workerId) els.workerId.value = session.worker_id ?? "";
  if (els.topic) els.topic.value = session.topic ?? "";
  if (els.purpose) els.purpose.value = session.purpose ?? "";
  if (els.summary) els.summary.value = session.summary ?? "";
  if (els.childVoice) els.childVoice.value = session.child_voice ?? "";
  if (els.reflectiveAnalysis) els.reflectiveAnalysis.value = session.reflective_analysis ?? "";
  if (els.actionsAgreed) els.actionsAgreed.value = session.actions_agreed ?? "";
  if (els.nextSessionDate) els.nextSessionDate.value = toDateInputValue(session.next_session_date);
}

function resetKeyworkForm() {
  state.activeKeyworkSessionId = null;
  if (els.keyworkForm) els.keyworkForm.reset();
  if (els.keyworkSessionId) els.keyworkSessionId.value = "";
  if (els.keyworkFormTitle) els.keyworkFormTitle.textContent = "Create / Edit Key Work Session";
}

async function saveKeyworkSession(event) {
  event.preventDefault();

  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const sessionId = els.keyworkSessionId ? els.keyworkSessionId.value.trim() : "";

  const payload = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: els.sessionDate ? els.sessionDate.value || null : null,
    worker_id: parseNullableInt(els.workerId ? els.workerId.value : ""),
    topic: cleanValue(els.topic ? els.topic.value : ""),
    purpose: cleanValue(els.purpose ? els.purpose.value : ""),
    summary: cleanValue(els.summary ? els.summary.value : ""),
    child_voice: cleanValue(els.childVoice ? els.childVoice.value : ""),
    reflective_analysis: cleanValue(els.reflectiveAnalysis ? els.reflectiveAnalysis.value : ""),
    actions_agreed: cleanValue(els.actionsAgreed ? els.actionsAgreed.value : ""),
    next_session_date: cleanValue(els.nextSessionDate ? els.nextSessionDate.value : "")
  };

  if (!payload.session_date || !payload.topic) {
    showStatus("Session date and topic are required.", true);
    return;
  }

  try {
    if (sessionId) {
      await fetchJson(endpoints.keyworkUpdate(sessionId), {
        method: "PUT",
        body: JSON.stringify({
          session_date: payload.session_date,
          worker_id: payload.worker_id,
          topic: payload.topic,
          purpose: payload.purpose,
          summary: payload.summary,
          child_voice: payload.child_voice,
          reflective_analysis: payload.reflective_analysis,
          actions_agreed: payload.actions_agreed,
          next_session_date: payload.next_session_date
        })
      });

      showStatus("Key work session updated successfully.");
    } else {
      await fetchJson(endpoints.keyworkCreate, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("Key work session created successfully.");
    }

    resetKeyworkForm();
    await loadKeyworkSessions(state.selectedYoungPerson.id);
    await loadActionBarData();
  } catch (error) {
    console.error(error);
    showStatus(`Could not save key work session: ${error.message}`, true);
  }
}

async function rebuildChronology() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(endpoints.chronologyRebuild(state.selectedYoungPerson.id), {
      method: "POST"
    });

    showStatus("Chronology rebuilt successfully.");
    await loadChronology(state.selectedYoungPerson.id);
  } catch (error) {
    console.error(error);
    showStatus(`Could not rebuild chronology: ${error.message}`, true);
  }
}

async function rebuildStandardsLinks() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  try {
    await fetchJson(endpoints.standardsRebuild(state.selectedYoungPerson.id), {
      method: "POST"
    });

    showStatus("Standards links rebuilt successfully.");
    await loadStandards(state.selectedYoungPerson.id);
  } catch (error) {
    console.error(error);
    showStatus(`Could not rebuild standards links: ${error.message}`, true);
  }
}

function renderGroupedKeyValueSection(title, source, keys) {
  const presentKeys = keys.filter((key) => hasValue(source[key]));

  if (!presentKeys.length) {
    return "";
  }

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
        <table class="data-table key-value compact">
          <tbody>
            ${presentKeys.map((key) => `
              <tr>
                <th>${escapeHtml(formatLabel(key))}</th>
                <td>${escapeHtml(formatFieldValue(key, source[key]))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderObjectSection(title, record, keys) {
  if (!record || typeof record !== "object" || !Object.keys(record).length) {
    return `
      <section class="section-group">
        <h3 class="group-title">${escapeHtml(title)}</h3>
        <div class="empty-state">No data found.</div>
      </section>
    `;
  }

  const pickedKeys = (keys || Object.keys(record)).filter((key) => key in record && hasValue(record[key]));

  if (!pickedKeys.length) {
    return `
      <section class="section-group">
        <h3 class="group-title">${escapeHtml(title)}</h3>
        <div class="empty-state">No data found.</div>
      </section>
    `;
  }

  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
        <table class="data-table key-value compact">
          <tbody>
            ${pickedKeys.map((key) => `
              <tr>
                <th>${escapeHtml(formatLabel(key))}</th>
                <td>${escapeHtml(formatFieldValue(key, record[key]))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderArraySection(title, rows, preferredColumns) {
  return `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      ${renderTableSection(title, normaliseArrayResponse(rows), preferredColumns, true)}
    </section>
  `;
}

function renderTableSection(_title, rows, preferredColumns = null, addViewButton = false) {
  if (!rows || !rows.length) {
    return `<div class="empty-state">No records found.</div>`;
  }

  const columns = (preferredColumns && preferredColumns.length)
    ? preferredColumns.filter((col) => rows.some((row) => col in row))
    : Object.keys(rows[0]).slice(0, 8);

  return `
    <div class="section-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            ${columns.map((col) => `<th>${escapeHtml(formatLabel(col))}</th>`).join("")}
            ${addViewButton ? `<th>Open</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((col) => `<td>${renderTableCell(col, row[col])}</td>`).join("")}
              ${addViewButton ? `
                <td class="table-actions">
                  <button class="text-link-btn js-open-record" data-record='${escapeHtml(JSON.stringify(row))}'>View</button>
                  ${row.id ? `<button class="text-link-btn js-keywork-row" data-session-id="${row.id}">${state.activeTab === "keywork" ? "Edit" : ""}</button>` : ""}
                </td>
              ` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTableCell(key, value) {
  if (key === "compliance_status") {
    return renderStatusPill(value);
  }

  if (key === "severity") {
    return renderSeverityPill(value);
  }

  if (key === "workflow_status") {
    return renderWorkflowPill(value);
  }

  return escapeHtml(trimForTable(formatFieldValue(key, value), key));
}

function renderStatusPill(value) {
  const label = stringifyValue(value);
  const cls = statusColour(value);
  return `<span class="status-pill ${cls}">${escapeHtml(label)}</span>`;
}

function renderSeverityPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey";

  if (lower === "high") cls = "status-red";
  else if (lower === "medium") cls = "status-amber";
  else if (lower === "low") cls = "status-green";

  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function renderWorkflowPill(value) {
  const lower = String(value || "").toLowerCase();
  let cls = "status-grey";

  if (lower === "approved") cls = "status-green";
  else if (lower === "submitted") cls = "status-blue";
  else if (lower === "returned") cls = "status-red";
  else if (lower === "draft") cls = "status-grey";

  return `<span class="status-pill ${cls}">${escapeHtml(stringifyValue(value))}</span>`;
}

function bindOpenRecordButtons() {
  document.querySelectorAll(".js-open-record").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const record = JSON.parse(unescapeHtml(btn.dataset.record));
        openRecordDrawer("Record Detail", record);
      } catch (_err) {}
    });
  });
}

function openRecordDrawer(title, record) {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;

  els.recordDetailDrawer.classList.remove("hidden");
  els.recordDetailContent.innerHTML = `
    <section class="section-group">
      <h3 class="group-title">${escapeHtml(title)}</h3>
      <div class="section-table-wrap">
        <table class="data-table key-value compact">
          <tbody>
            ${Object.entries(record || {}).map(([key, value]) => `
              <tr>
                <th>${escapeHtml(formatLabel(key))}</th>
                <td>${escapeHtml(formatFieldValue(key, value))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function closeRecordDrawer() {
  if (!els.recordDetailDrawer || !els.recordDetailContent) return;
  els.recordDetailDrawer.classList.add("hidden");
  els.recordDetailContent.innerHTML = "";
}

function normaliseArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const groupKey = row[key] || "other";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(row);
    return acc;
  }, {});
}

function formatComplianceGroupTitle(value) {
  const map = {
    support_plan_review: "Support Plan Reviews",
    risk_review: "Risk Reviews",
    keywork_follow_up: "Key Work Follow-up"
  };
  return map[value] || formatLabel(value);
}

function getFullName(person) {
  const preferred = person.preferred_name ? ` (${person.preferred_name})` : "";
  const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return name ? `${name}${preferred}` : `Young Person #${person.id}`;
}

function setText(el, value) {
  if (el) el.textContent = String(value);
}

function cleanValue(value) {
  const cleaned = typeof value === "string" ? value.trim() : value;
  return cleaned === "" ? null : cleaned;
}

function parseNullableInt(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function trimForTable(value, key) {
  const max = ["summary", "description", "presenting_need", "concern_summary", "positives", "actions_required", "what_matters_to_me", "rationale"].includes(key)
    ? 80
    : 48;

  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function formatLabel(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatFieldValue(key, value) {
  if (!hasValue(value)) return "—";

  const dateKeys = [
    "date_of_birth",
    "created_at",
    "updated_at",
    "event_datetime",
    "session_date",
    "note_date",
    "record_date",
    "admission_date",
    "discharge_date",
    "review_date",
    "start_date",
    "next_session_date",
    "contact_datetime",
    "effective_from",
    "effective_to",
    "scheduled_time",
    "administered_time",
    "approved_at",
    "returned_at",
    "submitted_at",
    "next_action_date"
  ];

  if (dateKeys.includes(key)) {
    if (
      key === "date_of_birth" ||
      key === "session_date" ||
      key === "note_date" ||
      key === "record_date" ||
      key === "admission_date" ||
      key === "discharge_date" ||
      key === "review_date" ||
      key === "start_date" ||
      key === "next_session_date" ||
      key === "effective_from" ||
      key === "effective_to" ||
      key === "next_action_date"
    ) {
      return formatDate(value);
    }

    return formatDateTime(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return stringifyValue(value);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function statusColour(value) {
  const lower = String(value || "").toLowerCase();

  if (lower === "overdue" || lower === "high") return "status-red";
  if (lower === "due_soon" || lower === "medium" || lower === "pending") return "status-amber";
  if (lower === "ok" || lower === "active" || lower === "approved" || lower === "complete") return "status-green";
  if (lower === "submitted" || lower === "info") return "status-blue";

  return "status-grey";
}

function unescapeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
