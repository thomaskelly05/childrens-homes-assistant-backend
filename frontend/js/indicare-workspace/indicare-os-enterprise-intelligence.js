import { getOsContext, getOperationalSession, scopeContextToSession, recordType, escapeHtml, isHighPriority } from './indicare-os-context.js';

const INTEL_STATE = {
  signature: '',
  openable: [],
  renderQueued: false,
};

bootEnterpriseIntelligence();

function bootEnterpriseIntelligence() {
  document.addEventListener('click', handleClicks, true);
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-sp-view], [data-launch-session], [data-reset-session]')) scheduleEnterpriseIntel({ force: true });
  }, true);
  window.addEventListener('indicare:os-context-ready', () => scheduleEnterpriseIntel({ force: true }));
  window.addEventListener('indicare:refresh-live-os', () => scheduleEnterpriseIntel({ force: true }));
  scheduleEnterpriseIntel({ force: true });
}

function scheduleEnterpriseIntel(options = {}) {
  if (INTEL_STATE.renderQueued) return;
  INTEL_STATE.renderQueued = true;
  window.requestAnimationFrame(() => {
    INTEL_STATE.renderQueued = false;
    renderEnterpriseIntel(options);
  });
}

function renderEnterpriseIntel({ force = false } = {}) {
  const main = document.getElementById('sp-main');
  if (!main) return;
  const title = main.querySelector('.sp-page-head h1')?.textContent?.trim();
  if (title !== 'Dashboard') return;

  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const signature = `${context.documents.length}:${context.chronology.length}:${context.safeguarding.length}:${context.tasks.length}:${context.children.length}`;
  if (!force && INTEL_STATE.signature === signature && main.querySelector('[data-os-enterprise-intel]')) return;
  INTEL_STATE.signature = signature;
  INTEL_STATE.openable = [];

  const metrics = buildMetrics(context);
  const trends = buildTrends(context);
  const heatmap = buildSafeguardingHeatmap(context);
  const pressure = buildManagerPressure(context, metrics);
  const html = `
    <section class="sp-card os-enterprise-intel" data-os-enterprise-intel>
      <div class="sp-card-head">
        <div>
          <h2>Enterprise operational intelligence</h2>
          <p>Safeguarding, incidents, missing episodes, review pressure and placement stability from the live OS context.</p>
        </div>
        <button type="button" data-ai-enterprise-intel>AI command summary →</button>
      </div>
      <section class="os-intel-metrics">
        ${metricTile('Safeguarding pressure', metrics.safeguardingPressure, 'Open concerns, missing episodes and risks', metrics.safeguardingPressure ? 'amber' : 'green')}
        ${metricTile('Incident trend', metrics.incidents, 'Incident-linked records in context', metrics.incidents ? 'amber' : 'green')}
        ${metricTile('Missing episodes', metrics.missing, 'Missing-from-home or return records', metrics.missing ? 'red' : 'green')}
        ${metricTile('Manager load', metrics.managerLoad, 'Reviews, actions and QA items', metrics.managerLoad ? 'amber' : 'green')}
        ${metricTile('Placement stability', metrics.stabilityScore + '%', 'Higher means fewer live risk indicators', metrics.stabilityScore >= 75 ? 'green' : metrics.stabilityScore >= 50 ? 'amber' : 'red')}
      </section>
      <section class="os-intel-layout">
        <article class="os-intel-panel"><div class="sp-card-head compact"><h2>Safeguarding heatmap</h2><span>${heatmap.length}</span></div>${heatmapList(heatmap)}</article>
        <article class="os-intel-panel"><div class="sp-card-head compact"><h2>Trend signals</h2><span>${trends.length}</span></div>${trendList(trends)}</article>
        <article class="os-intel-panel"><div class="sp-card-head compact"><h2>Manager command signals</h2><span>${pressure.length}</span></div>${pressureList(pressure)}</article>
      </section>
    </section>`;

  const existing = main.querySelector('[data-os-enterprise-intel]');
  if (existing) existing.outerHTML = html;
  else {
    const after = main.querySelector('[data-os-live-collab]') || main.querySelector('[data-os-qa-dashboard]') || main.querySelector('[data-os-activity-intelligence]');
    if (after) after.insertAdjacentHTML('afterend', html);
    else main.insertAdjacentHTML('beforeend', html);
  }
}

function buildMetrics(context) {
  const all = allRecords(context);
  const safeguardingPressure = all.filter((item) => /safeguarding|risk|concern|missing|exploitation|police/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`) && !closed(item)).length;
  const incidents = all.filter((item) => /incident|restraint|physical|damage|aggression|assault/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`)).length;
  const missing = all.filter((item) => /missing|return discussion|return home/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`)).length;
  const managerLoad = all.filter((item) => /review|submitted|pending|changes|returned|draft|overdue/i.test(`${item.status || ''} ${item.workflow_status || ''} ${item.manager_review_status || ''}`)).length;
  const riskLoad = safeguardingPressure + incidents + missing + managerLoad;
  const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - riskLoad * 6)));
  return { safeguardingPressure, incidents, missing, managerLoad, stabilityScore };
}

function buildTrends(context) {
  const all = allRecords(context);
  return [
    trend('Incidents', all.filter((item) => /incident|restraint|aggression|damage|assault/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`))),
    trend('Missing from home', all.filter((item) => /missing|return discussion/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`))),
    trend('Safeguarding', all.filter((item) => /safeguarding|risk|concern|exploitation/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`))),
    trend('Recording review', all.filter((item) => /submitted|pending|changes|returned|review/i.test(`${item.status || ''} ${item.workflow_status || ''} ${item.manager_review_status || ''}`))),
    trend('Health and wellbeing', all.filter((item) => /health|wellbeing|medication|medical|camhs/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`))),
  ].filter((item) => item.count > 0);
}

function trend(label, rows) {
  const recent = rows.filter((item) => withinDays(itemDate(item), 7)).length;
  const older = rows.length - recent;
  const direction = recent > older ? 'rising' : recent === 0 ? 'quiet' : 'steady';
  return { label, count: rows.length, recent, direction, rows };
}

function buildSafeguardingHeatmap(context) {
  const children = context.children || [];
  return children.map((child) => {
    const name = child.name || child.full_name || child.preferred_name || child.young_person_name || 'Young person';
    const linked = allRecords(context).filter((item) => linkedToChild(item, child));
    const safeguarding = linked.filter((item) => /safeguarding|risk|concern|missing|incident/i.test(`${recordType(item)} ${item.title || ''} ${item.summary || ''}`));
    const open = safeguarding.filter((item) => !closed(item));
    const high = safeguarding.filter((item) => isHighPriority(item) || /high|critical|red|urgent/i.test(`${item.severity || ''} ${item.risk_level || ''} ${item.priority || ''}`));
    const score = open.length * 3 + high.length * 5;
    return { child, name, score, open: open.length, high: high.length, latest: safeguarding.sort(newestRecord)[0] };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
}

function buildManagerPressure(context, metrics) {
  const signals = [];
  if (metrics.managerLoad) signals.push({ title: 'Review queue pressure', body: `${metrics.managerLoad} records/actions may need manager review or amendment.`, tone: 'amber', view: 'reviews' });
  if (metrics.safeguardingPressure) signals.push({ title: 'Safeguarding oversight', body: `${metrics.safeguardingPressure} live safeguarding/risk indicators require oversight.`, tone: 'red', view: 'safeguarding' });
  if (metrics.missing) signals.push({ title: 'Missing episode review', body: `${metrics.missing} missing-from-home signals should be checked against chronology and return discussions.`, tone: 'red', view: 'chronology' });
  if (metrics.stabilityScore < 75) signals.push({ title: 'Placement stability', body: 'Risk and review load suggests the manager should review placement stability indicators.', tone: 'amber', view: 'dashboard' });
  if (!signals.length) signals.push({ title: 'Stable operating picture', body: 'No major live pressure signals were generated from the current context.', tone: 'green', view: 'dashboard' });
  return signals;
}

function heatmapList(rows) {
  if (!rows.length) return empty('No child-level safeguarding heatmap signals were generated from the current context.');
  return `<div class="os-intel-list">${rows.map((row) => { const index = registerOpenable(row.latest); return `<button type="button" data-open-intel-record="${index}" class="${row.score >= 8 ? 'red' : 'amber'}"><strong>${escapeHtml(row.name)}</strong><span>${row.open} open · ${row.high} high priority</span><em>${escapeHtml(row.latest?.title || row.latest?.summary || 'Open context')}</em></button>`; }).join('')}</div>`;
}

function trendList(rows) {
  if (!rows.length) return empty('No trend signals were generated yet.');
  return `<div class="os-intel-list">${rows.map((row) => { const first = row.rows[0]; const index = registerOpenable(first); return `<button type="button" data-open-intel-record="${index}" class="${row.direction === 'rising' ? 'amber' : 'blue'}"><strong>${escapeHtml(row.label)}</strong><span>${row.count} total · ${row.recent} recent · ${escapeHtml(row.direction)}</span><em>${escapeHtml(first?.title || first?.summary || 'Open related record')}</em></button>`; }).join('')}</div>`;
}

function pressureList(rows) {
  return `<div class="os-intel-list">${rows.map((row) => `<button type="button" data-sp-view="${escapeHtml(row.view)}" class="${escapeHtml(row.tone)}"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.body)}</span><em>Open workspace</em></button>`).join('')}</div>`;
}

function handleClicks(event) {
  const open = event.target.closest?.('[data-open-intel-record]');
  if (open) {
    event.preventDefault();
    const record = INTEL_STATE.openable[Number(open.dataset.openIntelRecord)];
    if (record) window.dispatchEvent(new CustomEvent('indicare:open-record', { detail: record }));
    return;
  }
  if (event.target.closest?.('[data-ai-enterprise-intel]')) {
    event.preventDefault();
    openAssistantPrompt('Create an enterprise operational command summary from the current OS context. Cover safeguarding heatmap, incidents, missing episodes, manager review load, placement stability, staffing pressure and today\'s leadership actions. Use live data only.');
  }
}

function registerOpenable(record) { const index = INTEL_STATE.openable.length; INTEL_STATE.openable.push(record); return index; }
function allRecords(context) { return [...arrayFrom(context.documents), ...arrayFrom(context.chronology), ...arrayFrom(context.safeguarding), ...arrayFrom(context.tasks), ...arrayFrom(context.reports)]; }
function linkedToChild(record, child) { const id = String(record.young_person_id || record.child_id || record.childId || record.youngPersonId || ''); const name = String(record.child_name || record.young_person_name || record.childName || '').toLowerCase(); const childId = String(child.id || child.young_person_id || child.child_id || child.youngPersonId || ''); const resolvedName = String(child.name || child.full_name || child.preferred_name || child.young_person_name || '').toLowerCase(); return (id && id === childId) || (name && name === resolvedName); }
function closed(item) { return /closed|resolved|approved|complete|archived/i.test(String(item.status || item.workflow_status || item.manager_review_status || '')); }
function itemDate(item) { return Date.parse(item.updated_at || item.created_at || item.occurred_at || item.event_datetime || item.session_date || 0); }
function withinDays(date, days) { return Number.isFinite(date) && Date.now() - date <= days * 24 * 60 * 60 * 1000; }
function newestRecord(a, b) { return itemDate(b) - itemDate(a); }
function metricTile(label, value, body, tone) { return `<article class="os-intel-metric ${escapeHtml(tone)}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(body)}</small></article>`; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function empty(text) { return `<div class="os-rail-empty">${escapeHtml(text)}</div>`; }
function openAssistantPrompt(prompt) { document.querySelector('.sp-ai-bubble')?.click(); setTimeout(() => { const input = document.getElementById('ic-assistant-input'); if (!input) return; input.value = prompt; document.getElementById('ic-send-assistant')?.click(); }, 160); }

window.IndiCareEnterpriseIntelligence = { refresh: () => renderEnterpriseIntel({ force: true }) };
