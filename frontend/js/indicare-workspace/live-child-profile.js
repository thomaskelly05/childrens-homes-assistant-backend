import { buildChildIntelligence } from './child-intelligence-engine.js';
import { buildOutcomeEngine } from './outcome-engine.js';
import { buildChildEvidence } from './child-evidence-engine.js';

const commandCentre = document.querySelector('.os-command-centre');
const workspace = document.getElementById('workspace-main');

bootLiveChildProfile();

function bootLiveChildProfile() {
  renderLiveChildProfile();
  window.addEventListener('indicare:context-change', () => renderLiveChildProfile());
}

async function renderLiveChildProfile() {
  const ctx = context();
  const host = commandCentre?.parentElement || document.querySelector('.main-panel');
  if (!host) return;

  document.getElementById('live-child-profile')?.remove();

  if (!ctx.childId) return;

  const shell = document.createElement('section');
  shell.id = 'live-child-profile';
  shell.className = 'live-child-profile';
  shell.innerHTML = skeleton(ctx);
  commandCentre?.insertAdjacentElement('afterend', shell);

  const records = await fetchAllRecords(ctx.childId);
  const intelligence = buildChildIntelligence(records);
  const outcomes = buildOutcomeEngine(records);
  const evidence = buildChildEvidence(records);

  shell.innerHTML = `
    <div class="live-child-main">
      <div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div>
      <div>
        <p class="eyebrow">Live child profile</p>
        <h3>${escapeHtml(ctx.childName)}</h3>
        <p>${escapeHtml(ctx.homeName || 'Selected home')} ${ctx.childPlacementStatus ? `• ${escapeHtml(ctx.childPlacementStatus)}` : ''} ${ctx.childRiskLevel ? `• DB risk: ${escapeHtml(ctx.childRiskLevel)}` : ''}</p>
      </div>
    </div>
    <div class="live-child-signal">
      <span>Emotional presentation</span>
      <strong>${escapeHtml(intelligence.emotionalPresentation)}</strong>
    </div>
    <div class="live-child-signal ${riskClass(intelligence.riskLevel)}">
      <span>Current risk</span>
      <strong>${escapeHtml(intelligence.riskLevel)}</strong>
    </div>
    <div class="live-child-signal">
      <span>Child voice</span>
      <strong>${escapeHtml(evidence.childVoice.count)}</strong>
    </div>
    <div class="live-child-next">
      <span>Next best action</span>
      <strong>${escapeHtml(outcomes.planPrompts[0] || intelligence.recommendations[0] || 'Continue recording lived experience and child voice.')}</strong>
    </div>
  `;
}

function skeleton(ctx) {
  return `
    <div class="live-child-main">
      <div class="child-avatar-large">${escapeHtml(initials(ctx.childName))}</div>
      <div><p class="eyebrow">Live child profile</p><h3>${escapeHtml(ctx.childName)}</h3><p>Loading live profile...</p></div>
    </div>
  `;
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

function context() { return window.IndiCareContext?.get?.() || { childId: '', childName: 'Select child', homeName: 'Select home' }; }
function initials(name) { return String(name || 'YP').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
function riskClass(value) { return `risk-${String(value || 'low').toLowerCase()}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
