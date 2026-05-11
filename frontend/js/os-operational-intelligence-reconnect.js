(() => {
  const FLAG = '__indicareOperationalIntelligenceReconnect';
  const STYLE_ID = 'os-operational-intelligence-reconnect-style';
  const STRIP_ID = 'os-intelligence-memory-strip';

  if (window[FLAG]) return;
  window[FLAG] = true;

  function safe(label, fn) {
    try { return fn(); } catch (error) { console.error(`[IndiCare intelligence reconnect] ${label}`, error); return undefined; }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-intel-strip{border:1px solid #dbe7f3;background:#fff;border-radius:24px;padding:14px;margin:14px 0;box-shadow:0 16px 42px rgba(15,23,42,.07)}
      .os-intel-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.os-intel-head h3{margin:0;color:#0f172a}.os-intel-head small{color:#64748b}.os-intel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.os-intel-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:12px;cursor:pointer}.os-intel-card:hover{background:#fff;border-color:#93c5fd}.os-intel-card strong{display:block;color:#0f172a;font-size:20px}.os-intel-card span{display:block;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.os-intel-card p{margin:6px 0 0;color:#475569;line-height:1.4;font-size:13px}.os-context-chip{display:inline-flex;border-radius:999px;background:#eef4fb;color:#334155;font-weight:850;font-size:11px;padding:5px 8px;margin:2px}.os-practice-marker{border-left:4px solid #16a34a;padding-left:10px}.os-risk-marker{border-left:4px solid #dc2626;padding-left:10px}.os-inspection-marker{border-left:4px solid #155eef;padding-left:10px}.os-relational-marker{border-left:4px solid #7c3aed;padding-left:10px}.os-memory-action{border:0;border-radius:13px;background:#155eef;color:#fff;font-weight:900;padding:9px 11px}.os-memory-action.secondary{background:#eef4fb;color:#334155}.os-memory-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    `;
    document.head.appendChild(style);
  }

  function state() { return window.state || {}; }
  function selectedChild() { return state().selectedChild || {}; }
  function profile() { return selectedChild().profile || {}; }
  function listFrom(payload, ...keys) { if (Array.isArray(payload)) return payload; for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }
  function textOf(value) { try { return JSON.stringify(value || {}).toLowerCase(); } catch { return ''; } }
  function childName() { const p = profile(); return p.display_name || p.preferred_name || p.first_name || p.name || 'selected young person'; }
  function timeline() { return listFrom(selectedChild(), 'timeline', 'events').concat(listFrom(state().chronology, 'items', 'events')).slice(0, 80); }
  function records() { return listFrom(state().care, 'records', 'items').slice(0, 80); }
  function patterns() { return listFrom(state().patterns, 'patterns', 'items').slice(0, 80); }
  function placements() { return listFrom(state().placements, 'placements', 'items').slice(0, 80); }
  function inspection() { return listFrom(state().inspection, 'workspaces', 'items').slice(0, 80); }
  function commands() { return listFrom(state().command, 'items', 'command_items').slice(0, 80); }
  function alerts() { return listFrom(state().network, 'alerts', 'items').slice(0, 80); }

  function countMatches(items, regex) { return items.reduce((total, item) => total + (regex.test(textOf(item)) ? 1 : 0), 0); }

  function intelligenceSummary() {
    const all = timeline().concat(records(), patterns(), commands(), alerts());
    return {
      safeguarding: patterns().length + alerts().length + countMatches(all, /safeguard|missing|police|exploitation|risk|harm|incident/),
      inspection: inspection().length + countMatches(all, /sccif|ofsted|inspection|evidence|quality|reg 44|reg44|helped and protected|experiences and progress/),
      relational: countMatches(all, /repair|relationship|trusted|co-regulat|coregulat|family|contact|mum|dad|sibling|key work|voice/),
      placement: placements().length + countMatches(all, /placement|stability|disruption|breakdown|routine|fragile/),
      continuity: commands().length + countMatches(all, /callback|follow-up|follow up|action|required|review|handover|what adults should know/),
      positive: countMatches(all, /positive|achievement|progress|strength|settled|engaged|repair|success|protective/),
    };
  }

  function ensureMemoryStrip() {
    const workspace = document.getElementById('workspace') || document.querySelector('.ic-workspace');
    if (!workspace) return null;
    let strip = document.getElementById(STRIP_ID);
    if (!strip) {
      strip = document.createElement('section');
      strip.id = STRIP_ID;
      strip.className = 'os-intel-strip';
      const hero = workspace.querySelector('.ic-hero');
      if (hero?.nextSibling) workspace.insertBefore(strip, hero.nextSibling);
      else workspace.prepend(strip);
    }
    return strip;
  }

  function renderMemoryStrip() {
    const strip = ensureMemoryStrip();
    if (!strip) return;
    const s = intelligenceSummary();
    strip.innerHTML = `<div class="os-intel-head"><div><h3>Operational memory</h3><small>Recording, chronology, safeguarding, continuity and inspection intelligence reconnected.</small></div><button type="button" class="os-memory-action" data-intel-ask="operational memory">Ask IndiCare</button></div><div class="os-intel-grid"><article class="os-intel-card os-risk-marker" data-intel-open="safeguarding"><strong>${s.safeguarding}</strong><span>Safeguarding signals</span><p>Risk, missing, incident and contextual safeguarding links.</p></article><article class="os-intel-card os-inspection-marker" data-intel-open="inspection"><strong>${s.inspection}</strong><span>Inspection evidence</span><p>SCCIF, quality and governance evidence generated from practice.</p></article><article class="os-intel-card os-relational-marker" data-intel-open="relational"><strong>${s.relational}</strong><span>Relational practice</span><p>Repair, trusted adults, family impact and child voice.</p></article><article class="os-intel-card os-risk-marker" data-intel-open="placement"><strong>${s.placement}</strong><span>Placement stability</span><p>Routines, fragility, disruption risk and protective factors.</p></article><article class="os-intel-card" data-intel-open="continuity"><strong>${s.continuity}</strong><span>Continuity memory</span><p>Open actions, callbacks, reviews and handover reminders.</p></article><article class="os-intel-card os-practice-marker" data-intel-open="positive"><strong>${s.positive}</strong><span>Progress and strengths</span><p>Achievements, repair, engagement and protective relationships.</p></article></div>`;
    bindStrip(strip);
  }

  function bindStrip(strip) {
    strip.querySelectorAll('[data-intel-open]').forEach(card => {
      card.addEventListener('click', () => openIntelligenceWorkspace(card.dataset.intelOpen));
    });
    strip.querySelector('[data-intel-ask]')?.addEventListener('click', () => askAssistant('operational memory summary'));
  }

  function askAssistant(topic) {
    const prompt = `Context: ${topic}. Child: ${childName()}. Please summarise connected recording, chronology, safeguarding signals, placement stability, continuity actions, inspection evidence and relational practice themes. Keep it practical for a children's home shift/manager.`;
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);
  }

  function openIntelligenceWorkspace(kind) {
    const titles = {
      safeguarding: 'Safeguarding intelligence', inspection: 'Inspection evidence', relational: 'Relational practice', placement: 'Placement stability', continuity: 'Continuity memory', positive: 'Progress and strengths'
    };
    const title = titles[kind] || 'Operational intelligence';
    const items = itemsFor(kind);
    const main = `<section class="os-safe-panel"><h4>${esc(title)}</h4><p>${descriptionFor(kind)}</p><div>${chipsFor(kind)}</div><div class="os-memory-actions"><button class="os-memory-action" data-intel-record="${recordTypeFor(kind)}">Create linked record</button><button class="os-memory-action secondary" data-intel-ask-workspace="${esc(kind)}">Ask IndiCare</button></div></section><section class="os-safe-panel"><h4>Linked evidence</h4>${items.length ? items.slice(0, 12).map(renderEvidenceItem).join('') : '<p>No linked evidence loaded yet. New records will begin filling this area automatically.</p>'}</section>`;
    const rail = `<section class="os-safe-panel"><h4>Record once → intelligence everywhere</h4><p>Records in this area should link to chronology, safeguarding, continuity, inspection evidence, provider oversight and assistant context.</p></section><section class="os-safe-panel"><h4>Recommended next step</h4><p>${nextStepFor(kind)}</p></section>`;
    if (window.IndiCareOperationalLinks?.openWorkspace) window.IndiCareOperationalLinks.openWorkspace(title, 'Connected operational intelligence', main, rail);
    else fallbackWorkspace(title, main + rail);
    setTimeout(bindWorkspaceButtons, 50);
  }

  function bindWorkspaceButtons() {
    document.querySelectorAll('[data-intel-record]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => window.IndiCareTherapeuticRecordCreator?.open?.(btn.dataset.intelRecord || 'daily_note'));
    });
    document.querySelectorAll('[data-intel-ask-workspace]').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => askAssistant(btn.dataset.intelAskWorkspace));
    });
  }

  function fallbackWorkspace(title, html) {
    const area = document.getElementById('workspace') || document.body;
    const div = document.createElement('section');
    div.className = 'os-intel-strip';
    div.innerHTML = `<div class="os-intel-head"><h3>${esc(title)}</h3><button class="os-memory-action secondary" type="button">Close</button></div>${html}`;
    div.querySelector('button')?.addEventListener('click', () => div.remove());
    area.prepend(div);
  }

  function itemsFor(kind) {
    const all = timeline().concat(records(), patterns(), commands(), placements(), alerts(), inspection());
    const filters = {
      safeguarding: /safeguard|missing|police|exploitation|risk|harm|incident/,
      inspection: /sccif|ofsted|inspection|evidence|quality|reg 44|reg44|helped and protected|experiences and progress/,
      relational: /repair|relationship|trusted|co-regulat|coregulat|family|contact|mum|dad|sibling|key work|voice/,
      placement: /placement|stability|disruption|breakdown|routine|fragile/,
      continuity: /callback|follow-up|follow up|action|required|review|handover|what adults should know/,
      positive: /positive|achievement|progress|strength|settled|engaged|repair|success|protective/,
    };
    return all.filter(item => (filters[kind] || /./).test(textOf(item)));
  }

  function renderEvidenceItem(item) {
    const title = item.title || item.event_title || item.record_type || item.display_name || 'Linked item';
    const summary = item.summary || item.event_summary || item.narrative || item.recommended_action || item.description || '';
    return `<div class="os-safe-mini-item"><strong>${esc(title)}</strong><br><small>${esc(summary).slice(0, 220)}</small></div>`;
  }

  function descriptionFor(kind) {
    return ({
      safeguarding: 'Connect concerns, incidents, missing episodes, contextual risks and chronology chains so safeguarding becomes proactive.',
      inspection: 'Practice records become SCCIF evidence automatically, reducing manual evidence-gathering before inspection.',
      relational: 'Surface trusted relationships, repair, child voice, family impact and protective adults, not only risks.',
      placement: 'Monitor emotional continuity, routines, school disruption, incidents and protective factors before placement fragility escalates.',
      continuity: 'Keep unresolved actions, callbacks, reviews and handover memory visible across shifts and managers.',
      positive: 'Track progress, achievements, repair and strengths so the child’s story is not only problem-led.',
    }[kind] || 'Connected operational intelligence across the OS.');
  }

  function chipsFor(kind) {
    const map = {
      safeguarding: ['Missing', 'Incidents', 'Contextual risk', 'Follow-up'],
      inspection: ['SCCIF', 'Evidence', 'Quality', 'Reg 44/45'],
      relational: ['Child voice', 'Repair', 'Trusted adult', 'Family impact'],
      placement: ['Stability', 'Routine', 'Protective factors', 'Fragility'],
      continuity: ['Callbacks', 'Reviews', 'Handover', 'Actions'],
      positive: ['Progress', 'Achievement', 'Strengths', 'Repair'],
    };
    return (map[kind] || ['Connected']).map(chip => `<span class="os-context-chip">${esc(chip)}</span>`).join('');
  }

  function nextStepFor(kind) {
    return ({
      safeguarding: 'Create or review a safeguarding-linked record and confirm immediate safety, callback and manager review actions.',
      inspection: 'Use linked records as evidence and ask IndiCare for a concise SCCIF summary.',
      relational: 'Add child voice, trusted adult and repair context to the next daily living or key work record.',
      placement: 'Record protective factors and stabilising routines alongside any risk escalation.',
      continuity: 'Convert unresolved points into callbacks or handover actions before shift end.',
      positive: 'Record progress and strengths so reviews and chronology show the whole child.',
    }[kind] || 'Review connected context and create a linked record where needed.');
  }

  function enhanceExistingSections() {
    safe('enhance cards', () => {
      const mapping = [
        ['#safeguarding-board,#pattern-list', 'safeguarding'],
        ['#inspection-board', 'inspection'],
        ['#placements-board,#placement-list', 'placement'],
        ['#care-list', 'relational'],
        ['#command-list,#recommendations', 'continuity'],
      ];
      mapping.forEach(([selector, kind]) => {
        const host = document.querySelector(selector);
        if (!host || host.dataset.intelEnhanced === 'true') return;
        host.dataset.intelEnhanced = 'true';
        const actions = document.createElement('div');
        actions.className = 'os-memory-actions';
        actions.innerHTML = `<button type="button" class="os-memory-action secondary" data-section-intel="${esc(kind)}">Open connected workspace</button><button type="button" class="os-memory-action secondary" data-section-ask="${esc(kind)}">Ask IndiCare</button>`;
        host.parentElement?.querySelector('.ic-card-head')?.appendChild(actions);
      });
      document.querySelectorAll('[data-section-intel]').forEach(btn => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => openIntelligenceWorkspace(btn.dataset.sectionIntel));
      });
      document.querySelectorAll('[data-section-ask]').forEach(btn => {
        if (btn.dataset.bound === 'true') return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => askAssistant(btn.dataset.sectionAsk));
      });
    });
  }

  function patchLoadAll() {
    if (window.__indicareIntelReconnectLoadAllPatched || typeof window.loadAll !== 'function') return;
    window.__indicareIntelReconnectLoadAllPatched = true;
    const original = window.loadAll;
    window.loadAll = async function patchedLoadAll(...args) {
      const result = await original.apply(this, args);
      setTimeout(refresh, 80);
      return result;
    };
  }

  function refresh() {
    renderMemoryStrip();
    enhanceExistingSections();
  }

  function boot() {
    injectStyles();
    patchLoadAll();
    refresh();
    document.addEventListener('indicare:care-data-changed', () => setTimeout(refresh, 80));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('intel-reconnect-refresh', refresh, 250) || setTimeout(refresh, 250));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareOperationalIntelligence = { refresh, openIntelligenceWorkspace, summary: intelligenceSummary };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => safe('boot', boot)); else boot();
})();
