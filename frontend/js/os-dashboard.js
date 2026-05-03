let currentScope = "staff";
let currentDays = 30;

const scopeMeta = {
  staff: {
    title: "Staff daily view",
    subtitle: "Focus on what needs to happen today for children in your care.",
  },
  manager: {
    title: "Manager home view",
    subtitle: "Whole-home oversight, patterns and safeguarding focus.",
  },
  ri: {
    title: "Responsible Individual oversight",
    subtitle: "Multi-home assurance, safeguarding and compliance signals.",
  },
  provider: {
    title: "Provider intelligence view",
    subtitle: "Cross-home patterns, risk comparison and leadership focus.",
  },
};

function initDashboard() {
  bindScopeButtons();
  bindWindowSelector();
  loadDashboard();
}

function bindScopeButtons() {
  document.querySelectorAll("[data-scope]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-scope]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentScope = btn.dataset.scope || "staff";
      loadDashboard();
    });
  });
}

function bindWindowSelector() {
  const select = document.getElementById("osWindowDays");
  if (!select) return;
  select.addEventListener("change", () => {
    currentDays = Number(select.value || 30);
    loadDashboard();
  });
}

async function loadDashboard() {
  setStatus("Loading intelligence…");

  try {
    const res = await fetch(`/os/intelligence/${currentScope}?days=${currentDays}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await res.json();

    if (!data.ok) {
      setStatus(data.detail || "Unable to load intelligence");
      return;
    }

    applyMeta();
    renderRiskScore(data.risk_score, data.risk_band);
    renderSummary(data.summary || {});
    renderAlerts(data.alerts || []);
    renderHomes(data.ranked_homes || data.homes || []);
    renderHighRiskHomes(data.high_risk_homes || []);
    renderTrends(data.trends || []);
    renderPatterns(data.provider_patterns || []);
    renderActions(data.recommended_actions || []);
    renderEvents(data.recent_events || []);

    setStatus("Up to date");
  } catch (err) {
    console.error(err);
    setStatus("Error loading data");
  }
}

function applyMeta() {
  const meta = scopeMeta[currentScope] || scopeMeta.staff;
  setText("osDashboardTitle", meta.title);
  setText("osDashboardSubtitle", meta.subtitle);
}

function renderRiskScore(score = 0, band = "review") {
  const safeScore = Math.max(0, Math.min(Number(score || 0), 100));
  const safeBand = String(band || "review").toLowerCase();
  const card = document.getElementById("osRiskScoreCard");
  const fill = document.getElementById("osRiskMeterFill");

  setText("metricRiskScore", safeScore);
  setText("metricRiskBand", `${safeBand.toUpperCase()} risk level`);

  if (card) {
    card.classList.remove("high", "warning", "review");
    card.classList.add(safeBand);
  }

  if (fill) {
    fill.style.width = `${safeScore}%`;
  }
}

function renderSummary(summary = {}) {
  setText("metricTotalEvents", summary.total_events);
  setText("metricIncidents", summary.incidents);
  setText("metricSafeguarding", summary.safeguarding);
  setText("metricHighRiskHomes", summary.high_risk_homes);
}

function renderAlerts(alerts = []) {
  const el = document.getElementById("osAlertsList");
  if (!el) return;

  if (!alerts.length) {
    el.innerHTML = "<p class='yp-muted'>No active alerts in this review window.</p>";
    return;
  }

  el.innerHTML = alerts.map((a) => `
    <div class="yp-insight-item os-alert-item alert-${escapeHtml(a.level || "review")}">
      <strong>${escapeHtml(a.title || "Alert")}</strong>
      <span>${escapeHtml(a.summary || "Review required")}</span>
    </div>
  `).join("");
}

function renderHomes(homes = []) {
  const el = document.getElementById("osHomesList");
  if (!el) return;

  if (!homes.length) {
    el.innerHTML = "<p class='yp-muted'>No home data available for this scope.</p>";
    return;
  }

  el.innerHTML = homes.map((h, index) => {
    const score = Math.max(0, Math.min(Number(h.risk_score || 0), 100));
    const band = String(h.alert_level || "review").toLowerCase();
    return `
      <article class="os-home-card ${escapeHtml(band)}">
        <div class="os-home-rank">${index + 1}</div>
        <div class="os-home-main">
          <div class="os-home-header">
            <h4>${escapeHtml(h.home_name || "Unknown home")}</h4>
            <strong>${score}/100</strong>
          </div>
          <div class="os-home-meter"><span style="width:${score}%"></span></div>
          <div class="os-home-stats">
            <span>Incidents <b>${number(h.incidents)}</b></span>
            <span>Safeguarding <b>${number(h.safeguarding)}</b></span>
            <span>Missing <b>${number(h.missing_episodes)}</b></span>
            <span>Plans <b>${number(h.support_plans)}</b></span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderHighRiskHomes(homes = []) {
  const el = document.getElementById("osHighRiskHomes");
  if (!el) return;

  if (!homes.length) {
    el.innerHTML = "<p class='yp-muted'>No homes are currently scoring as high risk.</p>";
    return;
  }

  el.innerHTML = homes.slice(0, 6).map((h) => `
    <div class="yp-insight-item alert-high">
      <strong>${escapeHtml(h.home_name || "Unknown home")} — ${number(h.risk_score)}/100</strong>
      <span>${number(h.safeguarding)} safeguarding, ${number(h.incidents)} incidents, ${number(h.missing_episodes)} missing episode(s).</span>
    </div>
  `).join("");
}

function renderTrends(trends = []) {
  const el = document.getElementById("osTrendChart");
  if (!el) return;

  if (!trends.length) {
    el.innerHTML = "<p class='yp-muted'>No trend data available.</p>";
    return;
  }

  const max = Math.max(1, ...trends.map((t) => Number(t.total || 0)));
  el.innerHTML = trends.map((t) => {
    const total = Number(t.total || 0);
    const width = Math.max(3, Math.round((total / max) * 100));
    return `
      <div class="os-trend-row">
        <span>${escapeHtml(t.label || "Window")}</span>
        <div class="os-trend-bars">
          <i class="os-bar total" style="width:${width}%"></i>
        </div>
        <small>${total} records · ${number(t.incidents)} inc · ${number(t.safeguarding)} safe · ${number(t.missing_episodes)} missing</small>
      </div>
    `;
  }).join("");
}

function renderPatterns(patterns = []) {
  const el = document.getElementById("osPatternsList");
  if (!el) return;

  if (!patterns.length) {
    el.innerHTML = "<p class='yp-muted'>No patterns detected yet.</p>";
    return;
  }

  el.innerHTML = patterns.map((p) => `<div class="yp-insight-item"><span>${escapeHtml(p)}</span></div>`).join("");
}

function renderActions(actions = []) {
  const el = document.getElementById("osActionsList");
  if (!el) return;

  if (!actions.length) {
    el.innerHTML = "<p class='yp-muted'>No recommended actions available.</p>";
    return;
  }

  el.innerHTML = actions.map((a) => `<div class="yp-insight-item"><strong>${escapeHtml(a)}</strong></div>`).join("");
}

function renderEvents(events = []) {
  const el = document.getElementById("osRecentEvents");
  if (!el) return;

  if (!events.length) {
    el.innerHTML = "<p class='yp-muted'>No recent evidence found.</p>";
    return;
  }

  el.innerHTML = events.slice(0, 20).map((e) => `
    <div class="os-event-item">
      <strong>${escapeHtml(e.record_type || "record")}</strong>
      <span>${escapeHtml(e.summary || "No summary")}</span>
      <small>${escapeHtml(e.event_date || "")}</small>
    </div>
  `).join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "—";
}

function setStatus(value) {
  const el = document.getElementById("osDashboardStatus");
  if (el) el.innerText = value;
}

function number(value) {
  return Number(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

initDashboard();
