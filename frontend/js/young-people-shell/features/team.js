import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return state.homeId || state.currentUser?.home_id || state.currentUser?.homeId;
}

function safeText(v) {
  return escapeHtml(String(v ?? ""));
}

function render(items = []) {
  if (!items.length) {
    return `<div class="empty-state"><p>No team data available.</p></div>`;
  }

  return `
    <div class="record-list">
      ${items.map(staff => `
        <article class="record-row">
          <div class="record-row-main">
            <div class="record-row-title">${safeText(staff.staff_member || "Staff")}</div>
            <div class="record-row-summary">${safeText(staff.role || "")}</div>
            <div class="record-row-meta">${safeText(staff.status || "")}</div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export async function loadTeam() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  els.viewContent.innerHTML = `<p>Loading team…</p>`;

  try {
    const data = await apiGet(`/homes/${homeId}/team`).catch(() => ({ items: [] }));
    const items = data.items || data.team || [];

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <h2>Team</h2>
        ${render(items)}
      </section>
    `;
  } catch {
    els.viewContent.innerHTML = `<p>Failed to load team</p>`;
  }
}
