const state = {
  currentYoungPersonId: null,
  currentDailyNoteId: null,
  currentDailyNoteStatus: null,
  currentArchiveType: null
};

const els = {
  youngPersonSelector: document.getElementById("youngPersonSelector"),
  ypMiniSummary: document.getElementById("ypMiniSummary"),
  ypAlerts: document.getElementById("ypAlerts"),
  ypCompliance: document.getElementById("ypCompliance"),
  overviewContent: document.getElementById("overviewContent"),
  profileContent: document.getElementById("profileContent"),
  plansContent: document.getElementById("plansContent"),
  riskContent: document.getElementById("riskContent"),
  healthContent: document.getElementById("healthContent"),
  educationContent: document.getElementById("educationContent"),
  familyContent: document.getElementById("familyContent"),
  keyWorkContent: document.getElementById("keyWorkContent"),
  chronologyContent: document.getElementById("chronologyContent"),
  complianceContent: document.getElementById("complianceContent"),
  todayWorkflowPanel: document.getElementById("todayWorkflowPanel"),
  dailyNotesCurrentCard: document.getElementById("dailyNotesCurrentCard"),
  dailyNoteStatusPanel: document.getElementById("dailyNoteStatusPanel"),
  dailyNoteManagerComments: document.getElementById("dailyNoteManagerComments"),
  linkedRecordsSummary: document.getElementById("linkedRecordsSummary"),
  managerReviewSummary: document.getElementById("managerReviewSummary"),
  recentTimelineSummary: document.getElementById("recentTimelineSummary"),
  dailyNoteAiSuggestionsCard: document.getElementById("dailyNoteAiSuggestionsCard"),
  dailyNoteAiStatusBadge: document.getElementById("dailyNoteAiStatusBadge"),
  dailyNoteAiSummary: document.getElementById("dailyNoteAiSummary"),
  dailyNoteAiSuggestionsList: document.getElementById("dailyNoteAiSuggestionsList"),
  regenerateAiSuggestionsBtn: document.getElementById("regenerateAiSuggestionsBtn"),
  dailyNoteLinkedRecordsCard: document.getElementById("dailyNoteLinkedRecordsCard"),
  dailyNoteLinkedRecordsList: document.getElementById("dailyNoteLinkedRecordsList"),
  dailyNoteModal: document.getElementById("dailyNoteModal"),
  dailyNoteForm: document.getElementById("dailyNoteForm"),
  dailyNoteId: document.getElementById("dailyNoteId"),
  dnNoteDate: document.getElementById("dnNoteDate"),
  dnShiftType: document.getElementById("dnShiftType"),
  dnMood: document.getElementById("dnMood"),
  dnSignificance: document.getElementById("dnSignificance"),
  dnYoungPersonVoice: document.getElementById("dnYoungPersonVoice"),
  dnPresentation: document.getElementById("dnPresentation"),
  dnEducationUpdate: document.getElementById("dnEducationUpdate"),
  dnPositives: document.getElementById("dnPositives"),
  dnHealthUpdate: document.getElementById("dnHealthUpdate"),
  dnFamilyUpdate: document.getElementById("dnFamilyUpdate"),
  dnBehaviourUpdate: document.getElementById("dnBehaviourUpdate"),
  dnActivities: document.getElementById("dnActivities"),
  dnActionsRequired: document.getElementById("dnActionsRequired"),
  dnManagerReviewComment: document.getElementById("dnManagerReviewComment"),
  dnWorkflowStatus: document.getElementById("dnWorkflowStatus"),
  dailyNoteAiFeedback: document.getElementById("dailyNoteAiFeedback"),
  openDailyNoteModalBtn: document.getElementById("openDailyNoteModalBtn"),
  openDailyNotesArchiveBtn: document.getElementById("openDailyNotesArchiveBtn"),
  quickDailyNoteBtn: document.getElementById("quickDailyNoteBtn"),
  saveDraftDailyNoteBtn: document.getElementById("saveDraftDailyNoteBtn"),
  submitDailyNoteBtn: document.getElementById("submitDailyNoteBtn"),
  approveDailyNoteBtn: document.getElementById("approveDailyNoteBtn"),
  returnDailyNoteBtn: document.getElementById("returnDailyNoteBtn"),
  closeDailyNoteModalBtn: document.getElementById("closeDailyNoteModalBtn"),
  cancelDailyNoteBtn: document.getElementById("cancelDailyNoteBtn"),
  linkedDraftModal: document.getElementById("linkedDraftModal"),
  linkedDraftForm: document.getElementById("linkedDraftForm"),
  linkedDraftId: document.getElementById("linkedDraftId"),
  linkedDraftType: document.getElementById("linkedDraftType"),
  linkedDraftModalTitle: document.getElementById("linkedDraftModalTitle"),
  linkedDraftSourceInfo: document.getElementById("linkedDraftSourceInfo"),
  linkedDraftDynamicFields: document.getElementById("linkedDraftDynamicFields"),
  closeLinkedDraftModalBtn: document.getElementById("closeLinkedDraftModalBtn"),
  cancelLinkedDraftBtn: document.getElementById("cancelLinkedDraftBtn"),
  discardLinkedDraftBtn: document.getElementById("discardLinkedDraftBtn"),
  archiveDrawer: document.getElementById("archiveDrawer"),
  archiveDrawerTitle: document.getElementById("archiveDrawerTitle"),
  archiveSearchInput: document.getElementById("archiveSearchInput"),
  archiveDateFilter: document.getElementById("archiveDateFilter"),
  archiveMonthFilter: document.getElementById("archiveMonthFilter"),
  archiveYearFilter: document.getElementById("archiveYearFilter"),
  archiveResultsList: document.getElementById("archiveResultsList"),
  closeArchiveDrawerBtn: document.getElementById("closeArchiveDrawerBtn")
};

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "approved":
    case "saved":
    case "completed":
      return "badge success";
    case "submitted":
    case "review needed":
      return "badge warning";
    case "returned":
    case "critical":
      return "badge danger";
    default:
      return "badge muted";
  }
}

function getConfidenceLabel(score) {
  if (score == null) return "Unscored";
  if (score >= 0.85) return "High confidence";
  if (score >= 0.7) return "Medium confidence";
  return "Low confidence";
}

function formatArchiveType(type) {
  const map = {
    "daily-notes": "Daily Notes",
    incidents: "Incidents",
    health: "Health",
    education: "Education",
    family: "Family",
    "key-work": "Key Work",
    chronology: "Chronology"
  };
  return map[type] || type;
}

function formatRecordTypeLabel(type) {
  const map = {
    key_worker_session_draft: "Key Worker Session Draft",
    risk_assessment_update: "Risk Assessment Update Draft",
    health_record_draft: "Health Record Draft",
    education_record_draft: "Education Record Draft",
    family_contact_record_draft: "Family Contact Record Draft",
    chronology_entry: "Chronology Entry Draft",
    manager_alert: "Manager Alert Draft",
    support_plan_update: "Support Plan Update Draft",
    incident_draft: "Incident Draft"
  };
  return map[type] || (type || "").replaceAll("_", " ");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function renderBadges(container, items, emptyText) {
  if (!items || !items.length) {
    container.innerHTML = `<span class="badge muted">${escapeHtml(emptyText)}</span>`;
    return;
  }

  container.innerHTML = items.map(item => {
    if (typeof item === "string") {
      return `<span class="badge">${escapeHtml(item)}</span>`;
    }
    return `<span class="${getBadgeClass(item.level)}">${escapeHtml(item.label)}</span>`;
  }).join("");
}

function renderTodayWorkflow(today) {
  els.todayWorkflowPanel.innerHTML = `
    <div class="linked-record-card">
      <p><strong>Current note:</strong> ${escapeHtml(today.current_note_status || "None")}</p>
      <p><strong>Submitted items:</strong> ${escapeHtml(today.submitted_count ?? 0)}</p>
      <p><strong>Review needed:</strong> ${escapeHtml(today.review_needed_count ?? 0)}</p>
      <p><strong>Open actions:</strong> ${escapeHtml(today.open_actions_count ?? 0)}</p>
    </div>
  `;
}

function renderManagerSummary(data) {
  els.managerReviewSummary.innerHTML = `
    <div class="linked-record-card">
      <p><strong>Submitted notes:</strong> ${escapeHtml(data.submitted_notes ?? 0)}</p>
      <p><strong>Returned notes:</strong> ${escapeHtml(data.returned_notes ?? 0)}</p>
      <p><strong>Assistant alerts:</strong> ${escapeHtml(data.ai_alerts ?? 0)}</p>
    </div>
  `;
}

function renderTimelineSummary(items) {
  if (!items || !items.length) {
    els.recentTimelineSummary.innerHTML = `<p class="empty-state">No recent timeline items.</p>`;
    return;
  }

  els.recentTimelineSummary.innerHTML = items.map(item => `
    <div class="timeline-item">
      <p><strong>${escapeHtml(item.date || "")}</strong></p>
      <p>${escapeHtml(item.summary || "")}</p>
    </div>
  `).join("");
}

async function loadYoungPeople() {
  const data = await api("/api/young-people");
  els.youngPersonSelector.innerHTML = `
    <option value="">Select a young person</option>
    ${(data.items || []).map(item => `
      <option value="${item.id}">${escapeHtml(item.full_name || item.name || "Unnamed")}</option>
    `).join("")}
  `;
}

async function loadYoungPersonWorkspace(youngPersonId) {
  const data = await api(`/api/young-people/${youngPersonId}/workspace-summary`);

  els.ypMiniSummary.innerHTML = `
    <p><strong>${escapeHtml(data.full_name || "-")}</strong></p>
    <p>Age: ${escapeHtml(data.age || "-")}</p>
    <p>Placement: ${escapeHtml(data.placement_status || "-")}</p>
    <p>House / Room: ${escapeHtml(data.house_room || "-")}</p>
    <p>Key staff: ${escapeHtml((data.key_staff || []).join(", ") || "-")}</p>
  `;

  els.overviewContent.innerHTML = `<p>${escapeHtml(data.overview_summary || "No overview available.")}</p>`;
  els.profileContent.innerHTML = `<p>${escapeHtml(data.profile_summary || "No profile details available.")}</p>`;
  els.plansContent.innerHTML = `<p>${escapeHtml(data.plan_summary || "No plans available.")}</p>`;
  els.riskContent.innerHTML = `<p>${escapeHtml(data.risk_summary || "No risk data available.")}</p>`;
  els.healthContent.innerHTML = `<p>${escapeHtml(data.health_summary || "No health data available.")}</p>`;
  els.educationContent.innerHTML = `<p>${escapeHtml(data.education_summary || "No education data available.")}</p>`;
  els.familyContent.innerHTML = `<p>${escapeHtml(data.family_summary || "No family data available.")}</p>`;
  els.keyWorkContent.innerHTML = `<p>${escapeHtml(data.key_work_summary || "No key work data available.")}</p>`;
  els.chronologyContent.innerHTML = `<p>${escapeHtml(data.chronology_summary || "No chronology available.")}</p>`;
  els.complianceContent.innerHTML = `<p>${escapeHtml(data.compliance_summary || "No compliance data available.")}</p>`;

  renderBadges(els.ypAlerts, data.alerts || [], "No alerts loaded");
  renderBadges(els.ypCompliance, data.compliance_flags || [], "No compliance data yet");
  renderTodayWorkflow(data.today || {});
  renderManagerSummary(data.manager_review || {});
  renderTimelineSummary(data.recent_timeline || []);
}

function resetDailyNoteForm() {
  els.dailyNoteForm.reset();
  els.dailyNoteId.value = "";
  els.dnWorkflowStatus.value = "draft";
  els.dailyNoteAiFeedback.textContent = "Assistant review output will appear here once connected.";
}

function fillDailyNoteForm(note) {
  els.dailyNoteId.value = note.id || "";
  els.dnNoteDate.value = note.note_date || "";
  els.dnShiftType.value = note.shift_type || "";
  els.dnMood.value = note.mood || "";
  els.dnSignificance.value = note.significance || "standard";
  els.dnYoungPersonVoice.value = note.young_person_voice || "";
  els.dnPresentation.value = note.presentation || "";
  els.dnEducationUpdate.value = note.education_update || "";
  els.dnPositives.value = note.positives || "";
  els.dnHealthUpdate.value = note.health_update || "";
  els.dnFamilyUpdate.value = note.family_update || "";
  els.dnBehaviourUpdate.value = note.behaviour_update || "";
  els.dnActivities.value = note.activities || "";
  els.dnActionsRequired.value = note.actions_required || "";
  els.dnManagerReviewComment.value = note.manager_review_comment || "";
  els.dnWorkflowStatus.value = note.workflow_status || "draft";
}

function getDailyNotePayload() {
  return {
    young_person_id: state.currentYoungPersonId,
    note_date: els.dnNoteDate.value,
    shift_type: els.dnShiftType.value,
    mood: els.dnMood.value,
    significance: els.dnSignificance.value,
    young_person_voice: els.dnYoungPersonVoice.value,
    presentation: els.dnPresentation.value,
    education_update: els.dnEducationUpdate.value,
    positives: els.dnPositives.value,
    health_update: els.dnHealthUpdate.value,
    family_update: els.dnFamilyUpdate.value,
    behaviour_update: els.dnBehaviourUpdate.value,
    activities: els.dnActivities.value,
    actions_required: els.dnActionsRequired.value,
    manager_review_comment: els.dnManagerReviewComment.value,
    workflow_status: els.dnWorkflowStatus.value
  };
}

async function loadCurrentDailyNote() {
  if (!state.currentYoungPersonId) return;

  try {
    const data = await api(`/api/young-people/${state.currentYoungPersonId}/daily-notes/current`);

    if (!data || !data.id) {
      state.currentDailyNoteId = null;
      state.currentDailyNoteStatus = null;
      els.dailyNotesCurrentCard.innerHTML = `<h3>Current Working Note</h3><p>No current draft loaded.</p>`;
      els.dailyNoteStatusPanel.innerHTML = `<p class="empty-state">No active note.</p>`;
      els.dailyNoteManagerComments.innerHTML = `<p class="empty-state">No manager comments.</p>`;
      els.dailyNoteAiSuggestionsCard.classList.add("hidden");
      els.dailyNoteLinkedRecordsCard.classList.add("hidden");
      return;
    }

    state.currentDailyNoteId = data.id;
    state.currentDailyNoteStatus = data.workflow_status || "draft";

    els.dailyNotesCurrentCard.innerHTML = `
      <div class="card-row">
        <div>
          <h3>Current Working Note</h3>
          <p class="muted-text">${escapeHtml(data.note_date || "")} · ${escapeHtml(data.shift_type || "")}</p>
        </div>
        <span class="${getBadgeClass(data.workflow_status)}">${escapeHtml(data.workflow_status || "draft")}</span>
      </div>

      <div class="linked-record-card">
        <p><strong>Presentation / Mood:</strong> ${escapeHtml(data.mood || "-")}</p>
        <p><strong>Child voice:</strong> ${escapeHtml(data.young_person_voice || "-")}</p>
        <p><strong>Reflection / Actions:</strong> ${escapeHtml(data.actions_required || "-")}</p>
      </div>
    `;

    els.dailyNoteStatusPanel.innerHTML = `
      <div class="linked-record-card">
        <p><strong>Status:</strong> ${escapeHtml(data.workflow_status || "draft")}</p>
        <p><strong>Last updated:</strong> ${escapeHtml(data.updated_at || "-")}</p>
        <p><strong>Author:</strong> ${escapeHtml(data.author_name || "-")}</p>
      </div>
    `;

    els.dailyNoteManagerComments.innerHTML = data.manager_review_comment
      ? `<div class="linked-record-card"><p>${escapeHtml(data.manager_review_comment)}</p></div>`
      : `<p class="empty-state">No manager comments.</p>`;

    if (["submitted", "approved", "returned"].includes(data.workflow_status)) {
      await loadDailyNoteAssistantData(data.id);
    } else {
      els.dailyNoteAiSuggestionsCard.classList.add("hidden");
      els.dailyNoteLinkedRecordsCard.classList.add("hidden");
    }
  } catch (error) {
    console.error(error);
  }
}

async function saveDailyNote(statusOverride = null) {
  if (!state.currentYoungPersonId) {
    alert("Please select a young person first.");
    return null;
  }

  const payload = getDailyNotePayload();
  if (statusOverride) payload.workflow_status = statusOverride;

  try {
    let result;
    if (els.dailyNoteId.value) {
      result = await api(`/api/daily-notes/${els.dailyNoteId.value}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      result = await api(`/api/young-people/${state.currentYoungPersonId}/daily-notes`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    els.dailyNoteId.value = result.id;
    state.currentDailyNoteId = result.id;
    state.currentDailyNoteStatus = result.workflow_status;
    return result;
  } catch (error) {
    alert(error.message);
    return null;
  }
}

function showAssistantSuggestionsLoading() {
  els.dailyNoteAiSuggestionsCard.classList.remove("hidden");
  els.dailyNoteAiStatusBadge.textContent = "Analysing...";
  els.dailyNoteAiStatusBadge.className = "badge warning";
  els.dailyNoteAiSummary.innerHTML = "";
  els.dailyNoteAiSuggestionsList.innerHTML = `<p class="empty-state">Analysing Daily Note and preparing linked draft suggestions...</p>`;
}

function renderAssistantAnalysisSummary(analysis) {
  if (!analysis || !analysis.extracted) {
    els.dailyNoteAiStatusBadge.textContent = "No analysis";
    els.dailyNoteAiStatusBadge.className = "badge muted";
    els.dailyNoteAiSummary.innerHTML = "";
    return;
  }

  els.dailyNoteAiStatusBadge.textContent = analysis.analysis_status || "Ready";
  els.dailyNoteAiStatusBadge.className = "badge success";

  const extracted = analysis.extracted;
  const summaryItems = [
    { label: "Child voice", value: extracted.child_voice?.length || 0 },
    { label: "Risks", value: extracted.risks?.length || 0 },
    { label: "Strengths", value: extracted.strengths?.length || 0 },
    { label: "Therapeutic", value: extracted.therapeutic_strategies?.length || 0 },
    { label: "Education", value: extracted.education_issues?.length || 0 },
    { label: "Health", value: extracted.health_issues?.length || 0 },
    { label: "Family", value: extracted.family_themes?.length || 0 },
    { label: "Safeguarding", value: extracted.safeguarding_indicators?.length || 0 }
  ];

  els.dailyNoteAiSummary.innerHTML = summaryItems.map(item => `
    <div class="summary-mini-card">
      <span class="summary-mini-label">${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderAssistantSuggestions(items) {
  if (!items || !items.length) {
    els.dailyNoteAiSuggestionsList.innerHTML = `<p class="empty-state">No follow-on suggestions were generated for this note.</p>`;
    return;
  }

  els.dailyNoteAiSuggestionsList.innerHTML = items.map(item => {
    const confidenceLabel = getConfidenceLabel(item.confidence_score);
    const evidenceHtml = (item.evidence || []).length
      ? `
        <div class="ai-suggestion-evidence">
          <strong>Evidence</strong>
          ${(item.evidence || []).map(e => `<p>${escapeHtml(e.quote || e.detail || e.theme || "")}</p>`).join("")}
        </div>
      `
      : "";

    return `
      <div class="ai-suggestion-card">
        <div class="ai-suggestion-header">
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <p class="muted-text">${escapeHtml(item.rationale || "")}</p>
          </div>
          <span class="badge">${escapeHtml(confidenceLabel)}</span>
        </div>
        ${evidenceHtml}
        <div class="ai-suggestion-actions">
          <button type="button" class="btn secondary dismiss-ai-suggestion-btn" data-id="${item.id}">Dismiss</button>
          <button type="button" class="btn review-ai-suggestion-btn" data-id="${item.id}">Review Draft</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".dismiss-ai-suggestion-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api(`/api/daily-notes/${state.currentDailyNoteId}/assistant-suggestions/${btn.dataset.id}/dismiss`, {
          method: "POST"
        });
        await loadDailyNoteAssistantData(state.currentDailyNoteId);
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document.querySelectorAll(".review-ai-suggestion-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        const data = await api(`/api/daily-notes/${state.currentDailyNoteId}/assistant-suggestions/${btn.dataset.id}/accept`, {
          method: "POST"
        });
        await openLinkedDraft(data.draft_id);
        await loadDailyNoteAssistantData(state.currentDailyNoteId);
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function renderLinkedRecords(items) {
  if (!items || !items.length) {
    els.dailyNoteLinkedRecordsList.innerHTML = `<p class="empty-state">No linked records yet.</p>`;
    els.linkedRecordsSummary.innerHTML = `<p class="empty-state">No linked records loaded.</p>`;
    return;
  }

  const html = items.map(item => `
    <div class="linked-record-card">
      <p><strong>${escapeHtml(formatRecordTypeLabel(item.record_type || ""))}</strong></p>
      <p>${escapeHtml(item.created_at || "")}</p>
      <span class="${getBadgeClass(item.draft_status || "draft")}">${escapeHtml(item.draft_status || "draft")}</span>
    </div>
  `).join("");

  els.dailyNoteLinkedRecordsList.innerHTML = html;
  els.linkedRecordsSummary.innerHTML = html;
}

async function loadDailyNoteAssistantData(noteId) {
  try {
    els.dailyNoteAiSuggestionsCard.classList.remove("hidden");
    els.dailyNoteLinkedRecordsCard.classList.remove("hidden");

    const [analysis, suggestions, linked] = await Promise.all([
      api(`/api/daily-notes/${noteId}/assistant-analysis`),
      api(`/api/daily-notes/${noteId}/assistant-suggestions`),
      api(`/api/daily-notes/${noteId}/linked-records`)
    ]);

    renderAssistantAnalysisSummary(analysis);
    renderAssistantSuggestions(suggestions.items || []);
    renderLinkedRecords(linked.items || []);
  } catch (error) {
    console.error(error);
    els.dailyNoteAiStatusBadge.textContent = "Error";
    els.dailyNoteAiStatusBadge.className = "badge danger";
    els.dailyNoteAiSuggestionsList.innerHTML = `<p class="empty-state">Unable to load assistant suggestions.</p>`;
  }
}

async function openLinkedDraft(draftId) {
  const draft = await api(`/api/daily-notes/linked-drafts/${draftId}`);

  els.linkedDraftId.value = draft.id;
  els.linkedDraftType.value = draft.record_type;
  els.linkedDraftModalTitle.textContent = `Review ${formatRecordTypeLabel(draft.record_type)}`;
  els.linkedDraftSourceInfo.innerHTML = `
    <p><strong>Source Daily Note:</strong> ${escapeHtml(draft.source_note_date || "-")}</p>
    <p><strong>Status:</strong> Assistant-generated draft</p>
    <p><strong>Reminder:</strong> Staff must review and amend before saving.</p>
  `;

  const data = draft.form_data || {};
  const entries = Object.entries(data).filter(([key]) => ![
    "young_person_id",
    "source_daily_note_id",
    "source_note_date",
    "assistant_disclaimer"
  ].includes(key));

  els.linkedDraftDynamicFields.innerHTML = entries.map(([key, value]) => {
    const label = key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
    return `
      <div class="form-group">
        <label>${escapeHtml(label)}</label>
        <textarea data-field="${escapeHtml(key)}" rows="5">${escapeHtml(
          typeof value === "string" ? value : JSON.stringify(value, null, 2)
        )}</textarea>
      </div>
    `;
  }).join("");

  openModal(els.linkedDraftModal);
}

async function loadArchiveItems() {
  if (!state.currentYoungPersonId || !state.currentArchiveType) return;

  const params = new URLSearchParams();
  if (els.archiveSearchInput.value) params.set("search", els.archiveSearchInput.value);
  if (els.archiveDateFilter.value) params.set("date", els.archiveDateFilter.value);
  if (els.archiveMonthFilter.value) params.set("month", els.archiveMonthFilter.value);
  if (els.archiveYearFilter.value) params.set("year", els.archiveYearFilter.value);

  const data = await api(`/api/young-people/${state.currentYoungPersonId}/archive/${state.currentArchiveType}?${params.toString()}`);

  if (!data.items || !data.items.length) {
    els.archiveResultsList.innerHTML = `<p class="empty-state">No archived records found.</p>`;
    return;
  }

  els.archiveResultsList.innerHTML = data.items.map(item => `
    <div class="archive-result-card">
      <p><strong>${escapeHtml(item.title || item.record_title || "Archived record")}</strong></p>
      <p class="muted-text">${escapeHtml(item.record_date || "")}</p>
      <p>${escapeHtml(item.summary || "")}</p>
      <button class="btn secondary archive-open-item-btn" data-id="${item.id}">Open</button>
    </div>
  `).join("");

  document.querySelectorAll(".archive-open-item-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        const record = await api(`/api/archive/${state.currentArchiveType}/${btn.dataset.id}`);
        alert(`${record.title || "Record"}\n\n${record.summary || "Record loaded."}`);
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  els.youngPersonSelector.addEventListener("change", async () => {
    state.currentYoungPersonId = els.youngPersonSelector.value || null;
    if (!state.currentYoungPersonId) return;
    await loadYoungPersonWorkspace(state.currentYoungPersonId);
    await loadCurrentDailyNote();
  });

  [els.openDailyNoteModalBtn, els.quickDailyNoteBtn].forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!state.currentYoungPersonId) {
        alert("Please select a young person first.");
        return;
      }

      if (state.currentDailyNoteId) {
        try {
          const note = await api(`/api/daily-notes/${state.currentDailyNoteId}`);
          fillDailyNoteForm(note);
        } catch {
          resetDailyNoteForm();
        }
      } else {
        resetDailyNoteForm();
        els.dnNoteDate.value = new Date().toISOString().slice(0, 10);
      }

      openModal(els.dailyNoteModal);
    });
  });

  els.closeDailyNoteModalBtn.addEventListener("click", () => closeModal(els.dailyNoteModal));
  els.cancelDailyNoteBtn.addEventListener("click", () => closeModal(els.dailyNoteModal));

  els.dailyNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await saveDailyNote();
    if (!result) return;
    await loadCurrentDailyNote();
    closeModal(els.dailyNoteModal);
  });

  els.saveDraftDailyNoteBtn.addEventListener("click", async () => {
    const result = await saveDailyNote("draft");
    if (!result) return;
    await loadCurrentDailyNote();
    closeModal(els.dailyNoteModal);
  });

  els.submitDailyNoteBtn.addEventListener("click", async () => {
    const note = await saveDailyNote("submitted");
    if (!note) return;
    state.currentDailyNoteId = note.id;
    closeModal(els.dailyNoteModal);

    try {
      showAssistantSuggestionsLoading();
      await api(`/api/daily-notes/${note.id}/submit`, { method: "POST" });
      await api(`/api/daily-notes/${note.id}/assistant-analyse`, { method: "POST" });
      await loadCurrentDailyNote();
    } catch (error) {
      alert(error.message);
    }
  });

  els.approveDailyNoteBtn.addEventListener("click", async () => {
    const note = await saveDailyNote("approved");
    if (!note) return;
    state.currentDailyNoteId = note.id;
    closeModal(els.dailyNoteModal);

    try {
      await api(`/api/daily-notes/${note.id}/approve`, { method: "POST" });
      await api(`/api/daily-notes/${note.id}/assistant-analyse`, { method: "POST" });
      await loadCurrentDailyNote();
    } catch (error) {
      alert(error.message);
    }
  });

  els.returnDailyNoteBtn.addEventListener("click", async () => {
    const note = await saveDailyNote("returned");
    if (!note) return;
    state.currentDailyNoteId = note.id;
    closeModal(els.dailyNoteModal);

    try {
      await api(`/api/daily-notes/${note.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          manager_review_comment: els.dnManagerReviewComment.value
        })
      });
      await loadCurrentDailyNote();
    } catch (error) {
      alert(error.message);
    }
  });

  els.regenerateAiSuggestionsBtn.addEventListener("click", async () => {
    if (!state.currentDailyNoteId) return;
    try {
      showAssistantSuggestionsLoading();
      await api(`/api/daily-notes/${state.currentDailyNoteId}/assistant-analyse`, { method: "POST" });
      await loadDailyNoteAssistantData(state.currentDailyNoteId);
    } catch (error) {
      alert(error.message);
    }
  });

  els.linkedDraftForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {};
    els.linkedDraftDynamicFields.querySelectorAll("[data-field]").forEach(el => {
      formData[el.dataset.field] = el.value;
    });

    try {
      await api(`/api/daily-notes/linked-drafts/${els.linkedDraftId.value}`, {
        method: "PUT",
        body: JSON.stringify({ form_data: formData })
      });
      closeModal(els.linkedDraftModal);
      if (state.currentDailyNoteId) {
        await loadDailyNoteAssistantData(state.currentDailyNoteId);
      }
    } catch (error) {
      alert(error.message);
    }
  });

  els.closeLinkedDraftModalBtn.addEventListener("click", () => closeModal(els.linkedDraftModal));
  els.cancelLinkedDraftBtn.addEventListener("click", () => closeModal(els.linkedDraftModal));

  els.discardLinkedDraftBtn.addEventListener("click", async () => {
    try {
      await api(`/api/daily-notes/linked-drafts/${els.linkedDraftId.value}/discard`, { method: "POST" });
      closeModal(els.linkedDraftModal);
      if (state.currentDailyNoteId) {
        await loadDailyNoteAssistantData(state.currentDailyNoteId);
      }
    } catch (error) {
      alert(error.message);
    }
  });

  els.openDailyNotesArchiveBtn.addEventListener("click", async () => {
    if (!state.currentYoungPersonId) {
      alert("Please select a young person first.");
      return;
    }
    state.currentArchiveType = "daily-notes";
    els.archiveDrawerTitle.textContent = "Daily Notes Archive";
    openModal(els.archiveDrawer);
    await loadArchiveItems();
  });

  document.querySelectorAll(".archive-link-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!state.currentYoungPersonId) {
        alert("Please select a young person first.");
        return;
      }
      state.currentArchiveType = btn.dataset.archive;
      els.archiveDrawerTitle.textContent = `${formatArchiveType(btn.dataset.archive)} Archive`;
      openModal(els.archiveDrawer);
      await loadArchiveItems();
    });
  });

  els.closeArchiveDrawerBtn.addEventListener("click", () => closeModal(els.archiveDrawer));

  [els.archiveSearchInput, els.archiveDateFilter, els.archiveMonthFilter, els.archiveYearFilter].forEach(el => {
    el.addEventListener("change", loadArchiveItems);
    el.addEventListener("input", () => {
      if (el === els.archiveSearchInput) loadArchiveItems();
    });
  });

  document.getElementById("quickIncidentBtn")?.addEventListener("click", () => {
    alert("Hook this button to your incident creation flow.");
  });

  document.getElementById("quickHealthBtn")?.addEventListener("click", () => {
    alert("Hook this button to your health record flow.");
  });

  document.getElementById("quickEducationBtn")?.addEventListener("click", () => {
    alert("Hook this button to your education record flow.");
  });

  document.getElementById("quickFamilyBtn")?.addEventListener("click", () => {
    alert("Hook this button to your family record flow.");
  });

  document.getElementById("quickKeyWorkBtn")?.addEventListener("click", () => {
    alert("Hook this button to your key work flow.");
  });
}

async function init() {
  bindEvents();
  await loadYoungPeople();
}

init().catch(error => {
  console.error(error);
  alert("Unable to load the Young Person workspace.");
});
