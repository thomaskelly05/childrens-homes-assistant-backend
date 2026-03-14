window.addEventListener("load", async () => {
  bindNavigation();
  bindLogout();
  bindIncidentReportForm();
  bindDocumentForm();

  try {
    await loadInitialWorkspace();
  } catch (error) {
    showAppError(error.message || "Failed to load workspace");
  }

  if (window.initChat) {
    window.initChat();
  }

  if (window.initAssistantMeetingModal) {
    window.initAssistantMeetingModal();
  }

  if (window.createConversation) {
    window.createConversation();
  }

  if (window.loadConversations) {
    window.loadConversations();
  }
});


function bindNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      activateView(view);
    });
  });
}


function bindLogout() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("current_user");

      try {
        await apiRequest("/auth/logout", {
          method: "POST"
        });
      } catch (_) {
        // ignore logout API failure
      }

      window.location.href = "/login";
    } catch (_) {
      window.location.href = "/login";
    }
  });
}


function bindIncidentReportForm() {
  const form = document.getElementById("incidentReportForm");
  const output = document.getElementById("incidentReportOutput");

  if (!form || !output) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const description = document.getElementById("incidentDescription")?.value?.trim();

    if (!description) {
      output.innerHTML = `<p class="error-text">Please enter an incident description.</p>`;
      return;
    }

    output.innerHTML = `<p>Generating report...</p>`;

    try {
      const data = await apiRequest("/reports/incident", {
        method: "POST",
        body: JSON.stringify({ description })
      });

      output.innerHTML = `
        <div class="result-card">
          <h4>Generated Incident Report</h4>
          <pre class="output-pre">${escapeHtml(data.report || "No report returned.")}</pre>
        </div>
      `;
    } catch (error) {
      output.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
    }
  });
}


function bindDocumentForm() {
  const form = document.getElementById("documentForm");
  const output = document.getElementById("documentOutput");

  if (!form || !output) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const type = document.getElementById("documentType")?.value;
    const description = document.getElementById("documentDescription")?.value?.trim();

    if (!type || !description) {
      output.innerHTML = `<p class="error-text">Please complete all document fields.</p>`;
      return;
    }

    output.innerHTML = `<p>Generating document...</p>`;

    try {
      const response = await apiRequest(`/documents/${type}`, {
        method: "POST",
        body: JSON.stringify({ description })
      });

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      output.innerHTML = `
        <div class="result-card">
          <h4>Document ready</h4>
          <p>Your document has been generated successfully.</p>
          <a class="button" href="${downloadUrl}" download>Download document</a>
        </div>
      `;
    } catch (error) {
      output.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
    }
  });
}


async function loadInitialWorkspace() {
  hideAppError();
  setLoading(true);

  const token = localStorage.getItem("access_token");

  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const account = await loadAccount();
    setUserBadge(account);
    renderAccount(account);
  } catch (error) {
    setLoading(false);
    showAppError(error.message || "Failed to load account");
    return;
  }

  await Promise.allSettled([
    loadTasks(),
    loadHandover(),
    loadLatestJournal()
  ]);

  activateView("dashboard");
  setLoading(false);
}


async function loadAccount() {
  const account = await apiRequest("/account/me");

  const summary = document.getElementById("accountSummary");
  if (summary) {
    summary.innerHTML = `
      <p><strong>Email:</strong> ${escapeHtml(account.email || "-")}</p>
      <p><strong>Role:</strong> ${escapeHtml(account.role || "-")}</p>
      <p><strong>Home ID:</strong> ${escapeHtml(String(account.home_id ?? "-"))}</p>
    `;
  }

  return account;
}


function renderAccount(account) {
  const accountDetails = document.getElementById("accountDetails");
  if (!accountDetails) return;

  accountDetails.innerHTML = `
    <div class="stack">
      <p><strong>ID:</strong> ${escapeHtml(String(account.id ?? "-"))}</p>
      <p><strong>Email:</strong> ${escapeHtml(account.email || "-")}</p>
      <p><strong>Role:</strong> ${escapeHtml(account.role || "-")}</p>
      <p><strong>Home ID:</strong> ${escapeHtml(String(account.home_id ?? "-"))}</p>
    </div>
  `;
}


function setUserBadge(account) {
  const userBadge = document.getElementById("userBadge");
  if (!userBadge) return;

  userBadge.textContent = `${account.email || "User"}${account.role ? ` • ${account.role}` : ""}`;
}


async function loadTasks() {
  const preview = document.getElementById("tasksPreview");
  const list = document.getElementById("tasksList");

  try {
    const tasks = await apiRequest("/tasks/");
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    if (preview) {
      preview.innerHTML = renderTasksPreview(safeTasks);
    }

    if (list) {
      list.innerHTML = renderTasksList(safeTasks);
    }
  } catch (error) {
    if (preview) preview.innerHTML = `<p class="error-text">Could not load tasks.</p>`;
    if (list) list.innerHTML = `<p class="error-text">Could not load tasks.</p>`;
  }
}


async function loadHandover() {
  const preview = document.getElementById("handoverPreview");
  const list = document.getElementById("handoverList");

  try {
    const notes = await apiRequest("/handover/");
    const safeNotes = Array.isArray(notes) ? notes : [];

    if (preview) {
      preview.innerHTML = renderHandoverPreview(safeNotes);
    }

    if (list) {
      list.innerHTML = renderHandoverList(safeNotes);
    }
  } catch (error) {
    if (preview) {
      preview.innerHTML = `<p class="error-text">Could not load handover notes.</p>`;
    }

    if (list) {
      list.innerHTML = `<p class="error-text">Could not load handover notes.</p>`;
    }
  }
}


async function loadLatestJournal() {
  const preview = document.getElementById("journalPreview");

  if (!preview) return;

  try {
    const data = await apiRequest("/staff-journal/me/latest");
    const journal = data.journal;

    if (!journal) {
      preview.innerHTML = `<p>No journal entries yet.</p>`;
      return;
    }

    preview.innerHTML = `
      <div class="stack">
        <p><strong>ID:</strong> ${escapeHtml(String(journal.id ?? "-"))}</p>
        <p><strong>Date:</strong> ${escapeHtml(formatDate(journal.created_at))}</p>
        <p>${escapeHtml(summariseObject(journal))}</p>
      </div>
    `;
  } catch (error) {
    if ((error.message || "").toLowerCase().includes("no journal")) {
      preview.innerHTML = `<p>No journal entries yet.</p>`;
      return;
    }

    preview.innerHTML = `<p class="error-text">Could not load journal preview.</p>`;
  }
}


function activateView(viewName) {
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  const viewMap = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Overview of your workspace"
    },
    chat: {
      title: "Assistant",
      subtitle: "AI support for staff workflows"
    },
    tasks: {
      title: "Tasks",
      subtitle: "View current tasks"
    },
    handover: {
      title: "Handover",
      subtitle: "Recent handover notes"
    },
    journal: {
      title: "Staff Journal",
      subtitle: "Create and review journal entries"
    },
    supervision: {
      title: "Supervision",
      subtitle: "Review supervision submissions"
    },
    reports: {
      title: "Reports",
      subtitle: "Generate structured written reports"
    },
    documents: {
      title: "Documents",
      subtitle: "Generate downloadable staff documents"
    },
    account: {
      title: "My Account",
      subtitle: "Your account details"
    }
  };

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.add("hidden");
  });

  const activeView = document.getElementById(`${viewName}View`);
  if (activeView) {
    activeView.classList.remove("hidden");
  }

  if (pageTitle && viewMap[viewName]) {
    pageTitle.textContent = viewMap[viewName].title;
  }

  if (pageSubtitle && viewMap[viewName]) {
    pageSubtitle.textContent = viewMap[viewName].subtitle;
  }
}


function setLoading(isLoading) {
  const loadingState = document.getElementById("loadingState");

  if (loadingState) {
    loadingState.classList.toggle("hidden", !isLoading);
  }
}


function showAppError(message) {
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  const loadingState = document.getElementById("loadingState");

  if (loadingState) {
    loadingState.classList.add("hidden");
  }

  if (errorMessage) {
    errorMessage.textContent = message;
  }

  if (errorState) {
    errorState.classList.remove("hidden");
  }
}


function hideAppError() {
  const errorState = document.getElementById("errorState");
  if (errorState) {
    errorState.classList.add("hidden");
  }
}


function renderTasksPreview(tasks) {
  if (!tasks.length) {
    return `<p>No tasks found.</p>`;
  }

  return `
    <ul class="simple-list">
      ${tasks.slice(0, 5).map((task) => `
        <li>
          <strong>${escapeHtml(task.title || "Untitled task")}</strong>
          <span>${task.completed ? "Completed" : "Open"}</span>
        </li>
      `).join("")}
    </ul>
  `;
}


function renderTasksList(tasks) {
  if (!tasks.length) {
    return `<p>No tasks available.</p>`;
  }

  return `
    <ul class="simple-list">
      ${tasks.map((task) => `
        <li>
          <div><strong>${escapeHtml(task.title || "Untitled task")}</strong></div>
          <div>Status: ${task.completed ? "Completed" : "Open"}</div>
          <div>Created: ${escapeHtml(formatDate(task.created_at))}</div>
        </li>
      `).join("")}
    </ul>
  `;
}


function renderHandoverPreview(notes) {
  if (!notes.length) {
    return `<p>No handover notes found.</p>`;
  }

  return `
    <ul class="simple-list">
      ${notes.slice(0, 3).map((note) => `
        <li>
          <strong>${escapeHtml(formatDate(note.created_at))}</strong>
          <div>${escapeHtml((note.note || "").slice(0, 100))}${(note.note || "").length > 100 ? "..." : ""}</div>
        </li>
      `).join("")}
    </ul>
  `;
}


function renderHandoverList(notes) {
  if (!notes.length) {
    return `<p>No handover notes available.</p>`;
  }

  return `
    <ul class="simple-list">
      ${notes.map((note) => `
        <li>
          <div><strong>${escapeHtml(formatDate(note.created_at))}</strong></div>
          <div>${escapeHtml(note.note || "")}</div>
        </li>
      `).join("")}
    </ul>
  `;
}


function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB");
}


function summariseObject(obj) {
  if (!obj || typeof obj !== "object") return "-";

  const ignoredKeys = new Set(["id", "staff_id", "created_at", "updated_at"]);
  const parts = [];

  Object.entries(obj).forEach(([key, value]) => {
    if (ignoredKeys.has(key)) return;
    if (value === null || value === undefined || value === "") return;
    parts.push(`${key}: ${String(value)}`);
  });

  return parts.join(" | ").slice(0, 240) || "Journal entry available.";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
