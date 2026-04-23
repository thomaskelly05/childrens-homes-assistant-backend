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
    dashboard: null,
    loading: false,
  };

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
      const message =
        (data && data.detail) ||
        (data && data.error && data.error.message) ||
        "Request failed.";
      throw new Error(message);
    }

    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDate(value) {
    if (!value) return "No due date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getBadgeTone(status) {
    const safe = String(status || "").trim().toLowerCase();

    if (["completed", "accepted", "passed", "competent"].includes(safe)) {
      return "success";
    }
    if (["overdue", "needs_amendment", "refer", "expired"].includes(safe)) {
      return "danger";
    }
    if (["submitted", "under_review", "in_progress", "draft", "enrolled"].includes(safe)) {
      return "warning";
    }
    return "neutral";
  }

  function toTitleCase(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function renderBadge(status) {
    const label = toTitleCase(status || "unknown");
    const tone = getBadgeTone(status);
    return `<span class="academy-badge academy-badge--${tone}">${escapeHtml(label)}</span>`;
  }

  function getDefaultLink(item, linkLabel) {
    if (item && item.link) return item.link;

    const label = String(linkLabel || "").toLowerCase();

    if (label.includes("module")) return "/academy-ui";
    if (label.includes("workbook")) return "/academy-ui";
    if (label.includes("qualification")) return "/academy-ui";
    if (label.includes("review")) return "/academy-ui";

    return "/academy-ui";
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
        const link = getDefaultLink(item, linkLabel);

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
              <a class="academy-button academy-button--secondary" href="${escapeHtml(link)}">${escapeHtml(
          linkLabel
        )}</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function applyRoleVisibility(role) {
    const safeRole = String(role || "").trim().toLowerCase();
    const navItems = document.querySelectorAll("[data-nav]");

    navItems.forEach((item) => {
      const nav = item.getAttribute("data-nav");

      let visible = true;

      if (nav === "review-queue") {
        visible = [
          "super_admin",
          "provider_admin",
          "responsible_individual",
          "registered_manager",
          "deputy_manager",
          "trainer",
          "assessor",
          "iqa",
          "auditor",
        ].includes(safeRole);
      }

      if (nav === "home-compliance") {
        visible = [
          "super_admin",
          "provider_admin",
          "responsible_individual",
          "registered_manager",
          "deputy_manager",
          "auditor",
        ].includes(safeRole);
      }

      item.style.display = visible ? "" : "none";
    });
  }

  function renderDashboard(payload) {
    const user = payload.user || {};
    const stats = payload.stats || {};

    if (els.currentUserName) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
      els.currentUserName.textContent = fullName || "Unknown user";
    }

    if (els.currentUserRole) {
      els.currentUserRole.textContent = toTitleCase(user.role || "user");
    }

    applyRoleVisibility(user.role);

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
        "No active qualifications to show.",
        "Open qualification"
      );
    }

    if (els.reviewQueueList) {
      els.reviewQueueList.innerHTML = renderCardList(
        payload.review_queue || [],
        "No review activity to show.",
        "Open review"
      );
    }
  }

  function renderError(message) {
    const html = `<div class="academy-empty-state">${escapeHtml(message)}</div>`;

    if (els.myLearningList) els.myLearningList.innerHTML = html;
    if (els.myWorkbooksList) els.myWorkbooksList.innerHTML = html;
    if (els.myQualificationsList) els.myQualificationsList.innerHTML = html;
    if (els.reviewQueueList) els.reviewQueueList.innerHTML = html;
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

      state.dashboard = payload;
      renderDashboard(payload);
    } catch (error) {
      console.error("[academy] failed to load dashboard", error);
      renderError(error.message || "Failed to load academy dashboard.");
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
