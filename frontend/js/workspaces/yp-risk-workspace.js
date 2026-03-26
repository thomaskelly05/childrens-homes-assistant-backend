window.YoungPersonRiskWorkspace = (function () {
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
    const ownerIdRaw = document.getElementById("riskOwnerId")?.value || "";

    return {
      young_person_id: selectedYoungPerson?.id || null,
      category: document.getElementById("riskCategory")?.value || "",
      title: document.getElementById("riskTitle")?.value || "",
      concern_summary: document.getElementById("riskConcernSummary")?.value || "",
      known_triggers: document.getElementById("riskKnownTriggers")?.value || "",
      early_warning_signs: document.getElementById("riskEarlyWarningSigns")?.value || "",
      contextual_factors: document.getElementById("riskContextualFactors")?.value || "",
      current_controls: document.getElementById("riskCurrentControls")?.value || "",
      deescalation_strategies: document.getElementById("riskDeescalationStrategies")?.value || "",
      response_actions: document.getElementById("riskResponseActions")?.value || "",
      child_views: document.getElementById("riskChildViews")?.value || "",
      severity: document.getElementById("riskSeverity")?.value || "",
      likelihood: document.getElementById("riskLikelihood")?.value || "",
      review_date: document.getElementById("riskReviewDate")?.value || null,
      status: document.getElementById("riskStatus")?.value || "active",
      approval_status: document.getElementById("riskApprovalStatus")?.value || "draft",
      owner_id: ownerIdRaw ? Number(ownerIdRaw) : null,
      create_task: !!document.getElementById("riskTaskCreate")?.checked,
      chronology_link: !!document.getElementById("riskChronologyLink")?.checked,
      plan_link: !!document.getElementById("riskPlanLink")?.checked,
      manager_review: !!document.getElementById("riskManagerReview")?.checked,
      safeguarding_concern: !!document.getElementById("riskSafeguardingConcern")?.checked,
      archive_existing: !!document.getElementById("riskArchiveExisting")?.checked
    };
  }

  function clearForm() {
    [
      "riskTitle",
      "riskConcernSummary",
      "riskKnownTriggers",
      "riskEarlyWarningSigns",
      "riskContextualFactors",
      "riskCurrentControls",
      "riskDeescalationStrategies",
      "riskResponseActions",
      "riskChildViews",
      "riskOwnerId"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const category = document.getElementById("riskCategory");
    if (category) category.value = "";

    const severity = document.getElementById("riskSeverity");
    if (severity) severity.value = "";

    const likelihood = document.getElementById("riskLikelihood");
    if (likelihood) likelihood.value = "";

    const reviewDate = document.getElementById("riskReviewDate");
    if (reviewDate) reviewDate.value = getTodayString();

    const status = document.getElementById("riskStatus");
    if (status) status.value = "active";

    const approvalStatus = document.getElementById("riskApprovalStatus");
    if (approvalStatus) approvalStatus.value = "draft";

    const taskCreate = document.getElementById("riskTaskCreate");
    if (taskCreate) taskCreate.checked = true;

    const chronologyLink = document.getElementById("riskChronologyLink");
    if (chronologyLink) chronologyLink.checked = true;

    const planLink = document.getElementById("riskPlanLink");
    if (planLink) planLink.checked = true;

    const managerReview = document.getElementById("riskManagerReview");
    if (managerReview) managerReview.checked = true;

    const safeguardingConcern = document.getElementById("riskSafeguardingConcern");
    if (safeguardingConcern) safeguardingConcern.checked = false;

    const archiveExisting = document.getElementById("riskArchiveExisting");
    if (archiveExisting) archiveExisting.checked = false;

    clearStatus("riskSaveStatus");
    clearStatus("riskAiStatus");

    const results = document.getElementById("riskAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("riskStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("riskLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, incidents, safeguarding, support plans, and tasks will appear here after AI review.";
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
    const results = document.getElementById("riskAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("riskAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("riskAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("riskAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("riskAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("riskAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("riskStandardsBox");
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

    const linksBox = document.getElementById("riskLinksBox");
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
      showStatus("riskAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("riskAiStatus");
    showStatus("riskAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "risk_assessment",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("riskAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("riskAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveRiskRecord(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("riskSaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (
      !payload.category ||
      !payload.title ||
      !payload.concern_summary ||
      !payload.severity ||
      !payload.likelihood ||
      !payload.review_date
    ) {
      showStatus(
        "riskSaveStatus",
        "Complete category, title, concern summary, severity, likelihood, and review date before saving.",
        "error"
      );
      return;
    }

    clearStatus("riskSaveStatus");
    showStatus("riskSaveStatus", "Saving risk assessment...");

    try {
      await window.YoungPeopleShell.api("/young-people/risk-assessments", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("riskSaveStatus", "Risk assessment saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveRiskRecord failed", error);
      showStatus("riskSaveStatus", error.message || "Could not save risk assessment.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("riskWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Risk workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the risk clearly and proportionately.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the risk assessment.<br>
        4. Review linked chronology, incidents, safeguarding, support plans, tasks, and management follow-up.
      `;
    }

    const reviewDate = document.getElementById("riskReviewDate");
    if (reviewDate && !reviewDate.value) {
      reviewDate.value = getTodayString();
    }

    document.getElementById("clearRiskFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveRiskRecordBtn")?.addEventListener("click", () => {
      saveRiskRecord(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runRiskAiReviewBtn")?.addEventListener("click", () => {
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

    document.getElementById("copyRiskAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("riskAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("riskAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyRiskAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("riskAiImprovedText")?.value || "";
      const target = document.getElementById("riskConcernSummary");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("riskAiStatus", "Improved text applied to concern summary.", "success");
    });

    document.querySelectorAll("[data-risk-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-risk-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
