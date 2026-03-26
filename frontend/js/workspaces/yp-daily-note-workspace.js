window.YoungPersonDailyNoteWorkspace = (function () {
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
      home_id: selectedYoungPerson?.home_id || null,
      note_date: document.getElementById("dailyNoteDate")?.value || null,
      shift_type: document.getElementById("dailyShiftType")?.value || "",
      mood: document.getElementById("dailyMood")?.value || "",
      activities: document.getElementById("dailyActivities")?.value || "",
      education_update: document.getElementById("dailyEducationUpdate")?.value || "",
      health_update: document.getElementById("dailyHealthUpdate")?.value || "",
      family_update: document.getElementById("dailyFamilyUpdate")?.value || "",
      behaviour_update: document.getElementById("dailyBehaviourUpdate")?.value || "",
      young_person_voice: document.getElementById("dailyYoungPersonVoice")?.value || "",
      positives: document.getElementById("dailyPositives")?.value || "",
      actions_required: document.getElementById("dailyActionsRequired")?.value || "",
      significance: document.getElementById("dailySignificance")?.value || "",
      workflow_status: document.getElementById("dailyWorkflowStatus")?.value || "draft"
    };
  }

  function clearForm() {
    [
      "dailyMood",
      "dailyActivities",
      "dailyEducationUpdate",
      "dailyHealthUpdate",
      "dailyFamilyUpdate",
      "dailyBehaviourUpdate",
      "dailyYoungPersonVoice",
      "dailyPositives",
      "dailyActionsRequired"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const noteDate = document.getElementById("dailyNoteDate");
    if (noteDate) noteDate.value = getTodayString();

    const shiftType = document.getElementById("dailyShiftType");
    if (shiftType) shiftType.value = "";

    const significance = document.getElementById("dailySignificance");
    if (significance) significance.value = "";

    const workflowStatus = document.getElementById("dailyWorkflowStatus");
    if (workflowStatus) workflowStatus.value = "draft";

    clearStatus("dailySaveStatus");
    clearStatus("dailyAiStatus");

    const results = document.getElementById("dailyAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("dailyStandardsBox");
    if (standards) standards.innerHTML = "Suggested standards will appear here after AI review.";

    const links = document.getElementById("dailyLinksBox");
    if (links) links.innerHTML = "Suggested links to chronology, health, education, family, tasks, and plans will appear here after AI review.";
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
    const results = document.getElementById("dailyAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("dailyAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("dailyAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("dailyAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("dailyAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("dailyAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("dailyStandardsBox");
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

    const linksBox = document.getElementById("dailyLinksBox");
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
      showStatus("dailyAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("dailyAiStatus");
    showStatus("dailyAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "daily_note",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("dailyAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("dailyAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveDailyNote(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("dailySaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.note_date || !payload.shift_type || !payload.activities) {
      showStatus("dailySaveStatus", "Complete note date, shift type, and activities before saving.", "error");
      return;
    }

    clearStatus("dailySaveStatus");
    showStatus("dailySaveStatus", "Saving daily note...");

    try {
      await window.YoungPeopleShell.api("/daily-notes", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("dailySaveStatus", "Daily note saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveDailyNote failed", error);
      showStatus("dailySaveStatus", error.message || "Could not save daily note.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("dailyWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Daily note workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the day clearly and factually.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the daily note.<br>
        4. Review suggested chronology, health, education, family, and task links.
      `;
    }

    const noteDate = document.getElementById("dailyNoteDate");
    if (noteDate && !noteDate.value) {
      noteDate.value = getTodayString();
    }

    document.getElementById("clearDailyFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveDailyNoteBtn")?.addEventListener("click", () => {
      saveDailyNote(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runDailyAiReviewBtn")?.addEventListener("click", () => {
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

    document.getElementById("copyDailyAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("dailyAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("dailyAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyDailyAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("dailyAiImprovedText")?.value || "";
      const target = document.getElementById("dailyActivities");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("dailyAiStatus", "Improved text applied to activities.", "success");
    });

    document.querySelectorAll("[data-daily-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-daily-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
