(function () {
  const els = {
    pageTitle: document.getElementById("academyQualificationTitle"),
    pageSubtitle: document.getElementById("academyQualificationSubtitle"),
    metaBar: document.getElementById("academyQualificationMeta"),
    progressBar: document.getElementById("academyQualificationProgressBar"),
    progressText: document.getElementById("academyQualificationProgressText"),
    enrolmentStatus: document.getElementById("academyQualificationStatus"),
    units: document.getElementById("academyQualificationUnits"),
    error: document.getElementById("academyQualificationError"),
  };

  const state = {
    qualificationId: null,
    enrolmentId: null,
    payload: null,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
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

  function getStatusTone(status) {
    const safe = String(status || "").trim().toLowerCase();

    if (["completed", "accepted", "achieved"].includes(safe)) {
      return "success";
    }
    if (["withdrawn", "expired", "failed"].includes(safe)) {
      return "danger";
    }
    if (["enrolled", "in_progress", "on_hold", "submitted", "under_review"].includes(safe)) {
      return "warning";
    }
    return "neutral";
  }

  function renderBadge(status) {
    const tone = getStatusTone(status);
    const label = String(status || "unknown").replaceAll("_", " ");
    return `<span class="academy-badge academy-badge--${tone}">${escapeHtml(label)}</span>`;
  }

  function renderMeta(payload) {
    const parts = [
      payload.code,
      payload.qualification_type,
      payload.qualification_family,
      payload.level ? `Level ${payload.level}` : "",
      payload.awarding_body,
      payload.total_credits ? `${payload.total_credits} credits` : "",
    ].filter(Boolean);

    return parts
      .map((part) => `<span class="academy-chip">${escapeHtml(part)}</span>`)
      .join("");
  }

  function renderProgress(percent, completedUnits, totalUnits) {
    const safePercent = Number(percent || 0);
    const safeCompleted = Number(completedUnits || 0);
    const safeTotal = Number(totalUnits || 0);

    if (els.progressBar) {
      els.progressBar.style.width = `${Math.max(0, Math.min(100, safePercent))}%`;
    }

    if (els.progressText) {
      els.progressText.textContent = `${safePercent}% complete • ${safeCompleted}/${safeTotal} units completed`;
    }
  }

  function renderMappings(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No mappings linked to this unit.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.framework_name || "Framework")}</h3>
            </div>
            <p><strong>${escapeHtml(item.framework_item_code || "")}</strong> — ${escapeHtml(
              item.framework_item_name || ""
            )}</p>
            ${
              item.module_title
                ? `<p class="academy-muted">Linked module: ${escapeHtml(item.module_title)}</p>`
                : ""
            }
            ${
              item.mapping_note
                ? `<p>${escapeHtml(item.mapping_note)}</p>`
                : ""
            }
          </article>
        `
      )
      .join("");
  }

  function renderWorkbooks(items) {
    if (!Array.isArray(items) || !items.length) {
      return `<div class="academy-empty-state">No workbooks linked to this unit.</div>`;
    }

    return items
      .map(
        (item) => `
          <article class="academy-detail-card">
            <div class="academy-detail-card__header">
              <h3>${escapeHtml(item.title || "Workbook")}</h3>
            </div>
            <div class="academy-detail-card__meta">
              ${item.code ? `<span class="academy-chip">${escapeHtml(item.code)}</span>` : ""}
              ${item.workbook_type ? `<span class="academy-chip">${escapeHtml(item.workbook_type)}</span>` : ""}
            </div>
            <div style="margin-top: 12px;">
              <a class="academy-button academy-button--secondary" href="/academy/workbook-detail.html?workbook_id=${encodeURIComponent(
                item.id
              )}">
                Open workbook
              </a>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderUnit(unit, index) {
    const workbookHtml = renderWorkbooks(unit.workbooks || []);
    const mappingHtml = renderMappings(unit.mappings || []);

    return `
      <section class="academy-panel">
        <div class="academy-panel__header">
          <div>
            <h2 class="academy-panel__title">
              ${escapeHtml(unit.unit_code || `Unit ${index + 1}`)} — ${escapeHtml(unit.title || "Unit")}
            </h2>
            <p class="academy-panel__subtitle">
              ${escapeHtml(unit.summary || "")}
            </p>
          </div>
        </div>

        <div class="academy-panel__body">
          <div class="academy-chip-row" style="margin-bottom: 16px;">
            ${
              unit.mandatory
                ? '<span class="academy-badge academy-badge--primary">Mandatory</span>'
                : '<span class="academy-badge academy-badge--neutral">Optional</span>'
            }
            ${
              unit.credit_value
                ? `<span class="academy-chip">${escapeHtml(`${unit.credit_value} credits`)}</span>`
                : ""
            }
            ${
              unit.guided_learning_hours
                ? `<span class="academy-chip">${escapeHtml(`${unit.guided_learning_hours} GLH`)}</span>`
                : ""
            }
            ${
              unit.unit_group
                ? `<span class="academy-chip">${escapeHtml(unit.unit_group)}</span>`
                : ""
            }
          </div>

          <div class="academy-grid academy-grid--two">
            <div>
              <div class="academy-section__header">
                <h2 style="font-size:18px;">Linked workbooks</h2>
                <p>Workbook evidence for this unit.</p>
              </div>
              <div class="academy-stack">
                ${workbookHtml}
              </div>
            </div>

            <div>
              <div class="academy-section__header">
                <h2 style="font-size:18px;">Framework mappings</h2>
                <p>Standards and linked module alignment.</p>
              </div>
              <div class="academy-stack">
                ${mappingHtml}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderQualification(payload) {
    state.payload = payload;

    if (els.pageTitle) {
      els.pageTitle.textContent = payload.title || "Qualification";
    }

    if (els.pageSubtitle) {
      els.pageSubtitle.textContent = payload.description || "";
    }

    if (els.metaBar) {
      els.metaBar.innerHTML = renderMeta(payload);
    }

    if (els.enrolmentStatus) {
      els.enrolmentStatus.innerHTML = renderBadge(payload.enrolment_status || "not_enrolled");
    }

    renderProgress(
      payload.completion_percent || 0,
      payload.completed_units || 0,
      payload.total_units || 0
    );

    if (els.units) {
      const units = Array.isArray(payload.units) ? payload.units : [];
      els.units.innerHTML = units.length
        ? units.map((unit, index) => renderUnit(unit, index)).join("")
        : '<div class="academy-empty-state">No qualification units were returned.</div>';
    }
  }

  async function resolveQualificationId() {
    const directId = getQueryParam("id");
    if (directId) {
      return Number(directId);
    }

    const enrolmentId = getQueryParam("enrolment_id");
    if (!enrolmentId) {
      throw new Error("No qualification id or enrolment id was provided.");
    }

    state.enrolmentId = Number(enrolmentId);

    const result = await apiGet("/academy/my/qualifications");
    const rows = result && result.data ? result.data : [];

    const match = Array.isArray(rows)
      ? rows.find((row) => Number(row.id) === Number(enrolmentId))
      : null;

    if (!match || !match.qualification_id) {
      throw new Error("Could not resolve qualification from enrolment.");
    }

    return Number(match.qualification_id);
  }

  async function init() {
    try {
      state.qualificationId = await resolveQualificationId();

      const result = await apiGet(
        `/academy/qualifications/${encodeURIComponent(state.qualificationId)}`
      );

      const payload = result && result.data ? result.data : null;
      if (!payload) {
        throw new Error("No qualification payload returned.");
      }

      renderQualification(payload);
    } catch (error) {
      console.error("[academy-qualification-detail] failed to load qualification", error);
      if (els.error) {
        els.error.innerHTML = `<div class="academy-empty-state">${escapeHtml(
          error.message || "Failed to load qualification."
        )}</div>`;
      }
    }
  }

  init();
})();
