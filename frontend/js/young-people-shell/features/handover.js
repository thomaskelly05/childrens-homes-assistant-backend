import { state } from "../state.js";
import { els } from "../dom.js";
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

function bindDynamicOpenRecordButtons() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const item = JSON.parse(btn.dataset.openRecord);
        const mod = await import("../ui/records.js");
        mod.openRecordDetail(item);
      } catch {
        // ignore
      }
    });
  });
}

export async function loadHandover() {
  const [timelineData, plansData, appointmentsData] = await Promise.all([
    apiGet(`/young-people/${state.youngPersonId}/timeline?limit=10`).catch(() => ({ timeline: [] })),
    apiGet(`/young-people/${state.youngPersonId}/plans`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${state.youngPersonId}/appointments`).catch(() => ({ items: [] })),
  ]);

  const recent = timelineData.timeline || [];
  const plans = plansData.items || plansData.records || [];
  const appointments = appointmentsData.items || appointmentsData.records || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Recent activity",
      "What the next adult needs to know from the latest recorded activity.",
      renderRowList(recent, "No recent activity found.")
    )}

    ${renderSection(
      "Current support guidance",
      "Plans and current guidance that should shape how adults respond.",
      renderRowList(plans.slice(0, 8), "No current support guidance found.")
    )}

    ${renderSection(
      "Upcoming appointments",
      "Important upcoming appointments and follow-up that may affect the shift.",
      renderRowList(appointments.slice(0, 8), "No upcoming appointments found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
}
