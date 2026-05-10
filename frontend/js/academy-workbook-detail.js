(function () {
  const els = {
    pageTitle: document.getElementById("academyWorkbookTitle"),
    pageSubtitle: document.getElementById("academyWorkbookSubtitle"),
    metaBar: document.getElementById("academyWorkbookMeta"),
    statusBadge: document.getElementById("academyWorkbookStatus"),
    feedback: document.getElementById("academyWorkbookFeedback"),
    sections: document.getElementById("academyWorkbookSections"),
    error: document.getElementById("academyWorkbookError"),
    saveBtn: document.getElementById("academyWorkbookSaveBtn"),
    submitBtn: document.getElementById("academyWorkbookSubmitBtn"),
  };

  const state = {
    workbookId: null,
    submissionId: null,
    payload: null,
    saving: false,
    submitting: false,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function apiGet(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        (data && (data.detail || data.error)) || "Request failed."
      );
    }

    return data;
  }

  async function apiPatch(url, body) {
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        (data && (data.detail || data.error)) || "Request failed."
      );
    }

    return data;
  }

  async function apiPost(url, body = {}) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        (data && (data.detail || data.error)) || "Request failed."
      );
    }

    return data;
  }

  function getStatusTone(status) {
    const safe = String(status || "").trim().toLowerCase();

    if (["completed", "accepted", "pass", "passed"].includes(safe)) {
      return "success";
    }
    if (["needs_amendment", "refer", "overdue"].includes(safe)) {
      return "danger";
    }
    if (["submitted", "under_review", "draft"].includes(safe)) {
      return "warning";
    }
    return "neutral";
  }

  function renderBadge(status) {
    const tone = getStatusTone(status);
    const label = String(status || "draft").replaceAll("_", " ");
    return `<span class="academy-badge academy-badge--${tone}">${escapeHtml(label)}</span>`;
  }

  function renderMeta(workbook, submission) {
    const parts = [
      workbook.code,
      workbook.workbook_type,
      workbook.version ? `Version ${workbook.version}` : "",
      submission && submission.attempt_number
        ? `Attempt ${submission.attempt_number}`
        : "",
      submission && submission.due_date
        ? `Due ${escapeHtml(submission.due_date)}`
        : "",
    ].filter(Boolean);

    return parts
      .map((part) => `<span class="academy-chip">${escapeHtml(part)}</span>`)
      .join("");
  }

  function renderFeedback(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No feedback recorded yet.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.feedback_type || "feedback")}</h3>
            </div>
            <p>${escapeHtml(item.feedback_text || "")}</p>
            ${
              item.created_at
                ? `<p class="academy-muted">${escapeHtml(item.created_at)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("");
  }

  function renderQuestion(question, sectionIndex, questionIndex) {
    const inputId = `question-${question.id}`;
    const responseType = String(question.response_type || "long_text");
    const savedAnswer = question.answer_text || "";
    const guidance = question.guidance_text
      ? `<p class="academy-muted">${escapeHtml(question.guidance_text)}</p>`
      : "";

    let inputHtml = "";

    if (responseType === "long_text" || responseType === "short_text") {
      inputHtml = `
        <textarea
          class="academy-textarea academy-workbook-answer"
          id="${escapeHtml(inputId)}"
          data-question-id="${escapeHtml(question.id)}"
          data-response-type="${escapeHtml(responseType)}"
          placeholder="Enter your response here..."
        >${escapeHtml(savedAnswer)}</textarea>
      `;
    } else {
      inputHtml = `
        <input
          class="academy-input academy-workbook-answer"
          id="${escapeHtml(inputId)}"
          data-question-id="${escapeHtml(question.id)}"
          data-response-type="${escapeHtml(responseType)}"
          type="text"
          value="${escapeHtml(savedAnswer)}"
          placeholder="Enter your response here..."
        />
      `;
    }

    return `
      <article class="academy-detail-card">
        <div class="academy-detail-card__header">
          <h3>Question ${sectionIndex + 1}.${questionIndex + 1}</h3>
          <div class="academy-detail-card__meta">
            ${question.required ? '<span class="academy-badge academy-badge--warning">Required</span>' : ""}
            <span class="academy-chip">${escapeHtml(responseType)}</span>
          </div>
        </div>

        <p><strong>${escapeHtml(question.prompt_text || "")}</strong></p>
        ${guidance}

        ${
          question.min_words
            ? `<p class="academy-muted">Minimum words: ${escapeHtml(question.min_words)}</p>`
            : ""
        }

        ${inputHtml}
      </article>
    `;
  }

  function renderSection(section, sectionIndex) {
    const questions = Array.isArray(section.questions) ? section.questions : [];

    return `
      <section class="academy-panel">
        <div class="academy-panel__header">
          <div>
            <h2 class="academy-panel__title">${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</h2>
            ${
              section.guidance_text
                ? `<p class="academy-panel__subtitle">${escapeHtml(section.guidance_text)}</p>`
                : ""
            }
          </div>
        </div>
        <div class="academy-panel__body">
          <div class="academy-stack">
            ${
              questions.length
                ? questions
                    .map((question, questionIndex) =>
                      renderQuestion(question, sectionIndex, questionIndex)
                    )
                    .join("")
                : '<div class="academy-empty-state">No questions in this section.</div>'
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderWorkbook(payload) {
    state.payload = payload;

    const workbook = payload.workbook || {};
    const submission = payload.submission || null;
    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    const feedback = Array.isArray(payload.feedback) ? payload.feedback : [];

    state.workbookId = workbook.id || state.workbookId;
    state.submissionId = submission ? submission.id : state.submissionId;

    if (els.pageTitle) {
      els.pageTitle.textContent = workbook.title || "Workbook";
    }

    if (els.pageSubtitle) {
      els.pageSubtitle.textContent =
        workbook.code || "Workbook evidence and response page";
    }

    if (els.metaBar) {
      els.metaBar.innerHTML = renderMeta(workbook, submission);
    }

    if (els.statusBadge) {
      els.statusBadge.innerHTML = submission
        ? renderBadge(submission.status)
        : '<span class="academy-badge academy-badge--neutral">not started</span>';
    }

    if (els.feedback) {
      els.feedback.innerHTML = renderFeedback(feedback);
    }

    if (els.sections) {
      els.sections.innerHTML = sections.length
        ? sections.map((section, index) => renderSection(section, index)).join("")
        : '<div class="academy-empty-state">No workbook sections were returned.</div>';
    }
  }

  function collectAnswers() {
    const nodes = document.querySelectorAll(".academy-workbook-answer");
    const answers = [];

    nodes.forEach((node) => {
      const questionId = Number(node.getAttribute("data-question-id"));
      const responseType = node.getAttribute("data-response-type") || "long_text";
      const value = "value" in node ? node.value : "";

      if (!Number.isFinite(questionId) || questionId <= 0) {
        return;
      }

      if (
        responseType === "long_text" ||
        responseType === "short_text" ||
        responseType === "text"
      ) {
        answers.push({
          question_id: questionId,
          answer_text: value,
          answer_json: null,
        });
      } else {
        answers.push({
          question_id: questionId,
          answer_text: value,
          answer_json: null,
        });
      }
    });

    return answers;
  }

  async function ensureSubmission() {
    if (state.submissionId) {
      return state.submissionId;
    }

    if (!state.workbookId) {
      throw new Error("Workbook id is missing.");
    }

    const result = await apiPost(
      `/academy/workbooks/${encodeURIComponent(state.workbookId)}/submissions`,
      {}
    );

    const row = result && result.data ? result.data : null;
    if (!row || !row.id) {
      throw new Error("Failed to create workbook submission.");
    }

    state.submissionId = row.id;
    return row.id;
  }

  async function saveWorkbook() {
    if (state.saving) return;
    state.saving = true;

    if (els.saveBtn) {
      els.saveBtn.disabled = true;
      els.saveBtn.textContent = "Saving...";
    }

    try {
      const submissionId = await ensureSubmission();
      const answers = collectAnswers();

      await apiPatch(
        `/academy/workbook-submissions/${encodeURIComponent(submissionId)}/answers`,
        { answers }
      );

      const refreshed = await apiGet(
        `/academy/workbook-submissions/${encodeURIComponent(submissionId)}`
      );

      renderWorkbook(refreshed.data);
    } catch (error) {
      console.error("[academy-workbook-detail] save failed", error);
      alert(error.message || "Failed to save workbook.");
    } finally {
      state.saving = false;
      if (els.saveBtn) {
        els.saveBtn.disabled = false;
        els.saveBtn.textContent = "Save answers";
      }
    }
  }

  async function submitWorkbook() {
    if (state.submitting) return;
    state.submitting = true;

    if (els.submitBtn) {
      els.submitBtn.disabled = true;
      els.submitBtn.textContent = "Submitting...";
    }

    try {
      const submissionId = await ensureSubmission();
      const answers = collectAnswers();

      await apiPatch(
        `/academy/workbook-submissions/${encodeURIComponent(submissionId)}/answers`,
        { answers }
      );

      await apiPost(
        `/academy/workbook-submissions/${encodeURIComponent(submissionId)}/submit`,
        {}
      );

      const refreshed = await apiGet(
        `/academy/workbook-submissions/${encodeURIComponent(submissionId)}`
      );

      renderWorkbook(refreshed.data);
      alert("Workbook submitted successfully.");
    } catch (error) {
      console.error("[academy-workbook-detail] submit failed", error);
      alert(error.message || "Failed to submit workbook.");
    } finally {
      state.submitting = false;
      if (els.submitBtn) {
        els.submitBtn.disabled = false;
        els.submitBtn.textContent = "Submit workbook";
      }
    }
  }

  function bindEvents() {
    if (els.saveBtn) {
      els.saveBtn.addEventListener("click", saveWorkbook);
    }

    if (els.submitBtn) {
      els.submitBtn.addEventListener("click", submitWorkbook);
    }
  }

  async function init() {
    bindEvents();

    const workbookId = getQueryParam("workbook_id");
    const submissionId = getQueryParam("submission_id");

    if (!workbookId && !submissionId) {
      if (els.error) {
        els.error.innerHTML =
          '<div class="academy-empty-state">No workbook id or submission id was provided.</div>';
      }
      return;
    }

    try {
      let result;

      if (submissionId) {
        state.submissionId = Number(submissionId);
        result = await apiGet(
          `/academy/workbook-submissions/${encodeURIComponent(submissionId)}`
        );
      } else {
        state.workbookId = Number(workbookId);
        result = await apiGet(
          `/academy/workbooks/${encodeURIComponent(workbookId)}`
        );
      }

      const payload = result && result.data ? result.data : null;
      if (!payload) {
        throw new Error("No workbook payload returned.");
      }

      renderWorkbook(payload);
    } catch (error) {
      console.error("[academy-workbook-detail] load failed", error);
      if (els.error) {
        els.error.innerHTML = `<div class="academy-empty-state">${escapeHtml(
          error.message || "Failed to load workbook."
        )}</div>`;
      }
    }
  }

  init();
})();
