const PREVIEW_STATE_KEY = "indicare.finished.shell.preview";
const DEFAULT_FINISHED_SHELL = true;

const demoChild = {
  name: "Jamie",
  age: "15",
  home: "Meadow House",
  emotion: "settled but watchful",
  risk: "moderate",
  voice: "visible",
  nextAction: "Review behaviour support plan after family contact pattern.",
};

const memoryItems = [
  { type: "Daily lived experience", tone: "positive", title: "Football after school", text: "Jamie laughed with staff and spoke about wanting to join the local five-a-side group.", time: "Today · 18:20" },
  { type: "Child voice", tone: "voice", title: "Family contact feelings", text: "Jamie said contact felt ‘too much’ and asked to speak with Sam before bedtime.", time: "Yesterday · 21:05" },
  { type: "Incident", tone: "risk", title: "Dysregulation after transition", text: "Raised voice and door slam after school. Calmed with space, predictable adult response and reassurance.", time: "2 days ago · 16:40" },
  { type: "Document", tone: "governance", title: "Behaviour Support Plan updated", text: "Narrative OS suggested stronger child voice, repair plan and de-escalation wording.", time: "3 days ago · 11:15" },
];

const docCards = [
  ["Placement Plan", "Approved", "Updated 2 days ago"],
  ["Behaviour Support Plan", "Submitted", "Awaiting manager review"],
  ["Risk Assessment", "Draft", "AI improvement available"],
  ["Direct Work Session", "Draft", "Child voice added"],
  ["Reg 45 Evidence", "Building", "Evidence generated from records"],
  ["Positive Memories", "Live", "12 protected memories"],
];

bootFinishedShellPreview();

function bootFinishedShellPreview() {
  addPreviewButton();
  const disabled = localStorage.getItem(PREVIEW_STATE_KEY) === "off";
  if (DEFAULT_FINISHED_SHELL && !disabled) {
    window.requestAnimationFrame(renderFinishedShellPreview);
  } else if (localStorage.getItem(PREVIEW_STATE_KEY) === "on") {
    renderFinishedShellPreview();
  }
  window.IndiCareFinishedShellPreview = { open: renderFinishedShellPreview, close: closePreview };
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

function renderFinishedShellPreview() {
  localStorage.setItem(PREVIEW_STATE_KEY, "on");
  document.body.classList.add("finished-os-preview-active");
  const main = document.getElementById("workspace-main");
  const title = document.getElementById("view-title");
  const subtitle = document.getElementById("view-subtitle");
  const status = document.getElementById("status-strip");
  if (title) title.textContent = "IndiCare Therapeutic Care OS";
  if (subtitle) subtitle.textContent = "The finished operating shell: home, child, memory stream, documents, AI, safeguarding and governance in one workspace.";
  if (status) status.innerHTML = renderPreviewRibbon();
  if (!main) return;

  main.innerHTML = `
    <section class="finished-os-preview">
      <header class="finished-hero">
        <div>
          <p class="eyebrow">Finished product shell</p>
          <h1>One calm operating system for children’s homes.</h1>
          <p>Home, young person, documents, records, AI, memory stream, safeguarding, governance and provider evidence all live inside one IndiCare workspace.</p>
        </div>
        <div class="finished-hero-actions">
          <button type="button" class="primary-action" data-preview-action="open-doc">Open Narrative OS</button>
          <button type="button" class="secondary-action" data-preview-action="live-data">Use live data shell</button>
        </div>
      </header>

      <section class="finished-layout-grid">
        <aside class="finished-child-panel">
          <div class="finished-avatar">J</div>
          <p class="eyebrow">Current young person</p>
          <h2>${escapeHtml(demoChild.name)}</h2>
          <p>${escapeHtml(demoChild.age)} years · ${escapeHtml(demoChild.home)}</p>
          <div class="finished-pill-grid">
            <span>Emotion: ${escapeHtml(demoChild.emotion)}</span>
            <span>Risk: ${escapeHtml(demoChild.risk)}</span>
            <span>Voice: ${escapeHtml(demoChild.voice)}</span>
            <span>Next: Plan review</span>
          </div>
          <div class="finished-profile-list">
            <div><strong>Trusted adult</strong><span>Sam — evening routines and repair conversations</span></div>
            <div><strong>What helps</strong><span>Predictable tone, choice, football, quiet space</span></div>
            <div><strong>Watch for</strong><span>Family contact pressure, school transitions, shame after conflict</span></div>
          </div>
        </aside>

        <main class="finished-continuity-canvas">
          <section class="finished-summary-card">
            <div>
              <p class="eyebrow">Live child continuity workspace</p>
              <h2>Last few days understanding</h2>
              <p>Jamie has shown positive engagement around football and trusted adult connection. Emotional pressure appears higher after family contact and school transitions. Records suggest behaviour settles fastest when adults use calm reassurance, offer space and return for relational repair.</p>
            </div>
            <div class="finished-score-ring"><strong>74%</strong><span>continuity picture</span></div>
          </section>

          <section class="finished-memory-stream">
            <div class="section-header-row"><div><p class="eyebrow">Memory stream</p><h3>The visual spine of IndiCare</h3></div><button class="secondary-action" data-preview-action="open-doc">Write from this context</button></div>
            ${memoryItems.map(renderMemoryItem).join("")}
          </section>
        </main>

        <aside class="finished-intelligence-panel">
          <section class="finished-ai-card">
            <p class="eyebrow">IndiCare AI</p>
            <h3>Ambient support</h3>
            <p>Suggested focus: strengthen child voice and update the behaviour support plan with family contact triggers and recovery strategies.</p>
            <button type="button" class="primary-action" data-preview-action="open-doc">Improve record</button>
          </section>
          <section class="finished-signal-list">
            <div><strong>Safeguarding</strong><span>Monitor peer contact and missing-risk indicators after contact stress.</span></div>
            <div><strong>Governance</strong><span>2 items awaiting review. 1 plan needs manager comment.</span></div>
            <div><strong>Positive memory</strong><span>Football and humour should be protected in the child story.</span></div>
            <div><strong>SCCIF / Ofsted</strong><span>Evidence child voice, emotional wellbeing, response and outcome.</span></div>
          </section>
        </aside>
      </section>

      <section class="finished-doc-library">
        <div class="section-header-row"><div><p class="eyebrow">IndiCare documents</p><h3>Documents behave like living operational objects</h3></div><button class="secondary-action" data-preview-action="open-doc">Open document shell</button></div>
        <div class="finished-doc-grid">${docCards.map(renderDocCard).join("")}</div>
      </section>
    </section>`;

  main.querySelectorAll("[data-preview-action='live-data']").forEach((button) => button.addEventListener("click", closePreview));
  main.querySelectorAll("[data-preview-action='open-doc']").forEach((button) => button.addEventListener("click", renderNarrativePreview));
}

function renderNarrativePreview() {
  const main = document.getElementById("workspace-main");
  const title = document.getElementById("view-title");
  const subtitle = document.getElementById("view-subtitle");
  if (title) title.textContent = "IndiCare Narrative OS";
  if (subtitle) subtitle.textContent = "The finished writing environment: not Word, not Google Docs — therapeutic operational narration.";
  if (!main) return;
  main.innerHTML = `
    <section class="finished-narrative-preview">
      <header class="finished-hero compact">
        <div><p class="eyebrow">Narrative OS</p><h1>Behaviour Support Plan</h1><p>Draft → AI improved → Submitted → Manager reviewed → Approved → Archived → Retrieved.</p></div>
        <div class="finished-hero-actions"><button class="secondary-action" data-preview-action="back">Back to OS preview</button><button class="primary-action">Submit for review</button></div>
      </header>
      <section class="finished-doc-processor-grid">
        <aside class="finished-doc-context">
          <div class="finished-avatar">J</div>
          <h3>Jamie</h3>
          <p>Emotion: settled but watchful</p>
          <p>Risk: moderate</p>
          <p>Trusted adult: Sam</p>
          <div class="mini-timeline"><strong>Chronology links</strong><span>Family contact stress</span><span>School transition</span><span>Football success</span></div>
        </aside>
        <main class="finished-writing-surface">
          ${renderWritingBlock("What may the behaviour have been communicating?", "Consider emotional regulation, unmet need, shame, anxiety, sensory overwhelm, attachment and transition pressure.")}
          ${renderWritingBlock("Child voice", "What did Jamie say, show, refuse, ask for or communicate non-verbally? What changed because adults listened?")}
          ${renderWritingBlock("Adult response and repair", "Record de-escalation, emotional safety, relational repair, reflection and what adults learned.")}
          ${renderWritingBlock("Outcome and next actions", "Show what changed, what remains concerning and what plan or direct work should happen next.")}
        </main>
        <aside class="finished-doc-intelligence">
          <section><p class="eyebrow">SCCIF / Ofsted lens</p><p>Evidence child-centred care, emotional wellbeing, safeguarding response, leadership oversight and outcomes.</p></section>
          <section><p class="eyebrow">AI improvement</p><p>IndiCare can strengthen therapeutic wording, child voice, chronology links and manager review points.</p></section>
          <section><p class="eyebrow">Governance</p><p>Manager comment required before approval. Archive remains viewable and versioned.</p></section>
        </aside>
      </section>
    </section>`;
  main.querySelectorAll("[data-preview-action='back']").forEach((button) => button.addEventListener("click", renderFinishedShellPreview));
}

function closePreview() {
  localStorage.setItem(PREVIEW_STATE_KEY, "off");
  document.body.classList.remove("finished-os-preview-active");
  window.renderWorkspaceGate?.();
}

function renderPreviewRibbon() {
  return `
    <article class="status-pill active"><strong>Meadow House</strong><span>Home context</span></article>
    <article class="status-pill active"><strong>Jamie</strong><span>Young person</span></article>
    <article class="status-pill active"><strong>Settled but watchful</strong><span>Emotional state</span></article>
    <article class="status-pill warning"><strong>Moderate</strong><span>Risk state</span></article>
    <article class="status-pill active"><strong>Voice visible</strong><span>Child voice</span></article>
    <article class="status-pill warning"><strong>2</strong><span>Awaiting review</span></article>
    <article class="status-pill wide"><strong>Next action</strong><span>${escapeHtml(demoChild.nextAction)}</span></article>`;
}

function renderMemoryItem(item) {
  return `<article class="finished-memory-item ${escapeHtml(item.tone)}"><span>${escapeHtml(item.type)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p><small>${escapeHtml(item.time)}</small></article>`;
}

function renderDocCard([name, status, detail]) {
  return `<article class="finished-doc-card"><span>${escapeHtml(status)}</span><h4>${escapeHtml(name)}</h4><p>${escapeHtml(detail)}</p></article>`;
}

function renderWritingBlock(title, prompt) {
  return `<section class="finished-writing-block"><p class="eyebrow">Therapeutic heading</p><h2>${escapeHtml(title)}</h2><p class="guidance">${escapeHtml(prompt)}</p><div class="writing-placeholder">Adult writes naturally here. IndiCare supports reflection, child voice, safeguarding, SCCIF, Ofsted evidence and outcomes while writing.</div></section>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
