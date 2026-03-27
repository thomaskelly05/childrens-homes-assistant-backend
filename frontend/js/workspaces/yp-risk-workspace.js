window.YoungPersonRiskWorkspace = (function () {
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

  function todayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function showSaveStatus(message, type = "") {
    const box = document.getElementById("riskSaveStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideSaveStatus() {
    const box = document.getElementById("riskSaveStatus");
    if (!box) return;

    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function showAiStatus(message, type = "") {
    const box = document.getElementById("riskAiStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideAiStatus() {
    const box = document.getElementById("riskAiStatus");
    if (!box) return;

    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function renderList(id, items) {
    const host = document.getElementById(id);
    if (!host) return;

    if (!Array.isArray(items) || !items.length) {
      host.innerHTML = `<div class="muted-line">Nothing returned.</div>`;
      return;
    }

    host.innerHTML = items
      .map(item => {
        if (typeof item === "string") {
          return `
            <div class="doc-ai-item">
              <p>${safe(item)}</p>
            </div>
          `;
        }

        const title = item?.title || item?.label || item?.field || "Item";
        const text = item?.text || item?.message || item?.detail || item?.value || "";

        return `
          <div class="doc-ai-item">
            <strong>${safe(title)}</strong>
            <p>${safe(text)}</p>
          </div>
        `;
      })
      .join("");
  }

  function clearAiResults() {
    document.getElementById("riskAiResults")?.classList.add("hidden");
    setFieldValue("riskAiImprovedText", "");
    renderList("riskAiFieldFeedback", []);
    renderList("riskAiMissingDetails", []);
    renderList("riskAiSafeguarding", []);

    const summary = document.getElementById("riskAiSummary");
    if (summary) summary.innerHTML = "";

    const standards = document.getElementById("riskStandardsBox");
    if (standards) standards.innerHTML = "Suggested standards will appear here after AI review.";

    const links = document.getElementById("riskLinksBox");
    if (links) links.innerHTML = "Suggested links to chronology, incidents, safeguarding, support plans, and tasks will appear here after AI review.";
  }

  function fillDefaults() {
    const reviewDate = document.getElementById("riskReviewDate");
    if (reviewDate && !reviewDate.value) {
      reviewDate.value = todayString();
    }

    const status = document.getElementById("riskStatus");
    if (status && !status.value) {
      status.value = "active";
    }

    const approval = document.getElementById("riskApprovalStatus");
    if (approval && !approval.value) {
      approval.value = "draft";
    }
  }

  function resetForm() {
    setFieldValue("riskCategory", "");
    setFieldValue("riskTitle", "");
    setFieldValue("riskConcernSummary", "");
    setFieldValue("riskKnownTriggers", "");
    setFieldValue("riskEarlyWarningSigns", "");
    setFieldValue("riskContextualFactors", "");
    setFieldValue("riskCurrentControls", "");
    setFieldValue("riskDeescalationStrategies", "");
    setFieldValue("riskResponseActions", "");
    setFieldValue("riskChildViews", "");
    setFieldValue("riskSeverity", "");
    setFieldValue("riskLikelihood", "");
    setFieldValue("riskReviewDate", todayString());
    setFieldValue("riskStatus", "active");
    setFieldValue("riskApprovalStatus", "draft");
    setFieldValue("riskOwnerId", "");

    setCheckboxValue("riskTaskCreate", true);
    setCheckboxValue("riskChronologyLink", true);
    setCheckboxValue("riskPlanLink", true);
    setCheckboxValue("riskManagerReview", true);
    setCheckboxValue("riskSafeguardingConcern", false);
    setCheckboxValue("riskArchiveExisting", false);

    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
  }

  function buildNarrativeForAi() {
    return [
      `Risk category:\n${getFieldValue("riskCategory")}`,
      `Risk title:\n${getFieldValue("riskTitle")}`,
      `Concern summary:\n${getFieldValue("riskConcernSummary")}`,
      `Known triggers:\n${getFieldValue("riskKnownTriggers")}`,
      `Early warning signs:\n${getFieldValue("riskEarlyWarningSigns")}`,
      `Contextual factors:\n${getFieldValue("riskContextualFactors")}`,
      `Current controls:\n${getFieldValue("riskCurrentControls")}`,
      `De-escalation and support strategies:\n${getFieldValue("riskDeescalationStrategies")}`,
      `Response actions:\n${getFieldValue("riskResponseActions")}`,
      `Young person's views:\n${getFieldValue("riskChildViews")}`,
      `Severity:\n${getFieldValue("riskSeverity")}`,
      `Likelihood:\n${getFieldValue("riskLikelihood")}`,
      `Status:\n${getFieldValue("riskStatus")}`,
      `Approval status:\n${getFieldValue("riskApprovalStatus")}`
    ].join("\n\n");
  }

  function buildPayload() {
    const ownerIdRaw = getFieldValue("riskOwnerId");

    return {
      risk_category: getFieldValue("riskCategory") || null,
      title: getFieldValue("riskTitle"),
      concern_summary: getFieldValue("riskConcernSummary"),
      known_triggers: getFieldValue("riskKnownTriggers"),
      early_warning_signs: getFieldValue("riskEarlyWarningSigns"),
      contextual_factors: getFieldValue("riskContextualFactors"),
      current_controls: getFieldValue("riskCurrentControls"),
      deescalation_support_strategies: getFieldValue("riskDeescalationStrategies"),
      response_actions: getFieldValue("riskResponseActions"),
      young_person_views: getFieldValue("riskChildViews"),
      severity: getFieldValue("riskSeverity") || null,
      likelihood: getFieldValue("riskLikelihood") || null,
      review_date: getFieldValue("riskReviewDate") || null,
      status: getFieldValue("riskStatus") || "active",
      approval_status: getFieldValue("riskApprovalStatus") || "draft",
      owner_id: ownerIdRaw ? Number(ownerIdRaw) : null,

      create_follow_up_task: getCheckboxValue("riskTaskCreate"),
      link_to_chronology: getCheckboxValue("riskChronologyLink"),
      link_to_support_plans: getCheckboxValue("riskPlanLink"),
      manager_review_needed: getCheckboxValue("riskManagerReview"),
      safeguarding_concern: getCheckboxValue("riskSafeguardingConcern"),
      archive_existing: getCheckboxValue("riskArchiveExisting"),

      combined_risk_assessment: buildNarrativeForAi(),
      shift_mode: ctx?.shiftMode || "during"
    };
  }

  async function saveRiskRecord() {
    const youngPersonId = getSelectedYoungPersonId();
    if (!youngPersonId) {
      showSaveStatus("No young person selected.", "error");
      return;
    }

    hideSaveStatus();
    const payload = buildPayload();

    if (!payload.title.trim() || !payload.concern_summary.trim()) {
      showSaveStatus("Please complete at least the risk title and concern summary before saving.", "error");
      return;
    }

    try {
      showSaveStatus("Saving risk assessment...");

      await api(`/young-people/${youngPersonId}/risk-assessments`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showSaveStatus("Risk assessment saved successfully.", "success");

      if (typeof ctx?.reloadOverview === "function") {
        await ctx.reloadOverview(youngPersonId);
      }
    } catch (error) {
      console.error("Risk save failed", error);
      showSaveStatus(error.message || "Could not save risk assessment.", "error");
    }
  }

  async function runAiAction(action) {
    const youngPersonId = getSelectedYoungPersonId();
    if (!youngPersonId) {
      showAiStatus("No young person selected.", "error");
      return;
    }

    hideAiStatus();

    const payload = {
      document_type: "risk_assessment",
      action,
      text: buildNarrativeForAi(),
      metadata: {
        young_person_id: youngPersonId,
        risk_category: getFieldValue("riskCategory"),
        severity: getFieldValue("riskSeverity"),
        likelihood: getFieldValue("riskLikelihood"),
        status: getFieldValue("riskStatus"),
        approval_status: getFieldValue("riskApprovalStatus"),
        shift_mode: ctx?.shiftMode || "during"
      }
    };

    if (!payload.text.trim()) {
      showAiStatus("Please add risk assessment content before running AI review.", "error");
      return;
    }

    try {
      showAiStatus("Running AI review...");

      const result = await api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      applyAiResult(result);
      showAiStatus("AI review complete.", "success");
    } catch (error) {
      console.error("Risk AI review failed", error);
      showAiStatus(error.message || "AI review failed.", "error");
    }
  }

  function applyAiResult(result) {
    document.getElementById("riskAiResults")?.classList.remove("hidden");

    const improvedText =
      result?.improved_text ||
      result?.improved_version ||
      result?.output_text ||
      "";

    setFieldValue("riskAiImprovedText", improvedText);

    renderList(
      "riskAiFieldFeedback",
      result?.field_feedback ||
        result?.field_level_feedback ||
        []
    );

    renderList(
      "riskAiMissingDetails",
      result?.missing_details ||
        result?.suggested_missing_details ||
        []
    );

    renderList(
      "riskAiSafeguarding",
      result?.safeguarding_notes ||
        result?.safeguarding_flags ||
        []
    );

    const summary = document.getElementById("riskAiSummary");
    if (summary) {
      summary.innerHTML = safe(
        result?.summary ||
          result?.review_summary ||
          "AI review completed."
      );
    }

    const standards = document.getElementById("riskStandardsBox");
    if (standards) {
      const standardsList =
        result?.quality_standards ||
        result?.suggested_quality_standards ||
        [];
      if (Array.isArray(standardsList) && standardsList.length) {
        standards.innerHTML = standardsList
          .map(item => `<div class="doc-ai-item"><p>${safe(typeof item === "string" ? item : item?.text || item?.title || "")}</p></div>`)
          .join("");
      } else {
        standards.innerHTML = "No standards suggested.";
      }
    }

    const links = document.getElementById("riskLinksBox");
    if (links) {
      const linkedItems =
        result?.suggested_links ||
        result?.links ||
        [];
      if (Array.isArray(linkedItems) && linkedItems.length) {
        links.innerHTML = linkedItems
          .map(item => `<div class="doc-ai-item"><p>${safe(typeof item === "string" ? item : item?.text || item?.title || "")}</p></div>`)
          .join("");
      } else {
        links.innerHTML = "No linked record suggestions returned.";
      }
    }

    const workflow = document.getElementById("riskWorkflowBox");
    if (workflow) {
      const workflowText =
        result?.workflow_guidance ||
        result?.workflow_summary ||
        "Review AI suggestions, save the assessment, and follow any linked actions, chronology, support plan, or management review prompts.";
      workflow.innerHTML = safe(workflowText);
    }
  }

  function applyImprovedTextToConcernSummary() {
    const improved = getFieldValue("riskAiImprovedText");
    if (!improved) return;
    setFieldValue("riskConcernSummary", improved);
    showAiStatus("Improved text applied to concern summary.", "success");
  }

  async function copyImprovedText() {
    const improved = getFieldValue("riskAiImprovedText");
    if (!improved) return;

    try {
      await navigator.clipboard.writeText(improved);
      showAiStatus("Improved text copied.", "success");
    } catch {
      showAiStatus("Could not copy text.", "error");
    }
  }

  function bindAiButtons() {
    document.querySelectorAll("[data-risk-ai-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-risk-ai-action");
        runAiAction(action);
      });
    });

    document.getElementById("runRiskAiReviewBtn")?.addEventListener("click", () => {
      runAiAction("full_review");
    });

    document.getElementById("applyRiskAiBtn")?.addEventListener("click", applyImprovedTextToConcernSummary);
    document.getElementById("copyRiskAiBtn")?.addEventListener("click", copyImprovedText);
  }

  function bindMainButtons() {
    document.getElementById("clearRiskFormBtn")?.addEventListener("click", resetForm);
    document.getElementById("saveRiskRecordBtn")?.addEventListener("click", saveRiskRecord);
  }

  async function bind(contextInput) {
    ctx = contextInput;
    fillDefaults();
    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
    bindAiButtons();
    bindMainButtons();
  }

  return {
    bind
  };
})();
