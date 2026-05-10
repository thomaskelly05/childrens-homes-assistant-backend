(() => {
  const FLAG = '__indicareOSCommandUIBridge';
  const STYLE_ID = 'os-command-ui-bridge-style';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [data-child-workspace]{min-height:120px}.os-ui-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px;padding:8px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px}.os-ui-tab{border:0;border-radius:999px;padding:9px 12px;background:transparent;color:#64748b;font-weight:850}.os-ui-tab.active{background:#dbeafe;color:#1d4ed8}.os-ui-tab-view{display:none}.os-ui-tab-view.active{display:block}.os-ui-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:14px}.os-ui-card{border:1px solid #dbe7f3;background:#fff;border-radius:18px;padding:12px}.os-ui-card strong{display:block;color:#0f172a;font-size:20px}.os-ui-card span{display:block;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.os-ui-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.os-ui-actions button{border:0;border-radius:13px;padding:10px 12px;font-weight:900;background:#eef4fb;color:#334155}.os-ui-actions button.primary{background:#155eef;color:#fff}.os-ui-list{display:grid;gap:10px}.os-ui-item{border:1px solid #dbe7f3;background:#fff;border-radius:16px;padding:11px}.os-ui-item-title{font-weight:900;color:#0f172a}.os-ui-item-text{color:#475569;margin-top:4px}@media(max-width:760px){.os-ui-grid{grid-template-columns:1fr}.os-ui-tabs{overflow:auto;flex-wrap:nowrap}.os-ui-tab{white-space:nowrap}}
    `;
    document.head.appendChild(style);
  }

  function exposeMountPoints() {
    document.getElementById('view-overview')?.setAttribute('data-home-dashboard', 'true');
    document.getElementById('view-provider')?.setAttribute('data-provider-dashboard', 'true');
    document.getElementById('child-workspace')?.setAttribute('data-child-workspace', 'true');
    document.getElementById('workspace')?.setAttribute('data-os-command-workspace', 'true');
  }

  function selectedChild() {
    return window.state?.selectedChild || null;
  }

  function listFrom(payload, ...keys) {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }

  function renderTimeline(items) {
    if (!items.length) return '<div class="ic-empty">No timeline records yet.</div>';
    return `<div class="os-ui-list">${items.slice(0, 30).map((item) => `<article class="os-ui-item"><div class="os-ui-item-title">${esc(item.title || item.event_title || item.source_type || 'Timeline entry')}</div><div class="os-ui-item-text">${esc(item.summary || item.event_summary || item.narrative || '')}</div>${item.child_voice ? `<div class="os-ui-item-text"><strong>Child voice:</strong> ${esc(item.child_voice)}</div>` : ''}</article>`).join('')}</div>`;
  }

  function renderRecords(items) {
    if (!items.length) return '<div class="ic-empty">No records surfaced yet.</div>';
    return `<div class="os-ui-list">${items.slice(0, 30).map((item) => `<article class="os-ui-item"><div class="os-ui-item-title">${esc(item.title || item.record_type || 'Record')}</div><div class="os-ui-item-text">${esc(item.summary || item.narrative || '')}</div></article>`).join('')}</div>`;
  }

  function childWorkspaceHtml(data) {
    const profile = data?.profile || {};
    const timeline = listFrom(data, 'timeline', 'events');
    const records = listFrom(data, 'records', 'care_records', 'care');
    const commandItems = listFrom(data, 'command_items', 'commands', 'actions');
    const name = profile.display_name || profile.preferred_name || profile.first_name || profile.name || 'Young person';

    return `
      <div class="os-ui-tabs" role="tablist">
        <button type="button" class="os-ui-tab active" data-os-ui-tab="overview">Overview</button>
        <button type="button" class="os-ui-tab" data-os-ui-tab="journey">Child Journey</button>
        <button type="button" class="os-ui-tab" data-os-ui-tab="care">Care Notes</button>
        <button type="button" class="os-ui-tab" data-os-ui-tab="safeguarding">Safeguarding</button>
        <button type="button" class="os-ui-tab" data-os-ui-tab="plans">Plans</button>
      </div>
      <section class="os-ui-tab-view active" data-child-tab-view="overview" data-os-ui-view="overview">
        <div class="os-ui-actions"><button class="primary" type="button" data-os-new-record="daily_note">New daily note</button><button type="button" data-os-new-record="incident">New incident</button><button type="button" data-os-ask-child>Ask IndiCare</button></div>
        <div class="os-ui-grid"><div class="os-ui-card"><strong>${esc(profile.records_today || 0)}</strong><span>records today</span></div><div class="os-ui-card"><strong>${esc(profile.open_commands || commandItems.length || 0)}</strong><span>open actions</span></div><div class="os-ui-card"><strong>${esc(Math.round(profile.disruption_risk_score || 0))}</strong><span>stability risk</span></div><div class="os-ui-card"><strong>${esc(profile.high_safeguarding_patterns || 0)}</strong><span>safeguarding patterns</span></div></div>
        <h4 class="ic-h3">Current picture for ${esc(name)}</h4>${renderTimeline(timeline.slice(0, 5))}
      </section>
      <section class="os-ui-tab-view" data-child-tab-view="journey" data-os-ui-view="journey">${renderTimeline(timeline)}</section>
      <section class="os-ui-tab-view" data-child-tab-view="care" data-os-ui-view="care"><div class="os-ui-actions"><button class="primary" type="button" data-os-new-record="daily_note">New daily note</button><button type="button" data-os-new-record="keywork">New key work</button></div>${renderRecords(records)}</section>
      <section class="os-ui-tab-view" data-child-tab-view="safeguarding" data-os-ui-view="safeguarding"><div class="os-ui-actions"><button class="primary" type="button" data-os-new-record="incident">New incident</button><button type="button" data-os-new-record="missing_episode">New missing episode</button></div>${renderRecords(timeline.filter((item) => /safeguard|incident|missing|risk|police/i.test(JSON.stringify(item))))}</section>
      <section class="os-ui-tab-view" data-child-tab-view="plans" data-os-ui-view="plans"><div class="os-ui-actions"><button type="button" data-os-ask-review>Prepare review summary</button></div>${renderRecords(listFrom(data, 'plans', 'documents', 'reviews'))}</section>
    `;
  }

  function bindChildWorkspace(root) {
    root.querySelectorAll('[data-os-ui-tab]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const key = button.dataset.osUiTab;
        root.querySelectorAll('[data-os-ui-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
        root.querySelectorAll('[data-os-ui-view]').forEach((view) => view.classList.toggle('active', view.dataset.osUiView === key));
        window.IndiCareChronologyVisual?.mount?.();
      });
    });

    root.querySelectorAll('[data-os-new-record]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const type = button.dataset.osNewRecord;
        window.IndiCareConnectedCare?.newRecord?.(type) || window.IndiCareYoungPersonWorkspace?.newRecord?.(type);
      });
    });

    root.querySelector('[data-os-ask-child]')?.addEventListener('click', () => {
      window.IndiCareOSAssistant?.open?.();
      window.IndiCareOSAssistant?.ask?.('Summarise this young person: recent chronology, open actions, emotional themes, safeguarding concerns and what adults should know today.');
    }, { once: true });

    root.querySelector('[data-os-ask-review]')?.addEventListener('click', () => {
      window.IndiCareOSAssistant?.open?.();
      window.IndiCareOSAssistant?.ask?.('Prepare a review summary from this child workspace, including chronology, child voice, education, health, safeguarding, strengths and unresolved actions.');
    }, { once: true });
  }

  function upgradeChildWorkspace(force = false) {
    const root = document.getElementById('child-workspace');
    const data = selectedChild();
    if (!root || !data?.profile) return;
    const fingerprint = `${data.profile.young_person_id || data.profile.id || ''}:${listFrom(data, 'timeline', 'events').length}:${listFrom(data, 'command_items').length}`;
    if (!force && root.dataset.osUiBridgeFingerprint === fingerprint && root.querySelector('[data-child-tab-view="journey"]')) return;
    root.dataset.osUiBridgeFingerprint = fingerprint;
    root.setAttribute('data-child-workspace', 'true');
    root.innerHTML = childWorkspaceHtml(data);
    bindChildWorkspace(root);
    setTimeout(() => window.IndiCareChronologyVisual?.mount?.(), 80);
  }

  function patchOpenChild() {
    if (window.__indicareOpenChildBridgePatched) return;
    if (typeof window.openChild !== 'function') return;
    window.__indicareOpenChildBridgePatched = true;
    const originalOpenChild = window.openChild;
    window.openChild = async function bridgedOpenChild(...args) {
      const result = await originalOpenChild.apply(this, args);
      window.IndiCareSafe?.run?.('upgrade child workspace after openChild', () => upgradeChildWorkspace(true)) || upgradeChildWorkspace(true);
      return result;
    };
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    exposeMountPoints();
    patchOpenChild();
    setTimeout(() => { exposeMountPoints(); patchOpenChild(); upgradeChildWorkspace(); }, 400);
    document.addEventListener('indicare:care-data-changed', () => {
      window.IndiCareSafe?.debounce?.('os-ui-bridge-refresh', () => { exposeMountPoints(); patchOpenChild(); upgradeChildWorkspace(true); }, 250);
    });
    window.IndiCareOSCommandUIBridge = { exposeMountPoints, upgradeChildWorkspace };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
