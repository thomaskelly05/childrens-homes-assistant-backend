import { childWorkspaceMenu } from "./care-hub-child-context.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[char]);
}

function findChildSection(sectionId = "about") {
  return childWorkspaceMenu().find((item) => item.id === sectionId) || childWorkspaceMenu()[0] || null;
}

function sectionEndpoint(childId, sectionId) {
  const map = {
    about: `/young-people/${encodeURIComponent(childId)}`,
    "daily-life": `/young-people/${encodeURIComponent(childId)}/daily-notes`,
    "feeling-safe": `/young-people/${encodeURIComponent(childId)}/risk`,
    "support-plans": `/young-people/${encodeURIComponent(childId)}/support-plans`,
    "health-wellbeing": `/young-people/${encodeURIComponent(childId)}/health`,
    learning: `/young-people/${encodeURIComponent(childId)}/education`,
    relationships: `/young-people/${encodeURIComponent(childId)}/family`,
    keywork: `/young-people/${encodeURIComponent(childId)}/keywork`,
    "significant-moments": `/young-people/${encodeURIComponent(childId)}/incidents`,
    "time-away-from-home": `/young-people/${encodeURIComponent(childId)}/missing`,
    "progress-reviews": `/young-people/${encodeURIComponent(childId)}/reviews`,
    "life-story": `/young-people/${encodeURIComponent(childId)}/life-story`,
    documents: `/young-people/${encodeURIComponent(childId)}/documents`,
    communication: `/young-people/${encodeURIComponent(childId)}/communication`,
    "child-next-steps": `/young-people/${encodeURIComponent(childId)}/actions`,
  };
  return map[sectionId] || map.about;
}

async function fetchSectionData(childId, sectionId) {
  if (!childId) return null;
  const response = await fetch(sectionEndpoint(childId, sectionId), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load ${sectionId}.`);
  return response.json();
}

function normaliseRecords(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  return data.items || data.records || data.data || data.daily_notes || data.health_records || data.education_records || data.incidents || data.actions || [];
}

function firstText(record, keys, fallback = "No detail recorded yet.") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function recordDate(record = {}) {
  return firstText(record, ["created_at", "updated_at", "note_date", "record_date", "event_datetime", "incident_datetime", "appointment_datetime"], "");
}

function renderRecord(record = {}) {
  const title = firstText(record, ["title", "summary", "presentation", "record_type", "incident_type", "contact_type"], "Record");
  const body = firstText(record, ["body", "summary", "presentation", "details", "note", "action_taken", "outcome"]);
  const date = recordDate(record);
  return `
    <article class="ops-record-preview">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
      ${date ? `<small>${escapeHtml(date)}</small>` : ""}
    </article>
  `;
}

function renderSectionCards(section) {
  return `
    <div class="ops-section-card-grid">
      ${(section.sections || []).map((item) => `
        <article class="ops-section-card">
          <strong>${escapeHtml(item)}</strong>
          <p>Use this area to record, review and evidence ${escapeHtml(item.toLowerCase())}.</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderQuickActions(sectionId) {
  const actions = {
    "daily-life": ["New daily note", "Record mood", "Add achievement"],
    "significant-moments": ["Record incident", "Manager review", "Create follow-up"],
    "health-wellbeing": ["Medication record", "Appointment outcome", "Health follow-up"],
    "feeling-safe": ["Update risk", "Safeguarding concern", "Safety plan action"],
    keywork: ["New keywork session", "Set goal", "Record reflection"],
    "child-next-steps": ["Create action", "Assign owner", "Review overdue"],
  }[sectionId] || ["Create record", "Add follow-up", "Review evidence"];

  return `
    <div class="ops-quick-actions" aria-label="Quick actions">
      ${actions.map((action) => `<button type="button" class="yp-button">${escapeHtml(action)}</button>`).join("")}
    </div>
  `;
}

function renderDailyLife(section, records) {
  return `
    ${renderQuickActions("daily-life")}
    <div class="ops-tool-layout">
      <section class="ops-tool-main">
        <h4>Daily life timeline</h4>
        <div class="ops-timeline">
          ${records.length ? records.slice(0, 8).map((record) => `
            <article class="ops-timeline-item">
              <time>${escapeHtml(recordDate(record) || "Recent")}</time>
              <strong>${escapeHtml(firstText(record, ["shift_type", "title", "summary"], "Daily note"))}</strong>
              <p>${escapeHtml(firstText(record, ["presentation", "summary", "positives", "young_person_voice"]))}</p>
            </article>
          `).join("") : `<div class="ops-empty-state"><h4>No daily notes yet</h4><p>Daily notes, routines, mood, activities and achievements will appear here.</p></div>`}
        </div>
      </section>
      <aside class="ops-tool-side">
        <h4>What to look for</h4>
        ${renderSectionCards(section)}
      </aside>
    </div>
  `;
}

function renderSignificantMoments(section, records) {
  const highConcern = records.filter((record) => String(firstText(record, ["safeguarding_follow_up", "category", "incident_type"], "")).toLowerCase().includes("safeguard"));
  return `
    ${renderQuickActions("significant-moments")}
    <div class="ops-alert-strip">
      <article><span>All moments</span><strong>${records.length}</strong></article>
      <article><span>Safeguarding follow-up</span><strong>${highConcern.length}</strong></article>
      <article><span>Manager review</span><strong>${records.filter((r) => r.manager_review_needed || r.workflow?.manager_review_needed).length}</strong></article>
    </div>
    <div class="ops-record-preview-list ops-incident-list">
      ${records.length ? records.slice(0, 8).map((record) => `
        <article class="ops-record-preview ops-incident-preview">
          <span class="ops-priority ops-priority-high">review</span>
          <strong>${escapeHtml(firstText(record, ["title", "incident_type", "category"], "Significant moment"))}</strong>
          <p>${escapeHtml(firstText(record, ["summary", "staff_response", "outcome"]))}</p>
          ${recordDate(record) ? `<small>${escapeHtml(recordDate(record))}</small>` : ""}
        </article>
      `).join("") : `<div class="ops-empty-state"><h4>No significant moments recorded</h4><p>Behaviour events, interventions, repairs and safety concerns will appear here.</p></div>`}
    </div>
  `;
}

function renderHealthWellbeing(section, records, data) {
  const profiles = data?.medication_profiles || data?.profiles || [];
  const meds = data?.medication_records || data?.administrations || [];
  return `
    ${renderQuickActions("health-wellbeing")}
    <div class="ops-alert-strip">
      <article><span>Health records</span><strong>${records.length}</strong></article>
      <article><span>Medication profiles</span><strong>${Array.isArray(profiles) ? profiles.length : 0}</strong></article>
      <article><span>Medication records</span><strong>${Array.isArray(meds) ? meds.length : 0}</strong></article>
    </div>
    <div class="ops-tool-layout">
      <section class="ops-tool-main">
        <h4>Health and wellbeing updates</h4>
        <div class="ops-record-preview-list">
          ${records.length ? records.slice(0, 6).map(renderRecord).join("") : `<div class="ops-empty-state"><h4>No health records yet</h4><p>Appointments, health observations and wellbeing updates will appear here.</p></div>`}
        </div>
      </section>
      <aside class="ops-tool-side"><h4>Health areas</h4>${renderSectionCards(section)}</aside>
    </div>
  `;
}

function renderFeelingSafe(section, records) {
  return `
    ${renderQuickActions("feeling-safe")}
    <div class="ops-tool-layout">
      <section class="ops-tool-main">
        <h4>Risks, patterns and protective factors</h4>
        <div class="ops-section-card-grid">
          <article class="ops-section-card ops-risk-card"><strong>Known risks</strong><p>Track risks, patterns and triggers clearly.</p></article>
          <article class="ops-section-card ops-positive-card"><strong>Protective factors</strong><p>Record what helps the child feel safe.</p></article>
          <article class="ops-section-card"><strong>Safety planning</strong><p>Keep support plans current and actionable.</p></article>
        </div>
        <div class="ops-record-preview-list">
          ${records.length ? records.slice(0, 6).map(renderRecord).join("") : `<div class="ops-empty-state"><h4>No risk records yet</h4><p>Risks, safeguarding concerns, protective factors and safety plans will appear here.</p></div>`}
        </div>
      </section>
      <aside class="ops-tool-side"><h4>Evidence focus</h4>${renderSectionCards(section)}</aside>
    </div>
  `;
}

function renderDefaultSection(section, records) {
  return `
    ${renderQuickActions(section.id)}
    ${renderSectionCards(section)}
    <div class="ops-record-preview-list">
      ${records.length ? records.slice(0, 6).map(renderRecord).join("") : `<div class="ops-empty-state"><h4>No records yet</h4><p>Records for ${escapeHtml(section.label.toLowerCase())} will appear here.</p></div>`}
    </div>
  `;
}

function renderSectionBody(section, records, data) {
  if (section.id === "daily-life") return renderDailyLife(section, records);
  if (section.id === "significant-moments") return renderSignificantMoments(section, records);
  if (section.id === "health-wellbeing") return renderHealthWellbeing(section, records, data);
  if (section.id === "feeling-safe") return renderFeelingSafe(section, records);
  return renderDefaultSection(section, records);
}

export async function renderChildWorkspaceSection({ target, child, sectionId = "about" }) {
  if (!target) return false;
  const section = findChildSection(sectionId);
  if (!section) return false;

  const childName = child?.name || child?.full_name || child?.display_name || "selected child";
  target.innerHTML = `
    <section class="ops-child-workspace-section">
      <header class="ops-child-section-header">
        <p class="ops-eyebrow">${escapeHtml(childName)}</p>
        <h3>${escapeHtml(section.label)}</h3>
        <p>Loading ${escapeHtml(section.label.toLowerCase())}...</p>
      </header>
    </section>
  `;

  try {
    const data = await fetchSectionData(child?.id, section.id);
    const records = normaliseRecords(data);
    target.innerHTML = `
      <section class="ops-child-workspace-section">
        <header class="ops-child-section-header">
          <p class="ops-eyebrow">${escapeHtml(childName)}</p>
          <h3>${escapeHtml(section.label)}</h3>
          <p>${escapeHtml((section.sections || []).join(" · "))}</p>
        </header>
        ${renderSectionBody(section, records, data)}
      </section>
    `;
  } catch (error) {
    console.warn("[child-workspace-renderer] section load failed", error);
    target.innerHTML = `
      <section class="ops-child-workspace-section">
        <header class="ops-child-section-header">
          <p class="ops-eyebrow">${escapeHtml(childName)}</p>
          <h3>${escapeHtml(section.label)}</h3>
          <p>${escapeHtml((section.sections || []).join(" · "))}</p>
        </header>
        ${renderSectionBody(section, [], null)}
        <div class="ops-empty-state"><h4>Backend not connected yet</h4><p>This section layout is ready while the endpoint is being connected.</p></div>
      </section>
    `;
  }
  return true;
}

window.IndiCareChildWorkspaceRenderer = Object.freeze({ renderChildWorkspaceSection });
