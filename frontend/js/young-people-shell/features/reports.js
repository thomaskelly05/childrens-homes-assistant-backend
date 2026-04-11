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

export async function loadReports() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] }));
  const reports = data.items || data.records || [];

  const mapped = reports.map((report) => ({
    ...report,
    record_type: report.record_type || "report",
    title: report.title || report.report_title || "Report",
    summary: report.report_text || report.summary || "Report available.",
    created_at: report.created_at || report.generated_at || report.updated_at || null,
  }));

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Reports",
      "Drafts, summaries and generated outputs linked to this young person.",
      renderRowList(mapped, "No reports found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
}
