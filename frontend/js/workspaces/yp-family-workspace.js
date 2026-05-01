window.YoungPersonFamilyWorkspace = (function () {
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
      contact_datetime: document.getElementById("familyContactDatetime")?.value || null,
      contact_type: document.getElementById("familyContactType")?.value || "",
      contact_person: document.getElementById("familyContactPerson")?.value || "",
      supervision_level: document.getElementById("familySupervisionLevel")?.value || "",
      location: document.getElementById("familyLocation")?.value || "",
      pre_contact_presentation: document.getElementById("familyPrePresentation")?.value || "",
      post_contact_presentation: document.getElementById("familyPostPresentation")?.value || "",
      summary: document.getElementById("familyContactSummary")?.value || "",
      child_voice: document.getElementById("familyYoungPersonVoice")?.value || "",
      concerns: document.getElementById("familyConcerns")?.value || "",
      follow_up_notes: document.getElementById("familyFollowUpNotes")?.value || "",
      follow_up_required: !!document.getElementById("familyFollowUpRequired")?.checked,
      chronology_link: !!document.getElementById("familyChronologyLink")?.checked,
      plan_link: !!document.getElementById("familyPlanLink")?.checked,
      create_task: !!document.getElementById("familyTaskCreate")?.checked,
      manager_review: !!document.getElementById("familyManagerReview")?.checked,
      safeguarding_concern: !!document.getElementById("familySafeguardingConcern")?.checked
    };
  }

  function clearForm() {
    [
      "familyContactPerson",
      "familyLocation",
      "familyPrePresentation",
      "familyPostPresentation",
      "familyContactSummary",
      "familyYoungPersonVoice",
      "familyConcerns",
      "familyFollowUpNotes"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    const contactDatetime = document.getElementById("familyContactDatetime");
    if (contactDatetime) contactDatetime.value = getNowLocalString();

    const contactType = document.getElementById("familyContactType");
    if (contactType) contactType.value = "";

    const supervision = document.getElementById("familySupervisionLevel");
    if (supervision) supervision.value = "";

    const followUpRequired = document.getElementById("familyFollowUpRequired");
    if (followUpRequired) followUpRequired.checked = true;

    const chronologyLink = document.getElementById("familyChronologyLink");
    if (chronologyLink) chronologyLink.checked = true;

    const planLink = document.getElementById("familyPlanLink");
    if (planLink) planLink.checked = true;

    const taskCreate = document.getElementById("familyTaskCreate");
    if (taskCreate) taskCreate.checked = true;

    const managerReview = document.getElementById("familyManagerReview");
    if (managerReview) managerReview.checked = false;

    const safeguardingConcern = document.getElementById("familySafeguardingConcern");
    if (safeguardingConcern) safeguardingConcern.checked = false;

    clearStatus("familySaveStatus");
    clearStatus("familyAiStatus");

    const results = document.getElementById("familyAiResults");
    if (results) results.classList.add("hidden");

    const standards = document.getElementById("familyStandardsBox");
    if (standards) {
      standards.innerHTML = "Suggested standards will appear here after AI review.";
    }

    const links = document.getElementById("familyLinksBox");
    if (links) {
      links.innerHTML = "Suggested links to chronology, family plans, tasks, and reviews will appear here after AI review.";
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
    const results = document.getElementById("familyAiResults");
    if (results) results.classList.remove("hidden");

    const improved = document.getElementById("familyAiImprovedText");
    if (improved) improved.value = review?.improved_text || "";

    renderAiList("familyAiFieldFeedback", review?.field_feedback, item => `
      <div class="doc-ai-item">
        <strong>${safe(item?.field || "Field")}</strong>
        <p><strong>Issue:</strong> ${safe(item?.issue || "—")}</p>
        <p><strong>Suggestion:</strong> ${safe(item?.suggestion || "—")}</p>
      </div>
    `);

    renderAiList("familyAiMissingDetails", review?.missing_details, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    renderAiList("familyAiSafeguarding", review?.safeguarding_notes, item => `
      <div class="doc-ai-item"><p>${safe(item)}</p></div>
    `);

    const summary = document.getElementById("familyAiSummary");
    if (summary) summary.innerHTML = safe(review?.summary || "No summary returned.");

    const standards = Array.isArray(review?.quality_standards) ? review.quality_standards : [];
    const links = Array.isArray(review?.link_suggestions) ? review.link_suggestions : [];

    const standardsBox = document.getElementById("familyStandardsBox");
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

    const linksBox = document.getElementById("familyLinksBox");
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
      showStatus("familyAiStatus", "Select a young person first.", "error");
      return;
    }

    clearStatus("familyAiStatus");
    showStatus("familyAiStatus", "Running AI review...");

    try {
      const payload = getPayload(selectedYoungPerson);

      const data = await window.YoungPeopleShell.api("/document-ai/review", {
        method: "POST",
        body: JSON.stringify({
          document_type: "family_contact_record",
          payload,
          actions
        })
      });

      renderAiResults(data?.review || {});
      showStatus("familyAiStatus", "AI review complete.", "success");
    } catch (error) {
      console.error("runAiReview failed", error);
      showStatus("familyAiStatus", error.message || "AI review failed.", "error");
    }
  }

  async function saveFamilyRecord(selectedYoungPerson, reloadOverview) {
    if (!selectedYoungPerson?.id) {
      showStatus("familySaveStatus", "Select a young person first.", "error");
      return;
    }

    const payload = getPayload(selectedYoungPerson);

    if (!payload.contact_datetime || !payload.contact_type || !payload.contact_person) {
      showStatus("familySaveStatus", "Complete contact date and time, contact type, and contact person before saving.", "error");
      return;
    }

    clearStatus("familySaveStatus");
    showStatus("familySaveStatus", "Saving family contact record...");

    try {
      await window.YoungPeopleShell.api(`/young-people/${selectedYoungPerson.id}/family/records`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showStatus("familySaveStatus", "Family contact record saved successfully.", "success");

      if (typeof reloadOverview === "function") {
        await reloadOverview(selectedYoungPerson.id);
      }
    } catch (error) {
      console.error("saveFamilyRecord failed", error);
      showStatus("familySaveStatus", error.message || "Could not save family contact record.", "error");
    }
  }

  function bind(context) {
    const { selectedYoungPerson, reloadOverview } = context;

    const workflow = document.getElementById("familyWorkflowBox");
    if (workflow && selectedYoungPerson) {
      workflow.innerHTML = `
        Family contact workflow for <strong>${safe(window.YoungPeopleShell.fullName(selectedYoungPerson))}</strong>.<br><br>
        1. Record the contact clearly and factually.<br>
        2. Use AI review to improve wording and identify gaps.<br>
        3. Save the family contact record.<br>
        4. Review suggested chronology, plans, tasks, and safeguarding links.
      `;
    }

    const contactDatetime = document.getElementById("familyContactDatetime");
    if (contactDatetime && !contactDatetime.value) {
      contactDatetime.value = getNowLocalString();
    }

    document.getElementById("clearFamilyFormBtn")?.addEventListener("click", clearForm);

    document.getElementById("saveFamilyRecordBtn")?.addEventListener("click", () => {
      saveFamilyRecord(selectedYoungPerson, reloadOverview);
    });

    document.getElementById("runFamilyAiReviewBtn")?.addEventListener("click", () => {
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

    document.getElementById("copyFamilyAiBtn")?.addEventListener("click", async () => {
      const text = document.getElementById("familyAiImprovedText")?.value || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showStatus("familyAiStatus", "Improved version copied.", "success");
    });

    document.getElementById("applyFamilyAiBtn")?.addEventListener("click", () => {
      const text = document.getElementById("familyAiImprovedText")?.value || "";
      const target = document.getElementById("familyContactSummary");
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
      showStatus("familyAiStatus", "Improved text applied to summary.", "success");
    });

    document.querySelectorAll("[data-family-ai-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-family-ai-action");
        if (!action) return;
        runAiReview(selectedYoungPerson, [action]);
      });
    });
  }

  return {
    bind
  };
})();
