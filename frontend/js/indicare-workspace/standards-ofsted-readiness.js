const standardsNav = document.getElementById('workspace-nav');
const standardsMain = document.getElementById('workspace-main');
const standardsTitle = document.getElementById('view-title');
const standardsSubtitle = document.getElementById('view-subtitle');

const STANDARDS_AREAS = [
  { key: 'quality_of_care', title: 'Quality of care', help: 'Evidence that children are helped, heard, safe, progressing and experiencing warm care.' },
  { key: 'safeguarding', title: 'Safeguarding', help: 'Evidence that risk is understood, responded to, reviewed and reduced over time.' },
  { key: 'leadership', title: 'Leadership and management', help: 'Manager oversight, sign-off, action learning, supervision and quality assurance.' },
  { key: 'children_views', title: 'Children’s views and wishes', help: 'Child voice, participation, complaints, advocacy and response to what children say.' },
  { key: 'relationships', title: 'Relationships and behaviour', help: 'Trusted adults, repair, regulation, peer dynamics, boundaries and emotional safety.' },
  { key: 'education_health', title: 'Education, health and progress', help: 'School, health, therapy, sleep, wellbeing, outcomes and life chances.' },
  { key: 'home_environment', title: 'Home environment', help: 'Atmosphere, routines, bedrooms, safety, belonging, positive life and identity.' },
  { key: 'workforce', title: 'Workforce and supervision', help: 'Safe staffing, adult wellbeing, reflective practice, training and consistency.' }
];

if (standardsNav) {
  standardsNav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='standards-ofsted']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadStandardsOfstedReadiness();
  }, true);
}

window.loadStandardsOfstedReadiness = loadStandardsOfstedReadiness;

async function loadStandardsOfstedReadiness() {
  const ctx = context();
  if (standardsTitle) standardsTitle.textContent = 'Standards and Ofsted readiness';
  if (standardsSubtitle) standardsSubtitle.textContent = 'Regulations, inspection evidence, documents and readiness should emerge from the child, adult and home journeys.';
  if (!standardsMain) return;

  const records = await fetchReadinessRecords(ctx);
  const signals = buildReadinessSignals(records);

  standardsMain.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Inspection-ready by design</p>
        <h3>Children’s standards, Ofsted, Reg 44/45 and documents</h3>
        <p>The OS should not bolt compliance on afterwards. Evidence should naturally flow from journeys, documents, manager sign-off, child voice and home learning.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-standards-action="reg44">Open Reg 44 reader</button>
        <button type="button" class="secondary-action" data-standards-action="documents">Upload / review documents</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(signals.voice, 'Child voice', 'Wishes, feelings and participation evidence')}
      ${metric(signals.safeguarding, 'Safeguarding', 'Risk, response and review evidence')}
      ${metric(signals.leadership, 'Leadership', 'Oversight, sign-off and action learning')}
      ${metric(signals.outcomes, 'Outcomes', 'Progress, change and impact evidence')}
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Inspection framework map</p><h3>Every standard should link back to lived journeys</h3></div>
        <button type="button" class="secondary-action" data-standards-action="assistant">Ask what evidence is missing</button>
      </div>
      <div class="life-area-grid full-life-grid">
        ${STANDARDS_AREAS.map((area) => renderArea(area, signals)).join('')}
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Readiness prompts</p>
        <h3>What needs attention?</h3>
        ${signals.prompts.map((prompt) => `<div class="alert ${escapeHtml(prompt.level)}"><strong>${escapeHtml(prompt.title)}</strong><p>${escapeHtml(prompt.text)}</p></div>`).join('')}
      </article>
      <article class="panel">
        <p class="eyebrow">Documents and inspection</p>
        <h3>Documents should feed journeys</h3>
        <div class="alert low"><p>Policies, plans, Reg 44 reports, review minutes and professional reports should be uploaded as evidence and linked to children, adults, the home and actions.</p></div>
        <div class="alert medium"><p>Managers should be able to comment, return, sign off and turn findings into actions without losing the narrative of the child or home journey.</p></div>
        <div id="reg44-reader" data-os-panel="reg44"></div>
      </article>
    </section>`;

  bindStandardsActions();
  window.IndiCareReg44Reader?.mount?.();
}

function bindStandardsActions() {
  standardsMain.querySelector('[data-standards-action="reg44"]')?.addEventListener('click', () => {
    location.hash = 'reg44';
    window.IndiCareReg44Reader?.mount?.();
    document.getElementById('reg44-reader-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  standardsMain.querySelector('[data-standards-action="documents"]')?.addEventListener('click', () => {
    window.IndiCareDocumentIntelligence?.mount?.();
    document.querySelector('[data-os-panel="documents"], #document-intelligence-upload')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  standardsMain.querySelector('[data-standards-action="assistant"]')?.addEventListener('click', () => {
    const input = document.getElementById('assistant-input') || document.getElementById('os-copilot-input');
    if (input) input.value = 'Review this home against children’s homes quality standards, SCCIF/Ofsted readiness, Reg 44/45 learning, child voice, safeguarding, leadership and evidence gaps.';
    document.getElementById('assistant-run')?.click();
    document.getElementById('os-copilot-launcher')?.click();
  });
}

async function fetchReadinessRecords(ctx) {
  const childId = ctx.childId || '';
  const homeId = ctx.homeId || '';
  const types = ['daily', 'incident', 'safeguarding', 'missing', 'handover'];
  let all = [];
  for (const type of types) {
    try {
      const params = new URLSearchParams({ limit: '150' });
      if (childId) params.set('young_person_id', childId);
      if (homeId) params.set('home_id', homeId);
      const response = await fetch(`/workspace-records/${type}?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function buildReadinessSignals(records) {
  const voice = count(records, /voice|said|asked|wanted|wish|feel|choice|advocacy|complaint/i);
  const safeguarding = count(records, /safeguarding|risk|missing|harm|exploitation|police|safety|strategy/i);
  const leadership = count(records, /manager|review|signed|approved|action|quality|supervision|oversight/i);
  const outcomes = count(records, /outcome|progress|changed|improved|impact|achievement|learning|next step/i);
  const prompts = [];
  prompts.push(voice ? { level: 'low', title: 'Child voice evidence visible', text: `${voice} record(s) include voice, choice or participation language.` } : { level: 'high', title: 'Child voice gap', text: 'Inspection evidence is weak if children’s wishes, feelings and responses are not visible.' });
  prompts.push(safeguarding ? { level: 'low', title: 'Safeguarding evidence visible', text: `${safeguarding} record(s) include safeguarding or safety language.` } : { level: 'medium', title: 'Safeguarding evidence gap', text: 'Add risk, response, review and learning evidence where relevant.' });
  prompts.push(leadership ? { level: 'low', title: 'Leadership evidence visible', text: `${leadership} record(s) include oversight, review or action language.` } : { level: 'medium', title: 'Leadership evidence gap', text: 'Manager comments, sign-off, actions and learning should be visible.' });
  prompts.push(outcomes ? { level: 'low', title: 'Outcome evidence visible', text: `${outcomes} record(s) include progress, change, impact or achievement language.` } : { level: 'medium', title: 'Outcome evidence gap', text: 'Show what changed for the child, adult or home after support.' });
  return { voice, safeguarding, leadership, outcomes, prompts };
}

function renderArea(area) {
  return `<article class="life-area-card full-life-area"><div><span class="mini-tag">Standard</span><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.help)}</p></div><button type="button" data-standards-action="assistant">Check evidence</button></article>`;
}

function count(records, pattern) { return records.filter((record) => pattern.test(text(record))).length; }
function text(record) { return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`.toLowerCase(); }
function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function context() { return window.IndiCareContext?.get?.() || { childId: '', homeId: '', homeName: 'Selected home' }; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
