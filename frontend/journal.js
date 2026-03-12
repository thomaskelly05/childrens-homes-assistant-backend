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

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  renderPrompts(activeTab);
  setupForm();
  setupBackToTop();
  setupAiButtons();
  loadLatestJournal();
  loadJournalHistory();
});

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

function renderPrompts(tab) {
  const promptList = document.getElementById("promptList");
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
  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupAiButtons() {
  const pdpBtn = document.getElementById("generatePdpBtn");
  const packBtn = document.getElementById("generateSupervisionPackBtn");

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
}

function getPayload() {
  const payload = {
    staff_id: Number(document.getElementById("staff_id").value)
  };

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    payload[id] = el ? el.value : "";
  });

  return payload;
}

function fillForm(journal) {
  if (!journal) return;

  document.getElementById("journal_id").value = journal.id || "";
  document.getElementById("staff_id").value = journal.staff_id || "1";

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.value = journal[id] || "";
    }
  });
}

function setMessage(text, isError = false) {
  const el = document.getElementById("journalMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#374151";
}

function setHistoryMessage(text, isError = false) {
  const el = document.getElementById("journalHistoryMessage");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b91c1c" : "#374151";
}

function setupForm() {
  const form = document.getElementById("journalForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveBtn = document.getElementById("saveJournalBtn");
    const journalId = document.getElementById("journal_id").value;
    const payload = getPayload();

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      setMessage("");

      let response;

      if (journalId) {
        const updatePayload = { ...payload };
        delete updatePayload.staff_id;

        response = await fetch(`${API_BASE}/staff-journal/${journalId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(updatePayload)
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

      if (data.journal) {
        fillForm(data.journal);
      }

      setMessage("Journal saved successfully.");
      await loadJournalHistory();
    } catch (error) {
      setMessage(error.message || "Failed to save journal.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Journal";
    }
  });
}

async function loadLatestJournal() {
  const staffId = document.getElementById("staff_id").value || "1";

  try {
    const response = await fetch(`${API_BASE}/staff-journal/staff/${staffId}/latest`, {
      method: "GET",
      credentials: "include"
    });

    if (response.status === 404) {
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load journal");
    }

    if (data.journal) {
      fillForm(data.journal);
    }
  } catch (error) {
    setMessage(error.message || "Failed to load journal.", true);
  }
}

async function loadJournalHistory() {
  const staffId = document.getElementById("staff_id").value || "1";
  const historyList = document.getElementById("journalHistoryList");

  if (!historyList) return;

  try {
    setHistoryMessage("");
    historyList.innerHTML = "Loading journal entries...";

    const response = await fetch(`${API_BASE}/staff-journal/staff/${staffId}?limit=20`, {
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
      historyList.innerHTML = "<div class='journal-history-item'><p>No journal entries yet.</p></div>";
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "journal-history-item";

      const createdAt = entry.created_at
        ? new Date(entry.created_at).toLocaleString()
        : "Unknown date";

      item.innerHTML = `
        <h4>${createdAt}</h4>
        <p>${escapeHtml(
          entry.reflection_today ||
          entry.practice_today ||
          entry.description ||
          "No summary available for this entry."
        )}</p>
      `;

      historyList.appendChild(item);
    });
  } catch (error) {
    historyList.innerHTML = "";
    setHistoryMessage(error.message || "Failed to load journal history.", true);
  }
}

async function generateAiOutput(type) {
  const staffId = document.getElementById("staff_id").value || "1";
  const output = document.getElementById("aiDevelopmentOutput");
  const pdpBtn = document.getElementById("generatePdpBtn");
  const packBtn = document.getElementById("generateSupervisionPackBtn");

  try {
    if (output) {
      output.textContent = "Generating...";
    }

    if (pdpBtn) pdpBtn.disabled = true;
    if (packBtn) packBtn.disabled = true;

    const endpoint = type === "supervision-pack"
      ? `${API_BASE}/staff-journal/staff/${staffId}/supervision-pack`
      : `${API_BASE}/staff-journal/staff/${staffId}/development-plan`;

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
