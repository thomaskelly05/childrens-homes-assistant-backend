(() => {
  const STYLE_ID = 'chronology-visual-timeline-style';
  const FLAG = '__indicareChronologyVisualTimeline';

  const FILTERS = [
    ['all', 'All'],
    ['wellbeing', 'Emotional wellbeing'],
    ['achievement', 'Achievements'],
    ['safeguarding', 'Safeguarding'],
    ['family', 'Family impact'],
    ['education', 'Education journey'],
    ['instability', 'Instability'],
    ['positive', 'Positive engagement'],
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .chrono-visual-wrap{display:grid;gap:12px}.chrono-hero{border:1px solid #dbe7f3;background:linear-gradient(180deg,#f8fafc,#fff);border-radius:26px;padding:15px}.chrono-hero h3{margin:0;color:#0f172a}.chrono-hero p{margin:5px 0 0;color:#64748b}.chrono-filter-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.chrono-filter{border:0;border-radius:999px;background:#eef4fb;color:#334155;font-weight:900;padding:8px 10px}.chrono-filter.active,.chrono-filter:hover{background:#dbeafe;color:#1d4ed8}.chrono-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px}.chrono-summary-card{border:1px solid #dbe7f3;background:#fff;border-radius:18px;padding:11px}.chrono-summary-card strong{display:block;font-size:22px;color:#0f172a}.chrono-summary-card span{display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}.chrono-timeline{position:relative;display:grid;gap:12px;padding-left:14px}.chrono-timeline:before{content:"";position:absolute;left:4px;top:0;bottom:0;width:2px;background:#dbe7f3}.chrono-card{position:relative;border:1px solid #dbe7f3;background:#fff;border-radius:22px;padding:14px;box-shadow:0 12px 34px rgba(15,23,42,.06)}.chrono-card:before{content:"";position:absolute;left:-17px;top:22px;width:12px;height:12px;border-radius:999px;background:#155eef;border:3px solid #fff;box-shadow:0 0 0 1px #bfdbfe}.chrono-card.safe:before{background:#dc2626}.chrono-card.positive:before{background:#16a34a}.chrono-card.family:before{background:#9333ea}.chrono-card.education:before{background:#ea580c}.chrono-card h4{margin:0 0 5px;color:#0f172a}.chrono-card p{margin:6px 0;color:#475569;line-height:1.45}.chrono-meta{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.chrono-pill{border-radius:999px;background:#eef4fb;color:#334155;font-size:11px;font-weight:900;padding:5px 8px}.chrono-pill.safe{background:#fee2e2;color:#991b1b}.chrono-pill.good{background:#dcfce7;color:#166534}.chrono-pill.warn{background:#fef3c7;color:#92400e}.chrono-chain{border:1px dashed #bfdbfe;background:#eff6ff;border-radius:16px;padding:9px;margin-top:9px;color:#1e3a8a;font-weight:850}.chrono-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.chrono-actions button{border:0;border-radius:12px;background:#eef4fb;color:#334155;font-weight:900;padding:8px 10px}.chrono-actions button.primary{background:#155eef;color:#fff}.chrono-empty{border:1px dashed #cbd5e1;border-radius:18px;padding:18px;text-align:center;color:#64748b;background:#fff}@media(max-width:760px){.chrono-timeline{padding-left:10px}.chrono-card{border-radius:18px}.chrono-filter-row{overflow:auto;flex-wrap:nowrap;padding-bottom:4px}.chrono-filter{white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function selectedChild() { return window.state?.selectedChild || {}; }
  function timelineData() { const s = selectedChild(); return Array.isArray(s.timeline) ? s.timeline : Array.isArray(s.events) ? s.events : []; }

  function classify(item) {
    const text = `${item.title || ''} ${item.event_title || ''} ${item.summary || ''} ${item.event_summary || ''} ${item.narrative || ''} ${item.category || ''} ${item.source_type || ''}`.toLowerCase();
    const cats = [];
    if (/safeguard|missing|police|risk|self-harm|restraint|exploitation|incident/.test(text)) cats.push('safeguarding', 'instability');
    if (/school|education|pep|attendance|teacher|learning/.test(text)) cats.push('education');
    if (/mum|dad|family|contact|sibling/.test(text)) cats.push('family');
    if (/anxious|distress|upset|dysregulat|sleep|health|wellbeing|therapy|camhs/.test(text)) cats.push('wellbeing');
    if (/positive|achievement|football|progress|kind|resilien|engag|settled|helped|trusted/.test(text)) cats.push('achievement', 'positive');
    return [...new Set(cats.length ? cats : ['all'])];
  }

  function themesFor(item) {
    const cats = classify(item);
    const labels = {
      safeguarding: 'safeguarding', instability: 'instability', education: 'education', family: 'family relationships', wellbeing: 'emotional wellbeing', achievement: 'achievement', positive: 'positive engagement', all: 'general journey'
    };
    return cats.map(c => labels[c] || c);
  }

  function cardClass(item) {
    const cats = classify(item);
    if (cats.includes('safeguarding')) return 'safe';
    if (cats.includes('positive')) return 'positive';
    if (cats.includes('family')) return 'family';
    if (cats.includes('education')) return 'education';
    return '';
  }

  function summaryStats(items) {
    return {
      total: items.length,
      safeguarding: items.filter(i => classify(i).includes('safeguarding')).length,
      wellbeing: items.filter(i => classify(i).includes('wellbeing')).length,
      positive: items.filter(i => classify(i).includes('positive')).length,
    };
  }

  function renderTimeline(filter = 'all') {
    const items = timelineData();
    const filtered = filter === 'all' ? items : items.filter(i => classify(i).includes(filter));
    const stats = summaryStats(items);
    return `<div class="chrono-visual-wrap" data-chrono-visual><section class="chrono-hero"><h3>Child journey timeline</h3><p>Chronology shown as a lived narrative, linking records, emotions, safeguarding, achievements and continuity.</p><div class="chrono-summary-grid"><div class="chrono-summary-card"><strong>${stats.total}</strong><span>timeline entries</span></div><div class="chrono-summary-card"><strong>${stats.wellbeing}</strong><span>wellbeing themes</span></div><div class="chrono-summary-card"><strong>${stats.safeguarding}</strong><span>safeguarding links</span></div><div class="chrono-summary-card"><strong>${stats.positive}</strong><span>positive moments</span></div></div><div class="chrono-filter-row">${FILTERS.map(([key,label]) => `<button class="chrono-filter ${key === filter ? 'active' : ''}" type="button" data-chrono-filter="${esc(key)}">${esc(label)}</button>`).join('')}</div></section><section class="chrono-timeline">${filtered.length ? filtered.map(renderCard).join('') : '<div class="chrono-empty">No chronology entries found for this view.</div>'}</section></div>`;
  }

  function renderCard(item, index) {
    const title = item.title || item.event_title || item.source_type || 'Timeline entry';
    const summary = item.summary || item.event_summary || item.narrative || 'No narrative summary recorded yet.';
    const date = item.occurred_at || item.created_at || item.date || '';
    const childVoice = item.child_voice || item.young_person_voice || '';
    const themes = themesFor(item);
    const chain = buildChain(item, index);
    return `<article class="chrono-card ${cardClass(item)}"><h4>${esc(title)}</h4><div class="chrono-meta"><span class="chrono-pill">${esc(date ? new Date(date).toLocaleDateString() : 'date unknown')}</span>${themes.map(t => `<span class="chrono-pill ${t.includes('safeguarding') ? 'safe' : t.includes('positive') || t.includes('achievement') ? 'good' : t.includes('instability') ? 'warn' : ''}">${esc(t)}</span>`).join('')}</div><p>${esc(summary)}</p>${childVoice ? `<p><strong>Child voice:</strong> ${esc(childVoice)}</p>` : ''}${chain ? `<div class="chrono-chain">${chain}</div>` : ''}<div class="chrono-actions"><button class="primary" data-chrono-ask="${esc(index)}">Ask IndiCare</button><button data-chrono-open="${esc(item.record_id || item.id || '')}">Open linked record</button></div></article>`;
  }

  function buildChain(item, index) {
    const items = timelineData();
    if (items.length < 2) return '';
    const prev = items[index + 1];
    const next = items[index - 1];
    const parts = [];
    if (prev) parts.push(esc(prev.title || prev.event_title || prev.source_type || 'Previous event'));
    parts.push(esc(item.title || item.event_title || item.source_type || 'This event'));
    if (next) parts.push(esc(next.title || next.event_title || next.source_type || 'Next event'));
    return parts.length > 1 ? `Event chain: ${parts.join(' → ')}` : '';
  }

  function mountIntoJourney() {
    const root = document.querySelector('[data-child-tab-view="journey"]');
    if (!root || root.dataset.chronoVisualMounted === 'true') return;
    root.dataset.chronoVisualMounted = 'true';
    root.innerHTML = renderTimeline('all');
    bind(root);
  }

  function bind(root = document) {
    root.querySelectorAll('[data-chrono-filter]').forEach(btn => btn.addEventListener('click', () => {
      const holder = btn.closest('[data-child-tab-view="journey"]') || btn.closest('[data-chrono-visual]')?.parentElement;
      if (holder) { holder.innerHTML = renderTimeline(btn.dataset.chronoFilter); bind(holder); }
    }));
    root.querySelectorAll('[data-chrono-ask]').forEach(btn => btn.addEventListener('click', () => askAboutIndex(Number(btn.dataset.chronoAsk))));
    root.querySelectorAll('[data-chrono-open]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.chronoOpen;
      if (id && window.IndiCareYoungPersonWorkspace?.openRecord) window.IndiCareYoungPersonWorkspace.openRecord(id);
    }));
  }

  function askAboutIndex(index) {
    const item = timelineData()[index] || {};
    const title = item.title || item.event_title || item.source_type || 'this chronology event';
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(`Explain the significance of ${title}. Link it to emotional wellbeing, safeguarding, achievements, relationships, callbacks and what adults should do next.`);
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    const observer = new MutationObserver(() => mountIntoJourney());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('indicare:care-data-changed', () => setTimeout(() => { const root = document.querySelector('[data-child-tab-view="journey"]'); if (root) { root.dataset.chronoVisualMounted = ''; mountIntoJourney(); } }, 100));
    mountIntoJourney();
    window.IndiCareChronologyVisual = { render: renderTimeline, mount: mountIntoJourney };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
