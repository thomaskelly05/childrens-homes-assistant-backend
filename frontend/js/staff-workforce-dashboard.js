import {
  STAFF_JOURNEY_STAGES,
  STAFF_ROLES,
  complianceSummaryForStaff,
  listRotaShifts,
  listStaffProfiles,
  rotaCoverageForShift,
  saveRotaShift,
  seedStaffProfilesIfEmpty,
  staffReadiness,
  supervisionSummaryForStaff,
  trainingSummaryForStaff,
  workforceSummary,
} from './staff-workforce-engine.js';
import { listCareHubActions } from './care-hub-actions.js';

function byId(id) { return document.getElementById(id); }
function esc(value) { return String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' })[char]); }
function labelise(key = '') { return String(key).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function activeHash() { return window.location.hash.replace('#', '') || 'today'; }
function statusClass(status = '') {
  if (['ok', 'ready', 'compliant', 'active', 'competent'].includes(status)) return 'completed';
  if (['due_soon', 'probation', 'induction', 'development'].includes(status)) return 'medium';
  if (['missing', 'overdue', 'non_compliant', 'attention'].includes(status)) return 'high';
  return 'normal';
}

function staffActionsFor(profile) {
  const name = String(profile.name || '').toLowerCase();
  return listCareHubActions().filter((action) => String(action.owner || '').toLowerCase() === name || String(action.assignee || '').toLowerCase() === name || String(action.staff_id || '') === String(profile.id));
}

function ensureDemoRota() {
  const shifts = listRotaShifts();
  if (shifts.length) return shifts;
  const staff = seedStaffProfilesIfEmpty();
  const senior = staff.find((profile) => profile.role === 'senior');
  const support = staff.find((profile) => profile.role === 'support_worker');
  saveRotaShift({ id: 'rota-today-day', date: new Date().toISOString().slice(0, 10), shift: 'Day', staff_ids: [senior?.id, support?.id].filter(Boolean), required_roles: ['senior', 'support_worker'], required_competencies: ['autism_send', 'behaviour_support'] });
  saveRotaShift({ id: 'rota-today-late', date: new Date().toISOString().slice(0, 10), shift: 'Late', staff_ids: [support?.id].filter(Boolean), required_roles: ['senior', 'support_worker'], required_competencies: ['autism_send'] });
  return listRotaShifts();
}

function renderMetric(label, value) {
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
}

function renderStatusPill(text, status) {
  return `<span class="ops-priority ops-priority-${esc(statusClass(status))}">${esc(text)}</span>`;
}

function renderChecklist(title, items) {
  return `<article class="ops-card"><header><h2>${esc(title)}</h2></header><div class="ops-list">${items.map((item) => `<div class="ops-item"><div class="ops-item-main"><strong>${esc(labelise(item.key))}</strong>${item.expiry_date ? `<p>Expiry: ${esc(item.expiry_date)}</p>` : ''}</div>${renderStatusPill(labelise(item.status), item.status)}</div>`).join('')}</div></article>`;
}

function renderStaffCard(profile) {
  const readiness = staffReadiness(profile);
  const compliance = complianceSummaryForStaff(profile);
  const training = trainingSummaryForStaff(profile);
  const supervision = supervisionSummaryForStaff(profile);
  const actions = staffActionsFor(profile);
  return `<article class="ops-menu-card" data-staff-card="${esc(profile.id)}">
    <strong>${esc(profile.name)}</strong>
    <span>${esc(profile.role_label || STAFF_ROLES[profile.role] || profile.role)} · ${esc(STAFF_JOURNEY_STAGES[profile.journey_stage] || profile.journey_stage)}</span>
    <div class="ops-item-controls">
      ${renderStatusPill(readiness.ready ? 'Ready for shift' : 'Needs attention', readiness.status)}
      ${renderStatusPill(compliance.status, compliance.status)}
      ${renderStatusPill(`Training ${training.status}`, training.status)}
      ${renderStatusPill(`Supervision ${supervision.status}`, supervision.status)}
    </div>
    <small>${actions.length} assigned action${actions.length === 1 ? '' : 's'}</small>
  </article>`;
}

function renderStaffProfile(profile) {
  const readiness = staffReadiness(profile);
  const compliance = complianceSummaryForStaff(profile);
  const training = trainingSummaryForStaff(profile);
  const supervision = supervisionSummaryForStaff(profile);
  const actions = staffActionsFor(profile);
  return `<section class="ops-screen-card ops-staff-profile">
    <header>
      <p class="ops-eyebrow">Staff profile</p>
      <h2>${esc(profile.name)}</h2>
      <p>${esc(profile.role_label || STAFF_ROLES[profile.role] || profile.role)} · ${esc(STAFF_JOURNEY_STAGES[profile.journey_stage] || profile.journey_stage)} · ${esc(profile.status)}</p>
    </header>
    <div class="ops-alert-strip">
      ${renderMetric('Readiness', readiness.ready ? 'Ready' : 'Attention')}
      ${renderMetric('Compliance', compliance.status)}
      ${renderMetric('Training', training.status)}
    </div>
    <div class="ops-tool-layout">
      <section class="ops-tool-main">
        <div class="ops-section-card-grid">
          <article class="ops-section-card"><strong>About</strong><p>Start date: ${esc(profile.start_date || 'Not recorded')}</p><p>Shift pattern: ${esc(profile.shift_pattern || 'Not recorded')}</p><p>Key children: ${esc((profile.key_children || []).join(', ') || 'Not assigned')}</p></article>
          <article class="ops-section-card"><strong>Journey</strong><p>${esc(STAFF_JOURNEY_STAGES[profile.journey_stage] || profile.journey_stage)}</p><p>Progression should be blocked if safer recruitment, induction, supervision or competency is incomplete.</p></article>
          <article class="ops-section-card"><strong>Competencies</strong><p>${esc((profile.competencies || []).map(labelise).join(' · ') || 'No competencies signed off')}</p></article>
          <article class="ops-section-card"><strong>Wellbeing</strong><p>${esc(profile.wellbeing?.summary || 'No wellbeing concerns recorded.')}</p></article>
        </div>
        <article class="ops-card"><header><h2>Work and accountability</h2></header><div class="ops-list">${actions.length ? actions.map((action) => `<div class="ops-item"><div class="ops-item-main"><strong>${esc(action.title)}</strong><p>${esc(action.body || '')}</p><small>Due: ${esc(action.due || 'Not set')}</small></div>${renderStatusPill(action.status || 'open', action.status || 'open')}</div>`).join('') : '<p class="muted">No actions currently assigned to this staff member.</p>'}</div></article>
      </section>
      <aside class="ops-tool-side">
        ${renderChecklist('Safer recruitment & compliance', compliance.items)}
        ${renderChecklist('Training & competency', training.items)}
        <article class="ops-card"><header><h2>Supervision</h2></header><p>Last: ${esc(supervision.last_date || 'Not recorded')}</p><p>Next due: ${esc(supervision.next_due || 'Not set')}</p>${renderStatusPill(labelise(supervision.status), supervision.status)}</article>
      </aside>
    </div>
  </section>`;
}

function renderRotaBoard(staff) {
  const shifts = ensureDemoRota();
  return `<section class="ops-screen-card"><header><p class="ops-eyebrow">Rota & Availability</p><h2>Safe staffing view</h2><p>Shows coverage, role gaps, competency gaps and staff readiness for each shift.</p></header><div class="ops-board-columns">${shifts.map((shift) => {
    const coverage = rotaCoverageForShift(shift);
    return `<section class="ops-board-column"><h3>${esc(shift.date)} · ${esc(shift.shift)}</h3>${coverage.safe ? renderStatusPill('Safe cover', 'ready') : renderStatusPill('Needs attention', 'attention')}<div class="ops-record-preview-list"><article class="ops-record-preview"><strong>Assigned staff</strong><p>${coverage.assigned.map((p) => p.name).join(' · ') || 'None assigned'}</p></article><article class="ops-record-preview"><strong>Role gaps</strong><p>${coverage.roleGaps.map(labelise).join(' · ') || 'None'}</p></article><article class="ops-record-preview"><strong>Competency gaps</strong><p>${coverage.competencyGaps.map(labelise).join(' · ') || 'None'}</p></article><article class="ops-record-preview"><strong>Readiness concerns</strong><p>${coverage.nonCompliant.map((p) => p.name).join(' · ') || 'None'}</p></article></div></section>`;
  }).join('')}</div></section>`;
}

function renderTeamDashboard() {
  const staff = seedStaffProfilesIfEmpty();
  const summary = workforceSummary();
  return `<section class="ops-screen-card ops-staff-dashboard">
    <header><p class="ops-eyebrow">Our Team</p><h2>Workforce overview</h2><p>Staff profiles, safer recruitment, training, supervision, rota readiness and wellbeing in one place.</p></header>
    <div class="ops-alert-strip">
      ${renderMetric('Total staff', summary.total)}
      ${renderMetric('Ready', summary.ready)}
      ${renderMetric('Non-compliant', summary.non_compliant)}
    </div>
    <div class="ops-alert-strip">
      ${renderMetric('Training due', summary.training_due)}
      ${renderMetric('Supervision due', summary.supervision_due)}
      ${renderMetric('Agency / probation', `${summary.agency} / ${summary.probation}`)}
    </div>
    <div class="ops-menu-grid" id="staffProfileGrid">${staff.map(renderStaffCard).join('')}</div>
    <div id="staffProfileMount">${renderStaffProfile(staff[0])}</div>
    ${renderRotaBoard(staff)}
  </section>`;
}

function bindStaffCards() {
  const staff = listStaffProfiles();
  document.querySelectorAll('[data-staff-card]').forEach((card) => {
    card.addEventListener('click', () => {
      const profile = staff.find((item) => String(item.id) === String(card.dataset.staffCard));
      const mount = byId('staffProfileMount');
      if (profile && mount) mount.innerHTML = renderStaffProfile(profile);
    });
  });
}

export function renderStaffWorkforceIfActive() {
  if (activeHash() !== 'our-team') return false;
  const title = byId('opsScreenTitle');
  const intro = byId('opsScreenIntro');
  const widgets = byId('opsDashboardWidgets');
  const screen = byId('opsDynamicScreen');
  if (!screen) return false;
  if (title) title.textContent = 'Our Team';
  if (intro) intro.textContent = 'Staff profiles, safer recruitment, training, supervision, rota readiness and wellbeing.';
  if (widgets) widgets.classList.add('hidden');
  screen.innerHTML = renderTeamDashboard();
  bindStaffCards();
  return true;
}

function scheduleRender() { window.setTimeout(renderStaffWorkforceIfActive, 30); }
window.addEventListener('hashchange', scheduleRender);
window.addEventListener('indicare:staff-profile-updated', scheduleRender);
window.addEventListener('indicare:rota-updated', scheduleRender);
window.addEventListener('DOMContentLoaded', scheduleRender);
scheduleRender();

window.IndiCareStaffWorkforceDashboard = Object.freeze({ renderStaffWorkforceIfActive });
