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
  return data.items || data.records || data.data || data.daily_notes || data.health_records || data.education_records || data.incidents || [];
}

function firstText(record, keys, fallback = "No detail recorded yet.") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function renderRecord(record = {}) {
  const title = firstText(record, ["title", "summary", "presentation", "record_type", "incident_type", "contact_type"], "Record");
  const body = firstText(record, ["body", "summary", "presentation", "details", "note", "action_taken", "outcome"]);
  const date = firstText(record, ["created_at", "updated_at", "note_date", "record_date", "event_datetime", "incident_datetime"], "");
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
        <p>Loading ${escapeHtml(section.label.toLowerCase())}…</p>
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
        ${renderSectionCards(section)}
        <div class="ops-record-preview-list">
          ${records.length ? records.slice(0, 6).map(renderRecord).join("") : `<div class="ops-empty-state"><h4>No records yet</h4><p>Records for ${escapeHtml(section.label.toLowerCase())} will appear here.</p></div>`}
        </div>
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
        ${renderSectionCards(section)}
        <div class="ops-empty-state"><h4>Could not load records</h4><p>You can still use this section while backend endpoints are being connected.</p></div>
      </section>
    `;
  }
  return true;
}

window.IndiCareChildWorkspaceRenderer = Object.freeze({ renderChildWorkspaceSection });
