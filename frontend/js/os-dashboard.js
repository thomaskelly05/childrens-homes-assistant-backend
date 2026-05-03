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
  document.querySelectorAll("[data-scope]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-scope]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentScope = btn.dataset.scope;
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
    const res = await fetch(`/os/intelligence/${currentScope}?days=${currentDays}`);
    const data = await res.json();

    if (!data.ok) {
      setStatus("Unable to load intelligence");
      return;
    }

    applyMeta();
    renderSummary(data.summary);
    renderAlerts(data.alerts);
    renderHomes(data.homes);
    renderPatterns(data.provider_patterns);
    renderActions(data.recommended_actions);
    renderEvents(data.recent_events);

    setStatus("Up to date");
  } catch (err) {
    console.error(err);
    setStatus("Error loading data");
  }
}

function applyMeta() {
  const meta = scopeMeta[currentScope] || scopeMeta.staff;
  document.getElementById("osDashboardTitle").innerText = meta.title;
  document.getElementById("osDashboardSubtitle").innerText = meta.subtitle;
}

function renderSummary(summary = {}) {
  setText("metricTotalEvents", summary.total_events);
  setText("metricIncidents", summary.incidents);
  setText("metricSafeguarding", summary.safeguarding);
  setText("metricHomes", summary.homes_visible);
}

function renderAlerts(alerts = []) {
  const el = document.getElementById("osAlertsList");

  if (!alerts.length) {
    el.innerHTML = "<p class='yp-muted'>No active alerts.</p>";
    return;
  }

  el.innerHTML = alerts.map(a => `
    <div class="yp-insight-item alert-${a.level}">
      <strong>${a.title}</strong>
      <span>${a.summary}</span>
    </div>
  `).join("");
}

function renderHomes(homes = []) {
  const el = document.getElementById("osHomesList");

  if (!homes.length) {
    el.innerHTML = "<p class='yp-muted'>No home data available.</p>";
    return;
  }

  el.innerHTML = homes.map(h => `
    <div class="os-home-card ${h.alert_level}">
      <h4>${h.home_name}</h4>
      <p>Incidents: ${h.incidents}</p>
      <p>Safeguarding: ${h.safeguarding}</p>
      <p>Missing: ${h.missing_episodes}</p>
    </div>
  `).join("");
}

function renderPatterns(patterns = []) {
  const el = document.getElementById("osPatternsList");
  el.innerHTML = patterns.map(p => `<div class="yp-insight-item"><span>${p}</span></div>`).join("");
}

function renderActions(actions = []) {
  const el = document.getElementById("osActionsList");
  el.innerHTML = actions.map(a => `<div class="yp-insight-item"><strong>${a}</strong></div>`).join("");
}

function renderEvents(events = []) {
  const el = document.getElementById("osRecentEvents");

  el.innerHTML = events.map(e => `
    <div class="os-event-item">
      <strong>${e.record_type}</strong>
      <span>${e.summary || "No summary"}</span>
    </div>
  `).join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "—";
}

function setStatus(text) {
  const el = document.getElementById("osDashboardStatus");
  if (el) el.innerText = text;
}

initDashboard();
