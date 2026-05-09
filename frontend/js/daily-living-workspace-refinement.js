(() => {
  const STYLE_ID = 'daily-living-workspace-refinement-style';
  const FLAG = '__indicareDailyLivingRefinement';

  const SUPPORT_PROMPTS = [
    'What helped the young person feel safe, settled or regulated today?',
    'What should adults know tomorrow to provide consistent support?',
    'What positive moment, strength or achievement should be remembered?',
    'How did education, family time, health or relationships affect the young person today?',
    'What follow-up, repair or wellbeing check is needed?'
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .daily-refine-banner{border:1px solid #bfdbfe;background:linear-gradient(180deg,#eff6ff,#fff);border-radius:22px;padding:14px;margin-bottom:12px}.daily-refine-banner h4{margin:0 0 5px;color:#0f172a}.daily-refine-banner p{margin:0;color:#475569}.daily-refine-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.daily-refine-kpi{border:1px solid #dbe7f3;background:#fff;border-radius:16px;padding:9px}.daily-refine-kpi strong{display:block;font-size:18px;color:#0f172a}.daily-refine-kpi span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}.daily-context-panel{border:1px solid #dbe7f3;background:#fff;border-radius:20px;padding:13px;margin-bottom:12px}.daily-context-panel h4{margin:0 0 8px;color:#0f172a}.daily-context-panel p{margin:6px 0;color:#475569}.daily-prompt-btn{display:block;width:100%;border:0;border-radius:14px;background:#eef4fb;color:#334155;text-align:left;font-weight:850;padding:9px 10px;margin:6px 0}.daily-prompt-btn:hover{background:#dbeafe;color:#1d4ed8}.daily-chip-row{display:flex;gap:6px;flex-wrap:wrap}.daily-chip{border:0;border-radius:999px;background:#dcfce7;color:#166534;font-weight:900;font-size:11px;padding:5px 8px}.daily-chip.warn{background:#fef3c7;color:#92400e}.daily-chip.safe{background:#fee2e2;color:#991b1b}.daily-sticky-actions{position:sticky;bottom:0;background:rgba(248,250,252,.94);backdrop-filter:blur(12px);border:1px solid #dbe7f3;border-radius:18px;padding:10px;display:flex;gap:8px;flex-wrap:wrap;z-index:5}.daily-sticky-actions button{border:0;border-radius:13px;padding:10px 12px;font-weight:950}.daily-primary{background:#155eef;color:#fff}.daily-secondary{background:#eef4fb;color:#334155}.daily-soft{background:#dcfce7;color:#166534}@media(max-width:760px){.daily-refine-grid{grid-template-columns:1fr}.daily-sticky-actions{left:0;right:0;border-radius:16px}.daily-context-panel{padding:12px}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function childProfile() { return window.state?.selectedChild?.profile || {}; }
  function selectedChildName() { const p = childProfile(); return p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'this young person'; }
  function activeForm() { return document.getElementById('therapeutic-record-form'); }
  function isDailyForm(form = activeForm()) { return form?.dataset?.recordType === 'daily_note'; }
  function field(form, name) { return form?.querySelector(`[name="${CSS.escape(name)}"]`); }

  function ensureDailyFields(form) {
    if (!form || !isDailyForm(form) || form.dataset.dailyRefined === 'true') return;
    form.dataset.dailyRefined = 'true';
    const existingActions = form.querySelector('.workspace-actions')?.closest('.record-form-field');
    const html = `
      <div class="record-form-field full" data-daily-extra="what_helped"><label>What helped today?</label><textarea name="what_helped_today" placeholder="What support, relationship, activity, routine or approach helped the young person today?"></textarea></div>
      <div class="record-form-field full" data-daily-extra="tomorrow"><label>What should adults know tomorrow?</label><textarea name="adults_should_know_tomorrow" placeholder="What should the next shift/adults know to provide consistent, safe and therapeutic support tomorrow?"></textarea></div>
      <div class="record-form-field full" data-daily-extra="reflection"><label>Therapeutic reflection</label><textarea name="therapeutic_reflection" placeholder="What might the young person have been communicating? What did adults learn? What should change or continue?"></textarea></div>
    `;
    if (existingActions) existingActions.insertAdjacentHTML('beforebegin', html); else form.insertAdjacentHTML('beforeend', html);
  }

  function dailyContextStats() {
    const p = childProfile();
    const selected = window.state?.selectedChild || {};
    const timeline = selected.timeline || selected.events || [];
    const commands = selected.command_items || [];
    return {
      recordsToday: p.records_today || 0,
      managerReviews: p.manager_review_count || 0,
      openActions: p.open_commands || commands.length || 0,
      risk: Math.round(p.disruption_risk_score || selected.placement_stability?.disruption_risk_score || 0),
      timeline,
      commands,
    };
  }

  function buildBanner() {
    const s = dailyContextStats();
    return `<section class="daily-refine-banner" data-daily-refine-banner><h4>Daily living focus for ${esc(selectedChildName())}</h4><p>Record once. This note should feed chronology, handover, callbacks, assistant memory and oversight.</p><div class="daily-refine-grid"><div class="daily-refine-kpi"><strong>${esc(s.recordsToday)}</strong><span>records today</span></div><div class="daily-refine-kpi"><strong>${esc(s.openActions)}</strong><span>open actions</span></div><div class="daily-refine-kpi"><strong>${esc(s.risk)}</strong><span>stability risk</span></div></div></section>`;
  }

  function contextRailHtml() {
    const s = dailyContextStats();
    const recent = (s.timeline || []).slice(0, 4);
    const commands = (s.commands || []).slice(0, 4);
    return `
      <section class="daily-context-panel" data-daily-context-rail>
        <h4>Continuity rail</h4>
        <div class="daily-chip-row"><span class="daily-chip">chronology aware</span><span class="daily-chip warn">callbacks</span><span class="daily-chip">handover</span></div>
        <p><strong>Open follow-ups:</strong> ${esc(s.openActions || 0)}</p>
        ${commands.length ? commands.map(c => `<p>• ${esc(c.title || c.summary || c.recommended_action || 'Open action')}</p>`).join('') : '<p>No open command items currently surfaced.</p>'}
      </section>
      <section class="daily-context-panel">
        <h4>Recent child journey</h4>
        ${recent.length ? recent.map(t => `<p>• ${esc(t.title || t.event_title || t.source_type || 'Timeline entry')}<br><small>${esc(t.summary || t.event_summary || t.narrative || '')}</small></p>`).join('') : '<p>No recent chronology entries surfaced yet.</p>'}
      </section>
      <section class="daily-context-panel">
        <h4>Ask IndiCare</h4>
        <button class="daily-prompt-btn" data-daily-assistant="themes">Summarise recent emotional themes</button>
        <button class="daily-prompt-btn" data-daily-assistant="helps">What approaches help regulation?</button>
        <button class="daily-prompt-btn" data-daily-assistant="callbacks">What callbacks are outstanding?</button>
        <button class="daily-prompt-btn" data-daily-assistant="handover">Draft handover points</button>
      </section>
      <section class="daily-context-panel">
        <h4>Reflective prompts</h4>
        ${SUPPORT_PROMPTS.map(p => `<button class="daily-prompt-btn" type="button" data-insert-prompt="${esc(p)}">${esc(p)}</button>`).join('')}
      </section>
    `;
  }

  function enhanceDailyWorkspace() {
    const form = activeForm();
    if (!isDailyForm(form)) return;
    ensureDailyFields(form);
    const main = form.closest('.record-workspace-main');
    const rail = document.querySelector('.record-workspace-rail');
    if (main && !main.querySelector('[data-daily-refine-banner]')) main.insertAdjacentHTML('afterbegin', buildBanner());
    if (rail && !rail.querySelector('[data-daily-context-rail]')) rail.insertAdjacentHTML('afterbegin', contextRailHtml());
    ensureStickyActions(form);
    bindDailyButtons(form);
    updateAdaptivePrompts(form);
  }

  function ensureStickyActions(form) {
    const main = form?.closest('.record-workspace-main');
    if (!main || main.querySelector('[data-daily-sticky-actions]')) return;
    main.insertAdjacentHTML('beforeend', `<div class="daily-sticky-actions" data-daily-sticky-actions><button class="daily-primary" type="button" data-daily-save>Save record</button><button class="daily-secondary" type="button" data-daily-review>Review therapeutically</button><button class="daily-soft" type="button" data-daily-summary>AI shift summary</button><button class="daily-secondary" type="button" data-daily-ask>Ask IndiCare</button></div>`);
  }

  function bindDailyButtons(form) {
    document.querySelectorAll('[data-insert-prompt]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => insertPrompt(btn.dataset.insertPrompt));
    });
    document.querySelectorAll('[data-daily-assistant]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => askAssistant(btn.dataset.dailyAssistant));
    });
    document.querySelector('[data-daily-save]')?.addEventListener('click', () => form.requestSubmit());
    document.querySelector('[data-daily-review]')?.addEventListener('click', () => form.querySelector('[data-record-review]')?.click());
    document.querySelector('[data-daily-summary]')?.addEventListener('click', () => generateShiftSummary(form));
    document.querySelector('[data-daily-ask]')?.addEventListener('click', () => askAssistant('general'));
    form.addEventListener('input', () => updateAdaptivePrompts(form));
  }

  function insertPrompt(prompt) {
    const form = activeForm();
    const target = field(form, 'therapeutic_reflection') || field(form, 'actions_required') || form?.querySelector('textarea');
    if (!target) return;
    const current = target.value ? `${target.value}\n\n` : '';
    target.value = `${current}${prompt}\n`;
    target.focus();
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function formText(form) {
    if (!form) return '';
    const data = new FormData(form);
    return Array.from(data.values()).join(' ').toLowerCase();
  }

  function updateAdaptivePrompts(form) {
    const text = formText(form);
    let panel = document.querySelector('[data-adaptive-daily-prompts]');
    if (!panel) {
      const rail = document.querySelector('.record-workspace-rail');
      if (!rail) return;
      rail.insertAdjacentHTML('afterbegin', '<section class="daily-context-panel" data-adaptive-daily-prompts><h4>Adaptive prompts</h4><div data-adaptive-list></div></section>');
      panel = document.querySelector('[data-adaptive-daily-prompts]');
    }
    const prompts = [];
    if (/mum|dad|family|contact|sibling/.test(text)) prompts.push('How did family time or family thoughts affect emotional wellbeing today?');
    if (/school|education|attendance|pep|teacher/.test(text)) prompts.push('What helped or could help education engagement?');
    if (/sleep|tired|nightmare|settle/.test(text)) prompts.push('How did sleep or settling affect the young person today?');
    if (/angry|upset|distressed|anxious|dysregulated/.test(text)) prompts.push('What helped the young person regulate or feel safer?');
    if (/positive|football|activity|achievement|proud|progress/.test(text)) prompts.push('How can this strength or achievement be carried into tomorrow?');
    panel.querySelector('[data-adaptive-list]').innerHTML = prompts.length ? prompts.map(p => `<button class="daily-prompt-btn" type="button" data-insert-prompt="${esc(p)}">${esc(p)}</button>`).join('') : '<p>No adaptive prompts yet. They will appear as the note develops.</p>';
    panel.querySelectorAll('[data-insert-prompt]').forEach(btn => btn.addEventListener('click', () => insertPrompt(btn.dataset.insertPrompt)));
  }

  function askAssistant(topic) {
    const name = selectedChildName();
    const prompts = {
      themes: `For ${name}, summarise recent emotional themes from daily notes, incidents, chronology, family, education and wellbeing.`,
      helps: `For ${name}, identify what approaches appear to help regulation, safety, engagement and positive routines.`,
      callbacks: `For ${name}, list unresolved callbacks, repair work, wellbeing checks, keywork or manager reviews that staff should know about.`,
      handover: `For ${name}, draft concise handover points for the next shift using recent chronology, open actions, wellbeing and this daily note context.`,
      general: `For ${name}, support this daily living note. What should staff capture to make it therapeutic, child-centred and useful for continuity?`
    };
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompts[topic] || prompts.general);
  }

  function generateShiftSummary(form) {
    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());
    const summaryParts = [];
    if (values.mood) summaryParts.push(`Mood/emotional tone: ${values.mood}.`);
    if (values.presentation) summaryParts.push(values.presentation);
    if (values.what_helped_today) summaryParts.push(`What helped: ${values.what_helped_today}`);
    if (values.adults_should_know_tomorrow) summaryParts.push(`Tomorrow: ${values.adults_should_know_tomorrow}`);
    if (values.positives) summaryParts.push(`Strengths/positives: ${values.positives}`);
    const summary = summaryParts.join('\n\n').slice(0, 1800);
    const target = field(form, 'therapeutic_reflection') || field(form, 'actions_required');
    if (target) {
      target.value = `${target.value ? `${target.value}\n\n` : ''}AI shift summary draft:\n${summary || 'No summary could be drafted yet. Add more detail first.'}`;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    askAssistant('handover');
  }

  function patchSavedPayload() {
    if (window.__dailyLivingPayloadPatch) return;
    window.__dailyLivingPayloadPatch = true;
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!isDailyForm(form)) return;
      const helped = field(form, 'what_helped_today')?.value || '';
      const tomorrow = field(form, 'adults_should_know_tomorrow')?.value || '';
      const reflection = field(form, 'therapeutic_reflection')?.value || '';
      const actions = field(form, 'actions_required');
      if (actions && (helped || tomorrow || reflection) && !actions.value.includes('Therapeutic continuity:')) {
        actions.value = `${actions.value ? `${actions.value}\n\n` : ''}Therapeutic continuity:\nWhat helped today: ${helped || 'Not recorded'}\nAdults should know tomorrow: ${tomorrow || 'Not recorded'}\nReflection: ${reflection || 'Not recorded'}`;
      }
    }, true);
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    patchSavedPayload();
    const observer = new MutationObserver(() => enhanceDailyWorkspace());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('indicare:care-data-changed', () => setTimeout(enhanceDailyWorkspace, 50));
    enhanceDailyWorkspace();
    window.IndiCareDailyLivingRefinement = { enhance: enhanceDailyWorkspace, ask: askAssistant, summary: () => generateShiftSummary(activeForm()) };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
