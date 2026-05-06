import { buildCareLoop } from './care-loop-engine.js';
import { buildChildIntelligence } from './child-intelligence-engine.js';
import { buildOutcomeEngine } from './outcome-engine.js';
import { buildChildEvidence } from './child-evidence-engine.js';

const assistantInput = document.getElementById('assistant-input');
const assistantOutput = document.getElementById('assistant-output');
const assistantRun = document.getElementById('assistant-run');
const suggestions = document.getElementById('assistant-suggestions');
const workspace = document.getElementById('workspace-main');

bootContextualCareCopilot();

function bootContextualCareCopilot() {
  renderSmartSuggestions();
  enhanceAssistantRun();
  addInlineCopilotButton();
}

function renderSmartSuggestions() {
  if (!suggestions) return;
  suggestions.innerHTML = `
    <button type="button" data-copilot-prompt="meaning">What might this child be communicating?</button>
    <button type="button" data-copilot-prompt="risk">What risks are emerging?</button>
    <button type="button" data-copilot-prompt="voice">What child voice is missing?</button>
    <button type="button" data-copilot-prompt="outcomes">What outcomes can we evidence?</button>
  `;

  suggestions.querySelectorAll('[data-copilot-prompt]').forEach((button) => {
    button.addEventListener('click', async () => {
      const prompt = promptFor(button.dataset.copilotPrompt);
      if (assistantInput) assistantInput.value = prompt;
      await runContextualResponse(prompt);
    });
  });
}

function enhanceAssistantRun() {
  if (!assistantRun || assistantRun.dataset.contextual === 'true') return;
  assistantRun.dataset.contextual = 'true';
  assistantRun.addEventListener('click', async (event) => {
    const prompt = assistantInput?.value || '';
    if (!prompt.trim()) return;
    event.preventDefault();
    await runContextualResponse(prompt);
  }, true);
}

function addInlineCopilotButton() {
  if (!workspace || document.querySelector('.floating-copilot-button')) return;
  const button = document.createElement('button');
  button.className = 'floating-copilot-button';
  button.type = 'button';
  button.textContent = 'Ask care copilot';
  button.addEventListener('click', async () => {
    const prompt = 'Give me the most important therapeutic guidance for this child right now.';
    if (assistantInput) assistantInput.value = prompt;
    await runContextualResponse(prompt);
  });
  document.body.appendChild(button);
}

async function runContextualResponse(prompt) {
  if (!assistantOutput) return;
  assistantOutput.innerHTML = '<div class="copilot-thinking">Reading live records and care context...</div>';

  const ctx = context();
  const records = await fetchAllRecords(ctx.childId);
  const intelligence = buildChildIntelligence(records);
  const outcomes = buildOutcomeEngine(records);
  const evidence = buildChildEvidence(records);
  const quality = records.map((record) => buildCareLoop(record)).filter(Boolean);
  const response = buildContextualAnswer(prompt, ctx, records, intelligence, outcomes, evidence, quality);

  assistantOutput.innerHTML = response;
}

function buildContextualAnswer(prompt, ctx, records, intelligence, outcomes, evidence, quality) {
  const lower = prompt.toLowerCase();
  const qualityAverage = quality.length ? Math.round(quality.reduce((sum, item) => sum + item.quality.score, 0) / quality.length) : 0;
  const weakRecords = quality.filter((item) => item.quality.score < 65).length;

  const sections = [];
  sections.push(`<div class="copilot-answer"><p class="eyebrow">Contextual care copilot</p><h4>${escapeHtml(ctx.childName || 'Selected child')}</h4>`);

  if (lower.includes('communicat') || lower.includes('meaning') || lower.includes('behaviour')) {
    sections.push(block('What this may be communicating', [
      `Current presentation appears: ${intelligence.emotionalPresentation}.`,
      `Likely stressors: ${list(intelligence.stressors)}.`,
      `Adult response should prioritise: ${list(intelligence.supports)}.`
    ], 'low'));
  }

  if (lower.includes('risk') || lower.includes('safeguard') || lower.includes('emerging')) {
    sections.push(block('Risk and safeguarding view', [
      `Current risk level: ${intelligence.riskLevel}.`,
      `Live concerns: ${list(intelligence.liveConcerns)}.`,
      intelligence.riskLevel === 'High' ? 'Manager review and plan check recommended.' : 'Continue monitoring patterns and recording protective actions.'
    ], intelligence.riskLevel === 'High' ? 'high' : 'medium'));
  }

  if (lower.includes('voice') || lower.includes('child')) {
    sections.push(block('Child voice', [
      `${evidence.childVoice.count} child voice signal(s) found in current records.`,
      evidence.childVoice.gap ? 'Child voice is not strong enough yet. Capture direct words, non-verbal communication, wishes and preferences.' : 'Child voice appears visible. Keep linking it to adult action and impact.',
      'Best next record: “What did the child say, show, choose or refuse today?”'
    ], evidence.childVoice.gap ? 'medium' : 'low'));
  }

  if (lower.includes('outcome') || lower.includes('evidence') || lower.includes('impact')) {
    sections.push(block('Outcomes and impact', [
      outcomes.outcomes[0]?.text || 'Outcome evidence is still developing.',
      outcomes.planPrompts[0] || 'No urgent plan update suggested from current records.',
      'Strong reports should show what changed for the child after adult support.'
    ], 'low'));
  }

  if (!sections.some((section) => section.includes('What this may be communicating'))) {
    sections.push(block('Therapeutic guidance now', [
      `Presentation: ${intelligence.emotionalPresentation}.`,
      `What helps: ${list(intelligence.supports)}.`,
      `Reflection prompt: ${intelligence.therapeuticQuestions[0] || 'What did the child need from adults today?'}`
    ], 'low'));
  }

  sections.push(block('Recording quality', [
    `Average care-loop quality: ${qualityAverage}%.`,
    `${weakRecords} weak record(s) may need more child voice, adult response, reflection or outcome detail.`,
    'Before sign-off, check: facts, meaning, child voice, staff response and what changed.'
  ], weakRecords ? 'medium' : 'low'));

  sections.push('</div>');
  return sections.join('');
}

function block(title, lines, level) {
  return `<div class="alert ${level}"><strong>${escapeHtml(title)}</strong>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`;
}

function promptFor(type) {
  const ctx = context();
  const prompts = {
    meaning: `What might ${ctx.childName} be communicating through recent behaviour and emotional presentation?`,
    risk: `What safeguarding or emotional risks are emerging for ${ctx.childName}?`,
    voice: `What child voice is missing from ${ctx.childName}'s records?`,
    outcomes: `What outcomes and impact can we evidence for ${ctx.childName}?`
  };
  return prompts[type] || `Give therapeutic guidance for ${ctx.childName}.`;
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

function context() {
  return window.IndiCareContext?.get?.() || { childId: '1', childName: 'Child A', homeName: 'Main home' };
}

function list(items) {
  return Array.isArray(items) && items.length ? items.join(', ') : 'continue observing and recording patterns';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}
