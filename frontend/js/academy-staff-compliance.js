(function () {
  const els = {
    staffList: document.getElementById("staffList"),
    errorBox: document.getElementById("errorBox"),
    refreshBtn: document.getElementById("refreshBtn"),
  };

  async function apiGet(url) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.detail || "Request failed");
    }

    return data;
  }

  function renderCard(user) {
    return `
      <div class="academy-card">
        <div class="academy-card__header">
          <h3 class="academy-card__title">
            ${user.name || "Unknown"}
          </h3>
          <div class="academy-card__meta">
            ${user.role || ""}
          </div>
        </div>

        <div class="academy-card__body">
          <div class="academy-progress-shell">
            <div class="academy-progress">
              <div class="academy-progress__bar" style="width:${user.compliance_percent || 0}%"></div>
            </div>
            <div class="academy-progress-text">
              ${user.compliance_percent || 0}% compliant
            </div>
          </div>

          <div class="academy-card__meta">
            Mandatory due: ${user.mandatory_due || 0}
          </div>

          <div class="academy-card__meta">
            Overdue: ${user.overdue || 0}
          </div>

          <div class="academy-card__actions">
            <a href="/academy?user_id=${user.id}" class="academy-button academy-button--secondary">
              View details
            </a>
          </div>
        </div>
      </div>
    `;
  }

  async function load() {
    els.errorBox.innerHTML = "";

    try {
      const res = await apiGet("/academy/compliance/home/1");
      const rows = res?.data || [];

      if (!rows.length) {
        els.staffList.innerHTML =
          '<div class="academy-empty-state">No staff compliance data.</div>';
        return;
      }

      els.staffList.innerHTML = rows.map(renderCard).join("");

    } catch (err) {
      console.error(err);
      els.errorBox.innerHTML =
        '<div class="academy-alert academy-alert--error">Failed to load compliance.</div>';
    }
  }

  if (els.refreshBtn) {
    els.refreshBtn.addEventListener("click", load);
  }

  load();
})();