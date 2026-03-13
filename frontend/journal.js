const API_BASE = "";

const promptsByTab = {
  overview: [
    "What am I holding today as I come into this shift?",
    "What has stood out in my practice today?",
    "What do I most want to reflect on from this shift?"
  ],
  gibbs: [
    "What happened?",
    "What were you thinking and feeling at the time?",
    "What went well and what felt difficult?",
    "Why do you think events unfolded in this way?",
    "What have you learned from this experience?",
    "What would you do the same or differently next time?"
  ],
  pace: [
    "How did I use playfulness to reduce anxiety or support connection?",
    "How did I show acceptance while still maintaining boundaries?",
    "How curious was I about what may have been underneath the behaviour?",
    "How did I communicate empathy to the young person?"
  ],
  leadership: [
    "Which leadership style best reflected my approach today?",
    "How did my leadership influence the team, the young person, or the outcome?",
    "Did I create a calm, reflective and safe culture around me?"
  ],
  impact: [
    "What was the impact on the young person?",
    "What was the impact on the team?",
    "Were there any safeguarding considerations?",
    "What support, supervision, or follow-up is needed?"
  ]
};

const fieldIds = [
  "holding_today",
  "practice_today",
  "reflection_today",
  "description",
  "feelings",
  "evaluation",
  "analysis",
  "conclusion",
  "action_plan",
  "playfulness",
  "acceptance",
  "curiosity",
  "empathy",
  "leadership_style",
  "leadership_reflection",
  "child_impact",
  "team_impact",
  "safeguarding_considerations",
  "support_needed"
];

let activeTab = "overview";
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  renderPrompts(activeTab);
  setupForm();
  setupBackToTop();
  setupActionButtons();
  setupPromptToggle();

  await loadMyContext();
  await loadJournalHistory();
});

async function loadMyContext() {
  try {
    const response = await fetch(`${API_BASE}/staff-journal/me?limit=1`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load current user");
    }

    currentUser = data.user || null;

    const staffIdEl = document.getElementById("staff_id");
    if (staffIdEl && currentUser?.id) {
      staffIdEl.value = currentUser.id;
    }

    const currentUserLabel = document.getElementById("currentUserLabel");
    if (currentUserLabel && currentUser) {
      const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim();
      const displayName = fullName || currentUser.email || "";
      currentUserLabel.textContent = displayName
        ? `Signed in as ${displayName}${currentUser.role ? ` · ${currentUser.role}` : ""}`
        : "";
    }
  } catch (error) {
    setMessage(error.message || "Could not load current user.", true);
  }
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      activeTab = tab;

      document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.remove("active");
      });

      button.classList.add("active");
      document.getElementById(`tab-${tab}`).classList.add("active");

      renderPrompts(tab);
    });
  });
}

function setupPromptToggle() {
  const toggleBtn = document.getElementById("togglePromptsBtn");
  const promptList = document.getElementById("promptList");

  if (!toggleBtn || !promptList) return;

  toggleBtn.addEventListener("click", () => {
    const hidden = promptList.style.display === "none";
    promptList.style.display = hidden ? "block" : "none";
    toggleBtn.textContent = hidden ? "Hide" : "Show";
  });
}

function renderPrompts(tab) {
  const promptList = document.getElementById("promptList");
  if (!promptList) return;

  promptList.innerHTML = "";

  (promptsByTab[tab] || []).forEach((prompt) => {
    const div = document.createElement("div");
    div.className = "prompt-item";
    div.textContent = prompt;
    promptList.appendChild(div);
  });
}

function setupBackToTop() {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupActionButtons() {
  const pdpBtn = document.getElementById("generatePdpBtn");
  const packBtn = document.getElementById("generateSupervisionPackBtn");
  const submitBtn = document.getElementById("submitSupervisionBtn");

  if (pdpBtn) {
    pdpBtn.addEventListener("click", async () => {
      await generateAiOutput("development-plan");
    });
  }

  if (packBtn) {
    packBtn.addEventListener("click", async () => {
      await generateAiOutput("supervision-pack");
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const journalId = document.getElementById("journal_id").value;

      if (!journalId) {
        setMessage("Please save the journal first before submitting for supervision.", true);
        return;
      }

      await submitToManagerDashboard(journalId);
    });
  }
}

function getPayload() {
  const payload = {};

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    payload[id] = el ? el.value : "";
  });

  return payload;
}

function fillForm(journal) {
  if (!journal) return;

  const journalIdEl = document.getElementById("journal_id");
  if (journalIdEl) journalIdEl.value = journal.id || "";

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = journal[id] || "";
  });

  setDraftState("Editing");
}

function clearJournalForm() {
  const journalIdEl = document.getElementById("journal_id");
  if (journalIdEl) journalIdEl.value = "";

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  activeTab = "overview";

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === "overview");
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  const overviewPanel = document.getElementById("tab-overview");
  if (overviewPanel) overviewPanel.classList.add("active");

  renderPrompts(activeTab);
  setDraftState("Draft");
}

function setDraftState(label) {
  const pill = document.getElementById("journalStatusPill");
  if (pill) pill.textContent = label;
}

function setMessage(text, isError = false) {
  const el = document.getElementById("journalMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#475467";
}

function setHistoryMessage(text, isError = false) {
  const el = document.getElementById("journalHistoryMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#475467";
}

function setupForm() {
  const form = document.getElementById("journalForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveBtn = document.getElementById("saveJournalBtn");
    const journalId = document.getElementById("journal_id").value;
    const payload = getPayload();
    const isEditing = Boolean(journalId);

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }

      setMessage("");

      let response;

      if (isEditing) {
        response = await fetch(`${API_BASE}/staff-journal/${journalId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/staff-journal/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to save journal");
      }

      if (isEditing) {
        if (data.journal) fillForm(data.journal);
        setMessage("Journal updated successfully.");
      } else {
        clearJournalForm();
        setMessage("Journal saved successfully.");
      }

      await loadJournalHistory();
    } catch (error) {
      setMessage(error.message || "Failed to save journal.", true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Journal";
      }
    }
  });
}

async function loadJournalHistory() {
  const historyList = document.getElementById("journalHistoryList");

  if (!historyList) return;

  try {
    setHistoryMessage("");
    historyList.innerHTML = "Loading journal entries...";

    const response = await fetch(`${API_BASE}/staff-journal/me?limit=20`, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load journal entries");
    }

    const entries = data.entries || [];
    historyList.innerHTML = "";

    if (!entries.length) {
      historyList.innerHTML = `<div class="history-item"><p>No journal entries yet.</p></div>`;
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const createdAt = entry.created_at
        ? new Date(entry.created_at).toLocaleString()
        : "Unknown date";

      const summary =
        entry.reflection_today ||
        entry.practice_today ||
        entry.description ||
        "No summary available.";

      item.innerHTML = `
        <h4>${escapeHtml(createdAt)}</h4>
        <p>${escapeHtml(summary)}</p>
        <div class="history-item-actions">
          <button class="btn btn-secondary history-edit-btn" data-id="${entry.id}" type="button">Edit</button>
          <button class="btn btn-danger history-delete-btn" data-id="${entry.id}" type="button">Delete</button>
          <button class="btn btn-accent history-submit-btn" data-id="${entry.id}" type="button">Submit for Supervision</button>
        </div>
      `;

      historyList.appendChild(item);
    });

    wireHistoryButtons();
  } catch (error) {
    historyList.innerHTML = "";
    setHistoryMessage(error.message || "Failed to load journal history.", true);
  }
}

function wireHistoryButtons() {
  document.querySelectorAll(".history-edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      try {
        const response = await fetch(`${API_BASE}/staff-journal/${id}`, {
          method: "GET",
          credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load journal");
        }

        if (data.journal) {
          fillForm(data.journal);
          window.scrollTo({ top: 0, behavior: "smooth" });
          setMessage("Journal loaded for editing.");
        }
      } catch (error) {
        setMessage(error.message || "Failed to load journal.", true);
      }
    });
  });

  document.querySelectorAll(".history-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirmed = window.confirm("Delete this journal entry?");

      if (!confirmed) return;

      try {
        const response = await fetch(`${API_BASE}/staff-journal/${id}`, {
          method: "DELETE",
          credentials: "include"
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.detail || "Failed to delete journal");
        }

        setMessage("Journal deleted successfully.");
        await loadJournalHistory();
      } catch (error) {
        setMessage(error.message || "Failed to delete journal.", true);
      }
    });
  });

  document.querySelectorAll(".history-submit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await submitToManagerDashboard(id);
    });
  });
}

async function generateAiOutput(type) {
  const output = document.getElementById("aiDevelopmentOutput");
  const pdpBtn = document.getElementById("generatePdpBtn");
  const packBtn = document.getElementById("generateSupervisionPackBtn");

  try {
    if (output) output.textContent = "Generating...";
    if (pdpBtn) pdpBtn.disabled = true;
    if (packBtn) packBtn.disabled = true;

    const endpoint = type === "supervision-pack"
      ? `${API_BASE}/staff-journal/me/supervision-pack`
      : `${API_BASE}/staff-journal/me/development-plan`;

    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to generate output");
    }

    if (output) {
      output.textContent =
        data.supervision_pack ||
        data.development_plan ||
        "No output generated.";
    }
  } catch (error) {
    if (output) {
      output.textContent = error.message || "Failed to generate output.";
    }
  } finally {
    if (pdpBtn) pdpBtn.disabled = false;
    if (packBtn) packBtn.disabled = false;
  }
}

async function submitToManagerDashboard(journalId) {
  const output = document.getElementById("aiDevelopmentOutput");
  const submitBtn = document.getElementById("submitSupervisionBtn");

  try {
    if (output) output.textContent = "Submitting to manager dashboard...";
    if (submitBtn) submitBtn.disabled = true;

    const response = await fetch(`${API_BASE}/staff-journal/${journalId}/submit-to-manager`, {
      method: "POST",
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to submit to manager dashboard");
    }

    if (output) {
      output.textContent = "Submitted to manager dashboard successfully.";
    }

    setMessage("Submitted for supervision successfully.");
  } catch (error) {
    if (output) {
      output.textContent = error.message || "Failed to submit to manager dashboard.";
    }

    setMessage(error.message || "Failed to submit for supervision.", true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
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
