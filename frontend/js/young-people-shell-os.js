async function loadOSData(youngPersonId) {
  try {
    const res = await fetch(`/assistant/os/context/${youngPersonId}`);
    const data = await res.json();

    document.getElementById("ypSummaryTimeline").innerText =
      data.timeline?.length || 0;

    document.getElementById("ypSummaryRisk").innerText =
      data.risk_signals?.length || 0;

    document.getElementById("ypSummaryPatterns").innerText =
      data.patterns?.length || 0;

    document.getElementById("ypSummarySources").innerText =
      data.sources?.length || 0;

    const timelineEl = document.getElementById("ypTimelinePreview");
    timelineEl.innerHTML = (data.timeline || [])
      .slice(0, 5)
      .map(
        (item) => `
        <div class="yp-timeline-item">
          <div class="yp-timeline-dot"></div>
          <div>
            <strong>${item.title || "Record"}</strong>
            <small>${item.date || ""}</small>
          </div>
        </div>
      `
      )
      .join("");

    const riskEl = document.getElementById("ypRiskList");
    riskEl.innerHTML =
      (data.risk_signals || []).length === 0
        ? "<p class='yp-muted'>No active risks</p>"
        : data.risk_signals
            .map(
              (r) => `
          <div class="yp-insight-item">
            <strong>${r.title || "Risk"}</strong>
            <span>${r.severity || ""}</span>
          </div>
        `
            )
            .join("");

    const patternsEl = document.getElementById("ypPatternsList");
    patternsEl.innerHTML =
      (data.patterns || []).length === 0
        ? "<p class='yp-muted'>No patterns detected</p>"
        : data.patterns
            .map(
              (p) => `<div class="yp-insight-item"><strong>${p}</strong></div>`
            )
            .join("");
  } catch (err) {
    console.error("OS load error", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const ypId = document.body.dataset.youngPersonId || 1001;
  loadOSData(ypId);
});