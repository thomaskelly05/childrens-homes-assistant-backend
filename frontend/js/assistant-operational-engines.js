/* IndiCare Intelligence operational engines.
   Section 2: lightweight client-side workflow engines that turn specialist actions
   into structured prompts and consistent operational output scaffolds. */

(function () {
  const ENGINES = {
    chronology: {
      label: 'Chronology Engine',
      triggers: ['chronology', 'timeline', 'missing episode', 'missing-from-care', 'sequence'],
      prompt: `Create a professional residential care chronology from the information provided.\n\nStructure the output as:\n\n## Chronology\nDate/Time → Event → Staff Action → Outcome\n\n## Escalation or Pattern Indicators\nIdentify any escalation, delayed action, repeated concern or missing sequence.\n\n## Missing Information\nList details needed to make the chronology complete.\n\n## Safeguarding Considerations\nHighlight areas for staff/manager review without making final safeguarding decisions.`,
    },
    recording: {
      label: 'Recording QA Engine',
      triggers: ['recording', 'qa', 'daily log', 'incident record', 'improve wording', 'child voice'],
      prompt: `Review this children's residential care recording for quality.\n\nStructure the output as:\n\n## Recording Quality Review\nAssess factuality, chronology, professionalism and clarity.\n\n## Strengths\nIdentify what is clear or useful.\n\n## Missing Information\nIdentify missing facts, child voice, actions, outcomes or management oversight.\n\n## Language Concerns\nFlag wording that may appear judgemental, unclear or non-child-centred.\n\n## Safeguarding Considerations\nIdentify safeguarding implications for professional review.\n\n## Improved Professional Wording\nProvide a paste-ready improved version in British English.`,
    },
    safeguarding: {
      label: 'Safeguarding Review Engine',
      triggers: ['safeguarding', 'threshold', 'risk', 'harm', 'exploitation', 'concern'],
      prompt: `Analyse this safeguarding concern for professional review.\n\nDo not make final safeguarding, legal or threshold decisions.\n\nStructure the output as:\n\n## Facts Identified\nSeparate known facts from interpretation.\n\n## Concerns Identified\nHighlight potential risks and indicators.\n\n## Missing Information\nList what is needed to understand risk more fully.\n\n## Immediate Risks\nIdentify anything that may require immediate manager/DSL review.\n\n## Management Considerations\nSuggest proportionate oversight and recording considerations.\n\n## Suggested Follow-up\nProvide practical next steps for professional review.`,
    },
    ofsted: {
      label: 'Ofsted Intelligence Engine',
      triggers: ['ofsted', 'inspection', 'evidence', 'quality standards', 'sccif', 'reg 45', 'regulation 45'],
      prompt: `Review this information through an Ofsted and children's residential leadership lens.\n\nStructure the output as:\n\n## Ofsted Evidence Review\nSummarise what this evidences.\n\n## Evidence Seen\nIdentify concrete evidence from the information provided.\n\n## Impact for Children\nExplain potential impact, being clear where impact is not evidenced.\n\n## Leadership Oversight\nIdentify management oversight, monitoring and learning points.\n\n## Evidence Gaps\nList what inspectors may ask for or challenge.\n\n## Recommended Actions\nSuggest practical improvement actions.\n\n## Potential Inspector Questions\nProvide likely inspection questions.`,
    },
    reflection: {
      label: 'Reflective Practice Engine',
      triggers: ['reflect', 'reflection', 'supervision', 'trauma-informed', 'relational', 'co-regulation', 'restorative'],
      prompt: `Support reflective practice using trauma-informed and relational residential care thinking.\n\nStructure the output as:\n\n## Reflective Practice Review\nSummarise the practice situation.\n\n## Emotional Context\nConsider how the young person and staff may have experienced the event.\n\n## Relational Dynamics\nExplore relationship, trust, repair and communication.\n\n## Trauma-informed Considerations\nIdentify potential unmet need, triggers or regulation needs.\n\n## Staff Reflection Prompts\nProvide questions for supervision/debrief.\n\n## Learning Opportunities\nSuggest practice learning and next steps.`,
    },
    evidence: {
      label: 'Evidence Summary Engine',
      triggers: ['summarise document', 'evidence summary', 'main themes', 'document summary', 'uploaded file'],
      prompt: `Create an operational evidence summary from the provided information or uploaded document.\n\nStructure the output as:\n\n## Evidence Summary\nBrief overview.\n\n## Main Themes\nKey themes identified.\n\n## Risks Identified\nAny risks or concerns visible in the evidence.\n\n## Leadership Implications\nWhat leaders/managers may need to consider.\n\n## Inspection Relevance\nHow this may relate to Ofsted evidence.\n\n## Missing Evidence\nWhat is not visible or needs confirming.\n\n## Suggested Actions\nPractical next steps.`,
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function normalise(value) {
    return String(value || '').toLowerCase();
  }

  function detectEngine(text) {
    const value = normalise(text);
    return Object.entries(ENGINES).find(([, engine]) => engine.triggers.some((trigger) => value.includes(trigger)))?.[0] || null;
  }

  function applyEngine(engineKey) {
    const engine = ENGINES[engineKey];
    const input = $('input');
    if (!engine || !input) return;

    const existing = input.value.trim();
    input.value = existing ? `${engine.prompt}\n\nInformation to review:\n${existing}` : `${engine.prompt}\n\nInformation to review:\n`;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function addEngineChips() {
    const target = $('suggestionChips');
    if (!target || target.dataset.enginesAdded === 'true') return;

    const chips = [
      ['chronology', 'Chronology'],
      ['recording', 'Recording QA'],
      ['safeguarding', 'Safeguarding'],
      ['ofsted', 'Ofsted'],
      ['reflection', 'Reflection'],
      ['evidence', 'Evidence summary'],
    ];

    chips.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('data-engine', key);
      target.appendChild(button);
    });

    target.dataset.enginesAdded = 'true';
  }

  function addWorkflowContinuations() {
    document.querySelectorAll('.wrap.assistant').forEach((wrap) => {
      if (wrap.dataset.engineContinuations === 'true') return;
      const text = wrap.innerText || '';
      const engine = detectEngine(text);
      if (!engine) return;

      const actions = wrap.querySelector('.ic-message-actions');
      if (!actions) return;

      const followUps = {
        chronology: [['safeguarding', 'Review safeguarding'], ['ofsted', 'Ofsted evidence'], ['recording', 'QA wording']],
        recording: [['chronology', 'Create chronology'], ['safeguarding', 'Safeguarding review'], ['ofsted', 'Inspection lens']],
        safeguarding: [['chronology', 'Create chronology'], ['recording', 'Improve record'], ['ofsted', 'Evidence summary']],
        ofsted: [['evidence', 'Evidence gaps'], ['recording', 'QA review'], ['reflection', 'Reflective prompts']],
        reflection: [['recording', 'Record learning'], ['safeguarding', 'Risk reflection'], ['ofsted', 'Leadership evidence']],
        evidence: [['ofsted', 'Inspection relevance'], ['chronology', 'Extract chronology'], ['safeguarding', 'Extract concerns']],
      }[engine] || [];

      followUps.forEach(([key, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.setAttribute('data-engine', key);
        actions.appendChild(button);
      });

      wrap.dataset.engineContinuations = 'true';
    });
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-engine]');
      if (!button) return;
      applyEngine(button.getAttribute('data-engine'));
    });

    const input = $('input');
    if (input) {
      input.addEventListener('input', () => {
        const engine = detectEngine(input.value);
        document.body.dataset.detectedEngine = engine || '';
      });
    }
  }

  function observeMessages() {
    const messages = $('messages');
    if (!messages) return;

    const observer = new MutationObserver(() => addWorkflowContinuations());
    observer.observe(messages, { childList: true, subtree: true });
    addWorkflowContinuations();
  }

  window.IndiCareOperationalEngines = {
    engines: ENGINES,
    detectEngine,
    applyEngine,
  };

  window.addEventListener('DOMContentLoaded', () => {
    addEngineChips();
    bind();
    observeMessages();
  });
})();
