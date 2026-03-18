const ENDPOINTS = {
  listYoungPeople: "/young-people/",
  getYoungPersonProfile: (id) => `/young-people/${id}/profile`,
  aiGenerate: "/ai-notes/generate",
  aiSave: "/ai-notes/save",
};

let youngPeopleCache = [];
let selectedYoungPersonId = null;
let latestSafeguardingFlag = false;
let latestSafeguardingReason = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fullName(person) {
  const first = person?.first_name || "";
  const last = person?.last_name || "";
  return `${first} ${last}`.trim() || "Unnamed young person";
}

function preferredDisplayName(person) {
  return person?.preferred_name?.trim() || fullName(person);
}

function riskBadgeClass(riskLevel) {
  const value = (riskLevel || "").toLowerCase();
  if (value.includes("high")) return "badge-danger";
  if (value.includes("medium")) return "badge-warning";
  if (value.includes("low")) return "badge-success";
  return "badge-neutral";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "—";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function setLoading(containerId, text = "Loading...") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="loading">${escapeHtml(text)}</div>`;
}

function setError(containerId, text = "Something went wrong") {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="error-state">${escapeHtml(text)}</div>`;
}

function renderYoungPeopleList(items) {
  const container = document.getElementById("youngPeopleList");

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No young people found.</div>`;
    return;
  }

  container.innerHTML = items.map((yp) => {
    const keyworker =
      yp.primary_keyworker_first_name || yp.primary_keyworker_last_name
        ? `${yp.primary_keyworker_first_name || ""} ${yp.primary_keyworker_last_name || ""}`.trim()
        : "Not assigned";

    const activeClass = selectedYoungPersonId === yp.id ? "active" : "";

    return `
      <article class="yp-card ${activeClass}" data-id="${yp.id}">
        <div class="yp-name-row">
          <div class="yp-name">${escapeHtml(fullName(yp))}</div>
          <span class="badge ${riskBadgeClass(yp.summary_risk_level)}">
            ${escapeHtml(yp.summary_risk_level || "No risk set")}
          </span>
        </div>

        <div class="yp-meta">
          <span class="badge badge-neutral">${escapeHtml(yp.placement_status || "Placement not set")}</span>
          <span class="badge badge-neutral">Keyworker: ${escapeHtml(keyworker)}</span>
        </div>
      </article>
    `;
  }).join("");

  container.querySelectorAll(".yp-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      selectYoungPerson(id);
    });
  });
}

function renderProfile(profileData) {
  const panel = document.getElementById("profilePanel");
  const yp = profileData?.young_person;

  if (!yp) {
    panel.innerHTML = `<div class="empty-panel">Profile not available.</div>`;
    return;
  }

  const alerts = Array.isArray(profileData.alerts) ? profileData.alerts : [];
  const legalStatus = Array.isArray(profileData.legal_status) ? profileData.legal_status : [];
  const communicationProfile = Array.isArray(profileData.communication_profile) ? profileData.communication_profile : [];
  const identityProfile = Array.isArray(profileData.identity_profile) ? profileData.identity_profile : [];

  const latestCommunication = communicationProfile[0];
  const latestIdentity = identityProfile[0];

  panel.innerHTML = `
    <div class="kv">
      <div class="kv-label">Name</div>
      <div>${escapeHtml(fullName(yp))}</div>

      <div class="kv-label">Preferred name</div>
      <div>${escapeHtml(preferredDisplayName(yp))}</div>

      <div class="kv-label">Age</div>
      <div>${escapeHtml(calculateAge(yp.date_of_birth))}</div>

      <div class="kv-label">Date of birth</div>
      <div>${escapeHtml(formatDate(yp.date_of_birth))}</div>

      <div class="kv-label">Gender</div>
      <div>${escapeHtml(yp.gender || "—")}</div>

      <div class="kv-label">Ethnicity</div>
      <div>${escapeHtml(yp.ethnicity || "—")}</div>

      <div class="kv-label">Placement status</div>
      <div>${escapeHtml(yp.placement_status || "—")}</div>

      <div class="kv-label">Admission date</div>
      <div>${escapeHtml(formatDate(yp.admission_date))}</div>

      <div class="kv-label">Discharge date</div>
      <div>${escapeHtml(formatDate(yp.discharge_date))}</div>

      <div class="kv-label">Risk level</div>
      <div><span class="badge ${riskBadgeClass(yp.summary_risk_level)}">${escapeHtml(yp.summary_risk_level || "No risk set")}</span></div>

      <div class="kv-label">Primary keyworker</div>
      <div>${escapeHtml(`${yp.primary_keyworker_first_name || ""} ${yp.primary_keyworker_last_name || ""}`.trim() || "Not assigned")}</div>

      <div class="kv-label">NHS number</div>
      <div>${escapeHtml(yp.nhs_number || "—")}</div>

      <div class="kv-label">Local ID number</div>
      <div>${escapeHtml(yp.local_id_number || "—")}</div>
    </div>

    <div class="section-block">
      <h4>Alerts</h4>
      ${
        alerts.length
          ? alerts.map(alert => `
              <div class="alert-item">
                <strong>${escapeHtml(alert.title || alert.alert_type || "Alert")}</strong><br>
                <div>${escapeHtml(alert.description || alert.summary || "")}</div>
              </div>
            `).join("")
          : `<div class="empty-state">No alerts recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Legal Status</h4>
      ${
        legalStatus.length
          ? legalStatus.map(item => `
              <div class="simple-item">
                <strong>${escapeHtml(item.status || item.legal_status || "Legal status")}</strong><br>
                Effective from: ${escapeHtml(formatDate(item.effective_from))}
              </div>
            `).join("")
          : `<div class="empty-state">No legal status recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Communication Profile</h4>
      ${
        latestCommunication
          ? `
            <div class="simple-item">
              <strong>Communication style</strong><br>
              <div>${escapeHtml(latestCommunication.communication_style || "—")}</div>
              <br>
              <strong>Sensory profile</strong><br>
              <div>${escapeHtml(latestCommunication.sensory_profile || "—")}</div>
            </div>
          `
          : `<div class="empty-state">No communication profile recorded.</div>`
      }
    </div>

    <div class="section-block">
      <h4>Identity Profile</h4>
      ${
        latestIdentity
          ? `
            <div class="simple-item">
              <strong>Interests</strong><br>
              <div>${escapeHtml(latestIdentity.interests || "—")}</div>
              <br>
              <strong>Strengths summary</strong><br>
              <div>${escapeHtml(latestIdentity.strengths_summary || "—")}</div>
              <br>
              <strong>What matters to me</strong><br>
              <div>${escapeHtml(latestIdentity.what_matters_to_me || "—")}</div>
            </div>
          `
          : `<div class="empty-state">No identity profile recorded.</div>`
      }
    </div>
  `;
}

async function loadYoungPeople() {
  setLoading("youngPeopleList", "Loading young people...");

  try {
    const res = await fetch(ENDPOINTS.listYoungPeople, {
      credentials: "same-origin",
    });

    if (!res.ok) {
      throw new Error(`Failed to load young people (${res.status})`);
    }

    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    youngPeopleCache = items;
    renderYoungPeopleList(items);
    populateYoungPersonSelect(items);

    if (items.length && !selectedYoungPersonId) {
      selectYoungPerson(items[0].id);
    }
  } catch (error) {
    console.error("YP LOAD ERROR", error);
    setError("youngPeopleList", "Unable to load young people.");
  }
}

async function selectYoungPerson(id) {
  selectedYoungPersonId = id;
  renderYoungPeopleList(filterYoungPeople(document.getElementById("youngPeopleSearch")?.value || ""));
  setLoading("profilePanel", "Loading profile...");

  try {
    const res = await fetch(ENDPOINTS.getYoungPersonProfile(id), {
      credentials: "same-origin",
    });

    if (!res.ok) {
      throw new Error(`Failed to load profile (${res.status})`);
    }

    const data = await res.json();
    renderProfile(data);

    const select = document.getElementById("aiYoungPerson");
    if (select) select.value = String(id);
  } catch (error) {
    console.error("PROFILE LOAD ERROR", error);
    setError("profilePanel", "Unable to load profile.");
  }
}

function filterYoungPeople(query) {
  const value = query.trim().toLowerCase();
  if (!value) return youngPeopleCache;

  return youngPeopleCache.filter((yp) => {
    const text = [
      yp.first_name,
      yp.last_name,
      yp.placement_status,
      yp.summary_risk_level,
      yp.primary_keyworker_first_name,
      yp.primary_keyworker_last_name,
    ].filter(Boolean).join(" ").toLowerCase();

    return text.includes(value);
  });
}

function populateYoungPersonSelect(items) {
  const select = document.getElementById("aiYoungPerson");
  if (!select) return;

  select.innerHTML = items.map((yp) => `
    <option value="${yp.id}">${escapeHtml(fullName(yp))}</option>
  `).join("");

  if (selectedYoungPersonId) {
    select.value = String(selectedYoungPersonId);
  }
}

function openAiModal() {
  document.getElementById("aiNoteModal").classList.remove("hidden");
  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.getElementById("aiRecordDate");
  if (dateInput && !dateInput.value) dateInput.value = today;
}

function closeAiModal() {
  document.getElementById("aiNoteModal").classList.add("hidden");
}

function setAiStatus(text, isError = false) {
  const el = document.getElementById("aiStatus");
  el.textContent = text || "";
  el.style.color = isError ? "#991b1b" : "#6b7280";
}

function showSafeguarding(flag, reason) {
  const banner = document.getElementById("aiSafeguardingBanner");
  if (!flag) {
    banner.classList.add("hidden");
    banner.textContent = "";
    return;
  }

  banner.classList.remove("hidden");
  banner.textContent = reason || "Potential safeguarding concern identified.";
}

async function generateAiNote() {
  const transcript = document.getElementById("aiTranscript").value.trim();

  if (!transcript) {
    setAiStatus("Please enter a raw note or transcript first.", true);
    return;
  }

  setAiStatus("Generating AI draft...");

  try {
    const formData = new FormData();
    formData.append("transcript", transcript);

    const res = await fetch(ENDPOINTS.aiGenerate, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.detail || "AI generation failed");
    }

    const note = data.note || "";
    latestSafeguardingFlag = !!data.safeguarding_flag;
    latestSafeguardingReason = data.safeguarding_reason || "";

    document.getElementById("aiDraft").value = note;
    document.getElementById("aiFinalNote").value = note;

    showSafeguarding(latestSafeguardingFlag, latestSafeguardingReason);
    setAiStatus("AI draft generated.");
  } catch (error) {
    console.error("AI GENERATE ERROR", error);
    setAiStatus(error.message || "Unable to generate AI note.", true);
  }
}

async function saveAiNote() {
  const transcript = document.getElementById("aiTranscript").value.trim();
  const aiDraft = document.getElementById("aiDraft").value.trim();
  const finalNote = document.getElementById("aiFinalNote").value.trim();
  const youngPersonId = document.getElementById("aiYoungPerson").value;
  const recordDate = document.getElementById("aiRecordDate").value;
  const shiftType = document.getElementById("aiShiftType").value.trim();
  const locationContext = document.getElementById("aiLocationContext").value.trim();

  if (!transcript || !aiDraft || !finalNote) {
    setAiStatus("Transcript, AI draft and final note are all required.", true);
    return;
  }

  const selectedYP = youngPeopleCache.find((yp) => String(yp.id) === String(youngPersonId));
  const youngPersonName = selectedYP ? fullName(selectedYP) : "";

  setAiStatus("Saving note...");

  try {
    const formData = new FormData();
    formData.append("transcript", transcript);
    formData.append("ai_draft", aiDraft);
    formData.append("final_note", finalNote);
    formData.append("safeguarding_flag", String(latestSafeguardingFlag));
    formData.append("safeguarding_reason", latestSafeguardingReason || "");
    formData.append("title", finalNote.split("\n").find(Boolean)?.slice(0, 100) || "AI Care Note");
    formData.append("template_name", "Young People Shell");
    formData.append("service_type", "Residential Care");
    formData.append("shift_type", shiftType || "");
    formData.append("record_author", "");
    formData.append("young_person_name", youngPersonName);
    formData.append("record_date", recordDate || "");
    formData.append("location_context", locationContext || "");

    const res = await fetch(ENDPOINTS.aiSave, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.detail || "Save failed");
    }

    setAiStatus("Note saved.");
    closeAiModal();
    resetAiForm();
  } catch (error) {
    console.error("AI SAVE ERROR", error);
    setAiStatus(error.message || "Unable to save note.", true);
  }
}

function resetAiForm() {
  document.getElementById("aiTranscript").value = "";
  document.getElementById("aiDraft").value = "";
  document.getElementById("aiFinalNote").value = "";
  document.getElementById("aiShiftType").value = "";
  document.getElementById("aiLocationContext").value = "";
  latestSafeguardingFlag = false;
  latestSafeguardingReason = "";
  showSafeguarding(false, "");
  setAiStatus("");
}

function bindEvents() {
  document.getElementById("refreshBtn").addEventListener("click", () => {
    selectedYoungPersonId = null;
    loadYoungPeople();
    document.getElementById("profilePanel").innerHTML =
      `<div class="empty-panel">Select a young person to view their profile.</div>`;
  });

  document.getElementById("youngPeopleSearch").addEventListener("input", (e) => {
    renderYoungPeopleList(filterYoungPeople(e.target.value));
  });

  document.getElementById("openAiNoteBtn").addEventListener("click", openAiModal);
  document.getElementById("closeAiNoteBtn").addEventListener("click", closeAiModal);
  document.getElementById("generateAiBtn").addEventListener("click", generateAiNote);
  document.getElementById("saveAiBtn").addEventListener("click", saveAiNote);

  document.getElementById("copyDraftBtn").addEventListener("click", () => {
    document.getElementById("aiFinalNote").value = document.getElementById("aiDraft").value;
  });

  document.getElementById("aiNoteModal").addEventListener("click", (e) => {
    if (e.target.id === "aiNoteModal") closeAiModal();
  });
}

function init() {
  bindEvents();
  loadYoungPeople();
}

document.addEventListener("DOMContentLoaded", init);
