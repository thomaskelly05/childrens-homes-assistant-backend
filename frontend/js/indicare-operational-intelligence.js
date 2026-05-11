(() => {
  const FLAG = '__indicareOperationalIntelligence';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function text(value) {
    try { return JSON.stringify(value || {}).toLowerCase(); }
    catch { return ''; }
  }

  function list(source, ...keys) {
    if (Array.isArray(source)) return source;
    for (const key of keys) {
      if (Array.isArray(source?.[key])) return source[key];
    }
    return [];
  }

  function state() { return window.state || {}; }
  function selectedChild() { return state().selectedChild || {}; }
  function chronology() {
    return list(selectedChild(), 'timeline', 'events')
      .concat(list(state().chronology, 'items', 'events'))
      .slice(0, 200);
  }

  function records() {
    return list(state().care, 'records', 'items').slice(0, 200);
  }

  function alerts() {
    return list(state().network, 'alerts', 'items').slice(0, 200);
  }

  function patterns() {
    return list(state().patterns, 'patterns', 'items').slice(0, 200);
  }

  function child() {
    return selectedChild().profile || {};
  }

  function recentSignals() {
    return chronology().concat(records()).concat(patterns()).concat(alerts());
  }

  function has(regex, item) {
    return regex.test(text(item));
  }

  function missingInsights() {
    const signals = recentSignals();
    const familyConflict = signals.filter(item => has(/family|contact|mum|dad|argument|conflict/, item)).length;
    const peerRisk = signals.filter(item => has(/peer|group|association|friend|county|gang/, item)).length;
    const locality = signals.filter(item => has(/park|shopping|town|station|address|locality/, item)).length;
    const exploitation = signals.filter(item => has(/exploitation|cce|cse|drug|adult male|hotel/, item)).length;

    const prompts = [];

    if (familyConflict > 1) {
      prompts.push('Recent chronology suggests family conflict or emotionally significant contact may increase missing risk following dysregulation.');
    }

    if (peerRisk > 0) {
      prompts.push('Previous episodes indicate the young person may seek out known peer groups or familiar associates during periods of instability.');
    }

    if (locality > 0) {
      prompts.push('Locality patterns exist within chronology and previous records. Consider previously identified areas, transport links and community locations.');
    }

    if (exploitation > 0) {
      prompts.push('Contextual safeguarding indicators are present. Consider exploitation risk, peer influence and known adults when planning searches and notifications.');
    }

    prompts.push('Review trusted adults, previous successful return-home approaches and recent emotional presentation before escalation.');

    return {
      risk_level: exploitation > 1 ? 'high' : peerRisk > 1 ? 'medium' : 'contextual',
      prompts,
      generated_at: new Date().toISOString(),
    };
  }

  function continuityInsights() {
    const signals = recentSignals();
    const unresolved = signals.filter(item => has(/follow up|monitor|continue|review|callback|check in/, item)).slice(0, 8);

    return {
      unresolved_count: unresolved.length,
      prompts: unresolved.map(item => item.title || item.summary || item.record_type || 'Continuity follow-up needed'),
    };
  }

  function safeguardingInsights() {
    const signals = recentSignals();
    const riskSignals = signals.filter(item => has(/missing|incident|risk|police|harm|safeguard|restraint/, item));

    return {
      risk_count: riskSignals.length,
      escalation_indicators: riskSignals.slice(0, 10).map(item => item.title || item.summary || item.record_type || 'Risk signal'),
    };
  }

  function complianceInsights() {
    const docs = list(state().documents, 'items', 'documents');

    return {
      missing_documents: [
        'Statement of Purpose',
        'Locality Risk Assessment',
        'Impact Risk Assessment',
        'Annex A',
        'Regulation 44',
        'Regulation 45',
      ].filter(name => !docs.some(doc => text(doc).includes(name.toLowerCase()))),
    };
  }

  function assistantContext(topic = 'operational overview') {
    return {
      child: child(),
      chronology: chronology().slice(0, 20),
      safeguarding: safeguardingInsights(),
      continuity: continuityInsights(),
      missing: missingInsights(),
      compliance: complianceInsights(),
      topic,
    };
  }

  function ask(topic = 'operational overview') {
    const context = assistantContext(topic);

    const prompt = `Topic: ${topic}\n\nYoung person: ${context.child.display_name || context.child.first_name || 'selected child'}\n\nMissing episode insight:\n${context.missing.prompts.join('\n')}\n\nContinuity concerns:\n${context.continuity.prompts.join('\n')}\n\nSafeguarding indicators:\n${context.safeguarding.escalation_indicators.join('\n')}\n\nMissing compliance documents:\n${context.compliance.missing_documents.join(', ')}\n\nProvide calm contextual safeguarding guidance, continuity advice, therapeutic reflection and suggested next actions. Support professional judgement only.`;

    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);

    return prompt;
  }

  window.IndiCareOperationalIntelligence = {
    chronology,
    records,
    alerts,
    patterns,
    recentSignals,
    missingInsights,
    continuityInsights,
    safeguardingInsights,
    complianceInsights,
    assistantContext,
    ask,
  };
})();
