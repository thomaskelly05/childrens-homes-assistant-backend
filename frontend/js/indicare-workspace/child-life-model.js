const nav = document.getElementById('workspace-nav');
const main = document.getElementById('workspace-main');
const title = document.getElementById('view-title');
const subtitle = document.getElementById('view-subtitle');

const LIFE_AREAS = [
  { key: 'important', title: 'Important to me', help: 'People, routines, possessions, values and choices that matter.' },
  { key: 'communication', title: 'Communication', help: 'How the child communicates, understands and shows distress.' },
  { key: 'sensory', title: 'Sensory profile', help: 'Sensory needs, triggers, regulation supports and environments.' },
  { key: 'routines', title: 'Routines', help: 'Morning, school, contact, evenings, bedtime and transition routines.' },
  { key: 'education', title: 'Education journey', help: 'Attendance, barriers, progress, school relationships and support.' },
  { key: 'health', title: 'Health and wellbeing', help: 'Physical health, CAMHS, medication, sleep, diet and appointments.' },
  { key: 'relationships', title: 'Relationships', help: 'Family, trusted adults, peers, risky relationships and contact impact.' },
  { key: 'achievements', title: 'Achievements vault', help: 'Proud moments, celebrations, milestones and positive memories.' },
  { key: 'direct_work', title: 'Direct work journey', help: 'Keywork, therapeutic work, wishes, worries, goals and impact.' }
];

if (nav) {
  nav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='child-life-model'], button[data-view='child-life']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadChildLifeModel();
  }, true);
}

window.loadChildLifeModel = loadChildLifeModel;

async function loadChildLifeModel() {
  const ctx = context();
  if (title) title.textContent = `${ctx.childName} - life model`;
  if (subtitle) subtitle.textContent = 'A complete child-centred picture: identity, communication, routines, relationships, education, health and achievements.';
  if (!main) return;

  if (!ctx.childId) {
    main.innerHTML = `<div class="panel empty-state">Select a child to build their life model.</div>`;
    return;
  }

  main.innerHTML = `<div class="panel">Building ${escapeHtml(ctx.childName)}'s child life model...</div>`;
  const records = await fetchRecords(ctx.childId);
  const model = buildModel(records);

  main.innerHTML = `
    <section class="hero-card child-life-model-hero">
      <div>
        <p class="eyebrow">Complete child life model</p>
        <h3>${escapeHtml(ctx.childName)} as a whole person</h3>
        <p>This brings together the child’s identity, routines, relationships, achievements and support needs so records never become incident-led.</p>
      </div>
      <div class="hero-actions">
        <button class="primary-action" type="button" data-life-action="profile">Create life profile note</button>
        <button class="secondary-action" type="button" data-life-action="copilot">Ask Copilot to complete gaps</button>
      </div>
    </section>

    <section class="child-life-overview-grid">
      ${summaryCard('Known strengths', model.achievements.length, 'Positive memories and achievements')}
      ${summaryCard('Voice signals', model.voice.length, 'Wishes, choices and direct communication')}
      ${summaryCard('Routine signals', model.routines.length, 'Things that help daily life feel predictable')}
      ${summaryCard('Relationship signals', model.relationships.length, 'Important people and contact impact')}
    </section>

    <section class="life-area-grid full-life-grid">
      ${LIFE_AREAS.map((area) => renderArea(area, model)).join('')}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Life story evidence</p>
        <h3>Recent human moments</h3>
        ${model.humanMoments.length ? model.humanMoments.map(renderMoment).join('') : `<div class="empty-state">Add child voice, achievements, routines and direct work to build a richer story.</div>`}
      </article>
      <article class="panel">
        <p class="eyebrow">Gaps to complete</p>
        <h3>What is still missing?</h3>
        ${model.gaps.map((gap) => `<div class="alert medium"><strong>${escapeHtml(gap.title)}</strong><p>${escapeHtml(gap.text)}</p></div>`).join('')}
      </article>
    </section>
  `;

  bindActions();
}

function bindActions() {
  main.querySelectorAll('[data-life-area]').forEach((button) => {
    button.addEventListener('click', () => window.openWorkspaceForm?.('daily', button.dataset.lifeArea));
  });
  main.querySelector('[data-life-action="profile"]')?.addEventListener('click', () => window.openWorkspaceForm?.('daily', 'life_profile'));
  main.querySelector('[data-life-action="copilot"]')?.addEventListener('click', () => {
    const ctx = context();
    const input = document.getElementById('assistant-input');
    if (input) input.value = `Review ${ctx.childName}'s records and tell me what is missing from their life profile: important to me, communication, sensory needs, routines, education, health, relationships, achievements and direct work.`;
    document.getElementById('assistant-run')?.click();
  });
}

function buildModel(records) {
  const by = (pattern) => records.filter((record) => pattern.test(text(record)));
  const model = {
    important: by(/important|matters|likes|dislikes|choice|preference|identity|culture|religion/i),
    communication: by(/communication|said|voice|non-verbal|gesture|showed|asked|refused/i),
    sensory: by(/sensory|noise|light|touch|smell|texture|overwhelm|regulation/i),
    routines: by(/routine|morning|bedtime|transition|predictable|after school|evening/i),
    education: by(/school|education|teacher|attendance|lesson|learning|college/i),
    health: by(/health|camhs|medication|sleep|diet|doctor|dentist|appointment/i),
    relationships: by(/family|contact|mum|dad|sibling|friend|peer|trusted|relationship/i),
    achievements: by(/achievement|proud|celebrated|success|milestone|positive|independent/i),
    direct_work: by(/direct work|keywork|session|goal|wish|worry|feelings|repair/i),
    voice: by(/said|voice|asked|wanted|wish|feel/i),
    humanMoments: []
  };
  model.humanMoments = [...model.achievements, ...model.communication, ...model.direct_work, ...model.routines].slice(0, 8);
  model.gaps = LIFE_AREAS.filter((area) => !model[area.key]?.length).map((area) => ({ title: area.title, text: `No strong evidence found yet for ${area.title.toLowerCase()}. Add this so the child file tells a whole-life story.` }));
  if (!model.gaps.length) model.gaps = [{ title: 'Life profile developing well', text: 'Core life areas have some evidence. Keep linking voice, adult response and impact.' }];
  return model;
}

function renderArea(area, model) {
  const count = model[area.key]?.length || 0;
  return `<article class="life-area-card full-life-area"><div><span class="mini-tag">${count} evidence point(s)</span><h4>${escapeHtml(area.title)}</h4><p>${escapeHtml(area.help)}</p></div><button type="button" data-life-area="${escapeHtml(area.key)}">Add evidence</button></article>`;
}

function renderMoment(record) {
  return `<article class="record-card"><div class="review-meta"><span class="mini-tag">${escapeHtml(record.type || record.record_type || 'record')}</span><span class="mini-tag">${escapeHtml(record.created_at || record.updated_at || 'journey')}</span></div><h4>${escapeHtml(record.title || 'Life moment')}</h4><p>${escapeHtml(record.summary || record.content?.what_happened || record.content?.child_voice || 'Meaningful life evidence recorded.')}</p></article>`;
}

function summaryCard(value, count, help) {
  return `<article class="metric-card"><strong>${escapeHtml(count)}</strong><span>${escapeHtml(value)}</span><small>${escapeHtml(help)}</small></article>`;
}

async function fetchRecords(childId) {
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&limit=100`, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function text(record) { return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`; }
function context() { return window.IndiCareContext?.get?.() || { childId: '', childName: 'Select child' }; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
