window.YoungPersonIncidentWorkspace = (function () {
  let currentContext = null;
  let latestReview = null;

  function safe(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showSaveStatus(message, type = "") {
    const el = document.getElementById("incidentSaveStatus");
    if (!el) return;
    el.classList.remove("hidden", "error", "success");
    el.textContent = message || "";
    if (type) el.classList.add(type);
  }

  function clearSaveStatus() {
    const el = document.getElementById("incidentSaveStatus");
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    el.textContent = "";
  }

  function showAiStatus(message, type = "") {
    const el = document.getElementById("incidentAiStatus");
    if (!el) return;
    el.classList.remove("hidden", "error", "success");
    el.textContent = message || "";
    if (type) el.classList.add(type);
  }

  function clearAiStatus() {
    const el = document.getElementById("incidentAiStatus");
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    el.textContent = "";
  }

  function getNowLocalDateTimeValue() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function getPayload() {
    return {
      young_person_id: currentContext?.selectedYoungPerson?.id || null,
      incident_datetime: document.getElementById("incidentDateTime")?.value || null,
      incident_type: document.getElementById("incidentType")?.value || "",
      location: document.getElementById("incidentLocation")?.value || "",
      severity: document.getElementById("incidentSeverity")?.value || "",
      description: document.getElementById("incidentDescription")?.value || "",
      antecedent: document.getElementById("incidentAntecedent")?.value || "",
      presentation: document.getElementById("incidentPresentation")?.value || "",
      staff_response: document.getElementById("incidentStaffResponse")?.value || "",
      child_response: document.getElementById("incidentChildResponse")?.value || "",
      child_voice: document.getElementById("incidentChildVoice")?.value || "",
      outcome: document.getElementById("incidentOutcome")?.value || "",
      actions_taken: document.getElementById("incidentActionsTaken")?.value || "",
      restorative_follow_up: document.getElementById("incidentRestorativeFollowUp")?.value || "",
      injury_flag: !!document.getElementById("incidentInjuryFlag")?.checked,
      police_involved: !!document.getElementById("incidentPoliceFlag")?.checked,
      safeguarding_flag: !!document.getElementById("incidentSafeguardingFlag")?.checked,
      follow_up_required: !!document.getElementById("incidentFollowUpFlag")?.checked,
      manager_review_required: !!document.getElementById("incidentManagerReviewFlag")?.checked,
      ofsted_notified: !!document.getElementById("incidentOfstedFlag")?.checked
    };
  }

  function resetForm() {
    document.getElementById("incidentDateTime").value = getNowLocalDateTimeValue();
    document.getElementById("incidentType").value = "";
    document.getElementById("incidentLocation").value = "";
    document.getElementById("incidentSeverity").value = "";
    document.getElementById("incidentDescription").value = "";
    document.getElementById("incidentAntecedent").value = "";
    document.getElementById("incidentPresentation").value = "";
    document.getElementById("incidentStaffResponse").value = "";
    document.getElementById("incidentChildResponse").value = "";
    document.getElementById("incidentChildVoice").value = "";
    document.getElementById("incidentOutcome").value = "";
    document.getElementById("incidentActionsTaken").value = "";
    document.getElementById("incidentRestorativeFollowUp").value = "";
    document.getElementById("incidentInjuryFlag").checked = false;
    document.getElementById("incidentPoliceFlag").checked = false;
    document.getElementById("incidentSafeguardingFlag").checked = false;
    document.getElementById("incidentFollowUpFlag").checked = false;
    document.getElementById("incidentManagerReviewFlag").checked = false;
    document.getElementById("incidentOfstedFlag").checked = false;

    latestReview = null;
    clearSaveStatus();
    clearAiStatus();

    const results = document.getElementById("incidentAiResults");
    if (results) {
      results.classList.add("hidden");
      results.innerHTML = "";
    }
  }

  function renderListItems(title, items) {
    if (!Array.isArray(items) || !items.length) {
      return "";
    }

    return `
      <div class="doc-ai-result-card">
        <h4>${safe(title)}</h4>
        <div class="doc-ai-list">
          ${items.map(item => {
            if (typeof item === "string") {
              return `
                <div class="doc-ai-item">
                  <p>${safe(item)}</p>
                </div>
              `;
            }

            return `
              <div class="doc-ai-item">
                ${item.field ? `<strong>${safe(item.field)}</strong>` : item.code ? `<strong>Standard ${safe(item.code)}</strong>` : item.record_type ? `<strong>${safe(item.record_type)}</strong>` : ""}
                <p>${safe(item.message || item.reason || "")}</p>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderAiResults(review) {
    const host = document.getElementById("incidentAiResults");
    if (!host) return;

    host.innerHTML = `
      <div class="doc-ai-result-card">
        <h4>Review summary</h4>
        <div class="doc-ai-summary">${safe(review.summary || "No summary returned.")}</div>
      </div>

      ${renderListItems("Field feedback", review.field_feedback)}
      ${renderListItems("Spelling and clarity", review.spelling_and_clarity)}
      ${renderListItems("Missing details", review.missing_details)}
      ${renderListItems("Safeguarding considerations", review.safeguarding_considerations)}
      ${renderListItems("Quality Standards suggestions", review.quality_standards_suggestions)}
      ${renderListItems("Linked record suggestions", review.linked_record_suggestions)}

      ${
        review.therapeutic_rewrite
          ? `
          <div class="doc-ai-result-card">
            <h4>Therapeutic rewrite</h4>
            <div class="doc-ai-summary" style="white-space:pre-wrap;">${safe(review.therapeutic_rewrite)}</div>
            <div class="doc-ai-result-actions">
              <button id="applyIncidentRewriteInlineBtn" class="secondary-btn" type="button">Apply rewrite to description</button>
            </div>
          </div>
          `
          : ""
      }
    `;

    host.classList.remove("hidden");

    const inlineBtn = document.getElementById("applyIncidentRewriteInlineBtn");
    if (inlineBtn) {
      inlineBtn.addEventListener("click", applyRewriteToDescription);
    }
  }

  function applyRewriteToDescription() {
    if (!latestReview?.therapeutic_rewrite) {
      showAiStatus("No rewrite available to apply.", "error");
      return;
    }

    const target = document.getElementById("incidentDescription");
    if (!target) return;

    target.value = latestReview.therapeutic_rewrite;
    showAiStatus("Therapeutic rewrite applied to description.", "success");
  }

  async function runAiReview() {
    clearAiStatus();
    showAiStatus("Running AI review...");

    try {
      const payload = getPayload();

      const res = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "incident",
          payload,
          actions: [
            "spell_check",
            "improve_writing",
            "therapeutic_rewrite",
            "missing_details",
            "quality_standards",
            "linked_records",
            "safeguarding"
          ]
        })
      });

      latestReview = res?.review || null;

      if (!latestReview) {
        throw new Error("No review returned.");
      }

      renderAiResults(latestReview);
      showAiStatus("AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showAiStatus(error.message || "Could not complete AI review.", "error");
    }
  }

  async function saveIncident() {
    clearSaveStatus();
    showSaveStatus("Saving incident...");

    try {
      const payload = getPayload();

      if (!payload.incident_type.trim()) {
        throw new Error("Incident type is required.");
      }

      if (!payload.description.trim()) {
        throw new Error("Description is required.");
      }

      const res = await window.YoungPeopleShell.api(`/young-people-incidents/${currentContext.selectedYoungPerson.id}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showSaveStatus("Incident saved successfully.", "success");

      if (typeof currentContext?.reloadOverview === "function" && currentContext?.selectedYoungPerson?.id) {
        await currentContext.reloadOverview(currentContext.selectedYoungPerson.id);
      }

      return res;
    } catch (error) {
      console.error("saveIncident failed", error);
      showSaveStatus(error.message || "Could not save incident.", "error");
      throw error;
    }
  }

  function bind(context) {
    currentContext = context || null;
    latestReview = null;

    resetForm();

    document.getElementById("saveIncidentBtn")?.addEventListener("click", saveIncident);
    document.getElementById("resetIncidentBtn")?.addEventListener("click", resetForm);
    document.getElementById("reviewIncidentAiBtn")?.addEventListener("click", runAiReview);
    document.getElementById("applyIncidentRewriteBtn")?.addEventListener("click", applyRewriteToDescription);
  }

  return {
    bind
  };
})();
