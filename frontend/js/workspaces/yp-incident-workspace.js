window.YoungPersonIncidentWorkspace = (function () {
  function showStatus(id, message, type = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden", "error", "success");
    el.textContent = message || "";
    if (type) el.classList.add(type);
  }

  function clearStatus(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    el.textContent = "";
  }

  function safe(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getPayload(selectedYoungPerson) {
    return {
      young_person_id: selectedYoungPerson?.id || null,
      home_id: selectedYoungPerson?.home_id || null,
      incident_type: document.getElementById("incidentType")?.value || "",
      incident_datetime: document.getElementById("incidentDatetime")?.value || null,
      location: document.getElementById("incidentLocation")?.value || "",
      antecedent: document.getElementById("incidentAntecedent")?.value || "",
      description: document.getElementById("incidentDescription")?.value || "",
      staff_response: document.getElementById("incidentStaffResponse")?.value || "",
      child_response: document.getElementById("incidentChildResponse")?.value || "",
      outcome: document.getElementById("incidentOutcome")?.value || "",
      severity: document.getElementById("incidentSeverity")?.value || "",
      presentation: document.getElementById("incidentPresentation")?.value || "",
      child_voice: document.getElementById("incidentChildVoice")?.value || "",
      restorative_follow_up: document.getElementById("incidentRestorativeFollowUp")?.value || "",
      actions_taken: document.getElementById("incidentActionsTaken")?.value || "",
      injury_flag: !!document.getElementById("incidentInjuryFlag")?.checked,
      property_damage_flag: !!document.getElementById("incidentPropertyDamageFlag")?.checked,
      police_involved: !!document.getElementById("incidentPoliceInvolved")?.checked,
      police_notified: !!document.getElementById("incidentPoliceNotified")?.checked,
      safeguarding_flag: !!document.getElementById("incidentSafeguardingFlag")?.checked,
      lado_notified: !!document.getElementById("incidentLadoNotified")?.checked,
      ofsted_notified: !!document.getElementById("incidentOfstedNotified")?.checked,
      manager_review_required: !!document.getElementById("incidentManagerReviewRequired")?.checked,
      follow_up_required: !!document.getElementById("incidentFollowUpRequired")?.checked,
      requires_reg40: !!document.getElementById("incidentRequiresReg40")?.checked,
      requires_notification: !!document.getElementById("incidentRequiresNotification")?.checked
    };
  }

  function clearForm() {
    [
      "incidentType",
      "incidentDatetime",
      "incidentLocation",
      "incidentSeverity",
      "incidentPresentation",
      "incidentAntecedent",
      "incidentDescription",
      "incidentStaffResponse",
      "incidentChildResponse",
      "incidentOutcome",
      "incidentChildVoice",
      "incidentRestorativeFollowUp",
      "incidentActionsTaken"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    [
      "incidentInjuryFlag",
      "incidentPropertyDamageFlag",
      "incidentPoliceInvolved",
      "incidentPoliceNotified",
      "incidentSafeguardingFlag",
      "incidentLadoNotified",
      "incidentOfstedNotified",
      "incidentRequiresReg40",
      "incidentRequiresNotification"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    const managerReview = document.getElementById("incidentManagerReviewRequired");
    if (managerReview) managerReview.checked = true;

    const followUp = document.getElementById("incidentFollowUpRequired");
    if (followUp) followUp.checked = true;

    clearStatus("incidentSaveStatus");
    clearStatus("incidentAiStatus");

    const results = document.getElementById("incidentAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("incidentStandardsBox");
    if (standards) standards.innerHTML = "Suggested standards will appear here after AI review.";

    const links = document.getElementById("incidentLinksBox");
    if (links) links.innerHTML = "Suggested links to chronology, risk, safeguarding, tasks, and reviews will appear here after AI review.";
  }

  function renderAiList(hostId, rows, renderer) {
    const host = document.getElementById(hostId);
    if (!host) return;

    if (!Array.isArray(rows) || !rows.length) {
      host.innerHTML = `<div class="doc-ai-item"><p>Nothing suggested.</p></div>`;
      return;
    }

    host.innerHTML = rows.map(renderer).join("");
  }

  function renderAiResults(review) {
    const results = document.getElementById("incidentAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("incidentAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("incidentAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("incidentAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("incidentAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("incidentAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("incidentStandardsBox");
    if (standardsBox) {
      standardsBox.innerHTML = standards.length
        ? standards.map(item => `
            <div class="doc-ai-item" style="margin-bottom:8px;">
              <strong>Standard ${safe(item?.code || "—")}</strong>
              <p>${safe(item?.reason || "")}</p>
            </div>
          `).join("")
        : "No Quality Standards suggested yet.";
    }

    const linksBox = document.getElementById("incidentLinksBox");
    if (linksBox) {
      linksBox.innerHTML = links.length
        ? links.map(item => `
            <div class="doc-ai-item" style="margin-bottom:8px;">
              <strong>${safe(item?.target || "Link")}</strong>
              <p>${safe(item?.reason || "")}</p>
            </div>
          `).join("")
        : "No linked records suggested yet.";
    }
  }

  async function runAiReview(selectedYoungPerson) {
    if (!selectedYoungPerson?.id) {
      showStatus("incidentAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("incidentAiStatus");
    showStatus("incidentAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "incident",
          payload,
          actions: [
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "make_more_factual",
            "suggest_missing_details",
            "suggest_quality_standards",
            "suggest_links"
          ]
        })
      });

      renderAiResults(data?.review || {});
      showStatus("incidentAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("incidentAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveIncident(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("incidentSaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.incident_type || !payload.description || !payload.staff_response || !payload.outcome) {
      showStatus("incidentSaveStatus", "Complete incident type, what happened, staff response, and outcome before saving.", "error");
      return;
    }

    clearStatus("incidentSaveStatus");
    showStatus("incidentSaveStatus", "Saving incident...");

    try {
      await window.YoungPeopleShell.api("/incidents", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("incidentSaveStatus", "Incident saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveIncident failed", error);
      showStatus("incidentSaveStatus", error.message || "Could not save incident.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("incidentWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Incident workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the event factually.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the incident.<br>
        4. Review chronology, safeguarding, risk, and follow-up tasks.
      `;
    }

    document.getElementById("clearIncidentFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveIncidentBtn")?.addEventListener("click", () => {
      saveIncident(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runIncidentAiReviewBtn")?.addEventListener("click", () => {
      runAiReview(selectedYoungPerson);
    });

    document.getElementById("copyIncidentAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("incidentAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("incidentAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyIncidentAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("incidentAiImprovedText")?.value || "";
      const target = document.getElementById("incidentDescription");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("incidentAiStatus", "Improved text applied to description.", "success");
    });

    document.querySelectorAll("[data-incident-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-incident-ai-action");
        if (!action || !selectedYoungPerson?.id) return;

        clearStatus("incidentAiStatus");
        showStatus("incidentAiStatus", "Running AI review...");

        try {
          const payload = getPayload(selectedYoungPerson);

          const data = await window.YoungPeopleShell.api("/document-ai/review", {
            method: "POST",
            body: JSON.stringify({
              document_type: "incident",
              payload,
              actions: [action]
            })
          });

          renderAiResults(data?.review || {});
          showStatus("incidentAiStatus", "AI review complete.", "success");
        } catch (error) {
          console.error("single action AI review failed", error);
          showStatus("incidentAiStatus", error.message || "AI review failed.", "error");
        }
      });
    });
  }

  return {
    bind
  };
})();
