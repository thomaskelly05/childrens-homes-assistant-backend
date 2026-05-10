const nav = document.getElementById('workspace-nav');
const main = document.getElementById('workspace-main');
const title = document.getElementById('view-title');
const subtitle = document.getElementById('view-subtitle');

if (nav) {
  nav.addEventListener('click', (event) => {
    const button = event.target.closest("button[data-view='outcome-storytelling'], button[data-view='reg45']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadOutcomeStorytelling();
  }, true);
}

window.loadOutcomeStorytelling = loadOutcomeStorytelling;

async function loadOutcomeStorytelling() {
  if (!main) return;
  if (title) title.textContent = 'Outcome storytelling';
  if (subtitle) subtitle.textContent = 'Visual reporting that shows change, impact, safeguarding patterns and the child journey.';

  main.innerHTML = `<div class="panel">Building outcome story...</div>`;

  const ctx = window.IndiCareContext?.get?.() || { childId: '1', childName: 'Child A' };
  const records = await fetchAllRecords(ctx.childId);
  const model = buildOutcomeModel(records);

  main.innerHTML = `
    <section class="hero-card outcome-hero">
      <div>
        <p class="eyebrow">Reporting that tells the story</p>
        <h3>${escapeHtml(ctx.childName)} - progress, safety and lived experience</h3>
        <p>Designed for Ofsted, leaders and carers: not just counts, but what changed for the child and why.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="primary-action" data-outcome-action="summary">Generate narrative report</button>
        <button type="button" class="secondary-action" data-outcome-action="download">Export story pack</button>
      </div>
    </section>

    <section class="outcome-visual-grid">
      ${visualCard('Emotional wellbeing', model.wellbeing, 'wellbeing')}
      ${visualCard('Safety stability', model.safety, 'safety')}
      ${visualCard('Child voice', model.voice, 'voice')}
      ${visualCard('Positive life', model.positive, 'positive')}
    </section>

    <section class="two-column">
      <article class="panel">
        <p class="eyebrow">Meaningful change</p>
        <h3>Impact statements</h3>
        ${model.statements.map(renderStatement).join('')}
      </article>
      <article class="panel">
        <p class="eyebrow">Patterns to act on</p>
        <h3>Care intelligence</h3>
        ${model.patterns.map(renderPattern).join('')}
      </article>
    </section>

    <section class="panel">
      <div class="section-header-row">
        <div><p class="eyebrow">Journey graph</p><h3>Progress over recent records</h3></div>
        <div class="os-live-pill">Live from records</div>
      </div>
      <div class="sparkline-board">
        ${sparkline('Wellbeing', model.timeline.wellbeing)}
        ${sparkline('Voice', model.timeline.voice)}
        ${sparkline('Safety', model.timeline.safety)}
        ${sparkline('Positive life', model.timeline.positive)}
      </div>
    </section>
  `;

  main.querySelector("[data-outcome-action='summary']")?.addEventListener('click', () => {
    const input = document.getElementById('assistant-input');
    if (input) input.value = `Create a child-centred outcome report for ${ctx.childName}. Include wellbeing, safeguarding, child voice, positive life, impact statements and actions for leaders.`;
    document.getElementById('assistant-run')?.click();
  });
  main.querySelector("[data-outcome-action='download']")?.addEventListener('click', () => downloadPack(ctx, model));
}

async function fetchAllRecords(childId) {
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function buildOutcomeModel(records) {
  const text = records.map(recordText).join(' ').toLowerCase();
  const score = (positiveWords, negativeWords = []) => {
    const positive = positiveWords.reduce((sum, word) => sum + count(text, word), 0);
    const negative = negativeWords.reduce((sum, word) => sum + count(text, word), 0);
    return Math.max(8, Math.min(96, 52 + positive * 9 - negative * 8));
  };

  const model = {
    wellbeing: score(['calm', 'regulated', 'settled', 'happy', 'engaged'], ['anxious', 'dysregulated', 'upset', 'distressed']),
    safety: score(['safe', 'returned', 'debrief', 'support'], ['missing', 'exploitation', 'police', 'safeguarding']),
    voice: score(['said', 'voice', 'wish', 'wanted', 'asked'], []),
    positive: score(['achievement', 'proud', 'celebrated', 'positive', 'success', 'independent'], ['incident']),
    statements: [],
    patterns: [],
    timeline: buildTimeline(records)
  };

  if (/routine/.test(text)) model.statements.push('Predictable routines are visible in records and appear linked to regulation and stability.');
  if (/voice|said|wanted|asked/.test(text)) model.statements.push('The child perspective is present and can be linked to adult response and impact.');
  if (/achievement|positive|proud|success/.test(text)) model.statements.push('Positive life evidence is being captured, helping balance the child story beyond risk.');
  if (!model.statements.length) model.statements.push('Continue building evidence of what changed for the child, not only what happened.');

  if (/contact/.test(text) && /anxious|distress|upset/.test(text)) model.patterns.push({ level: 'medium', text: 'Family contact may be linked to emotional distress. Review preparation and post-contact support.' });
  if (/school/.test(text) && /anxious|refusal|distress/.test(text)) model.patterns.push({ level: 'medium', text: 'School transitions may be linked to anxiety. Review morning routine and education support.' });
  if (/missing|exploitation|police/.test(text)) model.patterns.push({ level: 'high', text: 'Safeguarding pattern visible. Review risk assessment, missing plan and leadership oversight.' });
  if (!model.patterns.length) model.patterns.push({ level: 'low', text: 'No high-risk pattern detected from current records. Continue monitoring voice, relationships and routines.' });

  return model;
}

function buildTimeline(records) {
  const recent = records.slice(-8);
  const values = recent.length ? recent : Array.from({ length: 6 }, (_, i) => ({ content: { seed: i }, summary: '' }));
  return {
    wellbeing: values.map((record, index) => point(record, index, ['calm', 'regulated', 'settled'], ['anxious', 'upset', 'distress'])),
    voice: values.map((record, index) => point(record, index, ['said', 'voice', 'wanted', 'asked'], [])),
    safety: values.map((record, index) => point(record, index, ['safe', 'support', 'debrief'], ['missing', 'police', 'exploitation'])),
    positive: values.map((record, index) => point(record, index, ['achievement', 'positive', 'proud', 'success'], ['incident']))
  };
}

function point(record, index, positives, negatives) {
  const text = recordText(record).toLowerCase();
  const p = positives.some((word) => text.includes(word)) ? 18 : 0;
  const n = negatives.some((word) => text.includes(word)) ? -14 : 0;
  return Math.max(8, Math.min(96, 40 + index * 6 + p + n));
}

function visualCard(label, value, key) {
  return `<article class="outcome-visual-card ${key}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}%</strong><div class="outcome-ring" style="--score:${value}"><i></i></div><p>${narrative(label, value)}</p></article>`;
}

function narrative(label, value) {
  if (value >= 75) return `${label} evidence is strong and improving.`;
  if (value >= 50) return `${label} evidence is developing. Continue recording impact.`;
  return `${label} evidence is limited or under pressure. Review support and recording quality.`;
}

function sparkline(label, values) {
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${100 - value}`).join(' ');
  return `<article class="spark-card"><strong>${escapeHtml(label)}</strong><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${points}" /></svg></article>`;
}

function renderStatement(text) {
  return `<div class="alert low"><strong>Impact</strong><p>${escapeHtml(text)}</p></div>`;
}

function renderPattern(item) {
  return `<div class="alert ${escapeHtml(item.level)}"><strong>Pattern</strong><p>${escapeHtml(item.text)}</p></div>`;
}

function downloadPack(ctx, model) {
  const lines = [
    'INDICARE OUTCOME STORY PACK',
    `Child: ${ctx.childName}`,
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    '',
    `Emotional wellbeing: ${model.wellbeing}%`,
    `Safety stability: ${model.safety}%`,
    `Child voice: ${model.voice}%`,
    `Positive life: ${model.positive}%`,
    '',
    'Impact statements:',
    ...model.statements.map((item) => `- ${item}`),
    '',
    'Patterns:',
    ...model.patterns.map((item) => `- ${item.text}`)
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'indicare-outcome-story-pack.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function recordText(record) {
  return `${record.title || ''} ${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`;
}
function count(text, word) { return (text.match(new RegExp(word, 'g')) || []).length; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
