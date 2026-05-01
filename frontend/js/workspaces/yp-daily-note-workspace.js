window.YoungPersonDailyNoteWorkspace = (function () {
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

  function todayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

  function showSaveStatus(message, type = "") {
    const box = document.getElementById("dailySaveStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideSaveStatus() {
    const box = document.getElementById("dailySaveStatus");
    if (!box) return;
    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function showAiStatus(message, type = "") {
    const box = document.getElementById("dailyAiStatus");
    if (!box) return;

    box.classList.remove("hidden", "success", "error");
    if (type) box.classList.add(type);
    box.textContent = message;
  }

  function hideAiStatus() {
    const box = document.getElementById("dailyAiStatus");
    if (!box) return;
    box.classList.add("hidden");
    box.classList.remove("success", "error");
    box.textContent = "";
  }

  function clearAiResults() {
    document.getElementById("dailyAiResults")?.classList.add("hidden");
    setFieldValue("dailyAiImprovedText", "");
    renderList("dailyAiFieldFeedback", []);
    renderList("dailyAiMissingDetails", []);
    renderList("dailyAiSafeguarding", []);

    const summary = document.getElementById("dailyAiSummary");
    if (summary) summary.innerHTML = "";

    const standards = document.getElementById("dailyStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("dailyLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, health, education, family, tasks, and plans will appear here after AI review.";
    }

    const workflow = document.getElementById("dailyWorkflowBox");
    if (workflow) {
      workflow.innerHTML = "Complete the daily note, review AI suggestions, save the note, and follow any generated tasks or linked record prompts.";
    }
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

  function buildNarrativeForAi() {
    return [
      `Mood / presentation:\n${getFieldValue("dailyMood")}`,
      `Activities and routine:\n${getFieldValue("dailyActivities")}`,
      `Education update:\n${getFieldValue("dailyEducationUpdate")}`,
      `Health update:\n${getFieldValue("dailyHealthUpdate")}`,
      `Family and relationships:\n${getFieldValue("dailyFamilyUpdate")}`,
      `Behaviour and significant events:\n${getFieldValue("dailyBehaviourUpdate")}`,
      `Young person's voice:\n${getFieldValue("dailyYoungPersonVoice")}`,
      `Positives and achievements:\n${getFieldValue("dailyPositives")}`,
      `Actions required / handover:\n${getFieldValue("dailyActionsRequired")}`
    ].join("\n\n");
  }

  function buildTitle() {
    const shift = getFieldValue("dailyShiftType") || "shift";
    const date = getFieldValue("dailyNoteDate") || "undated";
    return `${shift.replace(/_/g, " ")} daily note - ${date}`;
  }

  function buildPayload() {
    const workflowStatus = getFieldValue("dailyWorkflowStatus") || "draft";
    const significance = getFieldValue("dailySignificance") || "standard";
    const actionsRequired = getFieldValue("dailyActionsRequired");

    return {
      young_person_id: getSelectedYoungPersonId(),
      note_date: getFieldValue("dailyNoteDate") || null,
      shift_type: getFieldValue("dailyShiftType") || "",
      mood: getFieldValue("dailyMood"),
      presentation: getFieldValue("dailyMood"),
      activities: getFieldValue("dailyActivities"),
      education_update: getFieldValue("dailyEducationUpdate"),
      health_update: getFieldValue("dailyHealthUpdate"),
      family_update: getFieldValue("dailyFamilyUpdate"),
      behaviour_update: getFieldValue("dailyBehaviourUpdate"),
      young_person_voice: getFieldValue("dailyYoungPersonVoice"),
      child_voice: getFieldValue("dailyYoungPersonVoice"),
      positives: getFieldValue("dailyPositives"),
      actions_required: actionsRequired,
      significance,
      workflow_status: workflowStatus,
      title: buildTitle(),
      narrative: buildNarrativeForAi(),

      // central linking service flags
      create_follow_up_task: !!actionsRequired,
      link_to_chronology: true,
      link_to_support_plans: false,
      manager_review_needed: workflowStatus === "submitted" || workflowStatus === "reviewed",
      safeguarding_concern: false,
      link_monthly_reviews: workflowStatus === "submitted" || workflowStatus === "reviewed",
      link_quality_standards: true
    };
  }

  function resetForm() {
    setFieldValue("dailyNoteDate", todayString());
    setFieldValue("dailyShiftType", "");
    setFieldValue("dailyMood", "");
    setFieldValue("dailyActivities", "");
    setFieldValue("dailyEducationUpdate", "");
    setFieldValue("dailyHealthUpdate", "");
    setFieldValue("dailyFamilyUpdate", "");
    setFieldValue("dailyBehaviourUpdate", "");
    setFieldValue("dailyYoungPersonVoice", "");
    setFieldValue("dailyPositives", "");
    setFieldValue("dailyActionsRequired", "");
    setFieldValue("dailySignificance", "");
    setFieldValue("dailyWorkflowStatus", "draft");

    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
  }

  function fillFromOverview() {
    const noteDate = document.getElementById("dailyNoteDate");
    if (noteDate && !noteDate.value) {
      noteDate.value = todayString();
    }

    const workflow = document.getElementById("dailyWorkflowStatus");
    if (workflow && !workflow.value) {
      workflow.value = "draft";
    }
  }

  async function saveDailyNote() {
    const youngPersonId = getSelectedYoungPersonId();
    if (!youngPersonId) {
      showSaveStatus("No young person selected.", "error");
      return;
    }

    hideSaveStatus();
    const payload = buildPayload();

    if (!payload.narrative.trim()) {
      showSaveStatus("Please complete at least one daily note field before saving.", "error");
      return;
    }

    try {
      showSaveStatus("Saving daily note...");

      await api(`/young-people/${youngPersonId}/daily-notes`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showSaveStatus("Daily note saved successfully.", "success");

      if (typeof ctx?.reloadOverview === "function") {
        await ctx.reloadOverview(youngPersonId);
      }
    } catch (error) {
      console.error("Daily note save failed", error);
      showSaveStatus(error.message || "Could not save daily note.", "error");
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
      document_type: "daily_note",
      action,
      text: buildNarrativeForAi(),
      metadata: {
        shift_type: getFieldValue("dailyShiftType"),
        significance: getFieldValue("dailySignificance"),
        workflow_status: getFieldValue("dailyWorkflowStatus"),
        shift_mode: ctx?.shiftMode || "during",
        young_person_id: youngPersonId
      }
    };

    if (!payload.text.trim()) {
      showAiStatus("Please add some daily note content before running AI review.", "error");
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
      console.error("AI review failed", error);
      showAiStatus(error.message || "AI review failed.", "error");
    }
  }

  function applyAiResult(result) {
    document.getElementById("dailyAiResults")?.classList.remove("hidden");

    const improvedText =
      result?.improved_text ||
      result?.improved_version ||
      result?.output_text ||
      "";

    setFieldValue("dailyAiImprovedText", improvedText);

    renderList(
      "dailyAiFieldFeedback",
      result?.field_feedback || result?.field_level_feedback || []
    );

    renderList(
      "dailyAiMissingDetails",
      result?.missing_details || result?.suggested_missing_details || []
    );

    renderList(
      "dailyAiSafeguarding",
      result?.safeguarding_notes || result?.safeguarding_flags || []
    );

    const summary = document.getElementById("dailyAiSummary");
    if (summary) {
      summary.innerHTML = safe(
        result?.summary ||
        result?.review_summary ||
        "AI review completed."
      );
    }

    const standards = document.getElementById("dailyStandardsBox");
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

    const links = document.getElementById("dailyLinksBox");
    if (links) {
      const linkedItems = result?.suggested_links || result?.links || [];
      if (Array.isArray(linkedItems) && linkedItems.length) {
        links.innerHTML = linkedItems
          .map(item => `<div class="doc-ai-item"><p>${safe(typeof item === "string" ? item : item?.text || item?.title || "")}</p></div>`)
          .join("");
      } else {
        links.innerHTML = "No linked record suggestions returned.";
      }
    }

    const workflow = document.getElementById("dailyWorkflowBox");
    if (workflow) {
      const workflowText =
        result?.workflow_guidance ||
        result?.workflow_summary ||
        "Review AI suggestions, save the note, and follow any generated tasks or linked record prompts.";
      workflow.innerHTML = safe(workflowText);
    }
  }

  function applyImprovedTextToActivities() {
    const improved = getFieldValue("dailyAiImprovedText");
    if (!improved) return;
    setFieldValue("dailyActivities", improved);
  }

  async function copyImprovedText() {
    const improved = getFieldValue("dailyAiImprovedText");
    if (!improved) return;

    try {
      await navigator.clipboard.writeText(improved);
      showAiStatus("Improved text copied.", "success");
    } catch {
      showAiStatus("Could not copy text.", "error");
    }
  }

  function bindAiButtons() {
    document.querySelectorAll("[data-daily-ai-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-daily-ai-action");
        runAiAction(action);
      });
    });

    document.getElementById("runDailyAiReviewBtn")?.addEventListener("click", () => {
      runAiAction("full_review");
    });

    document.getElementById("applyDailyAiBtn")?.addEventListener("click", applyImprovedTextToActivities);
    document.getElementById("copyDailyAiBtn")?.addEventListener("click", copyImprovedText);
  }

  function bindMainButtons() {
    document.getElementById("clearDailyFormBtn")?.addEventListener("click", resetForm);
    document.getElementById("saveDailyNoteBtn")?.addEventListener("click", saveDailyNote);
  }

  async function bind(contextInput) {
    ctx = contextInput;
    fillFromOverview();
    bindAiButtons();
    bindMainButtons();
    hideSaveStatus();
    hideAiStatus();
    clearAiResults();
  }

  return {
    bind
  };
})();
