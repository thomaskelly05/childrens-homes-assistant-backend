(function () {
  const els = {
    modules: document.getElementById("academyModulesList"),
    qualifications: document.getElementById("academyQualificationsList"),
    error: document.getElementById("academyListError"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function apiGet(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        (data && (data.detail || data.error)) || "Request failed"
      );
    }

    return data;
  }

  function renderModuleCard(module) {
    return `
      <article class="academy-card">
        <div class="academy-card__header">
          <h3>${escapeHtml(module.title || "Module")}</h3>
        </div>

        <p class="academy-card__text">
          ${escapeHtml(module.summary || "")}
        </p>

        <div class="academy-card__meta">
          ${
            module.learning_type
              ? `<span class="academy-chip">${escapeHtml(module.learning_type)}</span>`
              : ""
          }
          ${
            module.difficulty_level
              ? `<span class="academy-chip">${escapeHtml(module.difficulty_level)}</span>`
              : ""
          }
          ${
            module.estimated_minutes
              ? `<span class="academy-chip">${escapeHtml(module.estimated_minutes)} mins</span>`
              : ""
          }
        </div>

        <div class="academy-card__actions">
          <a class="academy-button" href="/academy/module-detail.html?id=${module.id}">
            Open module
          </a>
        </div>
      </article>
    `;
  }

  function renderQualificationCard(q) {
    return `
      <article class="academy-card">
        <div class="academy-card__header">
          <h3>${escapeHtml(q.title || "Qualification")}</h3>
        </div>

        <p class="academy-card__text">
          ${escapeHtml(q.description || "")}
        </p>

        <div class="academy-card__meta">
          ${
            q.level
              ? `<span class="academy-chip">Level ${escapeHtml(q.level)}</span>`
              : ""
          }
          ${
            q.awarding_body
              ? `<span class="academy-chip">${escapeHtml(q.awarding_body)}</span>`
              : ""
          }
        </div>

        <div class="academy-card__actions">
          <a class="academy-button" href="/academy/qualification-detail.html?id=${q.id}">
            View qualification
          </a>
        </div>
      </article>
    `;
  }

  async function loadModules() {
    try {
      const result = await apiGet("/academy/modules");
      const rows = result?.data || [];

      if (!els.modules) return;

      els.modules.innerHTML = rows.length
        ? rows.map(renderModuleCard).join("")
        : `<div class="academy-empty-state">No modules available.</div>`;
    } catch (error) {
      console.error("Modules load failed", error);
      if (els.modules) {
        els.modules.innerHTML =
          '<div class="academy-empty-state">Failed to load modules.</div>';
      }
    }
  }

  async function loadQualifications() {
    try {
      const result = await apiGet("/academy/qualifications");
      const rows = result?.data || [];

      if (!els.qualifications) return;

      els.qualifications.innerHTML = rows.length
        ? rows.map(renderQualificationCard).join("")
        : `<div class="academy-empty-state">No qualifications available.</div>`;
    } catch (error) {
      console.error("Qualifications load failed", error);
      if (els.qualifications) {
        els.qualifications.innerHTML =
          '<div class="academy-empty-state">Failed to load qualifications.</div>';
      }
    }
  }

  async function init() {
    try {
      await Promise.all([loadModules(), loadQualifications()]);
    } catch (error) {
      console.error("Academy init failed", error);
      if (els.error) {
        els.error.innerHTML = `<div class="academy-empty-state">${escapeHtml(
          error.message || "Failed to load academy"
        )}</div>`;
      }
    }
  }

  init();
})();
