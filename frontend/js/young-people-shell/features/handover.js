import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList } from "../ui/records.js";

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

export async function loadHandover() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading handover...</p>
      </div>
    </div>
  `;

  const [timelineData, plansData, appointmentsData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=10`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
  ]);

  const recent = timelineData.timeline || [];
  const plans = plansData.items || plansData.records || [];
  const appointments = appointmentsData.items || appointmentsData.records || [];

  els.viewContent.innerHTML = `
    ${renderSection(
      "Recent activity",
      "Useful context for the next shift.",
      renderRowList(recent, "No recent activity found.")
    )}

    ${renderSection(
      "Current support guidance",
      "Plans and guidance adults should keep in mind.",
      renderRowList(plans.slice(0, 8), "No current support guidance found.")
    )}

    ${renderSection(
      "Upcoming appointments",
      "Things coming up that the next shift should know.",
      renderRowList(appointments.slice(0, 8), "No upcoming appointments found.")
    )}
  `;
}
