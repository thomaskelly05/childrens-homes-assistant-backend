const API_BASE = "";
let activeSubmissionId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadSupervisionSubmissions();

  const markReviewedBtn = document.getElementById("markReviewedBtn");
  if (markReviewedBtn) {
    markReviewedBtn.addEventListener("click", async () => {
      await markSubmissionReviewed();
    });
  }
});

async function loadSupervisionSubmissions() {
  const list = document.getElementById("supervisionSubmissionList");
  if (!list) return;

  try {
    list.innerHTML = "Loading...";

    const response = await fetch(`${API_BASE}/supervision/submissions?limit=50`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load submissions");
    }

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

      const submittedAt = submission.submitted_at
        ? new Date(submission.submitted_at).toLocaleString()
        : "Unknown date";

      const reviewedAt = submission.reviewed_at
        ? new Date(submission.reviewed_at).toLocaleString()
        : "";

      const firstName = (submission.first_name || "").trim();
      const lastName = (submission.last_name || "").trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = fullName || submission.email || `Staff member #${submission.staff_id}`;

      item.innerHTML = `
        <h4>${escapeHtml(displayName)}</h4>
        <p>${escapeHtml(submission.role || "")}</p>
        <p><strong>Status:</strong> ${escapeHtml(submission.status || "submitted")}</p>
        <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
        ${reviewedAt ? `<p><strong>Reviewed:</strong> ${escapeHtml(reviewedAt)}</p>` : ""}
      `;

      item.addEventListener("click", async () => {
        await loadSupervisionSubmissionDetail(submission.id);
      });

      list.appendChild(item);
    });
  } catch (error) {
    list.innerHTML = `<div class="history-item"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function loadSupervisionSubmissionDetail(submissionId) {
  const detail = document.getElementById("supervisionSubmissionDetail");
  activeSubmissionId = submissionId;

  try {
    detail.textContent = "Loading...";

    const response = await fetch(`${API_BASE}/supervision/submissions/${submissionId}`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load submission");
    }

    const submission = data.submission;

    const firstName = (submission.first_name || "").trim();
    const lastName = (submission.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || submission.email || `Staff member #${submission.staff_id}`;

    detail.textContent = [
      `Staff member: ${displayName}`,
      submission.role ? `Role: ${submission.role}` : "",
      "",
      "Journal Summary",
      "",
      submission.journal_summary || "",
      "",
      "----------------------------------------",
      "",
      "Development Plan",
      "",
      submission.development_plan || "",
      "",
      "----------------------------------------",
      "",
      "Supervision Pack",
      "",
      submission.supervision_pack || ""
    ].filter(Boolean).join("\n");
  } catch (error) {
    detail.textContent = error.message || "Failed to load submission detail.";
  }
}

async function markSubmissionReviewed() {
  const detail = document.getElementById("supervisionSubmissionDetail");

  if (!activeSubmissionId) {
    detail.textContent = "Please select a submission first.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/supervision/submissions/${activeSubmissionId}/review`, {
      method: "POST",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to mark as reviewed");
    }

    detail.textContent = "Submission marked as reviewed.";
    await loadSupervisionSubmissions();
  } catch (error) {
    detail.textContent = error.message || "Failed to mark as reviewed.";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
