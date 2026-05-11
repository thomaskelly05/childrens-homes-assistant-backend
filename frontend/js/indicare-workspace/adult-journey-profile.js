const nav = document.getElementById('workspace-nav');
const main = document.getElementById('workspace-main');
const title = document.getElementById('view-title');
const subtitle = document.getElementById('view-subtitle');

const ADULT_AREAS = [
  { key: 'relational_strengths', title: 'Relational strengths', help: 'Where this adult helps children feel safe, understood or regulated.' },
  { key: 'reflective_practice', title: 'Reflective practice', help: 'Supervision themes, learning, curiosity and quality of understanding.' },
  { key: 'safeguarding_load', title: 'Safeguarding load', help: 'Exposure to incidents, missing episodes, allegations or high emotional risk.' },
  { key: 'consistency', title: 'Consistency of care', help: 'Patterns of presence, follow-through, recording quality and relational continuity.' },
  { key: 'wellbeing', title: 'Adult wellbeing', help: 'Stress, emotional fatigue, resilience, support needs and protective factors.' },
  { key: 'growth', title: 'Professional growth', help: 'Training, development goals, strengths, confidence and leadership journey.' }
];

if (nav) {
  nav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='adult-profile']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadAdultJourneyProfile();
  }, true);
}

window.loadAdultJourneyProfile = loadAdultJourneyProfile;

async function loadAdultJourneyProfile() {
  const ctx = context();
  if (title) title.textContent = 'Adult journey';
  if (subtitle) subtitle.textContent = 'The adult profile is a reflective professional journey, not an HR file.';
  if (!main) return;

  const records = await fetchAdultSignals(ctx);
  const signals = buildAdultSignals(records);

  main.innerHTML = `
    <section class="hero-card child-first-hero">
      <div>
        <p class="eyebrow">Adult profile</p>
        <h3>Adults as part of the therapeutic environment</h3>
        <p>This space helps the home understand adult consistency, emotional load, reflective practice and relational impact.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-adult-action="reflection">Record adult reflection</button>
        <button type="button" class="secondary-action" data-adult-action="supervision">Prepare supervision</button>
      </div>
    </section>

    <section class="card-grid">
      ${metric(signals.reflection, 'Reflection evidence', 'Adult thinking and learning')}
      ${metric(signals.relationships, 'Relational evidence', 'Trust, repair and regulation')}
      ${metric(signals.safeguarding, 'Safeguarding exposure', 'Emotional and risk load')}
      ${metric(signals.wellbeing, 'Wellbeing signals', 'Support and resilience')}
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Adult journey map</p><h3>What managers should understand about adults</h3></div>
        <button type="button" class="secondary-action" data-adult-action="assistant">Ask what adult support is needed</button>
      </div>
      <div class="life-area-grid full-life-grid">
        ${ADULT_AREAS.map((area) => renderArea(area, signals)).join('')}
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Reflective practice</p>
        <h3>What the adult journey is showing</h3>
        ${signals.prompts.map((prompt) => `<div class="alert ${escapeHtml(prompt.level)}"><strong>${escapeHtml(prompt.title)}</strong><p>${escapeHtml(prompt.text)}</p></div>`).join('')}
      </article>
      <article class="panel">
        <p class="eyebrow">Manager support</p>
        <h3>Sign-off should support learning</h3>
        <div class="alert low"><p>Managers should be able to comment, return, approve and link adult reflections to supervision without turning reflection into blame.</p></div>
        <div class="alert medium"><p>Adult wellbeing, safeguarding exposure and relational pressure should feed supervision and home climate, not sit in isolation.</p></div>
      </article>
    </section>`;

  bindActions(ctx);
}

function bindActions(ctx) {
  main.querySelectorAll('[data-adult-record]').forEach((button) => button.addEventListener('click', () => window.openWorkspaceForm?.('daily', button.dataset.adultRecord)));
  main.querySelector('[data-adult-action="reflection"]')?.addEventListener('click', () => window.openWorkspaceForm?.('daily', 'adult_reflection'));
  main.querySelector('[data-adult-action="supervision"]')?.addEventListener('click', () => window.openWorkspaceForm?.('daily', 'supervision'));
  main.querySelector('[data-adult-action="assistant"]')?.addEventListener('click', () => {
    const input = document.getElementById('assistant-input') || document.getElementById('os-copilot-input');
    if (input) input.value = `Look at the current home and child records. What adult support, supervision, wellbeing or reflective practice themes are emerging?`;
    document.getElementById('assistant-run')?.click();
    document.getElementById('os-copilot-launcher')?.click();
  });
}

async function fetchAdultSignals(ctx) {
  const childId = ctx.childId || '';
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let all = [];
  for (const type of types) {
    try {
      const url = childId ? `/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&limit=100` : `/workspace-records/${type}?limit=100`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function buildAdultSignals(records) {
  const text = records.map(recordText).join(' ');
  const count = (pattern) => records.filter((record) => pattern.test(recordText(record))).length;
  const reflection = count(/reflect|meaning|learning|supervision|debrief|understood|curious/i);
  const relationships = count(/trusted|relationship|repair|regulat|co-regulat|reassur|attuned|key adult/i);
  const safeguarding = count(/safeguarding|missing|risk|harm|exploitation|police|incident|allegation/i);
  const wellbeing = count(/tired|stress|overwhelmed|support|wellbeing|burnout|fatigue|resilience/i);
  const prompts = [];
  prompts.push(reflection ? { level: 'low', title: 'Reflection is visible', text: `${reflection} record(s) include reflective practice or learning language.` } : { level: 'medium', title: 'Reflection gap', text: 'Adult reflection is limited. Add what adults understood, learned and would do next.' });
  prompts.push(relationships ? { level: 'low', title: 'Relational practice visible', text: `${relationships} record(s) include relational or regulation evidence.` } : { level: 'medium', title: 'Relational evidence gap', text: 'Record which adults help the child regulate, repair and feel safe.' });
  if (safeguarding >= 3) prompts.push({ level: 'high', title: 'Safeguarding load may be high', text: `${safeguarding} record(s) include risk/safeguarding language. Consider supervision and emotional containment for adults.` });
  if (wellbeing) prompts.push({ level: 'medium', title: 'Adult wellbeing signals present', text: `${wellbeing} record(s) may indicate adult support or resilience themes.` });
  if (!prompts.length) prompts.push({ level: 'low', title: 'Adult journey developing', text: 'Keep linking adult reflection, supervision and relational impact to the child and home journey.' });
  return { reflection, relationships, safeguarding, wellbeing, prompts };
}

function renderArea(area, signals) {
  return `<article class="life-area-card full-life-area"><div><span class="mini-tag">Adult journey</span><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.help)}</p></div><button type="button" data-adult-record="${escapeHtml(area.key)}">Record / link</button></article>`;
}

function metric(value, label, help) { return `<article class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(help)}</small></article>`; }
function recordText(record) { return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`.toLowerCase(); }
function context() { return window.IndiCareContext?.get?.() || { childId: '', childName: 'Selected child', homeName: 'Selected home' }; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
