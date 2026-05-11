const homeNav = document.getElementById('workspace-nav');
const homeMain = document.getElementById('workspace-main');
const homeTitle = document.getElementById('view-title');
const homeSubtitle = document.getElementById('view-subtitle');

const HOME_DOMAINS = [
  { key: 'climate', title: 'Emotional climate', help: 'Is the home calm, relationally safe and emotionally regulated?' },
  { key: 'continuity', title: 'Continuity of care', help: 'How stable are routines, staffing, handovers and relationships?' },
  { key: 'voice', title: 'Child voice culture', help: 'Are children being heard, responded to and involved in decisions?' },
  { key: 'safeguarding', title: 'Safeguarding atmosphere', help: 'Patterns of missing episodes, exploitation risk, peer dynamics and escalation.' },
  { key: 'workforce', title: 'Workforce wellbeing', help: 'Pressure, resilience, supervision quality and emotional containment.' },
  { key: 'identity', title: 'Home identity', help: 'Achievements, traditions, celebrations, belonging and positive memories.' }
];

if (homeNav) {
  homeNav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='home-profile']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadHomeJourneyProfile();
  }, true);
}

window.loadHomeJourneyProfile = loadHomeJourneyProfile;

async function loadHomeJourneyProfile() {
  const ctx = context();
  if (homeTitle) homeTitle.textContent = ctx.homeName || 'Home journey';
  if (homeSubtitle) homeSubtitle.textContent = 'The home profile reflects the emotional climate, continuity and culture of the environment.';
  if (!homeMain) return;

  const records = await fetchHomeSignals(ctx);
  const signals = buildHomeSignals(records);

  homeMain.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Home journey</p>
        <h3>The home as a therapeutic environment</h3>
        <p>The home profile should help leaders understand atmosphere, continuity, safeguarding pressure and the lived experience of children and adults.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-home-action="reflection">Record home reflection</button>
        <button type="button" class="secondary-action" data-home-action="handover">Open handover support</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(signals.climate, 'Climate signals', 'Calm, regulation and emotional safety')}
      ${metric(signals.voice, 'Voice evidence', 'Children being heard and responded to')}
      ${metric(signals.safeguarding, 'Safeguarding pressure', 'Missing, exploitation and escalation patterns')}
      ${metric(signals.workforce, 'Workforce resilience', 'Stress, supervision and support themes')}
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Home understanding</p><h3>What the home journey is showing</h3></div>
        <button type="button" class="secondary-action" data-home-action="assistant">Ask what the home needs</button>
      </div>
      <div class="life-area-grid full-life-grid">
        ${HOME_DOMAINS.map((domain) => renderDomain(domain)).join('')}
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Emerging patterns</p>
        <h3>Operational understanding from the journey</h3>
        ${signals.prompts.map((prompt) => `<div class="alert ${escapeHtml(prompt.level)}"><strong>${escapeHtml(prompt.title)}</strong><p>${escapeHtml(prompt.text)}</p></div>`).join('')}
      </article>
      <article class="panel">
        <p class="eyebrow">Home continuity</p>
        <h3>What should stay consistent</h3>
        <div class="alert low"><p>Children should experience continuity across shifts, language, routines and emotional responses from adults.</p></div>
        <div class="alert medium"><p>Positive memories, celebrations and belonging should be preserved in the home memory stream, not buried beneath incidents.</p></div>
      </article>
    </section>`;

  bindHomeActions();
}

function bindHomeActions() {
  homeMain.querySelector('[data-home-action="reflection"]')?.addEventListener('click', () => window.openWorkspaceForm?.('daily', 'home_reflection'));
  homeMain.querySelector('[data-home-action="handover"]')?.addEventListener('click', () => window.openWorkspaceForm?.('handover', 'shift_handover'));
  homeMain.querySelector('[data-home-action="assistant"]')?.addEventListener('click', () => {
    const input = document.getElementById('assistant-input') || document.getElementById('os-copilot-input');
    if (input) input.value = `Review the current records and chronology. What is the emotional climate of the home and what operational support may be needed?`;
    document.getElementById('assistant-run')?.click();
    document.getElementById('os-copilot-launcher')?.click();
  });
}

async function fetchHomeSignals(ctx) {
  const homeId = ctx.homeId || '';
  const types = ['daily', 'incident', 'handover', 'missing', 'safeguarding'];
  let all = [];
  for (const type of types) {
    try {
      const url = homeId ? `/workspace-records/${type}?home_id=${encodeURIComponent(homeId)}&limit=120` : `/workspace-records/${type}?limit=120`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function buildHomeSignals(records) {
  const climate = count(records, /calm|regulated|safe|warm|settled|laugh|celebrat|positive/i);
  const voice = count(records, /voice|said|asked|wanted|choice|heard|participat/i);
  const safeguarding = count(records, /missing|risk|harm|exploitation|police|assault|safeguarding/i);
  const workforce = count(records, /stress|pressure|fatigue|supervision|support|wellbeing/i);
  const prompts = [];
  prompts.push(climate ? { level: 'low', title: 'Positive climate signals present', text: `${climate} records include calm, celebration or relational safety language.` } : { level: 'medium', title: 'Positive memory gap', text: 'Record moments of joy, belonging and relational safety within the home.' });
  prompts.push(voice ? { level: 'low', title: 'Child voice visible', text: `${voice} records include evidence of children being heard.` } : { level: 'medium', title: 'Voice culture needs strengthening', text: 'Increase evidence of child participation and response.' });
  if (safeguarding >= 5) prompts.push({ level: 'high', title: 'Safeguarding pressure elevated', text: `${safeguarding} records include significant safeguarding language. Consider staffing resilience, routines and relational stability.` });
  if (workforce >= 3) prompts.push({ level: 'medium', title: 'Workforce support themes emerging', text: `${workforce} records include stress or support indicators.` });
  return { climate, voice, safeguarding, workforce, prompts };
}

function count(records, pattern) { return records.filter((record) => pattern.test(text(record))).length; }
function text(record) { return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`.toLowerCase(); }
function renderDomain(domain) { return `<article class="life-area-card full-life-area"><div><span class="mini-tag">Home journey</span><h4>${escapeHtml(domain.title)}</h4><p>${escapeHtml(domain.help)}</p></div><button type="button">Link records</button></article>`; }
function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function context() { return window.IndiCareContext?.get?.() || { homeName: 'Selected home' }; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
