const API_BASE = ""; 
// Leave as "" if frontend is served from same FastAPI origin.
// Example if needed: const API_BASE = "http://127.0.0.1:8000";

const ENDPOINTS = {
  youngPeopleList: [
    "/young-people",
    "/api/young-people"
  ],
  youngPersonById: (id) => [
    `/young-people/${id}`,
    `/api/young-people/${id}`
  ],
  overview: (id) => [
    `/young-people/${id}/overview`,
    `/api/young-people/${id}/overview`
  ],
  profile: (id) => [
    `/young-people/${id}/profile`,
    `/api/young-people/${id}/profile`
  ],
  plans: (id) => [
    `/young-people/${id}/plans`,
    `/api/young-people/${id}/plans`
  ],
  risk: (id) => [
    `/young-people/${id}/risk`,
    `/api/young-people/${id}/risk`
  ],
  daily_notes: (id) => [
    `/young-people/${id}/daily-notes`,
    `/api/young-people/${id}/daily-notes`
  ],
  incidents: (id) => [
    `/young-people/${id}/incidents`,
    `/api/young-people/${id}/incidents`
  ],
  health: (id) => [
    `/young-people/${id}/health`,
    `/api/young-people/${id}/health`
  ],
  education: (id) => [
    `/young-people/${id}/education`,
    `/api/young-people/${id}/education`
  ],
  family: (id) => [
    `/young-people/${id}/family`,
    `/api/young-people/${id}/family`
  ],
  chronology: (id) => [
    `/young-people/${id}/chronology`,
    `/api/young-people/${id}/chronology`
  ],
  compliance: (id) => [
    `/young-people/${id}/compliance`,
    `/api/young-people/${id}/compliance`
  ],
  keyworkList: (id) => `${API_BASE}/young-people/${id}/keywork`,
  keyworkById: (id) => `${API_BASE}/young-people/keywork/${id}`,
  keyworkCreate: `${API_BASE}/young-people/keywork`
};

const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  keyworkSessions: [],
  activeKeyworkSessionId: null
};

const els = {
  youngPeopleList: document.getElementById("youngPeopleList"),
  youngPersonSearch: document.getElementById("youngPersonSearch"),
  refreshYoungPeopleBtn: document.getElementById("refreshYoungPeopleBtn"),
  reloadCurrentYoungPersonBtn: document.getElementById("reloadCurrentYoungPersonBtn"),
  selectedYoungPersonName: document.getElementById("selectedYoungPersonName"),
  selectedYoungPersonMeta: document.getElementById("selectedYoungPersonMeta"),
  statusBar: document.getElementById("statusBar"),
  tabsNav: document.getElementById("tabsNav"),
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
  clearKeyworkFormBtn: document.getElementById("clearKeyworkFormBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  els.youngPersonSearch.addEventListener("input", handleYoungPersonSearch);
  els.refreshYoungPeopleBtn.addEventListener("click", loadYoungPeople);
  els.reloadCurrentYoungPersonBtn.addEventListener("click", reloadCurrentYoungPerson);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  els.keyworkForm.addEventListener("submit", handleKeyworkSubmit);
  els.newKeyworkBtn.addEventListener("click", resetKeyworkForm);
  els.clearKeyworkFormBtn.addEventListener("click", resetKeyworkForm);
}

function showStatus(message, isError = false) {
  els.statusBar.textContent = message;
  els.statusBar.classList.remove("hidden", "error");
  if (isError) {
    els.statusBar.classList.add("error");
  }
  window.clearTimeout(showStatus._timer);
  showStatus._timer = window.setTimeout(() => {
    els.statusBar.classList.add("hidden");
  }, 4000);
}

async function fetchFromCandidates(candidates, options = {}) {
  let lastError = null;

  for (const path of candidates) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} on ${path}`);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No valid endpoint response");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.detail) errorMessage = errorData.detail;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  return response.json();
}

async function loadYoungPeople() {
  try {
    showStatus("Loading young people...");
    const data = await fetchFromCandidates(ENDPOINTS.youngPeopleList);

    state.youngPeople = Array.isArray(data) ? data : (data.items || []);
    state.filteredYoungPeople = [...state.youngPeople];
    renderYoungPeopleList();

    if (state.youngPeople.length > 0 && !state.selectedYoungPerson) {
      selectYoungPerson(state.youngPeople[0]);
    } else if (state.youngPeople.length === 0) {
      els.selectedYoungPersonName.textContent = "No young people found";
      els.selectedYoungPersonMeta.textContent = "No records available";
    }

    showStatus("Young people loaded successfully.");
  } catch (error) {
    console.error("Failed to load young people:", error);
    renderYoungPeopleList();
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function handleYoungPersonSearch(event) {
  const term = event.target.value.trim().toLowerCase();

  state.filteredYoungPeople = state.youngPeople.filter(person => {
    const name = `${person.first_name || ""} ${person.last_name || ""}`.toLowerCase();
    return name.includes(term);
  });

  renderYoungPeopleList();
}

function renderYoungPeopleList() {
  if (!state.filteredYoungPeople.length) {
    els.youngPeopleList.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  els.youngPeopleList.innerHTML = state.filteredYoungPeople
    .map(person => {
      const fullName = getFullName(person);
      const isActive = state.selectedYoungPerson?.id === person.id ? "active" : "";
      const roomText = person.room ? `Room: ${escapeHtml(person.room)}` : `ID: ${person.id}`;

      return `
        <div class="young-person-card ${isActive}" data-id="${person.id}">
          <h4>${escapeHtml(fullName)}</h4>
          <p>${escapeHtml(roomText)}</p>
        </div>
      `;
    })
    .join("");

  els.youngPeopleList.querySelectorAll(".young-person-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const person = state.youngPeople.find(p => p.id === id);
      if (person) selectYoungPerson(person);
    });
  });
}

async function selectYoungPerson(person) {
  state.selectedYoungPerson = person;
  renderYoungPeopleList();
  updateSelectedYoungPersonHeader();
  resetKeyworkForm();
  await loadCurrentTabData();
}

function updateSelectedYoungPersonHeader() {
  if (!state.selectedYoungPerson) {
    els.selectedYoungPersonName.textContent = "Select a young person";
    els.selectedYoungPersonMeta.textContent = "No young person loaded";
    return;
  }

  const person = state.selectedYoungPerson;
  const fullName = getFullName(person);
  els.selectedYoungPersonName.textContent = fullName;

  const bits = [`ID: ${person.id}`];
  if (person.dob) bits.push(`DOB: ${formatDate(person.dob)}`);
  if (person.placement_status) bits.push(`Status: ${person.placement_status}`);
  if (person.room) bits.push(`Room: ${person.room}`);

  els.selectedYoungPersonMeta.textContent = bits.join(" | ");
}

function setActiveTab(tabName) {
  state.activeTab = tabName;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  loadCurrentTabData();
}

async function reloadCurrentYoungPerson() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }
  await loadCurrentTabData(true);
}

async function loadCurrentTabData(forceReload = false) {
  if (!state.selectedYoungPerson) return;

  const personId = state.selectedYoungPerson.id;

  try {
    switch (state.activeTab) {
      case "overview":
        await loadGenericSection("overview", personId, els.overviewContent, forceReload);
        break;
      case "profile":
        await loadGenericSection("profile", personId, els.profileContent, forceReload);
        break;
      case "plans":
        await loadGenericSection("plans", personId, els.plansContent, forceReload);
        break;
      case "risk":
        await loadGenericSection("risk", personId, els.riskContent, forceReload);
        break;
      case "daily_notes":
        await loadGenericSection("daily_notes", personId, els.dailyNotesContent, forceReload);
        break;
      case "incidents":
        await loadGenericSection("incidents", personId, els.incidentsContent, forceReload);
        break;
      case "health":
        await loadGenericSection("health", personId, els.healthContent, forceReload);
        break;
      case "education":
        await loadGenericSection("education", personId, els.educationContent, forceReload);
        break;
      case "family":
        await loadGenericSection("family", personId, els.familyContent, forceReload);
        break;
      case "chronology":
        await loadGenericSection("chronology", personId, els.chronologyContent, forceReload);
        break;
      case "compliance":
        await loadGenericSection("compliance", personId, els.complianceContent, forceReload);
        break;
      case "keywork":
        await loadKeyworkSessions(personId);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed loading tab ${state.activeTab}:`, error);
    showStatus(`Could not load ${state.activeTab.replace("_", " ")}: ${error.message}`, true);
  }
}

async function loadGenericSection(sectionKey, personId, containerEl) {
  containerEl.innerHTML = `<p class="muted">Loading...</p>`;

  try {
    const data = await fetchFromCandidates(ENDPOINTS[sectionKey](personId));

    if (sectionKey === "overview") {
      containerEl.innerHTML = renderOverviewData(data);
      return;
    }

    containerEl.innerHTML = renderGenericData(data);
  } catch (error) {
    containerEl.innerHTML = `
      <div class="empty-state">
        Could not load ${sectionKey.replace("_", " ")}.
        <br />
        <small>${escapeHtml(error.message)}</small>
      </div>
    `;
  }
}

function renderOverviewData(data) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return `<div class="empty-state">No overview data found.</div>`;
  }

  if (Array.isArray(data)) {
    return data.map(item => `<div class="data-box">${renderGenericData(item)}</div>`).join("");
  }

  const priorityKeys = [
    "legal_status",
    "placement_type",
    "social_worker",
    "local_authority",
    "school",
    "registered_gp",
    "allergies",
    "missing_risk",
    "room"
  ];

  const gridItems = priorityKeys
    .filter(key => data[key] !== undefined && data[key] !== null && data[key] !== "")
    .map(key => {
      return `
        <div class="data-item">
          <strong>${formatLabel(key)}</strong>
          <span>${escapeHtml(String(data[key]))}</span>
        </div>
      `;
    })
    .join("");

  const jsonFallback = `
    <div class="data-box">
      <h4>Raw Record</h4>
      <div class="json-box">${escapeHtml(JSON.stringify(data, null, 2))}</div>
    </div>
  `;

  return `
    ${gridItems ? `<div class="data-grid">${gridItems}</div>` : ""}
    ${jsonFallback}
  `;
}

function renderGenericData(data) {
  if (data === null || data === undefined) {
    return `<div class="empty-state">No data found.</div>`;
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      return `<div class="empty-state">No records found.</div>`;
    }

    return data.map(item => {
      if (typeof item === "object" && item !== null) {
        const fields = Object.entries(item)
          .map(([key, value]) => `
            <div class="data-item">
              <strong>${formatLabel(key)}</strong>
              <span>${escapeHtml(stringifyValue(value))}</span>
            </div>
          `)
          .join("");

        return `<div class="data-box"><div class="data-grid">${fields}</div></div>`;
      }

      return `<div class="data-box">${escapeHtml(String(item))}</div>`;
    }).join("");
  }

  if (typeof data === "object") {
    const fields = Object.entries(data)
      .map(([key, value]) => `
        <div class="data-item">
          <strong>${formatLabel(key)}</strong>
          <span>${escapeHtml(stringifyValue(value))}</span>
        </div>
      `)
      .join("");

    return `<div class="data-grid">${fields}</div>`;
  }

  return `<div class="data-box">${escapeHtml(String(data))}</div>`;
}

async function loadKeyworkSessions(youngPersonId) {
  els.keyworkList.innerHTML = `<p class="muted">Loading key work sessions...</p>`;

  try {
    const data = await fetchJson(ENDPOINTS.keyworkList(youngPersonId));
    state.keyworkSessions = Array.isArray(data) ? data : [];
    renderKeyworkList();
  } catch (error) {
    console.error("Failed to load keywork sessions:", error);
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
  if (!state.keyworkSessions.length) {
    els.keyworkList.innerHTML = `<div class="empty-state">No key work sessions found.</div>`;
    return;
  }

  els.keyworkList.innerHTML = state.keyworkSessions
    .map(session => {
      const activeClass = state.activeKeyworkSessionId === session.id ? "active" : "";
      const workerName = [session.worker_first_name, session.worker_last_name].filter(Boolean).join(" ");
      return `
        <div class="record-card ${activeClass}" data-id="${session.id}">
          <h4>${escapeHtml(session.topic || "Untitled Session")}</h4>
          <p><span class="badge">${escapeHtml(formatDate(session.session_date))}</span></p>
          <p><strong>Worker:</strong> ${escapeHtml(workerName || "Not assigned")}</p>
          <p><strong>Summary:</strong> ${escapeHtml(trimText(session.summary || "No summary", 140))}</p>
        </div>
      `;
    })
    .join("");

  els.keyworkList.querySelectorAll(".record-card").forEach(card => {
    card.addEventListener("click", async () => {
      const sessionId = Number(card.dataset.id);
      await loadKeyworkSession(sessionId);
    });
  });
}

async function loadKeyworkSession(sessionId) {
  try {
    const session = await fetchJson(ENDPOINTS.keyworkById(sessionId));
    state.activeKeyworkSessionId = session.id;
    populateKeyworkForm(session);
    renderKeyworkList();
  } catch (error) {
    console.error("Failed to load session:", error);
    showStatus(`Could not load session: ${error.message}`, true);
  }
}

function populateKeyworkForm(session) {
  els.keyworkFormTitle.textContent = `Edit Session #${session.id}`;
  els.keyworkSessionId.value = session.id || "";
  els.sessionDate.value = toDateInputValue(session.session_date);
  els.workerId.value = session.worker_id ?? "";
  els.topic.value = session.topic ?? "";
  els.purpose.value = session.purpose ?? "";
  els.summary.value = session.summary ?? "";
  els.childVoice.value = session.child_voice ?? "";
  els.reflectiveAnalysis.value = session.reflective_analysis ?? "";
  els.actionsAgreed.value = session.actions_agreed ?? "";
  els.nextSessionDate.value = toDateInputValue(session.next_session_date);
}

function resetKeyworkForm() {
  state.activeKeyworkSessionId = null;
  els.keyworkFormTitle.textContent = "Create / Edit Session";
  els.keyworkSessionId.value = "";
  els.keyworkForm.reset();
  renderKeyworkList();
}

async function handleKeyworkSubmit(event) {
  event.preventDefault();

  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const sessionId = els.keyworkSessionId.value.trim();
  const payload = {
    young_person_id: state.selectedYoungPerson.id,
    session_date: els.sessionDate.value || null,
    worker_id: parseNullableInt(els.workerId.value),
    topic: els.topic.value.trim(),
    purpose: emptyToNull(els.purpose.value),
    summary: emptyToNull(els.summary.value),
    child_voice: emptyToNull(els.childVoice.value),
    reflective_analysis: emptyToNull(els.reflectiveAnalysis.value),
    actions_agreed: emptyToNull(els.actionsAgreed.value),
    next_session_date: emptyToNull(els.nextSessionDate.value)
  };

  if (!payload.session_date || !payload.topic) {
    showStatus("Session date and topic are required.", true);
    return;
  }

  try {
    if (sessionId) {
      const updatePayload = {
        session_date: payload.session_date,
        worker_id: payload.worker_id,
        topic: payload.topic,
        purpose: payload.purpose,
        summary: payload.summary,
        child_voice: payload.child_voice,
        reflective_analysis: payload.reflective_analysis,
        actions_agreed: payload.actions_agreed,
        next_session_date: payload.next_session_date
      };

      await fetchJson(`${API_BASE}/young-people/keywork/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload)
      });

      showStatus("Key work session updated successfully.");
    } else {
      await fetchJson(ENDPOINTS.keyworkCreate, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("Key work session created successfully.");
    }

    resetKeyworkForm();
    await loadKeyworkSessions(state.selectedYoungPerson.id);
  } catch (error) {
    console.error("Failed to save session:", error);
    showStatus(`Could not save session: ${error.message}`, true);
  }
}

function getFullName(person) {
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return fullName || `Young Person #${person.id}`;
}

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function emptyToNull(value) {
  const cleaned = value?.trim?.() ?? value;
  return cleaned === "" ? null : cleaned;
}

function parseNullableInt(value) {
  const cleaned = value?.trim?.();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function trimText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
