import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import {
  mapChronologyEvent,
  mapIncident,
  mapDailyNote,
  mapHealthRecord,
  mapEducationRecord,
  mapFamilyContactRecord,
  mapAppointment,
  mapMissingEpisode,
  mapSafeguardingRecord,
  mapCommunicationRecord,
  mapTask,
  mapComplianceItem,
} from "../core/adapters.js";
import { updateWorkspaceSummaryStrip } from "../ui/workspace-summary.js";

function getCurrentScope() {
  return state.currentScope || "child";
}

function getHomeId() {
  const toSafeHomeId = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const preferredHomeId = toSafeHomeId(
    state.readinessSelectedHomeId ||
      state.homeId ||
      state.selectedHomeId ||
      state.currentUser?.home_id ||
      state.currentUser?.homeId ||
      state.selectedYoungPerson?.home_id ||
      null
  );

  const allowedHomeIds = Array.isArray(state.allowedHomeIds)
    ? state.allowedHomeIds
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    : [];

  if (allowedHomeIds.length) {
    if (preferredHomeId && allowedHomeIds.includes(preferredHomeId)) {
      return preferredHomeId;
    }
    return allowedHomeIds[0];
  }

  return preferredHomeId;
}

function getScopeEntityId() {
  if (getCurrentScope() === "child") {
    return state.youngPersonId || null;
  }

  return getHomeId();
}

function getScopeTitle() {
  const scope = getCurrentScope();

  if (scope === "home") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Home")
    );
  }

  if (scope === "quality") {
    return (
      state.currentUser?.home_name ||
      state.currentUser?.homeName ||
      (getHomeId() ? `Home ${getHomeId()}` : "Quality and RI")
    );
  }

  const person = state.selectedYoungPerson || state.youngPerson || {};
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim() ||
    person.preferred_name ||
    "Young person"
  );
}

function sortNewestFirst(items = [], keys = []) {
  return [...items].sort((a, b) => {
    const aValue = keys.map((key) => a?.[key]).find(Boolean) || 0;
    const bValue = keys.map((key) => b?.[key]).find(Boolean) || 0;
    return new Date(bValue).getTime() - new Date(aValue).getTime();
  });
}

function getTimelineDate(item = {}) {
  return (
    item.event_datetime ||
    item.occurred_at ||
    item.incident_datetime ||
    item.contact_datetime ||
    item.start_datetime ||
    item.record_date ||
    item.session_date ||
    item.recorded_at ||
    item.concern_datetime ||
    item.due_date ||
    item.created_at ||
    null
  );
}

function toText(value, fallback = "") {
  return escapeHtml(String(value ?? fallback ?? ""));
}

function formatTimelineDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTimelineRow(item = {}, overrides = {}) {
  return {
    id: item.id ?? item.source_id ?? null,
    source_id: item.source_id ?? item.id ?? null,
    source_table: item.source_table || overrides.source_table || "",
    record_type: item.record_type || overrides.record_type || "timeline_item",
    title: item.title || overrides.title || "Timeline item",
    summary: item.summary || overrides.summary || "",
    description: item.description || "",
    presentation: item.presentation || "",
    event_datetime: getTimelineDate(item),
    significance: item.significance || overrides.significance || "",
    severity: item.severity || overrides.severity || "",
    workflow_status: item.workflow_status || item.status || "",
    status: item.status || "",
    safeguarding_flag: item.safeguarding_flag || false,
    child_voice_present: item.child_voice_present || false,
    auto_generated: item.auto_generated || false,
    raw: item.raw || item,
  };
}

function buildFallbackTimeline({
  incidents = [],
  dailyNotes = [],
  healthRecords = [],
  educationRecords = [],
  familyRecords = [],
  appointments = [],
  missingEpisodes = [],
  safeguardingRecords = [],
  communications = [],
  tasks = [],
  complianceItems = [],
}) {
  return sortNewestFirst(
    [
      ...incidents.map((item) =>
        toTimelineRow(item, {
          source_table: "incidents",
          record_type: "incident",
        })
      ),
      ...dailyNotes.map((item) =>
        toTimelineRow(item, {
          source_table: "daily_notes",
          record_type: "daily_note",
        })
      ),
      ...healthRecords.map((item) =>
        toTimelineRow(item, {
          source_table: "health_records",
          record_type: "health_record",
        })
      ),
      ...educationRecords.map((item) =>
        toTimelineRow(item, {
          source_table: "education_records",
          record_type: "education_record",
        })
      ),
      ...familyRecords.map((item) =>
        toTimelineRow(item, {
          source_table: "family_contact_records",
          record_type: "family_contact",
        })
      ),
      ...appointments.map((item) =>
        toTimelineRow(item, {
          source_table: "appointments",
          record_type: "appointment",
        })
      ),
      ...missingEpisodes.map((item) =>
        toTimelineRow(item, {
          source_table: "missing_episodes",
          record_type: "missing_episode",
        })
      ),
      ...safeguardingRecords.map((item) =>
        toTimelineRow(item, {
          source_table: "safeguarding_records",
          record_type: "safeguarding_record",
        })
      ),
      ...communications.map((item) =>
        toTimelineRow(item, {
          source_table: "communications",
          record_type: "communication",
        })
      ),
      ...tasks.map((item) =>
        toTimelineRow(item, {
          source_table: "tasks",
          record_type: "task",
        })
      ),
      ...complianceItems.map((item) =>
        toTimelineRow(item, {
          source_table: "compliance_items",
          record_type: "compliance_item",
        })
      ),
    ],
    ["event_datetime", "created_at"]
  );
}

function buildPatternCounts(chronology = []) {
  const highRisk = chronology.filter((item) =>
    ["high", "critical"].includes(String(item.severity || "").toLowerCase())
  ).length;

  const safeguarding = chronology.filter((item) => item.safeguarding_flag).length;
  const childVoice = chronology.filter((item) => item.child_voice_present).length;
  const autoGenerated = chronology.filter((item) => item.auto_generated).length;

  return {
    highRisk,
    safeguarding,
    childVoice,
    autoGenerated,
  };
}

function buildRecentImportantRows(chronology = []) {
  return chronology.filter((item) => {
    const severity = String(item.severity || "").toLowerCase();
    const significance = String(item.significance || "").toLowerCase();
    const status = String(item.status || item.workflow_status || "").toLowerCase();

    return (
      ["high", "critical"].includes(severity) ||
      ["high", "critical"].includes(significance) ||
      ["overdue", "escalated"].includes(status) ||
      item.safeguarding_flag
    );
  });
}

function buildCategoryBuckets(chronology = []) {
  const incidents = chronology.filter((item) =>
    ["incident", "incidents", "missing_episode", "safeguarding_record"].includes(
      String(item.record_type || item.primary_record_type || "").toLowerCase()
    )
  );

  const health = chronology.filter((item) =>
    String(item.record_type || item.primary_record_type || "")
      .toLowerCase()
      .includes("health")
  );

  const education = chronology.filter((item) =>
    String(item.record_type || item.primary_record_type || "")
      .toLowerCase()
      .includes("education")
  );

  const family = chronology.filter((item) =>
    String(item.record_type || item.primary_record_type || "")
      .toLowerCase()
      .includes("family")
  );

  return { incidents, health, education, family };
}

function buildTopCounts({
  timelineRows = [],
  incidents = [],
  healthRecords = [],
  educationRecords = [],
}) {
  return {
    chronologyItems: timelineRows.length,
    incidents: incidents.length,
    health: healthRecords.length,
    education: educationRecords.length,
  };
}

function getRowTitle(item = {}) {
  return item.title || item.summary || "Timeline item";
}

function getRowSummary(item = {}) {
  return (
    item.summary ||
    item.description ||
    item.presentation ||
    item.note ||
    "No additional summary recorded."
  );
}

function getRowMeta(item = {}) {
  return (
    item.event_datetime ||
    item.occurred_at ||
    item.contact_datetime ||
    item.start_datetime ||
    item.record_date ||
    item.concern_datetime ||
    item.due_date ||
    item.created_at ||
    ""
  );
}

function getRowPill(item = {}) {
  const severity = String(item.severity || "").toLowerCase();
  const significance = String(item.significance || "").toLowerCase();
  const status = String(item.status || item.workflow_status || "").toLowerCase();

  if (
    ["critical", "high"].includes(severity) ||
    ["critical", "high"].includes(significance) ||
    ["overdue", "escalated"].includes(status)
  ) {
    return { label: "Needs review", tone: "warning" };
  }

  return { label: "Recorded", tone: "muted" };
}

function renderRecordRows(items = [], emptyMessage = "No timeline items found.") {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>${toText(emptyMessage)}</p>
      </div>
    `;
  }

  return `
    <div class="record-list">
      ${items
        .map((item) => {
          const pill = getRowPill(item);
          const id = item.id ?? item.record_id ?? item.source_id ?? "";
          const type = item.record_type || item.type || "";

          return `
            <article
              class="record-row"
              data-open-record="true"
              data-record-id="${toText(id)}"
              data-record-type="${toText(type)}"
              data-title="${toText(getRowTitle(item))}"
              role="button"
              tabindex="0"
            >
              <div class="record-row-main">
                <div class="record-row-title">${toText(getRowTitle(item))}</div>
                <div class="record-row-summary">${toText(getRowSummary(item))}</div>
                <div class="record-row-meta">${toText(formatTimelineDate(getRowMeta(item)))}</div>
              </div>
              <div class="record-row-side">
                <span class="row-pill ${toText(pill.tone)}">${toText(pill.label)}</span>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderPriorityList(items = [], emptyMessage = "No recent high-priority events found.") {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>${toText(emptyMessage)}</p>
      </div>
    `;
  }

  return `
    <div class="priority-list">
      ${items
        .slice(0, 4)
        .map(
          (item) => `
            <article class="priority-item">
              <strong>${toText(getRowTitle(item))}</strong>
              <p>${toText(getRowSummary(item))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimelineHtml({
  chronology = [],
  timelineRows = [],
  importantRows = [],
  buckets,
  patternCounts,
  topCounts,
}) {
  const scope = getCurrentScope();
  const title =
    scope === "child"
      ? "Timeline overview"
      : scope === "home"
      ? "Home timeline overview"
      : "Quality timeline overview";

  const subtitle =
    chronology.length
      ? "Chronology events generated and linked across the current scope."
      : "Chronology events are not available, so this view is showing a fallback timeline from linked records.";

  return `
    <section class="overview-panel">
      <div class="overview-panel-head">
        <div>
          <div class="eyebrow">Timeline</div>
          <h2>${toText(title)} • ${toText(getScopeTitle())}</h2>
          <p>${toText(subtitle)}</p>
        </div>
      </div>

      <div class="overview-grid">
        <section class="overview-main">
          <div class="overview-stats-grid">
            <article class="overview-stat-card">
              <span class="overview-stat-label">Chronology items</span>
              <strong class="overview-stat-value">${toText(topCounts.chronologyItems)}</strong>
              <span class="overview-stat-note">Timeline items available</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Incidents</span>
              <strong class="overview-stat-value">${toText(topCounts.incidents)}</strong>
              <span class="overview-stat-note">Incident-linked records</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Health</span>
              <strong class="overview-stat-value">${toText(topCounts.health)}</strong>
              <span class="overview-stat-note">Health-related items</span>
            </article>

            <article class="overview-stat-card">
              <span class="overview-stat-label">Education</span>
              <strong class="overview-stat-value">${toText(topCounts.education)}</strong>
              <span class="overview-stat-note">Education-related items</span>
            </article>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Timeline patterns</h3>
              <p>A quick picture of risk, safeguarding and how the timeline has been built.</p>
            </div>

            <div class="record-list">
              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">High-risk events</div>
                  <div class="record-row-summary">Chronology items marked high or critical.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${patternCounts.highRisk > 0 ? "warning" : "muted"}">${toText(patternCounts.highRisk)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Safeguarding-linked</div>
                  <div class="record-row-summary">Events carrying safeguarding flags.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill ${patternCounts.safeguarding > 0 ? "warning" : "muted"}">${toText(patternCounts.safeguarding)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Child voice present</div>
                  <div class="record-row-summary">Chronology items with the young person’s voice captured.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(patternCounts.childVoice)}</span>
                </div>
              </article>

              <article class="record-row">
                <div class="record-row-main">
                  <div class="record-row-title">Auto-generated</div>
                  <div class="record-row-summary">Events projected from linked records.</div>
                </div>
                <div class="record-row-side">
                  <span class="row-pill muted">${toText(patternCounts.autoGenerated)}</span>
                </div>
              </article>
            </div>
          </div>

          <div class="overview-section-card">
            <div class="overview-section-head">
              <h3>Full chronology</h3>
              <p>${
                chronology.length
                  ? "Recorded chronology events in newest-first order."
                  : "Fallback view built from incidents, notes, health, education, family, appointments, safeguarding, communication and readiness items."
              }</p>
            </div>

            ${renderRecordRows(timelineRows, "No timeline items found.")}
          </div>
        </section>

        <aside class="overview-side">
          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Important recent events</h3>
              <p>High-significance, safeguarding-linked or high-severity events to notice first.</p>
            </div>

            ${renderPriorityList(importantRows)}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent incidents in timeline</h3>
              <p>Incident-related chronology and linked events.</p>
            </div>

            ${renderRecordRows(buckets.incidents.slice(0, 8), "No incident-related timeline items found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent health-related events</h3>
              <p>Appointments, health records and related chronology items.</p>
            </div>

            ${renderRecordRows(buckets.health.slice(0, 8), "No health-related timeline items found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent education-related events</h3>
              <p>Attendance, engagement, school issues and progress in the timeline.</p>
            </div>

            ${renderRecordRows(buckets.education.slice(0, 8), "No education-related timeline items found.")}
          </section>

          <section class="overview-side-card">
            <div class="overview-section-head">
              <h3>Recent family-related events</h3>
              <p>Family contact and relationship-related items in the timeline.</p>
            </div>

            ${renderRecordRows(buckets.family.slice(0, 8), "No family-related timeline items found.")}
          </section>
        </aside>
      </div>
    </section>
  `;
}

function getTimelineEndpoints() {
  const scope = getCurrentScope();
  const id = getScopeEntityId();

  if (!id) return null;

  if (scope === "home") {
    return {
      timeline: `/homes/${id}/timeline`,
      incidents: `/homes/${id}/incidents`,
      dailyNotes: `/homes/${id}/daily-notes`,
      health: `/homes/${id}/health-records`,
      education: `/homes/${id}/education-records`,
      family: `/homes/${id}/family-contact-records`,
      appointments: `/homes/${id}/appointments`,
      missing: `/homes/${id}/missing-episodes`,
      safeguarding: `/homes/${id}/safeguarding-records`,
      communications: `/homes/${id}/communications`,
      tasks: `/homes/${id}/tasks`,
      compliance: `/homes/${id}/compliance`,
    };
  }

  if (scope === "quality") {
    return {
      timeline: `/homes/${id}/timeline`,
      incidents: `/homes/${id}/incidents`,
      dailyNotes: `/homes/${id}/daily-notes`,
      health: `/homes/${id}/health-records`,
      education: `/homes/${id}/education-records`,
      family: `/homes/${id}/family-contact-records`,
      appointments: `/homes/${id}/appointments`,
      missing: `/homes/${id}/missing-episodes`,
      safeguarding: `/homes/${id}/safeguarding-records`,
      communications: `/homes/${id}/communications`,
      tasks: `/homes/${id}/tasks`,
      compliance: `/homes/${id}/compliance`,
    };
  }

  return {
    timeline: `/young-people/${id}/timeline`,
    incidents: `/young-people/${id}/incidents`,
    dailyNotes: `/young-people/${id}/daily-notes`,
    health: `/young-people/${id}/health-records`,
    education: `/young-people/${id}/education-records`,
    family: `/young-people/${id}/family-contact-records`,
    appointments: `/young-people/${id}/appointments`,
    missing: `/young-people/${id}/missing-episodes`,
    safeguarding: `/young-people/${id}/safeguarding-records`,
    communications: `/young-people/${id}/communications`,
    tasks: `/young-people/${id}/tasks`,
    compliance: `/young-people/${id}/compliance`,
  };
}

function renderNoContext() {
  if (!els.viewContent) return;

  const message =
    getCurrentScope() === "child"
      ? "Select a young person before opening timeline."
      : "A home context is needed before timeline can load.";

  els.viewContent.innerHTML = `
    <div class="empty-state">
      <p>${toText(message)}</p>
    </div>
  `;

  updateWorkspaceSummaryStrip({
    today: "No timeline context",
    nextEvent: "No event loaded",
    lastRecord: "No timeline data",
    openActions: "No actions loaded",
  });
}

export async function loadTimeline() {
  if (!els.viewContent) return;

  const endpoints = getTimelineEndpoints();
  if (!endpoints) {
    renderNoContext();
    return;
  }

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading timeline...</p>
      </div>
    </div>
  `;

  try {
    const [
      timelineData,
      incidentsData,
      dailyNotesData,
      healthData,
      educationData,
      familyData,
      appointmentsData,
      missingData,
      safeguardingData,
      communicationsData,
      tasksData,
      complianceData,
    ] = await Promise.all([
      apiGet(endpoints.timeline).catch(() => ({ items: [] })),
      apiGet(endpoints.incidents).catch(() => ({ items: [] })),
      apiGet(endpoints.dailyNotes).catch(() => ({ items: [] })),
      apiGet(endpoints.health).catch(() => ({ items: [] })),
      apiGet(endpoints.education).catch(() => ({ items: [] })),
      apiGet(endpoints.family).catch(() => ({ items: [] })),
      apiGet(endpoints.appointments).catch(() => ({ items: [] })),
      apiGet(endpoints.missing).catch(() => ({ items: [] })),
      apiGet(endpoints.safeguarding).catch(() => ({ items: [] })),
      apiGet(endpoints.communications).catch(() => ({ items: [] })),
      apiGet(endpoints.tasks).catch(() => ({ items: [] })),
      apiGet(endpoints.compliance).catch(() => ({ items: [] })),
    ]);

    const chronology = sortNewestFirst(
      (
        timelineData.timeline ||
        timelineData.items ||
        timelineData.records ||
        timelineData.chronology_events ||
        []
      ).map(mapChronologyEvent),
      ["event_datetime", "created_at"]
    );

    const incidents = sortNewestFirst(
      (incidentsData.items || incidentsData.records || incidentsData.incidents || []).map(mapIncident),
      ["occurred_at", "incident_datetime", "created_at"]
    );

    const dailyNotes = sortNewestFirst(
      (dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || []).map(mapDailyNote),
      ["record_date", "created_at"]
    );

    const healthRecords = sortNewestFirst(
      (healthData.items || healthData.records || healthData.health_records || []).map(mapHealthRecord),
      ["event_datetime", "created_at"]
    );

    const educationRecords = sortNewestFirst(
      (educationData.items || educationData.records || educationData.education_records || []).map(mapEducationRecord),
      ["record_date", "created_at"]
    );

    const familyRecords = sortNewestFirst(
      (familyData.items || familyData.records || familyData.family_contact_records || []).map(mapFamilyContactRecord),
      ["contact_datetime", "created_at"]
    );

    const appointments = sortNewestFirst(
      (
        appointmentsData.items ||
        appointmentsData.records ||
        appointmentsData.appointments ||
        appointmentsData.young_person_appointments ||
        []
      ).map(mapAppointment),
      ["start_datetime", "created_at"]
    );

    const missingEpisodes = sortNewestFirst(
      (missingData.items || missingData.records || missingData.missing_episodes || []).map(mapMissingEpisode),
      ["start_datetime", "created_at"]
    );

    const safeguardingRecords = sortNewestFirst(
      (safeguardingData.items || safeguardingData.records || safeguardingData.safeguarding_records || []).map(
        mapSafeguardingRecord
      ),
      ["concern_datetime", "created_at"]
    );

    const communications = sortNewestFirst(
      (
        communicationsData.items ||
        communicationsData.records ||
        communicationsData.communications ||
        []
      ).map((item) => (typeof mapCommunicationRecord === "function" ? mapCommunicationRecord(item) : item)),
      ["contact_datetime", "created_at", "updated_at"]
    );

    const tasks = sortNewestFirst(
      (tasksData.items || tasksData.records || tasksData.tasks || []).map(mapTask),
      ["due_date", "created_at"]
    );

    const complianceItems = sortNewestFirst(
      (complianceData.items || complianceData.records || complianceData.compliance_items || []).map(mapComplianceItem),
      ["due_date", "created_at"]
    );

    const fallbackTimeline = buildFallbackTimeline({
      incidents,
      dailyNotes,
      healthRecords,
      educationRecords,
      familyRecords,
      appointments,
      missingEpisodes,
      safeguardingRecords,
      communications,
      tasks,
      complianceItems,
    });

    const timelineRows = chronology.length ? chronology : fallbackTimeline;
    const importantRows = buildRecentImportantRows(timelineRows).slice(0, 10);
    const buckets = buildCategoryBuckets(timelineRows);
    const patternCounts = buildPatternCounts(timelineRows);

    const topCounts = buildTopCounts({
      timelineRows,
      incidents,
      healthRecords,
      educationRecords,
    });

    els.viewContent.innerHTML = renderTimelineHtml({
      chronology,
      timelineRows,
      importantRows,
      buckets,
      patternCounts,
      topCounts,
    });

    const latest = timelineRows[0] || null;
    const nextAttention = importantRows[0] || null;

    updateWorkspaceSummaryStrip({
      today: `${timelineRows.length} timeline item${timelineRows.length === 1 ? "" : "s"}`,
      nextEvent: nextAttention
        ? `${nextAttention.title || "Priority event"}`
        : "No urgent timeline event",
      lastRecord: latest?.event_datetime
        ? `Latest ${formatTimelineDate(latest.event_datetime)}`
        : "No recent timeline record",
      openActions: `${importantRows.length} important event${importantRows.length === 1 ? "" : "s"}`,
    });
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load timeline.")}</p>
      </div>
    `;

    updateWorkspaceSummaryStrip({
      today: "Timeline unavailable",
      nextEvent: "Unable to load",
      lastRecord: "No timeline data",
      openActions: "Check API routes",
    });
  }
}