(function () {
  const els = {
    list: document.getElementById("academyCertificatesList"),
    countText: document.getElementById("academyCertificatesCountText"),
    error: document.getElementById("academyCertificatesError"),

    searchInput: document.getElementById("academyCertificatesSearchInput"),
    typeFilter: document.getElementById("academyCertificatesTypeFilter"),

    applyBtn: document.getElementById("academyCertificatesApplyBtn"),
    clearBtn: document.getElementById("academyCertificatesClearBtn"),
    refreshBtn: document.getElementById("academyCertificatesRefreshBtn"),
  };

  const state = {
    loading: false,
    certificates: [],
    filtered: [],
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  async function apiGet(url) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error(data?.detail || data?.error || "Request failed");
    }

    return data;
  }

  function renderCertificates() {
    if (!els.list) return;

    if (!state.filtered.length) {
      els.list.innerHTML =
        '<div class="academy-empty-state">No certificates found.</div>';
      return;
    }

    els.list.innerHTML = state.filtered
      .map((c) => {
        return `
          <article class="academy-row-card">
            <div class="academy-row-card__title">
              ${escapeHtml(c.title || "Certificate")}
            </div>

            <div class="academy-row-card__meta">
              ${escapeHtml(c.certificate_number || "")}
            </div>

            <div class="academy-row-card__meta" style="margin-top:8px;">
              ${c.issued_at ? `Issued: ${formatDate(c.issued_at)}` : ""}
            </div>

            <div style="margin-top:12px; display:flex; gap:8px;">
              ${
                c.file_url
                  ? `<a class="academy-button" href="${escapeHtml(
                      c.file_url
                    )}" target="_blank">View</a>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");

    if (els.countText) {
      els.countText.textContent = `${state.filtered.length} certificate(s)`;
    }
  }

  function applyFilters() {
    const search = (els.searchInput?.value || "").toLowerCase();
    const type = (els.typeFilter?.value || "").toLowerCase();

    state.filtered = state.certificates.filter((c) => {
      const title = (c.title || "").toLowerCase();
      const number = (c.certificate_number || "").toLowerCase();
      const certType = (c.certificate_type || "").toLowerCase();

      if (search && !title.includes(search) && !number.includes(search)) {
        return false;
      }

      if (type && certType !== type) {
        return false;
      }

      return true;
    });

    renderCertificates();
  }

  function clearFilters() {
    if (els.searchInput) els.searchInput.value = "";
    if (els.typeFilter) els.typeFilter.value = "";

    state.filtered = [...state.certificates];
    renderCertificates();
  }

  async function loadCertificates() {
    if (state.loading) return;
    state.loading = true;

    try {
      const res = await apiGet("/academy/my/certificates");
      const rows = res?.data || [];

      state.certificates = rows;
      state.filtered = [...rows];

      renderCertificates();
    } catch (err) {
      console.error("[academy-certificates] load failed", err);

      if (els.error) {
        els.error.innerHTML =
          '<div class="academy-error">Failed to load certificates.</div>';
      }

      if (els.list) {
        els.list.innerHTML =
          '<div class="academy-empty-state">Unable to load certificates.</div>';
      }
    } finally {
      state.loading = false;
    }
  }

  function bindEvents() {
    els.applyBtn?.addEventListener("click", applyFilters);
    els.clearBtn?.addEventListener("click", clearFilters);
    els.refreshBtn?.addEventListener("click", loadCertificates);
  }

  function init() {
    bindEvents();
    loadCertificates();
  }

  init();
})();
