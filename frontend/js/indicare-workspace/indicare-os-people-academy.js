import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  escapeHtml,
  formatDate,
} from './indicare-os-context.js';

const ACADEMY = [
  {
    id: 'safeguarding-foundations',
    title: 'Safeguarding Foundations',
    category: 'Safeguarding',
    duration: '45 mins',
    level: 'Core',
    description: 'Residential safeguarding, escalation pathways, contextual safeguarding and recording expectations.',
  },
  {
    id: 'child-voice-recording',
    title: 'Child Voice & Recording',
    category: 'Recording',
    duration: '30 mins',
    level: 'Operational',
    description: 'Writing calm, reflective and evidence-based records using trauma-informed language.',
  },
  {
    id: 'missing-from-home',
    title: 'Missing From Home Response',
    category: 'Missing Episodes',
    duration: '35 mins',
    level: 'Advanced',
    description: 'Operational response, chronology linkage and return-home conversations.',
  },
];

bootPeopleAcademy();

function bootPeopleAcademy() {
  window.addEventListener('indicare:os-context-ready', renderEnhancements);
  window.addEventListener('indicare:refresh-live-os', renderEnhancements);
  document.addEventListener('click', handleClicks, true);
  const observer = new MutationObserver(() => renderEnhancements());
  observer.observe(document.body, { childList: true, subtree: true });
  renderEnhancements();
}

function renderEnhancements() {
  renderAdultsPanel();
  renderAcademyPanel();
}

function renderAdultsPanel() {
  const main = document.getElementById('sp-main');
  if (!main) return;
  const title = main.querySelector('.sp-page-head h1')?.textContent?.trim();
  if (title !== 'Dashboard') return;

  const existing = main.querySelector('[data-os-adults-panel]');
  const context = scopeContextToSession(getOsContext(), getOperationalSession());

  const adults = buildAdults(context);

  const html = `
    <section class="sp-card" data-os-adults-panel>
      <div class="sp-card-head">
        <div>
          <h2>Adults & professionals</h2>
          <p>Operational staff, managers and linked professionals connected to the current home and session.</p>
        </div>
      </div>
      <div class="os-adults-grid">
        ${adults.map((adult) => `
          <article class="os-adult-card">
            <div class="os-adult-top">
              <span class="sp-child-avatar">${escapeHtml(initials(adult.name))}</span>
              <div>
                <strong>${escapeHtml(adult.name)}</strong>
                <small>${escapeHtml(adult.role)}</small>
              </div>
            </div>
            <div class="os-adult-meta">
              <p><span>Home</span><strong>${escapeHtml(adult.home)}</strong></p>
              <p><span>Shift</span><strong>${escapeHtml(adult.shift)}</strong></p>
              <p><span>Last active</span><strong>${escapeHtml(formatDate(adult.lastActive, 'Today'))}</strong></p>
            </div>
            <div class="os-adult-actions">
              <button type="button" class="sp-secondary">Open profile</button>
              <button type="button" class="sp-primary">Message</button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>`;

  if (existing) existing.outerHTML = html;
  else main.insertAdjacentHTML('beforeend', html);
}

function renderAcademyPanel() {
  const rail = document.getElementById('ic-os-context-rail-body');
  if (!rail || rail.querySelector('[data-os-academy]')) return;

  rail.insertAdjacentHTML('beforeend', `
    <section class="os-rail-section" data-os-academy>
      <h3>IndiCare Academy</h3>
      <div class="os-academy-list">
        ${ACADEMY.map((course) => `
          <button type="button" class="os-academy-card" data-open-academy="${escapeHtml(course.id)}">
            <strong>${escapeHtml(course.title)}</strong>
            <span>${escapeHtml(course.category)} · ${escapeHtml(course.duration)}</span>
            <small>${escapeHtml(course.description)}</small>
            <em>${escapeHtml(course.level)}</em>
          </button>
        `).join('')}
      </div>
    </section>
  `);
}

function buildAdults(context) {
  const staff = context.staff || context.users || [];

  if (staff.length) {
    return staff.slice(0, 6).map((person) => ({
      name: person.name || person.full_name || 'Staff member',
      role: person.role || person.job_title || 'Residential staff',
      home: person.home_name || context.session?.homeName || 'Operational home',
      shift: person.shift || 'Current shift',
      lastActive: person.last_active || new Date().toISOString(),
    }));
  }

  return [
    {
      name: 'Shift Lead',
      role: 'Residential Team Leader',
      home: getOperationalSession()?.homeName || 'Selected home',
      shift: 'Current shift',
      lastActive: new Date().toISOString(),
    },
  ];
}

function handleClicks(event) {
  const academy = event.target.closest('[data-open-academy]');
  if (!academy) return;

  event.preventDefault();

  const course = ACADEMY.find((item) => item.id === academy.dataset.openAcademy);
  if (!course) return;

  window.dispatchEvent(new CustomEvent('indicare:assistant-prompt', {
    detail: {
      prompt: `Open an IndiCare Academy learning session for ${course.title}. Include operational examples for residential children\'s homes, safeguarding considerations, recording expectations and reflective practice guidance.`
    }
  }));

  document.querySelector('.sp-ai-bubble')?.click();
}

function initials(value) {
  return String(value || 'A').split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join('').toUpperCase();
}
