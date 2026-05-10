async function fetchJson(url) {
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.detail || "API error");
  }

  return json.data;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "";
}

function setProgress(percent) {
  const bar = document.getElementById("academyComplianceProgressBar");
  const text = document.getElementById("academyComplianceProgressText");

  const safe = Math.max(0, Math.min(100, Number(percent || 0)));

  if (bar) bar.style.width = `${safe}%`;
  if (text) text.textContent = `${safe}% compliant`;
}

function renderError(message) {
  const el = document.getElementById("academyComplianceError");
  if (!el) return;

  el.innerHTML = `
    <div class="academy-error">
      ${message}
    </div>
  `;
}

function renderMeta(home) {
  const el = document.getElementById("academyComplianceMeta");
  if (!el) return;

  el.innerHTML = `
    <span class="academy-chip">${home.home_name}</span>
    <span class="academy-chip">Home ID: ${home.home_id}</span>
  `;
}

function renderReviewQueue(rows) {
  const container = document.getElementById("academyComplianceReviewQueue");
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="academy-empty-state">No items in review queue.</div>`;
    return;
  }

  container.innerHTML = rows
    .slice(0, 10)
    .map(
      (row) => `
        <div class="academy-list-item">
          <div>
            <strong>${row.workbook_title}</strong><br/>
            <span>${row.learner_name} • ${row.home_name}</span>
          </div>
          <div>
            <span class="academy-badge">${row.status}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderQualityStandards(rows) {
  const container = document.getElementById("academyComplianceQualityStandards");
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="academy-empty-state">No evidence linked.</div>`;
    return;
  }

  container.innerHTML = rows
    .slice(0, 10)
    .map(
      (row) => `
        <div class="academy-list-item">
          <div>
            <strong>${row.quality_standard_code}</strong> — ${row.quality_standard_name}
          </div>
          <div>
            ${row.evidence_items || 0} items
          </div>
        </div>
      `
    )
    .join("");
}

function renderSccif(rows) {
  const container = document.getElementById("academyComplianceSccifDomains");
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="academy-empty-state">No SCCIF coverage found.</div>`;
    return;
  }

  container.innerHTML = rows
    .slice(0, 10)
    .map(
      (row) => `
        <div class="academy-list-item">
          <div>
            <strong>${row.sccif_domain_code}</strong> — ${row.sccif_domain_name}
          </div>
          <div>
            ${row.completed_module_records || 0} modules
          </div>
        </div>
      `
    )
    .join("");
}

async function loadCompliance() {
  try {
    const user = await fetchJson("/auth/me");
    const homeId = user.home_id || user.primary_home_id;

    if (!homeId) {
      renderError("No home linked to user.");
      return;
    }

    const [compliance, reviewQueue, quality, sccif] = await Promise.all([
      fetchJson(`/academy/compliance/home/${homeId}`),
      fetchJson(`/academy/review-queue?home_id=${homeId}`),
      fetchJson(`/academy/compliance/home/${homeId}/quality-standards`),
      fetchJson(`/academy/compliance/home/${homeId}/sccif-domains`),
    ]);

    renderMeta(compliance);

    // Training
    setText("academyComplianceActiveStaff", compliance.training.active_staff);
    setText(
      "academyComplianceMandatoryAssignments",
      compliance.training.mandatory_module_assignments
    );
    setText(
      "academyComplianceCompletedMandatory",
      compliance.training.completed_mandatory_module_assignments
    );
    setText(
      "academyComplianceOverdueMandatory",
      compliance.training.overdue_mandatory_module_assignments
    );

    setProgress(compliance.training.compliance_percent);

    // Workbooks
    setText(
      "academyComplianceWorkbookTotal",
      compliance.workbooks.total_workbook_submissions
    );
    setText(
      "academyComplianceWorkbookCompleted",
      compliance.workbooks.completed_workbooks
    );
    setText(
      "academyComplianceWorkbookReview",
      compliance.workbooks.in_review_workbooks
    );
    setText(
      "academyComplianceWorkbookAmendment",
      compliance.workbooks.workbooks_needing_amendment
    );

    // Qualifications
    setText(
      "academyComplianceQualificationTotal",
      compliance.qualifications.total_enrolments
    );
    setText(
      "academyComplianceQualificationLevel3",
      compliance.qualifications.level_3_enrolments
    );
    setText(
      "academyComplianceQualificationLevel5",
      compliance.qualifications.level_5_enrolments
    );
    setText(
      "academyComplianceQualificationProgress",
      `${Math.round(
        compliance.qualifications.average_completion_percent || 0
      )}%`
    );

    renderReviewQueue(reviewQueue);
    renderQualityStandards(quality);
    renderSccif(sccif);
  } catch (err) {
    console.error(err);
    renderError("Failed to load compliance data.");
  }
}

document
  .getElementById("academyComplianceRefreshBtn")
  ?.addEventListener("click", loadCompliance);

loadCompliance();
