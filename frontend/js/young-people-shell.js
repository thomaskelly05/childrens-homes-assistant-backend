window.YoungPeopleShell = (function () {
  let youngPeople = [];
  let filteredYoungPeople = [];
  let selectedYoungPerson = null;
  let activeProfileTab = "identity";
  let activeWorkspace = "incident";
  let latestOverview = null;

  async function api(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {})
      }
    });

    if (!res.ok) {
      let detail = "Request failed";
      try {
        const data = await res.json();
        detail = data.detail || data.error || detail;
      } catch {}
      throw new Error(detail);
    }

    try {
      return await res.json();
    } catch {
      return {};
    }
  }

  function safe(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function calcAge(dob) {
    if (!dob) return "—";
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return "—";

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age -= 1;
    }

    return String(age);
  }

  function initials(person) {
    const first = (person?.preferred_name || person?.first_name || "").trim();
    const last = (person?.last_name || "").trim();
    return ((first[0] || "") + (last[0] || "")).toUpperCase() || "YP";
  }

  function fullName(person) {
    const first = person?.preferred_name || person?.first_name || "";
    const last = person?.last_name || "";
    return [first, last].filter(Boolean).join(" ").trim() || "Unnamed young person";
  }

  function riskTagClass(level) {
    const text = String(level || "").toLowerCase();
    if (["high", "significant", "severe", "critical"].includes(text)) return "danger";
    if (["medium", "moderate"].includes(text)) return "warn";
    if (["low", "stable"].includes(text)) return "good";
    return "";
  }

  function getTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function applyYoungPersonFilters() {
    const q = (document.getElementById("youngPersonSearch")?.value || "").trim().toLowerCase();
    const status = document.getElementById("youngPersonStatusFilter")?.value || "";

    let rows = [...youngPeople];

    if (q) {
      rows = rows.filter(person => {
        const text = [
          person.first_name,
          person.last_name,
          person.preferred_name
        ].join(" ").toLowerCase();
        return text.includes(q);
      });
    }

    if (status === "active") {
      rows = rows.filter(person => !person.archived);
    }

    if (status === "archived") {
      rows = rows.filter(person => !!person.archived);
    }

    filteredYoungPeople = rows;
    renderYoungPersonSelect();

    if (
      selectedYoungPerson &&
      !filteredYoungPeople.some(p => Number(p.id) === Number(selectedYoungPerson.id))
    ) {
      selectedYoungPerson = null;
      latestOverview = null;
      clearDashboard();
    }
  }

  function renderYoungPersonSelect() {
    const select = document.getElementById("youngPersonSelect");
    if (!select) return;

    const currentId = selectedYoungPerson?.id ? String(selectedYoungPerson.id) : "";
    select.innerHTML = `<option value="">Select young person</option>`;

    filteredYoungPeople.forEach(person => {
      const option = document.createElement("option");
      option.value = String(person.id);
      option.textContent = `${fullName(person)}${person.archived ? " (Archived)" : ""}`;
      select.appendChild(option);
    });

    if ([...select.options].some(opt => opt.value === currentId)) {
      select.value = currentId;
    } else {
      select.value = "";
    }
  }

  function clearDashboard() {
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");
    const overviewPanel = document.getElementById("overviewPanel");
    const profileTabContent = document.getElementById("profileTabContent");
    const assistantContextBox = document.getElementById("assistantContextBox");
    const workspaceMount = document.getElementById("workspaceMount");
    const liveRightRail = document.getElementById("liveRightRail");

    if (pageTitle) pageTitle.textContent = "Young Person OS";
    if (pageSubtitle) pageSubtitle.textContent = "Residential care dashboard, linked records, risks, plans, and oversight";

    if (overviewPanel) {
      overviewPanel.innerHTML = `<div class="empty-state">Select a young person from the dropdown to open their dashboard.</div>`;
    }

    if (profileTabContent) {
      profileTabContent.innerHTML = `<div class="empty-state compact">Profile content will appear here once a young person is selected.</div>`;
    }

    if (assistantContextBox) {
      assistantContextBox.innerHTML = "Choose a young person and this area can pass context into your main assistant chat, records, handovers, plans, and reviews.";
    }

    if (workspaceMount) {
      workspaceMount.innerHTML = `<div class="empty-state">Select a young person to load a workspace.</div>`;
    }

    if (liveRightRail) {
      liveRightRail.innerHTML = `
        <div class="snapshot-item">
          <div class="snapshot-title">Current priorities</div>
          <div class="snapshot-text">Select a young person to surface key actions, alerts, reviews, and follow-up.</div>
        </div>
      `;
    }
  }

  function renderOverview(overview) {
    const panel = document.getElementById("overviewPanel");
    if (!panel) return;

    const yp = overview?.young_person || selectedYoungPerson || {};
    const identity = overview?.identity_profile || {};
    const communication = overview?.communication_profile || {};
    const education = overview?.education_profile || {};
    const health = overview?.health_profile || {};
    const legal = overview?.legal_status || {};
    const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
    const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

    const activeAlerts = alerts.filter(a => a && a.is_active);
    const priorityAlerts = activeAlerts.slice(0, 4);

    const contactNames = contacts
      .slice(0, 3)
      .map(c => c?.full_name)
      .filter(Boolean);

    const primaryRisk = yp.summary_risk_level || "Not set";
    const educationStatus = education.education_status || "Not recorded";
    const gpName = health.gp_name || "Not recorded";
    const legalStatus = legal.legal_status || legal.order_type || "Not recorded";
    const keyworkerName = yp.primary_keyworker_name || "Not allocated";

    panel.innerHTML = `
      <div class="overview-shell">
        <div class="overview-header">
          <div class="overview-header-main">
            <div class="overview-photo">
              ${yp.photo_url ? `<img src="${safe(yp.photo_url)}" alt="${safe(fullName(yp))}">` : safe(initials(yp))}
            </div>

            <div class="overview-identity">
              <div class="overview-title-row">
                <h3>${safe(fullName(yp))}</h3>
                <div class="tag-row">
                  <span class="tag ${riskTagClass(yp.summary_risk_level)}">${safe(primaryRisk)}</span>
                  <span class="tag ${yp.archived ? "warn" : "good"}">${yp.archived ? "archived" : "active"}</span>
                  <span class="tag">${safe(yp.placement_status || "placement not set")}</span>
                </div>
              </div>

              <div class="overview-subtext">
                Preferred name: <strong>${safe(yp.preferred_name || yp.first_name || "—")}</strong> ·
                DOB: <strong>${safe(yp.date_of_birth || "—")}</strong> ·
                Age: <strong>${safe(calcAge(yp.date_of_birth))}</strong>
              </div>

              <div class="overview-subtext">
                Home ID: <strong>${safe(yp.home_id || "—")}</strong> ·
                Admission: <strong>${safe(yp.admission_date || "—")}</strong> ·
                Discharge: <strong>${safe(yp.discharge_date || "—")}</strong>
              </div>

              <div class="overview-chip-grid">
                <div class="mini-stat-chip">
                  <span class="mini-stat-label">Keyworker</span>
                  <span class="mini-stat-value">${safe(keyworkerName)}</span>
                </div>
                <div class="mini-stat-chip">
                  <span class="mini-stat-label">Legal status</span>
                  <span class="mini-stat-value">${safe(legalStatus)}</span>
                </div>
                <div class="mini-stat-chip">
                  <span class="mini-stat-label">Education</span>
                  <span class="mini-stat-value">${safe(educationStatus)}</span>
                </div>
                <div class="mini-stat-chip">
                  <span class="mini-stat-label">GP</span>
                  <span class="mini-stat-value">${safe(gpName)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="overview-alerts">
            <div class="overview-side-card">
              <div class="overview-side-title">Active alerts</div>
              ${
                priorityAlerts.length
                  ? priorityAlerts.map(alert => `
                      <div class="alert-line">
                        <div class="alert-line-title">${safe(alert.title || "Alert")}</div>
                        <div class="alert-line-meta">
                          <span class="tag ${riskTagClass(alert.severity)}">${safe(alert.severity || "alert")}</span>
                          <span>${safe(alert.alert_type || "general")}</span>
                        </div>
                      </div>
                    `).join("")
                  : `<div class="muted-line">No active alerts recorded.</div>`
              }
            </div>
          </div>
        </div>

        <div class="overview-stat-grid">
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(activeAlerts.length))}</div>
            <div class="overview-stat-label">Active alerts</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(contacts.length))}</div>
            <div class="overview-stat-label">Contacts</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.daily_note_count ?? 0))}</div>
            <div class="overview-stat-label">Daily notes</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.incident_count ?? 0))}</div>
            <div class="overview-stat-label">Incidents</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.active_risk_count ?? 0))}</div>
            <div class="overview-stat-label">Active risks</div>
          </div>
          <div class="overview-stat-card">
            <div class="overview-stat-number">${safe(String(overview?.active_support_plan_count ?? 0))}</div>
            <div class="overview-stat-label">Active plans</div>
          </div>
        </div>

        <div class="overview-info-grid">
          <div class="card">
            <h3>Placement and identity</h3>
            <div class="kv"><div class="k">Gender</div><div class="v">${safe(yp.gender || "—")}</div></div>
            <div class="kv"><div class="k">Ethnicity</div><div class="v">${safe(yp.ethnicity || "—")}</div></div>
            <div class="kv"><div class="k">Local ID</div><div class="v">${safe(yp.local_id_number || "—")}</div></div>
            <div class="kv"><div class="k">Faith / religion</div><div class="v">${safe(identity.religion_or_faith || "—")}</div></div>
            <div class="kv"><div class="k">Cultural identity</div><div class="v">${safe(identity.cultural_identity || "—")}</div></div>
            <div class="kv"><div class="k">First language</div><div class="v">${safe(identity.first_language || "—")}</div></div>
            <div class="kv"><div class="k">What matters</div><div class="v">${safe(identity.what_matters_to_me || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Communication and regulation</h3>
            <div class="kv"><div class="k">Communication style</div><div class="v">${safe(communication.communication_style || "—")}</div></div>
            <div class="kv"><div class="k">Sensory profile</div><div class="v">${safe(communication.sensory_profile || "—")}</div></div>
            <div class="kv"><div class="k">Processing needs</div><div class="v">${safe(communication.processing_needs || "—")}</div></div>
            <div class="kv"><div class="k">Signs of distress</div><div class="v">${safe(communication.signs_of_distress || "—")}</div></div>
            <div class="kv"><div class="k">What helps</div><div class="v">${safe(communication.what_helps || "—")}</div></div>
            <div class="kv"><div class="k">What to avoid</div><div class="v">${safe(communication.what_to_avoid || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Health and education</h3>
            <div class="kv"><div class="k">School / provision</div><div class="v">${safe(education.school_name || "—")}</div></div>
            <div class="kv"><div class="k">Education status</div><div class="v">${safe(education.education_status || "—")}</div></div>
            <div class="kv"><div class="k">SEN status</div><div class="v">${safe(education.sen_status || "—")}</div></div>
            <div class="kv"><div class="k">GP</div><div class="v">${safe(health.gp_name || "—")}</div></div>
            <div class="kv"><div class="k">Allergies</div><div class="v">${safe(health.allergies || "—")}</div></div>
            <div class="kv"><div class="k">Diagnoses</div><div class="v">${safe(health.diagnoses || "—")}</div></div>
            <div class="kv"><div class="k">Mental health</div><div class="v">${safe(health.mental_health_summary || "—")}</div></div>
          </div>

          <div class="card">
            <h3>Key network and oversight</h3>
            <div class="kv"><div class="k">Legal status</div><div class="v">${safe(legal.legal_status || "—")}</div></div>
            <div class="kv"><div class="k">Order type</div><div class="v">${safe(legal.order_type || "—")}</div></div>
            <div class="kv"><div class="k">Consent</div><div class="v">${safe(legal.consent_arrangements || "—")}</div></div>
            <div class="kv"><div class="k">Restrictions</div><div class="v">${safe(legal.restrictions_text || "—")}</div></div>
            <div class="kv"><div class="k">Top contacts</div><div class="v">${safe(contactNames.join(", ") || "—")}</div></div>
            <div class="kv"><div class="k">Important dates</div><div class="v">${safe(identity.important_dates || "—")}</div></div>
          </div>
        </div>
      </div>
    `;
  }

  function showProfileSaveStatus(message, type = "") {
    const el = document.getElementById("profileSaveStatus");
    if (!el) return;
    el.classList.remove("hidden", "error", "success");
    el.textContent = message || "";
    if (type) el.classList.add(type);
  }

  function clearProfileSaveStatus() {
    const el = document.getElementById("profileSaveStatus");
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    el.textContent = "";
  }

  function bindProfileSave(saveFn) {
    const cancelBtn = document.getElementById("cancelProfileEditBtn");
    const saveBtn = document.getElementById("saveProfileEditBtn");

    cancelBtn?.addEventListener("click", () => {
      if (latestOverview) {
        clearProfileSaveStatus();
        renderProfileTab(latestOverview);
      }
    });

    saveBtn?.addEventListener("click", async () => {
      clearProfileSaveStatus();
      showProfileSaveStatus("Saving profile changes...");

      try {
        await saveFn();
        showProfileSaveStatus("Changes saved successfully.", "success");
        if (selectedYoungPerson?.id) {
          await loadYoungPersonOverview(selectedYoungPerson.id);
        }
      } catch (error) {
        console.error("Profile save failed", error);
        showProfileSaveStatus(error.message || "Could not save changes.", "error");
      }
    });
  }

  function renderProfileTab(overview) {
    const host = document.getElementById("profileTabContent");
    if (!host) return;

    const identity = overview?.identity_profile || {};
    const communication = overview?.communication_profile || {};
    const education = overview?.education_profile || {};
    const health = overview?.health_profile || {};
    const contacts = Array.isArray(overview?.contacts) ? overview.contacts : [];
    const alerts = Array.isArray(overview?.alerts) ? overview.alerts : [];

    const saveBar = `
      <div class="record-action-bar" style="margin-top:16px;">
        <button class="secondary-btn" type="button" id="cancelProfileEditBtn">Cancel</button>
        <button class="primary-btn" type="button" id="saveProfileEditBtn">Save changes</button>
      </div>
      <div id="profileSaveStatus" class="doc-ai-status hidden" style="margin-top:10px;"></div>
    `;

    if (activeProfileTab === "identity") {
      host.innerHTML = `
        <div class="card">
          <h3>Edit identity profile</h3>

          <div class="form-block">
            <label for="identityReligion">Religion / faith</label>
            <input id="identityReligion" class="field" type="text" value="${safe(identity.religion_or_faith || "")}">
            <div class="help-text">Record religion, faith, or spiritual identity if relevant to care and support.</div>
          </div>

          <div class="form-block">
            <label for="identityCulture">Cultural identity</label>
            <input id="identityCulture" class="field" type="text" value="${safe(identity.cultural_identity || "")}">
            <div class="help-text">Record cultural identity, heritage, or important background information.</div>
          </div>

          <div class="form-block">
            <label for="identityLanguage">First language</label>
            <input id="identityLanguage" class="field" type="text" value="${safe(identity.first_language || "")}">
            <div class="help-text">Record the young person’s first or preferred language.</div>
          </div>

          <div class="form-block">
            <label for="identityDietary">Dietary needs</label>
            <textarea id="identityDietary" class="textarea">${safe(identity.dietary_needs || "")}</textarea>
            <div class="help-text">Record allergies, cultural food needs, preferences, and dietary support required.</div>
          </div>

          <div class="form-block">
            <label for="identityInterests">Interests</label>
            <textarea id="identityInterests" class="textarea">${safe(identity.interests || "")}</textarea>
            <div class="help-text">Record hobbies, interests, preferred activities, and important motivators.</div>
          </div>

          <div class="form-block">
            <label for="identityStrengths">Strengths summary</label>
            <textarea id="identityStrengths" class="textarea">${safe(identity.strengths_summary || "")}</textarea>
            <div class="help-text">Record strengths, talents, resilience, and positive qualities.</div>
          </div>

          <div class="form-block">
            <label for="identityMatters">What matters to me</label>
            <textarea id="identityMatters" class="textarea">${safe(identity.what_matters_to_me || "")}</textarea>
            <div class="help-text">Record what is important to the young person in their own terms where possible.</div>
          </div>

          <div class="form-block">
            <label for="identityDates">Important dates</label>
            <textarea id="identityDates" class="textarea">${safe(identity.important_dates || "")}</textarea>
            <div class="help-text">Record birthdays, anniversaries, key family dates, and other meaningful events.</div>
          </div>

          ${saveBar}
        </div>
      `;

      bindProfileSave(async () => {
        return api(`/young-people/${selectedYoungPerson.id}/identity-profile`, {
          method: "POST",
          body: JSON.stringify({
            religion_or_faith: document.getElementById("identityReligion")?.value || "",
            cultural_identity: document.getElementById("identityCulture")?.value || "",
            first_language: document.getElementById("identityLanguage")?.value || "",
            dietary_needs: document.getElementById("identityDietary")?.value || "",
            interests: document.getElementById("identityInterests")?.value || "",
            strengths_summary: document.getElementById("identityStrengths")?.value || "",
            what_matters_to_me: document.getElementById("identityMatters")?.value || "",
            important_dates: document.getElementById("identityDates")?.value || ""
          })
        });
      });

      return;
    }

    if (activeProfileTab === "communication") {
      host.innerHTML = `
        <div class="card">
          <h3>Edit communication profile</h3>

          <div class="form-block">
            <label for="commNeuro">Neurodiversity summary</label>
            <textarea id="commNeuro" class="textarea">${safe(communication.neurodiversity_summary || "")}</textarea>
            <div class="help-text">Record key information about neurodiversity, understanding, and support needs.</div>
          </div>

          <div class="form-block">
            <label for="commStyle">Communication style</label>
            <textarea id="commStyle" class="textarea">${safe(communication.communication_style || "")}</textarea>
            <div class="help-text">Record how the young person prefers to communicate and how adults should respond.</div>
          </div>

          <div class="form-block">
            <label for="commSensory">Sensory profile</label>
            <textarea id="commSensory" class="textarea">${safe(communication.sensory_profile || "")}</textarea>
            <div class="help-text">Record sensory sensitivities, regulation needs, and environmental considerations.</div>
          </div>

          <div class="form-block">
            <label for="commProcessing">Processing needs</label>
            <textarea id="commProcessing" class="textarea">${safe(communication.processing_needs || "")}</textarea>
            <div class="help-text">Record processing time, instructions support, and communication pacing needs.</div>
          </div>

          <div class="form-block">
            <label for="commDistress">Signs of distress</label>
            <textarea id="commDistress" class="textarea">${safe(communication.signs_of_distress || "")}</textarea>
            <div class="help-text">Record early signs of dysregulation or overwhelm adults should notice.</div>
          </div>

          <div class="form-block">
            <label for="commHelps">What helps</label>
            <textarea id="commHelps" class="textarea">${safe(communication.what_helps || "")}</textarea>
            <div class="help-text">Record the strategies, responses, and communication approaches that help.</div>
          </div>

          <div class="form-block">
            <label for="commAvoid">What to avoid</label>
            <textarea id="commAvoid" class="textarea">${safe(communication.what_to_avoid || "")}</textarea>
            <div class="help-text">Record responses, language, or situations adults should avoid where possible.</div>
          </div>

          <div class="form-block">
            <label for="commRoutine">Routines and predictability</label>
            <textarea id="commRoutine" class="textarea">${safe(communication.routines_and_predictability || "")}</textarea>
            <div class="help-text">Record the importance of structure, routine, warning, and predictability.</div>
          </div>

          <div class="form-block">
            <label for="commVisual">Visual support needs</label>
            <textarea id="commVisual" class="textarea">${safe(communication.visual_support_needs || "")}</textarea>
            <div class="help-text">Record visual schedules, cues, prompts, or communication tools used.</div>
          </div>

          ${saveBar}
        </div>
      `;

      bindProfileSave(async () => {
        return api(`/young-people/${selectedYoungPerson.id}/communication-profile`, {
          method: "POST",
          body: JSON.stringify({
            neurodiversity_summary: document.getElementById("commNeuro")?.value || "",
            communication_style: document.getElementById("commStyle")?.value || "",
            sensory_profile: document.getElementById("commSensory")?.value || "",
            processing_needs: document.getElementById("commProcessing")?.value || "",
            signs_of_distress: document.getElementById("commDistress")?.value || "",
            what_helps: document.getElementById("commHelps")?.value || "",
            what_to_avoid: document.getElementById("commAvoid")?.value || "",
            routines_and_predictability: document.getElementById("commRoutine")?.value || "",
            visual_support_needs: document.getElementById("commVisual")?.value || ""
          })
        });
      });

      return;
    }

    if (activeProfileTab === "education") {
      host.innerHTML = `
        <div class="card">
          <h3>Edit education profile</h3>

          <div class="form-block">
            <label for="eduSchool">School name</label>
            <input id="eduSchool" class="field" type="text" value="${safe(education.school_name || "")}">
          </div>

          <div class="form-row-2">
            <div class="form-block">
              <label for="eduYear">Year group</label>
              <input id="eduYear" class="field" type="text" value="${safe(education.year_group || "")}">
            </div>

            <div class="form-block">
              <label for="eduStatus">Education status</label>
              <input id="eduStatus" class="field" type="text" value="${safe(education.education_status || "")}">
            </div>
          </div>

          <div class="form-block">
            <label for="eduSen">SEN status</label>
            <input id="eduSen" class="field" type="text" value="${safe(education.sen_status || "")}">
          </div>

          <div class="form-block">
            <label for="eduEhcp">EHCP details</label>
            <textarea id="eduEhcp" class="textarea">${safe(education.ehcp_details || "")}</textarea>
          </div>

          <div class="form-block">
            <label for="eduTeacher">Designated teacher</label>
            <input id="eduTeacher" class="field" type="text" value="${safe(education.designated_teacher || "")}">
          </div>

          <div class="form-block">
            <label for="eduAttendance">Attendance baseline</label>
            <input id="eduAttendance" class="field" type="number" step="0.01" value="${safe(education.attendance_baseline || "")}">
          </div>

          <div class="form-block">
            <label for="eduPep">PEP status</label>
            <input id="eduPep" class="field" type="text" value="${safe(education.pep_status || "")}">
          </div>

          <div class="form-block">
            <label for="eduSupport">Support summary</label>
            <textarea id="eduSupport" class="textarea">${safe(education.support_summary || "")}</textarea>
          </div>

          ${saveBar}
        </div>
      `;

      bindProfileSave(async () => {
        const attendanceValue = document.getElementById("eduAttendance")?.value || "";
        return api(`/young-people/${selectedYoungPerson.id}/education-profile`, {
          method: "POST",
          body: JSON.stringify({
            school_name: document.getElementById("eduSchool")?.value || "",
            year_group: document.getElementById("eduYear")?.value || "",
            education_status: document.getElementById("eduStatus")?.value || "",
            sen_status: document.getElementById("eduSen")?.value || "",
            ehcp_details: document.getElementById("eduEhcp")?.value || "",
            designated_teacher: document.getElementById("eduTeacher")?.value || "",
            attendance_baseline: attendanceValue ? Number(attendanceValue) : null,
            pep_status: document.getElementById("eduPep")?.value || "",
            support_summary: document.getElementById("eduSupport")?.value || ""
          })
        });
      });

      return;
    }

    if (activeProfileTab === "health") {
      host.innerHTML = `
        <div class="card">
          <h3>Edit health profile</h3>

          <div class="form-row-2">
            <div class="form-block">
              <label for="healthGpName">GP name</label>
              <input id="healthGpName" class="field" type="text" value="${safe(health.gp_name || "")}">
            </div>

            <div class="form-block">
              <label for="healthGpContact">GP contact</label>
              <input id="healthGpContact" class="field" type="text" value="${safe(health.gp_contact || "")}">
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-block">
              <label for="healthDentistName">Dentist name</label>
              <input id="healthDentistName" class="field" type="text" value="${safe(health.dentist_name || "")}">
            </div>

            <div class="form-block">
              <label for="healthDentistContact">Dentist contact</label>
              <input id="healthDentistContact" class="field" type="text" value="${safe(health.dentist_contact || "")}">
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-block">
              <label for="healthOpticianName">Optician name</label>
              <input id="healthOpticianName" class="field" type="text" value="${safe(health.optician_name || "")}">
            </div>

            <div class="form-block">
              <label for="healthOpticianContact">Optician contact</label>
              <input id="healthOpticianContact" class="field" type="text" value="${safe(health.optician_contact || "")}">
            </div>
          </div>

          <div class="form-block">
            <label for="healthAllergies">Allergies</label>
            <textarea id="healthAllergies" class="textarea">${safe(health.allergies || "")}</textarea>
          </div>

          <div class="form-block">
            <label for="healthDiagnoses">Diagnoses</label>
            <textarea id="healthDiagnoses" class="textarea">${safe(health.diagnoses || "")}</textarea>
          </div>

          <div class="form-block">
            <label for="healthMental">Mental health summary</label>
            <textarea id="healthMental" class="textarea">${safe(health.mental_health_summary || "")}</textarea>
          </div>

          <div class="form-block">
            <label for="healthMedication">Medication summary</label>
            <textarea id="healthMedication" class="textarea">${safe(health.medication_summary || "")}</textarea>
          </div>

          <div class="form-block">
            <label for="healthConsent">Consent notes</label>
            <textarea id="healthConsent" class="textarea">${safe(health.consent_notes || "")}</textarea>
          </div>

          ${saveBar}
        </div>
      `;

      bindProfileSave(async () => {
        return api(`/young-people/${selectedYoungPerson.id}/health-profile`, {
          method: "POST",
          body: JSON.stringify({
            gp_name: document.getElementById("healthGpName")?.value || "",
            gp_contact: document.getElementById("healthGpContact")?.value || "",
            dentist_name: document.getElementById("healthDentistName")?.value || "",
            dentist_contact: document.getElementById("healthDentistContact")?.value || "",
            optician_name: document.getElementById("healthOpticianName")?.value || "",
            optician_contact: document.getElementById("healthOpticianContact")?.value || "",
            allergies: document.getElementById("healthAllergies")?.value || "",
            diagnoses: document.getElementById("healthDiagnoses")?.value || "",
            mental_health_summary: document.getElementById("healthMental")?.value || "",
            medication_summary: document.getElementById("healthMedication")?.value || "",
            consent_notes: document.getElementById("healthConsent")?.value || ""
          })
        });
      });

      return;
    }

    if (activeProfileTab === "contacts") {
      host.innerHTML = `
        <div class="card">
          <h3>Add contact</h3>

          <div class="form-block">
            <label for="contactFullName">Full name</label>
            <input id="contactFullName" class="field" type="text">
          </div>

          <div class="form-row-2">
            <div class="form-block">
              <label for="contactType">Contact type</label>
              <input id="contactType" class="field" type="text" placeholder="e.g. parent, family member, professional">
            </div>

            <div class="form-block">
              <label for="contactRelationship">Relationship</label>
              <input id="contactRelationship" class="field" type="text">
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-block">
              <label for="contactPhone">Phone</label>
              <input id="contactPhone" class="field" type="text">
            </div>

            <div class="form-block">
              <label for="contactEmail">Email</label>
              <input id="contactEmail" class="field" type="email">
            </div>
          </div>

          <div class="form-block">
            <label for="contactAddress">Address</label>
            <textarea id="contactAddress" class="textarea"></textarea>
          </div>

          <div class="form-block">
            <label for="contactSupervision">Supervision level</label>
            <input id="contactSupervision" class="field" type="text">
          </div>

          <div class="form-block">
            <label for="contactNotes">Notes</label>
            <textarea id="contactNotes" class="textarea"></textarea>
          </div>

          <div class="checkbox-grid">
            <label class="check-item"><input id="contactPR" type="checkbox"><span>Parental responsibility</span></label>
            <label class="check-item"><input id="contactApproved" type="checkbox"><span>Approved contact</span></label>
            <label class="check-item"><input id="contactRestricted" type="checkbox"><span>Restricted contact</span></label>
          </div>

          ${saveBar}
        </div>

        <div class="card" style="margin-top:16px;">
          <h3>Existing contacts</h3>
          ${
            contacts.length
              ? contacts.map(contact => `
                <div class="mini-item" style="margin-bottom:10px;">
                  <strong>${safe(contact.full_name || "Unnamed contact")}</strong>
                  <p>
                    ${safe(contact.relationship_to_young_person || "Relationship not set")} · ${safe(contact.contact_type || "contact")}<br>
                    Phone: ${safe(contact.phone || "—")} · Email: ${safe(contact.email || "—")}<br>
                    Supervision: ${safe(contact.supervision_level || "—")}
                  </p>
                </div>
              `).join("")
              : `<div class="empty-state compact">No contacts recorded yet.</div>`
          }
        </div>
      `;

      bindProfileSave(async () => {
        const fullNameValue = document.getElementById("contactFullName")?.value || "";
        if (!fullNameValue.trim()) throw new Error("Full name is required.");

        return api(`/young-people/${selectedYoungPerson.id}/contacts`, {
          method: "POST",
          body: JSON.stringify({
            full_name: fullNameValue,
            contact_type: document.getElementById("contactType")?.value || "",
            relationship_to_young_person: document.getElementById("contactRelationship")?.value || "",
            phone: document.getElementById("contactPhone")?.value || "",
            email: document.getElementById("contactEmail")?.value || "",
            address: document.getElementById("contactAddress")?.value || "",
            supervision_level: document.getElementById("contactSupervision")?.value || "",
            notes: document.getElementById("contactNotes")?.value || "",
            is_parental_responsibility_holder: !!document.getElementById("contactPR")?.checked,
            is_approved_contact: !!document.getElementById("contactApproved")?.checked,
            is_restricted_contact: !!document.getElementById("contactRestricted")?.checked
          })
        });
      });

      return;
    }

    if (activeProfileTab === "alerts") {
      host.innerHTML = `
        <div class="card">
          <h3>Add alert</h3>

          <div class="form-row-2">
            <div class="form-block">
              <label for="alertType">Alert type</label>
              <input id="alertType" class="field" type="text" placeholder="e.g. health, missing, behaviour, contact">
            </div>

            <div class="form-block">
              <label for="alertSeverity">Severity</label>
              <select id="alertSeverity" class="select">
                <option value="">Select severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div class="form-block">
            <label for="alertTitle">Title</label>
            <input id="alertTitle" class="field" type="text">
          </div>

          <div class="form-block">
            <label for="alertDescription">Description</label>
            <textarea id="alertDescription" class="textarea"></textarea>
          </div>

          <div class="form-block">
            <label for="alertReviewDate">Review date</label>
            <input id="alertReviewDate" class="field" type="date" value="${getTodayString()}">
          </div>

          <div class="checkbox-grid">
            <label class="check-item"><input id="alertActive" type="checkbox" checked><span>Active</span></label>
            <label class="check-item"><input id="alertGlobal" type="checkbox"><span>Show globally</span></label>
          </div>

          ${saveBar}
        </div>

        <div class="card" style="margin-top:16px;">
          <h3>Existing alerts</h3>
          ${
            alerts.length
              ? alerts.map(alert => `
                <div class="mini-item" style="margin-bottom:10px;">
                  <strong>${safe(alert.title || "Alert")}</strong>
                  <p>
                    ${safe(alert.alert_type || "alert")} · ${safe(alert.severity || "severity not set")}<br>
                    ${safe(alert.description || "No description")}<br>
                    Review date: ${safe(alert.review_date || "—")} · ${alert.is_active ? "active" : "inactive"}
                  </p>
                </div>
              `).join("")
              : `<div class="empty-state compact">No alerts recorded yet.</div>`
          }
        </div>
      `;

      bindProfileSave(async () => {
        const titleValue = document.getElementById("alertTitle")?.value || "";
        if (!titleValue.trim()) throw new Error("Alert title is required.");

        return api(`/young-people/${selectedYoungPerson.id}/alerts`, {
          method: "POST",
          body: JSON.stringify({
            alert_type: document.getElementById("alertType")?.value || "",
            severity: document.getElementById("alertSeverity")?.value || "",
            title: titleValue,
            description: document.getElementById("alertDescription")?.value || "",
            review_date: document.getElementById("alertReviewDate")?.value || null,
            is_active: !!document.getElementById("alertActive")?.checked,
            show_globally: !!document.getElementById("alertGlobal")?.checked
          })
        });
      });
    }
  }

  function renderAssistantContext(overview) {
    const yp = overview?.young_person || selectedYoungPerson || {};
    const communication = overview?.communication_profile || {};
    const education = overview?.education_profile || {};
    const health = overview?.health_profile || {};
    const box = document.getElementById("assistantContextBox");
    if (!box) return;

    box.innerHTML = `
      <strong style="display:block;margin-bottom:8px;color:var(--text);">Assistant context for ${safe(fullName(yp))}</strong>
      Preferred name: ${safe(yp.preferred_name || yp.first_name || "—")}<br>
      Placement status: ${safe(yp.placement_status || "—")}<br>
      Risk level: ${safe(yp.summary_risk_level || "—")}<br>
      Communication: ${safe(communication.communication_style || "—")}<br>
      What helps: ${safe(communication.what_helps || "—")}<br>
      Education: ${safe(education.education_status || "—")}<br>
      Health / mental health: ${safe(health.mental_health_summary || "—")}
    `;
  }

  function renderRightRail(overview) {
    const host = document.getElementById("liveRightRail");
    if (!host) return;

    const yp = overview?.young_person || {};
    const alerts = Array.isArray(overview?.alerts) ? overview.alerts.filter(a => a?.is_active) : [];
    const legal = overview?.legal_status || {};

    host.innerHTML = `
      <div class="snapshot-item">
        <div class="snapshot-title">Current priorities</div>
        <div class="snapshot-text">
          ${safe(fullName(yp))} is currently marked as <strong>${safe(yp.placement_status || "not set")}</strong> with a risk level of <strong>${safe(yp.summary_risk_level || "not set")}</strong>.
        </div>
      </div>

      <div class="snapshot-item">
        <div class="snapshot-title">Active alerts</div>
        <div class="snapshot-text">
          ${alerts.length ? safe(alerts.map(a => a.title).slice(0, 3).join(", ")) : "No active alerts recorded."}
        </div>
      </div>

      <div class="snapshot-item">
        <div class="snapshot-title">Legal and consent</div>
        <div class="snapshot-text">
          Legal status: ${safe(legal.legal_status || legal.order_type || "Not recorded")}<br>
          Consent: ${safe(legal.consent_arrangements || "Not recorded")}
        </div>
      </div>

      <div class="snapshot-item">
        <div class="snapshot-title">What to do next</div>
        <div class="snapshot-text">
          Use the operational workspace to add or review incidents, daily notes, health, education, family, keywork, risks, and chronology-linked activity.
        </div>
      </div>
    `;
  }

  async function loadYoungPeople() {
    const data = await api("/young-people");
    youngPeople = Array.isArray(data?.young_people) ? data.young_people : [];
    applyYoungPersonFilters();

    if (!selectedYoungPerson && filteredYoungPeople.length) {
      selectedYoungPerson = filteredYoungPeople[0];
      renderYoungPersonSelect();
      await loadYoungPersonOverview(selectedYoungPerson.id);
    }
  }

  async function loadYoungPersonOverview(id) {
    const data = await api(`/young-people/${id}/overview`);
    const overview = data?.overview || {};

    latestOverview = overview;
    selectedYoungPerson = overview?.young_person || selectedYoungPerson;
    renderYoungPersonSelect();

    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");

    if (pageTitle) pageTitle.textContent = fullName(selectedYoungPerson);
    if (pageSubtitle) {
      pageSubtitle.textContent =
        `Placement: ${selectedYoungPerson?.placement_status || "—"} · Risk: ${selectedYoungPerson?.summary_risk_level || "—"}`;
    }

    renderOverview(overview);
    renderProfileTab(overview);
    renderAssistantContext(overview);
    renderRightRail(overview);
    await loadWorkspace(activeWorkspace);
  }

  async function loadWorkspace(workspaceName) {
    activeWorkspace = workspaceName;

    const mount = document.getElementById("workspaceMount");
    if (!mount) return;

    if (!selectedYoungPerson && workspaceName !== "timeline") {
      mount.innerHTML = `<div class="empty-state">Select a young person to load a workspace.</div>`;
      return;
    }

    if (workspaceName === "timeline") {
      const html = await fetch("/components/yp-timeline-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonTimelineWorkspace) {
        await loadScript("/js/workspaces/yp-timeline-workspace.js");
      }

      window.YoungPersonTimelineWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "incident") {
      const html = await fetch("/components/yp-incident-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonIncidentWorkspace) {
        await loadScript("/js/workspaces/yp-incident-workspace.js");
      }

      window.YoungPersonIncidentWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "daily-note") {
      const html = await fetch("/components/yp-daily-note-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonDailyNoteWorkspace) {
        await loadScript("/js/workspaces/yp-daily-note-workspace.js");
      }

      window.YoungPersonDailyNoteWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "health") {
      const html = await fetch("/components/yp-health-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonHealthWorkspace) {
        await loadScript("/js/workspaces/yp-health-workspace.js");
      }

      window.YoungPersonHealthWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "education") {
      const html = await fetch("/components/yp-education-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonEducationWorkspace) {
        await loadScript("/js/workspaces/yp-education-workspace.js");
      }

      window.YoungPersonEducationWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "family") {
      const html = await fetch("/components/yp-family-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonFamilyWorkspace) {
        await loadScript("/js/workspaces/yp-family-workspace.js");
      }

      window.YoungPersonFamilyWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "risk") {
      const html = await fetch("/components/yp-risk-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonRiskWorkspace) {
        await loadScript("/js/workspaces/yp-risk-workspace.js");
      }

      window.YoungPersonRiskWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    if (workspaceName === "keywork") {
      const html = await fetch("/components/yp-keywork-workspace.html", {
        credentials: "include"
      }).then(r => r.text());

      mount.innerHTML = html;

      if (!window.YoungPersonKeyworkWorkspace) {
        await loadScript("/js/workspaces/yp-keywork-workspace.js");
      }

      window.YoungPersonKeyworkWorkspace.bind({
        selectedYoungPerson,
        overview: latestOverview,
        reloadOverview: loadYoungPersonOverview
      });

      return;
    }

    mount.innerHTML = `
      <div class="empty-state">
        The <strong>${safe(workspaceName)}</strong> workspace has not been built yet.
      </div>
    `;
  }

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Could not load script: ${src}`));
      document.body.appendChild(script);
    });
  }

  function bindProfileTabs() {
    document.querySelectorAll("[data-profile-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-profile-tab]").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        activeProfileTab = btn.getAttribute("data-profile-tab");
        if (latestOverview) {
          renderProfileTab(latestOverview);
        }
      });
    });
  }

  function bindWorkspaceTabs() {
    document.querySelectorAll("[data-workspace]").forEach(btn => {
      btn.addEventListener("click", async () => {
        document.querySelectorAll("[data-workspace]").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        await loadWorkspace(btn.getAttribute("data-workspace"));
      });
    });
  }

  function bindTopbar() {
    document.getElementById("refreshYoungPeopleBtn")?.addEventListener("click", loadYoungPeople);

    document.getElementById("youngPersonSearch")?.addEventListener("input", () => {
      applyYoungPersonFilters();
    });

    document.getElementById("youngPersonStatusFilter")?.addEventListener("change", () => {
      applyYoungPersonFilters();
    });

    document.getElementById("youngPersonSelect")?.addEventListener("change", async e => {
      const id = Number(e.target.value || 0);
      if (!id) {
        selectedYoungPerson = null;
        latestOverview = null;
        clearDashboard();
        return;
      }

      const person = filteredYoungPeople.find(p => Number(p.id) === id) || youngPeople.find(p => Number(p.id) === id);
      if (!person) return;

      selectedYoungPerson = person;
      await loadYoungPersonOverview(id);
    });

    document.getElementById("newYoungPersonBtn")?.addEventListener("click", () => {
      alert("Next step: connect this button to a create young person modal.");
    });

    document.getElementById("openAssistantBtn")?.addEventListener("click", () => {
      if (!selectedYoungPerson) {
        alert("Select a young person first.");
        return;
      }

      const prompt = [
        `Young person: ${fullName(selectedYoungPerson)}`,
        `Preferred name: ${selectedYoungPerson.preferred_name || selectedYoungPerson.first_name || ""}`,
        `Placement status: ${selectedYoungPerson.placement_status || ""}`,
        `Risk level: ${selectedYoungPerson.summary_risk_level || ""}`,
        "",
        "Open the assistant and use this young person as the current working context."
      ].join("\n");

      navigator.clipboard.writeText(prompt).then(() => {
        alert("Young person context copied. Next step: pass this into the main assistant automatically.");
      });
    });

    document.querySelectorAll("[data-assistant-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!selectedYoungPerson) {
          alert("Select a young person first.");
          return;
        }

        alert(`Next step: link "${btn.getAttribute("data-assistant-action")}" into the main assistant flow.`);
      });
    });
  }

  async function init() {
    bindProfileTabs();
    bindWorkspaceTabs();
    bindTopbar();
    clearDashboard();
    await loadYoungPeople();
  }

  return {
    init,
    api,
    safe,
    fullName
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  window.YoungPeopleShell.init();
});
