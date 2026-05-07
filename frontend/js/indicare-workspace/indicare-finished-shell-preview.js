const PREVIEW_STATE_KEY = "indicare.finished.shell.preview";
const DEFAULT_FINISHED_SHELL = true;

const demoChild = {
  name: "Jordan A.",
  age: "15",
  home: "Riverdale House",
  emotion: "steady",
  risk: "low",
  voice: "visible",
  keyWorker: "Sarah M.",
  nextAction: "Review meeting at 10:00 and direct work session at 16:00.",
};

const fallbackTemplates = [
  { id: "daily-lived-experience", title: "Daily Lived Experience Record", category: "Daily care", purpose: "Capture the day through a therapeutic lens", sections: [] },
  { id: "incident-behaviour-communication", title: "Incident / Behaviour as Communication", category: "Safeguarding", purpose: "Understand behaviour in context", sections: [] },
  { id: "safeguarding-concern", title: "Safeguarding Concern Record", category: "Safeguarding", purpose: "Record and escalate concerns", sections: [] },
  { id: "missing-from-care", title: "Missing From Care Report", category: "Safeguarding", purpose: "Chronology and safeguarding response", sections: [] },
  { id: "direct-work-session", title: "Direct Work Session Note", category: "Therapeutic work", purpose: "Therapeutic intervention and reflection", sections: [] },
  { id: "behaviour-support-plan", title: "Behaviour Support Plan", category: "Plans", purpose: "Collaborative support and strategies", sections: [] },
];

const chronology = [
  ["18 May 2025", "Positive phone call with Mum"],
  ["16 May 2025", "Football session - positive engagement"],
  ["14 May 2025", "School attendance improved"],
];

bootFinishedShellPreview();

function bootFinishedShellPreview() {
  addPreviewButton();
  const disabled = localStorage.getItem(PREVIEW_STATE_KEY) === "off";
  if (DEFAULT_FINISHED_SHELL && !disabled) window.requestAnimationFrame(renderFinishedShellPreview);
  else if (localStorage.getItem(PREVIEW_STATE_KEY) === "on") renderFinishedShellPreview();
  window.IndiCareFinishedShellPreview = { open: renderFinishedShellPreview, close: closePreview, openDoc: renderDocsOs };
}

function addPreviewButton() {
  const actions = document.querySelector(".os-command-actions");
  if (!actions || document.getElementById("finished-preview-button")) return;
  const button = document.createElement("button");
  button.id = "finished-preview-button";
  button.className = "secondary-action preview-action";
  button.type = "button";
  button.textContent = "Finished OS";
  button.addEventListener("click", renderFinishedShellPreview);
  actions.prepend(button);
}

function getTemplates() {
  return window.IndiCareDocTemplates?.all?.() || fallbackTemplates;
}

function getTemplate(templateId) {
  return window.IndiCareDocTemplates?.get?.(templateId) || getTemplates().find((template) => template.id === templateId) || fallbackTemplates[0];
}

function renderFinishedShellPreview() {
  localStorage.setItem(PREVIEW_STATE_KEY, "on");
  document.body.classList.add("finished-os-preview-active", "indic-dark-os-active");
  const title = document.getElementById("view-title");
  const subtitle = document.getElementById("view-subtitle");
  const status = document.getElementById("status-strip");
  if (title) title.textContent = "IndiCare OS";
  if (subtitle) subtitle.textContent = "Continuity. Memory. Impact.";
  if (status) status.innerHTML = "";
  renderDocsOs("daily-lived-experience");
}

function renderDocsOs(templateId = "daily-lived-experience") {
  const main = document.getElementById("workspace-main");
  if (!main) return;
  const template = getTemplate(typeof templateId === "string" ? templateId : "daily-lived-experience");
  const templates = getTemplates();
  main.innerHTML = `
    <section class="indic-dark-shell">
      ${renderDarkTopbar()}
      <section class="indic-dark-grid">
        ${renderDarkSidebar()}
        <main class="indic-docs-panel">
          ${renderDocsHeader(template)}
          <section class="indic-docs-workspace">
            ${renderTemplateLibrary(templates, template.id)}
            ${renderDocumentEditor(template)}
          </section>
        </main>
        ${renderContextRail()}
      </section>
      ${renderBottomCards()}
    </section>`;

  main.querySelectorAll("[data-template-id]").forEach((button) => {
    button.addEventListener("click", () => renderDocsOs(button.dataset.templateId));
  });
  main.querySelectorAll("[data-open-doc]").forEach((button) => {
    button.addEventListener("click", () => renderDocsOs(button.dataset.openDoc || "daily-lived-experience"));
  });
}

function renderDarkTopbar() {
  return `
    <header class="indic-dark-topbar">
      <div class="indic-brand-lockup">
        <div class="indic-heart-mark">♡</div>
        <div><strong>IndiCare OS</strong><span>Continuity. Memory. Impact.</span></div>
      </div>
      <div class="indic-context-card"><span>Active Context</span><strong>⌂ ${escapeHtml(demoChild.home)}</strong></div>
      <div class="indic-current-child"><div class="person-avatar">JA</div><div><span>Current Child</span><strong>${escapeHtml(demoChild.name)}</strong></div><small>Age ${escapeHtml(demoChild.age)}</small></div>
      <div class="indic-context-window"><i></i><div><span>Context Window</span><strong>Active Session</strong></div></div>
      <div class="indic-top-actions"><button>⌕</button><button>🔔<em>3</em></button><button>☼</button></div>
      <div class="indic-user-chip"><div class="person-avatar small">SM</div><div><strong>${escapeHtml(demoChild.keyWorker)}</strong><span>Key Worker</span></div><b>⌄</b></div>
    </header>`;
}

function renderDarkSidebar() {
  const nav = [
    ["Operating System", "Overview & Command", "♜", ""],
    ["Child OS", demoChild.name, "👤", ""],
    ["Home OS", demoChild.home, "⌂", ""],
    ["Docs OS", "Narrative & Records", "▤", "active"],
    ["Chronology OS", "Memory & Timeline", "▣", ""],
    ["Safeguarding OS", "Awareness & Protection", "◈", ""],
    ["Insights OS", "Analytics & Signals", "▥", ""],
    ["Workforce OS", "People & Wellbeing", "♧", ""],
    ["Provider OS", "Leadership & Oversight", "▧", ""],
    ["Admin OS", "Settings & Control", "⚙", ""],
  ];
  return `<aside class="indic-os-sidebar">${nav.map(([name, detail, icon, active]) => `<button class="indic-os-nav ${active}"><span>${icon}</span><strong>${name}</strong><small>${escapeHtml(detail)}</small></button>`).join("")}<div class="system-status"><b>✓</b><div><strong>System Status</strong><span>All systems operational</span></div></div></aside>`;
}

function renderDocsHeader(template) {
  return `
    <section class="indic-docs-header">
      <div><h1>Docs OS</h1><p>Narrative. Reflection. Evidence. Continuity.</p></div>
      <div class="indic-doc-actions"><button class="purple-btn">＋ New Document</button><button class="ghost-btn">▣ Document Hub</button></div>
      <nav class="indic-doc-tabs"><button>My Documents</button><button class="active">Templates</button><button>Work in Progress</button><button>For Review <em>2</em></button><button>Completed</button><button>Archived</button></nav>
    </section>`;
}

function renderTemplateLibrary(templates, activeId) {
  return `<aside class="template-library"><h3>Templates Library</h3><div class="template-search">⌕ <span>Search templates...</span><button>≡</button></div><p class="rail-label">Favourites</p>${templates.map((template, index) => `<button class="template-card ${template.id === activeId ? "active" : ""}" data-template-id="${escapeHtml(template.id)}"><span>${templateIcon(index)}</span><strong>${escapeHtml(template.title)}</strong><small>${escapeHtml(template.purpose || template.category || "Therapeutic record")}</small></button>`).join("")}<button class="template-more">View all templates →</button></aside>`;
}

function renderDocumentEditor(template) {
  const sections = template.sections?.length ? template.sections : [
    { title: "The Day in Their Words", prompt: "Capture the child or young person’s voice and perspective." },
    { title: "My Observations", prompt: "Describe what you saw, heard and noticed." },
    { title: "Emotional Wellbeing", prompt: "Record emotional state, regulation and what helped." },
  ];
  return `<article class="doc-editor-shell">
    <header class="doc-editor-header"><button class="back-btn">‹</button><strong>${escapeHtml(template.title)}</strong><span>Draft</span><small>✓ Autosaved 2 mins ago</small></header>
    <div class="doc-toolbar"><button>↶</button><button>↷</button><span>Normal</span><button>B</button><button>I</button><button>U</button><button>☷</button><button>🔗</button><button>▧</button></div>
    <section class="doc-page">
      <h2>${escapeHtml(template.title)}</h2>
      <div class="doc-meta"><span>📅 20 May 2025</span><span>👤 ${escapeHtml(demoChild.name)}</span><span>⌂ ${escapeHtml(demoChild.home)}</span><span>Key Worker: ${escapeHtml(demoChild.keyWorker)}</span></div>
      ${sections.map((section, index) => renderEditorSection(section, index)).join("")}
    </section>
    <footer class="doc-action-bar"><button class="purple-btn">✦ AI Enhance</button><button class="ghost-btn">Save Draft</button><button class="purple-btn">Send for Review →</button><span></span><button>💬</button><button>📎</button><button>⋮</button></footer>
  </article>`;
}

function renderEditorSection(section, index) {
  const example = index === 0 ? `“Today was ok. I went to school, it was maths first which I hate. James kept joking around but it made me laugh. I spoke to Mum on the phone. I miss my little brother. I played football after dinner. It helps me chill out.”` : null;
  return `<section class="editor-section"><div class="section-number">${index + 1}</div><div><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.prompt)}</p>${example ? `<blockquote>${escapeHtml(example)}</blockquote>` : `<ul><li>Jordan appeared calm this morning and engaged well in school.</li><li>Some low mood observed before phone call with mum.</li><li>Positive engagement in football increased affect and connection.</li></ul>`}<button class="add-line">✎ Add ${index === 0 ? "child voice" : "observation"}...</button></div></section>`;
}

function renderContextRail() {
  return `<aside class="indic-context-rail"><section class="rail-card"><div class="rail-head"><h3>Context Rail</h3><a>View Chronology →</a></div><p>Live continuity context</p><h4>Recent Chronology</h4>${chronology.map(([date, text]) => `<div class="chrono-mini"><i></i><span>${escapeHtml(date)}</span><strong>${escapeHtml(text)}</strong></div>`).join("")}<a class="rail-link">View full chronology</a></section><section class="rail-card ai-card"><div class="rail-head"><h3>AI Co-Pilot</h3><span class="active-dot">Active</span></div><p>Therapeutic intelligence</p><div class="ai-suggestion"><strong>AI Suggestion</strong><button>×</button><p>This is a strong reflection. You might consider linking Jordan’s mood dip to the transition between school and the phone call.</p><button class="ghost-btn">Apply Suggestion</button></div></section><section class="rail-card"><h3>Continuity Signals</h3><p>Live emotional & operational state</p>${signalRow("Emotional State", "Steady")}${signalRow("Continuity", "Stable")}${signalRow("Risk Level", "Low")}<a class="rail-link">View full signal dashboard →</a></section><section class="rail-card guidance-card"><h3>Document Guidance</h3><p>SCCIF & Ofsted Alignment</p><div class="alignment"><b>92%</b><div><strong>Excellent alignment</strong><span>This document meets key quality indicators.</span></div></div></section></aside>`;
}

function signalRow(name, value) {
  return `<div class="signal-row"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong><svg viewBox="0 0 120 30" aria-hidden="true"><path d="M2 22 C 18 19, 22 8, 38 11 S 61 28, 77 17 S 96 2, 118 8" /></svg></div>`;
}

function renderBottomCards() {
  return `<section class="indic-bottom-grid"><article><h3>Today's Overview</h3><p>20 May 2025</p><strong>2 records completed<br>1 review pending</strong><div class="mini-ring">67%</div></article><article><h3>Continuity Snapshot</h3><p>Jordan’s continuity is stable.</p><strong>Positive engagement and emotional regulation improving.</strong><svg viewBox="0 0 240 80"><path d="M3 58 C 36 12, 66 10, 94 46 S 144 61, 175 24 S 208 23, 238 7" /></svg></article><article><h3>Active Risks</h3><p>🛡 1 low level risk</p><strong>No immediate concerns</strong></article><article><h3>What's Next</h3><div class="next-row"><span>📅 Review meeting<br><small>22 May 2025, 10:00</small></span><span>🗓 Direct work session<br><small>22 May 2025, 16:00</small></span></div></article></section>`;
}

function templateIcon(index) {
  return ["▤", "♬", "⚠", "⌂", "☁", "♧"][index % 6];
}

function closePreview() {
  localStorage.setItem(PREVIEW_STATE_KEY, "off");
  document.body.classList.remove("finished-os-preview-active", "indic-dark-os-active");
  window.renderWorkspaceGate?.();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
