(() => {
  "use strict";

  function byId(id) { return document.getElementById(id); }
  function homeId() { return new URLSearchParams(location.search).get("home_id") || document.body.dataset.homeId || "1"; }
  function youngPersonId() {
    const params = new URLSearchParams(location.search);
    return params.get("young_person_id") || params.get("id") || document.body.dataset.youngPersonId || document.getElementById("ypSelector")?.value || "";
  }
  async function getJson(url) {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    const json = await res.json();
    if (!res.ok || json.ok === false) throw new Error(json.error || json.detail || "Request failed");
    return json;
  }
  function card(title, body, href) {
    const a = document.createElement(href ? "a" : "article");
    if (href) a.href = href;
    a.className = "indicare-os-command-card";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = body;
    a.appendChild(strong); a.appendChild(span);
    return a;
  }
  function ensureDashboardDemoPanel() {
    const main = byId("mainContent") || document.querySelector("main");
    if (!main || byId("indicareDemoPanel")) return null;
    const section = document.createElement("section");
    section.id = "indicareDemoPanel";
    section.className = "panel wide-panel";
    section.innerHTML = `
      <div class="panel-head"><p class="eyebrow">Demo-ready intelligence</p><h3>What a manager needs to know now</h3></div>
      <div id="demoReadinessSummary" class="inspection-summary">Loading live OS intelligence...</div>
      <div id="demoPriorityChildren" class="indicare-os-command-strip" style="margin-top:14px;"></div>
      <div id="demoAssistantPrompts" class="stack-list" style="margin-top:14px;"></div>
    `;
    main.appendChild(section);
    return section;
  }
  async function renderDashboardDemo() {
    if (!location.pathname.includes("os-dashboard") && !location.pathname.includes("manager-dashboard")) return;
    ensureDashboardDemoPanel();
    try {
      const data = await getJson("/os-modules/intelligence/home/" + encodeURIComponent(homeId()));
      const summary = data.summary || {};
      const box = byId("demoReadinessSummary");
      if (box) box.innerHTML = `<p><strong>Average inspection readiness:</strong> ${summary.average_inspection_readiness || 0}%</p><p><strong>Children needing review:</strong> ${summary.children_needing_review || 0}</p><p>This view is powered by daily life diaries, incidents, risk assessments and care plans.</p>`;
      const children = byId("demoPriorityChildren");
      if (children) {
        children.innerHTML = "";
        (data.children_needing_review || []).slice(0, 4).forEach((child) => children.appendChild(card(child.name || "Young person", `Readiness ${child.score || 0}% - ${child.actions?.length || 0} action(s)`, child.href)));
        if (!children.children.length) children.appendChild(card("No urgent child reviews", "Current intelligence has not identified urgent child actions.", "/young-people-shell"));
      }
      const prompts = byId("demoAssistantPrompts");
      if (prompts) {
        prompts.innerHTML = "";
        (data.assistant_prompts || []).forEach((prompt) => prompts.appendChild(card("Assistant prompt", prompt, "/assistant")));
      }
    } catch (error) {
      const box = byId("demoReadinessSummary");
      if (box) box.textContent = "Demo intelligence could not load: " + error.message;
    }
  }
  function ensureAssistantContextPanel() {
    const panel = byId("ypAssistantPanel") || document.querySelector("main");
    if (!panel || byId("indicareAssistantContext")) return null;
    const section = document.createElement("section");
    section.id = "indicareAssistantContext";
    section.className = "yp-intelligence-card yp-inspection-panel";
    section.innerHTML = `<p class="yp-eyebrow">Assistant context</p><h3>Live intelligence available</h3><p id="assistantContextText">Select a young person to load context.</p><div id="assistantContextActions" class="yp-quick-prompts"></div>`;
    panel.prepend(section);
    return section;
  }
  async function renderAssistantContext() {
    if (!location.pathname.includes("young-people-shell")) return;
    ensureAssistantContextPanel();
    const yp = youngPersonId();
    if (!yp) return;
    try {
      const data = await getJson("/os-modules/intelligence/child/" + encodeURIComponent(yp));
      const readiness = data.inspection_readiness || {};
      const text = byId("assistantContextText");
      if (text) text.textContent = `Assistant can use this child's live readiness score (${readiness.score || 0}%), safeguarding signals (${data.safeguarding?.signal_count || 0}) and priority actions (${readiness.actions?.length || 0}).`;
      const actions = byId("assistantContextActions");
      if (actions) {
        actions.innerHTML = "";
        (data.assistant_prompts || []).forEach((prompt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = prompt;
          btn.dataset.prompt = prompt;
          btn.addEventListener("click", () => {
            const input = byId("ypAssistantInput");
            if (input) input.value = prompt;
          });
          actions.appendChild(btn);
        });
      }
    } catch (error) {}
  }
  document.addEventListener("DOMContentLoaded", () => {
    renderDashboardDemo();
    renderAssistantContext();
    byId("ypSelector")?.addEventListener("change", () => setTimeout(renderAssistantContext, 500));
  });
})();
