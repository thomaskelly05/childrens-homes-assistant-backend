import { buildCareLoop } from './care-loop-engine.js';
import { buildChildIntelligence } from './child-intelligence-engine.js';
import { buildOutcomeEngine } from './outcome-engine.js';
import { buildChildEvidence } from './child-evidence-engine.js';

const assistantInput = document.getElementById('assistant-input');
const assistantOutput = document.getElementById('assistant-output');
const assistantRun = document.getElementById('assistant-run');
const suggestions = document.getElementById('assistant-suggestions');

bootCareCopilotChat();

function bootCareCopilotChat() {
  simplifyAssistantPanel();
  enhanceAssistantRun();
}

function simplifyAssistantPanel() {
  if (suggestions) {
    suggestions.innerHTML = `
      <button type="button" data-template="daily">Daily note</button>
      <button type="button" data-template="handover">Handover</button>
      <button type="button" data-template="incident">Incident reflection</button>
      <button type="button" data-template="safeguarding">Safeguarding summary</button>
      <button type="button" data-template="review">Review evidence</button>
    `;
    suggestions.querySelectorAll('[data-template]').forEach((button) => {
      button.addEventListener('click', async () => {
        const prompt = `Create a ${button.dataset.template} template using the current child and home records.`;
        if (assistantInput) assistantInput.value = prompt;
        await runCopilotChat(prompt);
      });
    });
  }

  if (assistantInput) {
    assistantInput.placeholder = 'Ask Copilot to summarise, draft, review or create a template from the child/home records...';
  }
  if (assistantRun) assistantRun.textContent = 'Ask Copilot';
}

function enhanceAssistantRun() {
  if (!assistantRun || assistantRun.dataset.contextual === 'true') return;
  assistantRun.dataset.contextual = 'true';
  assistantRun.addEventListener('click', async (event) => {
    const prompt = assistantInput?.value || '';
    if (!prompt.trim()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await runCopilotChat(prompt);
  }, true);
}

async function runCopilotChat(prompt) {
  if (!assistantOutput) return;
  assistantOutput.innerHTML = '<div class="copilot-thinking">Copilot is pulling together records, patterns and templates...</div>';

  const ctx = context();
  const records = await fetchAllRecords(ctx.childId);
  const intelligence = buildChildIntelligence(records);
  const outcomes = buildOutcomeEngine(records);
  const evidence = buildChildEvidence(records);
  const careLoops = records.map((record) => buildCareLoop(record)).filter(Boolean);

  assistantOutput.innerHTML = buildCopilotAnswer(prompt, ctx, records, intelligence, outcomes, evidence, careLoops);
}

function buildCopilotAnswer(prompt, ctx, records, intelligence, outcomes, evidence, careLoops) {
  const lower = prompt.toLowerCase();
  const template = detectTemplate(lower);
  const summary = buildSummary(ctx, records, intelligence, outcomes, evidence, careLoops);

  if (template) {
    return renderChatAnswer(
      `I have pulled together ${ctx.childName}'s recent records and created a ${template.label}.`,
      summary,
      renderTemplate(template.key, ctx, intelligence, outcomes, evidence)
    );
  }

  return renderChatAnswer(
    answerQuestion(lower, ctx, intelligence, outcomes, evidence, careLoops),
    summary,
    renderSuggestedTemplates()
  );
}

function buildSummary(ctx, records, intelligence, outcomes, evidence, careLoops) {
  const averageQuality = careLoops.length ? Math.round(careLoops.reduce((sum, item) => sum + item.quality.score, 0) / careLoops.length) : 0;
  return {
    child: ctx.childName || 'Selected child',
    records: records.length,
    presentation: intelligence.emotionalPresentation,
    risk: intelligence.riskLevel,
    voice: evidence.childVoice.count,
    outcome: outcomes.outcomes[0]?.text || 'Outcome evidence is still developing.',
    quality: averageQuality
  };
}

function answerQuestion(lower, ctx, intelligence, outcomes, evidence, careLoops) {
  if (lower.includes('risk') || lower.includes('safeguard')) {
    return `The main current risk picture for ${ctx.childName} is ${intelligence.riskLevel.toLowerCase()}. The key concern is: ${first(intelligence.liveConcerns)}. I would review linked plans, check whether the risk assessment still reflects current presentation, and make sure any protective actions are clearly recorded.`;
  }
  if (lower.includes('voice')) {
    return `${ctx.childName}'s voice appears in ${evidence.childVoice.count} recent evidence point(s). ${evidence.childVoice.gap ? 'This is not strong enough yet. The next record should capture direct words, choices, wishes, worries, or non-verbal communication.' : 'This is positive. The next step is linking voice to adult action and impact.'}`;
  }
  if (lower.includes('outcome') || lower.includes('progress')) {
    return outcomes.outcomes[0]?.text || `There is not enough clear outcome evidence yet for ${ctx.childName}. Future records should show what changed after adult support, not only what happened.`;
  }
  if (lower.includes('record') || lower.includes('quality')) {
    const weak = careLoops.filter((item) => item.quality.score < 65).length;
    return `Recording quality is strongest when entries include facts, child voice, adult response, reflection and outcome. I found ${weak} recent record(s) that may need stronger reflection, child voice or impact evidence before sign-off.`;
  }
  return `${ctx.childName}'s current presentation is ${intelligence.emotionalPresentation.toLowerCase()}. The most helpful adult approach appears to be: ${list(intelligence.supports)}. The key reflection question is: ${intelligence.therapeuticQuestions[0] || 'What did the child need from adults today?'}`;
}

function renderChatAnswer(answer, summary, extraHtml) {
  return `
    <div class="copilot-chat-answer">
      <div class="copilot-message assistant">
        <strong>Answer</strong>
        <p>${escapeHtml(answer)}</p>
      </div>
      <div class="copilot-context-card">
        <strong>Information used</strong>
        <p>${escapeHtml(summary.child)} • ${summary.records} record(s) • Presentation: ${escapeHtml(summary.presentation)} • Risk: ${escapeHtml(summary.risk)} • Voice: ${summary.voice} • Quality: ${summary.quality}%</p>
        <small>${escapeHtml(summary.outcome)}</small>
      </div>
      ${extraHtml}
    </div>
  `;
}

function renderSuggestedTemplates() {
  return `
    <div class="copilot-template-row">
      <button type="button" onclick="document.getElementById('assistant-input').value='Create a daily note template from the current records';document.getElementById('assistant-run').click();">Daily note</button>
      <button type="button" onclick="document.getElementById('assistant-input').value='Create a handover template from the current records';document.getElementById('assistant-run').click();">Handover</button>
      <button type="button" onclick="document.getElementById('assistant-input').value='Create a review evidence template from the current records';document.getElementById('assistant-run').click();">Review evidence</button>
    </div>
  `;
}

function renderTemplate(key, ctx, intelligence, outcomes, evidence) {
  const templates = {
    daily: `Daily note for ${ctx.childName}\n\nPresentation: ${intelligence.emotionalPresentation}\nWhat happened: [add concise factual summary]\nChild voice: ${evidence.childVoice.count ? '[include direct quote/communication]' : '[capture direct words, choices or non-verbal communication]'}\nAdult response: ${list(intelligence.supports)}\nReflection: What was the child communicating?\nOutcome/next action: ${outcomes.planPrompts[0] || '[record what changed or what needs follow-up]'}`,
    handover: `Handover for ${ctx.childName}\n\nCurrent presentation: ${intelligence.emotionalPresentation}\nKey risks: ${first(intelligence.liveConcerns)}\nWhat helped today: ${list(intelligence.supports)}\nWatch for: ${list(intelligence.stressors)}\nOutstanding actions: ${outcomes.planPrompts[0] || 'Continue monitoring and update records if presentation changes.'}`,
    incident: `Incident reflection for ${ctx.childName}\n\nFacts: [what happened, where, who was present]\nAntecedent: [what happened before]\nChild voice/presentation: ${intelligence.emotionalPresentation}\nPossible meaning: [what need may sit underneath this?]\nAdult response: [what staff did and why]\nRepair/restoration: [what happened afterwards]\nPlan impact: ${outcomes.planPrompts[0] || '[does risk/behaviour support plan need review?]'}`,
    safeguarding: `Safeguarding summary for ${ctx.childName}\n\nConcern: ${first(intelligence.liveConcerns)}\nImmediate action: [what was done to keep the child safe]\nWho was informed: [manager/social worker/police/placing authority]\nChild voice: [what the child said/showed]\nRisk level: ${intelligence.riskLevel}\nNext action: ${outcomes.planPrompts[0] || 'Review risk assessment and record management oversight.'}`,
    review: `Review evidence for ${ctx.childName}\n\nCurrent presentation: ${intelligence.emotionalPresentation}\nChild voice evidence: ${evidence.childVoice.count} signal(s)\nOutcome evidence: ${outcomes.outcomes[0]?.text || 'Still developing'}\nWhat has helped: ${list(intelligence.supports)}\nPatterns: ${list(intelligence.patterns)}\nRecommended actions: ${outcomes.planPrompts[0] || 'Continue strengthening outcome and impact evidence.'}`
  };

  return `
    <div class="copilot-template-box">
      <strong>Template</strong>
      <pre>${escapeHtml(templates[key] || templates.daily)}</pre>
    </div>
  `;
}

function detectTemplate(lower) {
  const options = [
    { key: 'daily', label: 'daily note template', tests: ['daily note', 'daily record', 'daily'] },
    { key: 'handover', label: 'handover template', tests: ['handover', 'shift handover'] },
    { key: 'incident', label: 'incident reflection template', tests: ['incident', 'behaviour', 'restraint'] },
    { key: 'safeguarding', label: 'safeguarding summary template', tests: ['safeguarding', 'risk summary', 'concern'] },
    { key: 'review', label: 'review evidence template', tests: ['review', 'evidence', 'ofsted', 'reg 45'] }
  ];
  return options.find((option) => option.tests.some((test) => lower.includes(test)));
}

async function fetchAllRecords(childId) {
  const types = ['daily', 'incident', 'safeguarding', 'missing'];
  let all = [];
  for (const type of types) {
    try {
      const response = await fetch(`/workspace-records/${type}?young_person_id=${encodeURIComponent(childId)}`, { credentials: 'include' });
      const data = await response.json();
      all = all.concat((data.records || []).map((record) => ({ ...record, type: record.record_type || type, content: record.content || {} })));
    } catch {}
  }
  return all;
}

function context() { return window.IndiCareContext?.get?.() || { childId: '1', childName: 'Child A', homeName: 'Main home' }; }
function first(items) { return Array.isArray(items) && items.length ? items[0] : 'No major live concern recorded.'; }
function list(items) { return Array.isArray(items) && items.length ? items.join(', ') : 'continue observing and recording patterns'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
