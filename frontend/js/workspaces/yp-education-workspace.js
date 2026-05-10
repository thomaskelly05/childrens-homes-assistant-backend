window.YoungPersonEducationWorkspace = (function () {
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

  function getTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getPayload(selectedYoungPerson) {
    return {
      young_person_id: selectedYoungPerson?.id || null,
      record_date: document.getElementById("educationRecordDate")?.value || null,
      attendance_status: document.getElementById("educationAttendanceStatus")?.value || "",
      provision_name: document.getElementById("educationProvisionName")?.value || "",
      learning_engagement: document.getElementById("educationLearningEngagement")?.value || "",
      behaviour_summary: document.getElementById("educationBehaviourSummary")?.value || "",
      issue_raised: document.getElementById("educationIssueRaised")?.value || "",
      action_taken: document.getElementById("educationActionTaken")?.value || "",
      professional_involved: document.getElementById("educationProfessionalInvolved")?.value || "",
      achievement_note: document.getElementById("educationAchievementNote")?.value || "",
      young_person_voice: document.getElementById("educationYoungPersonVoice")?.value || "",
      follow_up_notes: document.getElementById("educationFollowUpNotes")?.value || "",
      next_action_date: document.getElementById("educationNextActionDate")?.value || null,
      follow_up_required: !!document.getElementById("educationFollowUpRequired")?.checked,
      chronology_link: !!document.getElementById("educationChronologyLink")?.checked,
      plan_link: !!document.getElementById("educationPlanLink")?.checked,
      create_task: !!document.getElementById("educationTaskCreate")?.checked,
      manager_review: !!document.getElementById("educationManagerReview")?.checked,
      safeguarding_concern: !!document.getElementById("educationSafeguardingConcern")?.checked
    };
  }

  function clearForm() {
    [
      "educationProvisionName",
      "educationLearningEngagement",
      "educationBehaviourSummary",
      "educationIssueRaised",
      "educationActionTaken",
      "educationProfessionalInvolved",
      "educationAchievementNote",
      "educationYoungPersonVoice",
      "educationFollowUpNotes",
      "educationNextActionDate"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const recordDate = document.getElementById("educationRecordDate");
    if (recordDate) recordDate.value = getTodayString();

    const attendance = document.getElementById("educationAttendanceStatus");
    if (attendance) attendance.value = "";

    const followUpRequired = document.getElementById("educationFollowUpRequired");
    if (followUpRequired) followUpRequired.checked = true;

    const chronologyLink = document.getElementById("educationChronologyLink");
    if (chronologyLink) chronologyLink.checked = true;

    const planLink = document.getElementById("educationPlanLink");
    if (planLink) planLink.checked = true;

    const taskCreate = document.getElementById("educationTaskCreate");
    if (taskCreate) taskCreate.checked = true;

    const managerReview = document.getElementById("educationManagerReview");
    if (managerReview) managerReview.checked = false;

    const safeguardingConcern = document.getElementById("educationSafeguardingConcern");
    if (safeguardingConcern) safeguardingConcern.checked = false;

    clearStatus("educationSaveStatus");
    clearStatus("educationAiStatus");

    const results = document.getElementById("educationAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("educationStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("educationLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, education profile, plans, tasks, and reviews will appear here after AI review.";
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
    const results = document.getElementById("educationAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("educationAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("educationAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("educationAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("educationAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("educationAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("educationStandardsBox");
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

    const linksBox = document.getElementById("educationLinksBox");
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
      showStatus("educationAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("educationAiStatus");
    showStatus("educationAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "education_record",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("educationAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("educationAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveEducationRecord(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("educationSaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.record_date || !payload.attendance_status || !payload.provision_name) {
      showStatus("educationSaveStatus", "Complete record date, attendance status, and provision name before saving.", "error");
      return;
    }

    clearStatus("educationSaveStatus");
    showStatus("educationSaveStatus", "Saving education record...");

    try {
      await window.YoungPeopleShell.api(`/young-people/${selectedYoungPerson.id}/education-records`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("educationSaveStatus", "Education record saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveEducationRecord failed", error);
      showStatus("educationSaveStatus", error.message || "Could not save education record.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("educationWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Education workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the education update clearly and factually.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the education record.<br>
        4. Review suggested chronology, plans, tasks, and follow-up links.
      `;
    }

    const recordDate = document.getElementById("educationRecordDate");
    if (recordDate && !recordDate.value) {
      recordDate.value = getTodayString();
    }

    document.getElementById("clearEducationFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveEducationRecordBtn")?.addEventListener("click", () => {
      saveEducationRecord(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runEducationAiReviewBtn")?.addEventListener("click", () => {
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

    document.getElementById("copyEducationAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("educationAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("educationAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyEducationAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("educationAiImprovedText")?.value || "";
      const target = document.getElementById("educationLearningEngagement");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("educationAiStatus", "Improved text applied to engagement.", "success");
    });

    document.querySelectorAll("[data-education-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-education-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
