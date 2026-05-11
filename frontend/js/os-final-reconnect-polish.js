(() => {
  const FLAG = '__indicareFinalReconnectPolish';
  const STYLE_ID = 'os-final-reconnect-polish-style';
  const PERF_KEY = '__indicareReconnectPerf';

  if (window[FLAG]) return;
  window[FLAG] = true;

  function safe(label, fn) {
    try { return fn(); } catch (error) { console.error(`[IndiCare final reconnect] ${label}`, error); return undefined; }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function listFrom(payload, ...keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }

  function state() { return window.state || {}; }
  function selectedChild() { return state().selectedChild || {}; }
  function profile() { return selectedChild().profile || {}; }
  function childName() { const p = profile(); return p.display_name || p.preferred_name || p.first_name || p.name || 'selected young person'; }
  function timeline() { return listFrom(selectedChild(), 'timeline', 'events').concat(listFrom(state().chronology, 'items', 'events')).slice(0, 120); }
  function records() { return listFrom(state().care, 'records', 'items').slice(0, 120); }
  function patterns() { return listFrom(state().patterns, 'patterns', 'items').slice(0, 120); }
  function placements() { return listFrom(state().placements, 'placements', 'items').slice(0, 120); }
  function inspection() { return listFrom(state().inspection, 'workspaces', 'items').slice(0, 120); }
  function wellbeing() { return listFrom(state().wellbeing, 'staff', 'homes').slice(0, 120); }
  function commands() { return listFrom(state().command, 'items', 'command_items').slice(0, 120); }
  function alerts() { return listFrom(state().network, 'alerts', 'items').slice(0, 120); }
  function textOf(item) { try { return JSON.stringify(item || {}).toLowerCase(); } catch { return ''; } }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-storyline{display:grid;gap:10px}.os-story-card{border:1px solid #dbe7f3;background:#fff;border-radius:20px;padding:13px;position:relative;overflow:hidden}.os-story-card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:#155eef}.os-story-card.emotional:before{background:#7c3aed}.os-story-card.safeguarding:before{background:#dc2626}.os-story-card.positive:before{background:#16a34a}.os-story-card.family:before{background:#f97316}.os-story-title{font-weight:950;color:#0f172a;margin-bottom:4px}.os-story-summary{color:#475569;line-height:1.45}.os-chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.os-chip{border-radius:999px;background:#eef4fb;color:#334155;font-size:11px;font-weight:850;padding:5px 8px}.os-visual-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.os-visual-card{border:1px solid #dbe7f3;background:#fff;border-radius:20px;padding:13px}.os-visual-card strong{display:block;font-size:26px;color:#0f172a}.os-visual-card span{display:block;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.os-trend-bar{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:8px}.os-trend-fill{height:100%;background:#155eef;border-radius:999px}.os-trend-fill.risk{background:#dc2626}.os-trend-fill.positive{background:#16a34a}.os-assist-nudge{border:1px solid #bfdbfe;background:#eff6ff;border-radius:18px;padding:12px;margin:10px 0;color:#1e3a8a}.os-assist-nudge button{border:0;border-radius:12px;background:#155eef;color:#fff;font-weight:900;padding:8px 10px;margin-top:8px}.os-fast-actions{position:sticky;bottom:12px;z-index:35;display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.os-fast-actions button{border:0;border-radius:999px;padding:10px 13px;font-weight:950;background:#155eef;color:#fff;box-shadow:0 14px 32px rgba(21,94,239,.2)}.os-fast-actions button.secondary{background:#fff;color:#334155;border:1px solid #dbe7f3}.os-perf-note{font-size:11px;color:#64748b;margin-top:8px}@media(max-width:800px){.os-fast-actions{position:fixed;left:12px;right:12px;bottom:12px;background:rgba(255,255,255,.92);border:1px solid #dbe7f3;border-radius:20px;padding:8px;backdrop-filter:blur(12px)}.os-fast-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function category(item) {
    const text = textOf(item);
    if (/missing|safeguard|police|risk|harm|incident|exploitation|restraint|intervention/.test(text)) return 'safeguarding';
    if (/positive|achievement|progress|settled|strength|repair|success|engaged/.test(text)) return 'positive';
    if (/family|contact|mum|dad|sibling|parent/.test(text)) return 'family';
    if (/emotion|regulat|anxious|upset|angry|low|presentation|mood|wellbeing/.test(text)) return 'emotional';
    return 'general';
  }

  function chips(item) {
    const text = textOf(item);
    const out = [];
    if (/safeguard|missing|risk|incident|police/.test(text)) out.push('Safeguarding');
    if (/family|contact|mum|dad|sibling/.test(text)) out.push('Family impact');
    if (/school|education|learning|attendance/.test(text)) out.push('Education');
    if (/health|sleep|medication|appointment|camhs/.test(text)) out.push('Health');
    if (/repair|trusted|relationship|voice|key work/.test(text)) out.push('Relational');
    if (/positive|achievement|progress|strength/.test(text)) out.push('Progress');
    return out.length ? out : ['Chronology'];
  }

  function renderStoryCard(item) {
    const title = item.title || item.event_title || item.record_type || 'Chronology event';
    const summary = item.summary || item.event_summary || item.narrative || item.staff_analysis || item.therapeutic_analysis || '';
    const cat = category(item);
    return `<article class="os-story-card ${esc(cat)}"><div class="os-story-title">${esc(title)}</div><div class="os-story-summary">${esc(summary).slice(0, 320) || 'Linked chronology item.'}</div><div class="os-chip-row">${chips(item).map(chip => `<span class="os-chip">${esc(chip)}</span>`).join('')}</div></article>`;
  }

  function reconnectChronologyStorytelling() {
    const board = document.getElementById('chronology-board');
    if (board && board.dataset.storyPolished !== 'true') {
      const items = timeline().slice(0, 10);
      if (items.length) {
        board.dataset.storyPolished = 'true';
        board.innerHTML = `<div class="os-assist-nudge"><strong>Living chronology:</strong> these entries are grouped by meaning, not just date. <button type="button" data-final-ask="chronology storytelling">Ask IndiCare for chronology meaning</button></div><div class="os-storyline">${items.map(renderStoryCard).join('')}</div>`;
      }
    }

    const childWorkspace = document.getElementById('child-workspace');
    if (childWorkspace && childWorkspace.dataset.storyActions !== 'true') {
      childWorkspace.dataset.storyActions = 'true';
      appendFastActions(childWorkspace, 'child');
    }
  }

  function count(regex, items) { return items.reduce((n, item) => n + (regex.test(textOf(item)) ? 1 : 0), 0); }

  function reconnectOversightVisuals() {
    const provider = document.getElementById('provider-board') || document.getElementById('provider-matrix')?.parentElement;
    if (provider && provider.dataset.visualPolished !== 'true') {
      provider.dataset.visualPolished = 'true';
      const all = timeline().concat(records(), patterns(), commands(), alerts(), placements());
      const risk = patterns().length + alerts().length + count(/risk|missing|incident|safeguard|police|harm/, all);
      const relational = count(/repair|trusted|relationship|voice|family|contact|key work/, all);
      const evidence = inspection().length + count(/sccif|ofsted|inspection|evidence|quality/, all);
      const placement = placements().length + count(/placement|stability|routine|disruption|fragile/, all);
      const visual = document.createElement('section');
      visual.className = 'os-visual-grid';
      visual.innerHTML = `${metricCard('Safeguarding pressure', risk, 'risk', 90)}${metricCard('Relational practice', relational, 'positive', 70)}${metricCard('Inspection evidence', evidence, '', 80)}${metricCard('Placement stability', placement, '', 65)}`;
      provider.prepend(visual);
    }

    enhanceBoard('safeguarding-board', 'Safeguarding hotspots', /missing|risk|incident|police|exploitation|safeguard/);
    enhanceBoard('placements-board', 'Placement fragility signals', /placement|stability|routine|disruption|fragile/);
    enhanceBoard('workforce-board', 'Workforce pressure', /burnout|emotional|safeguarding|pressure|resilience/);
    enhanceBoard('inspection-board', 'Inspection evidence links', /sccif|ofsted|inspection|evidence|quality|reg 44/);
  }

  function metricCard(label, value, type, max) {
    const pct = Math.max(8, Math.min(100, Math.round((Number(value || 0) / Math.max(max || 100, 1)) * 100)));
    return `<article class="os-visual-card"><strong>${esc(value)}</strong><span>${esc(label)}</span><div class="os-trend-bar"><div class="os-trend-fill ${esc(type)}" style="width:${pct}%"></div></div></article>`;
  }

  function enhanceBoard(id, title, regex) {
    const board = document.getElementById(id);
    if (!board || board.dataset.boardEnhanced === 'true') return;
    board.dataset.boardEnhanced = 'true';
    const all = timeline().concat(records(), patterns(), commands(), alerts(), placements(), inspection(), wellbeing());
    const hits = all.filter(item => regex.test(textOf(item))).slice(0, 5);
    if (!hits.length) return;
    const panel = document.createElement('section');
    panel.className = 'os-assist-nudge';
    panel.innerHTML = `<strong>${esc(title)}:</strong> ${hits.length} connected signals found. <button type="button" data-final-ask="${esc(title)}">Ask IndiCare</button>`;
    board.prepend(panel);
  }

  function reconnectAssistantNudges() {
    const targets = [
      ['care-list', 'recording continuity'],
      ['pattern-list', 'safeguarding patterns'],
      ['placement-list', 'placement stability'],
      ['recommendations', 'leadership recommendations'],
      ['alerts', 'live safeguarding alerts'],
    ];
    targets.forEach(([id, topic]) => {
      const node = document.getElementById(id);
      if (!node || node.dataset.assistNudge === 'true') return;
      node.dataset.assistNudge = 'true';
      const nudge = document.createElement('div');
      nudge.className = 'os-assist-nudge';
      nudge.innerHTML = `<strong>Assistant context:</strong> Ask IndiCare to summarise ${esc(topic)} and identify what adults should know. <button type="button" data-final-ask="${esc(topic)}">Ask IndiCare</button>`;
      node.parentElement?.insertBefore(nudge, node);
    });
  }

  function appendFastActions(host, context = 'general') {
    if (!host || host.querySelector('[data-final-fast-actions]')) return;
    const actions = document.createElement('div');
    actions.className = 'os-fast-actions';
    actions.dataset.finalFastActions = 'true';
    actions.innerHTML = `<button type="button" data-final-record="daily_note">Daily note</button><button type="button" data-final-record="incident">Incident</button><button type="button" data-final-record="safeguarding">Safeguarding</button><button type="button" class="secondary" data-final-ask="${esc(context)} continuity">Ask IndiCare</button>`;
    host.appendChild(actions);
  }

  function reconnectMobileAndFastEntry() {
    const workspace = document.getElementById('workspace') || document.querySelector('.ic-workspace');
    appendFastActions(workspace, 'OS');
  }

  function performanceGuards() {
    window[PERF_KEY] ||= { lastRefresh: 0, refreshes: 0 };
    const perf = window[PERF_KEY];
    perf.refreshes += 1;
    perf.lastRefresh = Date.now();
    const workspace = document.getElementById('workspace') || document.querySelector('.ic-workspace');
    if (workspace && !document.querySelector('[data-final-perf-note]')) {
      const note = document.createElement('div');
      note.className = 'os-perf-note';
      note.dataset.finalPerfNote = 'true';
      note.textContent = 'OS enhancements are loaded as safe layered modules with batched refresh guards.';
      workspace.appendChild(note);
    }
  }

  function bindActions() {
    document.querySelectorAll('[data-final-ask]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => ask(btn.dataset.finalAsk || 'operational context'));
    });
    document.querySelectorAll('[data-final-record]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => window.IndiCareTherapeuticRecordCreator?.open?.(btn.dataset.finalRecord || 'daily_note'));
    });
  }

  function ask(topic) {
    const prompt = `Context: ${topic}. Child: ${childName()}. Summarise chronology meaning, safeguarding signals, relational practice, placement stability, continuity actions, inspection evidence and next steps. Keep it calm, practical and suitable for a children's home.`;
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);
  }

  function refresh() {
    safe('chronology storytelling', reconnectChronologyStorytelling);
    safe('oversight visuals', reconnectOversightVisuals);
    safe('assistant nudges', reconnectAssistantNudges);
    safe('mobile fast entry', reconnectMobileAndFastEntry);
    safe('bind actions', bindActions);
    safe('performance guards', performanceGuards);
  }

  function patchLoadAll() {
    if (window.__indicareFinalReconnectLoadAllPatched || typeof window.loadAll !== 'function') return;
    window.__indicareFinalReconnectLoadAllPatched = true;
    const original = window.loadAll;
    window.loadAll = async function patchedLoadAll(...args) {
      const result = await original.apply(this, args);
      setTimeout(() => window.IndiCareSafe?.debounce?.('final-reconnect-refresh', refresh, 200) || refresh(), 100);
      return result;
    };
  }

  function boot() {
    injectStyles();
    patchLoadAll();
    refresh();
    document.addEventListener('indicare:care-data-changed', () => window.IndiCareSafe?.debounce?.('final-reconnect-care-change', refresh, 250) || setTimeout(refresh, 250));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('final-reconnect-mutation', refresh, 500) || setTimeout(refresh, 500));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareFinalReconnectPolish = { refresh };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safe('boot', boot)); else boot();
})();
