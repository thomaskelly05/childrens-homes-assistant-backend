import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml, formatShortDate, getDisplayName, getProfileImage, initialsFromName } from "../core/utils.js";
import { renderRowList, renderSummaryStat } from "../ui/records.js";
import {
  mapBundle,
  mapChronologyEvent,
  mapComplianceItem,
  mapDailyNote,
  mapIncident,
  mapSupportPlan,
  mapAppointment,
} from "../core/adapters.js";

function renderSection(title, subtitle, body) {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

function renderProfileCard(bundle = {}) {
  const yp = bundle.young_person || {};
  const identity = bundle.identity_profile || {};
  const communication = bundle.communication_profile || {};
  const education = bundle.education_profile || {};
  const health = bundle.health_profile || {};
  const legal = bundle.legal_status || {};

  const name = getDisplayName(yp);
  const image = getProfileImage(yp);

  return `
    <section class="profile-hero-card">
      <div class="profile-hero-top">
        <div class="profile-hero-avatar-wrap">
          ${
            image
              ? `<img class="profile-hero-avatar" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" />`
              : `<div class="profile-hero-avatar avatar-fallback">${escapeHtml(initialsFromName(name))}</div>`
          }
        </div>

        <div class="profile-hero-copy">
          <div class="profile-hero-name">${escapeHtml(name)}</div>
          <div class="profile-hero-meta">
            ${escapeHtml(
              [
                yp.preferred_name ? `Preferred: ${yp.preferred_name}` : null,
                yp.date_of_birth ? `DOB: ${formatShortDate(yp.date_of_birth)}` : null,
                yp.home_name || null,
                yp.placement_status || null,
              ].filter(Boolean).join(" • ") || "Young person profile"
            )}
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <button class="profile-card editable-card" type="button" data-open-profile-edit="identity">
          <div class="profile-card-title">About me</div>
          <div class="profile-card-text">${escapeHtml(identity.what_matters_to_me || identity.interests || "Not recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(identity.strengths_summary || "No strengths summary recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="communication">
          <div class="profile-card-title">How to support me well</div>
          <div class="profile-card-text">${escapeHtml(communication.what_helps || "Not recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(communication.communication_style || "No communication profile recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="education">
          <div class="profile-card-title">Learning</div>
          <div class="profile-card-text">${escapeHtml(education.school_name || "Not recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(education.support_summary || education.education_status || "No learning summary recorded yet.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="health">
          <div class="profile-card-title">Health and wellbeing</div>
          <div class="profile-card-text">${escapeHtml(health.mental_health_summary || health.medication_summary || "Not recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(health.allergies || "No allergies recorded.")}</div>
        </button>

        <button class="profile-card editable-card" type="button" data-open-profile-edit="legal">
          <div class="profile-card-title">Legal and care context</div>
          <div class="profile-card-text">${escapeHtml(legal.legal_status || "Not recorded yet.")}</div>
          <div class="profile-card-subtext">${escapeHtml(legal.order_type || legal.consent_arrangements || "No legal summary recorded yet.")}</div>
        </button>
      </div>
    </section>
  `;
}

function buildAlertRow(raw = {}) {
  return {
    id: raw.id,
    record_type: "alert",
    title: raw.title || raw.alert_type || "Alert",
    summary: raw.description || "Alert",
    recorded_at: raw.updated_at || raw.created_at || raw.review_date || null,
    workflow_status: raw.is_active ? "active" : "inactive",
    severity: raw.severity || "",
    source_id: raw.id,
  };
}

function buildTodayRows({ chronology = [], dailyNotes = [], incidents = [], appointments = [] }) {
  const rows = [
    ...chronology.map(mapChronologyEvent),
    ...dailyNotes.map(mapDailyNote),
    ...incidents.map(mapIncident),
    ...appointments.map(mapAppointment),
  ];

  return rows
    .sort((a, b) => {
      const aTime = new Date(
        a.event_datetime ||
        a.start_datetime ||
        a.recorded_at ||
        a.occurred_at ||
        a.record_date ||
        a.session_date ||
        0
      ).getTime();

      const bTime = new Date(
        b.event_datetime ||
        b.start_datetime ||
        b.recorded_at ||
        b.occurred_at ||
        b.record_date ||
        b.session_date ||
        0
      ).getTime();

      return bTime - aTime;
    })
    .slice(0, 8);
}

function bindOverviewActions() {
  els.viewContent?.querySelectorAll("[data-open-profile-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mod = await import("../ui/composer.js");
      mod.openComposerFor("support_plan", "create");
    });
  });
}

export async function loadOverview() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading overview...</p>
      </div>
    </div>
  `;

  const [
    youngPersonData,
    chronologyData,
    complianceData,
    alertsData,
    dailyNotesData,
    incidentsData,
    plansData,
    appointmentsData,
  ] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}`).catch(() => ({})),
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=12`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/compliance`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/alerts`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/daily-notes`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/incidents`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
  ]);

  const bundle = mapBundle(youngPersonData.bundle || youngPersonData);

  const chronologyRaw = chronologyData.timeline || chronologyData.items || [];
  const complianceRaw = complianceData.compliance_items || complianceData.items || [];
  const alertsRaw = alertsData.alerts || alertsData.items || [];
  const dailyNotesRaw = dailyNotesData.items || dailyNotesData.records || dailyNotesData.daily_notes || [];
  const incidentsRaw = incidentsData.items || incidentsData.records || incidentsData.incidents || [];
  const plansRaw = plansData.items || plansData.records || plansData.support_plans || [];
  const appointmentsRaw =
    appointmentsData.items ||
    appointmentsData.records ||
    appointmentsData.appointments ||
    appointmentsData.young_person_appointments ||
    [];

  const compliance = complianceRaw.map(mapComplianceItem);
  const alerts = alertsRaw.map(buildAlertRow);
  const plans = plansRaw.map(mapSupportPlan);
  const appointments = appointmentsRaw.map(mapAppointment);

  const immediate = [
    ...alerts,
    ...compliance.filter((item) =>
      ["overdue", "pending", "submitted", "due_soon"].includes(String(item.status || "").toLowerCase())
    ),
    ...plans.filter((item) =>
      ["draft", "pending", "review_due"].includes(String(item.status || item.workflow_status || "").toLowerCase())
    ),
  ].slice(0, 8);

  const todayRows = buildTodayRows({
    chronology: chronologyRaw,
    dailyNotes: dailyNotesRaw,
    incidents: incidentsRaw,
    appointments: appointmentsRaw,
  });

  els.viewContent.innerHTML = `
    ${renderProfileCard(bundle)}

    <section class="summary-strip">
      ${renderSummaryStat("Current view", "Overview")}
      ${renderSummaryStat("Alerts", alerts.length)}
      ${renderSummaryStat("Recent activity", chronologyRaw.length || todayRows.length)}
      ${renderSummaryStat("Checks due", compliance.length)}
    </section>

    ${renderSection(
      "Today",
      "What adults need to notice first.",
      renderRowList(todayRows, "No recent activity recorded yet.")
    )}

    ${renderSection(
      "Needs attention",
      "Outstanding follow-up, alerts and due items.",
      renderRowList(immediate, "Nothing urgent is showing right now.")
    )}

    ${renderSection(
      "Current support plans",
      "Plans adults should keep in mind today.",
      renderRowList(plans.slice(0, 6), "No current support plans found.")
    )}

    ${renderSection(
      "Upcoming appointments",
      "Important dates and appointments coming up.",
      renderRowList(appointments.slice(0, 6), "No upcoming appointments found.")
    )}
  `;

  bindOverviewActions();
}
