const els = {
  list: document.getElementById("academyEvidenceList"),
  error: document.getElementById("academyEvidenceError"),
  countText: document.getElementById("academyEvidenceCountText"),
  searchInput: document.getElementById("academyEvidenceSearchInput"),
  typeFilter: document.getElementById("academyEvidenceTypeFilter"),
  applyBtn: document.getElementById("academyEvidenceApplyBtn"),
  clearBtn: document.getElementById("academyEvidenceClearBtn"),
  refreshBtn: document.getElementById("academyEvidenceRefreshBtn"),
};

let state = {
  evidence: [],
  filtered: [],
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderError(message) {
  if (!els.error) return;
  els.error.innerHTML = `
    <div class="academy-alert academy-alert--error">
      ${escapeHtml(message)}
    </div>
  `;
}

function clearError() {
  if (els.error) els.error.innerHTML = "";
}

function renderEmpty(message = "No evidence found.") {
  els.list.innerHTML = `<div class="academy-empty-state">${message}</div>`;
}

function renderEvidence() {
  const items = state.filtered;

  if (!items.length) {
    renderEmpty();
    els.countText.textContent = "0 items";
    return;
  }

  els.countText.textContent = `${items.length} item${items.length !== 1 ? "s" : ""}`;

  els.list.innerHTML = items
    .map((item) => {
      const title = escapeHtml(item.title || "Evidence item");
      const description = escapeHtml(item.description || "");
      const type = escapeHtml(item.evidence_type || "unknown");
      const date = item.evidence_date || "";
      const file = item.file_url;

      return `
        <article class="academy-card">
          <div class="academy-card__body">
            <h3 class="academy-card__title">${title}</h3>

            <div class="academy-badge academy-badge--soft" style="margin-bottom: 8px;">
              ${type}
            </div>

            ${
              description
                ? `<p class="academy-card__text">${description}</p>`
                : ""
            }

            ${
              date
                ? `<div class="academy-card__meta">Date: ${date}</div>`
                : ""
            }

            ${
              file
                ? `<div class="academy-card__actions">
                    <a href="${file}" target="_blank" class="academy-button academy-button--secondary">
                      View file
                    </a>
                  </div>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function applyFilters() {
  const search = (els.searchInput.value || "").toLowerCase();
  const type = els.typeFilter.value;

  state.filtered = state.evidence.filter((item) => {
    const matchesSearch =
      !search ||
      (item.title || "").toLowerCase().includes(search) ||
      (item.description || "").toLowerCase().includes(search);

    const matchesType = !type || item.evidence_type === type;

    return matchesSearch && matchesType;
  });

  renderEvidence();
}

function clearFilters() {
  els.searchInput.value = "";
  els.typeFilter.value = "";
  state.filtered = [...state.evidence];
  renderEvidence();
}

async function loadEvidence() {
  clearError();
  renderEmpty("Loading evidence portfolio…");

  try {
    const res = await fetch("/academy/evidence/my", {
      credentials: "include",
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.detail || "Failed to load evidence.");
    }

    state.evidence = Array.isArray(json.data) ? json.data : [];
    state.filtered = [...state.evidence];

    renderEvidence();
  } catch (err) {
    console.error(err);
    renderError(err.message || "Failed to load evidence.");
    renderEmpty("Unable to load evidence.");
  }
}

function bindEvents() {
  els.applyBtn?.addEventListener("click", applyFilters);
  els.clearBtn?.addEventListener("click", clearFilters);
  els.refreshBtn?.addEventListener("click", loadEvidence);

  els.searchInput?.addEventListener("input", () => {
    applyFilters();
  });
}

function init() {
  bindEvents();
  loadEvidence();
}

document.addEventListener("DOMContentLoaded", init);
