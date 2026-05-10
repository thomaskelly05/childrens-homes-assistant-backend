window.YoungPersonHealthWorkspace = (function () {
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

  function getNowLocalString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  function getPayload(selectedYoungPerson) {
    return {
      young_person_id: selectedYoungPerson?.id || null,
      record_type: document.getElementById("healthRecordType")?.value || "",
      event_datetime: document.getElementById("healthEventDatetime")?.value || null,
      title: document.getElementById("healthTitle")?.value || "",
      summary: document.getElementById("healthSummary")?.value || "",
      professional_name: document.getElementById("healthProfessionalName")?.value || "",
      outcome: document.getElementById("healthOutcome")?.value || "",
      next_action_date: document.getElementById("healthNextActionDate")?.value || null,
      young_person_voice: document.getElementById("healthYoungPersonVoice")?.value || "",
      follow_up_notes: document.getElementById("healthFollowUpNotes")?.value || "",
      medication_impact: document.getElementById("healthMedicationImpact")?.value || "",
      follow_up_required: !!document.getElementById("healthFollowUpRequired")?.checked,
      chronology_link: !!document.getElementById("healthChronologyLink")?.checked,
      plan_link: !!document.getElementById("healthPlanLink")?.checked,
      create_task: !!document.getElementById("healthTaskCreate")?.checked,
      manager_review: !!document.getElementById("healthManagerReview")?.checked,
      safeguarding_concern: !!document.getElementById("healthSafeguardingConcern")?.checked
    };
  }

  function clearForm() {
    [
      "healthTitle",
      "healthSummary",
      "healthProfessionalName",
      "healthOutcome",
      "healthNextActionDate",
      "healthYoungPersonVoice",
      "healthFollowUpNotes",
      "healthMedicationImpact"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const recordType = document.getElementById("healthRecordType");
    if (recordType) recordType.value = "";

    const eventDateTime = document.getElementById("healthEventDatetime");
    if (eventDateTime) eventDateTime.value = getNowLocalString();

    const followUpRequired = document.getElementById("healthFollowUpRequired");
    if (followUpRequired) followUpRequired.checked = true;

    const chronologyLink = document.getElementById("healthChronologyLink");
    if (chronologyLink) chronologyLink.checked = true;

    const planLink = document.getElementById("healthPlanLink");
    if (planLink) planLink.checked = true;

    const taskCreate = document.getElementById("healthTaskCreate");
    if (taskCreate) taskCreate.checked = true;

    const managerReview = document.getElementById("healthManagerReview");
    if (managerReview) managerReview.checked = false;

    const safeguardingConcern = document.getElementById("healthSafeguardingConcern");
    if (safeguardingConcern) safeguardingConcern.checked = false;

    clearStatus("healthSaveStatus");
    clearStatus("healthAiStatus");

    const results = document.getElementById("healthAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("healthStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("healthLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, health profile, health plan, tasks, and reviews will appear here after AI review.";
    }
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
    const results = document.getElementById("healthAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("healthAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("healthAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("healthAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("healthAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("healthAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("healthStandardsBox");
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

    const linksBox = document.getElementById("healthLinksBox");
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

  async function runAiReview(selectedYoungPerson, actions) {
    if (!selectedYoungPerson?.id) {
      showStatus("healthAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("healthAiStatus");
    showStatus("healthAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "health_record",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("healthAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("healthAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveHealthRecord(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("healthSaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.record_type || !payload.event_datetime || !payload.title || !payload.summary) {
      showStatus("healthSaveStatus", "Complete record type, date and time, title, and summary before saving.", "error");
      return;
    }

    clearStatus("healthSaveStatus");
    showStatus("healthSaveStatus", "Saving health record...");

    try {
      await window.YoungPeopleShell.api(`/young-people/${selectedYoungPerson.id}/health-records`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("healthSaveStatus", "Health record saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveHealthRecord failed", error);
      showStatus("healthSaveStatus", error.message || "Could not save health record.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("healthWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Health workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the health event clearly and factually.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the health record.<br>
        4. Review suggested chronology, health plan, tasks, and follow-up links.
      `;
    }

    const eventDateTime = document.getElementById("healthEventDatetime");
    if (eventDateTime && !eventDateTime.value) {
      eventDateTime.value = getNowLocalString();
    }

    document.getElementById("clearHealthFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveHealthRecordBtn")?.addEventListener("click", () => {
      saveHealthRecord(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runHealthAiReviewBtn")?.addEventListener("click", () => {
      runAiReview(selectedYoungPerson, [
        "improve_wording",
        "spell_check",
        "make_therapeutic",
        "make_more_factual",
        "suggest_missing_details",
        "suggest_quality_standards",
        "suggest_links"
      ]);
    });

    document.getElementById("copyHealthAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("healthAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("healthAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyHealthAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("healthAiImprovedText")?.value || "";
      const target = document.getElementById("healthSummary");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("healthAiStatus", "Improved text applied to summary.", "success");
    });

    document.querySelectorAll("[data-health-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-health-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
