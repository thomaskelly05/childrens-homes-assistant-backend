window.YoungPersonIncidentWorkspace = (function () {
  let ctx = null;

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {})
      }
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const data = await response.json();
        message = data?.detail || data?.error || message;
      } catch {}
      throw new Error(message);
    }

    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  function safe(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getSelectedYoungPersonId() {
    return ctx?.selectedYoungPerson?.id || null;
  }

  function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
  }

  function getFieldValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function getCheckboxValue(id) {
    return !!document.getElementById(id)?.checked;
  }

  function setCheckboxValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = !!value;
  }

  function nowLocalDateTimeString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function showSaveStatus(message, type = "") {
    const box = document.getElementById("incidentSaveStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideSaveStatus() {
    const box = document.getElementById("incidentSaveStatus");
    if (!box) return;

    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function showAiStatus(message, type = "") {
    const box = document.getElementById("incidentAiStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideAiStatus() {
    const box = document.getElementById("incidentAiStatus");
    if (!box) return;

    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function resetForm() {
    setFieldValue("incidentDateTime", nowLocalDateTimeString());
    setFieldValue("incidentType", "");
    setFieldValue("incidentLocation", "");
    setFieldValue("incidentSeverity", "");
    setFieldValue("incidentDescription", "");
    setFieldValue("incidentAntecedent", "");
    setFieldValue("incidentPresentation", "");
    setFieldValue("incidentStaffResponse", "");
    setFieldValue("incidentChildResponse", "");
    setFieldValue("incidentChildVoice", "");
    setFieldValue("incidentOutcome", "");
    setFieldValue("incidentActionsTaken", "");
    setFieldValue("incidentRestorativeFollowUp", "");

    setCheckboxValue("incidentInjuryFlag", false);
    setCheckboxValue("incidentPoliceFlag", false);
    setCheckboxValue("incidentSafeguardingFlag", false);
    setCheckboxValue("incidentFollowUpFlag", false);
    setCheckboxValue("incidentManagerReviewFlag", false);
    setCheckboxValue("incidentOfstedFlag", false);

    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
  }

  function fillDefaults() {
    const dateTimeEl = document.getElementById("incidentDateTime");
    if (dateTimeEl && !dateTimeEl.value) {
      dateTimeEl.value = nowLocalDateTimeString();
    }
  }

  function buildCombinedNarrative() {
    return [
      `Incident type:\n${getFieldValue("incidentType")}`,
      `Location:\n${getFieldValue("incidentLocation")}`,
      `Description:\n${getFieldValue("incidentDescription")}`,
      `Antecedent / trigger:\n${getFieldValue("incidentAntecedent")}`,
      `Presentation:\n${getFieldValue("incidentPresentation")}`,
      `Staff response:\n${getFieldValue("incidentStaffResponse")}`,
      `Young person response:\n${getFieldValue("incidentChildResponse")}`,
      `Young person voice:\n${getFieldValue("incidentChildVoice")}`,
      `Outcome:\n${getFieldValue("incidentOutcome")}`,
      `Actions taken / follow-up:\n${getFieldValue("incidentActionsTaken")}`,
      `Restorative follow-up:\n${getFieldValue("incidentRestorativeFollowUp")}`
    ].join("\n\n");
  }

  function buildPayload() {
    return {
      incident_datetime: getFieldValue("incidentDateTime") || null,
      incident_type: getFieldValue("incidentType"),
      location: getFieldValue("incidentLocation"),
      severity: getFieldValue("incidentSeverity") || null,
      description: getFieldValue("incidentDescription"),
      antecedent_trigger: getFieldValue("incidentAntecedent"),
      presentation: getFieldValue("incidentPresentation"),
      staff_response: getFieldValue("incidentStaffResponse"),
      young_person_response: getFieldValue("incidentChildResponse"),
      young_person_voice: getFieldValue("incidentChildVoice"),
      outcome: getFieldValue("incidentOutcome"),
      actions_taken_follow_up: getFieldValue("incidentActionsTaken"),
      restorative_follow_up: getFieldValue("incidentRestorativeFollowUp"),

      injury_flag: getCheckboxValue("incidentInjuryFlag"),
      police_flag: getCheckboxValue("incidentPoliceFlag"),
      safeguarding_flag: getCheckboxValue("incidentSafeguardingFlag"),
      follow_up_flag: getCheckboxValue("incidentFollowUpFlag"),
      manager_review_flag: getCheckboxValue("incidentManagerReviewFlag"),
      ofsted_flag: getCheckboxValue("incidentOfstedFlag"),

      combined_incident: buildCombinedNarrative(),
      shift_mode: ctx?.shiftMode || "during"
    };
  }

  async function saveIncident() {
    const youngPersonId = getSelectedYoungPersonId();
    if (!youngPersonId) {
      showSaveStatus("No young person selected.", "error");
      return;
    }

    hideSaveStatus();

    const payload = buildPayload();

    if (!payload.combined_incident.trim()) {
      showSaveStatus("Please complete the incident record before saving.", "error");
      return;
    }

    try {
      showSaveStatus("Saving incident...");

      await api(`/young-people/${youngPersonId}/incidents`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showSaveStatus("Incident saved successfully.", "success");

      if (typeof ctx?.reloadOverview === "function") {
        await ctx.reloadOverview(youngPersonId);
      }
    } catch (error) {
      console.error("Incident save failed", error);
      showSaveStatus(error.message || "Could not save incident.", "error");
    }
  }

  function clearAiResults() {
    const results = document.getElementById("incidentAiResults");
    if (results) {
      results.classList.add("hidden");
      results.innerHTML = "";
    }
  }

  function renderAiResults(result) {
    const results = document.getElementById("incidentAiResults");
    if (!results) return;

    const improvedText =
      result?.improved_text ||
      result?.improved_version ||
      result?.output_text ||
      "";

    const fieldFeedback =
      result?.field_feedback ||
      result?.field_level_feedback ||
      [];

    const missingDetails =
      result?.missing_details ||
      result?.suggested_missing_details ||
      [];

    const safeguardingNotes =
      result?.safeguarding_notes ||
      result?.safeguarding_flags ||
      [];

    const summary =
      result?.summary ||
      result?.review_summary ||
      "AI review completed.";

    results.classList.remove("hidden");
    results.innerHTML = `
      <div class="doc-ai-result-card">
        <h4>Improved version</h4>
        <textarea id="incidentAiImprovedText" class="textarea" rows="12" readonly>${safe(improvedText)}</textarea>
      </div>

      <div class="doc-ai-result-card">
        <h4>Field feedback</h4>
        <div class="doc-ai-list">
          ${
            fieldFeedback.length
              ? fieldFeedback.map(item => `
                <div class="doc-ai-item">
                  <strong>${safe(item?.title || item?.field || item?.label || "Feedback")}</strong>
                  <p>${safe(item?.text || item?.message || item?.detail || item || "")}</p>
                </div>
              `).join("")
              : `<div class="muted-line">No field feedback returned.</div>`
          }
        </div>
      </div>

      <div class="doc-ai-result-card">
        <h4>Missing details</h4>
        <div class="doc-ai-list">
          ${
            missingDetails.length
              ? missingDetails.map(item => `
                <div class="doc-ai-item">
                  <strong>${safe(item?.title || item?.field || item?.label || "Missing detail")}</strong>
                  <p>${safe(item?.text || item?.message || item?.detail || item || "")}</p>
                </div>
              `).join("")
              : `<div class="muted-line">No missing details returned.</div>`
          }
        </div>
      </div>

      <div class="doc-ai-result-card">
        <h4>Safeguarding notes</h4>
        <div class="doc-ai-list">
          ${
            safeguardingNotes.length
              ? safeguardingNotes.map(item => `
                <div class="doc-ai-item">
                  <strong>${safe(item?.title || item?.field || item?.label || "Safeguarding")}</strong>
                  <p>${safe(item?.text || item?.message || item?.detail || item || "")}</p>
                </div>
              `).join("")
              : `<div class="muted-line">No safeguarding notes returned.</div>`
          }
        </div>
      </div>

      <div class="doc-ai-result-card">
        <h4>Summary</h4>
        <div class="doc-ai-summary">${safe(summary)}</div>
      </div>
    `;
  }

  async function runAiReview() {
    const youngPersonId = getSelectedYoungPersonId();
    if (!youngPersonId) {
      showAiStatus("No young person selected.", "error");
      return;
    }

    hideAiStatus();
    clearAiResults();

    const text = buildCombinedNarrative();

    if (!text.trim()) {
      showAiStatus("Please add incident content before running AI review.", "error");
      return;
    }

    try {
      showAiStatus("Running AI review...");

      const result = await api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "incident",
          action: "full_review",
          text,
          metadata: {
            young_person_id: youngPersonId,
            incident_type: getFieldValue("incidentType"),
            severity: getFieldValue("incidentSeverity"),
            shift_mode: ctx?.shiftMode || "during"
          }
        })
      });

      renderAiResults(result);
      showAiStatus("AI review complete.", "success");
    } catch (error) {
      console.error("Incident AI review failed", error);
      showAiStatus(error.message || "AI review failed.", "error");
    }
  }

  function applyIncidentRewrite() {
    const improved = document.getElementById("incidentAiImprovedText")?.value?.trim() || "";
    if (!improved) {
      showAiStatus("No improved text available to apply.", "error");
      return;
    }

    setFieldValue("incidentDescription", improved);
    showAiStatus("Improved text applied to description.", "success");
  }

  function bindButtons() {
    document.getElementById("saveIncidentBtn")?.addEventListener("click", saveIncident);
    document.getElementById("resetIncidentBtn")?.addEventListener("click", resetForm);
    document.getElementById("reviewIncidentAiBtn")?.addEventListener("click", runAiReview);
    document.getElementById("applyIncidentRewriteBtn")?.addEventListener("click", applyIncidentRewrite);
  }

  async function bind(contextInput) {
    ctx = contextInput;
    fillDefaults();
    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
    bindButtons();
  }

  return {
    bind
  };
})();
