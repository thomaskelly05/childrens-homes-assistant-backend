(function () {
  const els = {
    error: document.getElementById("academyModuleCatalogueError"),
    list: document.getElementById("academyModuleCatalogueList"),
    countText: document.getElementById("academyModuleCatalogueCountText"),

    searchInput: document.getElementById("academyModuleSearchInput"),
    typeFilter: document.getElementById("academyModuleTypeFilter"),
    difficultyFilter: document.getElementById("academyModuleDifficultyFilter"),
    familyFilter: document.getElementById("academyModuleFamilyFilter"),

    applyBtn: document.getElementById("academyModuleCatalogueApplyBtn"),
    clearBtn: document.getElementById("academyModuleCatalogueClearBtn"),
    refreshBtn: document.getElementById("academyModuleCatalogueRefreshBtn"),
  };

  const state = {
    rows: [],
    filteredRows: [],
    loading: false,
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

  function normalise(value) {
    return String(value || "").trim().toLowerCase();
  }

  function renderCard(module) {
    const chips = [
      module.code,
      module.learning_type,
      module.difficulty_level,
      module.module_family,
      module.delivery_mode,
      module.estimated_minutes ? `${module.estimated_minutes} mins` : "",
    ]
      .filter(Boolean)
      .map(
        (item) => `<span class="academy-chip">${escapeHtml(item)}</span>`
      )
      .join("");

    return `
      <article class="academy-row-card">
        <div class="academy-row-card__title">
          ${escapeHtml(module.title || "Module")}
        </div>

        ${
          module.summary
            ? `<div class="academy-row-card__meta">${escapeHtml(module.summary)}</div>`
            : ""
        }

        ${
          chips
            ? `<div class="academy-chip-row" style="margin-top: 12px;">${chips}</div>`
            : ""
        }

        <div style="margin-top: 14px;">
          <a
            class="academy-button academy-button--secondary"
            href="/academy/module-detail.html?id=${encodeURIComponent(module.id)}"
          >
            Open module
          </a>
        </div>
      </article>
    `;
  }

  function renderList(rows) {
    if (!els.list) return;

    if (!Array.isArray(rows) || !rows.length) {
      els.list.innerHTML =
        '<div class="academy-empty-state">No modules match the selected filters.</div>';
      return;
    }

    els.list.innerHTML = rows.map(renderCard).join("");
  }

  function updateCountText(rows) {
    if (!els.countText) return;
    const count = Array.isArray(rows) ? rows.length : 0;
    els.countText.textContent =
      count === 1 ? "1 module found." : `${count} modules found.`;
  }

  function applyFilters() {
    const search = normalise(els.searchInput?.value);
    const type = normalise(els.typeFilter?.value);
    const difficulty = normalise(els.difficultyFilter?.value);
    const family = normalise(els.familyFilter?.value);

    state.filteredRows = state.rows.filter((row) => {
      const haystack = [
        row.title,
        row.summary,
        row.description,
        row.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesType = !type || normalise(row.learning_type) === type;
      const matchesDifficulty =
        !difficulty || normalise(row.difficulty_level) === difficulty;
      const matchesFamily =
        !family || normalise(row.module_family) === family;

      return (
        matchesSearch &&
        matchesType &&
        matchesDifficulty &&
        matchesFamily
      );
    });

    updateCountText(state.filteredRows);
    renderList(state.filteredRows);
  }

  function clearFilters() {
    if (els.searchInput) els.searchInput.value = "";
    if (els.typeFilter) els.typeFilter.value = "";
    if (els.difficultyFilter) els.difficultyFilter.value = "";
    if (els.familyFilter) els.familyFilter.value = "";
    applyFilters();
  }

  async function loadModules() {
    if (state.loading) return;
    state.loading = true;

    try {
      if (els.list) {
        els.list.innerHTML =
          '<div class="academy-empty-state">Loading learning catalogue…</div>';
      }

      const result = await apiGet("/academy/modules");
      state.rows = Array.isArray(result?.data) ? result.data : [];
      applyFilters();

      if (els.error) {
        els.error.innerHTML = "";
      }
    } catch (error) {
      console.error("[academy-module-list] failed to load modules", error);

      if (els.error) {
        els.error.innerHTML = `
          <div class="academy-empty-state">
            ${escapeHtml(error.message || "Failed to load module catalogue.")}
          </div>
        `;
      }

      if (els.list) {
        els.list.innerHTML =
          '<div class="academy-empty-state">Unable to load modules.</div>';
      }

      updateCountText([]);
    } finally {
      state.loading = false;
    }
  }

  function bindEvents() {
    els.applyBtn?.addEventListener("click", applyFilters);
    els.clearBtn?.addEventListener("click", clearFilters);
    els.refreshBtn?.addEventListener("click", loadModules);

    els.searchInput?.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilters();
      }
    });
  }

  function init() {
    bindEvents();
    loadModules();
  }

  init();
})();
