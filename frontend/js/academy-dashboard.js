(function () {
  const els = {
    currentUserName: document.getElementById("academyCurrentUserName"),
    currentUserRole: document.getElementById("academyCurrentUserRole"),
    refreshBtn: document.getElementById("academyRefreshBtn"),

    statMandatoryDue: document.getElementById("academyStatMandatoryDue"),
    statOverdue: document.getElementById("academyStatOverdue"),
    statWorkbooks: document.getElementById("academyStatWorkbooks"),
    statQualifications: document.getElementById("academyStatQualifications"),

    myLearningList: document.getElementById("academyMyLearningList"),
    myWorkbooksList: document.getElementById("academyMyWorkbooksList"),
    myQualificationsList: document.getElementById("academyMyQualificationsList"),
    reviewQueueList: document.getElementById("academyReviewQueueList"),
  };

  const state = {
    loading: false,
    dashboard: null,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toTitleCase(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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

  function getBadgeTone(status) {
    const safe = String(status || "").trim().toLowerCase();

    if (["completed", "accepted", "passed", "competent", "achieved"].includes(safe)) {
      return "success";
    }
    if (["overdue", "needs_amendment", "refer", "expired", "withdrawn"].includes(safe)) {
      return "danger";
    }
    if (["submitted", "under_review", "in_progress", "draft", "enrolled", "on_hold", "not_started"].includes(safe)) {
      return "warning";
    }
    return "neutral";
  }

  function renderBadge(status) {
    const label = toTitleCase(status || "unknown");
    const tone = getBadgeTone(status);
    return `<span class="academy-badge academy-badge--${tone}">${escapeHtml(label)}</span>`;
  }

  function renderCardList(items, emptyMessage, linkLabel) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">${escapeHtml(emptyMessage)}</div>`;
    }

    return items
      .map((item) => {
        const title = item.title || "Untitled";
        const subtitle = item.subtitle || "";
        const status = item.status || "";
        const dueDate = item.due_date ? formatDate(item.due_date) : "";
        const link = item.link || "#";

        return `
          <article class="academy-row-card">
            <div class="academy-row-card__title">${escapeHtml(title)}</div>
            ${
              subtitle
                ? `<div class="academy-row-card__meta">${escapeHtml(subtitle)}</div>`
                : ""
            }
            <div class="academy-row-card__meta" style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              ${status ? renderBadge(status) : ""}
              ${dueDate ? `<span>${escapeHtml(dueDate)}</span>` : ""}
            </div>
            <div style="margin-top: 12px;">
              <a class="academy-button academy-button--secondary" href="${escapeHtml(link)}">
                ${escapeHtml(linkLabel)}
              </a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function canSeeReviewQueue(role) {
    return [
      "super_admin",
      "provider_admin",
      "responsible_individual",
      "registered_manager",
      "deputy_manager",
      "manager",
      "admin",
      "trainer",
      "assessor",
      "iqa",
      "auditor",
    ].includes(String(role || "").trim().toLowerCase());
  }

  async function loadReviewQueue(role) {
    if (!els.reviewQueueList) return;

    if (!canSeeReviewQueue(role)) {
      els.reviewQueueList.innerHTML =
        '<div class="academy-empty-state">Assessment queue is available to assessor and manager roles.</div>';
      return;
    }

    try {
      const result = await apiGet("/academy/review-queue");
      const rows = result && result.data ? result.data : [];

      const items = rows.map((row) => ({
        title: row.workbook_title || "Workbook review",
        subtitle: [
          row.learner_name || "",
          row.home_name || "",
          row.workbook_code || "",
        ]
          .filter(Boolean)
          .join(" • "),
        status: row.status || row.queue_status || "under_review",
        due_date: row.due_date || null,
        link: row.submission_id
          ? `/academy/workbook-detail.html?submission_id=${encodeURIComponent(row.submission_id)}`
          : "#",
      }));

      els.reviewQueueList.innerHTML = renderCardList(
        items,
        "No review activity to show.",
        "Open review"
      );
    } catch (error) {
      console.error("[academy-dashboard] review queue failed", error);
      els.reviewQueueList.innerHTML =
        '<div class="academy-empty-state">Failed to load assessment queue.</div>';
    }
  }

  function renderDashboard(payload) {
    state.dashboard = payload;

    const user = payload.user || {};
    const stats = payload.stats || {};

    if (els.currentUserName) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
      els.currentUserName.textContent = fullName || user.email || "Unknown user";
    }

    if (els.currentUserRole) {
      els.currentUserRole.textContent = toTitleCase(user.role || "user");
    }

    if (els.statMandatoryDue) {
      els.statMandatoryDue.textContent = String(stats.mandatory_modules_due || 0);
    }

    if (els.statOverdue) {
      els.statOverdue.textContent = String(stats.mandatory_modules_overdue || 0);
    }

    if (els.statWorkbooks) {
      els.statWorkbooks.textContent = String(stats.workbooks_in_progress || 0);
    }

    if (els.statQualifications) {
      els.statQualifications.textContent = String(stats.qualifications_active || 0);
    }

    if (els.myLearningList) {
      els.myLearningList.innerHTML = renderCardList(
        payload.my_learning || [],
        "No learning items to show.",
        "Open module"
      );
    }

    if (els.myWorkbooksList) {
      els.myWorkbooksList.innerHTML = renderCardList(
        payload.my_workbooks || [],
        "No workbook activity to show.",
        "Open workbook"
      );
    }

    if (els.myQualificationsList) {
      els.myQualificationsList.innerHTML = renderCardList(
        payload.my_qualifications || [],
        "No qualifications to show.",
        "Open qualification"
      );
    }

    loadReviewQueue(user.role || "");
  }

  async function loadDashboard() {
    if (state.loading) return;
    state.loading = true;

    if (els.refreshBtn) {
      els.refreshBtn.disabled = true;
      els.refreshBtn.textContent = "Refreshing...";
    }

    try {
      const result = await apiGet("/academy/dashboard/me");
      const payload = result && result.data ? result.data : null;

      if (!payload) {
        throw new Error("No dashboard data returned.");
      }

      renderDashboard(payload);
    } catch (error) {
      console.error("[academy-dashboard] failed to load dashboard", error);

      if (els.currentUserName) {
        els.currentUserName.textContent = "Academy";
      }

      if (els.currentUserRole) {
        els.currentUserRole.textContent = "Unavailable";
      }

      if (els.myLearningList) {
        els.myLearningList.innerHTML =
          '<div class="academy-empty-state">Failed to load learning activity.</div>';
      }

      if (els.myWorkbooksList) {
        els.myWorkbooksList.innerHTML =
          '<div class="academy-empty-state">Failed to load workbook activity.</div>';
      }

      if (els.myQualificationsList) {
        els.myQualificationsList.innerHTML =
          '<div class="academy-empty-state">Failed to load qualifications.</div>';
      }

      if (els.reviewQueueList) {
        els.reviewQueueList.innerHTML =
          '<div class="academy-empty-state">Failed to load dashboard panels.</div>';
      }
    } finally {
      state.loading = false;

      if (els.refreshBtn) {
        els.refreshBtn.disabled = false;
        els.refreshBtn.textContent = "Refresh";
      }
    }
  }

  function bindEvents() {
    if (els.refreshBtn) {
      els.refreshBtn.addEventListener("click", function () {
        loadDashboard();
      });
    }
  }

  function init() {
    bindEvents();
    loadDashboard();
  }

  init();
})();
