(function () {
  const els = {
    error: document.getElementById("academyQualificationError"),
    list: document.getElementById("academyQualificationList"),
    countText: document.getElementById("academyQualificationCountText"),

    searchInput: document.getElementById("academyQualificationSearchInput"),
    levelFilter: document.getElementById("academyQualificationLevelFilter"),
    typeFilter: document.getElementById("academyQualificationTypeFilter"),

    applyBtn: document.getElementById("academyQualificationApplyBtn"),
    clearBtn: document.getElementById("academyQualificationClearBtn"),
    refreshBtn: document.getElementById("academyQualificationRefreshBtn"),
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

  function renderCard(item) {
    const chips = [
      item.level ? `Level ${item.level}` : "",
      item.qualification_type,
      item.awarding_body,
      item.total_credits ? `${item.total_credits} credits` : "",
    ]
      .filter(Boolean)
      .map((chip) => `<span class="academy-chip">${escapeHtml(chip)}</span>`)
      .join("");

    return `
      <article class="academy-row-card">
        <div class="academy-row-card__title">
          ${escapeHtml(item.title || "Qualification")}
        </div>

        ${
          item.description
            ? `<div class="academy-row-card__meta">${escapeHtml(item.description)}</div>`
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
            href="/academy/qualification-detail.html?id=${encodeURIComponent(item.id)}"
          >
            View qualification
          </a>
        </div>
      </article>
    `;
  }

  function renderList(rows) {
    if (!els.list) return;

    if (!Array.isArray(rows) || !rows.length) {
      els.list.innerHTML =
        '<div class="academy-empty-state">No qualifications match the selected filters.</div>';
      return;
    }

    els.list.innerHTML = rows.map(renderCard).join("");
  }

  function updateCountText(rows) {
    if (!els.countText) return;
    const count = Array.isArray(rows) ? rows.length : 0;
    els.countText.textContent =
      count === 1 ? "1 qualification found." : `${count} qualifications found.`;
  }

  function applyFilters() {
    const search = normalise(els.searchInput?.value);
    const level = normalise(els.levelFilter?.value);
    const type = normalise(els.typeFilter?.value);

    state.filteredRows = state.rows.filter((row) => {
      const haystack = [
        row.title,
        row.description,
        row.awarding_body,
        row.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesLevel = !level || String(row.level || "") === level;
      const matchesType =
        !type || normalise(row.qualification_type) === type;

      return matchesSearch && matchesLevel && matchesType;
    });

    updateCountText(state.filteredRows);
    renderList(state.filteredRows);
  }

  function clearFilters() {
    if (els.searchInput) els.searchInput.value = "";
    if (els.levelFilter) els.levelFilter.value = "";
    if (els.typeFilter) els.typeFilter.value = "";
    applyFilters();
  }

  async function loadQualifications() {
    if (state.loading) return;
    state.loading = true;

    try {
      if (els.list) {
        els.list.innerHTML =
          '<div class="academy-empty-state">Loading qualifications…</div>';
      }

      const result = await apiGet("/academy/qualifications");
      state.rows = Array.isArray(result?.data) ? result.data : [];
      applyFilters();

      if (els.error) {
        els.error.innerHTML = "";
      }
    } catch (error) {
      console.error("[academy-qualification-list] failed to load qualifications", error);

      if (els.error) {
        els.error.innerHTML = `
          <div class="academy-empty-state">
            ${escapeHtml(error.message || "Failed to load qualification catalogue.")}
          </div>
        `;
      }

      if (els.list) {
        els.list.innerHTML =
          '<div class="academy-empty-state">Unable to load qualifications.</div>';
      }

      updateCountText([]);
    } finally {
      state.loading = false;
    }
  }

  function bindEvents() {
    els.applyBtn?.addEventListener("click", applyFilters);
    els.clearBtn?.addEventListener("click", clearFilters);
    els.refreshBtn?.addEventListener("click", loadQualifications);

    els.searchInput?.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilters();
      }
    });
  }

  function init() {
    bindEvents();
    loadQualifications();
  }

  init();
})();
