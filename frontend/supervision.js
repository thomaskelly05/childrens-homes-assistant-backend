let activeSubmissionId = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireAuth === "function" && !requireAuth()) {
    return;
  }

  const markReviewedBtn = document.getElementById("markReviewedBtn");
  if (markReviewedBtn) {
    markReviewedBtn.addEventListener("click", async () => {
      await markSubmissionReviewed();
    });
  }

  await loadSupervisionSubmissions();
});

async function loadSupervisionSubmissions() {
  const list = document.getElementById("supervisionSubmissionList");
  if (!list) return;

  try {
    list.innerHTML = `<div class="history-item"><p>Loading...</p></div>`;

    const data = await apiRequest("/supervision/submissions?limit=50");
    const submissions = data.submissions || [];

    list.innerHTML = "";

    if (!submissions.length) {
      list.innerHTML = `<div class="history-item"><p>No supervision submissions yet.</p></div>`;
      return;
    }

    submissions.forEach((submission) => {
      const item = document.createElement("div");
      item.className = "history-item supervision-item";
      item.style.cursor = "pointer";
      item.dataset.submissionId = submission.id;

      const submittedAt = submission.submitted_at
        ? new Date(submission.submitted_at).toLocaleString("en-GB")
        : "Unknown date";

      const reviewedAt = submission.reviewed_at
        ? new Date(submission.reviewed_at).toLocaleString("en-GB")
        : "";

      const firstName = (submission.first_name || "").trim();
      const lastName = (submission.last_name || "").trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = fullName || submission.email || `Staff member #${submission.staff_id}`;

      item.innerHTML = `
        <h4>${escapeHtml(displayName)}</h4>
        <p>${escapeHtml(formatRole(submission.role || ""))}</p>
        <p><strong>Status:</strong> ${escapeHtml(submission.status || "submitted")}</p>
        <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
        ${reviewedAt ? `<p><strong>Reviewed:</strong> ${escapeHtml(reviewedAt)}</p>` : ""}
      `;

      item.addEventListener("click", async () => {
        await loadSupervisionSubmissionDetail(submission.id);
      });

      list.appendChild(item);
    });

    if (activeSubmissionId) {
      highlightActiveSubmission(activeSubmissionId);
    }
  } catch (error) {
    list.innerHTML = `<div class="history-item"><p>${escapeHtml(error.message || "Failed to load submissions.")}</p></div>`;
  }
}

async function loadSupervisionSubmissionDetail(submissionId) {
  const detail = document.getElementById("supervisionSubmissionDetail");
  const markReviewedBtn = document.getElementById("markReviewedBtn");

  if (!detail) return;

  activeSubmissionId = submissionId;
  highlightActiveSubmission(submissionId);

  try {
    detail.textContent = "Loading...";
    if (markReviewedBtn) markReviewedBtn.disabled = true;

    const data = await apiRequest(`/supervision/submissions/${submissionId}`);
    const submission = data.submission;

    const firstName = (submission.first_name || "").trim();
    const lastName = (submission.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || submission.email || `Staff member #${submission.staff_id}`;

    const submittedAt = submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleString("en-GB")
      : "Unknown date";

    const reviewedAt = submission.reviewed_at
      ? new Date(submission.reviewed_at).toLocaleString("en-GB")
      : "";

    detail.textContent = [
      `Staff member: ${displayName}`,
      submission.role ? `Role: ${formatRole(submission.role)}` : "",
      submission.status ? `Status: ${submission.status}` : "",
      `Submitted: ${submittedAt}`,
      reviewedAt ? `Reviewed: ${reviewedAt}` : "",
      "",
      "Journal Summary",
      "",
      submission.journal_summary || "No journal summary available.",
      "",
      "----------------------------------------",
      "",
      "Development Plan",
      "",
      submission.development_plan || "No development plan available.",
      "",
      "----------------------------------------",
      "",
      "Supervision Pack",
      "",
      submission.supervision_pack || "No supervision pack available."
    ].filter(Boolean).join("\n");

    if (markReviewedBtn) {
      markReviewedBtn.disabled = submission.status === "reviewed";
      markReviewedBtn.textContent = submission.status === "reviewed"
        ? "Already Reviewed"
        : "Mark as Reviewed";
    }
  } catch (error) {
    detail.textContent = error.message || "Failed to load submission detail.";
    if (markReviewedBtn) {
      markReviewedBtn.disabled = false;
      markReviewedBtn.textContent = "Mark as Reviewed";
    }
  }
}

async function markSubmissionReviewed() {
  const detail = document.getElementById("supervisionSubmissionDetail");
  const markReviewedBtn = document.getElementById("markReviewedBtn");

  if (!detail) return;

  if (!activeSubmissionId) {
    detail.textContent = "Please select a submission first.";
    return;
  }

  try {
    if (markReviewedBtn) {
      markReviewedBtn.disabled = true;
      markReviewedBtn.textContent = "Reviewing...";
    }

    await apiRequest(`/supervision/submissions/${activeSubmissionId}/review`, {
      method: "POST"
    });

    detail.textContent = "Submission marked as reviewed.";
    await loadSupervisionSubmissions();
    await loadSupervisionSubmissionDetail(activeSubmissionId);
  } catch (error) {
    detail.textContent = error.message || "Failed to mark as reviewed.";
    if (markReviewedBtn) {
      markReviewedBtn.disabled = false;
      markReviewedBtn.textContent = "Mark as Reviewed";
    }
  }
}

function highlightActiveSubmission(submissionId) {
  document.querySelectorAll(".supervision-item").forEach((item) => {
    item.classList.toggle(
      "active",
      String(item.dataset.submissionId) === String(submissionId)
    );
  });
}

function formatRole(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
