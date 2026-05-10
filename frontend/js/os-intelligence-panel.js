(() => {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function youngPersonId() {
    const selector = byId("ypSelector");
    const params = new URLSearchParams(window.location.search);
    return selector?.value || params.get("young_person_id") || params.get("id") || document.body.dataset.youngPersonId || "";
  }
  function clear(node) { if (node) node.textContent = ""; }
  function text(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback || "Not recorded";
    return String(value);
  }
  function list(container, rows, mapper) {
    if (!container) return;
    container.innerHTML = "";
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "No current actions found.";
      container.appendChild(li);
      return;
    }
    items.slice(0, 6).forEach((row) => {
      const li = document.createElement("li");
      li.textContent = mapper(row);
      container.appendChild(li);
    });
  }
  function ensurePanel() {
    const parent = byId("ypInspectionPanel");
    if (!parent || byId("ypOSIntelligencePanel")) return;

    const panel = document.createElement("section");
    panel.id = "ypOSIntelligencePanel";
    panel.className = "yp-intelligence-card yp-inspection-panel indicare-intelligence-panel";
    panel.innerHTML = `
      <div class="yp-card-head">
        <div>
          <p class="yp-eyebrow">Live OS intelligence</p>
          <h2>Readiness and next actions</h2>
          <p id="ypOSIntelStatus" class="yp-muted">Loading intelligence...</p>
        </div>
        <strong id="ypOSIntelScore" class="yp-chip yp-chip-dark">--</strong>
      </div>
      <div class="yp-inspection-grid">
        <article class="yp-insight-item"><strong>Child voice</strong><span id="ypOSIntelVoice">Loading...</span></article>
        <article class="yp-insight-item"><strong>Safeguarding</strong><span id="ypOSIntelSafeguarding">Loading...</span></article>
        <article class="yp-insight-item"><strong>PACE quality</strong><span id="ypOSIntelPace">Loading...</span></article>
      </div>
      <div class="yp-inspection-grid">
        <section><h3>Priority actions</h3><ul id="ypOSIntelActions" class="yp-insight-list"><li>Loading...</li></ul></section>
        <section><h3>Risk prompts</h3><ul id="ypOSIntelRisk" class="yp-insight-list"><li>Loading...</li></ul></section>
        <section><h3>Care plan prompts</h3><ul id="ypOSIntelPlans" class="yp-insight-list"><li>Loading...</li></ul></section>
      </div>
    `;
    parent.insertAdjacentElement("afterend", panel);
  }
  async function getJson(url) {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    const json = await res.json();
    if (!res.ok || json.ok === false) throw new Error(json.detail || json.error || "Request failed");
    return json;
  }
  function render(data) {
    const readiness = data.inspection_readiness || {};
    const score = Number(readiness.score || 0);
    const scoreNode = byId("ypOSIntelScore");
    if (scoreNode) scoreNode.textContent = score ? `${score}%` : "--";
    const status = byId("ypOSIntelStatus");
    if (status) status.textContent = score ? `Inspection readiness: ${score}% - ${text(readiness.status, "review needed")}` : "Inspection readiness needs review.";

    const voice = data.child_voice || {};
    const safeguarding = data.safeguarding || {};
    const pace = data.therapeutic_quality || {};
    const patterns = data.incident_patterns || {};

    const voiceNode = byId("ypOSIntelVoice");
    if (voiceNode) voiceNode.textContent = `${text(voice.status, "unknown")} (${voice.recent_voice_count || 0} recent entries)`;
    const safeNode = byId("ypOSIntelSafeguarding");
    if (safeNode) safeNode.textContent = safeguarding.signal_count ? `${safeguarding.signal_count} signal(s) require review` : "No current signals found";
    const paceNode = byId("ypOSIntelPace");
    if (paceNode) paceNode.textContent = pace.message || text(pace.status, "Not yet reviewed");

    const actions = Array.isArray(readiness.actions) ? readiness.actions : [];
    const patternActions = Array.isArray(patterns.patterns) ? patterns.patterns : [];
    list(byId("ypOSIntelActions"), actions.concat(patternActions), (item) => item.message || item.title || "Action required");
    list(byId("ypOSIntelRisk"), data.risk_actions || [], (item) => item.message || "Risk review required");
    list(byId("ypOSIntelPlans"), data.care_plan_actions || [], (item) => item.message || "Care plan review required");

    const safetyChip = byId("ypInspectionShiftSafety");
    if (safetyChip && score) safetyChip.textContent = `${score}% readiness`;
  }
  async function load() {
    ensurePanel();
    const id = youngPersonId();
    if (!id) return;
    try {
      const data = await getJson("/os-modules/intelligence/child/" + encodeURIComponent(id));
      render(data);
    } catch (error) {
      const status = byId("ypOSIntelStatus");
      if (status) status.textContent = "OS intelligence could not load: " + error.message;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    load();
    byId("ypSelector")?.addEventListener("change", () => setTimeout(load, 350));
    window.setInterval(load, 60000);
  });
})();
