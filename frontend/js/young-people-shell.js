const state = {
  youngPersonId: null,
  youngPerson: null,
  currentView: "home",
  selectorItems: [],
  timelineCache: [],
  calendarDate: new Date(),
  selectedDate: toDateInputValue(new Date()),
  calendarMonthSummary: [],
  selectedDayRecords: [],
};

const els = {
  nav: document.getElementById("sidebarNav"),
  content: document.getElementById("viewContent"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  statusBar: document.getElementById("statusBar"),
  refreshBtn: document.getElementById("refreshBtn"),
  personName: document.getElementById("personName"),
  personMeta: document.getElementById("personMeta"),
  personAvatar: document.getElementById("personAvatar"),
  personPhoto: document.getElementById("personPhoto"),
  selectorPanel: document.getElementById("selectorPanel"),
  selectorList: document.getElementById("selectorList"),
  selectorSearch: document.getElementById("selectorSearch"),
  selectorRefreshBtn: document.getElementById("selectorRefreshBtn"),
  workspacePanel: document.getElementById("workspacePanel"),
  quickActions: document.getElementById("quickActions"),
  changePersonBtn: document.getElementById("changePersonBtn"),
};

const VIEW_CONFIG = {
  home: {
    title: "Home",
    subtitle: "What staff need most, first",
    loader: loadHome,
  },
  calendar: {
    title: "Calendar",
    subtitle: "All records by day",
    loader: loadCalendarView,
  },
  timeline: {
    title: "What happened",
    subtitle: "Chronology across all linked records",
    loader: loadTimeline,
  },
  "daily-notes": {
    title: "Daily notes",
    subtitle: "Shift-based daily recording",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/daily-notes`, "Daily notes"),
  },
  incidents: {
    title: "Incidents",
    subtitle: "Behavioural and safeguarding incidents",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/incidents`, "Incidents"),
  },
  risk: {
    title: "Current risks",
    subtitle: "Current risks and active concerns",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/risk`, "Risk assessments"),
  },
  plans: {
    title: "Plans and guidance",
    subtitle: "Support plans and guidance for staff",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/plans`, "Support plans"),
  },
  health: {
    title: "Health",
    subtitle: "Health profile, records and medication",
    loader: loadHealth,
  },
  education: {
    title: "Education",
    subtitle: "Education profile and records",
    loader: loadEducation,
  },
  family: {
    title: "Family and contact",
    subtitle: "Contacts and family contact records",
    loader: loadFamily,
  },
  keywork: {
    title: "Keywork",
    subtitle: "Keywork sessions and follow-up",
    loader: () => loadRecordList(`/young-people/${state.youngPersonId}/keywork`, "Keywork sessions"),
  },
};

function getYoungPersonId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? Number(id) : null;
}

function toDateInputValue(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthName(date) {
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

async function apiGet(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.error || message;
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(message) {
  els.statusBar.classList.remove("hidden");
  els.statusBar.textContent = message;
}

function clearError() {
  els.statusBar.classList.add("hidden");
  els.statusBar.textContent = "";
}

function setLoading(message = "Loading workspace...") {
  els.content.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function setEmpty(message = "No records found.") {
  els.content.innerHTML = `
    <div class="empty-state">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function initialsFromName(name) {
  if (!name) return "YP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "YP";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: String(value).includes("T") ? "short" : undefined,
  });
}

function formatShortTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(value) {
  const v = String(value || "").toLowerCase();
  if (["approved", "active", "recorded", "low", "completed"].includes(v)) return "success";
  if (["submitted", "pending", "medium"].includes(v)) return "warning";
  if (["returned", "high", "critical", "archived"].includes(v)) return "danger";
  return "";
}

function renderBadges(values = []) {
  const filtered = values.filter(Boolean);
  if (!filtered.length) return "";

  return `
    <div class="badge-row">
      ${filtered
        .map((value) => `<span class="badge ${statusBadgeClass(value)}">${escapeHtml(value)}</span>`)
        .join("")}
    </div>
  `;
}

function renderRecordCard(item) {
  const title = item.title || item.topic || item.contact_person || item.record_type || "Record";
  const summary = item.summary || item.narrative || item.description || "No summary available.";

  const meta = [
    item.occurred_at ? formatDate(item.occurred_at) : null,
    item.session_date ? formatDate(item.session_date) : null,
    item.worker_name || null,
    item.author_name || null,
    item.created_by_name || null,
    item.owner_name || null,
  ].filter(Boolean);

  const badges = [
    item.workflow_status,
    item.severity,
    item.status,
    item.approval_status,
  ].filter(Boolean);

  return `
    <article class="record-card">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <div class="record-meta">${escapeHtml(meta.join(" • ") || "Record")}</div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(summary)}</div>
      ${renderBadges(badges)}
    </article>
  `;
}

function renderTimelineItem(item) {
  const severityClass = `severity-${String(item.severity || "").toLowerCase()}`;
  return `
    <article class="timeline-item ${escapeHtml(severityClass)}">
      <div class="record-card-header">
        <div>
          <h4>${escapeHtml(item.title || item.event_type || "Timeline item")}</h4>
          <div class="record-meta">
            ${escapeHtml(formatDate(item.occurred_at || item.event_datetime || item.created_at))}
            ${item.event_type ? ` • ${escapeHtml(item.event_type)}` : ""}
          </div>
        </div>
      </div>
      <div class="record-body">${escapeHtml(item.summary || item.narrative || "No summary available.")}</div>
      ${renderBadges([item.severity, item.workflow_status])}
    </article>
  `;
}

function groupTimelineItems(items) {
  const groups = { today: [], thisWeek: [], earlier: [] };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  items.forEach((item) => {
    const raw = item.occurred_at || item.event_datetime || item.created_at;
    const d = new Date(raw);

    if (Number.isNaN(d.getTime())) {
      groups.earlier.push(item);
      return;
    }

    if (d >= startOfToday) groups.today.push(item);
    else if (d >= startOfWeek) groups.thisWeek.push(item);
    else groups.earlier.push(item);
  });

  return groups;
}

function renderGroupedTimelineFromItems(items) {
  const groups = groupTimelineItems(items);

  const renderGroup = (title, arr) => {
    if (!arr.length) return "";
    return `
      <div class="timeline-group">
        <div class="timeline-group-title">${escapeHtml(title)}</div>
        ${arr.map(renderTimelineItem).join("")}
      </div>
    `;
  };

  return [
    renderGroup("Today", groups.today),
    renderGroup("This week", groups.thisWeek),
    renderGroup("Earlier", groups.earlier),
  ].join("") || `<div class="empty-state">No timeline items.</div>`;
}

function updateHeaderForView(view) {
  const config = VIEW_CONFIG[view];
  els.pageTitle.textContent = config.title;
  els.pageSubtitle.textContent = config.subtitle;
}

function markActiveNav(view) {
  els.nav.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function showSelectorMode() {
  els.selectorPanel.classList.remove("hidden");
  els.workspacePanel.classList.add("hidden");
  els.refreshBtn.classList.add("hidden");
  els.pageTitle.textContent = "Select a young person";
  els.pageSubtitle.textContent = "Open a workspace to begin";
  els.personName.textContent = "No young person selected";
  els.personMeta.textContent = "Choose from the selector";
  els.personAvatar.textContent = "YP";
  els.personPhoto.classList.add("hidden");
  els.personPhoto.removeAttribute("src");
  els.personAvatar.classList.remove("hidden");
}

function hideSelectorMode() {
  els.selectorPanel.classList.add("hidden");
  els.workspacePanel.classList.remove("hidden");
  els.refreshBtn.classList.remove("hidden");
  els.quickActions.classList.remove("hidden");
}

function openYoungPerson(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("id", String(id));
  window.history.replaceState({}, "", url.toString());

  state.youngPersonId = Number(id);
  state.currentView = "home";
  state.timelineCache = [];
  state.calendarDate = new Date();
  state.selectedDate = toDateInputValue(new Date());

  hideSelectorMode();

  loadYoungPerson()
    .then(loadCurrentView)
    .catch((error) => {
      console.error(error);
      showError(error.message || "Failed to load young person.");
      setEmpty("Unable to load workspace.");
    });
}

function renderSelectorList(items) {
  if (!items.length) {
    els.selectorList.innerHTML = `<div class="selector-empty">No young people found.</div>`;
    return;
  }

  els.selectorList.innerHTML = items.map((item) => {
    const name =
      [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
      item.preferred_name ||
      "Young Person";

    const meta = [
      item.preferred_name ? `Preferred: ${item.preferred_name}` : null,
      item.placement_status || null,
      item.summary_risk_level ? `Risk: ${item.summary_risk_level}` : null,
    ].filter(Boolean).join(" • ");

    const media = item.photo_url
      ? `<img src="${escapeHtml(item.photo_url)}" class="selector-card-photo" alt="Young person photo" />`
      : `<div class="selector-card-avatar">${escapeHtml(initialsFromName(name))}</div>`;

    return `
      <article class="selector-card">
        <div class="selector-card-left">
          ${media}
          <div>
            <h4>${escapeHtml(name)}</h4>
            <p>${escapeHtml(meta || "Young person record")}</p>
          </div>
        </div>
        <button class="primary-btn" data-open-young-person="${item.id}">Open</button>
      </article>
    `;
  }).join("");
}

function filterSelectorList() {
  const term = (els.selectorSearch.value || "").trim().toLowerCase();

  if (!term) {
    renderSelectorList(state.selectorItems);
    return;
  }

  const filtered = state.selectorItems.filter((item) => {
    const haystack = [
      item.first_name,
      item.last_name,
      item.preferred_name,
      item.placement_status,
      item.summary_risk_level,
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(term);
  });

  renderSelectorList(filtered);
}

async function loadYoungPersonSelector() {
  clearError();
  showSelectorMode();

  els.selectorList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading young people...</p>
    </div>
  `;

  try {
    const data = await apiGet("/young-people");
    state.selectorItems = data.young_people || [];
    renderSelectorList(state.selectorItems);
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young people.");
    els.selectorList.innerHTML = `<div class="selector-empty">Unable to load young people.</div>`;
  }
}

async function loadYoungPerson() {
  const data = await apiGet(`/young-people/${state.youngPersonId}`);
  const youngPerson = data.young_person || data.bundle?.young_person || data;
  state.youngPerson = youngPerson;

  const fullName =
    [youngPerson.first_name, youngPerson.last_name].filter(Boolean).join(" ").trim() ||
    youngPerson.preferred_name ||
    "Young Person";

  const meta = [
    youngPerson.preferred_name ? `Preferred: ${youngPerson.preferred_name}` : null,
    youngPerson.placement_status || null,
    youngPerson.summary_risk_level ? `Risk: ${youngPerson.summary_risk_level}` : null,
  ].filter(Boolean).join(" • ");

  els.personName.textContent = fullName;
  els.personMeta.textContent = meta || "Young person record";

  if (youngPerson.photo_url) {
    els.personPhoto.src = youngPerson.photo_url;
    els.personPhoto.classList.remove("hidden");
    els.personAvatar.classList.add("hidden");
  } else {
    els.personPhoto.classList.add("hidden");
    els.personPhoto.removeAttribute("src");
    els.personAvatar.classList.remove("hidden");
    els.personAvatar.textContent = initialsFromName(fullName);
  }
}

async function loadHome() {
  setLoading("Loading home...");

  const [overviewData, timelineData, plansData, riskData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/overview`),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=50`),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/risk`).catch(() => ({ items: [] })),
  ]);

  const yp = overviewData.young_person || {};
  const counts = overviewData.dashboard_counts || {};
  const alerts = overviewData.alerts || [];
  const recent = (timelineData.timeline || []).slice(0, 12);
  const plans = (plansData.items || []).slice(0, 3);
  const risks = (riskData.items || []).slice(0, 3);

  state.timelineCache = timelineData.timeline || [];

  els.content.innerHTML = `
    <div class="grid grid-3">
      <div class="stat-card">
        <div class="stat-label">Placement status</div>
        <div class="stat-value">${escapeHtml(yp.placement_status || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Risk level</div>
        <div class="stat-value">${escapeHtml(yp.summary_risk_level || "—")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open alerts</div>
        <div class="stat-value">${escapeHtml(String(alerts.length))}</div>
      </div>
    </div>

    <div class="callout-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Alerts</h3>
            <p class="panel-subtitle">What staff need to know right now.</p>
          </div>
        </div>
        ${
          alerts.length
            ? `<div class="record-list">${alerts.map((alert) => `
                <article class="record-card">
                  <div class="record-card-header">
                    <div>
                      <h4>${escapeHtml(alert.title || "Alert")}</h4>
                      <div class="record-meta">${escapeHtml(alert.alert_type || "Alert")}</div>
                    </div>
                  </div>
                  <div class="record-body">${escapeHtml(alert.description || "No description.")}</div>
                  ${renderBadges([alert.severity, alert.is_active ? "active" : "inactive"])}
                </article>
              `).join("")}</div>`
            : `<div class="empty-state">No active alerts.</div>`
        }
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>At a glance</h3>
            <p class="panel-subtitle">Useful information for this shift.</p>
          </div>
        </div>

        <div class="mini-list">
          <div class="mini-item">
            <div class="mini-item-title">Daily notes</div>
            <div class="mini-item-subtitle">${escapeHtml(String(counts.daily_notes || 0))} recorded</div>
          </div>
          <div class="mini-item">
            <div class="mini-item-title">Incidents</div>
            <div class="mini-item-subtitle">${escapeHtml(String(counts.incidents || 0))} recorded</div>
          </div>
          <div class="mini-item">
            <div class="mini-item-title">Risk assessments</div>
            <div class="mini-item-subtitle">${escapeHtml(String(counts.risk_assessments || 0))} on file</div>
          </div>
          <div class="mini-item">
            <div class="mini-item-title">Plans</div>
            <div class="mini-item-subtitle">${escapeHtml(String(counts.support_plans || 0))} on file</div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Current risks</h3>
            <p class="panel-subtitle">Most relevant current risk records.</p>
          </div>
        </div>
        ${
          risks.length
            ? `<div class="record-list">${risks.map(renderRecordCard).join("")}</div>`
            : `<div class="empty-state">No current risk records.</div>`
        }
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Plans and guidance</h3>
            <p class="panel-subtitle">Current plans staff may need to follow.</p>
          </div>
        </div>
        ${
          plans.length
            ? `<div class="record-list">${plans.map(renderRecordCard).join("")}</div>`
            : `<div class="empty-state">No current plans.</div>`
        }
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>What happened</h3>
          <p class="panel-subtitle">Recent activity from the chronology.</p>
        </div>
      </div>
      ${
        recent.length
          ? renderGroupedTimelineFromItems(recent)
          : `<div class="empty-state">No recent activity.</div>`
      }
    </div>
  `;
}

async function loadCalendarView() {
  setLoading("Loading calendar...");

  await Promise.all([
    loadCalendarMonthSummary(),
    loadSelectedDayRecords(),
  ]);

  renderCalendarView();
}

async function loadCalendarMonthSummary() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth() + 1;

  try {
    const data = await apiGet(
      `/young-people/${state.youngPersonId}/calendar-summary?year=${year}&month=${month}`
    );
    state.calendarMonthSummary = data.days || data.items || [];
  } catch (error) {
    console.error(error);
    state.calendarMonthSummary = [];
  }
}

async function loadSelectedDayRecords() {
  try {
    const data = await apiGet(
      `/young-people/${state.youngPersonId}/records-by-date?date=${state.selectedDate}`
    );
    state.selectedDayRecords = data.items || [];
  } catch (error) {
    console.error(error);
    state.selectedDayRecords = [];
  }
}

function getMonthDayMeta(dateString) {
  return state.calendarMonthSummary.find((item) => item.date === dateString) || null;
}

function buildCalendarGrid() {
  const current = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
  const firstDay = new Date(current);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - startWeekday);

  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + i);
    const dateString = toDateInputValue(day);
    const meta = getMonthDayMeta(dateString);
    const isCurrentMonth = day.getMonth() === state.calendarDate.getMonth();
    const isToday = dateString === toDateInputValue(new Date());
    const isSelected = dateString === state.selectedDate;
    const markers = meta?.record_types || meta?.types || [];

    days.push(`
      <button
        class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}"
        data-calendar-date="${dateString}"
      >
        <div class="calendar-day-number">${day.getDate()}</div>
        <div class="calendar-day-markers">
          ${markers.slice(0, 6).map((type) => `<span class="calendar-marker marker-${escapeHtml(type)}"></span>`).join("")}
        </div>
      </button>
    `);
  }

  return days.join("");
}

function getRecordUrl(item) {
  const type = String(item.record_type || item.event_type || "").toLowerCase();
  const id = item.record_id || item.id;

  if (!id) return null;

  const map = {
    daily_note: `/young-people/daily-notes/${id}`,
    daily_notes: `/young-people/daily-notes/${id}`,
    incident: `/young-people/incidents/${id}`,
    incidents: `/young-people/incidents/${id}`,
    risk: `/young-people/risk/${id}`,
    risk_assessment: `/young-people/risk/${id}`,
    support_plan: `/young-people/plans/${id}`,
    plan: `/young-people/plans/${id}`,
    health: `/young-people/health-records/${id}`,
    health_record: `/young-people/health-records/${id}`,
    education: `/young-people/education-records/${id}`,
    education_record: `/young-people/education-records/${id}`,
    family: `/young-people/family/records/${id}`,
    family_contact: `/young-people/family/records/${id}`,
    keywork: `/young-people/keywork/${id}`,
    keywork_session: `/young-people/keywork/${id}`,
  };

  return map[type] || null;
}

function renderDayRecords(records) {
  if (!records.length) {
    return `<div class="empty-state">No records were recorded on this day.</div>`;
  }

  return records
    .map((item) => {
      const title = item.title || item.record_type || item.event_type || "Record";
      const summary = item.summary || item.narrative || item.description || "No summary available.";
      const staffName =
        item.recorded_by_name ||
        item.author_name ||
        item.created_by_name ||
        item.worker_name ||
        "Unknown";
      const recordedAt =
        item.recorded_at ||
        item.occurred_at ||
        item.event_datetime ||
        item.created_at;
      const recordUrl = getRecordUrl(item);

      return `
        <article class="day-record-card">
          <div class="day-record-top">
            <div>
              <div class="day-record-title">${escapeHtml(title)}</div>
              <div class="day-record-meta">
                ${escapeHtml(String(item.record_type || item.event_type || "record").replaceAll("_", " "))}
                • ${escapeHtml(formatShortTime(recordedAt))}
                • ${escapeHtml(staffName)}
              </div>
            </div>
            <div>
              ${renderBadges([item.workflow_status, item.severity])}
            </div>
          </div>
          <div class="day-record-summary">${escapeHtml(summary)}</div>
          ${
            recordUrl
              ? `<div class="day-record-actions"><a class="day-record-link" href="${escapeHtml(recordUrl)}">Open record</a></div>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function buildDaySummary(records) {
  const total = records.length;
  const incidents = records.filter((x) => {
    const t = String(x.record_type || x.event_type || "").toLowerCase();
    return t.includes("incident");
  }).length;
  const dailyNotes = records.filter((x) => {
    const t = String(x.record_type || x.event_type || "").toLowerCase();
    return t.includes("daily_note") || t.includes("daily note");
  }).length;

  return { total, incidents, dailyNotes };
}

function renderCalendarView() {
  const selectedDateLabel = formatDate(`${state.selectedDate}T12:00:00`);
  const summary = buildDaySummary(state.selectedDayRecords);

  els.content.innerHTML = `
    <div class="calendar-shell">
      <section class="calendar-panel">
        <div class="calendar-header">
          <div class="calendar-title">${escapeHtml(monthName(state.calendarDate))}</div>
          <div class="calendar-controls">
            <button class="calendar-icon-btn" id="calendarPrevBtn">←</button>
            <button class="calendar-icon-btn" id="calendarTodayBtn">Today</button>
            <button class="calendar-icon-btn" id="calendarNextBtn">→</button>
          </div>
        </div>

        <div class="calendar-weekdays">
          <div class="calendar-weekday">Mon</div>
          <div class="calendar-weekday">Tue</div>
          <div class="calendar-weekday">Wed</div>
          <div class="calendar-weekday">Thu</div>
          <div class="calendar-weekday">Fri</div>
          <div class="calendar-weekday">Sat</div>
          <div class="calendar-weekday">Sun</div>
        </div>

        <div class="calendar-grid">
          ${buildCalendarGrid()}
        </div>
      </section>

      <section class="day-panel">
        <div class="panel-header">
          <div>
            <h3>${escapeHtml(selectedDateLabel)}</h3>
            <p class="panel-subtitle">Everything recorded on this day.</p>
          </div>
        </div>

        <div class="day-summary-row">
          <div class="day-summary-card">
            <div class="day-summary-label">Total records</div>
            <div class="day-summary-value">${summary.total}</div>
          </div>
          <div class="day-summary-card">
            <div class="day-summary-label">Incidents</div>
            <div class="day-summary-value">${summary.incidents}</div>
          </div>
          <div class="day-summary-card">
            <div class="day-summary-label">Daily notes</div>
            <div class="day-summary-value">${summary.dailyNotes}</div>
          </div>
        </div>

        <div class="day-filter-row">
          <input id="dayRecordSearch" class="text-input" type="text" placeholder="Search this day..." />
          <select id="dayRecordType" class="select-input">
            <option value="">All record types</option>
            <option value="daily_note">Daily notes</option>
            <option value="incident">Incidents</option>
            <option value="risk">Risk</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="family">Family</option>
            <option value="keywork">Keywork</option>
            <option value="support_plan">Plans</option>
          </select>
        </div>

        <div id="dayRecordsResults">
          ${renderDayRecords(state.selectedDayRecords)}
        </div>
      </section>
    </div>
  `;

  bindCalendarEvents();
}

function bindCalendarEvents() {
  const prevBtn = document.getElementById("calendarPrevBtn");
  const nextBtn = document.getElementById("calendarNextBtn");
  const todayBtn = document.getElementById("calendarTodayBtn");
  const dayResults = document.getElementById("dayRecordsResults");
  const searchEl = document.getElementById("dayRecordSearch");
  const typeEl = document.getElementById("dayRecordType");

  async function rerenderCalendar() {
    setLoading("Loading calendar...");
    await Promise.all([loadCalendarMonthSummary(), loadSelectedDayRecords()]);
    renderCalendarView();
  }

  prevBtn.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    await rerenderCalendar();
  });

  nextBtn.addEventListener("click", async () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    await rerenderCalendar();
  });

  todayBtn.addEventListener("click", async () => {
    const today = new Date();
    state.calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    state.selectedDate = toDateInputValue(today);
    await rerenderCalendar();
  });

  els.content.querySelectorAll("[data-calendar-date]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.selectedDate = btn.dataset.calendarDate;
      const clicked = new Date(`${state.selectedDate}T12:00:00`);
      state.calendarDate = new Date(clicked.getFullYear(), clicked.getMonth(), 1);
      await rerenderCalendar();
    });
  });

  function applyDayFilters() {
    const term = (searchEl.value || "").trim().toLowerCase();
    const type = (typeEl.value || "").trim().toLowerCase();

    const filtered = state.selectedDayRecords.filter((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.narrative,
        item.description,
        item.record_type,
        item.event_type,
        item.recorded_by_name,
        item.author_name,
        item.created_by_name,
        item.worker_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const typeValue = String(item.record_type || item.event_type || "").toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesType = !type || typeValue === type;

      return matchesSearch && matchesType;
    });

    dayResults.innerHTML = renderDayRecords(filtered);
  }

  searchEl.addEventListener("input", applyDayFilters);
  typeEl.addEventListener("change", applyDayFilters);
}

async function loadTimeline() {
  setLoading("Loading timeline...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=250`);
  const items = data.timeline || [];
  state.timelineCache = items;

  renderTimelinePanel(items);
}

function renderTimelinePanel(items) {
  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>What happened</h3>
          <p class="panel-subtitle">Chronology across all linked records.</p>
        </div>
      </div>

      <div class="timeline-toolbar">
        <input id="timelineSearch" class="text-input" type="text" placeholder="Search..." />
        <select id="timelineType" class="select-input">
          <option value="">All record types</option>
          <option value="daily_note">Daily notes</option>
          <option value="incident">Incidents</option>
          <option value="risk">Risk</option>
          <option value="health">Health</option>
          <option value="education">Education</option>
          <option value="family">Family</option>
          <option value="keywork">Keywork</option>
          <option value="support_plan">Plans</option>
        </select>
      </div>

      <div id="timelineResults">
        ${items.length ? renderGroupedTimelineFromItems(items) : `<div class="empty-state">No timeline items.</div>`}
      </div>
    </div>
  `;

  const searchEl = document.getElementById("timelineSearch");
  const typeEl = document.getElementById("timelineType");
  const resultsEl = document.getElementById("timelineResults");

  function applyTimelineFilters() {
    const term = (searchEl.value || "").trim().toLowerCase();
    const type = (typeEl.value || "").trim().toLowerCase();

    const filtered = state.timelineCache.filter((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.narrative,
        item.event_type,
        item.category,
        item.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const typeValue = String(item.event_type || item.category || "").toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesType = !type || typeValue === type;

      return matchesSearch && matchesType;
    });

    resultsEl.innerHTML = filtered.length
      ? renderGroupedTimelineFromItems(filtered)
      : `<div class="empty-state">No timeline items match these filters.</div>`;
  }

  searchEl.addEventListener("input", applyTimelineFilters);
  typeEl.addEventListener("change", applyTimelineFilters);
}

async function loadRecordList(url, label) {
  setLoading(`Loading ${label.toLowerCase()}...`);

  const data = await apiGet(url);
  const items = data.items || data.timeline || data.records || [];

  if (!items.length) {
    setEmpty(`No ${label.toLowerCase()} found.`);
    return;
  }

  els.content.innerHTML = `
    <div class="record-list">
      ${items.map(renderRecordCard).join("")}
    </div>
  `;
}

async function loadHealth() {
  setLoading("Loading health...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/health`);
  const profile = data.health_profile || data.profile || {};
  const records = data.health_records || [];
  const medicationProfiles = data.medication_profiles || [];
  const medicationRecords = data.medication_records || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Health profile</h3>
          <p class="panel-subtitle">Key health information and baseline details.</p>
        </div>
      </div>
      <div class="kv">
        <div class="kv-key">GP</div><div>${escapeHtml(profile.gp_name || "—")}</div>
        <div class="kv-key">Allergies</div><div>${escapeHtml(profile.allergies || "—")}</div>
        <div class="kv-key">Diagnoses</div><div>${escapeHtml(profile.diagnoses || "—")}</div>
        <div class="kv-key">Mental health</div><div>${escapeHtml(profile.mental_health_summary || "—")}</div>
        <div class="kv-key">Medication summary</div><div>${escapeHtml(profile.medication_summary || "—")}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Health records</h3>
      ${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No health records.</div>`}
    </div>

    <div class="panel">
      <h3>Medication profiles</h3>
      ${
        medicationProfiles.length
          ? `<div class="record-list">${medicationProfiles.map((item) => `
              <article class="record-card">
                <div class="record-card-header">
                  <div>
                    <h4>${escapeHtml(item.medication_name || "Medication")}</h4>
                    <div class="record-meta">${escapeHtml(item.dosage || item.dose || "—")} • ${escapeHtml(item.frequency || "—")}</div>
                  </div>
                </div>
                <div class="record-body">${escapeHtml(item.notes || item.prn_guidance || item.reason || "No notes.")}</div>
                ${renderBadges([item.is_active ? "active" : "inactive"])}
              </article>
            `).join("")}</div>`
          : `<div class="empty-state">No medication profiles.</div>`
      }
    </div>

    <div class="panel">
      <h3>Medication records</h3>
      ${medicationRecords.length ? `<div class="record-list">${medicationRecords.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No medication records.</div>`}
    </div>
  `;
}

async function loadEducation() {
  setLoading("Loading education...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/education`);
  const profile = data.education_profile || data.profile || {};
  const records = data.education_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Education profile</h3>
          <p class="panel-subtitle">Current school and education support information.</p>
        </div>
      </div>
      <div class="kv">
        <div class="kv-key">School</div><div>${escapeHtml(profile.school_name || "—")}</div>
        <div class="kv-key">Year group</div><div>${escapeHtml(profile.year_group || "—")}</div>
        <div class="kv-key">Education status</div><div>${escapeHtml(profile.education_status || "—")}</div>
        <div class="kv-key">SEN status</div><div>${escapeHtml(profile.sen_status || "—")}</div>
        <div class="kv-key">Support summary</div><div>${escapeHtml(profile.support_summary || "—")}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Education records</h3>
      ${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No education records.</div>`}
    </div>
  `;
}

async function loadFamily() {
  setLoading("Loading family...");

  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);
  const contacts = data.contacts || [];
  const records = data.family_contact_records || data.items || [];

  els.content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Family contacts</h3>
          <p class="panel-subtitle">Approved, restricted and key family relationships.</p>
        </div>
      </div>
      ${
        contacts.length
          ? `<div class="record-list">${contacts.map((contact) => `
              <article class="record-card">
                <div class="record-card-header">
                  <div>
                    <h4>${escapeHtml(contact.full_name || "Contact")}</h4>
                    <div class="record-meta">${escapeHtml(contact.relationship_to_young_person || contact.contact_type || "Contact")}</div>
                  </div>
                </div>
                <div class="record-body">Phone: ${escapeHtml(contact.phone || "—")}
Email: ${escapeHtml(contact.email || "—")}
Notes: ${escapeHtml(contact.notes || "—")}</div>
                ${renderBadges([
                  contact.is_parental_responsibility_holder ? "parental responsibility" : null,
                  contact.is_approved_contact ? "approved" : null,
                  contact.is_restricted_contact ? "restricted" : null,
                ])}
              </article>
            `).join("")}</div>`
          : `<div class="empty-state">No family contacts.</div>`
      }
    </div>

    <div class="panel">
      <h3>Family contact records</h3>
      ${records.length ? `<div class="record-list">${records.map(renderRecordCard).join("")}</div>` : `<div class="empty-state">No family contact records.</div>`}
    </div>
  `;
}

async function loadCurrentView() {
  clearError();
  updateHeaderForView(state.currentView);
  markActiveNav(state.currentView);

  const config = VIEW_CONFIG[state.currentView];
  if (!config) {
    setEmpty("Unknown view.");
    return;
  }

  try {
    await config.loader();
  } catch (error) {
    console.error(error);
    showError(error.message || "Something went wrong.");
    setEmpty("Unable to load this workspace.");
  }
}

function bindEvents() {
  els.nav.addEventListener("click", (event) => {
    const btn = event.target.closest(".nav-btn");
    if (!btn) return;

    if (!state.youngPersonId) {
      showError("Select a young person first.");
      return;
    }

    state.currentView = btn.dataset.view;
    loadCurrentView();
  });

  els.refreshBtn.addEventListener("click", () => {
    if (!state.youngPersonId) {
      loadYoungPersonSelector();
      return;
    }

    loadYoungPerson()
      .then(loadCurrentView)
      .catch((error) => {
        console.error(error);
        showError(error.message || "Failed to refresh.");
      });
  });

  els.selectorRefreshBtn.addEventListener("click", () => {
    loadYoungPersonSelector();
  });

  els.selectorSearch.addEventListener("input", filterSelectorList);

  els.selectorList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open-young-person]");
    if (!btn) return;
    const id = Number(btn.dataset.openYoungPerson);
    if (id) openYoungPerson(id);
  });

  els.changePersonBtn.addEventListener("click", () => {
    state.youngPersonId = null;
    state.youngPerson = null;
    state.timelineCache = [];
    state.calendarMonthSummary = [];
    state.selectedDayRecords = [];
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
    loadYoungPersonSelector();
  });

  els.quickActions.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const messages = {
      "daily-note": "Next step: connect this button to your daily note modal or route.",
      incident: "Next step: connect this button to your incident modal or route.",
      risk: "Next step: connect this button to your risk editor modal or route.",
      plan: "Next step: connect this button to your support plan modal or route.",
    };

    showError(messages[action] || "Action not connected yet.");
  });
}

async function init() {
  state.youngPersonId = getYoungPersonId();
  bindEvents();

  if (!state.youngPersonId) {
    await loadYoungPersonSelector();
    return;
  }

  try {
    hideSelectorMode();
    await loadYoungPerson();
    await loadCurrentView();
  } catch (error) {
    console.error(error);
    showError(error.message || "Failed to load young person.");
    await loadYoungPersonSelector();
  }
}

init();
