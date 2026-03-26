window.YoungPersonKeyworkWorkspace = (function () {
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
    const workerIdRaw = document.getElementById("keyworkWorkerId")?.value || "";
    const archivedValue = document.getElementById("keyworkArchived")?.value || "false";

    return {
      young_person_id: selectedYoungPerson?.id || null,
      session_date: document.getElementById("keyworkSessionDate")?.value || null,
      worker_id: workerIdRaw ? Number(workerIdRaw) : null,
      topic: document.getElementById("keyworkTopic")?.value || "",
      purpose: document.getElementById("keyworkPurpose")?.value || "",
      summary: document.getElementById("keyworkSummary")?.value || "",
      child_voice: document.getElementById("keyworkChildVoice")?.value || "",
      reflective_analysis: document.getElementById("keyworkReflectiveAnalysis")?.value || "",
      actions_agreed: document.getElementById("keyworkActionsAgreed")?.value || "",
      next_session_date: document.getElementById("keyworkNextSessionDate")?.value || null,
      status: document.getElementById("keyworkStatus")?.value || "completed",
      archived: archivedValue === "true",
      workflow_status: document.getElementById("keyworkWorkflowStatus")?.value || "draft",
      follow_up_required: !!document.getElementById("keyworkFollowUpRequired")?.checked,
      chronology_link: !!document.getElementById("keyworkChronologyLink")?.checked,
      plan_link: !!document.getElementById("keyworkPlanLink")?.checked,
      create_task: !!document.getElementById("keyworkTaskCreate")?.checked,
      manager_review: !!document.getElementById("keyworkManagerReview")?.checked,
      safeguarding_concern: !!document.getElementById("keyworkSafeguardingConcern")?.checked
    };
  }

  function clearForm() {
    [
      "keyworkWorkerId",
      "keyworkTopic",
      "keyworkPurpose",
      "keyworkSummary",
      "keyworkChildVoice",
      "keyworkReflectiveAnalysis",
      "keyworkActionsAgreed",
      "keyworkNextSessionDate"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const sessionDate = document.getElementById("keyworkSessionDate");
    if (sessionDate) sessionDate.value = getTodayString();

    const status = document.getElementById("keyworkStatus");
    if (status) status.value = "completed";

    const archived = document.getElementById("keyworkArchived");
    if (archived) archived.value = "false";

    const workflowStatus = document.getElementById("keyworkWorkflowStatus");
    if (workflowStatus) workflowStatus.value = "draft";

    const followUpRequired = document.getElementById("keyworkFollowUpRequired");
    if (followUpRequired) followUpRequired.checked = true;

    const chronologyLink = document.getElementById("keyworkChronologyLink");
    if (chronologyLink) chronologyLink.checked = true;

    const planLink = document.getElementById("keyworkPlanLink");
    if (planLink) planLink.checked = true;

    const taskCreate = document.getElementById("keyworkTaskCreate");
    if (taskCreate) taskCreate.checked = true;

    const managerReview = document.getElementById("keyworkManagerReview");
    if (managerReview) managerReview.checked = false;

    const safeguardingConcern = document.getElementById("keyworkSafeguardingConcern");
    if (safeguardingConcern) safeguardingConcern.checked = false;

    clearStatus("keyworkSaveStatus");
    clearStatus("keyworkAiStatus");

    const results = document.getElementById("keyworkAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("keyworkStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("keyworkLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, plans, tasks, and reviews will appear here after AI review.";
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
    const results = document.getElementById("keyworkAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("keyworkAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("keyworkAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("keyworkAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("keyworkAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("keyworkAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("keyworkStandardsBox");
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

    const linksBox = document.getElementById("keyworkLinksBox");
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
      showStatus("keyworkAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("keyworkAiStatus");
    showStatus("keyworkAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "keywork_session",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("keyworkAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("keyworkAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveKeyworkRecord(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("keyworkSaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.session_date || !payload.topic || !payload.summary) {
      showStatus("keyworkSaveStatus", "Complete session date, topic, and summary before saving.", "error");
      return;
    }

    clearStatus("keyworkSaveStatus");
    showStatus("keyworkSaveStatus", "Saving keywork session...");

    try {
      await window.YoungPeopleShell.api("/young-people/keywork-sessions", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("keyworkSaveStatus", "Keywork session saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveKeyworkRecord failed", error);
      showStatus("keyworkSaveStatus", error.message || "Could not save keywork session.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("keyworkWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Keywork workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the session clearly and reflectively.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the keywork session.<br>
        4. Review linked chronology, plans, tasks, and management follow-up.
      `;
    }

    const sessionDate = document.getElementById("keyworkSessionDate");
    if (sessionDate && !sessionDate.value) {
      sessionDate.value = getTodayString();
    }

    document.getElementById("clearKeyworkFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveKeyworkRecordBtn")?.addEventListener("click", () => {
      saveKeyworkRecord(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runKeyworkAiReviewBtn")?.addEventListener("click", () => {
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

    document.getElementById("copyKeyworkAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("keyworkAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("keyworkAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyKeyworkAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("keyworkAiImprovedText")?.value || "";
      const target = document.getElementById("keyworkSummary");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("keyworkAiStatus", "Improved text applied to summary.", "success");
    });

    document.querySelectorAll("[data-keywork-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-keywork-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
