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
    style.textContent = `.chrono-visual-wrap{display:grid;gap:12px}.chrono-hero{border:1px solid #dbe7f3;background:linear-gradient(180deg,#f8fafc,#fff);border-radius:26px;padding:15px}.chrono-hero h3{margin:0;color:#0f172a}.chrono-hero p{margin:5px 0 0;color:#64748b}.chrono-filter-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.chrono-filter{border:0;border-radius:999px;background:#eef4fb;color:#334155;font-weight:900;padding:8px 10px}.chrono-filter.active,.chrono-filter:hover{background:#dbeafe;color:#1d4ed8}.chrono-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px}.chrono-summary-card{border:1px solid #dbe7f3;background:#fff;border-radius:18px;padding:11px}.chrono-summary-card strong{display:block;font-size:22px;color:#0f172a}.chrono-summary-card span{display:block;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}.chrono-timeline{position:relative;display:grid;gap:12px;padding-left:14px}.chrono-timeline:before{content:"";position:absolute;left:4px;top:0;bottom:0;width:2px;background:#dbe7f3}.chrono-card{position:relative;border:1px solid #dbe7f3;background:#fff;border-radius:22px;padding:14px;box-shadow:0 12px 34px rgba(15,23,42,.06)}.chrono-card:before{content:"";position:absolute;left:-17px;top:22px;width:12px;height:12px;border-radius:999px;background:#155eef;border:3px solid #fff;box-shadow:0 0 0 1px #bfdbfe}.chrono-empty{border:1px dashed #cbd5e1;border-radius:18px;padding:18px;text-align:center;color:#64748b;background:#fff}`;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function selectedChild() { return window.state?.selectedChild || {}; }
  function timelineData() { const s = selectedChild(); return Array.isArray(s.timeline) ? s.timeline : Array.isArray(s.events) ? s.events : []; }

  function classify(item) {
    const text = `${item.title || ''} ${item.event_title || ''} ${item.summary || ''}`.toLowerCase();
    const cats = [];
    if (/safeguard|missing|police|risk|incident/.test(text)) cats.push('safeguarding', 'instability');
    if (/school|education|pep/.test(text)) cats.push('education');
    if (/family|mum|dad|contact/.test(text)) cats.push('family');
    if (/wellbeing|distress|anxious|therapy/.test(text)) cats.push('wellbeing');
    if (/positive|achievement|football|progress|settled/.test(text)) cats.push('achievement', 'positive');
    return [...new Set(cats.length ? cats : ['all'])];
  }

  function renderCard(item) {
    return `<article class="chrono-card"><h4>${esc(item.title || item.event_title || 'Timeline entry')}</h4><p>${esc(item.summary || item.event_summary || item.narrative || '')}</p></article>`;
  }

  function renderTimeline(filter = 'all') {
    const items = timelineData();
    const filtered = filter === 'all' ? items : items.filter(i => classify(i).includes(filter));
    return `<div class="chrono-visual-wrap" data-chrono-visual><section class="chrono-hero"><h3>Child journey timeline</h3><p>Connected chronology and emotional journey.</p><div class="chrono-filter-row">${FILTERS.map(([key,label]) => `<button class="chrono-filter ${key === filter ? 'active' : ''}" type="button" data-chrono-filter="${esc(key)}">${esc(label)}</button>`).join('')}</div></section><section class="chrono-timeline">${filtered.length ? filtered.map(renderCard).join('') : '<div class="chrono-empty">No chronology entries found.</div>'}</section></div>`;
  }

  function bind(root = document) {
    root.querySelectorAll('[data-chrono-filter]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const container = document.querySelector('[data-chrono-render-root]');
        if (!container) return;
        container.innerHTML = renderTimeline(btn.dataset.chronoFilter);
        bind(container);
      });
    });
  }

  function mountIntoJourney() {
    const root = document.querySelector('[data-child-tab-view="journey"]');
    if (!root) return;

    let container = root.querySelector('[data-chrono-render-root]');

    if (!container) {
      container = document.createElement('div');
      container.dataset.chronoRenderRoot = 'true';
      root.prepend(container);
    }

    container.innerHTML = renderTimeline('all');
    bind(container);
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();

    let mounted = false;

    const scheduleMount = () => {
      if (mounted) return;
      mounted = true;
      setTimeout(() => {
        mounted = false;
        window.IndiCareSafe?.run('chronology mount', mountIntoJourney) || mountIntoJourney();
      }, 80);
    };

    const observer = new MutationObserver(() => scheduleMount());
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('indicare:care-data-changed', () => scheduleMount());

    scheduleMount();

    window.IndiCareChronologyVisual = {
      render: renderTimeline,
      mount: mountIntoJourney
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
