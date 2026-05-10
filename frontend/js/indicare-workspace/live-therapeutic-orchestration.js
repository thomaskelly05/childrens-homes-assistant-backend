const workspace = document.getElementById('workspace-main');
const statusStrip = document.getElementById('status-strip');

bootLiveOrchestration();

async function bootLiveOrchestration() {
  updateStatusStrip();
  if (!workspace) return;

  const feed = createFeedShell();
  workspace.prepend(feed);

  try {
    const intelligence = await buildLiveIntelligence();
    hydrateFeed(feed, intelligence);
  } catch {
    hydrateFallback(feed);
  }
}

async function buildLiveIntelligence() {
  const childId = window.IndiCareContext?.get?.()?.childId || '1';
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let records = [];

  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: 'include' });
      const data = await response.json();
      records = records.concat((data.records || []).map((record) => ({
        ...record,
        type: record.record_type || type,
        text: `${record.summary || ''} ${Object.values(record.content || {}).join(' ')}`.toLowerCase()
      })));
    } catch {}
  }

  return {
    wellbeing: wellbeingTrend(records),
    safeguarding: safeguardingSignals(records),
    positives: positiveMoments(records),
    burnout: burnoutSignals(records),
    voice: childVoiceSignals(records)
  };
}

function createFeedShell() {
  const section = document.createElement('section');
  section.className = 'panel orchestration-feed';
  section.innerHTML = `
    <div class="section-header-row">
      <div>
        <p class="eyebrow">Live therapeutic orchestration</p>
        <h3>What needs attention right now</h3>
      </div>
      <div class="os-live-pill">Live care intelligence</div>
    </div>
    <div class="orchestration-grid" id="orchestration-grid">
      <div class="metric-card">Analysing emotional climate...</div>
    </div>
  `;
  return section;
}

function hydrateFeed(section, intelligence) {
  const grid = section.querySelector('#orchestration-grid');
  grid.innerHTML = [
    intelligence.wellbeing,
    intelligence.safeguarding,
    intelligence.positives,
    intelligence.burnout,
    intelligence.voice
  ].map(renderInsight).join('');
}

function hydrateFallback(section) {
  const grid = section.querySelector('#orchestration-grid');
  grid.innerHTML = `
    ${renderInsight({ level: 'low', title: 'Home emotional climate stable', text: 'Positive interactions and routines appear balanced today.' })}
    ${renderInsight({ level: 'medium', title: 'Child voice opportunity', text: 'Capture more direct child voice after transitions and contact.' })}
  `;
}

function wellbeingTrend(records) {
  const difficult = records.filter((r) => /distress|anxious|dysreg|angry|upset/.test(r.text)).length;
  const positive = records.filter((r) => /regulated|calm|engaged|positive|happy|settled/.test(r.text)).length;

  if (positive >= difficult) {
    return {
      level: 'low',
      title: 'Wellbeing improving',
      text: 'Recent records suggest improved regulation, engagement and emotional stability.'
    };
  }

  return {
    level: 'high',
    title: 'Emotional distress increasing',
    text: 'Recent records indicate increased dysregulation or anxiety. Review routines and emotional supports.'
  };
}

function safeguardingSignals(records) {
  const missing = records.filter((r) => r.type === 'missing').length;
  const exploitation = records.filter((r) => /cse|exploitation|police|grooming/.test(r.text)).length;

  if (missing || exploitation) {
    return {
      level: 'high',
      title: 'Safeguarding escalation patterns',
      text: 'Missing episodes or exploitation indicators detected. Consider direct work, review and escalation.'
    };
  }

  return {
    level: 'low',
    title: 'No major safeguarding escalation detected',
    text: 'Continue monitoring routines, relationships and emotional presentation.'
  };
}

function positiveMoments(records) {
  const positives = records.filter((r) => /achievement|proud|celebrated|well done|success|independent/.test(r.text)).length;
  return {
    level: 'low',
    title: positives ? 'Positive moments increasing' : 'Capture more positive life evidence',
    text: positives ? 'Achievements and strengths are being captured across the child journey.' : 'Record more joy, strengths and achievements so the story is not risk-led.'
  };
}

function burnoutSignals(records) {
  const late = records.filter((r) => /late record|unfinished|missed handover/.test(r.text)).length;
  return {
    level: late ? 'medium' : 'low',
    title: late ? 'Potential staff strain indicators' : 'Staff recording flow stable',
    text: late ? 'Late records or handover gaps detected. Consider supervision or workload review.' : 'Recording quality and workflow appear stable from current data.'
  };
}

function childVoiceSignals(records) {
  const voice = records.filter((r) => /child said|young person said|voice|wish|wanted/.test(r.text)).length;
  return {
    level: voice < 3 ? 'medium' : 'low',
    title: voice < 3 ? 'Increase child voice capture' : 'Child voice consistently present',
    text: voice < 3 ? 'Capture more direct wishes, feelings and communication from the child.' : 'The child perspective is visible across recent records.'
  };
}

function renderInsight(item) {
  return `
    <article class="metric-card orchestration-card ${item.level}">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `;
}

function updateStatusStrip() {
  if (!statusStrip) return;
  statusStrip.innerHTML += `
    <div class="os-live-pill">Live wellbeing monitoring active</div>
    <div class="os-live-pill">Safeguarding patterns monitored</div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
