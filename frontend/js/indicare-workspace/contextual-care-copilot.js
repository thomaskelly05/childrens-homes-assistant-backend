import { buildCareLoop } from './care-loop-engine.js';
import { buildChildIntelligence } from './child-intelligence-engine.js';
import { buildOutcomeEngine } from './outcome-engine.js';
import { buildChildEvidence } from './child-evidence-engine.js';

const legacyAssistantPanel = document.querySelector('.assistant-panel');

bootOperatingSystemCopilot();

function bootOperatingSystemCopilot() {
  hideLegacyAssistantPanel();
  createFloatingCopilotButton();
  createCopilotModal();
}

function hideLegacyAssistantPanel() {
  if (legacyAssistantPanel) {
    legacyAssistantPanel.setAttribute('hidden', 'hidden');
    legacyAssistantPanel.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.add('os-copilot-enabled');
}

function createFloatingCopilotButton() {
  if (document.getElementById('os-copilot-launcher')) return;
  const button = document.createElement('button');
  button.id = 'os-copilot-launcher';
  button.className = 'os-copilot-launcher';
  button.type = 'button';
  button.innerHTML = `<span>AI</span><strong>Copilot</strong>`;
  button.addEventListener('click', openCopilotModal);
  document.body.appendChild(button);
}

function createCopilotModal() {
  if (document.getElementById('os-copilot-modal')) return;
  const modal = document.createElement('section');
  modal.id = 'os-copilot-modal';
  modal.className = 'os-copilot-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'os-copilot-title');
  modal.innerHTML = `
    <div class="os-copilot-shell">
      <header class="os-copilot-header">
        <div>
          <p class="eyebrow">IndiCare Copilot</p>
          <h2 id="os-copilot-title">Adult assistant for records, regulation and evidence</h2>
          <p id="os-copilot-context">Ask about young people, records, Reg 44/45, evidence, safeguarding, chronology or templates.</p>
        </div>
        <button type="button" class="icon-button" id="os-copilot-close" aria-label="Close Copilot">×</button>
      </header>

      <div class="os-copilot-layout">
        <aside class="os-copilot-rail">
          <button type="button" data-copilot-prompt="reg45">Create Reg 45 points</button>
          <button type="button" data-copilot-prompt="reg44">Create Reg 44 evidence</button>
          <button type="button" data-copilot-prompt="young-person">Summarise young person</button>
          <button type="button" data-copilot-prompt="records">Find record evidence</button>
          <button type="button" data-copilot-prompt="safeguarding">Safeguarding summary</button>
          <button type="button" data-copilot-prompt="handover">Create handover</button>
        </aside>

        <main class="os-copilot-main">
          <div class="os-copilot-thread" id="os-copilot-thread">
            <div class="copilot-message assistant">
              <strong>How can I help?</strong>
              <p>I can pull together records, child context, safeguarding patterns and inspection evidence to help adults write, review and understand care.</p>
            </div>
          </div>

          <form class="os-copilot-composer" id="os-copilot-form">
            <textarea id="os-copilot-input" placeholder="Ask Copilot anything: e.g. create Reg 45 points for this month, summarise safeguarding concerns, draft review evidence, or explain what is happening for this young person..."></textarea>
            <button type="submit" class="primary-action">Ask Copilot</button>
          </form>
        </main>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#os-copilot-close')?.addEventListener('click', closeCopilotModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeCopilotModal();
  });
  modal.querySelectorAll('[data-copilot-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = modal.querySelector('#os-copilot-input');
      input.value = promptFor(button.dataset.copilotPrompt);
      input.focus();
    });
  });
  modal.querySelector('#os-copilot-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = modal.querySelector('#os-copilot-input');
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';
    await runCopilot(prompt);
  });
}

function openCopilotModal() {
  const modal = document.getElementById('os-copilot-modal');
  if (!modal) return;
  const ctx = context();
  const contextLabel = document.getElementById('os-copilot-context');
  if (contextLabel) {
    contextLabel.textContent = ctx.childId
      ? `Using current OS context: ${ctx.childName} • ${ctx.homeName || 'Selected home'}. Ask for records, evidence, Reg 44/45 points or templates.`
      : 'Select a young person to give Copilot child-specific context, or ask general home/provider questions.';
  }
  modal.classList.remove('hidden');
  document.getElementById('os-copilot-input')?.focus();
}

function closeCopilotModal() {
  document.getElementById('os-copilot-modal')?.classList.add('hidden');
}

async function runCopilot(prompt) {
  const thread = document.getElementById('os-copilot-thread');
  if (!thread) return;
  thread.insertAdjacentHTML('beforeend', `<div class="copilot-message user"><p>${escapeHtml(prompt)}</p></div>`);
  const thinkingId = `thinking-${Date.now()}`;
  thread.insertAdjacentHTML('beforeend', `<div class="copilot-message assistant" id="${thinkingId}"><p>Pulling together records, regulation context and evidence...</p></div>`);
  thread.scrollTop = thread.scrollHeight;

  const answer = await getCopilotAnswer(prompt);
  const thinking = document.getElementById(thinkingId);
  if (thinking) thinking.outerHTML = answer;
  thread.scrollTop = thread.scrollHeight;
}

async function getCopilotAnswer(prompt) {
  const ctx = context();
  const records = await fetchAllRecords(ctx.childId);

  const existingAssistant = await callExistingRegulatoryAssistant(prompt, ctx, records);
  if (existingAssistant) return renderAssistantAnswer(existingAssistant.answer, existingAssistant.sources || [], existingAssistant.template || '');

  const intelligence = buildChildIntelligence(records);
  const outcomes = buildOutcomeEngine(records);
  const evidence = buildChildEvidence(records);
  const careLoops = records.map((record) => buildCareLoop(record)).filter(Boolean);
  const answer = buildLocalCopilotAnswer(prompt, ctx, records, intelligence, outcomes, evidence, careLoops);
  return renderAssistantAnswer(answer.text, answer.sources, answer.template);
}

async function callExistingRegulatoryAssistant(prompt, ctx, records) {
  const endpoints = ['/regulatory-ai/ask', '/api/regulatory-ai/ask', '/assistant/regulatory', '/api/assistant/regulatory'];
  const payload = {
    prompt,
    context: {
      source: 'indicare_blue_os_copilot',
      child_id: ctx.childId || null,
      child_name: ctx.childName || null,
      home_id: ctx.homeId || null,
      home_name: ctx.homeName || null,
    },
    records: records.slice(0, 25),
  };

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data?.answer || data?.response || data?.content) {
        return {
          answer: data.answer || data.response || data.content,
          sources: data.sources || data.evidence || [],
          template: data.template || data.draft || '',
        };
      }
    } catch {}
  }
  return null;
}

function buildLocalCopilotAnswer(prompt, ctx, records, intelligence, outcomes, evidence, careLoops) {
  const lower = prompt.toLowerCase();
  const sources = records.slice(0, 8).map((record) => `${record.record_type || record.type}: ${record.title || record.summary || 'record'}`);

  if (lower.includes('reg 45') || lower.includes('reg45')) {
    return {
      text: `For Reg 45, I would evidence quality of care through ${records.length} recent record(s), current presentation (${intelligence.emotionalPresentation}), risk level (${intelligence.riskLevel}), child voice evidence (${evidence.childVoice.count}) and outcome evidence. Focus the report on what leaders know, what has improved, what remains a concern and what action is being taken.`,
      sources,
      template: reg45Template(ctx, intelligence, outcomes, evidence),
    };
  }

  if (lower.includes('reg 44') || lower.includes('reg44')) {
    return {
      text: `For Reg 44, pull evidence from records, safeguarding, missing episodes, child voice, staff response and manager oversight. The key test is whether the visitor can see how the home knows children are safe, listened to and making progress.`,
      sources,
      template: reg44Template(ctx, intelligence, outcomes, evidence),
    };
  }

  if (lower.includes('evidence') || lower.includes('ofsted')) {
    return {
      text: `The strongest evidence currently visible is: child voice count ${evidence.childVoice.count}, risk level ${intelligence.riskLevel}, emotional presentation ${intelligence.emotionalPresentation}, and outcome signal: ${outcomes.outcomes[0]?.text || 'outcome evidence still developing'}.`,
      sources,
      template: evidenceTemplate(ctx, intelligence, outcomes, evidence),
    };
  }

  if (lower.includes('safeguard') || lower.includes('risk')) {
    return {
      text: `The current safeguarding picture for ${ctx.childName || 'the selected young person'} is ${intelligence.riskLevel}. Main concern: ${first(intelligence.liveConcerns)}. Check that immediate actions, notifications, child voice, manager oversight and follow-up are clearly recorded.`,
      sources,
      template: safeguardingTemplate(ctx, intelligence, outcomes),
    };
  }

  if (lower.includes('handover')) {
    return {
      text: `I have created a handover structure using the current child context and recent records.`,
      sources,
      template: handoverTemplate(ctx, intelligence, outcomes),
    };
  }

  const weak = careLoops.filter((item) => item.quality.score < 65).length;
  return {
    text: `${ctx.childName || 'The selected young person'} is currently presenting as ${intelligence.emotionalPresentation}. Risk is ${intelligence.riskLevel}. I found ${records.length} recent record(s), ${evidence.childVoice.count} child voice signal(s), and ${weak} record(s) that may need stronger reflection, adult response or outcome detail.`,
    sources,
    template: generalTemplate(ctx, intelligence, outcomes, evidence),
  };
}

function renderAssistantAnswer(answer, sources = [], template = '') {
  return `
    <div class="copilot-message assistant">
      <strong>Answer</strong>
      <p>${escapeHtml(answer)}</p>
      ${template ? `<div class="copilot-template-box"><strong>Draft / template</strong><pre>${escapeHtml(template)}</pre></div>` : ''}
      ${sources?.length ? `<div class="copilot-context-card"><strong>Evidence used</strong>${sources.slice(0, 8).map((source) => `<p>${escapeHtml(typeof source === 'string' ? source : source.title || source.summary || JSON.stringify(source))}</p>`).join('')}</div>` : ''}
    </div>
  `;
}

function promptFor(type) {
  const ctx = context();
  const child = ctx.childName || 'the selected young person';
  const prompts = {
    reg45: `Create Reg 45 points using evidence from ${child}'s records, safeguarding, outcomes, child voice and manager oversight.`,
    reg44: `Create Reg 44 evidence prompts for ${child} and the home using recent records, safeguarding, child voice and outcomes.`,
    'young-person': `Summarise what is happening for ${child}. Include emotional presentation, risks, child voice, patterns, strengths and what adults should do next.`,
    records: `Find the strongest evidence from ${child}'s records for progress, safeguarding, child voice and quality of care.`,
    safeguarding: `Summarise safeguarding concerns for ${child}, including risks, actions taken, evidence gaps and next steps.`,
    handover: `Create a shift handover for ${child} using recent records, risks, what helped and outstanding actions.`,
  };
  return prompts[type] || `Help me understand ${child}.`;
}

function reg45Template(ctx, intelligence, outcomes, evidence) {
  return `Reg 45 quality of care points - ${ctx.childName || 'Young person'}\n\n1. Current presentation: ${intelligence.emotionalPresentation}\n2. Safeguarding/risk: ${intelligence.riskLevel} - ${first(intelligence.liveConcerns)}\n3. Child voice: ${evidence.childVoice.count} evidence point(s).\n4. Outcomes/progress: ${outcomes.outcomes[0]?.text || 'Outcome evidence to be strengthened.'}\n5. Leadership oversight: [add manager review, actions, learning and follow-up]\n6. Next actions: ${outcomes.planPrompts[0] || 'Continue reviewing records, plans and child voice evidence.'}`;
}
function reg44Template(ctx, intelligence, outcomes, evidence) {
  return `Reg 44 visitor evidence prompts - ${ctx.homeName || 'Home'}\n\nChild focus: ${ctx.childName || 'Selected child'}\nSafety: ${intelligence.riskLevel}\nVoice of child: ${evidence.childVoice.count} signal(s)\nWhat records show: ${outcomes.outcomes[0]?.text || 'Evidence developing'}\nQuestions for visitor:\n- Can the child describe feeling listened to?\n- Do records show adult response and impact?\n- Are plans updated when risks change?\n- Is manager oversight visible?`;
}
function evidenceTemplate(ctx, intelligence, outcomes, evidence) {
  return `Evidence summary - ${ctx.childName || 'Young person'}\n\nPresentation: ${intelligence.emotionalPresentation}\nRisk: ${intelligence.riskLevel}\nChild voice: ${evidence.childVoice.count} signal(s)\nOutcome: ${outcomes.outcomes[0]?.text || 'Needs clearer outcome evidence'}\nEvidence gaps: ${evidence.childVoice.gap ? 'Strengthen direct child voice.' : 'Continue linking voice to action.'}`;
}
function safeguardingTemplate(ctx, intelligence, outcomes) {
  return `Safeguarding summary - ${ctx.childName || 'Young person'}\n\nConcern: ${first(intelligence.liveConcerns)}\nRisk level: ${intelligence.riskLevel}\nImmediate safety actions: [add actions taken]\nNotifications: [manager/social worker/police/placing authority]\nChild voice: [add what the child said/showed]\nNext action: ${outcomes.planPrompts[0] || 'Review risk assessment and management oversight.'}`;
}
function handoverTemplate(ctx, intelligence, outcomes) {
  return `Shift handover - ${ctx.childName || 'Young person'}\n\nCurrent presentation: ${intelligence.emotionalPresentation}\nKey risks: ${first(intelligence.liveConcerns)}\nWhat helped: ${list(intelligence.supports)}\nWatch for: ${list(intelligence.stressors)}\nOutstanding actions: ${outcomes.planPrompts[0] || 'Continue monitoring and record any change.'}`;
}
function generalTemplate(ctx, intelligence, outcomes, evidence) {
  return `Adult assistant summary - ${ctx.childName || 'Young person'}\n\nWhat appears to be happening: ${intelligence.emotionalPresentation}\nRisk picture: ${intelligence.riskLevel}\nChild voice evidence: ${evidence.childVoice.count}\nWhat adults should consider: ${intelligence.therapeuticQuestions[0] || 'What did the child need from adults today?'}\nNext action: ${outcomes.planPrompts[0] || 'Strengthen records with child voice, adult response and outcome.'}`;
}

async function fetchAllRecords(childId) {
  if (!childId) return [];
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}&limit=100`, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function context() { return window.IndiCareContext?.get?.() || { childId: '', childName: 'Selected young person', homeName: 'Selected home' }; }
function first(items) { return Array.isArray(items) && items.length ? items[0] : 'No major live concern recorded.'; }
function list(items) { return Array.isArray(items) && items.length ? items.join(', ') : 'continue observing and recording patterns'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
