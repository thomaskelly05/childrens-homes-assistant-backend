import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList, renderSection, renderSummaryStat } from "../ui/records.js";
import { mapAiReport } from "../core/adapters.js";

function buildMonthlyReviewRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "monthly_review",
    title: item.review_title || "Monthly review",
    summary:
      item.summary_of_month ||
      item.progress_summary ||
      item.child_voice_summary ||
      "Monthly review",
    review_month: item.review_month || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    status: item.status || "",
    manager_analysis: item.manager_analysis || "",
    actions_for_next_month: item.actions_for_next_month || "",
  }));
}

function buildHandoverRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "handover_record",
    title: item.title || "Handover",
    summary: item.summary_text || "Handover record",
    handover_date: item.handover_date || null,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    status: item.status || "",
    shift_type: item.shift_type || "",
  }));
}

function buildInspectionPackRows(items = []) {
  return items.map((item) => ({
    id: item.id,
    record_type: "inspection_pack",
    title: item.pack_type || "Inspection pack",
    summary:
      item.status === "completed"
        ? "Inspection pack generated"
        : "Inspection pack in progress",
    created_at: item.created_at || null,
    completed_at: item.completed_at || null,
    status: item.status || "",
    pack_type: item.pack_type || "",
  }));
}

export async function loadHandover() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading reports...</p>
      </div>
    </div>
  `;

  try {
    const [
      aiReportsData,
      monthlyReviewsData,
      handoversData,
      inspectionPacksData,
    ] = await Promise.all([
      apiGet(`/young-people/${state.youngPersonId}/reports`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/monthly-reviews`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/handover-records`).catch(() => ({ items: [] })),
      apiGet(`/young-people/${state.youngPersonId}/inspection-packs`).catch(() => ({ items: [] })),
    ]);

    const aiReports = (
      aiReportsData.items ||
      aiReportsData.records ||
      aiReportsData.ai_generated_reports ||
      []
    ).map(mapAiReport);

    const monthlyReviews = buildMonthlyReviewRows(
      monthlyReviewsData.items ||
        monthlyReviewsData.records ||
        monthlyReviewsData.monthly_reviews ||
        []
    );

    const handoverRecords = buildHandoverRows(
      handoversData.items ||
        handoversData.records ||
        handoversData.handover_records ||
        []
    );

    const inspectionPacks = buildInspectionPackRows(
      inspectionPacksData.items ||
        inspectionPacksData.records ||
        inspectionPacksData.inspection_pack_jobs ||
        []
    );

    els.viewContent.innerHTML = `
      <section class="summary-strip">
        ${renderSummaryStat("AI reports", aiReports.length)}
        ${renderSummaryStat("Monthly reviews", monthlyReviews.length)}
        ${renderSummaryStat("Handovers", handoverRecords.length)}
        ${renderSummaryStat("Inspection packs", inspectionPacks.length)}
      </section>

      ${renderSection(
        "AI generated reports",
        "Narrative outputs generated for this young person.",
        renderRowList(aiReports, "No AI generated reports found.")
      )}

      ${renderSection(
        "Monthly reviews",
        "Structured monthly summaries, progress and next steps.",
        renderRowList(monthlyReviews, "No monthly reviews found.")
      )}

      ${renderSection(
        "Handover records",
        "Shift handovers and summaries for continuity of care.",
        renderRowList(handoverRecords, "No handover records found.")
      )}

      ${renderSection(
        "Inspection packs",
        "Generated evidence packs and related outputs.",
        renderRowList(inspectionPacks, "No inspection packs found.")
      )}
    `;
  } catch (error) {
    els.viewContent.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message || "Failed to load reports.")}</p>
      </div>
    `;
  }
}
