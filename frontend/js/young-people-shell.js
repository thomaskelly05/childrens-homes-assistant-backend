const state = {
  youngPeople: [],
  filteredYoungPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview",
  keyworkSessions: [],
  activeKeyworkSessionId: null
};

const endpoints = {
  youngPeopleList: [
    "/young-people",
    "/young-people/list",
    "/api/young-people"
  ],
  overview: (id) => [
    `/young-people/${id}`,
    `/api/young-people/${id}`
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
  chronologyRebuild: (id) => `/young-people/${id}/chronology/rebuild`
};

const els = {
  youngPeopleList: document.getElementById("youngPeopleList"),
  youngPersonSearch: document.getElementById("youngPersonSearch"),
  refreshYoungPeopleBtn: document.getElementById("refreshYoungPeopleBtn"),
  reloadCurrentBtn: document.getElementById("reloadCurrentBtn"),
  selectedYoungPersonName: document.getElementById("selectedYoungPersonName"),
  selectedYoungPersonMeta: document.getElementById("selectedYoungPersonMeta"),
  statusBar: document.getElementById("statusBar"),

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
  clearKeyworkFormBtn: document.getElementById("clearKeyworkFormBtn"),
  rebuildChronologyBtn: document.getElementById("rebuildChronologyBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadYoungPeople();
});

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  els.youngPersonSearch.addEventListener("input", handleSearch);
  els.refreshYoungPeopleBtn.addEventListener("click", loadYoungPeople);
  els.reloadCurrentBtn.addEventListener("click", reloadCurrentRecord);

  els.keyworkForm.addEventListener("submit", saveKeyworkSession);
  els.newKeyworkBtn.addEventListener("click", resetKeyworkForm);
  els.clearKeyworkFormBtn.addEventListener("click", resetKeyworkForm);

  if (els.rebuildChronologyBtn) {
    els.rebuildChronologyBtn.addEventListener("click", rebuildChronology);
  }
}

function showStatus(message, isError = false) {
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
    els.youngPeopleList.innerHTML = `<div class="empty-state">Could not load young people.<br><small>${escapeHtml(error.message)}</small></div>`;
    showStatus(`Could not load young people: ${error.message}`, true);
  }
}

function handleSearch(event) {
  const term = event.target.value.trim().toLowerCase();

  state.filteredYoungPeople = state.youngPeople.filter((person) => {
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

  els.youngPeopleList.innerHTML = state.filteredYoungPeople.map((person) => {
    const name = getFullName(person);
    const active = Number(state.selectedYoungPerson?.id) === Number(person.id) ? "active" : "";
    const sub = person.room ? `Room: ${escapeHtml(person.room)}` : `ID: ${person.id}`;

    return `
      <div class="young-person-card ${active}" data-id="${person.id}">
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(sub)}</p>
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
  renderYoungPeopleList();
  updateSelectedPersonHeader();
  resetKeyworkForm();
  await loadActiveTabData();
}

function updateSelectedPersonHeader() {
  if (!state.selectedYoungPerson) {
    els.selectedYoungPersonName.textContent = "Select a young person";
    els.selectedYoungPersonMeta.textContent = "No record loaded";
    return;
  }

  const person = state.selectedYoungPerson;
  const bits = [`ID: ${person.id}`];

  if (person.dob) bits.push(`DOB: ${formatDate(person.dob)}`);
  if (person.room) bits.push(`Room: ${person.room}`);
  if (person.placement_status) bits.push(`Status: ${person.placement_status}`);

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

  loadActiveTabData();
}

async function reloadCurrentRecord() {
  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  await loadActiveTabData();
}

async function loadActiveTabData() {
  if (!state.selectedYoungPerson) return;

  const id = state.selectedYoungPerson.id;

  try {
    switch (state.activeTab) {
      case "overview":
        await loadGenericSection(endpoints.overview(id), els.overviewContent);
        break;
      case "profile":
        await loadGenericSection(endpoints.profile(id), els.profileContent);
        break;
      case "plans":
        await loadGenericSection(endpoints.plans(id), els.plansContent);
        break;
      case "risk":
        await loadGenericSection(endpoints.risk(id), els.riskContent);
        break;
      case "daily_notes":
        await loadGenericSection(endpoints.daily_notes(id), els.dailyNotesContent);
        break;
      case "incidents":
        await loadGenericSection(endpoints.incidents(id), els.incidentsContent);
        break;
      case "health":
        await loadGenericSection(endpoints.health(id), els.healthContent);
        break;
      case "education":
        await loadGenericSection(endpoints.education(id), els.educationContent);
        break;
      case "family":
        await loadGenericSection(endpoints.family(id), els.familyContent);
        break;
      case "compliance":
        await loadGenericSection(endpoints.compliance(id), els.complianceContent);
        break;
      case "keywork":
        await loadKeyworkSessions(id);
        break;
      case "chronology":
        await loadChronology(id);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message, true);
  }
}

async function loadGenericSection(candidateUrls, container) {
  container.innerHTML = `<div class="empty-state">Loading...</div>`;

  try {
    const data = Array.isArray(candidateUrls)
      ? await fetchFromCandidates(candidateUrls)
      : await fetchJson(candidateUrls);

    container.innerHTML = renderObjectOrArray(data);
  } catch (error) {
    container.innerHTML = `<div class="empty-state">Could not load this section.<br><small>${escapeHtml(error.message)}</small></div>`;
  }
}

async function loadKeyworkSessions(youngPersonId) {
  els.keyworkList.innerHTML = `<div class="empty-state">Loading key work sessions...</div>`;

  try {
    const data = await fetchJson(endpoints.keyworkList(youngPersonId));
    state.keyworkSessions = normaliseArrayResponse(data);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    els.keyworkList.innerHTML = `<div class="empty-state">Could not load key work sessions.<br><small>${escapeHtml(error.message)}</small></div>`;
  }
}

function renderKeyworkList() {
  if (!state.keyworkSessions.length) {
    els.keyworkList.innerHTML = `<div class="empty-state">No key work sessions found.</div>`;
    return;
  }

  els.keyworkList.innerHTML = state.keyworkSessions.map((session) => {
    const active = Number(state.activeKeyworkSessionId) === Number(session.id) ? "active" : "";
    const workerName = [session.worker_first_name, session.worker_last_name].filter(Boolean).join(" ") || "Not assigned";

    return `
      <div class="record-card ${active}" data-id="${session.id}">
        <h4>${escapeHtml(session.topic || "Key work session")}</h4>
        <p><span class="badge">${escapeHtml(formatDate(session.session_date))}</span></p>
        <p><strong>Worker:</strong> ${escapeHtml(workerName)}</p>
        <p><strong>Summary:</strong> ${escapeHtml(trimText(session.summary || "No summary recorded", 140))}</p>
      </div>
    `;
  }).join("");

  els.keyworkList.querySelectorAll(".record-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const sessionId = Number(card.dataset.id);
      await loadSingleKeyworkSession(sessionId);
    });
  });
}

async function loadSingleKeyworkSession(sessionId) {
  try {
    const session = await fetchJson(endpoints.keyworkById(sessionId));
    state.activeKeyworkSessionId = session.id;
    fillKeyworkForm(session);
    renderKeyworkList();
  } catch (error) {
    console.error(error);
    showStatus(`Could not load key work session: ${error.message}`, true);
  }
}

function fillKeyworkForm(session) {
  els.keyworkFormTitle.textContent = `Edit Key Work Session #${session.id}`;
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
  els.keyworkForm.reset();
  els.keyworkSessionId.value = "";
  els.keyworkFormTitle.textContent = "Create / Edit Key Work Session";
  renderKeyworkList();
}

async function saveKeyworkSession(event) {
  event.preventDefault();

  if (!state.selectedYoungPerson) {
    showStatus("Please select a young person first.", true);
    return;
  }

  const sessionId = els.keyworkSessionId.value.trim();

  const payload = {
    young_person_id: Number(state.selectedYoungPerson.id),
    session_date: els.sessionDate.value || null,
    worker_id: parseNullableInt(els.workerId.value),
    topic: cleanValue(els.topic.value),
    purpose: cleanValue(els.purpose.value),
    summary: cleanValue(els.summary.value),
    child_voice: cleanValue(els.childVoice.value),
    reflective_analysis: cleanValue(els.reflectiveAnalysis.value),
    actions_agreed: cleanValue(els.actionsAgreed.value),
    next_session_date: cleanValue(els.nextSessionDate.value)
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

      await fetchJson(endpoints.keyworkUpdate(sessionId), {
        method: "PUT",
        body: JSON.stringify(updatePayload)
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
  } catch (error) {
    console.error(error);
    showStatus(`Could not save key work session: ${error.message}`, true);
  }
}

async function loadChronology(youngPersonId) {
  els.chronologyContent.innerHTML = `<div class="empty-state">Loading chronology...</div>`;

  try {
    const data = await fetchJson(endpoints.chronologyList(youngPersonId));
    const rows = normaliseArrayResponse(data);

    if (!rows.length) {
      els.chronologyContent.innerHTML = `<div class="empty-state">No chronology events found.</div>`;
      return;
    }

    els.chronologyContent.innerHTML = `
      <div class="timeline">
        ${rows.map((item) => `
          <div class="timeline-item">
            <h4>${escapeHtml(item.title || "Chronology event")}</h4>
            <p class="timeline-meta">
              ${escapeHtml(formatDateTime(item.event_datetime))}
              ${item.category ? ` | ${escapeHtml(item.category)}` : ""}
              ${item.subcategory ? ` | ${escapeHtml(item.subcategory)}` : ""}
            </p>
            <p>${escapeHtml(item.summary || "No summary recorded.")}</p>
            <p class="timeline-meta">
              ${item.significance ? `Significance: ${escapeHtml(item.significance)}` : ""}
              ${item.source_table ? ` | Source: ${escapeHtml(item.source_table)}` : ""}
            </p>
          </div>
        `).join("")}
      </div>
    `;
  } catch (error) {
    console.error(error);
    els.chronologyContent.innerHTML = `<div class="empty-state">Could not load chronology.<br><small>${escapeHtml(error.message)}</small></div>`;
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

function renderObjectOrArray(data) {
  if (data === null || data === undefined) {
    return `<div class="empty-state">No data found.</div>`;
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      return `<div class="empty-state">No records found.</div>`;
    }

    return data.map((item) => {
      if (typeof item === "object" && item !== null) {
        return `
          <div class="data-box">
            <div class="data-grid">
              ${Object.entries(item).map(([key, value]) => `
                <div class="data-item">
                  <strong>${escapeHtml(formatLabel(key))}</strong>
                  <span>${escapeHtml(stringifyValue(value))}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      return `<div class="data-box">${escapeHtml(String(item))}</div>`;
    }).join("");
  }

  if (typeof data === "object") {
    return `
      <div class="data-grid">
        ${Object.entries(data).map(([key, value]) => `
          <div class="data-item">
            <strong>${escapeHtml(formatLabel(key))}</strong>
            <span>${escapeHtml(stringifyValue(value))}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  return `<div class="data-box">${escapeHtml(String(data))}</div>`;
}

function normaliseArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getFullName(person) {
  const name = `${person.first_name || ""} ${person.last_name || ""}`.trim();
  return name || `Young Person #${person.id}`;
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

function trimText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatLabel(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
