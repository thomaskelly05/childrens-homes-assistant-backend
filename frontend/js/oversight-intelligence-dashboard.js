(() => {
  const FLAG = '__indicareOversightDashboard';
  const STYLE_ID = 'oversight-intelligence-dashboard-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .oversight-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.oversight-card{border:1px solid #dbe7f3;background:#fff;border-radius:22px;padding:14px;box-shadow:0 12px 34px rgba(15,23,42,.06)}.oversight-card h4{margin:0 0 6px;color:#0f172a}.oversight-card p{margin:5px 0;color:#475569}.oversight-score{font-size:30px;font-weight:950;color:#155eef}.oversight-tag{display:inline-flex;border-radius:999px;background:#eef4fb;color:#334155;font-size:11px;font-weight:900;padding:5px 8px;margin:2px}.oversight-alert{border-left:4px solid #dc2626;padding-left:10px}.oversight-good{border-left:4px solid #16a34a;padding-left:10px}.oversight-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.oversight-actions button{border:0;border-radius:12px;padding:8px 10px;font-weight:900;background:#eef4fb}.oversight-actions button.primary{background:#155eef;color:#fff}
    `;
    document.head.appendChild(style);
  }

  function selectedChildren() {
    return window.state?.children || window.state?.young_people || [];
  }

  function buildDashboard() {
    const children = selectedChildren();
    const highRisk = children.filter(c => Number(c.disruption_risk_score || 0) > 70).length;
    const wellbeing = children.filter(c => /anxious|distress|dysregulat/i.test(JSON.stringify(c))).length;
    const missing = children.filter(c => /missing/i.test(JSON.stringify(c))).length;
    return `<section class="oversight-grid" data-oversight-dashboard><article class="oversight-card"><div class="oversight-score">${children.length}</div><h4>Children in operational view</h4><p>Live connected operational overview.</p></article><article class="oversight-card oversight-alert"><div class="oversight-score">${highRisk}</div><h4>Placement stability concerns</h4><p>Children with elevated disruption/stability indicators.</p><div class="oversight-actions"><button class="primary" data-over-ask="stability">Ask IndiCare</button></div></article><article class="oversight-card"><div class="oversight-score">${wellbeing}</div><h4>Emotional wellbeing themes</h4><p>Children currently showing emotional distress indicators.</p><span class="oversight-tag">wellbeing</span><span class="oversight-tag">continuity</span></article><article class="oversight-card oversight-good"><div class="oversight-score">${Math.max(children.length - highRisk,0)}</div><h4>Positive engagement indicators</h4><p>Protective relationships, routines and achievements identified.</p></article><article class="oversight-card"><h4>Safeguarding hotspots</h4><p>${missing} children currently linked to missing/contextual safeguarding indicators.</p><div class="oversight-actions"><button data-over-ask="safeguarding">Safeguarding themes</button></div></article><article class="oversight-card"><h4>Reflective leadership</h4><p>Use AI-assisted summaries to prepare supervision, handover and governance reviews.</p><div class="oversight-actions"><button data-over-ask="reflection">Reflective overview</button></div></article></section>`;
  }

  function mount() {
    const root = document.querySelector('[data-home-dashboard]') || document.querySelector('[data-provider-dashboard]');
    if (!root || root.querySelector('[data-oversight-dashboard]')) return;
    root.insertAdjacentHTML('afterbegin', buildDashboard());
    bind(root);
  }

  function bind(root) {
    root.querySelectorAll('[data-over-ask]').forEach(btn => btn.addEventListener('click', () => {
      const prompts = {
        stability: 'Summarise placement stability concerns, emotional wellbeing indicators and continuity risks across the operational view.',
        safeguarding: 'Identify emerging safeguarding patterns, contextual safeguarding indicators and unresolved follow-up concerns.',
        reflection: 'Prepare a reflective leadership overview focused on emotional wellbeing, continuity, child voice and relational practice.'
      };
      window.IndiCareOSAssistant?.open?.();
      window.IndiCareOSAssistant?.ask?.(prompts[btn.dataset.overAsk] || prompts.reflection);
    }));
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    const observer = new MutationObserver(() => mount());
    observer.observe(document.body, { childList: true, subtree: true });
    mount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
